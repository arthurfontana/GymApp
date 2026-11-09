// S03: o 3D (pacote tres-d, three e o modelo) só baixa quando precisa.
// Início não baixa; #biblioteca, #<exercício> e a prévia da sessão baixam.
import { test, expect, abrir, semear, dadosSeed, semRolagemLateral, anexarPrint } from './fixtures.js';

const eh3D = (u) => /tres-d|body-model/.test(u);

function vigiar(page) {
  const urls = [];
  page.on('request', (r) => { if (/localhost/.test(r.url())) urls.push(new URL(r.url()).pathname); });
  return urls;
}

test('o Início não baixa o 3D nem o modelo', async ({ page }, testInfo) => {
  const urls = vigiar(page);
  await abrir(page, '', { sem3d: true });
  await expect(page.locator('#homeView')).not.toBeEmpty();
  await page.waitForLoadState('networkidle');
  expect(urls.filter(eh3D), 'requisições do 3D no Início').toEqual([]);
  expect(urls.some((u) => /\/assets\/index-.*\.js$/.test(u))).toBe(true);
  expect(await page.evaluate(() => typeof window.THREE)).toBe('undefined');
  // as pontes provisórias e os ids existem antes do 3D
  expect(await page.evaluate(() => [window.__EX_IDS.length, typeof window.__mini, typeof window.__enterExercise])).toEqual([22, 'function', 'function']);
  await expect(page.locator('#homeView .note', { hasText: 'Versão de teste' })).toBeVisible();
  await semRolagemLateral(page);
  await anexarPrint(page, testInfo, 'inicio-sem-3d');
});

test('abrir #biblioteca baixa o 3D', async ({ page }) => {
  const urls = vigiar(page);
  await abrir(page, '#biblioteca', { sem3d: true });
  await expect.poll(() => urls.some((u) => /tres-d/.test(u))).toBe(true);
  await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 120_000 });
  expect(urls.some((u) => /body-model/.test(u))).toBe(true);
  await expect(page.locator('#menuView a.ex')).toHaveCount(22);
});

test('abrir um exercício (#supino-maquina) baixa o 3D e mostra o boneco', async ({ page }) => {
  const urls = vigiar(page);
  await abrir(page, '#supino-maquina', { sem3d: true });
  await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 120_000 });
  expect(urls.some((u) => /tres-d/.test(u))).toBe(true);
  await expect(page.locator('#exView')).toBeVisible();
  await expect(page.locator('#loading')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__EXC && window.__EXC().ex && 1)).toBe(1);
});

test('a prévia da sessão baixa o 3D e aparece', async ({ page }, testInfo) => {
  const { treinos, config } = dadosSeed();
  await semear(page, { 'mt3d.treinos': treinos, 'mt3d.config': config });
  const urls = vigiar(page);
  await abrir(page, '#conjunto/academia/treino/A', { sem3d: true });
  expect(urls.filter(eh3D)).toEqual([]);
  await page.click('.sticky-cta [data-act="start"]');
  await expect(page.locator('#miniStage')).toBeVisible();
  await expect.poll(() => urls.some((u) => /tres-d/.test(u))).toBe(true);
  await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 120_000 });
  await expect(page.locator('#miniStage canvas')).toHaveCount(1);
  await expect(page.locator('#miniStage [data-mini-load]')).toBeHidden();
  await anexarPrint(page, testInfo, 'sessao-previa');
});
