import { chromium } from 'file:///E:/Work/Smartmmind/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage();
const reqs = [];
p.on('request', (r) => { const u = r.url(); if (!u.includes('_next/static') && !u.includes('/__nextjs')) reqs.push(r.method() + ' ' + u.replace('http://localhost:3000', '')); });
// next value contains a real TAB: browsers strip it, turning "/\t/evil.example" into "//evil.example"
await p.goto('http://localhost:3000/login?next=' + encodeURIComponent('/\t/evil.example/pwn'));
const hidden = await p.locator('input[name=next]').inputValue();
console.log('hidden next =', JSON.stringify(hidden));
await p.fill('#email', 'audit.user1@example.test');
await p.fill('#password', 'AuditPassw0rd!123');
await p.route('http://evil.example/**', (r) => r.fulfill({ status: 200, body: 'EVIL SITE REACHED' }));
await p.route('https://evil.example/**', (r) => r.fulfill({ status: 200, body: 'EVIL SITE REACHED' }));
await p.click('button[type=submit]');
await p.waitForTimeout(5000);
console.log('final url =', p.url());
console.log(reqs.join('\n'));
await b.close();
