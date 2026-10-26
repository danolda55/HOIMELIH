// Ağ katmanı: PeerJS (WebRTC) taşıyıcı, parçalı mesajlar, durum farkı (diff) motoru, sahte (mock) taşıyıcı
const CHUNK = 5000; // PeerJS JSON kanalı ~16KB mesaj sınırı (kaçış karakterleri ve UTF-8 için pay bırakıldı)

// ---------- taşıyıcılar ----------
// Ortak arayüz: send(obj), onMessage(cb), onClose(cb), close()
class BaseTransport {
  constructor() { this._msg = () => {}; this._close = () => {}; this._parts = {}; this._seq = 0; }
  onMessage(cb) { this._msg = cb; } onClose(cb) { this._close = cb; }
  send(obj) {
    const str = JSON.stringify(obj);
    if (str.length <= CHUNK) { this._raw(obj); return; }
    const id = (++this._seq) + '_' + Math.random().toString(36).slice(2, 7); const n = Math.ceil(str.length / CHUNK);
    for (let i = 0; i < n; i++) this._raw({ __c: id, i, n, s: str.slice(i * CHUNK, (i + 1) * CHUNK) });
  }
  _recv(str) {
    let m; try { m = typeof str === 'string' ? JSON.parse(str) : str; } catch (e) { return; }
    if (m && m.__c) {
      const p = this._parts[m.__c] || (this._parts[m.__c] = { n: m.n, got: 0, a: [] });
      if (p.a[m.i] == null) { p.a[m.i] = m.s; p.got++; }
      if (p.got === p.n) { delete this._parts[m.__c]; let full; try { full = JSON.parse(p.a.join('')); } catch (e) { return; } this._msg(full); }
      return;
    }
    this._msg(m);
  }
}
export class PeerTransport extends BaseTransport {
  constructor(conn) {
    super(); this.conn = conn;
    conn.on('data', d => this._recv(d));
    conn.on('close', () => this._close());
    conn.on('error', () => this._close());
  }
  _raw(obj) { try { if (this.conn.open) this.conn.send(obj); } catch (e) { /* yoksay */ } }
  close() { try { this.conn.close(); } catch (e) { } }
}
export class MockTransport extends BaseTransport {
  constructor() { super(); this.peer = null; this.closed = false; this.sent = 0; this.bytes = 0; }
  _raw(obj) { if (this.closed || !this.peer) return; const str = JSON.stringify(obj); if (new TextEncoder().encode(str).length > 16300) throw new Error('Mesaj PeerJS sınırını aşıyor: ' + str.length); this.sent++; this.bytes += str.length; const p = this.peer; setTimeout(() => { if (!p.closed) p._recv(str); }, 0); }
  close() { if (this.closed) return; this.closed = true; this._close(); if (this.peer && !this.peer.closed) { this.peer.closed = true; this.peer._close(); } }
}
export function mockPair() { const a = new MockTransport(), b = new MockTransport(); a.peer = b; b.peer = a; return [a, b]; }

// ---------- durum kodlayıcıları ----------
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
function encDiv(d) { return { id: d.id, o: d.o, t: d.t, n: d.n, p: d.p, str: r3(d.str), org: r1(d.org), path: d.path, mp: r2(d.mp), inv: d.inv, ent: d.ent > 9 ? 10 : d.ent, sup: d.sup, cmb: d.cmb, ord: d.ord }; }
function encCountryFull(c) {
  const o = {};
  for (const k in c) {
    const v = c[k];
    if (k === 'pp' || k === 'mpUsed') o[k] = r1(v);
    else if (k === 'stock') { o.stock = {}; for (const e in v) o.stock[e] = Math.floor(v[e]); }
    else if (k === 'lines') o.lines = v.map(l => ({ eq: l.eq, f: l.f, eff: r3(l.eff) }));
    else if (k === 'queue') o.queue = v.map(q => ({ t: q.t, p: q.p, prog: r3(q.prog) }));
    else if (k === 'research') o.research = { slots: v.slots, done: v.done, cur: v.cur.map(r => ({ id: r.id, prog: r3(r.prog) })) };
    else if (k === 'stab' || k === 'ws' || k === 'surrender') o[k] = r3(v);
    else if (k === 'pop') o[k] = r2(v);
    else if (k === 'resRatio') o[k] = v ? Object.fromEntries(Object.entries(v).map(([a, b]) => [a, r2(b)])) : v;
    else o[k] = v;
  }
  return o;
}
const LITE_KEYS = ['tag', 'name', 'color', 'ideo', 'alive', 'puppetOf', 'faction', 'enemies', 'civ', 'mil', 'dock', 'vp', 'coreVP', 'capital', 'major', 'laws', 'capitulated', 'nprov', 'techVer', 'tmpl', 'home', 'dev'];
function encCountryLite(c) {
  const o = { lite: 1 }; for (const k of LITE_KEYS) o[k] = c[k];
  o.stab = r1(c.stab); o.ws = r1(c.ws); o.surrender = Math.round(c.surrender * 20) / 20; o.pop = Math.round(c.pop / 5) * 5;
  o.wg = Object.fromEntries(Object.entries(c.wg).map(([t, w]) => [t, { days: w.days }])); o.focusCur = c.focus.cur;
  o.research = { slots: c.research.slots, done: c.research.done, cur: [] }; o.fmod = c.fmod; o.fres = c.fres; o.warStart = c.warStart;
  o.stock = {}; o.lines = []; o.queue = []; o.train = []; o.trade = {}; o.focus = { cur: c.focus.cur, prog: 0, done: {} }; o.mpUsed = 0; o.mpBonus = 0; o.res = {};
  return o;
}
function encBattle(b) { return { ...b, adv: r2(b.adv) }; }
function encFleet(f) { return { ...f, ships: r1(f.ships) }; }
function encWing(w) { return { ...w, n: Math.round(w.n) }; }

// ---------- fark motoru (ev sahibi) ----------
export class Differ {
  constructor() { this.cache = { c: {}, p: [], d: {}, b: {}, f: {}, w: {}, fa: {} }; this.meta = ''; this.noteId = 0; this.offers = ''; }
  reset() { this.cache = { c: {}, p: [], d: {}, b: {}, f: {}, w: {}, fa: {} }; this.meta = ''; this.noteId = 0; this.offers = ''; }
  diff(s) {
    const out = {}; let any = false;
    const players = Object.values(s.players);
    const coll = (key, obj, enc) => {
      const cache = this.cache[key]; const ch = {}; const del = []; let n = 0;
      for (const k in obj) { const e = enc(obj[k], k); const j = JSON.stringify(e); if (cache[k] !== j) { cache[k] = j; ch[k] = e; n++; } }
      for (const k in cache) if (!(k in obj)) { delete cache[k]; del.push(k); n++; }
      if (n) { out[key] = { ch, del }; any = true; }
    };
    coll('c', s.countries, (c, k) => players.includes(k) ? encCountryFull(c) : encCountryLite(c));
    coll('d', s.divs, encDiv);
    coll('b', s.battles, encBattle);
    coll('f', s.fleets, encFleet);
    coll('w', s.wings, encWing);
    coll('fa', s.factions, x => x);
    // iller (dizi)
    const pc = this.cache.p; const pch = {}; let pn = 0;
    s.provs.forEach((p, i) => { const j = JSON.stringify(p); if (pc[i] !== j) { pc[i] = j; pch[i] = p; pn++; } });
    if (pn) { out.p = pch; any = true; }
    const meta = { day: s.day, speed: s.speed, tension: r1(s.tension), over: s.over, winner: s.winner, overReason: s.overReason, players: s.players, mode: s.mode, nextId: s.nextId, noteSeq: s.noteSeq, v: s.v };
    const mj = JSON.stringify(meta); if (mj !== this.meta) { this.meta = mj; out.m = meta; any = true; }
    const newNotes = s.notes.filter(n => n.id > this.noteId); if (newNotes.length) { this.noteId = newNotes[newNotes.length - 1].id; out.n = newNotes; any = true; }
    const oj = JSON.stringify(s.offers); if (oj !== this.offers) { this.offers = oj; out.o = s.offers; any = true; }
    return any ? out : null;
  }
}
// ---------- fark uygula (misafir) ----------
export function emptyState() { return { v: 1, day: 0, speed: 0, tension: 0, players: {}, countries: {}, provs: [], divs: {}, fleets: {}, wings: {}, factions: {}, battles: {}, notes: [], offers: [], noteSeq: 0, over: false, winner: null }; }
export function applyDiff(s, d) {
  const coll = (key, target) => { const x = d[key]; if (!x) return; for (const k in x.ch) target[k] = x.ch[k]; for (const k of x.del) delete target[k]; };
  coll('c', s.countries); coll('d', s.divs); coll('b', s.battles); coll('f', s.fleets); coll('w', s.wings); coll('fa', s.factions);
  if (d.p) for (const i in d.p) s.provs[+i] = d.p[i];
  if (d.m) Object.assign(s, d.m);
  if (d.n) { s.notes.push(...d.n); if (s.notes.length > 120) s.notes.splice(0, s.notes.length - 120); }
  if (d.o) s.offers = d.o;
  return s;
}

// ---------- ev sahibi oturumu ----------
// handlers: onGuestJoin(name), onGuestLeave(), onPick(tag), onCmd(cmd)->result, onChat(text), onPauseReq()
export class HostLink {
  constructor(handlers) { this.h = handlers; this.t = null; this.token = null; this.differ = new Differ(); this.started = false; this.guestName = null; }
  attach(transport) {
    transport.onMessage(m => this._onMsg(transport, m));
    transport.onClose(() => { if (this.t === transport) { this.t = null; this.h.onGuestLeave && this.h.onGuestLeave(); } });
  }
  _onMsg(tr, m) {
    if (m.t === 'hello') {
      if (this.t && this.t !== tr && this.token && m.token !== this.token) { tr.send({ t: 'reject', why: 'Oda dolu.' }); setTimeout(() => tr.close(), 300); return; }
      if (this.token && m.token !== this.token && this.started) { tr.send({ t: 'reject', why: 'Oyun başladı; yalnız ilk misafir yeniden bağlanabilir.' }); setTimeout(() => tr.close(), 300); return; }
      if (this.t && this.t !== tr) { try { this.t.close(); } catch (e) { } }
      this.t = tr; this.token = m.token; this.guestName = m.name || 'Misafir';
      tr.send({ t: 'welcome', started: this.started });
      this.h.onGuestJoin && this.h.onGuestJoin(this.guestName);
      if (this.started) this.sendSnapshot();
      return;
    }
    if (tr !== this.t) return;
    switch (m.t) {
      case 'pick': this.h.onPick && this.h.onPick(m.tag); break;
      case 'cmd': { const r = this.h.onCmd ? this.h.onCmd(m.c) : { ok: false }; tr.send({ t: 'cmdRes', seq: m.seq, ok: r && r.ok, err: r && r.err }); break; }
      case 'chat': this.h.onChat && this.h.onChat(String(m.text || '').slice(0, 300)); break;
      case 'pauseReq': this.h.onPauseReq && this.h.onPauseReq(); break;
      case 'needSnap': this.sendSnapshot(); break;
      case 'ping': tr.send({ t: 'pong', ts: m.ts }); break;
    }
  }
  get connected() { return !!this.t; }
  send(m) { if (this.t) this.t.send(m); }
  sendLobby(lobby) { this.send({ t: 'lobby', lobby }); }
  sendSnapshot() { if (!this.t || !this.state) return; this.differ.reset(); const d = this.differ.diff(this.state); this.seq = (this.seq || 0) + 1; this.send({ t: 'snap', d, seq: this.seq }); }
  start(state) { this.state = state; this.started = true; this.send({ t: 'start' }); this.sendSnapshot(); }
  flush() { if (!this.t || !this.state) return 0; const d = this.differ.diff(this.state); if (!d) return 0; this.seq++; const msg = { t: 'diff', d, seq: this.seq }; this.send(msg); return 1; }
  chat(from, text) { this.send({ t: 'chat', from, text }); }
  sys(text) { this.send({ t: 'sys', text }); }
}

// ---------- misafir oturumu ----------
// handlers: onWelcome(started), onLobby(lobby), onStart(), onState(state, full), onChat(from,text), onSys(text), onReject(why), onCmdRes(res)
export class GuestLink {
  constructor(handlers, token, name) { this.h = handlers; this.token = token; this.name = name; this.t = null; this.state = null; this.seq = 0; this.cseq = 0; this.pending = {}; }
  attach(transport) {
    this.t = transport;
    transport.onMessage(m => this._onMsg(m));
    transport.send({ t: 'hello', token: this.token, name: this.name });
  }
  _onMsg(m) {
    switch (m.t) {
      case 'welcome': this.h.onWelcome && this.h.onWelcome(m.started); break;
      case 'reject': this.h.onReject && this.h.onReject(m.why); break;
      case 'lobby': this.h.onLobby && this.h.onLobby(m.lobby); break;
      case 'start': this.h.onStart && this.h.onStart(); break;
      case 'snap': this.state = applyDiff(emptyState(), m.d); this.seq = m.seq; this.h.onState && this.h.onState(this.state, true); break;
      case 'diff':
        if (!this.state) return;
        if (m.seq !== this.seq + 1) { this.t.send({ t: 'needSnap' }); this.seq = m.seq; return; }
        this.seq = m.seq; applyDiff(this.state, m.d); this.h.onState && this.h.onState(this.state, false, m.d); break;
      case 'chat': this.h.onChat && this.h.onChat(m.from, m.text); break;
      case 'sys': this.h.onSys && this.h.onSys(m.text); break;
      case 'cmdRes': { const cb = this.pending[m.seq]; delete this.pending[m.seq]; if (cb) cb(m); this.h.onCmdRes && this.h.onCmdRes(m); break; }
      case 'pong': this.rtt = Date.now() - m.ts; break;
    }
  }
  pick(tag) { this.t && this.t.send({ t: 'pick', tag }); }
  cmd(c, cb) { const seq = ++this.cseq; if (cb) this.pending[seq] = cb; this.t && this.t.send({ t: 'cmd', c, seq }); }
  chat(text) { this.t && this.t.send({ t: 'chat', text }); }
  pauseReq() { this.t && this.t.send({ t: 'pauseReq' }); }
  ping() { this.t && this.t.send({ t: 'ping', ts: Date.now() }); }
}

// ---------- PeerJS yardımcıları (yalnız tarayıcı) ----------
export const PEER_PREFIX = 'hoiw-';
export function peerAvailable() { return typeof window !== 'undefined' && typeof window.Peer === 'function'; }
// Ev sahibi: belirtilen kodla eş oluştur; kod alınmışsa onUnavailable çağrılır
export function hostPeer(code, { onOpen, onConnection, onError, onDisconnected }) {
  const peer = new window.Peer(PEER_PREFIX + code, { debug: 1 });
  peer.on('open', id => onOpen && onOpen(id));
  peer.on('connection', conn => { conn.on('open', () => onConnection && onConnection(new PeerTransport(conn))); });
  peer.on('error', err => onError && onError(err));
  peer.on('disconnected', () => { onDisconnected && onDisconnected(); setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { } }, 1500); });
  return peer;
}
export function guestConnect(code, { onTransport, onError, onClose }) {
  const peer = new window.Peer({ debug: 1 });
  let done = false;
  peer.on('open', () => {
    const conn = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' });
    const to = setTimeout(() => { if (!done) { onError && onError({ type: 'timeout', message: 'Bağlantı zaman aşımı' }); } }, 15000);
    conn.on('open', () => { done = true; clearTimeout(to); const tr = new PeerTransport(conn); tr.onClose(() => onClose && onClose()); onTransport(tr); });
    conn.on('error', e => onError && onError(e));
  });
  peer.on('error', err => onError && onError(err));
  return peer;
}
