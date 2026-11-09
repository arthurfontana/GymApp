// S03: vercel.json (cache e segurança). A CSP precisa liberar os scripts inline do index.html
// pelo hash; se alguém mexer no script do tema, este teste avisa para atualizar o hash.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ler = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const cfg = JSON.parse(ler('vercel.json'));
const regra = (source) => Object.fromEntries((cfg.headers.find((h) => h.source === source)?.headers ?? []).map((h) => [h.key, h.value]));

describe('vercel.json', () => {
  it('build e saída', () => {
    expect(cfg.buildCommand).toBe('npm run build');
    expect(cfg.outputDirectory).toBe('dist');
  });
  it('cache imutável em /assets e /modelos; shell e service worker sem cache', () => {
    const imut = 'public, max-age=31536000, immutable';
    expect(regra('/assets/(.*)')['Cache-Control']).toBe(imut);
    expect(regra('/modelos/(.*)')['Cache-Control']).toBe(imut);
    for (const s of ['/', '/index.html', '/sw.js']) expect(regra(s)['Cache-Control']).toBe('no-cache');
  });
  it('cabeçalhos de segurança', () => {
    const h = regra('/(.*)');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBeTruthy();
    expect(h['Permissions-Policy']).toContain('camera=()');
  });
  it('a CSP tem o hash de cada script inline do index.html e o connect-src do Supabase', () => {
    const csp = regra('/(.*)')['Content-Security-Policy'];
    const inline = [...ler('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(inline.length).toBe(2);
    for (const js of inline) expect(csp).toContain(`'sha256-${createHash('sha256').update(js).digest('base64')}'`);
    expect(csp).toContain("connect-src 'self' blob: https://*.supabase.co");
    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('https://fonts.gstatic.com');
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
