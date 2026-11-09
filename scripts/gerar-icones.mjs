#!/usr/bin/env node
// Gera os PNG do PWA a partir dos SVG de public/icons/ (S03). Rodar só quando o desenho mudar:
//   node scripts/gerar-icones.mjs     (usa o Chromium do Playwright)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const dir = new URL('../public/icons/', import.meta.url);
const alvos = [
  ['icone.svg', 'icon-192.png', 192],
  ['icone.svg', 'icon-512.png', 512],
  ['icone-maskable.svg', 'icon-maskable-512.png', 512],
  ['icone-maskable.svg', 'apple-touch-icon.png', 180], // iOS não arredonda: fundo cheio
];
const b = await chromium.launch();
for (const [svg, png, n] of alvos) {
  const p = await b.newPage({ viewport: { width: n, height: n } });
  const src = readFileSync(new URL(svg, dir), 'utf8');
  await p.setContent(`<body style="margin:0;background:transparent"><div style="width:${n}px;height:${n}px">${src.replace('<svg ', `<svg width="${n}" height="${n}" `)}</div></body>`);
  await p.screenshot({ path: new URL(png, dir).pathname, omitBackground: true });
  await p.close();
  console.log(png, n);
}
await b.close();
