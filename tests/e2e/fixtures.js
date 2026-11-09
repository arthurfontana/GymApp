// Base comum dos specs: tema do projeto, fontes do Google bloqueadas, coleta de erros
// (pageerror e console.error) e helpers. Todo teste termina exigindo zero erros.
import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const raiz = new URL('../../', import.meta.url);
export const lerJSON = (p) => JSON.parse(readFileSync(new URL(p, raiz), 'utf8'));

/** treinos e conjuntos dos JSON de seed/, no formato do localStorage do app */
export function dadosSeed({ calistenia = false } = {}) {
  const fontes = [lerJSON('seed/seed.json')];
  if (calistenia) fontes.push(lerJSON('seed/calistenia.json'));
  const treinos = {}, conjuntos = {};
  for (const src of fontes)
    for (const k in src) {
      const [col, id] = k.split('/');
      if (col === 'treinos') treinos[id] = Object.assign({ id }, src[k]);
      if (col === 'conjuntos') conjuntos[id] = Object.assign({ id }, src[k]);
    }
  return { treinos, conjuntos, config: fontes[0]['config/programa'] };
}

export const test = base.extend({
  tema: ['light', { option: true }],
  erros: async ({}, use) => {
    const erros = [];
    await use(erros);
    expect(erros, 'erros de JS na página').toEqual([]);
  },
  page: async ({ page, tema, erros }, use) => {
    page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push('console.error: ' + m.text()); });
    // fontes do Google: resposta vazia (sem rede e sem erro no console)
    await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/, (r) =>
      r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.addInitScript((th) => { try { localStorage.setItem('mt3d.theme', th); } catch (e) {} }, tema);
    await use(page);
  },
});
export { expect };

/** grava dados no localStorage só no primeiro carregamento da aba (reload não apaga) */
export async function semear(page, chaves) {
  await page.addInitScript((ch) => {
    if (sessionStorage.getItem('semeado')) return;
    sessionStorage.setItem('semeado', '1');
    for (const k in ch) localStorage.setItem(k, typeof ch[k] === 'string' ? ch[k] : JSON.stringify(ch[k]));
  }, chaves);
}

/**
 * abre o app em modo de teste. __APP__ = jornada pronta; __READY__ = modelo 3D pronto.
 * Desde a S03 o 3D é sob demanda: por padrão o helper o carrega (os specs usam __go, __EXC...);
 * com { sem3d: true } abre só a jornada, como o usuário vê no Início.
 */
export async function abrir(page, hash = '', { sem3d = false } = {}) {
  await page.goto('/?test=1' + hash);
  await page.waitForFunction(() => window.__APP__ === true, null, { timeout: 60_000 });
  if (sem3d) return;
  await page.evaluate(() => window.__carregar3D());
  await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 120_000 });
}

export const largura = (page) => page.evaluate(() => document.documentElement.scrollWidth);

export async function semRolagemLateral(page) {
  expect(await largura(page), 'largura da página (sem rolagem horizontal)').toBeLessThanOrEqual(390);
}

export async function anexarPrint(page, testInfo, nome, opts = {}) {
  const img = await (opts.locator ? opts.locator.screenshot() : page.screenshot({ fullPage: opts.fullPage ?? false }));
  await testInfo.attach(nome, { body: img, contentType: 'image/png' });
}

/** o canvas WebGL tem imagem de verdade (não ficou de uma cor só) */
export function canvasTemImagem(page, seletor) {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel);
    if (!c) return 0;
    const t = document.createElement('canvas'); t.width = 48; t.height = 48;
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, 48, 48);
    const d = g.getImageData(0, 0, 48, 48).data, cores = new Set();
    for (let i = 0; i < d.length; i += 4) cores.add((d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3));
    return cores.size;
  }, seletor);
}
