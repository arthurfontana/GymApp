import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
// Prints para a skill animacao-3d-exercicio. Com `npm run dev` ligado (ou BASE=http://localhost:4173/ com npm run preview).
// Saída em tests/visual/out/ (ignorada pelo git). Rode da raiz do repositório.
const BASE=process.env.BASE||'http://localhost:5173/';
const OUT='tests/visual/out/';mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const scheme=process.argv[2]||'light';
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.fulfill({status:200,contentType:'text/css',body:''}));
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(th=>localStorage.setItem('mt3d.theme',th),scheme);
await p.goto(BASE+'?test=1');
await p.waitForFunction(()=>window.__READY__,null,{timeout:60000});
await p.evaluate(()=>{const d=document.createElement('div');d.className='mini';d.id='tm';d.style.cssText='width:312px;position:fixed;left:0;top:0;z-index:99';d.innerHTML='<span class="mini-cap" data-mini-cap></span><span class="mini-load" data-mini-load>…</span>';document.body.appendChild(d);});
const ids=await p.evaluate(()=>window.__EX_IDS);
for(const id of ids){await p.evaluate(id=>window.__mini(document.getElementById('tm'),id),id);await p.waitForTimeout(150);
  await p.locator('#tm').screenshot({path:OUT+`mini_${id}.png`});}
console.log('errors',errs);await b.close();
