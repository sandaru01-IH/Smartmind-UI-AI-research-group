import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';

config({ path: '.env.local', quiet: true });

const ROOT = path.resolve(import.meta.dirname, '../..');
const CLIENT_CODE = ['app', 'components', 'lib', 'content', 'proxy.ts'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe('service-role key hygiene', () => {
  it('is never referenced from app, components, lib, content or the proxy', () => {
    const files = CLIENT_CODE.flatMap((p) => {
      const full = path.join(ROOT, p);
      if (!existsSync(full)) return [];
      return statSync(full).isDirectory() ? walk(full) : [full];
    }).filter((f) => /\.(ts|tsx|mjs|js|css)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
    const offenders = files.filter((f) => /SERVICE_ROLE|service_role/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it('is not in any committed file', () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) return;
    const tracked = ['README.md', '.env.example', 'docs', 'supabase/config.toml', 'package.json', 'scripts'].flatMap((p) => {
      const full = path.join(ROOT, p);
      if (!existsSync(full)) return [];
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
    const offenders = tracked.filter((f) => !f.endsWith('.png') && readFileSync(f, 'utf8').includes(key));
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it('is absent from the client bundle when a build exists', () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const staticDir = path.join(ROOT, '.next', 'static');
    if (!key || !existsSync(staticDir)) return;
    const offenders = walk(staticDir).filter((f) => /\.(js|css|map)$/.test(f) && readFileSync(f, 'utf8').includes(key));
    expect(offenders).toEqual([]);
  });
});
