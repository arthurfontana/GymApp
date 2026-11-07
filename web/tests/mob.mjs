import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [hash,scheme] of [['#biblioteca','light'],['#afundo-tras','dark'],['#bird-dog','light']]){
 const p=await b.newPage({viewport:{width:390,height:844},colorScheme:scheme});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.addInitScript(th=>localStorage.setItem('mt3d.theme',th),scheme);
 await p.goto('http://localhost:8765/test.html'+hash);
 if(hash&&hash!=='#biblioteca'){await p.waitForFunction(()=>window.__READY__,null,{timeout:90000});await p.evaluate(()=>window.__go(1,'lateral'));}
 await p.waitForTimeout(400);
 const name='mob'+(hash.replace('#','_')||'_menu');
 await p.screenshot({path:name+'.png',fullPage:true});
 console.log(name,await p.evaluate(()=>document.documentElement.scrollWidth),errs);
 if(hash==='#leg-press-45'){await p.click('#errList .err[data-err="calcanhar"]');await p.evaluate(()=>window.__go(2.7));await p.waitForTimeout(200);await p.locator('#stage').screenshot({path:'mob_err.png'});}
 await p.close();
}
await b.close();
