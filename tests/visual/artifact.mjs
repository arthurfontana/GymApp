// Confere o build do Artifact (npm run build:artifact) antes de publicar: serve dist-artifact/
// num servidor local, abre index.html no celular (390×844), espera o modelo 3D carregar
// (body-model.wasm) e falha se houver erro de JS ou rolagem lateral. Print em tests/visual/out/.
// Uso (da raiz): node tests/visual/artifact.mjs
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIR = 'dist-artifact', OUT = 'tests/visual/out/';
mkdirSync(OUT, { recursive: true });
const tipos = { '.html': 'text/html; charset=utf-8', '.wasm': 'application/wasm' };
const srv = createServer(async (req, res) => {
  const f = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/$/, '/index.html');
  try { const b = await readFile(join(DIR, f)); res.writeHead(200, { 'content-type': tipos[extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://localhost:${srv.address().port}/`;

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let falhou = false;
for (const tema of ['light', 'dark']) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: tema });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await p.addInitScript((th) => localStorage.setItem('mt3d.theme', th), tema);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url + '?test=1#supino-inclinado');
  await p.waitForFunction(() => window.__READY__, null, { timeout: 120000 });
  await p.evaluate(() => window.__go(window.__EXC().ex.keys[4].t, 'lateral'));
  await p.screenshot({ path: `${OUT}artifact_${tema}_ex.png` });
  await p.goto(url + '?test=1#'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}artifact_${tema}_inicio.png`, fullPage: true });
  const largura = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(tema, 'erros', errs, 'largura', largura, 'exercícios', await p.evaluate(() => window.__EX_IDS.length));
  if (errs.length || largura > 390) falhou = true;
  await p.close();
}
await b.close(); srv.close();
if (falhou) { console.error('FALHOU: o Artifact gerado tem erro de JS ou rolagem lateral'); process.exit(1); }
console.log('ok: dist-artifact/ abre sem erros');
