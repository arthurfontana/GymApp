// Smoke: o app abre, o 3D carrega, o tema do aparelho é aplicado, sem erros e sem rolagem lateral.
import { test, expect, abrir, semRolagemLateral, anexarPrint } from './fixtures.js';

test('abre o Início, carrega o 3D e não tem erros', async ({ page, tema }, testInfo) => {
  await abrir(page);
  await expect(page.locator('#homeView')).toBeVisible();
  await expect(page.locator('#homeView')).not.toBeEmpty();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(tema);
  // as pontes 3D ↔ jornada continuam no ar
  const pontes = await page.evaluate(() => ({
    ids: (window.__EX_IDS || []).length,
    mini: typeof window.__mini,
    enter: typeof window.__enterExercise,
    go: typeof window.__go,
    S: typeof window.__S,
  }));
  expect(pontes).toEqual({ ids: 22, mini: 'function', enter: 'function', go: 'function', S: 'object' });
  await semRolagemLateral(page);
  await anexarPrint(page, testInfo, 'inicio', { fullPage: true });
});

test('biblioteca 3D lista os 22 exercícios', async ({ page }, testInfo) => {
  await abrir(page, '#biblioteca');
  await expect(page.locator('#menuView')).toBeVisible();
  await expect(page.locator('#menuView a.ex')).toHaveCount(22);
  await semRolagemLateral(page);
  await anexarPrint(page, testInfo, 'biblioteca', { fullPage: true });
});

test('sem ?test=1 não expõe os ganchos de teste', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#homeView')).not.toBeEmpty();
  expect(await page.evaluate(() => [typeof window.__TEST__, typeof window.__go, typeof window.__S])).toEqual(['undefined', 'undefined', 'undefined']);
});
