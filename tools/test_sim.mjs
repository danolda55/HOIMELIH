import fs from 'fs';
import { initMap, MAP } from '../js/mapdata.js';
import * as S from '../js/sim.js';
import { fmtDate } from '../js/util.js';
initMap(JSON.parse(fs.readFileSync(new URL('../data/world.json', import.meta.url))));
const days = +(process.argv[2] || 400);
const player = process.argv[3] || 'TUR';
const s = S.newGame({ players: { host: player }, mode: 'sp' });
console.log('divs', Object.keys(s.divs).length, 'fleets', Object.keys(s.fleets).length, 'wings', Object.keys(s.wings).length);
const t0 = Date.now(); let last = t0;
for (let i = 0; i < days; i++) {
  S.tick(s);
  if (s.day % 180 === 0) {
    const now = Date.now();
    const wars = Object.values(s.countries).filter(c => c.alive && c.enemies.length).map(c => c.tag + '>' + c.enemies.join(',')).slice(0, 12).join(' | ');
    console.log(fmtDate(s.day), 'ms/180d', now - last, 'divs', Object.keys(s.divs).length, 'battles', Object.keys(s.battles).length, 'tension', s.tension.toFixed(0));
    console.log('  wars:', wars);
    const majors = ['GER','SOV','USA','ENG','FRA','ITA','JAP','TUR','POL','CHI'].map(t => { const c = s.countries[t]; return `${t}:${c.alive?'':'X'} c${c.civ}/m${c.mil} d${Object.values(s.divs).filter(d=>d.o===t).length} vp${c.vp} sur${c.surrender.toFixed(2)} f:${c.focus.cur||'-'}`; });
    console.log('  ', majors.join('  '));
    last = now;
  }
  if (s.over) { console.log('OVER', s.overReason); break; }
}
console.log('total ms', Date.now() - t0, 'per day', ((Date.now() - t0) / days).toFixed(2));
console.log(s.notes.slice(-25).map(n => fmtDate(n.d) + ' ' + n.t).join('\n'));
const json = JSON.stringify(s); console.log('state KB', Math.round(json.length / 1024));
