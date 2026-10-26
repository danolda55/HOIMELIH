// Yapay zekâ: ucuz, birkaç günde bir çalışır
import { MAP, seaLink } from './mapdata.js';
import { AI_PLANS, LAWS, EQUIP, BUILDINGS } from './scenario.js';
import { TECHS, techAvailable, techDays } from './tech.js';
import { focusTree, focusAvailable, AI_FOCUS_ORDER } from './focus.js';
import { yearOf, parseDay, hashStr } from './util.js';
import * as S from './sim.js';

const TECH_PRI = { ind: 5, ele: 3, inf: 4, art: 3, arm: 2, air: 2, doc: 3, nav: 1 };

export function runAI(s) {
  for (const t in s.countries) {
    const c = s.countries[t]; if (!c.alive || S.isPlayer(s, t)) continue;
    const period = c.major ? 2 : 4;
    if ((hashStr(t) + s.day) % period !== 0) continue;
    try { aiCountry(s, c); } catch (e) { if (typeof console !== 'undefined') console.warn('AI hata', t, e); }
  }
}

function aiCountry(s, c) {
  const tag = c.tag;
  // odak
  if (!c.focus.cur) {
    const order = (AI_FOCUS_ORDER[tag] || []).concat(['g_ind1', 'g_ind3', 'g_army1', 'g_ind2', 'g_ind5', 'g_army3', 'g_pol1', 'g_pol2', 'g_ind4', 'g_army2', 'g_air1', 'g_army5', 'g_ind7', 'g_pol3', 'g_ind6', 'g_nav1']);
    const tree = focusTree(tag);
    for (const id of order) { const f = tree.find(x => x.id === id); if (f && focusAvailable(s, c, f) && !(f.tension && s.tension < f.tension)) { c.focus.cur = f.id; c.focus.prog = 0; break; } }
  }
  // araştırma
  if (c.research.cur.length < c.research.slots) {
    const yr = yearOf(s.day);
    const cand = TECHS.filter(t => techAvailable(c, t) && t.year <= yr + 0.6 && !(t.grp && Object.keys(c.research.done).some(id => id.startsWith('doc_')) && false));
    // doktrin: tek dal
    const pref = { GER: 'doc_mob1', SOV: 'doc_mass1', USA: 'doc_fp1', ENG: 'doc_fp1', FRA: 'doc_gb1', ITA: 'doc_gb1', JAP: 'doc_mass1' }[tag] || 'doc_gb1';
    cand.sort((a, b) => (TECH_PRI[b.cat] - TECH_PRI[a.cat]) * 30 + (techDays(c, a, yr) - techDays(c, b, yr)));
    for (const t of cand) {
      if (c.research.cur.length >= c.research.slots) break;
      if (t.grp && t.id !== pref) continue;
      if (t.cat === 'nav' && c.dock < 3) continue;
      if (t.cat === 'arm' && !c.major && t.id !== 'tank1') continue;
      S.applyCommand(s, tag, { type: 'research', id: t.id });
    }
  }
  // üretim
  aiProduction(s, c);
  // inşaat
  const qmax = c.major ? 4 : 2;
  if (c.queue.length < qmax) {
    const war = c.enemies.length > 0; const early = s.day < 900 && !war;
    const type = early ? 'civ' : (Math.random() < 0.75 ? 'mil' : 'civ');
    const own = s.provs.map((p, i) => p.o === tag && p.c === tag ? i : -1).filter(i => i >= 0);
    const free = own.filter(i => { const p = s.provs[i]; return p.civ + p.mil + p.dock + c.queue.filter(q => q.p === i && BUILDINGS[q.t].slot).length < p.slots; });
    if (free.length) { free.sort((a, b) => MAP.provs[b].vp + s.provs[b].infra - MAP.provs[a].vp - s.provs[a].infra); S.applyCommand(s, tag, { type: 'build', b: type, prov: free[0] }); }
    else if (own.length) { const lo = own.filter(i => s.provs[i].infra < 4).sort((a, b) => MAP.provs[b].vp - MAP.provs[a].vp)[0]; if (lo != null) { S.applyCommand(s, tag, { type: 'build', b: 'infra', prov: lo }); const p = s.provs[lo]; p.slots = Math.min(25, p.slots + 0); } }
    // altyapı yuva artışı (basitleştirme: altyapı yuva +1 verir)
  }
  // kanunlar
  const war = c.enemies.length > 0;
  if (c.pp > 150) {
    if (war || s.tension > 45 || c.ideo === 'fascism' || c.ideo === 'communism') {
      for (let l = LAWS.econ.length - 1; l > c.laws.econ; l--) if (S.applyCommand(s, tag, { type: 'law', kind: 'econ', lvl: l }).ok) break;
    }
    if (war || s.tension > 55) { for (let l = LAWS.consc.length - 1; l > c.laws.consc; l--) if (S.applyCommand(s, tag, { type: 'law', kind: 'consc', lvl: l }).ok) break; }
  }
  // eğitim
  aiTraining(s, c);
  // diplomasi & tarihî planlar
  aiDiplomacy(s, c);
  // ordu
  if (s.day % (war ? 1 : 6) === 0 || war) aiMilitary(s, c, null, 'ai');
  // hava
  if (s.day % 8 < 4) aiAir(s, c);
  // deniz
  if (s.day % 10 < 4) aiNavy(s, c);
}

function aiProduction(s, c) {
  const used = c.lines.filter(l => !EQUIP[l.eq].dock).reduce((a, l) => a + l.f, 0);
  const free = c.mil - used;
  const want = { inf: 0.4, art: 0.2, ftr: c.research.done.ftr1 && c.mil >= 4 ? 0.15 : 0, cas: c.research.done.cas1 && c.mil >= 10 ? 0.05 : 0, mot: c.research.done.mot1 && c.mil >= 8 ? 0.08 : 0, tank: c.research.done.tank1 && c.mil >= 10 ? 0.12 : 0 };
  if (free > 0) {
    const tot = Object.values(want).reduce((a, b) => a + b, 0);
    let left = free;
    const keys = Object.keys(want).filter(k => want[k] > 0).sort((a, b) => want[b] - want[a]);
    for (const k of keys) {
      if (left <= 0) break;
      let l = c.lines.find(x => x.eq === k);
      const cur = l ? l.f : 0; const target = Math.round(c.mil * want[k] / tot);
      const add = Math.min(left, Math.max(0, target - cur)) || (k === keys[0] ? left : 0);
      if (add > 0) { if (!l) { c.lines.push(l = { eq: k, f: 0, eff: 0.1 }); } l.eff = (l.eff * l.f + 0.1 * add) / (l.f + add); l.f += add; left -= add; }
    }
    if (left > 0) { let l = c.lines.find(x => x.eq === 'inf'); if (!l) c.lines.push(l = { eq: 'inf', f: 0, eff: 0.1 }); l.f += left; }
  } else if (free < 0) { let over = -free; for (const l of c.lines.filter(l => !EQUIP[l.eq].dock).sort((a, b) => b.f - a.f)) { const r = Math.min(over, l.f); l.f -= r; over -= r; if (!over) break; } }
  // stok dengesi: piyade teçhizatı çok fazlaysa topçuya kaydır
  const inf = c.lines.find(l => l.eq === 'inf'), art = c.lines.find(l => l.eq === 'art');
  if (inf && art && c.stock.inf > 6000 && inf.f > 2) { inf.f--; art.f++; }
  const dl = c.lines.find(l => l.eq === 'ship'); const dUsed = dl ? dl.f : 0;
  if (c.dock > dUsed) { if (dl) dl.f = c.dock; else if (c.dock > 0) c.lines.push({ eq: 'ship', f: c.dock, eff: 0.1 }); }
}

function aiTraining(s, c) {
  const tag = c.tag;
  let count = 0, arm = 0, mot = 0;
  for (const id in s.divs) { const d = s.divs[id]; if (d.o !== tag) continue; count++; if (d.t === 't2') arm++; if (d.t === 't1') mot++; }
  const war = c.enemies.length > 0;
  const desired = Math.round((c.major ? 12 : 3) + c.mil * (c.major ? 2.2 : 2) + (war ? 6 : 0) + (s.tension > 50 ? 4 : 0));
  if (count + c.train.length >= desired || c.train.length >= (c.major ? 6 : 2)) return;
  if (S.mpAvail(c) < 30) return;
  let t = c.dev < 0.3 ? 't4' : 't0';
  if (c.major && c.research.done.tank1 && c.research.done.mot1 && arm < count * 0.12 && c.stock.tank > 200) t = 't2';
  else if (c.research.done.mot1 && mot < count * 0.1 && c.stock.mot > 300) t = 't1';
  const st = S.tmplStats(s, c, S.tmplOf(c, t));
  for (const e in st.eq) if ((c.stock[e] || 0) < st.eq[e] * 1.0) { if (t !== 't4' && (c.stock.inf || 0) >= 600) { t = 't4'; break; } return; }
  S.applyCommand(s, tag, { type: 'train', t, n: 1 });
}

function aiDiplomacy(s, c) {
  const tag = c.tag;
  const plans = AI_PLANS[tag] || [];
  for (const p of plans) {
    const day = parseDay(p.after); const tgt = s.countries[p.target];
    if (!tgt || !tgt.alive || S.friendly(s, tag, p.target) || S.atWar(s, tag, p.target) || c.puppetOf) continue;
    if (s.day >= day - 40 && !c.wg[p.target]) c.wg[p.target] = { days: 30 };
    if (s.day >= day && c.wg[p.target] && c.wg[p.target].days <= 0) { S.declareWar(s, tag, p.target); }
  }
  // genel: savaş gerekçesi hazırsa ve hedef zayıfsa ilan et (odaklardan gelen)
  for (const t in c.wg) {
    const w = c.wg[t]; if (w.days > 0) continue; if (S.atWar(s, tag, t) || S.friendly(s, tag, t)) { delete c.wg[t]; continue; }
    const planned = plans.find(p => p.target === t); if (planned && s.day < parseDay(planned.after)) continue;
    const tgt = s.countries[t]; if (!tgt?.alive) continue;
    if ((c.mil + c.civ * 0.3) > (tgt.mil + tgt.civ * 0.3) * 1.3 || planned) S.declareWar(s, tag, t);
  }
  // ittifak daveti
  const f = s.factions[c.faction];
  if (f && f.leader === tag && s.tension > 60 && Math.random() < 0.012) {
    const cand = Object.values(s.countries).filter(x => x.alive && !x.faction && !x.puppetOf && x.ideo === c.ideo && x.tag !== tag && !S.atWar(s, tag, x.tag) && !x.enemies.length);
    if (cand.length) { const x = cand[Math.floor(Math.random() * cand.length)]; S.makeOffer(s, 'invite', tag, x.tag, { fac: f.id }); }
  }
  // savaştaki ittifaksız demokrasi -> Müttefiklere katılmayı iste
  if (!c.faction && !c.puppetOf && c.enemies.length && c.ideo === 'democracy' && Math.random() < 0.1) {
    const al = Object.values(s.factions).find(fx => s.countries[fx.leader]?.ideo === 'democracy');
    if (al && !al.members.some(m => S.atWar(s, m, tag))) S.makeOffer(s, 'join', tag, al.leader);
  }
  // uzun savaşta barış (oyuncuya teklif)
  for (const e of c.enemies) {
    if (S.isPlayer(s, e) && s.day - (c.warStart[e] || s.day) > 240 && c.surrender > 0.3 && Math.random() < 0.02 && !s.offers.some(o => o.from === tag && o.to === e)) S.makeOffer(s, 'peace', tag, e);
  }
}

export function aiHandleOffer(s, o) {
  const to = s.countries[o.to], from = s.countries[o.from]; if (!to || !from) return;
  let accept = false;
  if (o.type === 'invite') {
    const f = s.factions[o.fac]; const leader = f && s.countries[f.leader];
    const threatened = to.enemies.length > 0 || Object.values(s.countries).some(x => x.alive && x.wg && x.wg[o.to]);
    accept = !!f && !to.faction && !to.puppetOf && !f.members.some(m => S.atWar(s, m, o.to)) && (S.isPlayer(s, o.from) ? (leader.ideo === to.ideo || threatened ? Math.random() < 0.7 : Math.random() < 0.3) : (leader.ideo === to.ideo ? Math.random() < (threatened || s.tension > 70 ? 0.6 : 0.2) : (to.ideo === 'neutral' && threatened && Math.random() < 0.3)));
  } else if (o.type === 'join') {
    accept = (from.ideo === to.ideo || from.enemies.some(e => to.enemies.includes(e))) && Math.random() < 0.85;
  } else if (o.type === 'peace') {
    const dur = s.day - (to.warStart[o.from] || s.day);
    accept = dur > 60 && (to.surrender > from.surrender + 0.05 || (to.surrender < 0.1 && from.surrender < 0.1 && dur > 240 && Math.random() < 0.4));
  }
  S.resolveOffer(s, o, accept);
}

// ---- ordu ----
function divPower(s, d) { const st = S.divStats(s, d); return (st.sa + st.ha) * d.str * Math.max(0.2, d.org / Math.max(1, st.org)); }
function divDef(s, d) { const st = S.divStats(s, d); return st.def * d.str * Math.max(0.3, d.org / Math.max(1, st.org)); }

export function aiMilitary(s, c, subset, mode) {
  const isAI = mode === 'ai';
  const tag = c.tag;
  const pd = S.provDivs(s);
  const mine = subset || Object.values(s.divs).filter(d => d.o === tag);
  if (!mine.length) return;
  const war = c.enemies.length > 0;
  const allowAttack = isAI ? war : mode === 'attack';
  // cephe illeri
  const fronts = new Map();
  const ownish = i => s.provs[i].c === tag || (S.friendly(s, tag, s.provs[i].c) && (pd.get(i) || []).some(d => d.o === tag));
  if (war) {
    for (let i = 0; i < MAP.N; i++) {
      if (!ownish(i) && s.provs[i].c !== tag) continue;
      let w = 0;
      for (const e of MAP.adj[i]) { const ctrl = s.provs[e.to].c; if (S.atWar(s, tag, ctrl)) { w += 1 + (pd.get(e.to) || []).filter(d => S.atWar(s, tag, d.o)).length * 1.5 + (MAP.provs[e.to].vp >= 5 ? 1 : 0); } }
      if (w > 0) fronts.set(i, w);
    }
    // müttefik topraklarındaki cepheler (yakın olanlar)
    if (fronts.size < 2) {
      for (let i = 0; i < MAP.N; i++) { if (!S.friendly(s, tag, s.provs[i].c) || fronts.has(i)) continue; let w = 0; for (const e of MAP.adj[i]) if (S.atWar(s, tag, s.provs[e.to].c)) w += 1; if (w) fronts.set(i, w * 0.6); }
    }
  }
  if (war && !subset) {
    // savaşta da tehdit altındaki barış sınırlarına küçük garnizon
    for (let i = 0; i < MAP.N; i++) {
      if (s.provs[i].c !== tag || fronts.has(i)) continue; let w = 0;
      for (const e of MAP.adj[i]) { if (!(e.f & 1)) continue; const o = s.provs[e.to].c; if (o === tag || S.friendly(s, tag, o) || S.atWar(s, tag, o)) continue; const oc = s.countries[o]; if (oc && (oc.major || oc.wg[tag])) w += oc.wg[tag] ? 1 : 0.35; }
      if (w > 0) fronts.set(i, w);
    }
    // deniz indirmesine karşı kıyı garnizonu
    const navalEnemy = c.enemies.some(e => Object.values(s.fleets).some(f => f.o === e));
    if (navalEnemy) for (let i = 0; i < MAP.N; i++) { if (s.provs[i].c !== tag || fronts.has(i) || !MAP.provs[i].coastal) continue; const vp = MAP.provs[i].vp; if (vp >= 3 || i === c.capital) fronts.set(i, 0.25 + vp * 0.05); }
  }
  if (!fronts.size) {
    if (subset) return;
    // barış: sınırlar (gerekçe hazırlanan / tehdit eden komşu ağırlıklı)
    const planned = new Set((AI_PLANS[tag] || []).filter(p => s.day >= parseDay(p.after) - 90).map(p => p.target));
    for (const t in c.wg) planned.add(t);
    for (let i = 0; i < MAP.N; i++) {
      if (s.provs[i].c !== tag) continue; let w = 0;
      for (const e of MAP.adj[i]) {
        if (!(e.f & 1)) continue; const o = s.provs[e.to].c; if (o === tag || S.friendly(s, tag, o)) continue;
        const oc = s.countries[o]; let th = oc && (oc.major ? 1.5 : 0.5); if (planned.has(o)) th += 4; if (oc && oc.wg[tag]) th += 3; w += th;
      }
      if (i === c.capital) w += 1;
      if (w > 0) fronts.set(i, w);
    }
    if (!fronts.size && c.capital >= 0) fronts.set(c.capital, 1);
  }
  const fList = [...fronts.entries()];
  const totalW = fList.reduce((a, [, w]) => a + w, 0);
  const n = mine.length;
  const have = new Map(); for (const d of mine) { const at = d.path.length ? d.path[d.path.length - 1] : d.p; have.set(at, (have.get(at) || 0) + 1); }
  const cap = Math.max(4, Math.min(12, Math.ceil(n / Math.max(1, fList.length) * 2)));
  const desire = new Map(fList.map(([i, w]) => [i, Math.min(cap, Math.max(1, Math.round(n * w / totalW)))]));
  // boştaki tümenleri yerleştir
  const idle = mine.filter(d => !d.path.length && !d.inv && !d.cmb);
  let moved = 0;
  for (const d of idle) {
    if (moved > 30) break;
    const here = d.p; const hereWant = desire.get(here) || 0; const hereHave = have.get(here) || 0;
    if (hereWant && hereHave <= hereWant) continue;
    // en çok açığı olan yakın cephe
    let best = -1, bs = -1e9;
    const P0 = MAP.provs[here];
    for (const [i] of fList) { const def = (desire.get(i) || 0) - (have.get(i) || 0); if (def <= 0) continue; const P = MAP.provs[i]; const dist = Math.hypot(P.x - P0.x, P.y - P0.y); const sc = def * 40 - dist; if (sc > bs) { bs = sc; best = i; } }
    if (best < 0 || best === here) continue;
    const path = S.findPath(s, tag, here, best);
    if (!path || path.some(p => S.atWar(s, tag, s.provs[p].c))) continue;
    d.path = path; d.mp = 0; moved++;
    have.set(here, hereHave - 1); have.set(best, (have.get(best) || 0) + 1);
  }
  if (!allowAttack || !war) return;
  // saldırı
  for (const [i] of fList) {
    const here = (pd.get(i) || []).filter(d => mine.includes(d) && !d.path.length && !d.inv);
    if (!here.length) continue;
    const ready = here.filter(d => d.org >= S.divStats(s, d).org * 0.7 && d.str > 0.6);
    if (!ready.length) continue;
    let best = -1, bs = -1e9, bestEmpty = false;
    const orgA = ready.reduce((a, d) => a + d.org * d.str, 0);
    for (const e of MAP.adj[i]) {
      const q = e.to; if (!S.atWar(s, tag, s.provs[q].c)) continue;
      const en = (pd.get(q) || []).filter(d => S.atWar(s, tag, d.o));
      const tp = MAP.provs[q];
      let ratio = 99;
      if (en.length) {
        // aynı hedefe komşu illerden de saldırabilecek hazır birlikler
        const allies = [...ready];
        for (const e2 of MAP.adj[q]) { if (e2.to === i || !fronts.has(e2.to)) continue; for (const d of (pd.get(e2.to) || [])) if (mine.includes(d) && !d.path.length && !d.inv && d.org >= S.divStats(s, d).org * 0.7) allies.push(d); }
        const R = S.combatCalc(s, q, allies, en);
        const oA = allies.reduce((a, d) => a + d.org * d.str, 0), oD = en.reduce((a, d) => a + d.org * d.str, 0);
        const tD = oD / Math.max(0.1, R.dmgD), tA = oA / Math.max(0.1, R.dmgA);
        ratio = tA / Math.max(0.1, tD);
        if (ratio < 1.15) continue;
        e._allies = allies;
      }
      const sc = (en.length ? Math.min(ratio, 5) * 10 : 50) + tp.vp * 2 + (S.supplied(s, tag, q) ? 0 : 5) + Math.random();
      if (sc > bs) { bs = sc; best = q; bestEmpty = !en.length; e._best = 1; }
    }
    if (best < 0) continue;
    let send = bestEmpty ? ready.slice(0, 1) : (ready.length > 2 ? ready.slice(0, ready.length - 1) : ready);
    if (!bestEmpty) { const ed = MAP.adj[i].find(e => e.to === best); if (ed && ed._allies) { send = ed._allies.filter(d => d.p !== i || send.includes(d)); delete ed._allies; } }
    for (const e of MAP.adj[i]) { delete e._allies; delete e._best; }
    for (const d of send) { if (!d.path.length && MAP.adjSet[d.p].has(best)) { d.path = [best]; d.mp = 0; } }
  }
}

export function runFrontOrders(s) {
  if (s.day % 2) return;
  for (const t of Object.values(s.players)) {
    if (!t || !s.countries[t]?.alive) continue;
    const front = Object.values(s.divs).filter(d => d.o === t && d.ord);
    if (!front.length) continue;
    const atk = front.filter(d => d.ord === 'attack'), hold = front.filter(d => d.ord === 'front');
    if (hold.length) aiMilitary(s, s.countries[t], hold, 'front');
    if (atk.length) aiMilitary(s, s.countries[t], atk, 'attack');
  }
}

function aiAir(s, c) {
  const tag = c.tag;
  // stoktan kanat oluştur
  for (const type of ['ftr', 'cas']) if (c.stock[type] >= 60 && Object.values(s.wings).filter(w => w.o === tag).length < (c.major ? 8 : 2)) {
    const base = bestAirBase(s, c); if (base >= 0) S.applyCommand(s, tag, { type: 'wingCreate', prov: base, wt: type, n: 100 });
  }
  if (!c.enemies.length) return;
  const base = bestAirBase(s, c); if (base < 0) return;
  const wings = Object.values(s.wings).filter(w => w.o === tag);
  wings.forEach((w, k) => { if (k % 2 === 0 || wings.length < 3) w.p = base; });
}
function bestAirBase(s, c) {
  const tag = c.tag; const pd = S.provDivs(s);
  let best = -1, bs = -1;
  for (const P in s.battles) { const b = s.battles[P]; const mineIn = b.ao === tag || b.do === tag || S.friendly(s, tag, b.ao) || S.friendly(s, tag, b.do); if (!mineIn) continue; for (const q of MAP.near2[+P]) if (s.provs[q].c === tag) { const sc = (b.a.length + b.d.length) + Math.random(); if (sc > bs) { bs = sc; best = q; } } }
  if (best >= 0) return best;
  for (const [pid, arr] of pd) { if (s.provs[pid].c !== tag) continue; const n = arr.filter(d => d.o === tag).length; if (n > bs) { bs = n; best = pid; } }
  return best >= 0 ? best : c.capital;
}
function aiNavy(s, c) {
  const tag = c.tag;
  if (c.stock.ship >= 4) {
    const f = Object.values(s.fleets).find(f => f.o === tag);
    if (f) S.applyCommand(s, tag, { type: 'fleetAdd', id: f.id });
    else { const port = s.provs.findIndex((p, i) => p.c === tag && MAP.provs[i].coastal && MAP.provs[i].seas.length); if (port >= 0) S.applyCommand(s, tag, { type: 'fleetCreate', z: MAP.provs[port].seas[0], n: c.stock.ship }); }
  }
  if (!c.enemies.length || !c.major) return;
  // deniz indirmesi: denizaşırı düşman
  if (s.day % 20 >= 4) return;
  const myFleets = Object.values(s.fleets).filter(f => f.o === tag);
  if (!myFleets.length) return;
  const pd = S.provDivs(s);
  const idle = Object.values(s.divs).filter(d => d.o === tag && !d.path.length && !d.inv && !d.cmb && MAP.provs[d.p].coastal && d.org > S.divStats(s, d).org * 0.8);
  if (idle.length < 4) return;
  // hedef: zayıf savunulan düşman kıyı ili
  let best = null, bs = -1e9;
  for (let q = 0; q < MAP.N; q++) {
    if (!MAP.provs[q].coastal || !S.atWar(s, tag, s.provs[q].c)) continue;
    const en = (pd.get(q) || []).filter(d => S.atWar(s, tag, d.o)).length; if (en > 1) continue;
    const src = idle.find(d => seaLink(d.p, q) >= 0 && !S.findPath(s, tag, d.p, q));
    if (!src) continue; const z = seaLink(src.p, q);
    const bal = S.zoneBalance(s, tag, z); if (bal.en > bal.own * 0.8) { const f = myFleets.sort((a, b) => b.ships - a.ships)[0]; if (f.z !== z && !f.path.length) S.applyCommand(s, tag, { type: 'fleetMove', id: f.id, z }); continue; }
    const sc = MAP.provs[q].vp * 3 - en * 5 + Math.random();
    if (sc > bs) { bs = sc; best = { q, src }; }
  }
  if (!best) return;
  const group = idle.filter(d => d.p === best.src.p).slice(0, 4);
  S.applyCommand(s, tag, { type: 'move', ids: group.map(d => d.id), to: best.q });
}
