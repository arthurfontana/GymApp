import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
// Prints para a skill animacao-3d-exercicio. Com `npm run dev` ligado (ou BASE=http://localhost:4173/ com npm run preview).
// Saída em tests/visual/out/ (ignorada pelo git). Rode da raiz do repositório.
const BASE=process.env.BASE||'http://localhost:5173/';
const OUT='tests/visual/out/';mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [hash,scheme] of [['#biblioteca','light'],['#afundo-tras','dark'],['#bird-dog','light']]){
 const p=await b.newPage({viewport:{width:390,height:844},colorScheme:scheme});await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.fulfill({status:200,contentType:'text/css',body:''}));
 const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.addInitScript(th=>localStorage.setItem('mt3d.theme',th),scheme);
 await p.goto(BASE+'?test=1'+hash);
 if(hash&&hash!=='#biblioteca'){await p.waitForFunction(()=>window.__READY__,null,{timeout:90000});await p.evaluate(()=>window.__go(1,'lateral'));}
 await p.waitForTimeout(400);
 const name='mob'+(hash.replace('#','_')||'_menu');
 await p.screenshot({path:OUT+name+'.png',fullPage:true});
 console.log(name,await p.evaluate(()=>document.documentElement.scrollWidth),errs);
 if(hash==='#leg-press-45'){await p.click('#errList .err[data-err="calcanhar"]');await p.evaluate(()=>window.__go(2.7));await p.waitForTimeout(200);await p.locator('#stage').screenshot({path:OUT+'mob_err.png'});}
 await p.close();
}
await b.close();
