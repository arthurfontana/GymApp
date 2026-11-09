#!/usr/bin/env node
// Monta a versão de arquivo único para o Artifact do claude.ai (até a S09, ADR-011).
// Roda depois de `vite build --mode artifact` (ver npm run build:artifact):
//   dist-artifact/.vite/index.html + assets/*.js|css  →  dist-artifact/index.html (JS e CSS inline)
//   public/modelos/body-model-v1.glb                   →  dist-artifact/body-model.wasm
// O host do Artifact só serve tipos web padrão e scripts de CDNs permitidos: por isso o three
// vai empacotado no bundle, o JS entra inline como script clássico no fim do <body> (como no
// antigo build.py) e o modelo GLB é publicado com a extensão .wasm.
import { readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const saida = join(raiz, 'dist-artifact');
const vite = join(saida, '.vite');

let html = readFileSync(join(vite, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>\s*/g)];
const estilos = [...html.matchAll(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">\s*/g)];
if (scripts.length !== 1 || estilos.length !== 1) {
  throw new Error(`esperava 1 script e 1 CSS no build, achei ${scripts.length} e ${estilos.length}`);
}
const js = readFileSync(join(vite, scripts[0][1]), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(vite, estilos[0][1]), 'utf8').replace(/<\/style/gi, '<\\/style');

html = html.replace(scripts[0][0], '').replace(estilos[0][0], () => `<style>\n${css}\n</style>\n`);
// o bundle é IIFE (script clássico): precisa do DOM pronto, então vai no fim do <body>
html = html.replace('</body>', () => `<script>\n${js}\n</script>\n</body>`);

// ícones do PWA (S03): o host do Artifact só serve a página e o modelo; sem service worker não há instalação
html = html.replace(/<link rel="(?:icon|apple-touch-icon)"[^>]*>\n?/g, '');

const resto = html.match(/<script[^>]+src=|<link[^>]+href="(?!https:\/\/fonts\.)/g);
if (resto) throw new Error('ainda há arquivo externo no HTML do Artifact: ' + resto.join(', '));
if (/import\.meta|\bimport\s*\(/.test(js)) throw new Error('o bundle do Artifact ainda tem import/import.meta');

writeFileSync(join(saida, 'index.html'), html);
copyFileSync(join(raiz, 'public/modelos/body-model-v1.glb'), join(saida, 'body-model.wasm'));
rmSync(vite, { recursive: true, force: true });
const kb = (f) => Math.round(readFileSync(join(saida, f)).length / 1024) + ' KB';
console.log('dist-artifact/:', readdirSync(saida).map((f) => `${f} (${kb(f)})`).join(', '));
