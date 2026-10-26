// Mekanik testleri: savaş ilanı, deniz indirmesi, teslimiyet, barış, şablon, ticaret
import fs from 'fs';
import { initMap, MAP } from '../js/mapdata.js';
import * as S from '../js/sim.js';
initMap(JSON.parse(fs.readFileSync(new URL('../data/world.json', import.meta.url))));
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const s = S.newGame({ players: { host: 'TUR', guest: 'GER' }, mode: 'mp' });
// şablon
let r = S.applyCommand(s, 'TUR', { type: 'tmplSave', tmpl: { name: 'Dağ Tümeni', bn: { inf: 5, art: 2 } } });
ok(r.ok && s.countries.TUR.tmpl.length === 6, 'şablon kaydedildi');
// ticaret
r = S.applyCommand(s, 'TUR', { type: 'trade', res: 'rubber', n: 2 }); ok(r.ok && s.countries.TUR.res.rubber >= 16, 'ticaret ithalatı eklendi');
// tarafsız topraktan geçiş yasak
const turDiv = Object.values(s.divs).find(d => d.o === 'TUR');
r = S.applyCommand(s, 'TUR', { type: 'move', ids: [turDiv.id], to: s.countries.GRE.capital }); ok(!r.ok, 'barışta yabancı topraklara girilemez');
// savaş gerekçesi + ilan
r = S.applyCommand(s, 'TUR', { type: 'justify', target: 'GRE' }); ok(r.ok, 'Yunanistan için gerekçe');
while (s.countries.TUR.wg.GRE.days > 0) S.tick(s);
r = S.applyCommand(s, 'TUR', { type: 'declare', target: 'GRE' }); ok(r.ok && S.atWar(s, 'TUR', 'GRE'), 'savaş ilan edildi');
// deniz indirmesi (ayrı oyun): Almanya -> Büyük Britanya (kara yolu yok, Fransa tarafsız)
{
  const u = S.newGame({ players: { host: 'GER' }, mode: 'sp' });
  u.countries.GER.wg.ENG = { days: 0 }; S.applyCommand(u, 'GER', { type: 'declare', target: 'ENG' });
  const from = u.provs.map((p, i) => i).filter(i => u.provs[i].o === 'GER' && MAP.provs[i].coastal);
  let inv = null;
  for (const f of from) { for (let to = 0; to < MAP.N; to++) { if (u.provs[to].o !== 'ENG' || MAP.provs[to].modern !== 'GBR' || !MAP.provs[to].coastal) continue; if (S.findPath(u, 'GER', f, to)) continue; const z = (u.provs && MAP.provs[f].seas.find(zz => MAP.provs[to].seas.includes(zz))); if (z == null) continue; inv = { from: f, to, z }; break; } if (inv) break; }
  if (inv) {
    const d = Object.values(u.divs).find(d => d.o === 'GER'); d.p = inv.from; d.path = []; S.invalidateIdx(u);
    for (const id in u.divs) if (u.divs[id].o !== 'GER' && u.divs[id].p === inv.to) delete u.divs[id];
    for (const id in u.fleets) if (u.fleets[id].o !== 'GER') delete u.fleets[id];
    S.invalidateIdx(u);
    r = S.applyCommand(u, 'GER', { type: 'move', ids: [d.id], to: inv.to });
    ok(r.ok && r.naval === 1 && d.inv, `deniz indirmesi emri (${MAP.provs[inv.from].name} → ${MAP.provs[inv.to].name})`);
    for (let i = 0; i < 14; i++) S.tick(u);
    ok(u.divs[d.id] && u.divs[d.id].p === inv.to, 'çıkarma başarılı, tümen karaya çıktı');
    // düşman donanması üstünse indirme başarısız olmalı
    const d2 = Object.values(u.divs).find(x => x.o === 'GER' && x.id !== d.id); d2.p = inv.from; d2.path = []; S.invalidateIdx(u);
    S.makeFleet(u, 'ENG', inv.z, 80);
    S.applyCommand(u, 'GER', { type: 'move', ids: [d2.id], to: inv.to });
    for (let i = 0; i < 14; i++) S.tick(u);
    ok(u.divs[d2.id] && u.divs[d2.id].p === inv.from, 'düşman deniz üstünlüğünde indirme başarısız oldu');
  } else ok(false, 'indirme hedefi bulunamadı');
}
// teslimiyet: Yunanistan'a karşı ezici kuvvet
const turCoast = s.provs.map((p, i) => i).filter(i => s.provs[i].o === 'TUR' && MAP.provs[i].coastal);
for (let i = 0; i < 40; i++) S.makeDiv(s, s.countries.TUR, 't0', turCoast[0]);
for (const id in s.divs) { const d = s.divs[id]; if (d.o === 'TUR') { d.org = S.divStats(s, d).org; d.ord = 'attack'; } }
let day0 = s.day; while (s.countries.GRE.alive && !s.countries.GRE.puppetOf && s.day - day0 < 400) S.tick(s);
ok(!S.atWar(s, 'TUR', 'GRE'), `Yunanistan teslim oldu (${s.day - day0} gün, otomatik saldırı emriyle)`);
ok(s.provs.some((p, i) => MAP.provs[i].owner0 === 'GRE' && p.o === 'TUR'), 'işgal edilen iller ilhak edildi');
// beyaz barış: GER (oyuncu) - POL
s.countries.GER.wg.POL = { days: 0 }; S.applyCommand(s, 'GER', { type: 'declare', target: 'POL' });
for (let i = 0; i < 70; i++) S.tick(s);
s.countries.POL.surrender = 0.5; // AI kaybettiğini düşünsün
if (S.atWar(s, 'GER', 'POL')) { S.applyCommand(s, 'GER', { type: 'peace', target: 'POL' }); ok(!S.atWar(s, 'GER', 'POL'), 'YZ beyaz barışı kabul etti'); } else ok(true, 'Polonya zaten düştü');
// oyuncunun teslimiyeti -> oyun biter
const t = S.newGame({ players: { host: 'TUR', guest: 'ALB' }, mode: 'mp' });
t.countries.TUR.wg.ALB = { days: 0 }; S.applyCommand(t, 'TUR', { type: 'declare', target: 'ALB' });
S.capitulate(t, 'ALB'); ok(t.over && t.winner === 'TUR', 'diğer oyuncu teslim olunca oyun biter, kazanan TUR');
console.log(fails ? `${fails} test BAŞARISIZ` : 'Tüm mekanik testleri başarılı'); process.exit(fails ? 1 : 0);
