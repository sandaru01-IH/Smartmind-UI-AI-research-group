import { chromium } from 'file:///E:/Work/Smartmmind/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
let cap = null;
p.on('request', r => { if (r.method()==='POST' && r.headers()['next-action']) cap = { headers: r.headers(), body: r.postDataBuffer() }; });
await p.goto('http://localhost:3000/login');
await p.fill('#email',`race.${Date.now()}@example.test`); await p.fill('#password','nope-nope-nope-1');
await p.click('button[type=submit]'); await p.waitForTimeout(2500);
const { 'content-length': _a, host: _b, cookie: _c, ...headers } = cap.headers;
const N = 24;
const results = await Promise.all(Array.from({ length: N }, async () => {
  const r = await ctx.request.post('http://localhost:3000/login', { headers, data: cap.body });
  const t = await r.text();
  return /Too many attempts/.test(t) ? 'LOCKED' : /do not match/.test(t) ? 'REACHED-SUPABASE' : 'other:' + r.status();
}));
console.log('limit = 8 failures. Of', N, 'parallel wrong-password attempts (same ip+email):', JSON.stringify(results.reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{})));
const after = await ctx.request.post('http://localhost:3000/login', { headers, data: cap.body });
console.log('one more, sequential, afterwards ->', /Too many attempts/.test(await after.text()) ? 'LOCKED' : 'not locked');
await b.close();
