// Basit, prosedürel bayraklar (tarayıcıda canvas ile çizilir, önbelleğe alınır)
const cache = {};
const H3 = (g, w, h, cols) => cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / cols.length, w, h / cols.length + 1); });
const V3 = (g, w, h, cols) => cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / cols.length, 0, w / cols.length + 1, h); });
const SPECIAL = {
  TUR: (g, w, h) => { g.fillStyle = '#e30a17'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.38, h / 2, h * 0.25, 0, 7); g.fill(); g.fillStyle = '#e30a17'; g.beginPath(); g.arc(w * 0.43, h / 2, h * 0.2, 0, 7); g.fill(); star(g, w * 0.6, h / 2, h * 0.13, '#fff'); },
  GER: (g, w, h) => H3(g, w, h, ['#111', '#fff', '#d00']),
  SOV: (g, w, h) => { g.fillStyle = '#c00'; g.fillRect(0, 0, w, h); star(g, w * 0.2, h * 0.28, h * 0.12, '#ffd700'); },
  USA: (g, w, h) => { for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#fff' : '#b22234'; g.fillRect(0, i * h / 7, w, h / 7 + 1); } g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.42, h * 0.55); },
  ENG: (g, w, h) => { g.fillStyle = '#012169'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = h * 0.22; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); g.strokeStyle = '#c8102e'; g.lineWidth = h * 0.08; g.stroke(); g.fillStyle = '#fff'; g.fillRect(w * 0.4, 0, w * 0.2, h); g.fillRect(0, h * 0.35, w, h * 0.3); g.fillStyle = '#c8102e'; g.fillRect(w * 0.45, 0, w * 0.1, h); g.fillRect(0, h * 0.42, w, h * 0.16); },
  FRA: (g, w, h) => V3(g, w, h, ['#0055a4', '#fff', '#ef4135']),
  ITA: (g, w, h) => V3(g, w, h, ['#009246', '#fff', '#ce2b37']),
  JAP: (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#bc002d'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.3, 0, 7); g.fill(); },
  POL: (g, w, h) => H3(g, w, h, ['#fff', '#dc143c']), ROM: (g, w, h) => V3(g, w, h, ['#002b7f', '#fcd116', '#ce1126']), BEL: (g, w, h) => V3(g, w, h, ['#111', '#fdda24', '#ef3340']),
  HOL: (g, w, h) => H3(g, w, h, ['#ae1c28', '#fff', '#21468b']), HUN: (g, w, h) => H3(g, w, h, ['#ce2939', '#fff', '#477050']), BUL: (g, w, h) => H3(g, w, h, ['#fff', '#00966e', '#d62612']),
  AUS: (g, w, h) => H3(g, w, h, ['#ed2939', '#fff', '#ed2939']), IRE: (g, w, h) => V3(g, w, h, ['#169b62', '#fff', '#ff883e']), EST: (g, w, h) => H3(g, w, h, ['#0072ce', '#111', '#fff']),
  LIT: (g, w, h) => H3(g, w, h, ['#fdb913', '#006a44', '#c1272d']), LAT: (g, w, h) => H3(g, w, h, ['#9e3039', '#fff', '#9e3039']), MEX: (g, w, h) => V3(g, w, h, ['#006847', '#fff', '#ce1126']),
  CHI: (g, w, h) => { g.fillStyle = '#c00'; g.fillRect(0, 0, w, h); g.fillStyle = '#003399'; g.fillRect(0, 0, w / 2, h / 2); star(g, w / 4, h / 4, h * 0.13, '#fff'); },
  SWE: (g, w, h) => { g.fillStyle = '#006aa7'; g.fillRect(0, 0, w, h); g.fillStyle = '#fecc00'; g.fillRect(w * 0.3, 0, w * 0.13, h); g.fillRect(0, h * 0.42, w, h * 0.16); },
  NOR: (g, w, h) => { g.fillStyle = '#ba0c2f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(w * 0.27, 0, w * 0.2, h); g.fillRect(0, h * 0.35, w, h * 0.3); g.fillStyle = '#00205b'; g.fillRect(w * 0.32, 0, w * 0.1, h); g.fillRect(0, h * 0.43, w, h * 0.14); },
  DEN: (g, w, h) => { g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(w * 0.3, 0, w * 0.12, h); g.fillRect(0, h * 0.42, w, h * 0.16); },
  FIN: (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#003580'; g.fillRect(w * 0.3, 0, w * 0.14, h); g.fillRect(0, h * 0.4, w, h * 0.2); },
  SWI: (g, w, h) => { g.fillStyle = '#d52b1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(w * 0.42, h * 0.2, w * 0.16, h * 0.6); g.fillRect(w * 0.3, h * 0.38, w * 0.4, h * 0.24); },
  GRE: (g, w, h) => { for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#fff' : '#0d5eaf'; g.fillRect(0, i * h / 9, w, h / 9 + 1); } g.fillStyle = '#0d5eaf'; g.fillRect(0, 0, w * 0.37, h * 5 / 9); g.fillStyle = '#fff'; g.fillRect(w * 0.15, 0, w * 0.07, h * 5 / 9); g.fillRect(0, h * 0.22, w * 0.37, h * 0.11); },
  SPR: (g, w, h) => H3(g, w, h, ['#c60b1e', '#ffc400', '#6f2d91']), PER: (g, w, h) => H3(g, w, h, ['#239f40', '#fff', '#da0000']), EGY: (g, w, h) => { g.fillStyle = '#0a8d3c'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.45, h / 2, h * 0.25, 0, 7); g.fill(); g.fillStyle = '#0a8d3c'; g.beginPath(); g.arc(w * 0.5, h / 2, h * 0.21, 0, 7); g.fill(); },
  YUG: (g, w, h) => H3(g, w, h, ['#0c4076', '#fff', '#c6363c']), CZE: (g, w, h) => { H3(g, w, h, ['#fff', '#d7141a']); g.fillStyle = '#11457e'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.45, h / 2); g.lineTo(0, h); g.fill(); },
  CAN: (g, w, h) => { g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h); g.fillStyle = '#012169'; g.fillRect(0, 0, w * 0.45, h * 0.5); }, AST: (g, w, h) => { g.fillStyle = '#012169'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8102e'; g.fillRect(0, 0, w * 0.45, h * 0.5); star(g, w * 0.7, h * 0.6, h * 0.12, '#fff'); },
  RAJ: (g, w, h) => { g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h); g.fillStyle = '#012169'; g.fillRect(0, 0, w * 0.45, h * 0.5); g.fillStyle = '#ffd700'; g.beginPath(); g.arc(w * 0.72, h * 0.62, h * 0.15, 0, 7); g.fill(); }
};
function star(g, cx, cy, r, col) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.45 : r; g.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } g.closePath(); g.fill(); }
export function flagURL(tag, color) {
  if (cache[tag]) return cache[tag];
  const c = document.createElement('canvas'); c.width = 48; c.height = 32; const g = c.getContext('2d');
  if (SPECIAL[tag]) SPECIAL[tag](g, 48, 32);
  else { g.fillStyle = color || '#777'; g.fillRect(0, 0, 48, 32); g.fillStyle = 'rgba(255,255,255,0.85)'; const v = tag.charCodeAt(0) % 3; if (v === 0) g.fillRect(0, 11, 48, 10); else if (v === 1) g.fillRect(16, 0, 16, 32); else star(g, 24, 16, 9, 'rgba(255,255,255,0.9)'); }
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2; g.strokeRect(1, 1, 46, 30);
  return (cache[tag] = c.toDataURL());
}
