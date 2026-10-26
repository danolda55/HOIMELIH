// Harita ön işleme: Natural Earth -> data/world.json
// Kullanım: node tools/build_map.js
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..', 'data'); const SRC = path.join(D, 'src');
const L = f => JSON.parse(fs.readFileSync(path.join(SRC, f)));
const world = L('ne110.geojson');
const places = L('places50.geojson');
const rivers = L('rivers50.geojson');

// ---------- 1936 sahiplik ----------
const OWN = {
  DEU:'GER', AUT:'AUS', CZE:'CZE', SVK:'CZE', SVN:'YUG', HRV:'YUG', BIH:'YUG', SRB:'YUG', MNE:'YUG', MKD:'YUG', KOS:'YUG',
  RUS:'SOV', UKR:'SOV', BLR:'SOV', KAZ:'SOV', UZB:'SOV', TKM:'SOV', KGZ:'SOV', TJK:'SOV', GEO:'SOV', ARM:'SOV', AZE:'SOV',
  ROU:'ROM', MDA:'ROM',
  GBR:'ENG', FLK:'ENG', CYP:'ENG', CYN:'ENG', ISR:'ENG', PSX:'ENG', JOR:'ENG', SDN:'ENG', SDS:'ENG', KEN:'ENG', UGA:'ENG', TZA:'ENG',
  NGA:'ENG', GHA:'ENG', SLE:'ENG', GMB:'ENG', ZMB:'ENG', ZWE:'ENG', MWI:'ENG', BWA:'ENG', LSO:'ENG', SWZ:'ENG', SOL:'ENG', MYS:'ENG',
  BRN:'ENG', GUY:'ENG', BLZ:'ENG', JAM:'ENG', TTO:'ENG', BHS:'ENG', ARE:'ENG', QAT:'ENG', KWT:'ENG', LKA:'ENG', MMR:'ENG', VUT:'ENG', SLB:'ENG', FJI:'ENG',
  EGY:'EGY', IRQ:'IRQ', IND:'RAJ', PAK:'RAJ', BGD:'RAJ', BTN:'RAJ', NPL:'NEP',
  FRA:'FRA', DZA:'FRA', TUN:'FRA', MAR:'FRA', SYR:'FRA', LBN:'FRA', MRT:'FRA', SEN:'FRA', MLI:'FRA', GIN:'FRA', CIV:'FRA', BFA:'FRA', NER:'FRA',
  BEN:'FRA', TGO:'FRA', CMR:'FRA', TCD:'FRA', CAF:'FRA', COG:'FRA', GAB:'FRA', MDG:'FRA', VNM:'FRA', LAO:'FRA', KHM:'FRA', DJI:'FRA', NCL:'FRA',
  ITA:'ITA', LBY:'ITA', ERI:'ITA', SOM:'ITA',
  ESP:'SPR', SAH:'SPR', GNQ:'SPR', PRT:'POR', AGO:'POR', MOZ:'POR', GNB:'POR', TLS:'POR',
  BEL:'BEL', COD:'BEL', RWA:'BEL', BDI:'BEL', NLD:'HOL', IDN:'HOL', SUR:'HOL', DNK:'DEN', GRL:'DEN', ISL:'DEN',
  USA:'USA', PHL:'USA', PRI:'USA', JPN:'JAP', PRK:'JAP', KOR:'JAP', TWN:'JAP', CHN:'CHI', MNG:'MON', THA:'SIA',
  ZAF:'SAF', NAM:'SAF', AUS:'AST', PNG:'AST', NZL:'NZL', CAN:'CAN', IRL:'IRE', LBR:'LIB', ETH:'ETH', SAU:'SAU', YEM:'YEM', OMN:'OMA',
  IRN:'PER', AFG:'AFG', TUR:'TUR', NOR:'NOR', SWE:'SWE', FIN:'FIN', EST:'EST', LVA:'LAT', LTU:'LIT', POL:'POL', HUN:'HUN', BGR:'BUL',
  GRC:'GRE', ALB:'ALB', CHE:'SWI', LUX:'LUX', MEX:'MEX', BRA:'BRA', ARG:'ARG', CHL:'CHL', PER:'PRU', COL:'COL', VEN:'VEN', BOL:'BOL',
  PRY:'PAR', URY:'URG', ECU:'ECU', CUB:'CUB', GTM:'GUA', HND:'HON', SLV:'ELS', NIC:'NIC', CRI:'COS', PAN:'PAN', HTI:'HAI', DOM:'DOM'
};
const SKIP = new Set(['ATA', 'ATF']);

// İl sayısı (modern ülke başına). Formül + elle ayar.
const OVERRIDE = { DEU:9, FRA:10, ITA:7, GBR:5, TUR:8, POL:6, ESP:6, JPN:5, RUS:34, USA:22, CHN:20, CAN:10, BRA:9, AUS:7, IND:9, UKR:6,
  KAZ:4, ROU:4, CZE:2, SVK:1, HUN:2, AUT:2, SWE:4, NOR:4, FIN:4, GRC:3, BGR:2, SRB:2, BLR:3, NLD:2, BEL:1, PRT:2, IRN:4, EGY:3, DZA:5,
  SAU:4, ARG:5, MEX:5, LBY:4, SDN:3, COD:3, IDN:5, PAK:3, MNG:3, ZAF:4, IRQ:2, SYR:2, AFG:2, MAR:2, TUN:1, ETH:3, NGA:3, DNK:1, CHE:1, IRL:1,
  PHL:2, KOR:1, PRK:1, MMR:2, THA:2, VNM:2, GRL:3, CHL:3, PER:3, COL:2, VEN:2, BOL:2, MLI:2, NER:2, TCD:2, AGO:3, MOZ:2, TZA:2, KEN:1, NZL:2,
  ISL:1, EST:1, LVA:1, LTU:1, ALB:1, BIH:1, HRV:1, SVN:1, MKD:1, MNE:1, KOS:1, MDA:1, GEO:1, ARM:1, AZE:1, UZB:2, TKM:2, KGZ:1, TJK:1,
  YEM:1, OMN:1, NAM:2, BWA:1, ZMB:2, ZWE:1, MDG:2, SOM:2, CMR:1, CAF:1, MRT:2, NPL:1, BGD:1, LKA:1, MYS:1, TWN:1, CUB:1, ECU:1, URY:1, PRY:1 };

// Yoğunluk ağırlığı (k-means): batı Rusya, doğu ABD vb. daha sık il
function cellWeight(a3, lon, lat) {
  switch (a3) {
    case 'RUS': return lon < 60 ? 9 : (lat < 56 ? 2 : 1);
    case 'USA': return lon > -100 ? 3 : 1;
    case 'CAN': return lat < 54 ? 6 : 1;
    case 'CHN': return lon > 103 ? 5 : 1;
    case 'BRA': return lon > -52 ? 3 : 1;
    case 'AUS': return (lon > 142 || lat < -30) ? 3 : 1;
    case 'KAZ': return 1;
    default: return 1;
  }
}

// ---------- yardımcılar ----------
const RES = 0.1; // raster derece
const LON0 = -180, LON1 = 192, LAT0 = -60, LAT1 = 84;
const W = Math.round((LON1 - LON0) / RES), H = Math.round((LAT1 - LAT0) / RES);
const toCX = lon => Math.floor((lon - LON0) / RES), toCY = lat => Math.floor((LAT1 - lat) / RES);
const cLon = cx => LON0 + (cx + 0.5) * RES, cLat = cy => LAT1 - (cy + 0.5) * RES;
const K = 10, D2R = Math.PI / 180;
const millerDeg = lat => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * D2R)) / D2R;
const YMAX = millerDeg(84);
const px = lon => +(((lon + 180) * K).toFixed(1));
const py = lat => +(((YMAX - millerDeg(lat)) * K).toFixed(1));

function fillRings(raster, rings, id, cond) {
  // rings: [[ [lon,lat],... ]] even-odd scanline
  let minY = 1e9, maxY = -1e9;
  for (const r of rings) for (const p of r) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  const cy0 = Math.max(0, toCY(maxY)), cy1 = Math.min(H - 1, toCY(minY));
  let n = 0;
  for (let cy = cy0; cy <= cy1; cy++) {
    const y = cLat(cy); const xs = [];
    for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[i], b = r[j];
      if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.ceil((xs[k] - LON0) / RES - 0.5)), x1 = Math.min(W - 1, Math.floor((xs[k + 1] - LON0) / RES - 0.5));
      for (let cx = x0; cx <= x1; cx++) { const idx = cy * W + cx; if (!cond || cond(idx)) { raster[idx] = id; n++; } }
    }
  }
  return n;
}

function getPolys(f) {
  const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const a3 = f.properties.ADM0_A3;
  return polys.map(poly => poly.map(ring => ring.map(([lon, lat]) => {
    if ((a3 === 'RUS' || a3 === 'FJI') && lon < -160) lon += 360;
    return [lon, Math.max(lat, LAT0 + 0.01)];
  })));
}

function ringArea(r) { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return s / 2; }

// Sutherland-Hodgman: keep where (p - m)·d <= 0
function clipHalf(ring, mx, my, dx, dy) {
  const out = []; const n = ring.length; if (!n) return out;
  const f = p => (p[0] - mx) * dx + (p[1] - my) * dy;
  for (let i = 0; i < n; i++) {
    const cur = ring[i], prev = ring[(i + n - 1) % n];
    const fc = f(cur), fp = f(prev);
    if (fc <= 0) { if (fp > 0) { const t = fp / (fp - fc); out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]); } out.push(cur); }
    else if (fp <= 0) { const t = fp / (fp - fc); out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]); }
  }
  return out;
}

// ---------- 1) modern ülke rasteri ----------
const feats = world.features.filter(f => !SKIP.has(f.properties.ADM0_A3));
const craster = new Int16Array(W * H).fill(-1);
feats.forEach((f, i) => { for (const poly of getPolys(f)) fillRings(craster, poly, i); });

// ---------- 2) her ülkeyi illere böl ----------
const provinces = []; // {a3, own, rings:[[lon,lat]...]}
let seedRand = 12345; const rnd = () => (seedRand = (seedRand * 1103515245 + 12345) % 2147483648) / 2147483648;
feats.forEach((f, fi) => {
  const a3 = f.properties.ADM0_A3; const polys = getPolys(f);
  const cells = [];
  for (let idx = 0; idx < craster.length; idx++) if (craster[idx] === fi) cells.push(idx);
  const areaKm = f.properties.area || 0;
  let n = OVERRIDE[a3];
  if (n == null) n = Math.max(1, Math.round(cells.length / 6000));
  n = Math.min(n, Math.max(1, Math.floor(cells.length / 20)));
  const allRings = polys.flat();
  if (n <= 1 || cells.length < 40) { provinces.push({ a3, rings: allRings, fi }); return; }
  let latSum = 0; for (const c of cells) latSum += cLat(Math.floor(c / W)); const cs = Math.cos(latSum / cells.length * D2R);
  // k-means örnekleme
  const pts = []; const step = Math.max(1, Math.floor(cells.length / 6000));
  for (let k = 0; k < cells.length; k += step) { const c = cells[k]; const lon = cLon(c % W), lat = cLat(Math.floor(c / W)); pts.push([lon * cs, lat, cellWeight(a3, lon, lat)]); }
  // k-means++ benzeri başlangıç
  const seeds = [pts[Math.floor(rnd() * pts.length)].slice(0, 2)];
  while (seeds.length < n) {
    let best = null, bd = -1;
    for (let t = 0; t < 40; t++) { const p = pts[Math.floor(rnd() * pts.length)]; let dm = 1e18; for (const s of seeds) dm = Math.min(dm, (p[0] - s[0]) ** 2 + (p[1] - s[1]) ** 2); dm *= p[2]; if (dm > bd) { bd = dm; best = p; } }
    seeds.push(best.slice(0, 2));
  }
  for (let it = 0; it < 25; it++) {
    const acc = seeds.map(() => [0, 0, 0]);
    for (const p of pts) { let bi = 0, bd = 1e18; for (let s = 0; s < n; s++) { const d = (p[0] - seeds[s][0]) ** 2 + (p[1] - seeds[s][1]) ** 2; if (d < bd) { bd = d; bi = s; } } acc[bi][0] += p[0] * p[2]; acc[bi][1] += p[1] * p[2]; acc[bi][2] += p[2]; }
    for (let s = 0; s < n; s++) if (acc[s][2] > 0) seeds[s] = [acc[s][0] / acc[s][2], acc[s][1] / acc[s][2]];
  }
  for (let s = 0; s < n; s++) {
    const rings = [];
    for (const ring of allRings) {
      let r = ring.map(p => [p[0] * cs, p[1]]);
      for (let t = 0; t < n && r.length; t++) {
        if (t === s) continue;
        const mx = (seeds[s][0] + seeds[t][0]) / 2, my = (seeds[s][1] + seeds[t][1]) / 2;
        r = clipHalf(r, mx, my, seeds[t][0] - seeds[s][0], seeds[t][1] - seeds[s][1]);
      }
      if (r.length >= 3) { const back = r.map(p => [p[0] / cs, p[1]]); if (Math.abs(ringArea(back)) > 1e-4) rings.push(back); }
    }
    if (rings.length) provinces.push({ a3, rings, fi });
  }
});

// ---------- 3) il rasteri ----------
const praster = new Int16Array(W * H).fill(-1);
provinces.forEach((p, i) => { p.id = i; p.cells = fillRings(praster, p.rings, i); });
// rasterde hücresi olmayan çok küçük adalar: en yakın hücreyi işaretle
provinces.forEach(p => {
  if (p.cells > 0) return;
  const r = p.rings[0]; let sx = 0, sy = 0; for (const q of r) { sx += q[0]; sy += q[1]; }
  const idx = toCY(sy / r.length) * W + toCX(sx / r.length); praster[idx] = p.id; p.cells = 1;
});
// İstatistik: hücreler, merkez
const stats = provinces.map(() => ({ n: 0, sx: 0, sy: 0, wsum: 0 }));
for (let idx = 0; idx < praster.length; idx++) { const id = praster[idx]; if (id < 0) continue; const s = stats[id]; const lat = cLat(Math.floor(idx / W)); s.n++; s.sx += cLon(idx % W); s.sy += lat; s.wsum += Math.cos(lat * D2R); }
provinces.forEach((p, i) => { const s = stats[i]; p.n = s.n; p.areaKm = Math.round(s.wsum * (RES * 111.32) ** 2); p.mlon = s.n ? s.sx / s.n : p.rings[0][0][0]; p.mlat = s.n ? s.sy / s.n : p.rings[0][0][1]; });
// etiket noktası: merkezine en yakın kendi hücresi
{
  const best = provinces.map(() => [1e18, -1]);
  for (let idx = 0; idx < praster.length; idx++) { const id = praster[idx]; if (id < 0) continue; const p = provinces[id]; const d = (cLon(idx % W) - p.mlon) ** 2 + (cLat(Math.floor(idx / W)) - p.mlat) ** 2; if (d < best[id][0]) best[id] = [d, idx]; }
  provinces.forEach((p, i) => { const idx = best[i][1]; if (idx >= 0) { p.lon = cLon(idx % W); p.lat = cLat(Math.floor(idx / W)); } else { p.lon = p.mlon; p.lat = p.mlat; } });
}

// ---------- 4) komşuluk ----------
const adjMap = new Map();
const addAdj = (a, b, fl) => { if (a === b || a < 0 || b < 0) return; const k = a < b ? a * 10000 + b : b * 10000 + a; adjMap.set(k, (adjMap.get(k) || 0) | fl); };
const coastal = new Uint8Array(provinces.length);
for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
  const idx = cy * W + cx, a = praster[idx]; if (a < 0) continue;
  if (cx + 1 < W) { const b = praster[idx + 1]; if (b >= 0 && b !== a) addAdj(a, b, 1); if (b < 0) coastal[a] = 1; }
  if (cy + 1 < H) { const b = praster[idx + W]; if (b >= 0 && b !== a) addAdj(a, b, 1); if (b < 0) coastal[a] = 1; }
  if (cx > 0 && praster[idx - 1] < 0) coastal[a] = 1; if (cy > 0 && praster[idx - W] < 0) coastal[a] = 1;
}
// boğaz bağlantıları (deniz üzerinden <= ~0.6°)
const SR = 6;
for (let cy = 0; cy < H; cy += 1) for (let cx = 0; cx < W; cx += 1) {
  const idx = cy * W + cx, a = praster[idx]; if (a < 0 || !coastal[a]) continue;
  // sadece kıyı hücreleri
  if (!((cx + 1 < W && praster[idx + 1] < 0) || (cx > 0 && praster[idx - 1] < 0) || (cy + 1 < H && praster[idx + W] < 0) || (cy > 0 && praster[idx - W] < 0))) continue;
  for (let dy = -SR; dy <= SR; dy += 2) for (let dx = -SR; dx <= SR; dx += 2) {
    if (dx * dx + dy * dy > SR * SR) continue; const y = cy + dy, x = cx + dx; if (y < 0 || y >= H || x < 0 || x >= W) continue;
    const b = praster[y * W + x]; if (b < 0 || b === a) continue;
    const k = a < b ? a * 10000 + b : b * 10000 + a; if (!adjMap.has(k)) adjMap.set(k, 2); else if (!(adjMap.get(k) & 1)) adjMap.set(k, adjMap.get(k) | 2);
  }
}
// Elle eklenen boğazlar / kanallar (lon,lat çiftleri)
const MANUAL_LINKS = [
  [[-5.6, 36.1], [-5.6, 35.6]], // Cebelitarık
  [[1.5, 51.0], [1.8, 50.8]],   // Manş (Dover)
  [[12.5, 55.7], [13.0, 55.6]], // Öresund
  [[15.6, 38.2], [15.6, 38.0]], // Messina
  [[140.6, 41.4], [140.6, 41.7]], // Tsugaru
  [[130.9, 33.9], [131.0, 34.0]], // Kanmon
  [[79.5, 9.3], [80.0, 9.5]],   // Palk
  [[142.0, 46.0], [141.9, 45.4]], // La Perouse
  [[32.5, 30.6], [32.4, 30.0]], // Süveyş
  [[-79.6, 9.1], [-79.5, 9.0]], // Panama
  [[9.5, 41.3], [9.2, 41.3]], // Bonifacio
];
const findProv = (lon, lat) => {
  for (let r = 0; r < 25; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const idx = (toCY(lat) + dy) * W + toCX(lon) + dx; if (idx >= 0 && idx < praster.length && praster[idx] >= 0) return praster[idx];
  }
  return -1;
};
for (const [p, q] of MANUAL_LINKS) { const a = findProv(...p), b = findProv(...q); if (a >= 0 && b >= 0 && a !== b) { const k = a < b ? a * 10000 + b : b * 10000 + a; if (!(adjMap.get(k) & 1)) adjMap.set(k, (adjMap.get(k) || 0) | 2); } }

// nehir geçişleri
const rivSegs = [];
for (const f of rivers.features) {
  if (f.properties.scalerank > 3) continue;
  const g = f.geometry; const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
  for (const l of lines) for (let i = 1; i < l.length; i++) rivSegs.push([l[i - 1][0], l[i - 1][1], l[i][0], l[i][1]]);
}
function segX(a, b, c, d) { // a,b,c,d [x,y]
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}
const adj = [];
for (const [k, fl] of adjMap) {
  const a = Math.floor(k / 10000), b = k % 10000; let flags = fl;
  if (fl & 1) {
    const A = [provinces[a].lon, provinces[a].lat], B = [provinces[b].lon, provinces[b].lat];
    for (const s of rivSegs) { if (Math.max(s[0], s[2]) < Math.min(A[0], B[0]) || Math.min(s[0], s[2]) > Math.max(A[0], B[0]) || Math.max(s[1], s[3]) < Math.min(A[1], B[1]) || Math.min(s[1], s[3]) > Math.max(A[1], B[1])) continue; if (segX(A, B, [s[0], s[1]], [s[2], s[3]])) { flags |= 4; break; } }
  }
  adj.push([a, b, flags]);
}

// ---------- 5) deniz bölgeleri ----------
const SEAS = [
  ['Kuzey Denizi', 3, 56], ['Baltık Denizi', 19, 57], ['Bothnia Körfezi', 20, 62], ['Norveç Denizi', 5, 67], ['Barents Denizi', 40, 73], ['Kara Denizi', 70, 75],
  ['Laptev Denizi', 125, 76], ['Doğu Sibirya Denizi', 165, 73], ['Beaufort Denizi', -140, 72], ['Kanada Arktik', -95, 76], ['Hudson Körfezi', -85, 60], ['Baffin Körfezi', -65, 72],
  ['Grönland Denizi', -10, 72], ['Danimarka Boğazı', -30, 64], ['Kuzey Atlantik', -35, 50], ['Biskay Körfezi', -6, 46], ['Manş Denizi', -3, 50], ['İrlanda Denizi', -9, 54],
  ['Batı Akdeniz', 4, 39], ['Tiren Denizi', 12, 40], ['Adriyatik', 15.5, 43], ['İyon Denizi', 18, 36], ['Ege Denizi', 25, 38.5], ['Doğu Akdeniz', 31, 33.5], ['Karadeniz', 34, 43.5], ['Hazar Denizi', 51, 42],
  ['Kızıldeniz', 38, 20], ['Aden Körfezi', 48, 12.5], ['Basra Körfezi', 51, 27], ['Arap Denizi', 63, 15], ['Bengal Körfezi', 88, 14], ['Batı Hint Okyanusu', 60, -5], ['Mozambik Kanalı', 41, -18],
  ['Güney Hint Okyanusu', 80, -30], ['Doğu Hint Okyanusu', 100, -10], ['Andaman Denizi', 96, 10], ['Güney Çin Denizi', 113, 13], ['Java Denizi', 112, -5], ['Banda Denizi', 127, -6],
  ['Arafura Denizi', 136, -10], ['Mercan Denizi', 155, -18], ['Tasman Denizi', 160, -38], ['Doğu Çin Denizi', 125, 29], ['Sarı Deniz', 122, 37], ['Japon Denizi', 135, 40],
  ['Okhotsk Denizi', 148, 54], ['Bering Denizi', 180, 58], ['Kuzeybatı Pasifik', 155, 38], ['Filipin Denizi', 133, 18], ['Batı Pasifik', 160, 5], ['Orta Pasifik', -160, 20],
  ['Hawaii Suları', -155, 25], ['Alaska Körfezi', -145, 55], ['Kuzeydoğu Pasifik', -130, 40], ['Doğu Pasifik', -110, 10], ['Güneydoğu Pasifik', -90, -30], ['Güney Pasifik', -150, -25],
  ['Meksika Körfezi', -90, 25], ['Karayipler', -75, 15], ['Batı Atlantik', -65, 32], ['Orta Atlantik', -35, 25], ['Gine Körfezi', 2, 1], ['Güney Atlantik', -15, -20],
  ['Brezilya Kıyıları', -32, -10], ['Arjantin Denizi', -55, -45], ['Ümit Burnu', 15, -38], ['Kanarya Suları', -20, 28], ['Labrador Denizi', -55, 58], ['St. Lawrence Körfezi', -61, 48]
];
// Okyanus hücrelerini en yakın merkeze ata (kaba ızgara 0.5°)
const SR2 = 5; // her 5 hücre = 0.5°
const SW = Math.ceil(W / SR2), SH = Math.ceil(H / SR2);
const sraster = new Int16Array(SW * SH).fill(-1);
const seaXY = SEAS.map(([, lon, lat]) => [lon < -170 && false ? lon + 360 : lon, lat]);
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  const cx = x * SR2 + 2, cy = y * SR2 + 2; if (cx >= W || cy >= H) continue;
  // kara mı?
  let land = 0; for (let dy = 0; dy < SR2; dy += 2) for (let dx = 0; dx < SR2; dx += 2) { const i = (y * SR2 + dy) * W + x * SR2 + dx; if (i < praster.length && praster[i] >= 0) land++; }
  if (land >= 5) continue;
  const lon = cLon(cx), lat = cLat(cy); let bi = -1, bd = 1e18;
  for (let s = 0; s < seaXY.length; s++) {
    let dlon = Math.abs(lon - seaXY[s][0]); if (dlon > 180) dlon = 360 - dlon;
    const d = (dlon * Math.cos((lat + seaXY[s][1]) / 2 * D2R)) ** 2 + (lat - seaXY[s][1]) ** 2; if (d < bd) { bd = d; bi = s; }
  }
  sraster[y * SW + x] = bi;
}
// Hazar'ı izole et: sadece Hazar merkezine yakın hücreler (zaten öyle)
const seaAdj = new Set(); const provSea = provinces.map(() => new Set());
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  const s = sraster[y * SW + x]; if (s < 0) continue;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) { const xx = (x + dx + SW) % SW, yy = y + dy; if (yy >= SH) continue; const t = sraster[yy * SW + xx]; if (t >= 0 && t !== s) seaAdj.add(Math.min(s, t) * 1000 + Math.max(s, t)); }
  // komşu kara illeri
  for (let dy = -1; dy <= SR2; dy++) for (let dx = -1; dx <= SR2; dx++) { const cx = x * SR2 + dx, cy = y * SR2 + dy; if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue; const p = praster[cy * W + cx]; if (p >= 0 && coastal[p]) provSea[p].add(s); }
}
// Hazar Denizi ile diğer denizler arasında bağlantı olmasın
const HAZ = SEAS.findIndex(s => s[0] === 'Hazar Denizi');
const seaAdjArr = [...seaAdj].map(k => [Math.floor(k / 1000), k % 1000]).filter(([a, b]) => a !== HAZ && b !== HAZ);
// Kıyı ama denize bağlanmamış iller için en yakın deniz
provinces.forEach((p, i) => { if (coastal[i] && provSea[i].size === 0) { let bi = -1, bd = 1e18; SEAS.forEach((s, k) => { const d = (s[1] - p.lon) ** 2 + (s[2] - p.lat) ** 2; if (d < bd) { bd = d; bi = k; } }); provSea[i].add(bi); } });
// Deniz merkezleri gerçekten o bölgenin ağırlık merkezine yakın olsun
const seaCent = SEAS.map(() => [0, 0, 0]);
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const s = sraster[y * SW + x]; if (s < 0) continue; let dl = cLon(x * SR2 + 2) - SEAS[s][1]; while (dl > 180) dl -= 360; while (dl < -180) dl += 360; seaCent[s][0] += dl; seaCent[s][1] += cLat(y * SR2 + 2); seaCent[s][2]++; }

// ---------- 6) şehirler, isimler, zafer puanı ----------
const cityBy = provinces.map(() => []);
for (const f of places.features) {
  const q = f.properties; let lon = q.longitude, lat = q.latitude; if (lon < -160 && (q.adm0_a3 === 'RUS')) lon += 360;
  const cx = toCX(lon), cy = toCY(lat); if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
  let id = praster[cy * W + cx]; if (id < 0) id = findProv(lon, lat); if (id < 0) continue;
  cityBy[id].push({ n: q.name, pop: q.pop_max || 0, cap: q.adm0cap ? 1 : 0, a3: q.adm0_a3 });
}
const nameTR = {}; feats.forEach(f => nameTR[f.properties.ADM0_A3] = f.properties.NAME_TR);
const CITY_TR = { 'Moscow':'Moskova', 'Saint Petersburg':'Leningrad', 'St. Petersburg':'Leningrad', 'Volgograd':'Stalingrad', 'Kiev':'Kiev', 'Kyiv':'Kiev', 'Rome':'Roma', 'Vienna':'Viyana', 'Warsaw':'Varşova', 'Athens':'Atina',
  'Istanbul':'İstanbul', 'İstanbul':'İstanbul', 'Izmir':'İzmir', 'İzmir':'İzmir', 'Belgrade':'Belgrad', 'Bucharest':'Bükreş', 'Prague':'Prag', 'Cologne':'Köln', 'Munich':'Münih', 'Nuremberg':'Nürnberg', 'Lisbon':'Lizbon', 'Copenhagen':'Kopenhag',
  'Brussels':'Brüksel', 'The Hague':'Lahey', 'Geneva':'Cenevre', 'Venice':'Venedik', 'Naples':'Napoli', 'Milan':'Milano', 'Turin':'Torino', 'Florence':'Floransa', 'Algiers':'Cezayir', 'Tunis':'Tunus', 'Cairo':'Kahire', 'Alexandria':'İskenderiye',
  'Jerusalem':'Kudüs', 'Damascus':'Şam', 'Baghdad':'Bağdat', 'Tehran':'Tahran', 'Beijing':'Pekin', 'Peking':'Pekin', 'Shenyang':'Mukden', 'Nizhny Novgorod':'Gorki', 'Samara':'Kuybışev', 'Yekaterinburg':'Sverdlovsk', 'Tbilisi':'Tiflis', 'Mumbai':'Bombay', 'Kolkata':'Kalküta', 'Chennai':'Madras',
  'Ho Chi Minh City':'Saygon', 'Jakarta':'Batavya', 'Tokyo':'Tokyo', 'Seoul':'Keijo (Seul)', 'Taipei':'Taihoku (Taipei)', 'Mexico City':'Meksiko', 'Thessaloniki':'Selanik', 'Sofia':'Sofya', 'Edirne':'Edirne', 'Tirana':'Tiran', 'Kaliningrad':'Königsberg', 'Gdansk':'Danzig', 'Wroclaw':'Breslau', 'Lviv':'Lvov' };
const trCity = n => CITY_TR[n] || n;
const DIRS = ['Kuzey', 'Kuzeydoğu', 'Doğu', 'Güneydoğu', 'Güney', 'Güneybatı', 'Batı', 'Kuzeybatı'];
// ülke merkezleri
const ctryCent = {}; provinces.forEach(p => { const c = ctryCent[p.a3] || (ctryCent[p.a3] = [0, 0, 0]); c[0] += p.lon * p.n; c[1] += p.lat * p.n; c[2] += p.n; });
const usedNames = {};
provinces.forEach((p, i) => {
  const cities = cityBy[i].sort((a, b) => (b.cap - a.cap) * 1e9 + b.pop - a.pop);
  p.cities = cities.slice(0, 3);
  let name;
  const cnt = provinces.filter(q => q.a3 === p.a3).length;
  if (cities.length && cnt > 1) name = trCity(cities[0].n);
  else if (cnt === 1) name = nameTR[p.a3];
  else { const c = ctryCent[p.a3]; const ang = Math.atan2(p.lat - c[1] / c[2], (p.lon - c[0] / c[2]) * Math.cos(p.lat * D2R)); const di = (Math.round((Math.PI / 2 - ang) / (Math.PI / 4)) + 16) % 8; name = nameTR[p.a3] + ' (' + DIRS[di] + ')'; }
  if (usedNames[name]) { usedNames[name]++; name = name + ' ' + usedNames[name]; } else usedNames[name] = 1;
  p.name = name;
  // VP
  let vp = 0; for (const c of cities) { const pop = c.pop; vp = Math.max(vp, pop > 8e6 ? 8 : pop > 4e6 ? 5 : pop > 2e6 ? 3 : pop > 8e5 ? 2 : 1); }
  if (cities.some(c => c.cap && c.a3 === p.a3)) { p.capitalCity = true; vp += 5; }
  p.vp = vp || 1; p.pop = cities.reduce((s, c) => s + c.pop, 0);
});

// ---------- 7) arazi ----------
function inBox(lon, lat, b) { return lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3]; }
const MOUNT = [[5.5, 44, 16, 47.8], [19, 47.5, 26.5, 49.7], [41, 39, 50, 43.6], [36, 37, 45, 41], [60, 27, 103, 40], [93, 23, 105, 34], [-125, 32, 104 - 210, 58], [-80, -40, -66, 8], [-73, -56, -68, -40],
  [70, 34, 80, 42], [87, 42, 96, 50], [-8, 30, 0, 35], [19, 40, 23.5, 44.5], [13, 40.5, 16.5, 43.5], [-1, 42, 3, 43.3], [5, 59, 12, 70], [36, 9, 41, 15], [44, 32, 60, 38], [66, 30, 72, 37], [-110, 18, -98, 25], [127, 34, 129.5, 42], [104, 26, 112, 33]];
const DESERT = [[-17, 15, 33, 31], [33, 15, 60, 31], [60, 24, 70, 31], [52, 36, 66, 45], [90, 37, 120, 46], [76, 36, 92, 41], [120, -32, 143, -18], [114, -30, 130, -20], [12, -28, 20, -18], [-75, -28, -68, -15], [-118, 28, -108, 37]];
const JUNGLE = [[-80, -15, -45, 8], [8, -8, 31, 6], [-12, 4, 8, 10], [95, -9, 125, 8], [125, -10, 152, 2], [-92, 7, -77, 18], [97, 10, 110, 22]];
const MARSH = [[24, 51, 30.5, 53]];
const terrainOf = (lon, lat) => {
  if (MARSH.some(b => inBox(lon, lat, b))) return 'marsh';
  if (MOUNT.some(b => inBox(lon, lat, b))) return 'mountain';
  if (DESERT.some(b => inBox(lon, lat, b))) return 'desert';
  if (JUNGLE.some(b => inBox(lon, lat, b))) return 'jungle';
  if (lat > 55 && lat < 68 && !(lon > -10 && lon < 40 && lat < 58)) return 'forest';
  if (lat > 68) return 'tundra';
  if (lat > 45 && lat <= 55 && lon > 85 && lon < 140) return 'forest';
  if (lat > 44 && lat < 55 && lon > -95 && lon < -60) return 'forest';
  if (lat > 40 && lat < 48 && lon > 0 && lon < 30 && Math.abs(Math.sin(lon * 7 + lat * 3)) > 0.75) return 'hills';
  return 'plains';
};
provinces.forEach(p => { p.terrain = terrainOf(p.lon, p.lat); if (p.pop > 3e6) p.terrain = 'urban'; });

// ---------- 8) 1936 sahiplik ----------
provinces.forEach(p => {
  let o = OWN[p.a3]; if (!o) { o = p.a3; console.warn('sahipsiz', p.a3); }
  if (p.a3 === 'CHN' && p.lat > 40.5 && p.lon > 117) o = 'MAN';
  p.own = o;
});

// ---------- 9) kenar çizgileri ----------
const OFF = 0.1;
const sample = (lon, lat) => { const cx = toCX(lon), cy = toCY(lat); if (cx < 0 || cy < 0 || cx >= W || cy >= H) return -1; return praster[cy * W + cx]; };
const edges = []; // [a,b,[x,y,...]]
provinces.forEach((p, i) => {
  for (const r of p.rings) {
    let cur = null;
    const n = r.length;
    for (let k = 0; k < n; k++) {
      const A = r[k], B = r[(k + 1) % n];
      const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy); if (len < 1e-9) continue;
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, nx = -dy / len * OFF, ny = dx / len * OFF;
      const s1 = sample(mx + nx, my + ny), s2 = sample(mx - nx, my - ny);
      let other;
      if (s1 === i && s2 !== i) other = s2; else if (s2 === i && s1 !== i) other = s1; else if (s1 === i && s2 === i) other = -3; else other = -2; // -2: köprü/gürültü
      if (other === -2 || other === -3) {
        // ince arazi: kıyı say (s1/s2 ikisi de deniz ise ve segment ülke kenarında)
        if (s1 < 0 && s2 < 0 && len < 3) other = -1; else { cur = null; continue; }
      }
      if (other >= 0 && other < i) { cur = null; continue; } // diğer il çizecek
      if (cur && cur[1] === other) { cur[2].push(px(B[0]), py(B[1])); }
      else { cur = [i, other, [px(A[0]), py(A[1]), px(B[0]), py(B[1])]]; edges.push(cur); }
    }
  }
});

// ---------- 10) çıktı ----------
const out = {
  v: 1, w: px(LON1), h: py(LAT0),
  provs: provinces.map(p => ({
    n: p.name, o: p.own, m: p.a3, x: px(p.lon), y: py(p.lat), lon: +p.lon.toFixed(2), lat: +p.lat.toFixed(2), t: p.terrain,
    c: coastal[p.id] ? 1 : 0, vp: p.vp, km: p.areaKm, pop: Math.round(p.pop / 1000), cap: p.capitalCity ? 1 : 0,
    s: [...provSea[p.id]],
    r: p.rings.map(r => { const a = []; for (const q of r) a.push(px(q[0]), py(q[1])); return a; })
  })),
  adj, edges,
  seas: SEAS.map(([n, lon, lat], i) => { const c = seaCent[i]; let L0 = c[2] ? lon + c[0] / c[2] : lon; const A0 = c[2] ? c[1] / c[2] : lat; if (L0 < -180) L0 += 360; if (L0 > 185) L0 -= 360; return { n, x: px(lon), y: py(lat), cx: px(L0), cy: py(A0) }; }),
  seaAdj: seaAdjArr
};
fs.writeFileSync(path.join(D, 'world.json'), JSON.stringify(out));
const owners = {}; provinces.forEach(p => owners[p.own] = (owners[p.own] || 0) + 1);
console.log('il:', provinces.length, 'komşuluk:', adj.length, 'kenar:', edges.length, 'boyut KB:', Math.round(fs.statSync(path.join(D, 'world.json')).size / 1024));
console.log('nehir:', adj.filter(a => a[2] & 4).length, 'boğaz:', adj.filter(a => (a[2] & 3) === 2).length);
console.log(Object.entries(owners).sort((a, b) => b[1] - a[1]).map(e => e.join(':')).join(' '));
const isolated = provinces.filter((p, i) => !adj.some(a => a[0] === i || a[1] === i)).map(p => p.name + '/' + p.own);
console.log('izole:', isolated.length, isolated.join(', '));
