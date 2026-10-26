// Ağ mantığı testi: sahte taşıyıcı üzerinden ev sahibi + misafir (aynı süreçte iki oyun örneği)
import fs from 'fs';
import { initMap, MAP } from '../js/mapdata.js';
import * as S from '../js/sim.js';
import { HostLink, GuestLink, mockPair } from '../js/net.js';
initMap(JSON.parse(fs.readFileSync(new URL('../data/world.json', import.meta.url))));
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };

let lobby = { hostTag: 'TUR', guestTag: null };
let state = null; const chats = [];
const host = new HostLink({
  onGuestJoin: n => { lobby.guestName = n; host.sendLobby(lobby); },
  onGuestLeave: () => { if (state) state.speed = 0; },
  onPick: t => { lobby.guestTag = t; host.sendLobby(lobby); },
  onCmd: c => S.applyCommand(state, lobby.guestTag, c),
  onChat: t => chats.push(['guest', t]),
  onPauseReq: () => { state.speed = 0; }
});
let gLobby = null, gStarted = false, gState = null, gChats = [], fullSnaps = 0;
const gh = { onLobby: l => gLobby = l, onStart: () => gStarted = true, onState: (s, full) => { gState = s; if (full) fullSnaps++; }, onChat: (f, t) => gChats.push([f, t]), onWelcome: () => {} };
let guest = new GuestLink(gh, 'tok123', 'Ayşe');
let [a, b] = mockPair(); host.attach(a); guest.attach(b);
await wait(20);
ok(gLobby && gLobby.guestName === 'Ayşe', 'misafir lobiye katıldı ve lobi bilgisi aldı');
guest.pick('GRE'); await wait(20);
ok(lobby.guestTag === 'GRE' && gLobby.guestTag === 'GRE', 'misafir ülke seçimi ev sahibine ulaştı (GRE)');
state = S.newGame({ players: { host: 'TUR', guest: 'GRE' }, mode: 'mp' });
host.start(state); await wait(50);
ok(gStarted && gState && gState.day === 0, 'başlangıç anlık görüntüsü alındı');
ok(Object.keys(gState.divs).length === Object.keys(state.divs).length, `tümen sayısı eşleşti (${Object.keys(gState.divs).length})`);
ok(gState.countries.GRE.stock && gState.countries.GRE.lines.length >= 0 && !gState.countries.GRE.lite, 'misafirin ülkesi tam veriyle geldi');
ok(gState.countries.GER.lite === 1, 'yapay zekâ ülkeleri hafif veriyle geldi');
// birkaç gün ilerlet + fark gönder
for (let i = 0; i < 30; i++) { S.tick(state); host.flush(); }
await wait(80);
ok(gState.day === state.day, `gün senkron (${gState.day})`);
// misafir komutu: tümen hareketi
const gdiv = Object.values(gState.divs).find(d => d.o === 'GRE');
const target = MAP.adj[gdiv.p].find(e => state.provs[e.to].c === 'GRE' && (e.f & 1));
let res = null;
if (target) { guest.cmd({ type: 'move', ids: [gdiv.id], to: target.to }, r => res = r); await wait(30); ok(res && res.ok, 'misafirin hareket emri ev sahibinde uygulandı'); ok(state.divs[gdiv.id].path.length > 0, 'ev sahibi durumunda tümen yolda'); }
guest.cmd({ type: 'research', id: 'ind1' }, r => res = r); await wait(30);
guest.cmd({ type: 'build', b: 'civ', prov: state.countries.GRE.capital }, r => res = r); await wait(30);
ok(res && res.ok && state.countries.GRE.queue.length === 1, 'misafir inşaat emri verdi');
guest.cmd({ type: 'move', ids: Object.keys(state.divs).filter(id => state.divs[id].o === 'TUR').slice(0, 1), to: 0 }, r => res = r); await wait(30);
ok(state.countries.TUR && !Object.values(state.divs).some(d => d.o === 'TUR' && d.path.length && d.path[d.path.length - 1] === 0), 'misafir ev sahibinin birliklerini yönetemez');
for (let i = 0; i < 20; i++) { S.tick(state); host.flush(); } await wait(60);
ok(gState.countries.GRE.queue.length === state.countries.GRE.queue.length, 'inşaat kuyruğu senkron');
const posEq = Object.keys(state.divs).every(id => gState.divs[id] && gState.divs[id].p === state.divs[id].p);
ok(posEq && Object.keys(gState.divs).length === Object.keys(state.divs).length, 'tüm tümen konumları senkron');
// sohbet
guest.chat('Merhaba!'); host.chat('Ev sahibi', 'Selam'); await wait(20);
ok(chats.length === 1 && gChats.length === 1, 'sohbet iki yönlü çalışıyor');
// duraklatma isteği
state.speed = 3; guest.pauseReq(); await wait(20); ok(state.speed === 0, 'misafir duraklatma isteği oyunu duraklattı');
// kopma ve yeniden bağlanma
const snapsBefore = fullSnaps; b.close(); await wait(20);
ok(!host.connected, 'kopma algılandı');
for (let i = 0; i < 15; i++) S.tick(state);
guest = new GuestLink(gh, 'tok123', 'Ayşe'); [a, b] = mockPair(); host.attach(a); guest.attach(b); await wait(80);
ok(fullSnaps === snapsBefore + 1 && gState.day === state.day, `yeniden bağlanınca tam anlık görüntü alındı (gün ${gState.day})`);
// yabancı jetonla katılım reddi
let rejected = null; const intr = new GuestLink({ onReject: w => rejected = w }, 'baska', 'X'); const [a2, b2] = mockPair(); host.attach(a2); intr.attach(b2); await wait(30);
ok(!!rejected, 'ikinci (farklı) misafir reddedildi: ' + rejected);
// fark boyutu
let bytes0 = a.bytes; for (let i = 0; i < 30; i++) { S.tick(state); host.flush(); } await wait(50);
console.log('30 günlük fark trafiği (KB):', Math.round((a.bytes - bytes0) / 1024));
console.log(fails ? `${fails} test BAŞARISIZ` : 'Tüm ağ testleri başarılı');
process.exit(fails ? 1 : 0);
