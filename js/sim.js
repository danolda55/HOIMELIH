// Oyun simülasyonu (DOM bağımsız, ev sahibi otoriter). Hem tarayıcıda hem Node'da çalışır.
import { MAP, seaLink } from './mapdata.js';
import { COUNTRIES, MAJORS, START_PUPPETS, START_FACTIONS, START_WARS, START_TECH, RES_SPOTS, RESOURCES, EQUIP, BATTALIONS, DEFAULT_TEMPLATES, TERRAIN, LAWS, START_LAWS, BUILDINGS } from './scenario.js';
import { TECHS, TECH_BY_ID, techAvailable, techDays } from './tech.js';
import { focusById, focusAvailable } from './focus.js';
import { fmtDate, yearOf, dateToDay, clamp, haversine, Heap, parseDay } from './util.js';
import { runAI, aiHandleOffer, runFrontOrders } from './ai.js';

export const END_DAY = dateToDay(1946, 1, 1);
const RT = new WeakMap(); // çalışma zamanı önbellekleri (serileştirilmez)
export function rt(state) { let r = RT.get(state); if (!r) { r = { stats: new Map(), supply: {}, supplyDay: {}, provDivs: null, zone: null }; RT.set(state, r); } return r; }

// ---------- statik il kaynakları ----------
let PROV_RES = null;
export function provRes() {
  if (PROV_RES) return PROV_RES;
  PROV_RES = MAP.provs.map(() => ({}));
  for (const [lon, lat, r, amt] of RES_SPOTS) {
    let best = -1, bd = 1e9;
    for (const p of MAP.provs) { const d = (p.lon - lon) ** 2 * Math.cos(lat * Math.PI / 180) ** 2 + (p.lat - lat) ** 2; if (d < bd) { bd = d; best = p.id; } }
    if (best >= 0 && bd < 120) PROV_RES[best][r] = (PROV_RES[best][r] || 0) + amt;
  }
  return PROV_RES;
}

// ---------- ilişkiler ----------
export const C = (s, t) => s.countries[t];
export function topLord(s, t) { let c = s.countries[t], g = 0; while (c && c.puppetOf && g++ < 5) c = s.countries[c.puppetOf]; return c ? c.tag : t; }
export function factionOf(s, t) { const top = topLord(s, t); return s.countries[top]?.faction || null; }
export function friendly(s, a, b) {
  if (a === b) return true; if (!a || !b) return false;
  const ta = topLord(s, a), tb = topLord(s, b); if (ta === tb) return true;
  const fa = s.countries[ta]?.faction, fb = s.countries[tb]?.faction; return !!fa && fa === fb;
}
export function atWar(s, a, b) { const c = s.countries[a]; return !!c && c.enemies.includes(b); }
export function atWarAny(s, a) { const c = s.countries[a]; return !!c && c.enemies.length > 0; }
export function canEnter(s, tag, pid) { const ctrl = s.provs[pid].c; return ctrl === tag || friendly(s, tag, ctrl) || atWar(s, tag, ctrl); }

export function note(s, text, to = '*', k = 'info') {
  s.noteSeq = (s.noteSeq || 0) + 1;
  s.notes.push({ id: s.noteSeq, d: s.day, t: text, to: to === '*' ? '*' : [].concat(to), k });
  if (s.notes.length > 80) s.notes.splice(0, s.notes.length - 80);
}
export const isPlayer = (s, t) => Object.values(s.players).includes(t);
export const cname = (s, t) => s.countries[t]?.name || t;

// ---------- modifikatörler ----------
export function getMod(s, c) {
  const r = rt(s); const key = 'm' + c.tag + ':' + c.techVer;
  let m = r.stats.get(key); if (m) return m;
  m = { infAtk: 0, infDef: 0, artAtk: 0, armAtk: 0, armDef: 0, armArmor: 0, org: 0, spd: 0, brk: 0, ind: 0, effCap: 0, build: 0, research: 0, airAtk: 0, cas: 0, navy: 0, amph: 0, aa: 0, fortBonus: 0, reinforce: 0, pierce: 0, ppGain: 0, stab: 0, res: {} };
  const add = eff => { for (const k in eff) { if (k === 'res') { for (const rr in eff.res) m.res[rr] = (m.res[rr] || 0) + eff.res[rr]; } else m[k] = (m[k] || 0) + eff[k]; } };
  for (const id in c.research.done) { const t = TECH_BY_ID[id]; if (t) add(t.eff); }
  add(c.fmod || {});
  if (c.fres) add({ res: c.fres });
  r.stats.set(key, m); return m;
}
export function tmplOf(c, id) { return c.tmpl.find(t => t.id === id) || c.tmpl[0]; }
export function tmplStats(s, c, tmpl) {
  const r = rt(s); const key = 's' + c.tag + ':' + c.techVer + ':' + tmpl.id + ':' + JSON.stringify(tmpl.bn);
  let st = r.stats.get(key); if (st) return st;
  const m = getMod(s, c);
  st = { sa: 0, ha: 0, def: 0, brk: 0, org: 0, hp: 0, armor: 0, pierce: 0, hard: 0, spd: 99, width: 0, mp: 0, eq: {}, n: 0, cls: 'inf', mtn: 0 };
  let maxArmor = 0, maxPierce = 0, armN = 0, motN = 0, cavN = 0;
  for (const k in tmpl.bn) {
    const n = tmpl.bn[k]; if (!n) continue; const b = BATTALIONS[k]; if (!b) continue;
    let sa = b.sa, ha = b.ha, def = b.def, brk = b.brk, armor = b.armor, pierce = b.pierce + m.pierce;
    if (b.cls === 'inf') { sa *= 1 + m.infAtk; ha *= 1 + m.infAtk; def *= 1 + m.infDef; }
    if (b.cls === 'art') { sa *= 1 + m.artAtk; ha *= 1 + m.artAtk; }
    if (b.cls === 'arm') { sa *= 1 + m.armAtk; ha *= 1 + m.armAtk; def *= 1 + m.armDef; brk *= 1 + m.armAtk; armor += m.armArmor; }
    st.sa += sa * n; st.ha += ha * n; st.def += def * n; st.brk += brk * n * (1 + m.brk); st.org += b.org * n; st.hp += b.hp * n; st.hard += b.hard * n;
    st.width += b.width * n; st.mp += b.mp * n; st.spd = Math.min(st.spd, b.spd); st.n += n;
    maxArmor = Math.max(maxArmor, armor); maxPierce = Math.max(maxPierce, pierce); st.armor += armor * n; st.pierce += pierce * n;
    for (const e in b.eq) st.eq[e] = (st.eq[e] || 0) + b.eq[e] * n;
    if (k === 'arm') armN += n; if (k === 'mot') motN += n; if (k === 'cav') cavN += n; if (k === 'mtn') st.mtn += n;
  }
  if (!st.n) { st.n = 1; st.spd = 4; st.hp = 1; st.width = 1; }
  st.org = st.org / st.n * (1 + m.org); st.hard /= st.n;
  st.armor = 0.3 * maxArmor + 0.7 * st.armor / st.n; st.pierce = 0.4 * maxPierce + 0.6 * st.pierce / st.n;
  st.spd *= 1 + m.spd; st.mtn = st.mtn / st.n;
  st.cls = armN >= 2 ? 'arm' : motN >= st.n / 2 ? 'mot' : cavN >= st.n / 2 ? 'cav' : 'inf';
  r.stats.set(key, st); return st;
}
export function divStats(s, d) { const c = s.countries[d.o]; return tmplStats(s, c, tmplOf(c, d.t)); }
export function tmplAllowed(c, tmpl) { for (const k in tmpl.bn) { if (!tmpl.bn[k]) continue; const b = BATTALIONS[k]; if (b.req && !c.research.done[b.req]) return false; } return true; }

// ---------- yeni oyun ----------
export function newGame(opts = {}) {
  const s = { v: 1, day: 0, speed: 0, tension: 5, nextId: 1, players: opts.players || {}, mode: opts.mode || 'sp', countries: {}, provs: [], divs: {}, fleets: {}, wings: {}, factions: {}, battles: {}, notes: [], noteSeq: 0, offers: [], over: false, winner: null };
  const PR = provRes();
  // iller
  MAP.provs.forEach(p => s.provs.push({ o: p.owner0, c: p.owner0, k: p.owner0, civ: 0, mil: 0, dock: 0, infra: 1, fort: 0, aa: 0, slots: 2 }));
  // ülkeler
  for (const tag in COUNTRIES) {
    const [name, color, ideo, civ, mil, dock, pop, divs, ships, stab, ws, slots, dev, home] = COUNTRIES[tag];
    const law = START_LAWS[tag] || [0, 1];
    const c = {
      tag, name, color, ideo, alive: true, puppetOf: null, faction: null, pp: 50, stab, ws, pop, mpUsed: 0, mpBonus: 0,
      laws: { econ: law[0], consc: law[1] }, research: { slots, done: {}, cur: [] }, focus: { cur: null, prog: 0, done: {} },
      lines: [], queue: [], train: [], trade: {}, stock: { inf: 0, art: 0, mot: 0, tank: 0, ftr: 0, cas: 0, ship: 0 },
      tmpl: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)), wg: {}, enemies: [], warStart: {}, fmod: {}, fres: {}, techVer: 0,
      capital: -1, civ: 0, mil: 0, dock: 0, vp: 0, coreVP: 0, surrender: 0, dev, home, major: MAJORS.includes(tag), lastAI: 0, eff: 0.1, ord: {}
    };
    for (const t of (MAJORS.includes(tag) ? START_TECH._major : START_TECH._minor).concat(START_TECH[tag] || [])) c.research.done[t] = 1;
    s.countries[tag] = c;
  }
  // il yapıları
  const byTag = {};
  MAP.provs.forEach(p => (byTag[p.owner0] = byTag[p.owner0] || []).push(p.id));
  for (const tag in byTag) {
    const c = s.countries[tag]; if (!c) continue;
    const ids = byTag[tag];
    const homeIds = ids.filter(i => c.home.includes(MAP.provs[i].modern));
    const hi = homeIds.length ? homeIds : ids;
    ids.forEach(i => { const hp = s.provs[i], mp = MAP.provs[i], isHome = hi.includes(i); hp.infra = isHome ? Math.round(1 + c.dev * 3.4) : 1; hp.slots = Math.min(25, Math.round(2 + mp.vp * 1.5 + c.dev * 6 + (isHome ? 2 : 0))); });
    // başkent
    let cap = hi.find(i => MAP.provs[i].capCity) ?? hi.reduce((b, i) => MAP.provs[i].vp > MAP.provs[b].vp ? i : b, hi[0]);
    c.capital = cap;
    // fabrikaları dağıt
    const [, , , civ, mil, dock] = COUNTRIES[tag];
    const w = hi.map(i => MAP.provs[i].vp * 3 + MAP.provs[i].pop / 1500 + 1 + (i === cap ? 4 : 0));
    const distribute = (n, key, filter) => {
      const cand = hi.map((i, k) => [i, w[k]]).filter(([i]) => !filter || filter(i)); if (!cand.length) return;
      for (let k = 0; k < n; k++) {
        cand.sort((a, b) => (b[1] / (1 + used(b[0]))) - (a[1] / (1 + used(a[0]))));
        const target = cand.find(([i]) => used(i) < s.provs[i].slots) || cand[0]; s.provs[target[0]][key]++;
      }
    };
    const used = i => s.provs[i].civ + s.provs[i].mil + s.provs[i].dock;
    distribute(civ, 'civ'); distribute(mil, 'mil'); distribute(dock, 'dock', i => MAP.provs[i].coastal);
    hi.forEach(i => { if (used(i) > s.provs[i].slots) s.provs[i].slots = used(i); });
  }
  // kukla & ittifak & savaş
  for (const p in START_PUPPETS) if (s.countries[p]) s.countries[p].puppetOf = START_PUPPETS[p];
  for (const f of START_FACTIONS) { s.factions[f.id] = { id: f.id, name: f.name, leader: f.leader, members: [...f.members], color: f.color }; f.members.forEach(m => { if (s.countries[m]) s.countries[m].faction = f.id; }); }
  // Kanada vb. Müttefik üyeliği kukla olmayan üyeler için; RAJ kukla ama ittifak üyesi (ENG üzerinden)
  for (const [a, b] of START_WARS) declareWar(s, a, b, true);
  // başlangıç orduları, stoklar, üretim
  for (const tag in s.countries) setupCountry(s, s.countries[tag]);
  recomputeCountries(s);
  for (const tag in s.countries) { const c = s.countries[tag]; c.coreVP = c.vp; }
  note(s, '1 Ocak 1936: Dünya gerilimli bir barış içinde. İtalya, Etiyopya ile savaşta.', '*', 'info');
  return s;
}

function setupCountry(s, c) {
  const [, , , civ, mil, dock, pop, divs, ships] = COUNTRIES[c.tag];
  const owned = s.provs.map((p, i) => p.o === c.tag ? i : -1).filter(i => i >= 0);
  if (!owned.length) { c.alive = false; return; }
  if (c.capital < 0 || s.provs[c.capital].o !== c.tag) c.capital = owned[0];
  // tümen şablon dağılımı
  const armored = { GER: 3, SOV: 4, FRA: 2, ENG: 1, ITA: 1, USA: 1, JAP: 1, CZE: 1, POL: 1 }[c.tag] || 0;
  const motor = { GER: 3, SOV: 2, FRA: 2, ENG: 2, USA: 2, ITA: 2, JAP: 1 }[c.tag] || 0;
  const cavShare = ['CHI', 'MON', 'ETH', 'AFG', 'SAU', 'YEM', 'MAN', 'PER', 'IRQ', 'POL', 'TUR', 'ROM'].includes(c.tag) ? (c.tag === 'POL' || c.tag === 'TUR' || c.tag === 'ROM' ? 0.15 : 0.4) : 0;
  const list = [];
  for (let i = 0; i < Math.max(1, divs); i++) {
    let t = c.dev < 0.3 ? 't4' : 't0';
    if (i < armored) t = 't2'; else if (i < armored + motor) t = 't1'; else if (i % 10 < cavShare * 10) t = 't3';
    list.push(t);
  }
  // yerleşim ağırlıkları
  const home = owned.filter(i => c.home.includes(MAP.provs[i].modern));
  const weight = owned.map(i => {
    let border = 0; for (const e of MAP.adj[i]) { if (e.f & 1 && s.provs[e.to].o !== c.tag) border++; }
    let w = MAP.provs[i].vp + border * 3 + (i === c.capital ? 6 : 0);
    if (home.length && !home.includes(i)) w *= 0.4;
    return [i, w + 0.5];
  });
  const assigned = {};
  list.forEach((t, k) => {
    weight.sort((a, b) => b[1] / (1 + (assigned[b[0]] || 0)) - a[1] / (1 + (assigned[a[0]] || 0)));
    const pid = weight[0][0]; assigned[pid] = (assigned[pid] || 0) + 1;
    const d = makeDiv(s, c, t, pid); d.org = divStats(s, d).org;
  });
  // stoklar
  const st = c.stock;
  st.inf = Math.round(divs * 120 + civ * 40 + 300); st.art = Math.round(divs * 10 + 40); st.mot = motor * 150 + (c.major ? 100 : 0); st.tank = armored * 60;
  const planes = { GER: 300, ENG: 320, FRA: 300, ITA: 260, JAP: 320, USA: 280, SOV: 420, TUR: 60, POL: 80, CZE: 80, CHI: 40, SPR: 60 }[c.tag] ?? Math.round(Math.min(40, mil * 8));
  st.ftr = planes; st.cas = c.research.done.cas1 ? Math.round(planes * 0.3) : 0; st.ship = 0;
  // hava kanatları
  const nW = c.major ? 3 : planes >= 40 ? 1 : 0;
  const airBases = owned.filter(i => home.length ? home.includes(i) : true).sort((a, b) => MAP.provs[b].vp - MAP.provs[a].vp);
  for (let k = 0; k < nW && st.ftr >= 30; k++) { const n = Math.min(100, Math.floor(st.ftr / (nW - k))); makeWing(s, c.tag, airBases[k % airBases.length], 'ftr', n); st.ftr -= n; }
  if (st.cas >= 40) { makeWing(s, c.tag, airBases[0], 'cas', Math.min(100, st.cas)); st.cas -= Math.min(100, st.cas); }
  // donanma
  if (ships > 0) {
    const ports = owned.filter(i => MAP.provs[i].coastal && MAP.provs[i].seas.length).sort((a, b) => (s.provs[b].dock * 5 + MAP.provs[b].vp + (home.includes(b) ? 10 : 0)) - (s.provs[a].dock * 5 + MAP.provs[a].vp + (home.includes(a) ? 10 : 0)));
    const HAZ = MAP.seas.findIndex(z => z.name === 'Hazar Denizi');
    const zones = []; for (const p of ports) { const z = MAP.provs[p].seas.find(z => z !== HAZ) ?? MAP.provs[p].seas[0]; if (!zones.includes(z)) zones.push(z); if (zones.length >= (ships > 60 ? 3 : ships > 20 ? 2 : 1)) break; }
    if (c.tag === 'USA') { const west = ports.find(p => MAP.provs[p].lon < -115); if (west != null && !zones.includes(MAP.provs[west].seas[0])) zones[1] = MAP.provs[west].seas[0]; }
    zones.forEach((z, k) => { const n = Math.round(ships * (k === 0 ? 0.55 : 0.45 / (zones.length - 1))); if (n > 0) makeFleet(s, c.tag, z, n); });
  }
  // üretim hatları
  const lines = [];
  const m = Math.max(0, mil);
  const share = c.research.done.tank1 && c.major ? { inf: 0.35, art: 0.2, mot: 0.1, tank: 0.1, ftr: 0.25 } : { inf: 0.55, art: 0.25, ftr: m >= 4 ? 0.2 : 0 };
  let left = m;
  for (const eq in share) { const f = Math.floor(m * share[eq]); if (f > 0) { lines.push({ eq, f, eff: 0.3 }); left -= f; } }
  if (left > 0) { const l = lines.find(l => l.eq === 'inf'); if (l) l.f += left; else lines.push({ eq: 'inf', f: left, eff: 0.3 }); }
  if (dock > 0) lines.push({ eq: 'ship', f: dock, eff: 0.3 });
  c.lines = lines;
}

export function makeDiv(s, c, t, pid) {
  const id = 'd' + (s.nextId++);
  const tm = tmplOf(c, t);
  const n = (c.divCount = (c.divCount || 0) + 1);
  const d = { id, o: c.tag, t: tm.id, n: `${n}. ${tm.name.split(' ')[0]}`, p: pid, str: 1, org: 0, path: [], mp: 0, inv: null, ent: 0, sup: 1, cmb: 0 };
  s.divs[id] = d; c.mpUsed += tmplStats(s, c, tm).mp; invalidateIdx(s); return d;
}
export function makeWing(s, tag, pid, type, n) { const id = 'w' + (s.nextId++); s.wings[id] = { id, o: tag, p: pid, type, n, max: 100 }; return s.wings[id]; }
export function makeFleet(s, tag, z, ships) { const id = 'f' + (s.nextId++); s.fleets[id] = { id, o: tag, z, ships, path: [], name: `${s.countries[tag].name} Filosu ${Object.values(s.fleets).filter(f => f.o === tag).length + 1}` }; return s.fleets[id]; }

// ---------- savaş & barış ----------
function collectSide(s, t) {
  const top = topLord(s, t); const set = new Set([top]);
  const c = s.countries[top];
  if (c.faction && s.factions[c.faction]) s.factions[c.faction].members.forEach(m => { if (s.countries[m]?.alive) set.add(m); });
  // kuklalar
  let grew = true; while (grew) { grew = false; for (const tag in s.countries) { const x = s.countries[tag]; if (x.alive && x.puppetOf && set.has(x.puppetOf) && !set.has(tag)) { set.add(tag); grew = true; } } }
  return set;
}
export function declareWar(s, att, def, silent = false) {
  const A = collectSide(s, att), D = collectSide(s, def);
  for (const a of A) for (const d of D) {
    if (a === d || friendly(s, a, d)) continue;
    const ca = s.countries[a], cd = s.countries[d];
    if (!ca.enemies.includes(d)) { ca.enemies.push(d); ca.warStart[d] = s.day; }
    if (!cd.enemies.includes(a)) { cd.enemies.push(a); cd.warStart[a] = s.day; }
  }
  delete s.countries[att].wg[def];
  const big = s.countries[def].major || s.countries[att].major;
  s.tension = clamp(s.tension + (big ? 8 : 3), 0, 100);
  if (!silent) note(s, `${cname(s, att)}, ${cname(s, def)} ülkesine savaş ilan etti!`, '*', 'war');
  for (const t of [...A, ...D]) { const c = s.countries[t]; c.ws = clamp(c.ws + (D.has(t) ? 0.1 : 0.03), 0, 1); }
  rt(s).supplyDay = {};
}
function endWarPair(s, a, b) {
  const ca = s.countries[a], cb = s.countries[b];
  if (ca) { ca.enemies = ca.enemies.filter(x => x !== b); delete ca.warStart[b]; }
  if (cb) { cb.enemies = cb.enemies.filter(x => x !== a); delete cb.warStart[a]; }
}
export function whitePeace(s, a, b) {
  const A = [...collectSide(s, a)].filter(x => atWar(s, x, b) || x === a), B = [...collectSide(s, b)].filter(x => atWar(s, x, a) || x === b);
  const As = new Set(A), Bs = new Set(B);
  for (const x of A) for (const y of B) endWarPair(s, x, y);
  s.provs.forEach((p, i) => { if ((As.has(p.o) && Bs.has(p.c)) || (Bs.has(p.o) && As.has(p.c))) p.c = p.o; });
  evictTroops(s);
  note(s, `${cname(s, a)} ve ${cname(s, b)} beyaz barış imzaladı.`, '*', 'good');
}
// düşman olmayan topraklardaki birlikleri başkente çek
function evictTroops(s) {
  for (const id in s.divs) {
    const d = s.divs[id]; const ctrl = s.provs[d.p].c;
    if (!(ctrl === d.o || friendly(s, d.o, ctrl) || atWar(s, d.o, ctrl))) { const cap = s.countries[d.o].capital; d.p = cap >= 0 && s.provs[cap].c === d.o ? cap : d.p; d.path = []; d.inv = null; }
    else d.path = d.path.filter(p => canEnter(s, d.o, p));
  }
  invalidateIdx(s);
}
export function capitulate(s, tag) {
  const c = s.countries[tag]; if (!c || !c.alive) return;
  const enemies = [...c.enemies];
  // en çok VP işgal eden
  const occ = {};
  s.provs.forEach((p, i) => { if (p.o === tag && p.c !== tag && enemies.includes(p.c)) occ[p.c] = (occ[p.c] || 0) + MAP.provs[i].vp; });
  const main = Object.keys(occ).sort((a, b) => occ[b] - occ[a])[0] || enemies[0];
  const mainTop = main ? topLord(s, main) : null;
  let remain = 0;
  s.provs.forEach((p, i) => {
    if (p.o === tag) { if (p.c !== tag && enemies.includes(p.c)) { p.o = p.c; } else { p.c = tag; remain++; } }
    else if (p.c === tag) p.c = p.o;
  });
  for (const id in s.divs) if (s.divs[id].o === tag) delete s.divs[id];
  invalidateIdx(s);
  for (const id in s.wings) if (s.wings[id].o === tag) delete s.wings[id];
  for (const id in s.fleets) if (s.fleets[id].o === tag) delete s.fleets[id];
  for (const e of enemies) endWarPair(s, tag, e);
  // kuklaları serbest bırak
  for (const t in s.countries) if (s.countries[t].puppetOf === tag) s.countries[t].puppetOf = null;
  leaveFaction(s, tag, true);
  c.train = []; c.queue = []; c.wg = {};
  if (remain > 0 && mainTop && !isPlayer(s, tag)) { c.puppetOf = mainTop; c.surrender = 0; note(s, `${c.name} teslim oldu! İşgal edilen topraklar ilhak edildi, kalan kısım ${cname(s, mainTop)} kuklası oldu.`, '*', 'war'); }
  else if (remain > 0) { c.surrender = 0; c.capitulated = true; note(s, `${c.name} teslim oldu! İşgal edilen topraklar galiplere geçti.`, '*', 'war'); }
  else { c.alive = false; note(s, `${c.name} haritadan silindi!`, '*', 'war'); }
  if (c.capital >= 0 && s.provs[c.capital].o !== tag) { const own = s.provs.findIndex(p => p.o === tag); c.capital = own; }
  s.tension = clamp(s.tension + 2, 0, 100);
  if (isPlayer(s, tag)) { c.capitulated = true; checkGameOver(s, tag); }
  evictTroops(s); rt(s).supplyDay = {};
}
export function annex(s, annexer, target) {
  const t = s.countries[target]; if (!t || !t.alive) return false;
  s.provs.forEach(p => { if (p.o === target) { p.o = annexer; p.c = annexer; } else if (p.c === target) p.c = p.o; });
  for (const id in s.divs) { const d = s.divs[id]; if (d.o === target) { d.o = annexer; d.t = 't0'; d.path = []; } }
  for (const id in s.fleets) if (s.fleets[id].o === target) s.fleets[id].o = annexer;
  for (const id in s.wings) if (s.wings[id].o === target) s.wings[id].o = annexer;
  const a = s.countries[annexer]; for (const k in t.stock) a.stock[k] = (a.stock[k] || 0) + t.stock[k];
  for (const e of [...t.enemies]) endWarPair(s, target, e);
  leaveFaction(s, target, true); t.alive = false;
  for (const x in s.countries) if (s.countries[x].puppetOf === target) s.countries[x].puppetOf = annexer;
  s.tension = clamp(s.tension + 4, 0, 100);
  note(s, `${a.name}, ${t.name} ülkesini ilhak etti.`, '*', 'war');
  return true;
}
function checkGameOver(s, loser) {
  const players = Object.entries(s.players).filter(([, t]) => t);
  if (s.mode === 'mp') {
    const other = players.find(([, t]) => t !== loser);
    s.over = true; s.winner = other ? other[1] : null; s.overReason = `${cname(s, loser)} teslim oldu.`;
  } else { s.over = true; s.winner = null; s.overReason = `${cname(s, loser)} teslim oldu. Yenildiniz.`; }
}

// ---------- ittifaklar ----------
export function createFaction(s, tag, name, id) {
  const c = s.countries[tag]; if (c.faction || c.puppetOf) return null;
  id = id && !s.factions[id] ? id : 'fac' + (s.nextId++);
  s.factions[id] = { id, name: name || `${c.name} Paktı`, leader: tag, members: [tag], color: c.color };
  c.faction = id; note(s, `${c.name} yeni bir ittifak kurdu: ${s.factions[id].name}.`, '*', 'info');
  return id;
}
export function joinFaction(s, tag, fid) {
  const c = s.countries[tag], f = s.factions[fid]; if (!c || !f || c.faction === fid) return false;
  if (c.faction) leaveFaction(s, tag, true);
  if (f.members.some(m => atWar(s, m, tag))) return false;
  f.members.push(tag); c.faction = fid;
  // ittifakın savaşlarına katıl
  const leader = s.countries[f.leader];
  for (const e of [...leader.enemies]) if (!friendly(s, tag, e) && !atWar(s, tag, e)) { for (const x of collectSide(s, tag)) { if (x === e || friendly(s, x, e)) continue; const cx = s.countries[x], ce = s.countries[e]; if (!cx.enemies.includes(e)) { cx.enemies.push(e); cx.warStart[e] = s.day; } if (!ce.enemies.includes(x)) { ce.enemies.push(x); ce.warStart[x] = s.day; } } }
  note(s, `${c.name}, ${f.name} ittifakına katıldı.`, '*', 'info');
  rt(s).supplyDay = {};
  return true;
}
export function leaveFaction(s, tag, silent) {
  const c = s.countries[tag]; if (!c || !c.faction) return; const f = s.factions[c.faction]; c.faction = null;
  if (!f) return; f.members = f.members.filter(m => m !== tag);
  if (f.leader === tag) { if (f.members.length) f.leader = f.members.sort((a, b) => (s.countries[b].civ + s.countries[b].mil) - (s.countries[a].civ + s.countries[a].mil))[0]; else delete s.factions[f.id]; }
  if (!silent) note(s, `${c.name} ittifaktan ayrıldı.`, '*', 'info');
}
export function makeOffer(s, type, from, to, extra = {}) {
  const o = { id: 'o' + (s.nextId++), type, from, to, d: s.day, ...extra };
  if (!isPlayer(s, to)) { aiHandleOffer(s, o); return; }
  s.offers.push(o);
  const txt = type === 'invite' ? `${cname(s, from)} sizi ${s.factions[extra.fac]?.name} ittifakına davet ediyor.` : type === 'join' ? `${cname(s, from)} ittifakınıza katılmak istiyor.` : `${cname(s, from)} beyaz barış teklif ediyor.`;
  note(s, txt, to, 'offer');
}
export function resolveOffer(s, o, accept) {
  s.offers = s.offers.filter(x => x.id !== o.id);
  if (o.type === 'invite') { if (accept && s.factions[o.fac]) joinFaction(s, o.to, o.fac); else note(s, `${cname(s, o.to)} ittifak davetini reddetti.`, o.from, 'bad'); }
  else if (o.type === 'join') { const fid = s.countries[o.to].faction; if (accept && fid) joinFaction(s, o.from, fid); else note(s, `${cname(s, o.to)} katılım talebini reddetti.`, o.from, 'bad'); }
  else if (o.type === 'peace') { if (accept && atWar(s, o.from, o.to)) whitePeace(s, o.from, o.to); else note(s, `${cname(s, o.to)} barış teklifini reddetti.`, o.from, 'bad'); }
}

// ---------- ekonomi ----------
export function recomputeCountries(s) {
  for (const t in s.countries) { const c = s.countries[t]; c.civ = 0; c.mil = 0; c.dock = 0; c.vp = 0; c.res = {}; c.nprov = 0; }
  const PR = provRes();
  s.provs.forEach((p, i) => {
    const c = s.countries[p.c]; if (!c) return;
    c.civ += p.civ; c.mil += p.mil; c.dock += p.dock; c.vp += MAP.provs[i].vp; c.nprov++;
    for (const r in PR[i]) c.res[r] = (c.res[r] || 0) + PR[i][r];
  });
  for (const t in s.countries) { const c = s.countries[t]; const m = getMod(s, c); for (const r in m.res) c.res[r] = (c.res[r] || 0) + m.res[r]; for (const r in c.trade) c.res[r] = (c.res[r] || 0) + c.trade[r] * 8; }
}
export function mpMax(c) { return c.pop * 1000 * LAWS.consc[c.laws.consc].rate + c.mpBonus; }
export function mpAvail(c) { return Math.max(0, mpMax(c) - c.mpUsed); }
export function civBreakdown(c) {
  const law = LAWS.econ[c.laws.econ];
  const cg = Math.round((c.civ + c.mil) * law.cg);
  const trade = Object.values(c.trade).reduce((a, b) => a + b, 0);
  return { cg, trade, avail: Math.max(0, c.civ - cg - trade) };
}
export function resBalance(c) {
  const need = {};
  for (const l of c.lines) { const e = EQUIP[l.eq]; for (const r in e.res) need[r] = (need[r] || 0) + e.res[r] * l.f; }
  return need;
}
export function buildSpeedMult(s, c) { const m = getMod(s, c); return 1 + m.build + LAWS.econ[c.laws.econ].build; }
export function stabFactor(c) { return c.stab < 0.5 ? 1 - (0.5 - c.stab) : 1; }

function dailyEconomy(s, c) {
  const m = getMod(s, c);
  const law = LAWS.econ[c.laws.econ];
  // siyasi güç
  c.pp = Math.min(999, c.pp + (c.puppetOf ? 1 : 2) + m.ppGain);
  // istikrar / savaş desteği eğilimi
  const atWarNow = c.enemies.length > 0;
  c.stab = clamp(c.stab + (0.55 + m.stab - c.stab) * 0.002 - (atWarNow && c.surrender > 0.2 ? 0.0008 : 0), 0.05, 1);
  c.ws = clamp(c.ws + ((atWarNow ? 0.5 : 0.15) - c.ws) * 0.002 + s.tension * 0.00001, 0, 1);
  if (s.day % 30 === 0) c.pop *= 1.001;
  // inşaat
  const cb = civBreakdown(c); let civs = cb.avail;
  const bm = buildSpeedMult(s, c);
  for (let i = 0; i < c.queue.length && civs > 0; i++) {
    const q = c.queue[i]; const p = s.provs[q.p];
    if (p.c !== c.tag) continue;
    const use = Math.min(15, civs); civs -= use;
    q.prog += use * 5 * bm * (1 + 0.1 * p.infra) / BUILDINGS[q.t].cost;
    if (q.prog >= 1) {
      p[q.t] = (p[q.t] || 0) + 1; c.queue.splice(i, 1); i--;
      if (q.t === 'civ' || q.t === 'mil' || q.t === 'dock') { c[q.t]++; }
      if (isPlayer(s, c.tag)) note(s, `${BUILDINGS[q.t].name} tamamlandı: ${MAP.provs[q.p].name}`, c.tag, 'good');
    }
  }
  // üretim
  const need = resBalance(c);
  const ratio = {}; for (const r in need) ratio[r] = need[r] > 0 ? Math.min(1, (c.res[r] || 0) / need[r]) : 1;
  let milUsed = 0, dockUsed = 0;
  const cap = 0.5 + m.effCap;
  const mult = 4.5 * (1 + m.ind + (law.mil || 0)) * stabFactor(c);
  const milTot = c.lines.filter(l => !EQUIP[l.eq].dock).reduce((a, l) => a + l.f, 0);
  const dockTot = c.lines.filter(l => EQUIP[l.eq].dock).reduce((a, l) => a + l.f, 0);
  const milScale = milTot > c.mil ? c.mil / milTot : 1, dockScale = dockTot > c.dock ? c.dock / dockTot : 1;
  for (const l of c.lines) {
    const e = EQUIP[l.eq]; if (!e) continue;
    const f = l.f * (e.dock ? dockScale : milScale);
    let rr = 1; for (const r in e.res) rr = Math.min(rr, ratio[r] ?? 1);
    const out = f * mult * l.eff * (0.25 + 0.75 * rr) / e.cost;
    c.stock[l.eq] = (c.stock[l.eq] || 0) + out;
    l.eff = Math.min(cap, l.eff + 0.0015 + 0.004 * Math.max(0, cap - l.eff));
    if (e.dock) dockUsed += f; else milUsed += f;
  }
  c.resRatio = ratio;
  // araştırma
  const yr = yearOf(s.day);
  for (let i = 0; i < c.research.cur.length; i++) {
    const r = c.research.cur[i]; const t = TECH_BY_ID[r.id]; if (!t) { c.research.cur.splice(i--, 1); continue; }
    r.prog += (1 + m.research) / techDays(c, t, yr);
    if (r.prog >= 1) {
      c.research.done[r.id] = 1; c.research.cur.splice(i--, 1); c.techVer++;
      if (isPlayer(s, c.tag)) note(s, `Araştırma tamamlandı: ${t.name}`, c.tag, 'good');
    }
  }
  // odak
  if (c.focus.cur) {
    c.focus.prog += 1;
    const f = focusById(c.tag, c.focus.cur);
    if (!f) c.focus.cur = null;
    else if (c.focus.prog >= f.days) { c.focus.done[f.id] = 1; c.focus.cur = null; c.focus.prog = 0; applyEffects(s, c, f.eff, f.name); if (isPlayer(s, c.tag)) note(s, `Ulusal odak tamamlandı: ${f.name}`, c.tag, 'good'); else if (c.major && !f.id.startsWith('g_')) note(s, `${c.name} ulusal odağını tamamladı: ${f.name}`, '*', 'info'); }
  }
  // savaş gerekçesi
  for (const t in c.wg) { const w = c.wg[t]; if (w.days > 0) { w.days--; if (w.days === 0) { if (isPlayer(s, c.tag)) note(s, `${cname(s, t)} için savaş gerekçesi hazır.`, c.tag, 'good'); else if (isPlayer(s, t)) note(s, `${c.name} size karşı savaş gerekçesi hazırladı!`, t, 'bad'); } } if (!s.countries[t]?.alive) delete c.wg[t]; }
  // eğitim
  let parallel = 0;
  for (let i = 0; i < c.train.length; i++) {
    const q = c.train[i]; const tm = tmplOf(c, q.t); const st = tmplStats(s, c, tm);
    if (!q.paid) {
      if (parallel >= 6) continue;
      if (mpAvail(c) < st.mp) continue; let ok = true; for (const e in st.eq) if ((c.stock[e] || 0) < st.eq[e]) ok = false; if (!ok) continue;
      for (const e in st.eq) c.stock[e] -= st.eq[e]; c.mpUsed += st.mp; q.paid = 1;
    }
    parallel++; q.days--;
    if (q.days <= 0) {
      let pid = q.p; if (pid == null || s.provs[pid].c !== c.tag) pid = c.capital;
      if (pid < 0 || s.provs[pid].c !== c.tag) pid = s.provs.findIndex(p => p.c === c.tag);
      if (pid >= 0) { c.mpUsed -= st.mp; const d = makeDiv(s, c, tm.id, pid); d.org = st.org * 0.6; if (q.ord) d.ord = q.ord; }
      c.train.splice(i--, 1);
    }
  }
}

export function applyEffects(s, c, effs, src) {
  const owned = () => s.provs.map((p, i) => p.o === c.tag && p.c === c.tag ? i : -1).filter(i => i >= 0);
  const addFactories = (key, n) => {
    for (let k = 0; k < n; k++) {
      const cand = owned().filter(i => (key !== 'dock' || MAP.provs[i].coastal));
      if (!cand.length) return;
      cand.sort((a, b) => { const fa = s.provs[a].slots - (s.provs[a].civ + s.provs[a].mil + s.provs[a].dock), fb = s.provs[b].slots - (s.provs[b].civ + s.provs[b].mil + s.provs[b].dock); return (fb + MAP.provs[b].vp * 0.3) - (fa + MAP.provs[a].vp * 0.3); });
      const i = cand[0]; const p = s.provs[i]; p[key]++; if (p.civ + p.mil + p.dock > p.slots) p.slots++; c[key]++;
    }
  };
  for (const e of effs) {
    if (e.pp) c.pp += e.pp;
    if (e.stab) c.stab = clamp(c.stab + e.stab, 0, 1);
    if (e.ws) c.ws = clamp(c.ws + e.ws, 0, 1);
    if (e.civ) addFactories('civ', e.civ);
    if (e.mil) addFactories('mil', e.mil);
    if (e.dock) addFactories('dock', e.dock);
    if (e.slot) c.research.slots += e.slot;
    if (e.mp) c.mpBonus += e.mp;
    if (e.infra) { const o = owned().sort((a, b) => s.provs[a].infra - s.provs[b].infra); o.slice(0, e.infra).forEach(i => s.provs[i].infra = Math.min(5, s.provs[i].infra + 1)); }
    if (e.mod) { for (const k in e.mod) c.fmod[k] = (c.fmod[k] || 0) + e.mod[k]; c.techVer++; }
    if (e.res) { for (const k in e.res) c.fres[k] = (c.fres[k] || 0) + e.res[k]; c.techVer++; }
    if (e.tech && !c.research.done[e.tech]) { c.research.done[e.tech] = 1; c.research.cur = c.research.cur.filter(r => r.id !== e.tech); c.techVer++; }
    if (e.stock) for (const k in e.stock) c.stock[k] = (c.stock[k] || 0) + e.stock[k];
    if (e.ships) { const f = Object.values(s.fleets).find(f => f.o === c.tag); if (f) f.ships += e.ships; else c.stock.ship += e.ships; }
    if (e.ideology) { c.ideo = e.ideology; note(s, `${c.name} ideolojisini değiştirdi.`, '*', 'info'); }
    if (e.faction) { const fe = e.faction; if (!c.faction) createFaction(s, c.tag, fe.name, fe.id); }
    if (e.join) { const f = s.factions[e.join]; if (f && f.leader !== c.tag && !c.puppetOf) { if (isPlayer(s, f.leader)) makeOffer(s, 'join', c.tag, f.leader); else joinFaction(s, c.tag, e.join); } else if (!f) note(s, `${src}: hedef ittifak mevcut değil.`, c.tag, 'bad'); }
    if (e.joinBest) { const f = Object.values(s.factions).find(f => s.countries[f.leader]?.ideo === c.ideo && f.leader !== c.tag); if (f) { if (isPlayer(s, f.leader)) makeOffer(s, 'join', c.tag, f.leader); else joinFaction(s, c.tag, f.id); } }
    if (e.invite) { if (!c.faction) createFaction(s, c.tag); for (const t of e.invite) { const x = s.countries[t]; if (x && x.alive && !x.puppetOf && x.faction !== c.faction) makeOffer(s, 'invite', c.tag, t, { fac: c.faction }); } }
    if (e.annex) {
      const t = s.countries[e.annex];
      if (t && t.alive && !isPlayer(s, e.annex) && !t.faction && !t.puppetOf && !t.enemies.length && !c.enemies.includes(e.annex)) annex(s, c.tag, e.annex);
      else if (t && t.alive && !friendly(s, c.tag, e.annex)) { c.wg[e.annex] = { days: 0 }; note(s, `${t.name} ilhakı reddedildi; savaş gerekçesi kazanıldı.`, c.tag, 'info'); }
    }
    if (e.wargoal) { const t = s.countries[e.wargoal]; if (t && t.alive && !friendly(s, c.tag, e.wargoal)) { c.wg[e.wargoal] = { days: 0 }; if (isPlayer(s, e.wargoal)) note(s, `${c.name} size karşı savaş gerekçesi kazandı!`, e.wargoal, 'bad'); } }
    if (e.cede) {
      const { from, lon, lat } = e.cede; let best = -1, bd = 1e9;
      s.provs.forEach((p, i) => { if (p.o !== from) return; const d = (MAP.provs[i].lon - lon) ** 2 + (MAP.provs[i].lat - lat) ** 2; if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && bd < 16 && !isPlayer(s, from) && !atWar(s, from, c.tag)) { const p = s.provs[best]; p.o = c.tag; p.c = c.tag; p.k = c.tag; for (const id in s.divs) if (s.divs[id].p === best && s.divs[id].o === from) s.divs[id].p = s.countries[from].capital; note(s, `${cname(s, from)}, ${MAP.provs[best].name} bölgesini ${c.name} ülkesine devretti.`, '*', 'info'); }
      else if (best >= 0) { c.wg[from] = { days: 0 }; note(s, `Toprak talebi reddedildi; ${cname(s, from)} için savaş gerekçesi kazanıldı.`, c.tag, 'info'); }
    }
    if (e.fortNear) { for (const [lon, lat] of e.fortNear) { let best = -1, bd = 1e9; s.provs.forEach((p, i) => { if (p.o !== c.tag) return; const d = (MAP.provs[i].lon - lon) ** 2 + (MAP.provs[i].lat - lat) ** 2; if (d < bd) { bd = d; best = i; } }); if (best >= 0) s.provs[best].fort = Math.max(s.provs[best].fort, e.lvl || 2); } }
    if (e.fortBorder) { s.provs.forEach((p, i) => { if (p.o !== c.tag) return; if (MAP.adj[i].some(ed => (ed.f & 1) && s.provs[ed.to].o === e.fortBorder)) p.fort = Math.max(p.fort, e.lvl || 2); }); }
  }
  recomputeCountries(s);
}

// ---------- ikmal ----------
export function computeSupply(s, tag) {
  const r = rt(s);
  const c = s.countries[tag]; const set = new Uint8Array(MAP.N);
  let src = c.capital;
  if (src < 0 || !friendly(s, tag, s.provs[src].c)) { let best = -1, bv = -1; s.provs.forEach((p, i) => { if (p.c === tag && MAP.provs[i].vp > bv) { bv = MAP.provs[i].vp; best = i; } }); src = best; }
  if (src < 0) { r.supply[tag] = set; return set; }
  const zone = zoneControl(s);
  const zoneOk = z => { const zc = zone[z]; if (!zc) return true; let own = 0, en = 0; for (const t in zc) { if (friendly(s, tag, t)) own += zc[t]; else if (atWar(s, tag, t)) en += zc[t]; } return !(en > 0 && en > own * 1.5); };
  const q = [src]; set[src] = 1; const zseen = new Uint8Array(MAP.seas.length);
  while (q.length) {
    const i = q.pop();
    for (const e of MAP.adj[i]) { if (set[e.to]) continue; if (friendly(s, tag, s.provs[e.to].c)) { set[e.to] = 1; q.push(e.to); } }
    if (MAP.provs[i].coastal) for (const z of MAP.provs[i].seas) {
      if (zseen[z] || !zoneOk(z)) continue; const zq = [z]; zseen[z] = 1;
      while (zq.length) { const zz = zq.pop(); for (const pid of MAP.seaProvs[zz]) if (!set[pid] && friendly(s, tag, s.provs[pid].c)) { set[pid] = 1; q.push(pid); } for (const n of MAP.seaAdj[zz]) if (!zseen[n] && zoneOk(n)) { zseen[n] = 1; zq.push(n); } }
    }
  }
  r.supply[tag] = set; r.supplyDay[tag] = s.day; return set;
}
export function supplied(s, tag, pid) { const r = rt(s); if (!r.supply[tag] || r.supplyDay[tag] == null || s.day - r.supplyDay[tag] > (atWarAny(s, tag) ? 0 : 10)) computeSupply(s, tag); return !!r.supply[tag][pid]; }
export function zoneControl(s) {
  const r = rt(s); if (r.zone && r.zoneDay === s.day && r.zoneVer === s.nextId) return r.zone;
  const z = {}; for (const id in s.fleets) { const f = s.fleets[id]; const c = s.countries[f.o]; if (!c) continue; const str = f.ships * (1 + getMod(s, c).navy); (z[f.z] = z[f.z] || {})[f.o] = (z[f.z][f.o] || 0) + str; }
  r.zone = z; r.zoneDay = s.day; r.zoneVer = s.nextId; return z;
}
export function zoneBalance(s, tag, zi) { const zc = zoneControl(s)[zi] || {}; let own = 0, en = 0; for (const t in zc) { if (friendly(s, tag, t)) own += zc[t]; else if (atWar(s, tag, t)) en += zc[t]; } return { own, en }; }

// ---------- hareket ----------
export function provDivs(s) {
  const r = rt(s); if (r.provDivs && r.pdDay === s.day && r.pdVer === r.ver) return r.provDivs;
  const m = new Map(); for (const id in s.divs) { const d = s.divs[id]; let a = m.get(d.p); if (!a) m.set(d.p, a = []); a.push(d); }
  r.provDivs = m; r.pdDay = s.day; r.pdVer = r.ver; return m;
}
function invalidateIdx(s) { const r = rt(s); r.ver = (r.ver || 0) + 1; }
export function enemyDivsIn(s, tag, pid) { return (provDivs(s).get(pid) || []).filter(d => atWar(s, tag, d.o)); }
export function speedKmDay(s, d) { return divStats(s, d).spd * 14; }
function edgeCost(s, from, e) { const tp = MAP.provs[e.to]; const infra = s.provs[e.to].infra; return e.dist * TERRAIN[tp.terrain].move * (1.25 - 0.05 * infra) * (e.f & 1 ? 1 : 2.2); }
export function findPath(s, tag, from, to) {
  if (from === to) return [];
  if (!canEnter(s, tag, to)) return null;
  const dist = new Float64Array(MAP.N).fill(Infinity), prev = new Int32Array(MAP.N).fill(-1);
  const h = new Heap(); dist[from] = 0; h.push(0, from);
  while (h.size) {
    const [dd, i] = h.pop(); if (dd > dist[i]) continue; if (i === to) break;
    for (const e of MAP.adj[i]) {
      if (!canEnter(s, tag, e.to)) continue;
      const nd = dd + edgeCost(s, i, e); if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = i; h.push(nd, e.to); }
    }
  }
  if (!isFinite(dist[to])) return null;
  const path = []; for (let i = to; i !== from; i = prev[i]) path.unshift(i);
  return path;
}
function enterProv(s, d, pid) {
  const p = s.provs[pid];
  d.p = pid; d.mp = 0; d.ent = 0; invalidateIdx(s);
  if (atWar(s, d.o, p.c)) {
    const prevCtrl = p.c;
    p.c = (p.o !== d.o && friendly(s, d.o, p.o)) ? p.o : d.o;
    s._mapDirty = true;
    if (MAP.provs[pid].vp >= 5 && (isPlayer(s, d.o) || isPlayer(s, prevCtrl))) note(s, `${cname(s, d.o)}, ${MAP.provs[pid].name} bölgesini ele geçirdi.`, [d.o, prevCtrl], isPlayer(s, d.o) ? 'good' : 'bad');
    // düşman hava kanatlarını taşı
    for (const id in s.wings) { const w = s.wings[id]; if (w.p === pid && atWar(s, w.o, d.o)) { const cap = s.countries[w.o].capital; if (cap >= 0 && s.provs[cap].c === w.o) w.p = cap; else delete s.wings[id]; } }
  }
}
function moveDivs(s) {
  for (const id in s.divs) {
    const d = s.divs[id];
    if (d.inv) { handleInvasion(s, d); continue; }
    if (!d.path.length) { d.ent = Math.min(20, d.ent + 1); continue; }
    const next = d.path[0];
    if (!canEnter(s, d.o, next)) { d.path = []; continue; }
    const e = MAP.edge(d.p, next);
    if (!e) { d.path = []; continue; }
    if (enemyDivsIn(s, d.o, next).length) continue; // savaş
    if (d.org < divStats(s, d).org * 0.1 && atWar(s, d.o, s.provs[next].c)) continue; // örgütsüz, ilerleyemez
    d.mp += speedKmDay(s, d) / edgeCost(s, d.p, e);
    if (d.mp >= 1) { d.path.shift(); enterProv(s, d, next); }
  }
}
function handleInvasion(s, d) {
  const inv = d.inv;
  if (inv.days > 0) { inv.days--; return; }
  const bal = zoneBalance(s, d.o, inv.z);
  const target = inv.to;
  if (bal.en > 0 && bal.en > bal.own) {
    d.inv = null; d.path = []; d.str *= 0.7; d.org *= 0.5;
    note(s, `Deniz indirmesi başarısız! (${MAP.seas[inv.z].name} düşman kontrolünde)`, d.o, 'bad'); return;
  }
  if (!canEnter(s, d.o, target)) { d.inv = null; d.path = []; return; }
  if (enemyDivsIn(s, d.o, target).length) { inv.landing = 1; d.path = [target]; return; } // savaşa gir
  d.inv = null; d.path = []; enterProv(s, d, target);
}

// ---------- muharebe ----------
function resolveBattles(s) {
  const pd = provDivs(s);
  const groups = new Map();
  for (const id in s.divs) {
    const d = s.divs[id]; if (!d.path.length) continue; const P = d.path[0];
    if (!(MAP.adjSet[d.p].has(P) || (d.inv && d.inv.landing && d.inv.to === P))) continue;
    const def = (pd.get(P) || []).filter(x => atWar(s, d.o, x.o)); if (!def.length) continue;
    const st = divStats(s, d); if (d.org < st.org * 0.1) { d.path = []; continue; }
    let g = groups.get(P); if (!g) groups.set(P, g = []); g.push(d);
  }
  const newBattles = {};
  for (const [P, atts] of groups) {
    const defs = (pd.get(P) || []).filter(x => atts.some(a => atWar(s, a.o, x.o)));
    if (!defs.length) continue;
    const R = combatCalc(s, P, atts, defs);
    const { A, D, attA, defD, width } = R;
    const apply = (arr, dmg, enemyPierce) => {
      let tw = 0; for (const d of arr) tw += divStats(s, d).width;
      for (const d of arr) {
        const st = divStats(s, d); const share = st.width / tw; const armorF = st.armor > enemyPierce ? 0.5 : 1;
        const dd = dmg * share * armorF * (0.85 + Math.random() * 0.3);
        d.org = Math.max(0, d.org - dd); d.str = Math.max(0, d.str - dd * 0.3 / Math.max(8, st.hp)); d.cmb = 1;
      }
    };
    apply(D, R.dmgD, R.pierceA); apply(A, R.dmgA, R.pierceD);
    // geri çekilme / imha
    for (const d of defs) {
      const st = divStats(s, d);
      if (d.str < 0.08 || d.org <= st.org * 0.04) retreat(s, d, P, atts);
    }
    for (const d of atts) { const st = divStats(s, d); if (d.str < 0.05) { destroyDiv(s, d, 'ağır kayıplar'); } else if (d.org < st.org * 0.08) d.path = []; }
    const remainingDef = defs.filter(d => s.divs[d.id] && d.p === P);
    const sumOrg = arr => arr.reduce((a, d) => a + d.org * d.str, 0);
    const aS = sumOrg(A.filter(d => s.divs[d.id])), dS = sumOrg(remainingDef);
    newBattles[P] = { a: atts.filter(d => s.divs[d.id]).map(d => d.id), d: remainingDef.map(d => d.id), ao: atts[0].o, do: defs[0].o, adv: aS + dS > 0 ? aS / (aS + dS) : 0.5, att: Math.round(attA), def: Math.round(defD), w: Math.round(width), since: s.battles[P]?.since ?? s.day };
    if (!remainingDef.length) { delete newBattles[P]; for (const d of atts) if (s.divs[d.id]) d.mp = Math.max(d.mp, 0.6); }
  }
  s.battles = newBattles;
}
// Bir günlük muharebe hesabı (YZ tahmini için de kullanılır)
export function combatCalc(s, P, atts, defs) {
    const tp = MAP.provs[P], terr = TERRAIN[tp.terrain];
    const dirs = new Set(atts.map(a => a.p)).size;
    const width = 100 * terr.width + 50 * (dirs - 1);
    const pickWidth = arr => { const sorted = [...arr].sort((a, b) => b.org - a.org); let w = 0; const out = []; for (const d of sorted) { const st = divStats(s, d); if (out.length && w + st.width > width) break; w += st.width; out.push(d); } return out; };
    const A = pickWidth(atts), D = pickWidth(defs);
    const air = airSupremacy(s, P, A[0].o, D[0].o);
    const hardOf = arr => { let w = 0, h = 0; for (const d of arr) { const st = divStats(s, d); w += st.width; h += st.hard * st.width; } return w ? h / w : 0; };
    const pierceOf = arr => { let w = 0, h = 0; for (const d of arr) { const st = divStats(s, d); w += st.width; h += st.pierce * st.width; } return w ? h / w : 0; };
    const hardA = hardOf(A), hardD = hardOf(D), pierceA = pierceOf(A), pierceD = pierceOf(D);
    let attA = 0, brkA = 0, attD = 0, defD = 0;
    const fortL = friendly(s, D[0].o, s.provs[P].o) ? s.provs[P].fort : 0;
    for (const d of A) {
      const st = divStats(s, d); const m = getMod(s, s.countries[d.o]);
      const e = MAP.edge(d.p, P);
      let mod = 1 + terr.atk + (st.cls === 'arm' ? terr.arm * st.hard : 0) + air.a;
      if (st.mtn && (tp.terrain === 'mountain' || tp.terrain === 'hills')) mod += 0.25 * st.mtn;
      if (e && (e.f & 4)) mod -= 0.25; if (e && !(e.f & 1)) mod -= 0.4;
      if (d.inv && d.inv.landing) mod -= 0.5 * (1 - m.amph);
      if (!d.sup) mod -= 0.3;
      mod -= fortL * 0.08;
      mod = Math.max(0.1, mod);
      attA += (st.sa * (1 - hardD) + st.ha * hardD) * d.str * mod;
      brkA += st.brk * d.str * Math.max(0.3, 1 + air.a + (d.sup ? 0 : -0.3));
    }
    for (const d of D) {
      const st = divStats(s, d); const m = getMod(s, s.countries[d.o]);
      let dm = 1 + fortL * 0.15 * (1 + m.fortBonus * 4) + (d.ent >= 10 ? 0.1 : d.ent * 0.01) + air.d * 0.5 + (d.sup ? 0 : -0.3);
      if (st.mtn && (tp.terrain === 'mountain' || tp.terrain === 'hills')) dm += 0.2 * st.mtn;
      defD += st.def * d.str * Math.max(0.3, dm);
      attD += (st.sa * (1 - hardA) + st.ha * hardA) * d.str * Math.max(0.2, 1 + air.d + (d.sup ? 0 : -0.3));
    }
    const dmgD = 0.05 * Math.min(attA, defD) + 0.2 * Math.max(0, attA - defD) + air.casA;
    attD *= 0.65; // savunan taraf inisiyatifi kaybeder
    const dmgA = 0.05 * Math.min(attD, brkA) + 0.2 * Math.max(0, attD - brkA) + air.casD;
    return { A, D, attA, defD, brkA, attD, dmgD, dmgA, pierceA, pierceD, width, air };
}
function retreat(s, d, P, attackers) {
  const attSrc = new Set(attackers.map(a => a.p));
  let best = -1, bs = -1e9;
  for (const e of MAP.adj[P]) {
    if (!(e.f & 1)) continue; const q = e.to; const ctrl = s.provs[q].c;
    if (!friendly(s, d.o, ctrl)) continue; if (attSrc.has(q)) continue;
    if (enemyDivsIn(s, d.o, q).length) continue;
    const sc = (supplied(s, d.o, q) ? 10 : 0) + (provDivs(s).get(q) || []).filter(x => x.o === d.o).length + Math.random();
    if (sc > bs) { bs = sc; best = q; }
  }
  if (best < 0) { destroyDiv(s, d, 'kuşatıldı ve teslim oldu'); return; }
  d.p = best; d.path = []; d.mp = 0; d.ent = 0; d.org = 0; d.inv = null; invalidateIdx(s);
}
function destroyDiv(s, d, why) {
  delete s.divs[d.id]; invalidateIdx(s);
  if (isPlayer(s, d.o)) note(s, `${d.n} tümeni ${why}.`, d.o, 'bad');
}
function airSupremacy(s, P, ta, td) {
  let fA = 0, fD = 0, cA = 0, cD = 0;
  const ma = getMod(s, s.countries[ta]), md = getMod(s, s.countries[td]);
  for (const id in s.wings) {
    const w = s.wings[id]; if (!MAP.near2[w.p].includes(P)) continue;
    const side = friendly(s, w.o, ta) ? 1 : friendly(s, w.o, td) ? 2 : 0; if (!side) continue;
    const m = getMod(s, s.countries[w.o]);
    if (w.type === 'ftr') { const v = w.n * (1 + m.airAtk); if (side === 1) fA += v; else fD += v; }
    else { const v = w.n * (1 + m.cas); if (side === 1) cA += v; else cD += v; }
  }
  const tot = fA + fD; const supA = tot > 0 ? fA / tot : 0.5;
  const a = (supA - 0.5) * 0.4 * (1 - (supA > 0.5 ? md.aa : ma.aa)), d = -a;
  return { a, d, casA: cA * 0.06 * (0.3 + supA) * (1 - md.aa), casD: cD * 0.06 * (1.3 - supA) * (1 - ma.aa), supA };
}
function airWar(s) {
  const W = Object.values(s.wings);
  for (const w of W) {
    const c = s.countries[w.o]; if (!c) { delete s.wings[w.id]; continue; }
    if (s.provs[w.p].c !== w.o && !friendly(s, w.o, s.provs[w.p].c)) { const cap = c.capital; if (cap >= 0 && s.provs[cap].c === w.o) w.p = cap; else { delete s.wings[w.id]; continue; } }
    if (w.n < w.max && c.stock[w.type] >= 1) { const add = Math.min(5, w.max - w.n, Math.floor(c.stock[w.type])); w.n += add; c.stock[w.type] -= add; }
  }
  // karşılıklı yıpranma
  for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) {
    const a = W[i], b = W[j]; if (!s.wings[a.id] || !s.wings[b.id]) continue;
    if (!atWar(s, a.o, b.o)) continue; if (!MAP.near2[a.p].includes(b.p) && !MAP.near2[b.p].some(x => MAP.near2[a.p].includes(x))) continue;
    const ma = getMod(s, s.countries[a.o]), mb = getMod(s, s.countries[b.o]);
    const fa = a.type === 'ftr' ? a.n * (1 + ma.airAtk) : 0, fb = b.type === 'ftr' ? b.n * (1 + mb.airAtk) : 0;
    a.n -= fb * (a.type === 'ftr' ? 0.012 : 0.02) * Math.random(); b.n -= fa * (b.type === 'ftr' ? 0.012 : 0.02) * Math.random();
    if (a.n < 1) delete s.wings[a.id]; if (b.n < 1) delete s.wings[b.id];
  }
}
function navalWar(s) {
  for (const id in s.fleets) { const f = s.fleets[id]; if (!s.countries[f.o]?.alive) { delete s.fleets[id]; continue; } if (f.path.length) { f.z = f.path.shift(); } }
  const byZone = {}; for (const id in s.fleets) { const f = s.fleets[id]; (byZone[f.z] = byZone[f.z] || []).push(f); }
  for (const z in byZone) {
    const fl = byZone[z]; if (fl.length < 2) continue;
    for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) {
      const a = fl[i], b = fl[j]; if (!s.fleets[a.id] || !s.fleets[b.id] || !atWar(s, a.o, b.o)) continue;
      const sa = a.ships * (1 + getMod(s, s.countries[a.o]).navy), sb = b.ships * (1 + getMod(s, s.countries[b.o]).navy);
      a.ships -= sb * 0.03 * (0.5 + Math.random()); b.ships -= sa * 0.03 * (0.5 + Math.random());
      if (Math.random() < 0.1 && (isPlayer(s, a.o) || isPlayer(s, b.o))) note(s, `${MAP.seas[z].name} bölgesinde deniz muharebesi!`, [a.o, b.o], 'war');
      if (a.ships < 0.5) { delete s.fleets[a.id]; note(s, `${a.name} batırıldı!`, '*', 'war'); }
      if (b.ships < 0.5) { delete s.fleets[b.id]; note(s, `${b.name} batırıldı!`, '*', 'war'); }
    }
  }
}

function divUpkeep(s) {
  const sideCache = {};
  for (const id in s.divs) {
    const d = s.divs[id]; const c = s.countries[d.o]; if (!c || !c.alive) { delete s.divs[id]; continue; }
    const st = divStats(s, d);
    d.sup = supplied(s, d.o, d.p) ? 1 : 0;
    const inBattle = !!(s.battles[d.p] && s.battles[d.p].d.includes(d.id)) || (d.path.length && s.battles[d.path[0]] && s.battles[d.path[0]].a.includes(d.id));
    d.cmb = inBattle ? 1 : 0;
    const maxOrg = st.org * (d.sup ? 1 : 0.5);
    if (!inBattle) d.org = Math.min(maxOrg, d.org + st.org * (d.path.length ? 0.04 : 0.1) * (d.sup ? 1 : 0.3));
    if (d.sup && d.str < 1 && !inBattle) {
      const m = getMod(s, c); const rate = Math.min(1 - d.str, 0.04 * (1 + m.reinforce));
      const needMp = st.mp * rate; let ok = mpAvail(c) >= needMp;
      for (const e in st.eq) if ((c.stock[e] || 0) < st.eq[e] * rate) ok = false;
      if (ok) { c.mpUsed += needMp; for (const e in st.eq) c.stock[e] -= st.eq[e] * rate; d.str += rate; }
    }
  }
}

function checkCapitulations(s) {
  for (const t in s.countries) {
    const c = s.countries[t]; if (!c.alive || !c.enemies.length) { if (c.alive) c.surrender = 0; continue; }
    let core = 0, lost = 0, owned = 0, controlled = 0;
    s.provs.forEach((p, i) => { if (p.o === t) { owned++; const vp = MAP.provs[i].vp; core += vp; if (p.c !== t && atWar(s, t, p.c)) lost += vp; else controlled++; } });
    if (!owned) { capitulate(s, t); continue; }
    let sur = core ? lost / core : 1;
    if (c.capital >= 0 && atWar(s, t, s.provs[c.capital].c)) sur += 0.1;
    c.surrender = clamp(sur, 0, 1);
    const thr = Math.min(0.92, 0.55 + 0.25 * c.stab + (c.nprov > 12 ? 0.1 : 0));
    if (c.surrender >= thr || controlled === 0) capitulate(s, t);
  }
}

function checkVictory(s) {
  if (s.over) return;
  if (s.day >= END_DAY) {
    s.over = true;
    const players = Object.values(s.players).filter(Boolean);
    const ranked = players.map(t => [t, s.countries[t].vp]).sort((a, b) => b[1] - a[1]);
    s.winner = ranked.length ? ranked[0][0] : null;
    s.overReason = '1 Ocak 1946: Oyun sona erdi. Zafer puanları: ' + ranked.map(([t, v]) => `${cname(s, t)} ${v}`).join(', ');
    note(s, s.overReason, '*', 'info');
  }
}

// ---------- günlük döngü ----------
export function tick(s) {
  if (s.over) return;
  s.day++;
  s._mapDirty = false;
  for (const t in s.countries) { const c = s.countries[t]; if (c.alive) dailyEconomy(s, c); }
  if (s.day % 7 === 0) recomputeCountries(s);
  moveDivs(s);
  invalidateIdx(s);
  resolveBattles(s);
  airWar(s); navalWar(s);
  divUpkeep(s);
  // teklifleri zaman aşımı
  s.offers = s.offers.filter(o => s.day - o.d < 45);
  runFrontOrders(s);
  runAI(s);
  checkCapitulations(s);
  if (s._mapDirty) recomputeCountries(s);
  s.tension = clamp(s.tension - 0.02, 0, 100);
  checkVictory(s);
}

// ---------- komutlar (oyuncu ve YZ ortak) ----------
export function applyCommand(s, tag, cmd) {
  const c = s.countries[tag]; if (!c || !c.alive || s.over) return { ok: false, err: 'Geçersiz' };
  const fail = err => ({ ok: false, err });
  switch (cmd.type) {
    case 'move': {
      let n = 0, naval = 0;
      for (const id of cmd.ids || []) {
        const d = s.divs[id]; if (!d || d.o !== tag || d.inv) continue;
        const to = cmd.to;
        const path = findPath(s, tag, d.p, to);
        if (path) { d.path = path; if (d.path[0] !== undefined && d.mp > 0 && d.path[0] !== d._lastNext) d.mp = 0; d._lastNext = d.path[0]; delete d.ord; n++; continue; }
        // deniz yolu
        const z = seaLink(d.p, to);
        if (z >= 0 && canEnter(s, tag, to) && MAP.provs[d.p].coastal) {
          const hostile = atWar(s, tag, s.provs[to].c);
          d.inv = { to, z, days: hostile ? Math.round(10 * (1 - getMod(s, c).amph)) : 3, hostile: hostile ? 1 : 0 }; d.path = []; delete d.ord; naval++;
        }
      }
      if (!n && !naval) return fail('Yol bulunamadı (tarafsız topraklardan geçilemez)');
      return { ok: true, naval };
    }
    case 'stop': for (const id of cmd.ids || []) { const d = s.divs[id]; if (d && d.o === tag) { d.path = []; d.inv = null; delete d.ord; } } return { ok: true };
    case 'order': for (const id of cmd.ids || []) { const d = s.divs[id]; if (d && d.o === tag) { if (cmd.ord) { d.ord = cmd.ord; } else delete d.ord; } } return { ok: true };
    case 'build': {
      const p = s.provs[cmd.prov]; const b = BUILDINGS[cmd.b]; if (!p || !b) return fail('Geçersiz');
      if (p.o !== tag || p.c !== tag) return fail('Yalnız kendi illerinize inşa edebilirsiniz');
      const queued = c.queue.filter(q => q.p === cmd.prov && q.t === cmd.b).length;
      if (b.slot) { const used = p.civ + p.mil + p.dock + c.queue.filter(q => q.p === cmd.prov && BUILDINGS[q.t].slot).length; if (used >= p.slots) return fail('Bina yuvası dolu'); }
      else if ((p[cmd.b] || 0) + queued >= b.max) return fail('En üst seviye');
      if (b.coastal && !MAP.provs[cmd.prov].coastal) return fail('Kıyı ili gerekli');
      if (c.queue.length >= 40) return fail('Kuyruk dolu');
      c.queue.push({ t: cmd.b, p: cmd.prov, prog: 0 }); return { ok: true };
    }
    case 'unbuild': if (c.queue[cmd.i]) c.queue.splice(cmd.i, 1); return { ok: true };
    case 'queueUp': { const i = cmd.i; if (i > 0 && c.queue[i]) { [c.queue[i - 1], c.queue[i]] = [c.queue[i], c.queue[i - 1]]; } return { ok: true }; }
    case 'prodAdd': { const e = EQUIP[cmd.eq]; if (!e) return fail('?'); if (cmd.eq === 'ftr' && !c.research.done.ftr1) return fail('Teknoloji gerekli'); if (cmd.eq === 'cas' && !c.research.done.cas1) return fail('Teknoloji gerekli'); if (cmd.eq === 'tank' && !c.research.done.tank1) return fail('Teknoloji gerekli'); if (cmd.eq === 'mot' && !c.research.done.mot1) return fail('Teknoloji gerekli'); c.lines.push({ eq: cmd.eq, f: 0, eff: 0.1 }); return { ok: true }; }
    case 'prodDel': c.lines.splice(cmd.i, 1); return { ok: true };
    case 'prodF': {
      const l = c.lines[cmd.i]; if (!l) return fail('?'); const dock = EQUIP[l.eq].dock;
      const used = c.lines.filter((x, k) => k !== cmd.i && !!EQUIP[x.eq].dock === !!dock).reduce((a, x) => a + x.f, 0);
      const cap = (dock ? c.dock : c.mil) - used; const nf = clamp(Math.round(cmd.f), 0, Math.max(0, cap));
      if (nf > l.f) l.eff = (l.eff * l.f + 0.1 * (nf - l.f)) / nf; l.f = nf; return { ok: true };
    }
    case 'research': {
      const t = TECH_BY_ID[cmd.id]; if (!t || !techAvailable(c, t)) return fail('Araştırılamaz');
      if (c.research.cur.length >= c.research.slots) return fail('Boş araştırma slotu yok');
      c.research.cur.push({ id: t.id, prog: 0 }); return { ok: true };
    }
    case 'unresearch': c.research.cur = c.research.cur.filter(r => r.id !== cmd.id); return { ok: true };
    case 'focus': {
      const f = focusById(tag, cmd.id); if (!f || c.focus.cur || !focusAvailable(s, c, f)) return fail('Odak seçilemez');
      if (f.tension && s.tension < f.tension) return fail(`Dünya gerginliği en az %${f.tension} olmalı`);
      if (f.after && s.day < parseDay(f.after)) return fail(`Bu odak ${f.after} tarihinden önce seçilemez`);
      c.focus.cur = f.id; c.focus.prog = 0; return { ok: true };
    }
    case 'train': {
      const tm = tmplOf(c, cmd.t); if (!tmplAllowed(c, tm)) return fail('Şablon için teknoloji eksik');
      const n = clamp(cmd.n || 1, 1, 20); for (let i = 0; i < n; i++) c.train.push({ t: tm.id, days: 30, p: cmd.prov ?? c.capital, paid: 0, ord: cmd.ord });
      return { ok: true };
    }
    case 'untrain': { const q = c.train[cmd.i]; if (q) { if (q.paid) { const st = tmplStats(s, c, tmplOf(c, q.t)); for (const e in st.eq) c.stock[e] += st.eq[e]; c.mpUsed -= st.mp; } c.train.splice(cmd.i, 1); } return { ok: true }; }
    case 'tmplSave': {
      const t = cmd.tmpl; if (!t || !t.bn) return fail('?');
      let tot = 0; const bn = {}; for (const k in t.bn) { if (!BATTALIONS[k]) continue; const n = clamp(Math.round(t.bn[k]), 0, 12); if (n) { bn[k] = n; tot += n; } }
      if (!tot || tot > 15) return fail('1-15 tabur olmalı');
      const name = String(t.name || 'Tümen').slice(0, 24);
      const ex = c.tmpl.find(x => x.id === t.id);
      if (ex) { ex.name = name; ex.bn = bn; } else { if (c.tmpl.length >= 10) return fail('En fazla 10 şablon'); c.tmpl.push({ id: 't' + (s.nextId++), name, bn }); }
      return { ok: true };
    }
    case 'law': {
      const L = LAWS[cmd.kind]; const lvl = cmd.lvl; if (!L || !L[lvl]) return fail('?');
      const law = L[lvl]; if (law.ws && c.ws < law.ws) return fail(`Savaş desteği en az %${Math.round(law.ws * 100)} olmalı`);
      if (law.war && !c.enemies.length) return fail('Savaşta olmalısınız');
      const cost = cmd.kind === 'econ' ? 120 : 90; if (c.pp < cost) return fail(`${cost} siyasi güç gerekli`);
      c.pp -= cost; c.laws[cmd.kind] = lvl; return { ok: true };
    }
    case 'justify': {
      const t = s.countries[cmd.target]; if (!t || !t.alive || cmd.target === tag) return fail('?');
      if (friendly(s, tag, cmd.target) || atWar(s, tag, cmd.target)) return fail('Bu ülkeye karşı gerekçe hazırlanamaz');
      if (c.puppetOf) return fail('Kuklalar savaş ilan edemez');
      if (c.wg[cmd.target]) return fail('Zaten hazırlanıyor');
      if (c.ideo === 'democracy' && s.tension < 40) return fail('Demokrasiler için dünya gerginliği en az %40 olmalı');
      if (c.ideo === 'communism' && s.tension < 20) return fail('Dünya gerginliği en az %20 olmalı');
      if (c.pp < 40) return fail('40 siyasi güç gerekli');
      c.pp -= 40; c.wg[cmd.target] = { days: t.major ? 45 : 30 }; s.tension = clamp(s.tension + (c.ideo === 'fascism' ? 3 : 1), 0, 100);
      if (isPlayer(s, cmd.target)) note(s, `${c.name} size karşı savaş gerekçesi hazırlıyor!`, cmd.target, 'bad');
      return { ok: true };
    }
    case 'declare': {
      const w = c.wg[cmd.target]; if (!w || w.days > 0) return fail('Savaş gerekçesi hazır değil');
      if (friendly(s, tag, cmd.target)) return fail('Dost ülke');
      declareWar(s, tag, cmd.target); return { ok: true };
    }
    case 'createFaction': { if (c.faction) return fail('Zaten bir ittifaktasınız'); if (c.puppetOf) return fail('Kukla'); if (c.pp < 50) return fail('50 siyasi güç gerekli'); c.pp -= 50; createFaction(s, tag, String(cmd.name || '').slice(0, 30) || null); return { ok: true }; }
    case 'invite': {
      const f = s.factions[c.faction]; if (!f || f.leader !== tag) return fail('İttifak lideri olmalısınız');
      const t = s.countries[cmd.target]; if (!t || !t.alive || t.puppetOf || t.faction === c.faction) return fail('Davet edilemez');
      if (atWar(s, tag, cmd.target)) return fail('Savaştasınız');
      if (c.pp < 15) return fail('15 siyasi güç gerekli'); c.pp -= 15;
      makeOffer(s, 'invite', tag, cmd.target, { fac: c.faction }); return { ok: true };
    }
    case 'requestJoin': {
      const f = s.factions[cmd.fac]; if (!f || c.faction === cmd.fac || c.puppetOf) return fail('?');
      if (c.pp < 15) return fail('15 siyasi güç gerekli'); c.pp -= 15;
      makeOffer(s, 'join', tag, f.leader); return { ok: true };
    }
    case 'leaveFaction': leaveFaction(s, tag); return { ok: true };
    case 'peace': {
      if (!atWar(s, tag, cmd.target)) return fail('Savaşta değilsiniz'); if (c.pp < 25) return fail('25 siyasi güç gerekli'); c.pp -= 25;
      makeOffer(s, 'peace', tag, cmd.target); return { ok: true };
    }
    case 'offerReply': { const o = s.offers.find(x => x.id === cmd.id && x.to === tag); if (!o) return fail('Teklif bulunamadı'); resolveOffer(s, o, !!cmd.accept); return { ok: true }; }
    case 'trade': {
      if (!RESOURCES[cmd.res]) return fail('?'); const n = clamp(Math.round(cmd.n), 0, 30);
      const cur = c.trade[cmd.res] || 0; const cb = civBreakdown(c); if (n - cur > cb.avail) return fail('Yeterli sivil fabrika yok');
      if (n) c.trade[cmd.res] = n; else delete c.trade[cmd.res]; recomputeCountries(s); return { ok: true };
    }
    case 'wingCreate': {
      const p = s.provs[cmd.prov]; if (!p || p.c !== tag) return fail('Kendi kontrolünüzdeki ilde olmalı');
      const type = cmd.wt === 'cas' ? 'cas' : 'ftr'; const n = clamp(Math.floor(Math.min(cmd.n || 50, c.stock[type])), 0, 100);
      if (n < 10) return fail('Stokta yeterli uçak yok (en az 10)'); c.stock[type] -= n; makeWing(s, tag, cmd.prov, type, n); return { ok: true };
    }
    case 'wingMove': { const w = s.wings[cmd.id]; const p = s.provs[cmd.prov]; if (!w || w.o !== tag || !p || !friendly(s, tag, p.c)) return fail('Geçersiz üs'); w.p = cmd.prov; return { ok: true }; }
    case 'wingDel': { const w = s.wings[cmd.id]; if (w && w.o === tag) { c.stock[w.type] += Math.floor(w.n); delete s.wings[cmd.id]; } return { ok: true }; }
    case 'fleetCreate': {
      const n = Math.floor(Math.min(cmd.n || c.stock.ship, c.stock.ship)); if (n < 1) return fail('Stokta gemi yok');
      const z = cmd.z; if (z == null || !MAP.seas[z]) return fail('?');
      const ok = s.provs.some((p, i) => p.c === tag && MAP.provs[i].seas.includes(z)); if (!ok) return fail('Bu denize kıyınız yok');
      c.stock.ship -= n; makeFleet(s, tag, z, n); return { ok: true };
    }
    case 'fleetAdd': { const f = s.fleets[cmd.id]; if (!f || f.o !== tag) return fail('?'); const n = Math.floor(c.stock.ship); if (n < 1) return fail('Stokta gemi yok'); f.ships += n; c.stock.ship -= n; return { ok: true }; }
    case 'fleetMove': {
      const f = s.fleets[cmd.id]; if (!f || f.o !== tag) return fail('?');
      const to = cmd.z; const prev = new Int32Array(MAP.seas.length).fill(-2); prev[f.z] = -1; const q = [f.z];
      while (q.length) { const z = q.shift(); if (z === to) break; for (const n of MAP.seaAdj[z]) if (prev[n] === -2) { prev[n] = z; q.push(n); } }
      if (prev[to] === -2) return fail('Deniz yolu yok'); const path = []; for (let z = to; z !== f.z; z = prev[z]) path.unshift(z); f.path = path; return { ok: true };
    }
    default: return fail('Bilinmeyen komut');
  }
}
export { invalidateIdx };
