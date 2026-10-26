// Canvas2D harita çizimi: yalnız değişiklikte / kamera hareketinde yeniden çizer
import { MAP } from './mapdata.js';
import { TERRAIN } from './scenario.js';
import { IDEOLOGIES } from './scenario.js';
import * as S from './sim.js';

const TERRAIN_COL = { plains: '#7f8f5a', forest: '#4f6b3c', hills: '#8a7f55', mountain: '#7a6e62', jungle: '#2f5e3a', marsh: '#5b6f63', desert: '#c2a76a', tundra: '#9aa3a0', urban: '#8c8c8c' };

export class MapRenderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.cam = { x: MAP.w * 0.53, y: MAP.h * 0.3, z: 0.6 };
    this.dirty = true; this.mode = 'political'; this.state = null; this.myTag = null;
    this.sel = new Set(); this.selProv = -1; this.hover = -1; this.box = null; this.unitRects = []; this.fleetRects = []; this.lastAnim = 0;
    this.paths = MAP.provs.map(p => { const P = new Path2D(); for (const r of p.rings) { P.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) P.lineTo(r[i], r[i + 1]); P.closePath(); } return P; });
    this.hitCtx = document.createElement('canvas').getContext('2d');
    this.sig = ''; this.patterns = {}; this.labels = []; this.showNames = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    const loop = t => { requestAnimationFrame(loop); const anim = this.state && Object.keys(this.state.battles).length && t - this.lastAnim > 250; const sim = this.simDirty && t - this.lastAnim > 110; if (this.dirty || anim || sim) { this.lastAnim = t; this.dirty = false; this.simDirty = false; this.draw(t); } };
    requestAnimationFrame(loop);
  }
  resize() { const dpr = Math.min(2, window.devicePixelRatio || 1); this.dpr = dpr; const r = this.cv.getBoundingClientRect(); this.W = r.width; this.H = r.height; this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr); this.dirty = true; }
  mark() { this.dirty = true; }
  markSim() { this.simDirty = true; }
  setState(s, myTag) { this.state = s; this.myTag = myTag; this.dirty = true; }
  // koordinatlar
  w2s(x, y) { return [(x - this.cam.x) * this.cam.z + this.W / 2, (y - this.cam.y) * this.cam.z + this.H / 2]; }
  s2w(x, y) { return [(x - this.W / 2) / this.cam.z + this.cam.x, (y - this.H / 2) / this.cam.z + this.cam.y]; }
  clampCam() { const c = this.cam; c.z = Math.max(0.25, Math.min(8, c.z)); const hw = this.W / 2 / c.z, hh = this.H / 2 / c.z; c.x = Math.max(Math.min(hw, MAP.w / 2), Math.min(MAP.w - Math.min(hw, MAP.w / 2), c.x)); c.y = Math.max(Math.min(hh, MAP.h / 2) - 40, Math.min(MAP.h - Math.min(hh, MAP.h / 2) + 40, c.y)); }
  zoomAt(sx, sy, f) { const [wx, wy] = this.s2w(sx, sy); this.cam.z *= f; this.clampCam(); const [nx, ny] = this.s2w(sx, sy); this.cam.x += wx - nx; this.cam.y += wy - ny; this.clampCam(); this.dirty = true; }
  pan(dx, dy) { this.cam.x -= dx / this.cam.z; this.cam.y -= dy / this.cam.z; this.clampCam(); this.dirty = true; }
  centerOn(pid, z) { const p = MAP.provs[pid]; this.cam.x = p.x; this.cam.y = p.y; if (z) this.cam.z = z; this.clampCam(); this.dirty = true; }
  hitProv(sx, sy) {
    const [x, y] = this.s2w(sx, sy);
    for (let i = 0; i < MAP.N; i++) { const b = MAP.provs[i].bb; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue; if (this.hitCtx.isPointInPath(this.paths[i], x, y, 'evenodd')) return i; }
    return -1;
  }
  hitUnit(sx, sy) { for (let i = this.unitRects.length - 1; i >= 0; i--) { const r = this.unitRects[i]; if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) return r; } return null; }
  hitFleet(sx, sy) { for (const r of this.fleetRects) if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) return r; return null; }
  colorOf(tag) { return this.state?.countries[tag]?.color || '#555'; }
  pattern(owner, ctrl) {
    const key = owner + ctrl; let p = this.patterns[key];
    if (!p) { const c = document.createElement('canvas'); c.width = c.height = 10; const g = c.getContext('2d'); g.fillStyle = this.colorOf(ctrl); g.fillRect(0, 0, 10, 10); g.strokeStyle = this.colorOf(owner); g.lineWidth = 3; g.beginPath(); g.moveTo(-2, 12); g.lineTo(12, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(8, 12); g.lineTo(12, 8); g.stroke(); p = this.patterns[key] = this.ctx.createPattern(c, 'repeat'); }
    try { p.setTransform(new DOMMatrix().scale(1 / this.cam.z)); } catch (e) { }
    return p;
  }
  visibleSet() {
    const s = this.state, me = this.myTag; const vis = new Uint8Array(MAP.N);
    if (!me) { vis.fill(1); return vis; }
    for (let i = 0; i < MAP.N; i++) if (S.friendly(s, me, s.provs[i].c)) { vis[i] = 1; for (const e of MAP.adj[i]) vis[e.to] = 1; }
    for (const id in s.divs) { const d = s.divs[id]; if (S.friendly(s, me, d.o)) { vis[d.p] = 1; for (const e of MAP.adj[d.p]) vis[e.to] = 1; } }
    return vis;
  }
  rebuildBorders() {
    const s = this.state; let sig = ''; for (const p of s.provs) sig += p.o + p.c; sig += JSON.stringify(Object.values(s.countries).map(c => c.enemies.length + (c.faction || '')));
    if (sig === this.sig) return; this.sig = sig;
    const coast = new Path2D(), country = new Path2D(), prov = new Path2D(), front = new Path2D();
    const line = (P, pts) => { P.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) P.lineTo(pts[i], pts[i + 1]); };
    for (const [a, b, pts] of MAP.edges) {
      if (b < 0) { line(coast, pts); continue; }
      const A = s.provs[a], B = s.provs[b];
      if (A.o !== B.o) line(country, pts); else line(prov, pts);
      if (A.c !== B.c && S.atWar(s, A.c, B.c)) line(front, pts);
    }
    this.bCoast = coast; this.bCountry = country; this.bProv = prov; this.bFront = front;
    // ülke etiketleri: başkent çevresindeki bağlı kümenin ağırlık merkezi
    const labels = [];
    for (const t in s.countries) {
      const c = s.countries[t]; if (!c.alive) continue;
      const start = c.capital >= 0 && s.provs[c.capital].o === t ? c.capital : s.provs.findIndex(p => p.o === t); if (start < 0) continue;
      const seen = new Set([start]), q = [start]; let sx = 0, sy = 0, sw = 0, x0 = 1e9, x1 = -1e9;
      while (q.length) { const i = q.pop(); const P = MAP.provs[i]; const w = Math.sqrt(P.km + 1); sx += P.x * w; sy += P.y * w; sw += w; x0 = Math.min(x0, P.bb[0]); x1 = Math.max(x1, P.bb[2]); for (const e of MAP.adj[i]) if ((e.f & 1) && !seen.has(e.to) && s.provs[e.to].o === t) { seen.add(e.to); q.push(e.to); } }
      let area = 0; for (const i of seen) area += MAP.provs[i].km;
      labels.push({ t, name: c.name.toUpperCase(), x: sx / sw, y: sy / sw, size: Math.max(6, Math.min(70, Math.sqrt(area) / 28)), span: x1 - x0 });
    }
    this.labels = labels;
  }
  fillFor(i) {
    const s = this.state; const p = s.provs[i]; const mode = this.mode;
    if (mode === 'terrain') return TERRAIN_COL[MAP.provs[i].terrain];
    if (mode === 'faction') { const top = S.topLord(s, p.c); const f = s.countries[top]?.faction; return f && s.factions[f] ? s.factions[f].color : '#6b6b6b'; }
    if (mode === 'ideology') { const c = s.countries[p.c]; return IDEOLOGIES[c?.ideo]?.color || '#666'; }
    if (mode === 'supply') { if (!this.myTag) return '#555'; const sup = S.supplied(s, this.myTag, i); return S.friendly(s, this.myTag, p.c) ? (sup ? '#3f7f3f' : '#9f3f3f') : '#444'; }
    if (p.c !== p.o) return this.pattern(p.o, p.c);
    return this.colorOf(p.c);
  }
  draw(t) {
    const s = this.state; const ctx = this.ctx; const dpr = this.dpr; const { x: cx, y: cy, z } = this.cam;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, this.H); g.addColorStop(0, '#0b1d2a'); g.addColorStop(1, '#10293a'); ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
    if (!s) return;
    this.rebuildBorders();
    const ox = this.W / 2 - cx * z, oy = this.H / 2 - cy * z;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
    const [vx0, vy0] = this.s2w(0, 0), [vx1, vy1] = this.s2w(this.W, this.H);
    const inView = i => { const b = MAP.provs[i].bb; return !(b[2] < vx0 || b[0] > vx1 || b[3] < vy0 || b[1] > vy1); };
    // harita sınırı
    ctx.strokeStyle = 'rgba(120,160,180,0.15)'; ctx.lineWidth = 2 / z; ctx.strokeRect(0, 0, MAP.w, MAP.h);
    for (let i = 0; i < MAP.N; i++) { if (!inView(i)) continue; ctx.fillStyle = this.fillFor(i); ctx.fill(this.paths[i], 'evenodd'); }
    // gölge ve kenarlıklar
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (z > 0.45) { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6 / z; ctx.stroke(this.bProv); }
    ctx.strokeStyle = 'rgba(10,14,18,0.9)'; ctx.lineWidth = 1.6 / z; ctx.stroke(this.bCountry);
    ctx.strokeStyle = 'rgba(180,215,230,0.35)'; ctx.lineWidth = 1.2 / z; ctx.stroke(this.bCoast);
    // cephe hattı
    ctx.strokeStyle = 'rgba(255,60,40,0.35)'; ctx.lineWidth = 5 / z; ctx.stroke(this.bFront);
    ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 1.8 / z; ctx.stroke(this.bFront);
    // seçili / üzerine gelinen il
    if (this.hover >= 0) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5 / z; ctx.stroke(this.paths[this.hover]); }
    if (this.selProv >= 0) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.5 / z; ctx.stroke(this.paths[this.selProv]); }
    // etiketler
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.showNames) {
      for (const L of this.labels) {
        const px = L.size * z; if (px < 7 || px > 46) continue;
        if (L.x < vx0 - 200 || L.x > vx1 + 200 || L.y < vy0 - 100 || L.y > vy1 + 100) continue;
        ctx.font = `600 ${L.size}px "Oswald", "Arial Narrow", sans-serif`;
        const w = ctx.measureText(L.name).width; const fs = w > L.span * 1.3 ? L.size * L.span * 1.3 / w : L.size;
        if (fs * z < 7) continue;
        ctx.font = `600 ${fs}px "Oswald", "Arial Narrow", sans-serif`;
        const a = px > 30 ? 0.55 : 0.8; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = `rgba(0,0,0,${a * 0.5})`; ctx.strokeText(L.name, L.x, L.y); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillText(L.name, L.x, L.y);
      }
      if (z > 1.6) {
        const fs = 10 / z; ctx.font = `${fs}px sans-serif`;
        for (let i = 0; i < MAP.N; i++) { if (!inView(i)) continue; const P = MAP.provs[i]; if ((P.bb[2] - P.bb[0]) * z < 50) continue; ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillText(P.name, P.x, P.y + 14 / z); if (P.vp >= 5) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(P.x - 2 / z, P.y + 4 / z, 4 / z, 4 / z); } }
      }
      if (z > 0.9) { ctx.font = `italic ${9 / z}px serif`; ctx.fillStyle = 'rgba(160,200,220,0.4)'; for (const sz of MAP.seas) ctx.fillText(sz.name, sz.x, sz.y + 18 / z); }
    }
    // ekran uzayı
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.noUnits) this.drawUnits(t, vx0, vy0, vx1, vy1);
    if (this.box) { const b = this.box; ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,211,77,0.08)'; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
  }
  drawUnits(t, vx0, vy0, vx1, vy1) {
    const s = this.state, ctx = this.ctx, me = this.myTag; const vis = this.visibleSet();
    this.unitRects = []; this.fleetRects = [];
    const byProv = new Map();
    for (const id in s.divs) { const d = s.divs[id]; if (!vis[d.p]) continue; let m = byProv.get(d.p); if (!m) byProv.set(d.p, m = new Map()); let a = m.get(d.o); if (!a) m.set(d.o, a = []); a.push(d); }
    // hareket okları (seçili birlikler veya kendi birlikleri)
    ctx.lineWidth = 2;
    for (const id in s.divs) {
      const d = s.divs[id]; if (d.o !== me) continue; if (!d.path.length && !d.inv) continue;
      const selected = this.sel.has(id); if (!selected && this.cam.z < 0.8) continue;
      const pts = [MAP.provs[d.p]].concat(d.inv ? [MAP.provs[d.inv.to]] : d.path.map(p => MAP.provs[p]));
      ctx.strokeStyle = d.inv ? 'rgba(80,170,255,0.85)' : selected ? 'rgba(120,255,120,0.9)' : 'rgba(120,255,120,0.4)';
      ctx.setLineDash(d.inv ? [6, 4] : []);
      ctx.beginPath(); pts.forEach((p, k) => { const [x, y] = this.w2s(p.x, p.y); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
      const L = pts[pts.length - 1], P = pts[pts.length - 2]; const [lx, ly] = this.w2s(L.x, L.y), [px, py] = this.w2s(P.x, P.y); const a = Math.atan2(ly - py, lx - px);
      ctx.setLineDash([]); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 9 * Math.cos(a - 0.4), ly - 9 * Math.sin(a - 0.4)); ctx.lineTo(lx - 9 * Math.cos(a + 0.4), ly - 9 * Math.sin(a + 0.4)); ctx.fill();
    }
    // muharebeler
    for (const P in s.battles) {
      if (!vis[+P]) continue; const b = s.battles[P]; const p = MAP.provs[+P]; const [x, y] = this.w2s(p.x, p.y);
      if (x < -40 || y < -40 || x > this.W + 40 || y > this.H + 40) continue;
      const mineAtt = me && S.friendly(s, me, b.ao), mineDef = me && S.friendly(s, me, b.do);
      const pulse = 0.6 + 0.4 * Math.sin((t || 0) / 200);
      ctx.save(); ctx.translate(x, y - 26); ctx.fillStyle = `rgba(200,30,20,${0.75 * pulse + 0.2})`; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke();
      const adv = mineDef ? 1 - b.adv : b.adv; ctx.fillStyle = '#222'; ctx.fillRect(-16, 11, 32, 4); ctx.fillStyle = (mineAtt || mineDef) ? (adv > 0.5 ? '#5fd35f' : '#e05a3a') : '#d8c04a'; ctx.fillRect(-16, 11, 32 * adv, 4);
      ctx.restore();
    }
    // tümen sayaçları
    const z = this.cam.z; const scale = z < 0.5 ? 0.75 : 1;
    const CW = 38 * scale, CH = 21 * scale;
    for (const [pid, m] of byProv) {
      const p = MAP.provs[pid]; const [x, y] = this.w2s(p.x, p.y);
      if (x < -60 || y < -40 || x > this.W + 60 || y > this.H + 40) continue;
      const groups = [...m.entries()].sort((a, b) => (a[0] === me ? -1 : b[0] === me ? 1 : 0));
      const totalW = groups.length * (CW + 2);
      groups.forEach(([owner, divs], k) => {
        const rx = x - totalW / 2 + k * (CW + 2), ry = y - CH / 2;
        const c = s.countries[owner]; const selCount = divs.filter(d => this.sel.has(d.id)).length;
        const avgOrg = divs.reduce((a, d) => a + d.org / Math.max(1, S.divStats(s, d).org), 0) / divs.length;
        const avgStr = divs.reduce((a, d) => a + d.str, 0) / divs.length;
        const cls = majorityCls(s, divs);
        const enemy = me && S.atWar(s, me, owner), friend = me && S.friendly(s, me, owner);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(rx + 2, ry + 2, CW, CH);
        ctx.fillStyle = shade(c?.color || '#666', -0.25); ctx.fillRect(rx, ry, CW, CH);
        ctx.strokeStyle = selCount ? '#ffd34d' : enemy ? '#ff5a3c' : friend ? '#cfe8cf' : '#222'; ctx.lineWidth = selCount ? 2 : 1; ctx.strokeRect(rx + 0.5, ry + 0.5, CW - 1, CH - 1);
        // NATO sembolü
        const bx = rx + 3 * scale, by = ry + 3 * scale, bw = 15 * scale, bh = 10 * scale;
        ctx.fillStyle = '#e9e4d0'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
        ctx.beginPath();
        if (cls === 'arm') { ctx.ellipse(bx + bw / 2, by + bh / 2, bw * 0.34, bh * 0.28, 0, 0, Math.PI * 2); }
        else { ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by + bh); ctx.moveTo(bx + bw, by); ctx.lineTo(bx, by + bh); if (cls === 'mot') { ctx.moveTo(bx + 3, by + bh + 0); } if (cls === 'cav') { ctx.moveTo(bx + bw, by); ctx.lineTo(bx, by + bh); } }
        ctx.stroke();
        if (cls === 'mot') { ctx.beginPath(); ctx.arc(bx + bw * 0.3, by + bh - 1.5, 1.4, 0, 7); ctx.arc(bx + bw * 0.7, by + bh - 1.5, 1.4, 0, 7); ctx.fillStyle = '#222'; ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.font = `bold ${11 * scale}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(divs.length), rx + CW - 10 * scale, ry + CH / 2 - 2 * scale);
        // org (yeşil) ve güç (beyaz) çubukları
        ctx.fillStyle = '#111'; ctx.fillRect(rx + 2, ry + CH - 5 * scale, CW - 4, 2.2 * scale); ctx.fillRect(rx + 2, ry + CH - 2.6 * scale, CW - 4, 1.8 * scale);
        ctx.fillStyle = avgOrg > 0.5 ? '#5fd35f' : avgOrg > 0.25 ? '#e0c040' : '#e05a3a'; ctx.fillRect(rx + 2, ry + CH - 5 * scale, (CW - 4) * Math.min(1, avgOrg), 2.2 * scale);
        ctx.fillStyle = '#d8d8d8'; ctx.fillRect(rx + 2, ry + CH - 2.6 * scale, (CW - 4) * Math.min(1, avgStr), 1.8 * scale);
        if (divs.some(d => d.cmb)) { ctx.fillStyle = '#ff5a3c'; ctx.fillRect(rx, ry - 3, CW, 2); }
        if (divs.some(d => !d.sup) && owner === me) { ctx.fillStyle = '#ffb000'; ctx.font = `bold ${10 * scale}px sans-serif`; ctx.fillText('!', rx - 4, ry + 5); }
        this.unitRects.push({ x: rx, y: ry, w: CW, h: CH, pid, owner, ids: divs.map(d => d.id) });
      });
    }
    // hava kanatları (kendi)
    for (const id in s.wings) {
      const w = s.wings[id]; if (w.o !== me) continue; const p = MAP.provs[w.p]; const [x, y] = this.w2s(p.x, p.y);
      ctx.fillStyle = w.type === 'ftr' ? '#9fd0ff' : '#ffc36b'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('✈' + Math.round(w.n), x + 22, y - 16);
    }
    // filolar
    const zoneF = {};
    for (const id in s.fleets) { const f = s.fleets[id]; const own = me && S.friendly(s, me, f.o); const near = me && MAP.seaProvs[f.z].some(pid => vis[pid]); if (!own && !near && me) continue; (zoneF[f.z] = zoneF[f.z] || []).push(f); }
    for (const zi in zoneF) {
      const sz = MAP.seas[zi]; const [x0, y0] = this.w2s(sz.x, sz.y);
      zoneF[zi].forEach((f, k) => {
        const x = x0 - 22, y = y0 - 9 + k * 20; if (x < -60 || y < -30 || x > this.W + 60 || y > this.H + 30) return;
        const c = s.countries[f.o];
        ctx.fillStyle = shade(c?.color || '#666', -0.3); ctx.fillRect(x, y, 44, 17); ctx.strokeStyle = this.selFleet === f.id ? '#ffd34d' : (me && S.atWar(s, me, f.o) ? '#ff5a3c' : '#9fc7e0'); ctx.lineWidth = this.selFleet === f.id ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, 43, 16);
        ctx.fillStyle = '#e9e4d0'; ctx.beginPath(); ctx.moveTo(x + 3, y + 9); ctx.lineTo(x + 17, y + 9); ctx.lineTo(x + 14, y + 13); ctx.lineTo(x + 6, y + 13); ctx.closePath(); ctx.fill(); ctx.fillRect(x + 9, y + 4, 2, 5);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(Math.round(f.ships)), x + 31, y + 9);
        if (f.path && f.path.length && f.o === me) { const L = MAP.seas[f.path[f.path.length - 1]]; const [lx, ly] = this.w2s(L.x, L.y); ctx.strokeStyle = 'rgba(80,170,255,0.7)'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x + 22, y + 8); ctx.lineTo(lx, ly); ctx.stroke(); ctx.setLineDash([]); }
        this.fleetRects.push({ x, y, w: 44, h: 17, id: f.id, o: f.o, z: +zi });
      });
    }
  }
}
function majorityCls(s, divs) { const n = {}; for (const d of divs) { const c = S.divStats(s, d).cls; n[c] = (n[c] || 0) + 1; } return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0]; }
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
