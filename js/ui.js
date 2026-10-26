// Oyun içi arayüz: üst çubuk, yan paneller, il paneli, birlik çubuğu, bildirimler, modallar
import { MAP } from './mapdata.js';
import { IDEOLOGIES, EQUIP, BATTALIONS, TERRAIN, LAWS, BUILDINGS, RESOURCES, LAND_EQ } from './scenario.js';
import { TECHS, TECH_CATS, TECH_BY_ID, techAvailable, techDays } from './tech.js';
import { focusTree, focusAvailable } from './focus.js';
import { fmtDate, fmt, pct, esc, yearOf, clamp } from './util.js';
import { flagURL } from './flags.js';
import * as S from './sim.js';

const PANELS = [
  ['politics', '🏛', 'Siyaset ve Ulusal Odak'], ['research', '🔬', 'Araştırma'], ['industry', '🏭', 'Sanayi ve İnşaat'], ['production', '⚙', 'Üretim'],
  ['army', '🎖', 'Ordu: Eğitim ve Şablonlar'], ['airnavy', '✈', 'Hava ve Deniz Kuvvetleri'], ['diplomacy', '🤝', 'Diplomasi'], ['trade', '📦', 'Kaynaklar ve Ticaret'], ['log', '📜', 'Olay Günlüğü'], ['menu', '☰', 'Menü']
];
const $ = id => document.getElementById(id);
const bar = (v, col = '#5fd35f', w = 100) => `<span class="bar" style="width:${w}px"><i style="width:${clamp(v, 0, 1) * 100}%;background:${col}"></i></span>`;
const flag = (s, t, h = 16) => `<img class="flag" style="height:${h}px" src="${flagURL(t, s.countries[t]?.color)}" alt="">`;

export class UI {
  constructor(game) {
    this.g = game; this.panel = null; this.lastUpd = 0; this.pending = false; this.seenNote = 0; this.shownOffers = new Set(); this.researchCat = 'all'; this.dipSearch = ''; this.focusScroll = null;
    this.buildNav();
    document.body.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && !el.disabled) { e.preventDefault(); this.act(el.dataset.act, el); } });
    document.body.addEventListener('input', e => { const el = e.target; if (el.id === 'dip-search') { this.dipSearch = el.value; this.renderPanel(true); } });
    $('panel-close').onclick = () => this.openPanel(null);
    this.initChat();
    this.initMapModes();
  }
  get s() { return this.g.state; } get me() { return this.g.myTag; } get c() { return this.s.countries[this.me]; } get R() { return this.g.renderer; }
  send(cmd) { return this.g.send(cmd).then(r => { if (r && !r.ok && r.err) this.toast(r.err, 'bad'); this.update(true); this.R.mark(); return r; }); }
  buildNav() {
    $('leftnav').innerHTML = PANELS.map(([id, ic, name]) => `<button data-act="panel" data-p="${id}" title="${name}"><span>${ic}</span></button>`).join('');
  }
  initMapModes() {
    const modes = [['political', 'Siyasi'], ['faction', 'İttifak'], ['ideology', 'İdeoloji'], ['terrain', 'Arazi'], ['supply', 'İkmal']];
    $('mapmodes').innerHTML = modes.map(([m, n]) => `<button data-act="mapmode" data-m="${m}" class="${m === 'political' ? 'on' : ''}">${n}</button>`).join('');
  }
  initChat() {
    const input = $('chat-input');
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) { this.g.chat(input.value.trim()); input.value = ''; } e.stopPropagation(); });
  }
  addChat(from, text, sys) { const log = $('chat-log'); const d = document.createElement('div'); d.className = sys ? 'sys' : ''; d.innerHTML = sys ? esc(text) : `<b>${esc(from)}:</b> ${esc(text)}`; log.appendChild(d); log.scrollTop = log.scrollHeight; $('chat').classList.remove('hidden'); if (!sys && from !== this.g.myName) { $('chat').classList.add('flash'); setTimeout(() => $('chat').classList.remove('flash'), 1200); } }
  toast(text, kind = 'info', ms = 5000) {
    const n = document.createElement('div'); n.className = 'toast ' + kind; n.innerHTML = text; $('notifs').prepend(n);
    setTimeout(() => n.classList.add('out'), ms); setTimeout(() => n.remove(), ms + 500);
    while ($('notifs').children.length > 6) $('notifs').lastChild.remove();
  }
  openPanel(p) {
    this.panel = this.panel === p ? null : p;
    document.querySelectorAll('#leftnav button').forEach(b => b.classList.toggle('on', b.dataset.p === this.panel));
    $('panel').classList.toggle('hidden', !this.panel);
    if (this.panel) { $('panel-title').textContent = PANELS.find(x => x[0] === this.panel)[2]; $('panel-body').scrollTop = 0; this.renderPanel(true); }
  }
  // ---------- güncelleme döngüsü ----------
  update(force) {
    if (this.pending && !force) return; this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false; const now = performance.now(); if (!force && now - this.lastUpd < 180) { setTimeout(() => this.update(), 190 - (now - this.lastUpd)); return; } this.lastUpd = now;
      if (!this.s || !this.c) return;
      this.renderTop(); this.renderPanel(); this.renderProv(); this.renderUnits(); this.processNotes();
    });
  }
  renderTop() {
    const s = this.s, c = this.c; const cb = S.civBreakdown(c); const milUsed = c.lines.filter(l => !EQUIP[l.eq].dock).reduce((a, l) => a + l.f, 0);
    const short = Object.entries(c.resRatio || {}).filter(([, v]) => v < 0.99).map(([r]) => RESOURCES[r]);
    const spd = s.speed; const host = this.g.role !== 'guest';
    $('topbar').innerHTML = `
      <div class="tb-country" data-act="panel" data-p="politics">${flag(s, this.me, 26)}<div><b>${esc(c.name)}</b><small>${IDEOLOGIES[c.ideo].name}${c.faction && s.factions[c.faction] ? ' · ' + esc(s.factions[c.faction].name) : ''}${c.puppetOf ? ' · ' + esc(S.cname(s, c.puppetOf)) + ' kuklası' : ''}</small></div></div>
      <div class="tb-item" title="Siyasi güç (günlük +${(c.puppetOf ? 1 : 2) + S.getMod(s, c).ppGain})"><span class="ic">⚖</span>${Math.floor(c.pp)}</div>
      <div class="tb-item" title="İstikrar"><span class="ic">☮</span>${pct(c.stab)}</div>
      <div class="tb-item" title="Savaş desteği"><span class="ic">✊</span>${pct(c.ws)}</div>
      <div class="tb-item" title="Kullanılabilir insan gücü (bin)"><span class="ic">👥</span>${fmt(S.mpAvail(c))}B</div>
      <div class="tb-item" title="Sivil fabrika: ${c.civ} (tüketim ${cb.cg}, ticaret ${cb.trade}, kullanılabilir ${cb.avail})"><span class="ic civ">▣</span>${cb.avail}/${c.civ}</div>
      <div class="tb-item" title="Askerî fabrika (kullanılan/toplam)"><span class="ic mil">▣</span>${milUsed}/${c.mil}</div>
      <div class="tb-item" title="Tersane"><span class="ic dock">⚓</span>${c.dock}</div>
      <div class="tb-item ${short.length ? 'warn' : ''}" title="${short.length ? 'Kaynak eksikliği: ' + short.join(', ') : 'Kaynaklar yeterli'}" data-act="panel" data-p="trade"><span class="ic">⛏</span>${short.length ? '!' : '✓'}</div>
      <div class="tb-item" title="Tümen sayısı"><span class="ic">⚔</span>${Object.values(s.divs).filter(d => d.o === this.me).length}</div>
      <div class="tb-item" title="Dünya gerginliği"><span class="ic">🌐</span>${Math.round(s.tension)}%</div>
      <div class="tb-spacer"></div>
      <div class="tb-date">${fmtDate(s.day)}</div>
      <div class="tb-speed">
        <button data-act="speed" data-v="0" class="${spd === 0 ? 'on' : ''}" title="${host ? 'Duraklat (Boşluk)' : 'Duraklatma iste'}">❚❚</button>
        ${[1, 2, 3, 4, 5].map(v => `<button data-act="speed" data-v="${v}" class="${spd === v ? 'on' : ''}" ${host ? '' : 'disabled'}>${'›'.repeat(Math.min(v, 3))}${v > 3 ? v : ''}</button>`).join('')}
      </div>
      <div class="tb-net" title="${esc(this.g.netStatus || '')}">${this.g.role === 'sp' ? 'Tek oyunculu' : (this.g.netOk ? '🟢 ' : '🔴 ') + esc(this.g.netLabel || '')}</div>
      ${this.g.role !== 'sp' ? '<button class="tb-chat" data-act="chat">💬</button>' : ''}`;
  }
  renderPanel(force) {
    if (!this.panel) return;
    const body = $('panel-body');
    const ae = document.activeElement; if (!force && ae && body.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) return;
    if (!force && (this.panel === 'menu' || this.panel === 'log' && this._logN === this.s.notes.length)) return;
    const fn = this['p_' + this.panel]; if (!fn) return;
    const st = body.scrollTop; const fs = body.querySelector('.focus-wrap'); const fsl = fs ? [fs.scrollLeft, fs.scrollTop] : null;
    body.innerHTML = fn.call(this);
    body.scrollTop = st; const fs2 = body.querySelector('.focus-wrap'); if (fs2 && fsl) { fs2.scrollLeft = fsl[0]; fs2.scrollTop = fsl[1]; }
  }

  // ---------- paneller ----------
  p_politics() {
    const s = this.s, c = this.c; const m = S.getMod(s, c);
    let h = `<div class="sec head">${flag(s, this.me, 40)}<div><h2>${esc(c.name)}</h2><span class="badge" style="background:${IDEOLOGIES[c.ideo].color}">${IDEOLOGIES[c.ideo].name}</span>${c.faction && s.factions[c.faction] ? ` <span class="badge">${esc(s.factions[c.faction].name)}</span>` : ''}</div></div>`;
    h += `<div class="sec grid2"><div>Siyasi Güç</div><div><b>${Math.floor(c.pp)}</b> (+${((c.puppetOf ? 1 : 2) + m.ppGain).toFixed(2)}/gün)</div>
      <div>İstikrar</div><div>${bar(c.stab, '#6fb3e0')} ${pct(c.stab)}</div><div>Savaş Desteği</div><div>${bar(c.ws, '#e0a040')} ${pct(c.ws)}</div>
      ${c.enemies.length ? `<div>Teslimiyet</div><div>${bar(c.surrender, '#e05a3a')} ${pct(c.surrender)}</div>` : ''}
      <div>Zafer Puanı</div><div>${c.vp}</div></div>`;
    h += `<h3>Kanunlar</h3>`;
    for (const kind of ['econ', 'consc']) {
      const L = LAWS[kind]; h += `<div class="sec"><div class="lbl">${kind === 'econ' ? 'Ekonomi' : 'Askerlik'}: <b>${L[c.laws[kind]].name}</b></div><div class="btnrow">`;
      L.forEach((law, i) => {
        const can = i !== c.laws[kind] && (!law.ws || c.ws >= law.ws) && (!law.war || c.enemies.length);
        const tip = kind === 'econ' ? `Tüketim malları %${law.cg * 100}, inşaat ${law.build >= 0 ? '+' : ''}${Math.round(law.build * 100)}%, askerî üretim ${law.mil >= 0 ? '+' : ''}${Math.round(law.mil * 100)}%` : `İnsan gücü: nüfusun %${(law.rate * 100).toFixed(1)}'i`;
        h += `<button class="small ${i === c.laws[kind] ? 'on' : ''}" data-act="law" data-k="${kind}" data-l="${i}" ${can ? '' : 'disabled'} title="${tip}${law.ws ? ` · Savaş desteği ≥ %${law.ws * 100}` : ''}${law.war ? ' · Savaşta olmalı' : ''} · ${kind === 'econ' ? 120 : 90} SG">${law.name}</button>`;
      });
      h += `</div></div>`;
    }
    const tree = focusTree(this.me);
    const cur = c.focus.cur ? tree.find(f => f.id === c.focus.cur) : null;
    h += `<h3>Ulusal Odak</h3><div class="sec">${cur ? `Şu an: <b>${esc(cur.name)}</b> ${bar(c.focus.prog / cur.days, '#e0c040', 160)} ${cur.days - c.focus.prog} gün` : '<i>Odak seçilmedi — aşağıdan birini seçin.</i>'}</div>`;
    const W = 112, Hh = 64; const maxX = Math.max(...tree.map(f => f.x)) + 1, maxY = Math.max(...tree.map(f => f.y)) + 1;
    let lines = '';
    for (const f of tree) for (const r of f.req.concat(f.reqAny || [])) { const p = tree.find(x => x.id === r); if (p) lines += `<line x1="${p.x * W + W / 2 - 4}" y1="${p.y * Hh + 44}" x2="${f.x * W + W / 2 - 4}" y2="${f.y * Hh + 4}" stroke="${c.focus.done[r] ? '#8fbf6f' : '#555'}" stroke-width="2" ${f.reqAny ? 'stroke-dasharray="4 3"' : ''}/>`; }
    h += `<div class="focus-wrap"><div class="focus-tree" style="width:${maxX * W}px;height:${maxY * Hh}px"><svg width="${maxX * W}" height="${maxY * Hh}">${lines}</svg>`;
    for (const f of tree) {
      const st = c.focus.done[f.id] ? 'done' : c.focus.cur === f.id ? 'cur' : (!c.focus.cur && focusAvailable(s, c, f) && !(f.tension && s.tension < f.tension)) ? 'avail' : (focusAvailable(s, c, f) ? 'wait' : 'locked');
      h += `<div class="focus ${st}" style="left:${f.x * W}px;top:${f.y * Hh}px" ${st === 'avail' ? `data-act="focus" data-id="${f.id}"` : ''} title="${esc(f.name)}: ${esc(f.desc)} (${f.days} gün)${f.after ? ' · ' + f.after + ' sonrası' : ''}${f.tension ? ' · gerginlik ≥ %' + f.tension : ''}">${esc(f.name)}</div>`;
    }
    h += `</div></div><div class="hint">Sol sütunlar genel ağaç, sağdaki blok ülkeye özel odaklardır. Yeşil: tamamlandı · Sarı: sürüyor · Parlak: seçilebilir.</div>`;
    return h;
  }
  p_research() {
    const s = this.s, c = this.c; const yr = yearOf(s.day); const m = S.getMod(s, c);
    let h = `<div class="sec"><b>Araştırma slotları: ${c.research.cur.length}/${c.research.slots}</b> · Araştırma hızı +%${Math.round(m.research * 100)}</div>`;
    for (let i = 0; i < c.research.slots; i++) {
      const r = c.research.cur[i];
      if (r) { const t = TECH_BY_ID[r.id]; const days = Math.ceil((1 - r.prog) * techDays(c, t, yr) / (1 + m.research)); h += `<div class="slot"><b>${esc(t.name)}</b> ${bar(r.prog, '#6fb3e0', 150)} ~${days} gün <button class="x" data-act="unresearch" data-id="${t.id}" title="İptal">×</button></div>`; }
      else h += `<div class="slot empty">Boş slot — aşağıdan teknoloji seçin</div>`;
    }
    h += `<div class="tabs">${['all', ...Object.keys(TECH_CATS)].map(k => `<button data-act="rcat" data-k="${k}" class="${this.researchCat === k ? 'on' : ''}">${k === 'all' ? 'Tümü' : TECH_CATS[k]}</button>`).join('')}</div>`;
    const free = c.research.cur.length < c.research.slots;
    for (const cat of Object.keys(TECH_CATS)) {
      if (this.researchCat !== 'all' && this.researchCat !== cat) continue;
      h += `<h3>${TECH_CATS[cat]}</h3><div class="techs">`;
      for (const t of TECHS.filter(t => t.cat === cat)) {
        const done = c.research.done[t.id], cur = c.research.cur.some(r => r.id === t.id), av = techAvailable(c, t);
        const days = Math.round(techDays(c, t, yr) / (1 + m.research)); const ahead = t.year > yr;
        h += `<div class="tech ${done ? 'done' : cur ? 'cur' : av ? 'avail' : 'locked'}" title="${esc(t.desc)}${t.req.length ? ' · Gerekli: ' + t.req.map(r => TECH_BY_ID[r].name).join(', ') : ''}${t.grp ? ' · Doktrin dalı (diğerlerini kilitler)' : ''}">
          <div class="tn">${esc(t.name)}</div><div class="ty">${t.year}${ahead && !done ? ' ⚠' : ''}</div><div class="td">${esc(t.desc)}</div>
          ${done ? '<div class="ts">✓ Tamamlandı</div>' : cur ? '<div class="ts">Araştırılıyor</div>' : av ? `<button class="small" data-act="research" data-id="${t.id}" ${free ? '' : 'disabled'}>Araştır (${days} gün)</button>` : '<div class="ts">Kilitli</div>'}</div>`;
      }
      h += `</div>`;
    }
    return h;
  }
  p_industry() {
    const s = this.s, c = this.c; const cb = S.civBreakdown(c); const bm = S.buildSpeedMult(s, c);
    let h = `<div class="sec grid2"><div>Sivil fabrikalar</div><div>${c.civ}</div><div>Tüketim malları</div><div>−${cb.cg}</div><div>Ticaret</div><div>−${cb.trade}</div><div>İnşaatta kullanılabilir</div><div><b>${cb.avail}</b> (proje başına en çok 15)</div><div>İnşaat hızı</div><div>${pct(bm)}</div></div>`;
    h += `<h3>İnşaat Kuyruğu (${c.queue.length})</h3>`;
    if (!c.queue.length) h += `<div class="hint">Kuyruk boş. Haritada bir il seçip sağ panelden ya da aşağıdaki tablodan inşa edin.</div>`;
    let civLeft = cb.avail;
    c.queue.forEach((q, i) => {
      const use = Math.min(15, civLeft); civLeft -= use; const p = s.provs[q.p];
      const rate = use * 5 * bm * (1 + 0.1 * p.infra) / BUILDINGS[q.t].cost; const days = rate > 0 ? Math.ceil((1 - q.prog) / rate) : '∞';
      h += `<div class="qrow"><span class="qn">${BUILDINGS[q.t].name}</span><a data-act="goto" data-p="${q.p}">${esc(MAP.provs[q.p].name)}</a> ${bar(q.prog, '#e0c040', 90)} <small>${use} fab · ${days} gün</small>
        ${i ? `<button class="x" data-act="qup" data-i="${i}" title="Öne al">▲</button>` : ''}<button class="x" data-act="unbuild" data-i="${i}" title="İptal">×</button></div>`;
    });
    h += `<h3>İlleriniz</h3><table class="tbl"><tr><th>İl</th><th>Yuva</th><th>Alt.</th><th>Tah.</th><th>İnşa</th></tr>`;
    const own = s.provs.map((p, i) => [p, i]).filter(([p]) => p.o === this.me && p.c === this.me).sort((a, b) => MAP.provs[b[1]].vp - MAP.provs[a[1]].vp);
    for (const [p, i] of own) {
      const used = p.civ + p.mil + p.dock;
      h += `<tr><td><a data-act="goto" data-p="${i}">${esc(MAP.provs[i].name)}</a></td><td>${used}/${p.slots} <small>(${p.civ}S ${p.mil}A ${p.dock}T)</small></td><td>${p.infra}</td><td>${p.fort}</td>
        <td class="btns"><button class="small" data-act="build" data-b="civ" data-p="${i}" title="Sivil fabrika">S</button><button class="small" data-act="build" data-b="mil" data-p="${i}" title="Askerî fabrika">A</button>${MAP.provs[i].coastal ? `<button class="small" data-act="build" data-b="dock" data-p="${i}" title="Tersane">T</button>` : ''}<button class="small" data-act="build" data-b="infra" data-p="${i}" title="Altyapı">Al</button><button class="small" data-act="build" data-b="fort" data-p="${i}" title="Kara tahkimatı">Th</button></td></tr>`;
    }
    return h + `</table>`;
  }
  p_production() {
    const s = this.s, c = this.c; const m = S.getMod(s, c);
    const milUsed = c.lines.filter(l => !EQUIP[l.eq].dock).reduce((a, l) => a + l.f, 0), dockUsed = c.lines.filter(l => EQUIP[l.eq].dock).reduce((a, l) => a + l.f, 0);
    const law = LAWS.econ[c.laws.econ]; const mult = 4.5 * (1 + m.ind + (law.mil || 0)) * S.stabFactor(c);
    let h = `<div class="sec grid2"><div>Askerî fabrika</div><div><b>${milUsed}</b>/${c.mil} atanmış</div><div>Tersane</div><div><b>${dockUsed}</b>/${c.dock} atanmış</div><div>Fabrika verimi</div><div>+%${Math.round((m.ind + (law.mil || 0)) * 100)} · Verimlilik sınırı %${Math.round((0.5 + m.effCap) * 100)}</div></div>`;
    h += `<h3>Üretim Hatları</h3>`;
    c.lines.forEach((l, i) => {
      const e = EQUIP[l.eq]; let rr = 1; for (const r in e.res) rr = Math.min(rr, c.resRatio?.[r] ?? 1);
      const out = l.f * mult * l.eff * (0.25 + 0.75 * rr) / e.cost;
      h += `<div class="pline"><div class="pn">${e.name}${rr < 0.99 ? ' <span class="warn" title="Kaynak eksik">⚠</span>' : ''}</div>
        <div class="pf"><button class="x" data-act="prodF" data-i="${i}" data-d="-1">−</button><b>${l.f}</b><button class="x" data-act="prodF" data-i="${i}" data-d="1">+</button><button class="x" data-act="prodF" data-i="${i}" data-d="5">+5</button></div>
        <div class="pe" title="Üretim verimliliği">${bar(l.eff / (0.5 + m.effCap), '#6fb3e0', 60)} ${Math.round(l.eff * 100)}%</div><div class="po">${out >= 1 ? out.toFixed(1) : out.toFixed(2)}/gün</div><button class="x" data-act="prodDel" data-i="${i}" title="Hattı kaldır">×</button></div>`;
    });
    h += `<div class="btnrow">Yeni hat: ${Object.entries(EQUIP).map(([k, e]) => `<button class="small" data-act="prodAdd" data-eq="${k}">${e.name}</button>`).join('')}</div>`;
    h += `<h3>Ekipman Stoku</h3><div class="grid2">${Object.entries(EQUIP).map(([k, e]) => `<div>${e.name}</div><div><b>${fmt(c.stock[k] || 0)}</b></div>`).join('')}</div>`;
    return h;
  }
  tmplRow(t) {
    const s = this.s, c = this.c; const st = S.tmplStats(s, c, t); const ok = S.tmplAllowed(c, t);
    const comp = Object.entries(t.bn).filter(([, n]) => n).map(([k, n]) => `${n}×${BATTALIONS[k].name}`).join(', ');
    const eq = Object.entries(st.eq).map(([k, n]) => `${n} ${EQUIP[k].name}`).join(', ');
    return `<div class="tmpl ${ok ? '' : 'locked'}"><div class="th"><b>${esc(t.name)}</b> <small>${comp}</small></div>
      <div class="tstats">Saldırı ${Math.round(st.sa)}/${Math.round(st.ha)} · Savunma ${Math.round(st.def)} · Yarma ${Math.round(st.brk)} · Org ${Math.round(st.org)} · Can ${Math.round(st.hp)} · Zırh ${Math.round(st.armor)} · Genişlik ${st.width} · Hız ${st.spd.toFixed(1)} km/s</div>
      <div class="tcost">Maliyet: ${st.mp.toFixed(1)}B asker, ${eq}</div>
      <div class="btnrow"><button class="small" data-act="train" data-t="${t.id}" data-n="1" ${ok ? '' : 'disabled'}>Eğit ×1</button><button class="small" data-act="train" data-t="${t.id}" data-n="5" ${ok ? '' : 'disabled'}>×5</button><button class="small" data-act="tmplEdit" data-t="${t.id}">Düzenle</button>${ok ? '' : '<span class="warn">Teknoloji eksik</span>'}</div></div>`;
  }
  p_army() {
    const s = this.s, c = this.c; const mine = Object.values(s.divs).filter(d => d.o === this.me);
    const dep = this.g.deployProv != null && s.provs[this.g.deployProv]?.c === this.me ? this.g.deployProv : c.capital;
    let h = `<div class="sec grid2"><div>İnsan gücü</div><div><b>${fmt(S.mpAvail(c))}B</b> / ${fmt(S.mpMax(c))}B</div><div>Tümenler</div><div>${mine.length} (muharebede ${mine.filter(d => d.cmb).length}, ikmalsiz ${mine.filter(d => !d.sup).length})</div>
      <div>Konuşlanma yeri</div><div>${dep >= 0 ? esc(MAP.provs[dep].name) : '-'} <small>(haritada il seçip "Burada konuşlan" ile değiştirin)</small></div></div>
      <div class="btnrow"><button class="small" data-act="selAll">Tüm tümenleri seç</button><button class="small" data-act="selIdle">Boştakileri seç</button></div>`;
    h += `<h3>Eğitim Kuyruğu (${c.train.length})</h3>`;
    if (!c.train.length) h += '<div class="hint">Eğitimde tümen yok.</div>';
    c.train.forEach((q, i) => { const t = S.tmplOf(c, q.t); h += `<div class="qrow"><span class="qn">${esc(t.name)}</span> ${q.paid ? bar(1 - q.days / 30, '#5fd35f', 90) + ` ${q.days} gün` : '<span class="warn">Ekipman/insan gücü bekleniyor</span>'} <button class="x" data-act="untrain" data-i="${i}">×</button></div>`; });
    h += `<h3>Tümen Şablonları</h3>` + c.tmpl.map(t => this.tmplRow(t)).join('') + `<button class="small" data-act="tmplEdit" data-t="new">+ Yeni şablon</button>`;
    return h;
  }
  p_airnavy() {
    const s = this.s, c = this.c; const sp = this.R.selProv;
    const wings = Object.values(s.wings).filter(w => w.o === this.me), fleets = Object.values(s.fleets).filter(f => f.o === this.me);
    let h = `<div class="sec grid2"><div>Avcı uçağı stoku</div><div><b>${fmt(c.stock.ftr)}</b></div><div>Yakın destek uçağı stoku</div><div><b>${fmt(c.stock.cas)}</b></div><div>Gemi stoku</div><div><b>${fmt(c.stock.ship)}</b></div></div>`;
    h += `<h3>Hava Kanatları</h3><div class="hint">Kanatlar üslerinin 2 il çevresindeki muharebelerde hava üstünlüğü (avcı) veya yakın destek (YHD) sağlar ve stoktan kendini tamamlar.</div>`;
    wings.forEach(w => h += `<div class="qrow"><span class="qn">${w.type === 'ftr' ? '✈ Avcı' : '✈ YHD'} (${Math.round(w.n)})</span><a data-act="goto" data-p="${w.p}">${esc(MAP.provs[w.p].name)}</a>
      <button class="small" data-act="wingMove" data-id="${w.id}" ${sp >= 0 ? '' : 'disabled'} title="Seçili ile taşı">Seçili ile taşı</button><button class="x" data-act="wingDel" data-id="${w.id}" title="Dağıt">×</button></div>`);
    h += `<div class="btnrow">Seçili ilde kur: <button class="small" data-act="wingCreate" data-t="ftr" ${sp >= 0 ? '' : 'disabled'}>Avcı kanadı</button><button class="small" data-act="wingCreate" data-t="cas" ${sp >= 0 ? '' : 'disabled'}>YHD kanadı</button></div>`;
    h += `<h3>Filolar</h3><div class="hint">Filoyu haritada tıklayarak seçin, sonra sağ tıkla bir denize gönderin. Deniz üstünlüğü indirmeleri ve denizaşırı ikmali belirler.</div>`;
    const coastZones = [...new Set(s.provs.flatMap((p, i) => p.c === this.me ? MAP.provs[i].seas : []))];
    fleets.forEach(f => {
      const bal = S.zoneBalance(s, this.me, f.z);
      h += `<div class="qrow"><span class="qn">⚓ ${esc(f.name)} (${Math.round(f.ships)})</span><small>${esc(MAP.seas[f.z].name)}${f.path.length ? ' → ' + esc(MAP.seas[f.path[f.path.length - 1]].name) : ''} · üstünlük ${bal.own + bal.en > 0 ? pct(bal.own / (bal.own + bal.en)) : '-'}</small>
        <select data-fleet="${f.id}" class="fleetsel"><option value="">Git…</option>${MAP.seas.map(z => `<option value="${z.id}">${esc(z.name)}</option>`).join('')}</select>
        <button class="small" data-act="fleetGo" data-id="${f.id}">Git</button><button class="small" data-act="fleetAdd" data-id="${f.id}" title="Stoktaki gemileri ekle">+Gemi</button></div>`;
    });
    h += `<div class="btnrow">Yeni filo: <select id="newfleet-z">${coastZones.map(z => `<option value="${z}">${esc(MAP.seas[z].name)}</option>`).join('')}</select><button class="small" data-act="fleetCreate" ${c.stock.ship >= 1 ? '' : 'disabled'}>Stoktan filo kur</button></div>`;
    return h;
  }
  p_diplomacy() {
    const s = this.s, c = this.c; const me = this.me;
    let h = `<div class="sec grid2"><div>Dünya gerginliği</div><div>${bar(s.tension / 100, '#e05a3a')} ${Math.round(s.tension)}%</div></div>`;
    const offers = s.offers.filter(o => o.to === me);
    if (offers.length) { h += `<h3>Bekleyen Teklifler</h3>`; offers.forEach(o => h += `<div class="qrow">${this.offerText(o)} <button class="small" data-act="offer" data-id="${o.id}" data-a="1">Kabul</button><button class="small" data-act="offer" data-id="${o.id}" data-a="0">Ret</button></div>`); }
    h += `<h3>Savaşlar</h3>`;
    if (!c.enemies.length) h += '<div class="hint">Barıştasınız.</div>';
    else h += `<div class="sec">${c.enemies.map(e => `<span class="chip enemy">${flag(s, e)} ${esc(S.cname(s, e))}</span>`).join(' ')}</div>`;
    const f = c.faction && s.factions[c.faction];
    h += `<h3>İttifak</h3>`;
    if (f) h += `<div class="sec"><b>${esc(f.name)}</b> (lider: ${esc(S.cname(s, f.leader))})<div>${f.members.map(m => `<span class="chip">${flag(s, m)} ${esc(S.cname(s, m))}</span>`).join(' ')}</div><button class="small" data-act="leaveFac">İttifaktan ayrıl</button></div>`;
    else h += `<div class="sec">İttifakınız yok. <input id="fac-name" placeholder="İttifak adı" maxlength="30"> <button class="small" data-act="createFac" ${c.puppetOf ? 'disabled' : ''}>Kur (50 SG)</button></div>`;
    h += `<div class="sec">${Object.values(s.factions).filter(x => x.id !== c.faction).map(x => `<div class="qrow"><span class="dot" style="background:${x.color}"></span><b>${esc(x.name)}</b> <small>${x.members.length} üye · lider ${esc(S.cname(s, x.leader))}</small> <button class="small" data-act="reqJoin" data-f="${x.id}" ${c.puppetOf ? 'disabled' : ''}>Katılma iste (15 SG)</button></div>`).join('')}</div>`;
    h += `<h3>Ülkeler</h3><input id="dip-search" placeholder="Ülke ara…" value="${esc(this.dipSearch)}">`;
    const list = Object.values(s.countries).filter(x => x.alive && x.tag !== me && (!this.dipSearch || x.name.toLocaleLowerCase('tr').includes(this.dipSearch.toLocaleLowerCase('tr')))).sort((a, b) => (b.civ + b.mil) - (a.civ + a.mil));
    h += `<div class="clist">`;
    for (const x of list.slice(0, 60)) {
      const war = S.atWar(s, me, x.tag), fr = S.friendly(s, me, x.tag), wg = c.wg[x.tag];
      const isP = S.isPlayer(s, x.tag);
      h += `<div class="crow ${war ? 'war' : fr ? 'fr' : ''}">${flag(s, x.tag)}<div class="cn"><b>${esc(x.name)}</b>${isP ? ' <span class="badge">Oyuncu</span>' : ''}<small>${IDEOLOGIES[x.ideo].name} · ${x.civ}S/${x.mil}A · ${x.faction && s.factions[x.faction] ? esc(s.factions[x.faction].name) : 'ittifaksız'}${x.puppetOf ? ' · ' + esc(S.cname(s, x.puppetOf)) + ' kuklası' : ''}</small></div><div class="ca">`;
      if (war) h += `<button class="small" data-act="peace" data-t="${x.tag}">Barış teklif et</button>`;
      else if (!fr) {
        if (wg && wg.days <= 0) h += `<button class="small danger" data-act="declare" data-t="${x.tag}">Savaş ilan et</button>`;
        else if (wg) h += `<small>Gerekçe: ${wg.days} gün</small>`;
        else h += `<button class="small" data-act="justify" data-t="${x.tag}" ${c.puppetOf ? 'disabled' : ''} title="40 SG">Gerekçe hazırla</button>`;
        if (f && f.leader === me && !x.faction && !x.puppetOf) h += `<button class="small" data-act="invite" data-t="${x.tag}">Davet et</button>`;
      }
      h += `<button class="small" data-act="gotoC" data-t="${x.tag}" title="Haritada göster">◎</button></div></div>`;
    }
    return h + `</div>`;
  }
  p_trade() {
    const c = this.c; const need = S.resBalance(c); const cb = S.civBreakdown(c);
    let h = `<div class="hint">Her ticarete ayrılan sivil fabrika dünya pazarından 8 birim kaynak getirir. Eksik kaynak ilgili üretim hatlarının verimini düşürür.</div><div class="sec">Ticarete ayrılabilecek boş sivil fabrika: <b>${cb.avail}</b></div>`;
    h += `<table class="tbl"><tr><th>Kaynak</th><th>Var</th><th>İhtiyaç</th><th>Karşılanan</th><th>İthalat (fabrika)</th></tr>`;
    for (const r in RESOURCES) {
      const have = c.res?.[r] || 0, nd = need[r] || 0; const ratio = nd ? Math.min(1, have / nd) : 1; const tr = c.trade[r] || 0;
      h += `<tr><td>${RESOURCES[r]}</td><td>${Math.round(have)}</td><td>${nd.toFixed(1)}</td><td class="${ratio < 1 ? 'warn' : ''}">${pct(ratio)}</td><td class="btns"><button class="x" data-act="trade" data-r="${r}" data-d="-1">−</button> ${tr} <button class="x" data-act="trade" data-r="${r}" data-d="1">+</button></td></tr>`;
    }
    return h + `</table>`;
  }
  p_log() {
    const s = this.s; this._logN = s.notes.length;
    return `<div class="log">` + s.notes.filter(n => n.to === '*' || n.to.includes(this.me)).slice().reverse().map(n => `<div class="lrow ${n.k}"><small>${fmtDate(n.d)}</small> ${esc(n.t)}</div>`).join('') + `</div>`;
  }
  p_menu() {
    const host = this.g.role !== 'guest';
    return `<div class="sec menu">
      ${host ? `<button data-act="save">💾 Oyunu kaydet</button>` : ''}
      ${host && this.g.role === 'sp' ? `<button data-act="loadMenu">📂 Kayıt yükle</button>` : ''}
      <button data-act="toggleNames">🏷 Harita yazılarını aç/kapat</button>
      <button data-act="help">❓ Kontroller ve yardım</button>
      <button data-act="exit" class="danger">⏏ Ana menüye dön</button></div>
      ${this.g.role === 'host' ? `<div class="sec">Oda kodu: <b class="code">${esc(this.g.roomCode)}</b><br><small>Davet bağlantısı:</small><input readonly value="${esc(this.g.inviteLink)}" onclick="this.select()"></div>` : ''}`;
  }

  // ---------- il paneli ----------
  renderProv() {
    const el = $('provpanel'); const pid = this.R.selProv; const s = this.s;
    if (pid < 0) { el.classList.add('hidden'); return; }
    const ae = document.activeElement; if (ae && el.contains(ae) && ae.tagName === 'SELECT') return;
    el.classList.remove('hidden');
    const P = MAP.provs[pid], p = s.provs[pid]; const own = p.o === this.me && p.c === this.me; const res = S.provRes()[pid];
    const divs = Object.values(s.divs).filter(d => d.p === pid);
    const vis = this.R.visibleSet()[pid];
    const myDivs = divs.filter(d => d.o === this.me), other = divs.filter(d => d.o !== this.me);
    const b = s.battles[pid];
    let h = `<div class="pp-head">${flag(s, p.o, 20)}<div><b>${esc(P.name)}</b><small>${esc(S.cname(s, p.o))}${p.c !== p.o ? ` · <span class="warn">işgal: ${esc(S.cname(s, p.c))}</span>` : ''}</small></div><button class="x" data-act="closeProv">×</button></div>
      <div class="grid2 small"><div>Arazi</div><div>${TERRAIN[P.terrain].name}</div><div>Zafer puanı</div><div>${P.vp}</div><div>Altyapı</div><div>${p.infra}/5</div><div>Tahkimat</div><div>${p.fort}/5</div>
      <div>Fabrikalar</div><div>${p.civ} sivil · ${p.mil} askerî · ${p.dock} tersane (yuva ${p.civ + p.mil + p.dock}/${p.slots})</div>
      <div>Kaynaklar</div><div>${Object.entries(res).map(([r, n]) => `${RESOURCES[r]} ${n}`).join(', ') || '-'}</div>
      <div>Kıyı</div><div>${P.coastal ? P.seas.map(z => esc(MAP.seas[z].name)).join(', ') : 'Hayır'}</div>
      <div>İkmal</div><div>${S.friendly(s, this.me, p.c) ? (S.supplied(s, this.me, pid) ? 'Bağlı' : '<span class="warn">Kesik</span>') : '-'}</div></div>`;
    if (b && vis) h += `<div class="battle">⚔ Muharebe: ${esc(S.cname(s, b.ao))} (${b.a.length}) → ${esc(S.cname(s, b.do))} (${b.d.length}) · saldırı ${b.att} / savunma ${b.def} · cephe ${b.w}<br>${bar(b.adv, '#e0c040', 200)} saldıran üstünlüğü ${pct(b.adv)}</div>`;
    if (myDivs.length) h += `<div class="small">Birlikleriniz: ${myDivs.length} tümen <button class="small" data-act="selProvDivs" data-p="${pid}">Seç</button></div>`;
    if (other.length && vis) { const g = {}; other.forEach(d => g[d.o] = (g[d.o] || 0) + 1); h += `<div class="small">Diğer: ${Object.entries(g).map(([t, n]) => `${esc(S.cname(s, t))} ${n}`).join(', ')}</div>`; }
    if (own) {
      h += `<div class="btnrow">${['civ', 'mil', 'dock', 'infra', 'fort'].filter(k => k !== 'dock' || P.coastal).map(k => `<button class="small" data-act="build" data-b="${k}" data-p="${pid}">${BUILDINGS[k].name}</button>`).join('')}</div>
      <div class="btnrow"><button class="small" data-act="deployHere" data-p="${pid}">Eğitilenler burada konuşlansın</button></div>`;
    }
    el.innerHTML = h;
  }
  // ---------- birlik çubuğu ----------
  renderUnits() {
    const el = $('unitbar'); const s = this.s;
    const sel = [...this.R.sel].map(id => s.divs[id]).filter(d => d && d.o === this.me);
    if (sel.length !== this.R.sel.size) { this.R.sel = new Set(sel.map(d => d.id)); this.R.mark(); }
    if (!sel.length && !this.R.selFleet) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    if (this.R.selFleet) { const f = s.fleets[this.R.selFleet]; if (!f) { this.R.selFleet = null; el.classList.add('hidden'); return; } el.innerHTML = `<div class="ub-head">⚓ <b>${esc(f.name)}</b> · ${Math.round(f.ships)} gemi · ${esc(MAP.seas[f.z].name)} <span class="hint">Sağ tık: denize gönder</span><button class="x" data-act="clearSel">×</button></div>`; return; }
    const st = d => d.inv ? (d.inv.landing ? 'Çıkarma muharebesi' : `Deniz ${d.inv.hostile ? 'indirmesi' : 'nakli'} (${d.inv.days} gün)`) : d.cmb ? 'Muharebede' : d.path.length ? `→ ${esc(MAP.provs[d.path[d.path.length - 1]].name)}` : d.ord === 'front' ? 'Cephe tutuyor' : d.ord === 'attack' ? 'Otomatik saldırı' : 'Beklemede';
    const cards = sel.slice(0, 24).map(d => { const ds = S.divStats(s, d); return `<div class="ucard ${d.cmb ? 'cmb' : ''}" title="${esc(S.tmplOf(this.c, d.t).name)} · Saldırı ${Math.round(ds.sa)} · Savunma ${Math.round(ds.def)}"><div class="un">${esc(d.n)}</div>${bar(d.org / Math.max(1, ds.org), '#5fd35f', 70)}${bar(d.str, '#d8d8d8', 70)}<div class="us">${st(d)}${d.sup ? '' : ' <span class="warn">ikmalsiz</span>'}</div></div>`; }).join('');
    el.innerHTML = `<div class="ub-head"><b>${sel.length} tümen seçili</b>
      <button class="small" data-act="ord" data-o="stop">Dur</button><button class="small" data-act="ord" data-o="front" title="Tümenler kendi cephe hattınıza dağılır ve savunur">Cephe tut</button><button class="small" data-act="ord" data-o="attack" title="Tümenler cepheye dağılır ve uygun fırsatlarda kendiliğinden saldırır">Otomatik saldırı</button><button class="small" data-act="ord" data-o="none">Emri kaldır</button>
      <span class="hint">Sağ tık: hareket / deniz indirmesi · Shift+sürükle: kutu seçimi</span><button class="x" data-act="clearSel">×</button></div><div class="ucards">${cards}${sel.length > 24 ? `<div class="ucard">+${sel.length - 24}</div>` : ''}</div>`;
  }
  // ---------- bildirimler ve teklifler ----------
  offerText(o) { const s = this.s; return o.type === 'invite' ? `${flag(s, o.from)} <b>${esc(S.cname(s, o.from))}</b> sizi <b>${esc(s.factions[o.fac]?.name || '')}</b> ittifakına davet ediyor.` : o.type === 'join' ? `${flag(s, o.from)} <b>${esc(S.cname(s, o.from))}</b> ittifakınıza katılmak istiyor.` : `${flag(s, o.from)} <b>${esc(S.cname(s, o.from))}</b> beyaz barış teklif ediyor.`; }
  processNotes() {
    const s = this.s;
    for (const n of s.notes) {
      if (n.id <= this.seenNote) continue; this.seenNote = n.id;
      if (n.d < s.day - 2) continue;
      const mine = n.to !== '*' && n.to.includes(this.me);
      if (mine || n.k === 'war') this.toast(esc(n.t), n.k === 'war' ? 'war' : n.k);
      const myName = this.c.name;
      if (n.k === 'war' && /savaş ilan etti/.test(n.t) && n.t.includes(myName) && n.d >= s.day - 1) this.modal(`<h2>⚔ Savaş!</h2><p>${esc(n.t)}</p><p class="hint">Diplomasi panelinden savaş durumunu, Ordu panelinden birliklerinizi yönetin. Tümenlerinizi seçip "Cephe tut" ya da "Otomatik saldırı" emri verebilirsiniz.</p>`, [['Anlaşıldı', () => {}]]);
      if (n.k === 'war' && /teslim oldu/.test(n.t) && n.d >= s.day - 1 && (n.t.includes(myName) || this.c.enemies.length === 0 && false)) this.modal(`<h2>Teslimiyet</h2><p>${esc(n.t)}</p>`, [['Tamam', () => {}]]);
    }
    for (const o of s.offers) if (o.to === this.me && !this.shownOffers.has(o.id)) { this.shownOffers.add(o.id); this.modal(`<h2>Diplomatik Teklif</h2><p>${this.offerText(o)}</p>`, [['Kabul et', () => this.send({ type: 'offerReply', id: o.id, accept: true })], ['Reddet', () => this.send({ type: 'offerReply', id: o.id, accept: false })]]); }
    if (s.over && !this._overShown) { this._overShown = true; const win = s.winner === this.me; this.modal(`<h2>${s.winner ? (win ? '🏆 Zafer!' : 'Yenilgi') : 'Oyun Bitti'}</h2><p>${esc(s.overReason || '')}</p>${s.winner ? `<p>Kazanan: <b>${esc(S.cname(s, s.winner))}</b></p>` : ''}`, [['Tamam', () => {}]]); }
  }
  modal(html, buttons) {
    const m = document.createElement('div'); m.className = 'modal-bg';
    m.innerHTML = `<div class="modal">${html}<div class="btnrow mbtns"></div></div>`;
    const row = m.querySelector('.mbtns');
    for (const [label, fn, cls] of buttons) { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = () => { const keep = fn && fn(m) === false; if (!keep) m.remove(); }; row.appendChild(b); }
    document.body.appendChild(m); return m;
  }
  help() {
    this.modal(`<h2>Kontroller</h2><ul class="help">
      <li><b>Sol tık</b>: il ya da birlik seç · <b>Shift+sol tık</b>: seçime ekle</li>
      <li><b>Sol sürükle</b>: haritayı kaydır · <b>Shift+sürükle</b>: kutu seçimi</li>
      <li><b>Sağ tık</b>: seçili tümenleri hareket ettir (kara yolu yoksa ve iki il de kıyıdaysa deniz indirmesi/nakli yapılır) · seçili filoyu denize gönder</li>
      <li><b>Tekerlek</b>: yakınlaştır · <b>WASD / ok tuşları</b>: kaydır</li>
      <li><b>Boşluk</b>: duraklat/devam · <b>1-5</b>: hız · <b>Esc</b>: seçimi temizle / paneli kapat</li>
      <li>Kırmızı çizgiler <b>cephe hattı</b>dır. Sayaçlardaki yeşil çubuk organizasyon, beyaz çubuk güçtür. "!" ikmal kesik demektir.</li>
      <li><b>Cephe tut / Otomatik saldırı</b> emirleri birlikleri kendi cephenize dağıtır; saldırı emrinde uygun oranda kendiliğinden taarruz ederler.</li>
      <li>Savaş için Diplomasi panelinden <b>gerekçe hazırlayın</b>, süre dolunca <b>savaş ilan edin</b>. Rakip ülke zafer puanlarının çoğunu kaybedince <b>teslim olur</b>.</li></ul>`, [['Kapat', () => {}]]);
  }
  tmplEditor(id) {
    const c = this.c; const t = id === 'new' ? { id: null, name: 'Yeni Tümen', bn: { inf: 6, art: 1 } } : JSON.parse(JSON.stringify(S.tmplOf(c, id)));
    const render = () => `<h2>Tümen Şablonu</h2><input id="te-name" value="${esc(t.name)}" maxlength="24">
      <div class="te">${Object.entries(BATTALIONS).map(([k, b]) => { const locked = b.req && !c.research.done[b.req]; return `<div class="te-row ${locked ? 'locked' : ''}"><span>${b.name}${locked ? ' 🔒' : ''}</span><button data-te="${k}" data-d="-1">−</button><b>${t.bn[k] || 0}</b><button data-te="${k}" data-d="1" ${locked ? 'disabled' : ''}>+</button></div>`; }).join('')}</div>
      <div class="tstats" id="te-stats"></div>`;
    const m = this.modal(render(), [['Kaydet', mm => { t.name = mm.querySelector('#te-name').value || 'Tümen'; this.send({ type: 'tmplSave', tmpl: t }); }], ['İptal', () => {}]]);
    const upd = () => { const st = S.tmplStats(this.s, c, { id: 'preview' + Math.random(), bn: t.bn }); m.querySelector('#te-stats').innerHTML = `Saldırı ${Math.round(st.sa)}/${Math.round(st.ha)} · Savunma ${Math.round(st.def)} · Yarma ${Math.round(st.brk)} · Org ${Math.round(st.org)} · Can ${Math.round(st.hp)} · Genişlik ${st.width} · ${st.mp.toFixed(1)}B asker`; };
    m.addEventListener('click', e => { const b = e.target.closest('[data-te]'); if (!b) return; const k = b.dataset.te; t.bn[k] = clamp((t.bn[k] || 0) + +b.dataset.d, 0, 12); b.parentElement.querySelector('b').textContent = t.bn[k]; upd(); });
    upd();
  }
  // ---------- eylemler ----------
  act(a, el) {
    const d = el.dataset; const s = this.s;
    switch (a) {
      case 'panel': this.openPanel(d.p); break;
      case 'mapmode': this.R.mode = d.m; document.querySelectorAll('#mapmodes button').forEach(b => b.classList.toggle('on', b.dataset.m === d.m)); this.R.mark(); break;
      case 'speed': this.g.setSpeed(+d.v); break;
      case 'chat': $('chat').classList.toggle('hidden'); break;
      case 'law': this.send({ type: 'law', kind: d.k, lvl: +d.l }); break;
      case 'focus': this.send({ type: 'focus', id: d.id }); break;
      case 'research': this.send({ type: 'research', id: d.id }); break;
      case 'unresearch': this.send({ type: 'unresearch', id: d.id }); break;
      case 'rcat': this.researchCat = d.k; this.renderPanel(true); break;
      case 'build': this.send({ type: 'build', b: d.b, prov: +d.p }).then(r => r && r.ok && this.toast(`${BUILDINGS[d.b].name} kuyruğa eklendi: ${esc(MAP.provs[+d.p].name)}`, 'good', 2500)); break;
      case 'unbuild': this.send({ type: 'unbuild', i: +d.i }); break;
      case 'qup': this.send({ type: 'queueUp', i: +d.i }); break;
      case 'goto': this.R.centerOn(+d.p, Math.max(this.R.cam.z, 1.6)); this.R.selProv = +d.p; this.update(true); break;
      case 'gotoC': { const c = s.countries[d.t]; if (c.capital >= 0) { this.R.centerOn(c.capital, 1.2); this.R.selProv = c.capital; this.update(true); } break; }
      case 'prodF': { const l = this.c.lines[+d.i]; if (l) this.send({ type: 'prodF', i: +d.i, f: l.f + +d.d }); break; }
      case 'prodDel': this.send({ type: 'prodDel', i: +d.i }); break;
      case 'prodAdd': this.send({ type: 'prodAdd', eq: d.eq }); break;
      case 'train': this.send({ type: 'train', t: d.t, n: +d.n, prov: this.g.deployProv ?? undefined }).then(r => r && r.ok && this.toast('Eğitim kuyruğuna eklendi', 'good', 2000)); break;
      case 'untrain': this.send({ type: 'untrain', i: +d.i }); break;
      case 'tmplEdit': this.tmplEditor(d.t); break;
      case 'deployHere': this.g.deployProv = +d.p; this.toast(`Yeni tümenler ${esc(MAP.provs[+d.p].name)} ilinde konuşlanacak`, 'good', 2500); this.update(true); break;
      case 'selAll': this.R.sel = new Set(Object.values(s.divs).filter(x => x.o === this.me).map(x => x.id)); this.R.mark(); this.update(true); break;
      case 'selIdle': this.R.sel = new Set(Object.values(s.divs).filter(x => x.o === this.me && !x.path.length && !x.cmb && !x.ord).map(x => x.id)); this.R.mark(); this.update(true); break;
      case 'selProvDivs': this.R.sel = new Set(Object.values(s.divs).filter(x => x.o === this.me && x.p === +d.p).map(x => x.id)); this.R.mark(); this.update(true); break;
      case 'clearSel': this.R.sel = new Set(); this.R.selFleet = null; this.R.mark(); this.update(true); break;
      case 'closeProv': this.R.selProv = -1; this.R.mark(); this.update(true); break;
      case 'ord': { const ids = [...this.R.sel]; if (d.o === 'stop') this.send({ type: 'stop', ids }); else this.send({ type: 'order', ids, ord: d.o === 'none' ? null : d.o }); break; }
      case 'wingCreate': this.send({ type: 'wingCreate', prov: this.R.selProv, wt: d.t, n: 100 }); break;
      case 'wingMove': this.send({ type: 'wingMove', id: d.id, prov: this.R.selProv }); break;
      case 'wingDel': this.send({ type: 'wingDel', id: d.id }); break;
      case 'fleetGo': { const sel = document.querySelector(`select[data-fleet="${d.id}"]`); if (sel && sel.value !== '') this.send({ type: 'fleetMove', id: d.id, z: +sel.value }); break; }
      case 'fleetAdd': this.send({ type: 'fleetAdd', id: d.id }); break;
      case 'fleetCreate': { const z = $('newfleet-z'); if (z) this.send({ type: 'fleetCreate', z: +z.value }); break; }
      case 'offer': this.send({ type: 'offerReply', id: d.id, accept: d.a === '1' }); break;
      case 'leaveFac': this.send({ type: 'leaveFaction' }); break;
      case 'createFac': this.send({ type: 'createFaction', name: ($('fac-name') || {}).value }); break;
      case 'reqJoin': this.send({ type: 'requestJoin', fac: d.f }); break;
      case 'justify': this.send({ type: 'justify', target: d.t }).then(r => r && r.ok && this.toast('Savaş gerekçesi hazırlanıyor', 'info', 2500)); break;
      case 'declare': this.modal(`<h2>Savaş İlanı</h2><p><b>${esc(S.cname(s, d.t))}</b> ülkesine ve müttefiklerine savaş ilan etmek istediğinize emin misiniz?</p>`, [['Savaş ilan et', () => this.send({ type: 'declare', target: d.t }), 'danger'], ['Vazgeç', () => {}]]); break;
      case 'invite': this.send({ type: 'invite', target: d.t }); break;
      case 'peace': this.send({ type: 'peace', target: d.t }).then(r => r && r.ok && this.toast('Barış teklifi gönderildi', 'info', 2500)); break;
      case 'trade': this.send({ type: 'trade', res: d.r, n: (this.c.trade[d.r] || 0) + +d.d }); break;
      case 'save': this.g.save(); break;
      case 'loadMenu': this.g.showLoad(); break;
      case 'toggleNames': this.R.showNames = !this.R.showNames; this.R.mark(); break;
      case 'help': this.help(); break;
      case 'exit': this.modal('<h2>Ana menüye dön</h2><p>Kaydedilmemiş ilerleme kaybolabilir.</p>', [['Çık', () => this.g.exit(), 'danger'], ['İptal', () => {}]]); break;
    }
  }
  tooltipFor(pid) {
    const s = this.s; const P = MAP.provs[pid], p = s.provs[pid]; const vis = this.R.visibleSet()[pid];
    const divs = vis ? Object.values(s.divs).filter(d => d.p === pid) : [];
    const g = {}; divs.forEach(d => g[d.o] = (g[d.o] || 0) + 1);
    return `<b>${esc(P.name)}</b><br>${esc(S.cname(s, p.o))}${p.c !== p.o ? ' (işgal: ' + esc(S.cname(s, p.c)) + ')' : ''}<br>${TERRAIN[P.terrain].name} · ZP ${P.vp}${p.fort ? ' · Tahkimat ' + p.fort : ''}${Object.keys(g).length ? '<br>' + Object.entries(g).map(([t, n]) => `${esc(S.cname(s, t))}: ${n} tümen`).join('<br>') : ''}${s.battles[pid] && vis ? '<br><span class="warn">⚔ Muharebe sürüyor</span>' : ''}`;
  }
}
