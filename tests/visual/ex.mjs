import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
// Prints para a skill animacao-3d-exercicio. Com `npm run dev` ligado (ou BASE=http://localhost:4173/ com npm run preview).
// Saída em tests/visual/out/ (ignorada pelo git). Rode da raiz do repositório.
const BASE=process.env.BASE||'http://localhost:5173/';
const OUT='tests/visual/out/';mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:900,height:700}});await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.fulfill({status:200,contentType:'text/css',body:''}));
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(BASE+'?test=1#'+(process.argv[3]||'supino-maquina'));
await p.waitForFunction(()=>window.__APP__);await p.evaluate(()=>window.__carregar3D());await p.waitForFunction(()=>window.__READY__,null,{timeout:90000});
const shots=JSON.parse(process.argv[2]);
for(const s of shots){
  await p.evaluate(s=>{if(s.parts!==undefined)window.__parts(s.parts);window.__go(s.t,s.v,s.cp,s.ct,s.err);},s);
  await p.waitForTimeout(150);
  const st=await p.evaluate(()=>[...document.querySelectorAll('#readouts b')].map(b=>b.textContent).join(' ')+' | '+document.getElementById('phase').textContent+' | '+document.getElementById('errBadge').textContent);
  console.log(s.name,st);
  await p.locator('#stage').screenshot({path:OUT+`${process.argv[4]||'x'}_${s.name}.png`});
}
console.log('errors',errs);
await b.close();
