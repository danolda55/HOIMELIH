// Statik harita verisi (data/world.json) -> çalışma zamanı yapıları
import { haversine } from './util.js';
export const MAP = { ready: false };

export function initMap(w) {
  MAP.w = w.w; MAP.h = w.h; MAP.raw = w;
  MAP.provs = w.provs.map((p, i) => ({ id: i, name: p.n, owner0: p.o, modern: p.m, x: p.x, y: p.y, lon: p.lon, lat: p.lat, terrain: p.t, coastal: !!p.c, vp: p.vp, km: p.km, pop: p.pop, capCity: !!p.cap, seas: p.s, rings: p.r }));
  MAP.N = MAP.provs.length;
  MAP.adj = MAP.provs.map(() => []);
  for (const [a, b, f] of w.adj) {
    const A = MAP.provs[a], B = MAP.provs[b];
    const dist = Math.max(60, haversine(A.lon, A.lat, B.lon, B.lat));
    MAP.adj[a].push({ to: b, f, dist }); MAP.adj[b].push({ to: a, f, dist });
  }
  MAP.adjSet = MAP.adj.map(l => new Set(l.map(e => e.to)));
  MAP.edge = (a, b) => MAP.adj[a].find(e => e.to === b);
  MAP.seas = w.seas.map((s, i) => ({ id: i, name: s.n, x: s.cx, y: s.cy }));
  MAP.seaAdj = MAP.seas.map(() => []);
  for (const [a, b] of w.seaAdj) { MAP.seaAdj[a].push(b); MAP.seaAdj[b].push(a); }
  MAP.seaProvs = MAP.seas.map(() => []);
  MAP.provs.forEach(p => p.seas.forEach(s => MAP.seaProvs[s].push(p.id)));
  MAP.edges = w.edges;
  // bbox
  MAP.provs.forEach(p => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const r of p.rings) for (let i = 0; i < r.length; i += 2) { if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i]; if (r[i + 1] < y0) y0 = r[i + 1]; if (r[i + 1] > y1) y1 = r[i + 1]; } p.bb = [x0, y0, x1, y1]; });
  // 2 adım komşuluk (hava kapsaması)
  MAP.near2 = MAP.provs.map((p, i) => { const s = new Set([i]); for (const e of MAP.adj[i]) { s.add(e.to); for (const e2 of MAP.adj[e.to]) s.add(e2.to); } return [...s]; });
  MAP.ready = true;
  return MAP;
}

// İki ilin deniz yoluyla bağlanıp bağlanmadığı (ortak ya da komşu deniz bölgesi)
export function seaLink(a, b) {
  const A = MAP.provs[a], B = MAP.provs[b]; if (!A.coastal || !B.coastal) return -1;
  for (const z of A.seas) if (B.seas.includes(z)) return z;
  for (const z of A.seas) for (const n of MAP.seaAdj[z]) if (B.seas.includes(n)) return n;
  // iki adım
  for (const z of A.seas) for (const n of MAP.seaAdj[z]) for (const m of MAP.seaAdj[n]) if (B.seas.includes(m)) return m;
  return -1;
}
