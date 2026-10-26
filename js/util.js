// Genel yardımcılar (DOM bağımsız)
export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const START = Date.UTC(1936, 0, 1);
export function dayToDate(day) { return new Date(START + day * 86400000); }
export function dateToDay(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - START) / 86400000); }
export function fmtDate(day) { const d = dayToDate(day); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
export function yearOf(day) { return dayToDate(day).getUTCFullYear() + dayToDate(day).getUTCMonth() / 12; }
export function parseDay(s) { const [y, m, d] = s.split('-').map(Number); return dateToDay(y, m, d); }
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const fmt = (n, d = 0) => { if (n == null || isNaN(n)) return '0'; const a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (a >= 1e4) return (n / 1e3).toFixed(0) + 'B'; return n.toFixed(d); };
export const pct = v => Math.round(v * 100) + '%';
export function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function haversine(lon1, lat1, lon2, lat2) {
  const R = 6371, r = Math.PI / 180; const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// Basit ikili yığın (Dijkstra için)
export class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const rnd = Math.random;
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function randCode(n = 5) { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < n; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
