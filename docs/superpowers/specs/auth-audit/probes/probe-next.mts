import { safeMemberNext } from 'file:///E:/Work/Smartmmind/lib/members/schema.ts';
const cases = ['/\t/evil.com', '/\n/evil.com', '/\r/evil.com', '/%09/evil.com', '/ /evil.com', '/\u0000/evil.com', '/\u200b/evil.com', '/account', '/admin', '//evil.com', '/\evil.com'];
for (const c of cases) console.log(JSON.stringify(c), '->', JSON.stringify(safeMemberNext(c)));
