// S03: PWA instalável (manifest, ícones, metas do iOS) e service worker no ar.
import { test as base, expect } from '@playwright/test';

const test = base.extend({});
test.use({ serviceWorkers: 'allow' });

test('manifest, ícones e metas do iOS', async ({ page, request }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const m = await (await request.get(href)).json();
  expect(m).toMatchObject({ name: 'Meu Treino 3D', short_name: 'Meu Treino', display: 'standalone', start_url: '/' });
  const tam = m.icons.map((i) => i.sizes + (i.purpose ? ':' + i.purpose : ''));
  expect(tam).toEqual(expect.arrayContaining(['192x192', '512x512', '512x512:maskable']));
  for (const i of m.icons) expect((await request.get(i.src)).status(), i.src).toBe(200);
  expect((await request.get(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'))).status()).toBe(200);
  expect(await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content')).toBe('yes');
});

test('o service worker assume e guarda o shell', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const nomes = await page.evaluate(async () => (await caches.keys()).join(','));
  expect(nomes).toMatch(/precache/);
  // o 3D e o modelo não entram no precache (só em tempo de execução, quando usados)
  const pre = await page.evaluate(async () => {
    const k = (await caches.keys()).find((n) => /precache/.test(n));
    return (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname);
  });
  expect(pre.some((u) => /tres-d|body-model/.test(u))).toBe(false);
  expect(pre).toContain('/index.html');
});
