// Cada exercício de __EX_IDS renderiza 2 instantes nas vistas lateral e frontal (ou a outra
// vista principal, quando não há frontal), e a prévia
// do cartão da sessão (__mini) também desenha. Equivale aos antigos mini.mjs/ex.mjs.
import { test, expect, abrir, semRolagemLateral, canvasTemImagem } from './fixtures.js';

test('todos os exercícios renderizam (lateral e frontal) e têm prévia', async ({ page }, testInfo) => {
  await abrir(page, '#biblioteca');
  const ids = await page.evaluate(() => window.__EX_IDS);
  expect(ids).toHaveLength(22);

  for (const id of ids) {
    await test.step(id, async () => {
      // troca de exercício pelo roteador, como o toque no cartão da biblioteca
      await page.evaluate((id) => new Promise((ok) => {
        window.addEventListener('hashchange', () => ok(), { once: true });
        location.hash = id;
      }), id);
      await expect(page.locator('#exView')).toBeVisible();
      const { keys, vistas } = await page.evaluate(() => {
        const ex = window.__EXC().ex;
        return { keys: ex.keys.map((k) => k.t), vistas: Object.keys(ex.views) };
      });
      expect(keys.length, `${id}: 9 frames`).toBe(9);
      // frontal; quem não tem frontal (mesa flexora: posterior) usa a outra vista principal
      const outra = vistas.includes('frontal') ? 'frontal' : vistas.find((v) => v !== 'lateral' && v !== 'anatomia');
      expect(vistas).toContain('lateral');
      for (const v of ['lateral', outra]) {
        for (const t of [keys[0], keys[4]]) {
          await page.evaluate(([t, v]) => window.__go(t, v), [t, v]);
          expect(await canvasTemImagem(page, '#stage canvas'), `${id} ${v} t=${t}: canvas com imagem`).toBeGreaterThan(20);
          await expect(page.locator('#phase')).not.toBeEmpty();
        }
        const img = await page.locator('#stage').screenshot();
        await testInfo.attach(`${id}_${v}`, { body: img, contentType: 'image/png' });
      }
      await semRolagemLateral(page);
    });
  }

  // prévia da sessão: um cartão de 312 px como o da tela "Como fazer"
  await page.evaluate(() => { location.hash = 'biblioteca'; });
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.className = 'mini'; d.id = 'tm';
    d.style.cssText = 'width:312px;position:fixed;left:0;top:0;z-index:99';
    d.innerHTML = '<span class="mini-cap" data-mini-cap></span><span class="mini-load" data-mini-load>…</span>';
    document.body.appendChild(d);
  });
  for (const id of ids) {
    await page.evaluate((id) => window.__mini(document.getElementById('tm'), id), id);
    await page.waitForTimeout(100);
    expect(await canvasTemImagem(page, '#tm canvas'), `prévia ${id}`).toBeGreaterThan(20);
  }
  await page.evaluate(() => window.__mini(null));
});
