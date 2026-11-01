import { chromium } from 'file:///E:/Work/Smartmmind/node_modules/playwright/index.mjs';
const mails = async (addr) => { await new Promise(r=>setTimeout(r,1500)); const q = await (await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent('to:'+addr)}`)).json(); return q.messages.map(m=>m.Subject); };
const b = await chromium.launch();
async function register(email, { dbl = false } = {}) {
  const p = await b.newPage(); const posts = [];
  p.on('request', r => { if (r.method()==='POST') posts.push(new URL(r.url()).pathname); });
  await p.goto('http://localhost:3000/register');
  await p.fill('#displayName','Probe Person'); await p.fill('#email',email); await p.fill('#password','AuditPassw0rd!123'); await p.check('input[name=acceptTerms]');
  if (dbl) await p.dblclick('button[type=submit]'); else await p.click('button[type=submit]');
  await p.waitForTimeout(3500);
  const text = (await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0,160);
  await p.close(); return { posts, text };
}
const fresh = `reg.${Date.now()}@example.test`;
let r = await register(fresh, { dbl: true });
console.log('A) double-click new address: POSTs =', r.posts.length, '| UI:', r.text); console.log('   mails:', await mails(fresh));
r = await register(fresh);
console.log('B) re-register same unconfirmed address | UI:', r.text); console.log('   mails now:', await mails(fresh));
r = await register('audit.user1@example.test');
console.log('C) register already-CONFIRMED address | UI:', r.text); console.log('   mails to that address:', await mails('audit.user1@example.test'));
await b.close();
