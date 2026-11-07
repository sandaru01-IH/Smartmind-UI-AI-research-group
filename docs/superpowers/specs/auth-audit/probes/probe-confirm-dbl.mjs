import { chromium } from 'file:///E:/Work/Smartmmind/node_modules/playwright/index.mjs';
import { createClient } from 'file:///E:/Work/Smartmmind/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('E:/Work/Smartmmind/.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]));
const sb = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession:false, autoRefreshToken:false } });
const link = async (addr) => { await new Promise(r=>setTimeout(r,1800)); const q = await (await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent('to:'+addr)}&limit=1`)).json(); const m = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${q.messages[0].ID}`)).json(); const x = /href="([^"]*auth\/confirm[^"]*)"/.exec(m.HTML)[1].replace(/&amp;/g,'&'); return x; };
const b = await chromium.launch();
async function press(url, dbl) {
  const p = await b.newPage(); const posts = [];
  p.on('request', r => { if (r.method()==='POST') posts.push(1); });
  await p.goto(url); const btn = p.locator('main button[type=submit]');
  if (dbl) await btn.dblclick(); else await btn.click();
  await p.waitForTimeout(4000);
  const out = { posts: posts.length, finalUrl: p.url().replace('http://localhost:3000',''), text: (await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0,110) };
  await p.close(); return out;
}
// SIGN-UP confirmation
const e1 = `dbl1.${Date.now()}@example.test`; await sb().auth.signUp({ email:e1, password:'AuditPassw0rd!123' });
console.log('signup  single click :', JSON.stringify(await press((await link(e1)).replace(/^https?:\/\/[^/]+/,'http://localhost:3000'), false)));
const e2 = `dbl2.${Date.now()}@example.test`; await sb().auth.signUp({ email:e2, password:'AuditPassw0rd!123' });
console.log('signup  DOUBLE click :', JSON.stringify(await press((await link(e2)).replace(/^https?:\/\/[^/]+/,'http://localhost:3000'), true)));
// RECOVERY
await sb().auth.resetPasswordForEmail('audit.user1@example.test');
console.log('recovery DOUBLE click:', JSON.stringify(await press((await link('audit.user1@example.test')).replace(/^https?:\/\/[^/]+/,'http://localhost:3000'), true)));
await b.close();
