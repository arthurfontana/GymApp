import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const scheme=process.argv[2]||'light';
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(th=>localStorage.setItem('mt3d.theme',th),scheme);
await p.goto('http://localhost:8765/test.html');
await p.waitForFunction(()=>window.__READY__,null,{timeout:60000});
await p.evaluate(()=>{const d=document.createElement('div');d.className='mini';d.id='tm';d.style.cssText='width:312px;position:fixed;left:0;top:0;z-index:99';d.innerHTML='<span class="mini-cap" data-mini-cap></span><span class="mini-load" data-mini-load>…</span>';document.body.appendChild(d);});
const ids=await p.evaluate(()=>window.__EX_IDS);
for(const id of ids){await p.evaluate(id=>window.__mini(document.getElementById('tm'),id),id);await p.waitForTimeout(150);
  await p.locator('#tm').screenshot({path:`out/mini_${id}.png`});}
console.log('errors',errs);await b.close();
