// Giriş noktası: menü, lobi, oyun döngüsü, girdi, kayıt/yükleme, ağ bağlantısı
import { initMap, MAP } from './mapdata.js';
import * as S from './sim.js';
import { MapRenderer } from './render.js';
import { UI } from './ui.js';
import { HostLink, GuestLink, hostPeer, guestConnect, peerAvailable } from './net.js';
import { COUNTRIES, MAJORS, IDEOLOGIES } from './scenario.js';
import { randCode, esc, fmtDate } from './util.js';
import { flagURL } from './flags.js';

const SPEED_MS = [0, 900, 450, 220, 110, 45];
const $ = id => document.getElementById(id);
const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };

const game = window.HOIW = {
  state: null, myTag: null, role: null, renderer: null, ui: null, myName: LS.get('hoiw_name', 'Komutan'), lastSpeed: 2, deployProv: null,
  netOk: true, netLabel: '', netStatus: '', roomCode: '', inviteLink: '', host: null, guest: null, peer: null,
  send(cmd) {
    if (this.role === 'guest') return new Promise(res => { let done = false; this.guest.cmd(cmd, m => { done = true; res(m); }); setTimeout(() => { if (!done) res({ ok: false, err: 'Ev sahibinden yanıt yok' }); }, 8000); });
    return Promise.resolve(S.applyCommand(this.state, this.myTag, cmd));
  },
  setSpeed(v) {
    if (this.role === 'guest') { if (v === 0) { this.guest.pauseReq(); this.ui.toast('Ev sahibinden duraklatma istendi', 'info', 2500); } return; }
    if (!this.state) return; this.state.speed = v; if (v > 0) this.lastSpeed = v; this.ui.update(true);
  },
  chat(text) {
    if (this.role === 'host') { this.host.chat(this.myName, text); this.ui.addChat(this.myName, text); }
    else if (this.role === 'guest') { this.guest.chat(text); this.ui.addChat(this.myName, text); }
  },
  save() { saveDialog(); }, showLoad() { loadDialog(); }, exit() { location.href = location.pathname; }
};

// ---------- yükleme ----------
async function boot() {
  try {
    let data;
    try { const r = await fetch('data/world.json'); if (!r.ok) throw new Error('HTTP ' + r.status); data = await r.json(); }
    catch (e0) {
      const bufs = await Promise.all(Array.from({length: 5}, async (_, i) => { const r = await fetch('data/world.part' + i + '.txt'); if (!r.ok) throw new Error('HTTP ' + r.status); return new Uint8Array(await r.arrayBuffer()); }));
      const all = new Uint8Array(bufs.reduce((a, b) => a + b.length, 0)); let o = 0; for (const b of bufs) { all.set(b, o); o += b.length; }
      data = JSON.parse(new TextDecoder().decode(all));
    }
    initMap(data);
  } catch (e) {
    $('loading').innerHTML = `<div class="err">Harita verisi yüklenemedi (${esc(e.message)}).<br>Oyunu bir web sunucusu üzerinden açın (ör. GitHub Pages ya da <code>python3 -m http.server</code>). Dosyayı doğrudan çift tıklayarak açmak tarayıcı güvenliği nedeniyle çalışmaz.</div>`; return;
  }
  $('loading').classList.add('hidden');
  $('player-name').value = game.myName;
  $('player-name').addEventListener('change', e => { game.myName = e.target.value.trim().slice(0, 20) || 'Komutan'; LS.set('hoiw_name', game.myName); });
  $('btn-sp').onclick = () => openLobby('sp');
  $('btn-host').onclick = () => openLobby('host');
  $('btn-join').onclick = () => { const code = $('join-code').value.trim().toUpperCase().replace(/^HOIW-/, ''); if (code.length < 4) { alertBox('Geçerli bir oda kodu girin.'); return; } openLobby('guest', code); };
  $('btn-load').onclick = () => loadDialog();
  if (!peerAvailable()) { $('net-warn').textContent = 'PeerJS yüklenemedi: çevrimiçi mod kullanılamıyor (internet bağlantısını kontrol edin). Tek oyunculu mod çalışır.'; }
  const q = new URLSearchParams(location.search).get('join');
  if (q) { $('join-code').value = q.toUpperCase(); openLobby('guest', q.toUpperCase().replace(/^HOIW-/, '')); }
  else if (LS.get('hoiw_autosave', null)) $('btn-continue').classList.remove('hidden');
  $('btn-continue').onclick = () => { const d = LS.get('hoiw_autosave', null); if (d) { const s = JSON.parse(d); if (s.mode === 'mp') { openLobby('host', null, s); } else { startGame('sp', s, s.players.host); } } };
}
function show(id) { ['screen-menu', 'screen-lobby', 'screen-game'].forEach(s => $(s).classList.toggle('hidden', s !== id)); }
function alertBox(msg) { const m = document.createElement('div'); m.className = 'modal-bg'; m.innerHTML = `<div class="modal"><p>${msg}</p><div class="btnrow"><button>Tamam</button></div></div>`; m.querySelector('button').onclick = () => m.remove(); document.body.appendChild(m); }

// ---------- lobi ----------
const lobby = { mode: null, hostTag: null, guestTag: null, hostName: '', guestName: null, loaded: null, preview: null, sel: null, renderer: null };
function openLobby(mode, code, loadedState) {
  lobby.mode = mode; lobby.loaded = loadedState || null; show('screen-lobby');
  lobby.preview = lobby.preview || S.newGame({ players: {} });
  if (!lobby.renderer) {
    lobby.renderer = new MapRenderer($('lobby-map')); lobby.renderer.noUnits = true; lobby.renderer.cam.z = 0.42; lobby.renderer.cam.x = MAP.w * 0.52; lobby.renderer.cam.y = MAP.h * 0.36;
    bindMapInput($('lobby-map'), lobby.renderer, {
      click: (x, y) => { const pid = lobby.renderer.hitProv(x, y); if (pid >= 0) pickCountry(lobby.preview.provs[pid].o); }
    });
  }
  lobby.renderer.setState(lobby.loaded || lobby.preview, null); lobby.renderer.resize();
  if (loadedState) { lobby.hostTag = loadedState.players.host; lobby.guestTag = loadedState.players.guest || null; lobby.sel = lobby.hostTag; }
  $('lobby-title').textContent = mode === 'sp' ? 'Tek Oyunculu — Ülke Seç' : mode === 'host' ? 'Çevrimiçi Oda (Ev Sahibi)' : 'Çevrimiçi Oda (Misafir)';
  renderCountryList();
  $('lobby-back').onclick = () => game.exit();
  $('lobby-start').onclick = () => lobbyStart();
  if (mode === 'host') startHosting(loadedState);
  if (mode === 'guest') startJoining(code);
  renderLobby();
}
function renderCountryList() {
  const src = lobby.loaded || lobby.preview;
  const majors = MAJORS.map(t => `<button class="cbtn" data-tag="${t}"><img src="${flagURL(t, COUNTRIES[t][1])}"><span>${COUNTRIES[t][0]}</span></button>`).join('');
  const others = Object.keys(COUNTRIES).filter(t => !MAJORS.includes(t) && src.countries[t]?.alive).sort((a, b) => COUNTRIES[a][0].localeCompare(COUNTRIES[b][0], 'tr'));
  $('lobby-countries').innerHTML = `<div class="majors">${majors}</div><select id="minor-sel"><option value="">— Diğer ülkeler —</option>${others.map(t => `<option value="${t}">${COUNTRIES[t][0]}</option>`).join('')}</select>`;
  $('lobby-countries').querySelectorAll('.cbtn').forEach(b => b.onclick = () => pickCountry(b.dataset.tag));
  $('minor-sel').onchange = e => e.target.value && pickCountry(e.target.value);
}
function pickCountry(tag) {
  if (!COUNTRIES[tag]) return;
  if (lobby.loaded && lobby.mode !== 'sp') { if (lobby.mode === 'guest') return; }
  lobby.sel = tag;
  if (lobby.mode === 'host') { if (tag === lobby.guestTag) { alertBox('Bu ülkeyi misafir seçti.'); return; } lobby.hostTag = tag; pushLobby(); }
  else if (lobby.mode === 'guest') { if (tag === lobby.hostTag) { alertBox('Bu ülkeyi ev sahibi seçti.'); return; } game.guest && game.guest.pick(tag); }
  else lobby.hostTag = tag;
  lobby.renderer.selProv = -1; const src = lobby.loaded || lobby.preview; const cap = src.countries[tag]?.capital; if (cap >= 0) { lobby.renderer.selProv = cap; }
  lobby.renderer.mark(); renderLobby();
}
function countryCard(tag, who) {
  if (!tag) return `<div class="pcard empty">${who}: <i>seçilmedi</i></div>`;
  const src = lobby.loaded || lobby.preview; const c = src.countries[tag]; const divs = Object.values(src.divs).filter(d => d.o === tag).length;
  return `<div class="pcard"><img src="${flagURL(tag, c.color)}"><div><b>${who}: ${esc(c.name)}</b><small>${IDEOLOGIES[c.ideo].name} · ${c.civ} sivil / ${c.mil} askerî fabrika · ${divs} tümen · ${Math.round(c.pop)}M nüfus${c.faction && src.factions[c.faction] ? ' · ' + esc(src.factions[c.faction].name) : ''}${c.puppetOf ? ' · ' + esc(src.countries[c.puppetOf].name) + ' kuklası' : ''}</small></div></div>`;
}
function renderLobby() {
  let h = '';
  if (lobby.mode === 'host') {
    h += `<div class="room"><div>Oda kodu: <b class="code">${esc(game.roomCode || '…')}</b> <button class="small" id="copy-code">Kopyala</button></div>
      <div>Davet bağlantısı: <input readonly id="invite-link" value="${esc(game.inviteLink)}"> <button class="small" id="copy-link">Kopyala</button></div>
      <div class="status">${esc(game.netStatus)}</div></div>`;
  } else if (lobby.mode === 'guest') h += `<div class="room"><div class="status">${esc(game.netStatus)}</div></div>`;
  h += countryCard(lobby.hostTag, lobby.mode === 'sp' ? 'Seçiminiz' : `Ev sahibi (${esc(lobby.hostName || (lobby.mode === 'host' ? game.myName : ''))})`);
  if (lobby.mode !== 'sp') h += countryCard(lobby.guestTag, `Misafir${lobby.guestName ? ' (' + esc(lobby.guestName) + ')' : ''}`);
  if (lobby.loaded) h += `<div class="hint">Kayıtlı oyun: ${fmtDate(lobby.loaded.day)}</div>`;
  $('lobby-info').innerHTML = h;
  const cc = $('copy-code'); if (cc) cc.onclick = () => navigator.clipboard?.writeText(game.roomCode);
  const cl = $('copy-link'); if (cl) cl.onclick = () => { navigator.clipboard?.writeText(game.inviteLink); $('invite-link').select(); };
  const canStart = lobby.mode === 'sp' ? !!lobby.hostTag : lobby.mode === 'host' ? (lobby.hostTag && lobby.guestTag && game.host?.connected && lobby.hostTag !== lobby.guestTag) : false;
  $('lobby-start').disabled = !canStart; $('lobby-start').classList.toggle('hidden', lobby.mode === 'guest');
  $('lobby-wait').classList.toggle('hidden', lobby.mode !== 'guest'); $('lobby-wait').textContent = lobby.guestTag ? 'Ev sahibinin oyunu başlatması bekleniyor…' : 'Haritadan ya da listeden bir ülke seçin.';
  if (lobby.mode === 'host' && !game.host?.connected) $('lobby-start').title = 'Misafirin bağlanması bekleniyor'; else $('lobby-start').title = '';
}
function pushLobby() { if (game.host) game.host.sendLobby({ hostTag: lobby.hostTag, guestTag: lobby.guestTag, hostName: game.myName, guestName: lobby.guestName, loaded: !!lobby.loaded, day: lobby.loaded?.day || 0 }); renderLobby(); }
function lobbyStart() {
  if (lobby.mode === 'sp') { const s = lobby.loaded || S.newGame({ players: { host: lobby.hostTag }, mode: 'sp' }); s.players = { host: lobby.hostTag }; startGame('sp', s, lobby.hostTag); return; }
  if (lobby.mode === 'host') {
    let s = lobby.loaded; if (s) { s.players = { host: lobby.hostTag, guest: lobby.guestTag }; s.mode = 'mp'; } else s = S.newGame({ players: { host: lobby.hostTag, guest: lobby.guestTag }, mode: 'mp' });
    game.host.start(s); startGame('host', s, lobby.hostTag);
  }
}

// ---------- ev sahipliği ----------
function startHosting(loaded) {
  if (!peerAvailable()) { game.netStatus = 'PeerJS yüklenemedi; çevrimiçi oyun kullanılamıyor.'; renderLobby(); return; }
  if (game.host) { pushLobby(); return; }
  let code = LS.get('hoiw_code', null) || randCode(5);
  game.netStatus = 'Sunucuya bağlanılıyor…';
  game.host = new HostLink({
    onGuestJoin: name => { lobby.guestName = name; game.netOk = true; game.netLabel = name + ' bağlı'; game.netStatus = `${name} bağlandı.`; pushLobby(); if (game.ui) { game.ui.addChat('', `${name} oyuna bağlandı.`, true); game.ui.update(true); } },
    onGuestLeave: () => { game.netOk = false; game.netLabel = 'Misafir koptu'; game.netStatus = 'Misafirin bağlantısı koptu. Yeniden bağlanması bekleniyor…'; if (game.state && game.role === 'host') { game.state.speed = 0; game.ui.addChat('', 'Misafirin bağlantısı koptu — oyun duraklatıldı. Aynı bağlantıyla yeniden katılabilir.', true); game.ui.update(true); } renderLobby(); },
    onPick: tag => { if (lobby.loaded && lobby.loaded.players.guest) { pushLobby(); return; } if (tag !== lobby.hostTag && COUNTRIES[tag]) { lobby.guestTag = tag; } pushLobby(); },
    onCmd: c => { if (!game.state || game.role !== 'host') return { ok: false, err: 'Oyun başlamadı' }; const r = S.applyCommand(game.state, lobby.guestTag, c); game.renderer.mark(); game.ui.update(); return r; },
    onChat: text => game.ui ? game.ui.addChat(lobby.guestName || 'Misafir', text) : null,
    onPauseReq: () => { if (game.state) { game.state.speed = 0; game.ui.addChat('', `${lobby.guestName || 'Misafir'} duraklatma istedi.`, true); game.ui.update(true); } }
  });
  const open = () => {
    game.peer = hostPeer(code, {
      onOpen: () => { LS.set('hoiw_code', code); game.roomCode = code; game.inviteLink = location.origin + location.pathname + '?join=' + code; game.netStatus = 'Oda hazır. Kodu ya da bağlantıyı arkadaşınızla paylaşın.'; game.netLabel = 'Misafir bekleniyor'; renderLobby(); },
      onConnection: tr => { game.host.attach(tr); setTimeout(pushLobby, 100); },
      onError: err => {
        if (err.type === 'unavailable-id') { code = randCode(5); try { game.peer.destroy(); } catch (e) { } setTimeout(open, 300); return; }
        game.netStatus = 'Ağ hatası: ' + (err.type || err.message || err); renderLobby();
      },
      onDisconnected: () => { game.netStatus = 'Eşleştirme sunucusu bağlantısı koptu, yeniden deneniyor…'; renderLobby(); }
    });
  };
  open();
  game.flushTimer = setInterval(() => { if (game.role === 'host' && game.host) game.host.flush(); }, 200);
}

// ---------- katılma ----------
function startJoining(code) {
  if (!peerAvailable()) { game.netStatus = 'PeerJS yüklenemedi; çevrimiçi oyun kullanılamıyor.'; renderLobby(); return; }
  let token = LS.get('hoiw_token', null); if (!token) { token = randCode(12); LS.set('hoiw_token', token); }
  game.roomCode = code;
  const handlers = {
    onWelcome: started => { game.netOk = true; game.netLabel = 'Ev sahibine bağlı'; game.netStatus = started ? 'Oyuna yeniden bağlanıldı.' : 'Odaya bağlanıldı. Bir ülke seçin.'; if (game.ui) game.ui.addChat('', game.netStatus, true); if (!started && game.role === 'guest') { show('screen-lobby'); } renderLobby(); },
    onReject: why => { game.netStatus = 'Katılım reddedildi: ' + why; game.rejected = true; renderLobby(); alertBox(esc(game.netStatus)); },
    onLobby: l => { lobby.hostTag = l.hostTag; lobby.guestTag = l.guestTag; lobby.hostName = l.hostName; lobby.guestName = l.guestName; if (l.guestTag) lobby.sel = l.guestTag; lobby.renderer && lobby.renderer.mark(); renderLobby(); },
    onStart: () => { game.netStatus = 'Oyun başlıyor…'; renderLobby(); },
    onState: (s, full) => {
      if (full) { if (game.role !== 'guest' || $('screen-game').classList.contains('hidden')) startGame('guest', s, s.players.guest); else { game.state = s; game.renderer.setState(s, game.myTag); game.ui.update(true); } }
      else { game.renderer.markSim(); game.ui.update(); }
    },
    onChat: (from, text) => game.ui && game.ui.addChat(from, text),
    onSys: text => game.ui && game.ui.addChat('', text, true)
  };
  const connect = () => {
    if (game.rejected) return;
    game.netStatus = `hoiw-${code} odasına bağlanılıyor…`; renderLobby();
    try { game.peer && game.peer.destroy(); } catch (e) { }
    game.guest = new GuestLink(handlers, token, game.myName);
    game.peer = guestConnect(code, {
      onTransport: tr => { game.guest.attach(tr); },
      onError: err => { game.netOk = false; game.netStatus = (err.type === 'peer-unavailable' ? 'Oda bulunamadı (ev sahibi çevrimdışı olabilir).' : 'Bağlantı hatası: ' + (err.type || err.message || '')) + ' Yeniden deneniyor…'; game.netLabel = 'Bağlantı yok'; renderLobby(); if (game.ui) game.ui.update(true); scheduleRetry(); },
      onClose: () => { game.netOk = false; game.netLabel = 'Bağlantı koptu'; game.netStatus = 'Ev sahibiyle bağlantı koptu. Yeniden bağlanılıyor…'; if (game.ui) { game.ui.addChat('', game.netStatus, true); game.ui.update(true); } renderLobby(); scheduleRetry(); }
    });
  };
  let retryT = null; const scheduleRetry = () => { if (retryT) return; retryT = setTimeout(() => { retryT = null; connect(); }, 4000); };
  connect();
  setInterval(() => game.guest && game.guest.ping(), 5000);
}

// ---------- oyun ----------
function startGame(role, state, tag) {
  game.role = role; game.state = state; game.myTag = tag;
  show('screen-game');
  if (!game.renderer) {
    game.renderer = new MapRenderer($('map'));
    game.ui = new UI(game);
    bindGameInput();
  }
  game.renderer.resize(); game.renderer.setState(state, tag);
  const c = state.countries[tag]; if (c && c.capital >= 0) game.renderer.centerOn(c.capital, 1.1);
  game.ui.seenNote = Math.max(0, (state.noteSeq || 0) - 3);
  game.ui.update(true);
  if (role !== 'guest' && !game.simTimer) simLoop();
  if (!game.welcomed) { game.welcomed = true; if (LS.get('hoiw_seen_help', '') !== '1') { LS.set('hoiw_seen_help', '1'); game.ui.help(); } }
  if (role !== 'guest' && !game.autoTimer) game.autoTimer = setInterval(() => { if (game.state && game.state.day % 30 < 10 && game.state.speed > 0) autosave(); }, 60000);
}
function simLoop() {
  const s = game.state;
  if (s && s.speed > 0 && !s.over && (game.role === 'sp' || game.role === 'host')) {
    try { S.tick(s); } catch (e) { console.error(e); s.speed = 0; game.ui.toast('Simülasyon hatası: ' + esc(e.message), 'bad', 8000); }
    if (s.day % 182 === 0) autosave();
    game.renderer.markSim(); game.ui.update();
  }
  game.simTimer = setTimeout(simLoop, s && s.speed ? SPEED_MS[s.speed] : 120);
}

// ---------- girdi ----------
function bindMapInput(cv, R, h) {
  let down = null; let moved = false;
  cv.addEventListener('mousedown', e => { down = { x: e.offsetX, y: e.offsetY, b: e.button, shift: e.shiftKey, lx: e.offsetX, ly: e.offsetY }; moved = false; });
  window.addEventListener('mouseup', e => {
    if (!down) return; const d = down; down = null;
    const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    if (d.b === 0) { if (R.box) { const b = R.box; R.box = null; R.mark(); h.box && h.box(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.max(b.x0, b.x1), Math.max(b.y0, b.y1), d.shift); } else if (!moved && e.target === cv) h.click && h.click(x, y, d.shift); }
  });
  cv.addEventListener('mousemove', e => {
    const x = e.offsetX, y = e.offsetY;
    if (down) {
      const dx = x - down.lx, dy = y - down.ly; if (Math.abs(x - down.x) + Math.abs(y - down.y) > 4) moved = true;
      if (down.b === 0 && down.shift && h.box) { R.box = { x0: down.x, y0: down.y, x1: x, y1: y }; R.mark(); }
      else if (moved && (down.b === 0 || down.b === 1)) R.pan(dx, dy);
      down.lx = x; down.ly = y;
    }
    h.move && h.move(x, y, e);
  });
  cv.addEventListener('wheel', e => { e.preventDefault(); R.zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  cv.addEventListener('contextmenu', e => { e.preventDefault(); h.right && h.right(e.offsetX, e.offsetY, e); });
  // dokunmatik: tek parmak kaydır, iki parmak yakınlaştır
  let touch = null;
  cv.addEventListener('touchstart', e => { if (e.touches.length === 1) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), moved: false }; else if (e.touches.length === 2) touch = { pinch: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) }; }, { passive: true });
  cv.addEventListener('touchmove', e => { if (!touch) return; e.preventDefault(); if (e.touches.length === 1 && touch.x != null) { const t = e.touches[0]; R.pan(t.clientX - touch.x, t.clientY - touch.y); touch.moved = touch.moved || Math.abs(t.clientX - touch.x) > 3; touch.x = t.clientX; touch.y = t.clientY; } else if (e.touches.length === 2 && touch.pinch) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); const r = cv.getBoundingClientRect(); R.zoomAt((e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top, d / touch.pinch); touch.pinch = d; } }, { passive: false });
  cv.addEventListener('touchend', e => { if (touch && touch.x != null && !touch.moved && Date.now() - touch.t < 300) { const r = cv.getBoundingClientRect(); h.click && h.click(touch.x - r.left, touch.y - r.top, false); } touch = null; });
}
function bindGameInput() {
  const R = game.renderer, cv = $('map'), tip = $('tooltip');
  let tipT = 0;
  bindMapInput(cv, R, {
    click: (x, y, shift) => {
      const s = game.state; const u = R.hitUnit(x, y);
      if (u && u.owner === game.myTag) { if (shift) u.ids.forEach(id => R.sel.add(id)); else R.sel = new Set(u.ids); R.selFleet = null; R.selProv = u.pid; }
      else { const f = R.hitFleet(x, y); if (f && f.o === game.myTag) { R.selFleet = f.id; R.sel = new Set(); } else { const pid = R.hitProv(x, y); R.selProv = pid; if (!shift) { R.sel = new Set(); R.selFleet = null; } } }
      R.mark(); game.ui.update(true);
    },
    box: (x0, y0, x1, y1, shift) => { if (!shift) R.sel = new Set(); for (const r of R.unitRects) { const cx = r.x + r.w / 2, cy = r.y + r.h / 2; if (r.owner === game.myTag && cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) r.ids.forEach(id => R.sel.add(id)); } R.selFleet = null; R.mark(); game.ui.update(true); },
    right: (x, y) => {
      const s = game.state;
      if (R.selFleet) {
        const pid = R.hitProv(x, y); let z = -1;
        if (pid >= 0 && MAP.provs[pid].coastal) z = MAP.provs[pid].seas[0];
        else { const [wx, wy] = R.s2w(x, y); let bd = 1e18; MAP.seas.forEach(sz => { const d = (sz.x - wx) ** 2 + (sz.y - wy) ** 2; if (d < bd) { bd = d; z = sz.id; } }); }
        if (z >= 0) game.ui.send({ type: 'fleetMove', id: R.selFleet, z }).then(r => r && r.ok && game.ui.toast(`Filo ${esc(MAP.seas[z].name)} bölgesine gidiyor`, 'info', 2000));
        return;
      }
      if (!R.sel.size) return; const pid = R.hitProv(x, y); if (pid < 0) return;
      game.ui.send({ type: 'move', ids: [...R.sel], to: pid }).then(r => { if (r && r.ok && r.naval) game.ui.toast(`Deniz ${S.atWar(s, game.myTag, s.provs[pid].c) ? 'indirmesi' : 'nakli'} hazırlanıyor (${r.naval} tümen)`, 'info', 3000); });
    },
    move: (x, y, e) => {
      const now = performance.now(); if (now - tipT < 60) return; tipT = now;
      const pid = R.hitProv(x, y); if (pid !== R.hover) { R.hover = pid; R.mark(); }
      if (pid >= 0 && game.state) { tip.innerHTML = game.ui.tooltipFor(pid); tip.style.left = (e.clientX + 16) + 'px'; tip.style.top = (e.clientY + 16) + 'px'; tip.classList.remove('hidden'); } else tip.classList.add('hidden');
    }
  });
  cv.addEventListener('mouseleave', () => { tip.classList.add('hidden'); R.hover = -1; R.mark(); });
  window.addEventListener('keydown', e => {
    if (!game.state || $('screen-game').classList.contains('hidden')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); game.setSpeed(game.state.speed ? 0 : game.lastSpeed || 2); }
    else if (k >= '1' && k <= '5') game.setSpeed(+k);
    else if (k === 'Escape') { if (R.sel.size || R.selFleet) { R.sel = new Set(); R.selFleet = null; } else if (game.ui.panel) game.ui.openPanel(null); else R.selProv = -1; R.mark(); game.ui.update(true); }
    else if (k === 'w' || k === 'ArrowUp') R.pan(0, 60); else if (k === 's' || k === 'ArrowDown') R.pan(0, -60);
    else if (k === 'a' || k === 'ArrowLeft') R.pan(60, 0); else if (k === 'd' || k === 'ArrowRight') R.pan(-60, 0);
    else if (k === '+' || k === '=') R.zoomAt(R.W / 2, R.H / 2, 1.2); else if (k === '-') R.zoomAt(R.W / 2, R.H / 2, 1 / 1.2);
  });
}

// ---------- kayıt / yükleme ----------
function saveIndex() { try { return JSON.parse(LS.get('hoiw_saves', '[]')); } catch (e) { return []; } }
function writeSave(name, s) {
  const idx = saveIndex(); const id = 's' + Date.now();
  const data = JSON.stringify(s);
  let ok = LS.set('hoiw_save_' + id, data);
  while (!ok && idx.length) { const old = idx.shift(); LS.del('hoiw_save_' + old.id); ok = LS.set('hoiw_save_' + id, data); }
  if (!ok) return false;
  idx.push({ id, name, day: s.day, tag: s.players.host, guest: s.players.guest || null, mode: s.mode, when: new Date().toLocaleString('tr-TR') });
  while (idx.length > 6) { const old = idx.shift(); LS.del('hoiw_save_' + old.id); }
  LS.set('hoiw_saves', JSON.stringify(idx)); return true;
}
function autosave() { if (!game.state || game.role === 'guest') return; if (!LS.set('hoiw_autosave', JSON.stringify(game.state))) LS.del('hoiw_autosave'); }
function saveDialog() {
  if (!game.state || game.role === 'guest') return;
  const def = `${game.state.countries[game.myTag].name} — ${fmtDate(game.state.day)}`;
  game.ui.modal(`<h2>Oyunu Kaydet</h2><input id="save-name" value="${esc(def)}" maxlength="40" style="width:100%">`, [['Kaydet', m => { const ok = writeSave(m.querySelector('#save-name').value || def, game.state); game.ui.toast(ok ? 'Oyun kaydedildi' : 'Kayıt başarısız (tarayıcı depolama alanı dolu)', ok ? 'good' : 'bad'); }], ['İptal', () => {}]]);
}
function loadDialog() {
  const idx = saveIndex().slice().reverse(); const auto = LS.get('hoiw_autosave', null);
  const rows = idx.map(x => `<div class="qrow"><b>${esc(x.name)}</b> <small>${esc(x.when)} · ${x.mode === 'mp' ? 'Çevrimiçi' : 'Tek oyunculu'}</small> <button class="small" data-load="${x.id}">Yükle</button><button class="small" data-del="${x.id}">Sil</button></div>`).join('') || '<p>Kayıtlı oyun yok.</p>';
  const m = document.createElement('div'); m.className = 'modal-bg';
  m.innerHTML = `<div class="modal"><h2>Kayıtlı Oyunlar</h2>${auto ? '<div class="qrow"><b>Otomatik kayıt</b> <button class="small" data-load="__auto">Yükle</button></div>' : ''}${rows}<div class="btnrow"><button data-close>Kapat</button></div></div>`;
  m.addEventListener('click', e => {
    const t = e.target; if (t.dataset.close != null) m.remove();
    if (t.dataset.del) { LS.del('hoiw_save_' + t.dataset.del); LS.set('hoiw_saves', JSON.stringify(saveIndex().filter(x => x.id !== t.dataset.del))); m.remove(); loadDialog(); }
    if (t.dataset.load) {
      const raw = t.dataset.load === '__auto' ? auto : LS.get('hoiw_save_' + t.dataset.load, null); if (!raw) return;
      const s = JSON.parse(raw); m.remove();
      if (s.mode === 'mp') { const mm = document.createElement('div'); mm.className = 'modal-bg'; mm.innerHTML = `<div class="modal"><h2>Çevrimiçi kayıt</h2><p>Bu kayıt iki oyunculu. Nasıl devam edilsin?</p><div class="btnrow"><button data-a="host">Oda kur (misafir tekrar katılsın)</button><button data-a="sp">Tek oyunculu devam et</button></div></div>`; mm.onclick = ev => { const a = ev.target.dataset.a; if (!a) return; mm.remove(); if (a === 'host') { if (game.role) { LS.set('hoiw_autosave', raw); location.href = location.pathname; } else openLobby('host', null, s); } else { s.mode = 'sp'; s.players = { host: s.players.host }; startOrReplace(s); } }; document.body.appendChild(mm); }
      else startOrReplace(s);
    }
  });
  document.body.appendChild(m);
}
function startOrReplace(s) { if (game.role === 'host') { alertBox('Çevrimiçi oyun sırasında kayıt yüklemek için önce ana menüye dönün.'); return; } startGame('sp', s, s.players.host); }

boot();
