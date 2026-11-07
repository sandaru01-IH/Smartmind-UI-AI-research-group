import { createClient } from 'file:///E:/Work/Smartmmind/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('E:/Work/Smartmmind/.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]));
const mk = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `otp.${Date.now()}@example.test`;
const { data, error } = await mk().auth.signUp({ email, password: 'AuditPassw0rd!123', options: { data: { display_name: 'Otp Probe' } } });
console.log('signUp session?', !!data.session, 'err:', error?.message);
await new Promise(r => setTimeout(r, 1500));
const q = await (await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent('to:'+email)}`)).json();
const msg = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${q.messages[0].ID}`)).json();
const m = /token_hash=([^&"]+)&(?:amp;)?type=(\w+)/.exec(msg.HTML);
console.log('link type in email =', m?.[2]);
const th = m[1];
for (const k of ['recovery','magiclink','email']) { const r = await mk().auth.verifyOtp({ type: k, token_hash: th }); console.log('wrong-type', k, '->', r.error?.message ?? 'OK(!)'); }
const ok = await mk().auth.verifyOtp({ type: 'signup', token_hash: th });
console.log('correct type after failures ->', ok.error?.message ?? 'OK (token survived failed attempts)');
const again = await mk().auth.verifyOtp({ type: 'signup', token_hash: th });
console.log('second use ->', again.error?.status, again.error?.code, '|', again.error?.message);
