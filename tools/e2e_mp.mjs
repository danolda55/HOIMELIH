import { firefox, chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765';
const BROWSER = process.env.BROWSER === 'chromium' ? chromium : firefox;
const launch = () => BROWSER.launch({env:{...process.env,HTTP_PROXY:'',HTTPS_PROXY:'',http_proxy:'',https_proxy:'',ALL_PROXY:'',all_proxy:''},firefoxUserPrefs:{'network.proxy.type':0, 'media.peerconnection.ice.loopback': true, 'media.peerconnection.ice.obfuscate_host_addresses': false}});
const b1 = await launch(), b2 = await launch();
const errs = [];
const mk = async (b, name) => { const p = await b.newPage({ viewport: { width: 1400, height: 850 } }); p.on('console', m => { if (m.type() === 'error') errs.push(name + ' ' + m.text()); }); p.on('pageerror', e => errs.push(name + ' PAGEERROR ' + e.message)); return p; };
const h = await mk(b1, 'host'), g = await mk(b2, 'guest');
await h.goto(BASE + '/index.html');
await h.waitForSelector('#loading.hidden', { state: 'attached', timeout: 30000 });
await h.fill('#player-name', 'Batu'); await h.dispatchEvent('#player-name', 'change');
await h.click('#btn-host');
await h.waitForFunction(() => HOIW.roomCode && /hazır/.test(HOIW.netStatus), null, { timeout: 30000 }).catch(e => console.log('host room timeout', ''));
const code = await h.evaluate(() => HOIW.roomCode); const status = await h.evaluate(() => HOIW.netStatus);
console.log('room', code, status);
await h.click('.cbtn[data-tag="TUR"]');
await g.goto(BASE + '/index.html?join=' + code);
await g.waitForFunction(() => /bağlanıldı/.test(HOIW.netStatus), null, { timeout: 45000 }).catch(e => console.log('guest connect timeout'));
console.log('guest status:', await g.evaluate(() => HOIW.netStatus));
await g.waitForTimeout(500);
await g.click('.cbtn[data-tag="GER"]');
await h.waitForFunction(() => document.querySelector('#lobby-start') && !document.querySelector('#lobby-start').disabled, null, { timeout: 15000 }).catch(e => console.log('start not enabled'));
await h.screenshot({ path: './e2e-mp_lobby_host.png' });
await h.click('#lobby-start');
await h.waitForTimeout(2000);
console.log('after start errs', errs.join('\n'), await h.evaluate(() => [HOIW.role, !!HOIW.state, document.querySelector('#lobby-start').disabled]));
await g.waitForFunction(() => HOIW.role === 'guest' && HOIW.state && HOIW.state.day >= 0, null, { timeout: 20000 }).catch(e => console.log('guest no state'));
for (const p of [h, g]) { const mb = await p.$('.modal .mbtns button'); if (mb) await mb.click(); }
await h.keyboard.press('3');
await h.waitForTimeout(4000);
const hs = await h.evaluate(() => HOIW.state.day), gs = await g.evaluate(() => HOIW.state.day);
console.log('days host/guest', hs, gs);
// misafir hareket emri
const res = await g.evaluate(async () => { const s = HOIW.state; const d = Object.values(s.divs).find(d => d.o === 'GER'); const adj = (await import('./js/mapdata.js')).MAP.adj[d.p].find(e => s.provs[e.to].c === 'GER'); const r = await HOIW.send({ type: 'move', ids: [d.id], to: adj.to }); return { r, id: d.id, to: adj.to }; });
console.log('guest move', JSON.stringify(res));
await g.waitForTimeout(600);
const hostSees = await h.evaluate(id => HOIW.state.divs[id].path, res.id);
console.log('host sees path', JSON.stringify(hostSees));
// sohbet
await g.click('.tb-chat'); await g.fill('#chat-input', 'Merhaba ev sahibi'); await g.press('#chat-input', 'Enter');
await h.waitForTimeout(800);
console.log('host chat:', await h.evaluate(() => document.getElementById('chat-log').innerText));
// duraklatma isteği
await g.click('.tb-speed button[data-v="0"]'); await h.waitForTimeout(800);
console.log('speed after pauseReq', await h.evaluate(() => HOIW.state.speed));
await g.screenshot({ path: './e2e-mp_guest.png' });
// yeniden bağlanma: misafir sayfasını yenile
await g.reload(); await g.waitForFunction(() => HOIW.role === 'guest' && HOIW.state, null, { timeout: 45000 }).catch(e => console.log('rejoin timeout'));
console.log('after reload guest day', await g.evaluate(() => HOIW.state && HOIW.state.day), 'host day', await h.evaluate(() => HOIW.state.day), 'host net', await h.evaluate(() => HOIW.netLabel));
console.log('ERRORS', errs.length, errs.slice(0, 10).join('\n'));
await b1.close(); await b2.close();
