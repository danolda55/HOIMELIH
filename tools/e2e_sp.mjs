import { firefox, chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765';
const BROWSER = process.env.BROWSER === 'chromium' ? chromium : firefox;
const out = process.argv[2] || new URL('../screenshot.png', import.meta.url).pathname;
const b = await BROWSER.launch({env:{...process.env,HTTP_PROXY:'',HTTPS_PROXY:'',http_proxy:'',https_proxy:'',ALL_PROXY:'',all_proxy:''},firefoxUserPrefs:{'network.proxy.type':0}});
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { errs.push(m.type() + ': ' + m.text()); } });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + e.stack));
await p.goto(BASE + '/index.html');
await p.waitForSelector('#loading.hidden', { timeout: 30000, state: 'attached' });
await p.screenshot({ path: './e2e-menu.png' });
await p.click('#btn-sp');
await p.waitForTimeout(800);
await p.click('.cbtn[data-tag="TUR"]');
await p.waitForTimeout(300);
await p.screenshot({ path: './e2e-lobby.png' });
await p.click('#lobby-start');
await p.waitForTimeout(1000);
// yardım modalını kapat
const mb = await p.$('.modal .mbtns button'); if (mb) await mb.click();
await p.keyboard.press('5');
await p.waitForTimeout(6000);
const st = await p.evaluate(() => ({ day: HOIW.state.day, date: document.querySelector('.tb-date')?.textContent, divs: Object.keys(HOIW.state.divs).length }));
console.log('state', JSON.stringify(st));
// paneller
for (const id of ['politics','research','industry','production','army','airnavy','diplomacy','trade','log','menu']) { await p.click(`#leftnav button[data-p="${id}"]`); await p.waitForTimeout(250); if (id==='politics') await p.screenshot({ path: './e2e-p_politics.png' }); if (id==='army') await p.screenshot({ path: './e2e-p_army.png' }); if (id==='diplomacy') await p.screenshot({ path: './e2e-p_dip.png' }); }
await p.click(`#leftnav button[data-p="menu"]`);
await p.keyboard.press('Space');
// bir focus seç, araştırma
await p.evaluate(() => HOIW.send({type:'focus', id:'tur_etatism'}));
// il seç + birlik seç
const cap = await p.evaluate(() => { const c = HOIW.state.countries.TUR; HOIW.renderer.centerOn(c.capital, 2.2); return c.capital; });
await p.waitForTimeout(300);
const r = await p.evaluate(() => HOIW.renderer.unitRects.find(r => r.owner === 'TUR'));
if (r) { await p.mouse.click(r.x + r.w/2, r.y + r.h/2); await p.waitForTimeout(300); }
await p.mouse.move(800, 450);
await p.waitForTimeout(400);
await p.screenshot({ path: out });
await p.keyboard.press('5');
await p.waitForTimeout(8000);
const st2 = await p.evaluate(() => ({ day: HOIW.state.day, date: document.querySelector('.tb-date')?.textContent }));
console.log('state2', JSON.stringify(st2));
console.log('ERRORS', errs.length); errs.slice(0, 20).forEach(e => console.log(e));
await b.close();
if (errs.length) process.exit(1);
