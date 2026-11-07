import {createRequire} from 'module';const require=createRequire(import.meta.url);const {chromium}=require('playwright');
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const scheme of ['light','dark']){
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:scheme});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/test.html');
await p.waitForTimeout(800);
await p.screenshot({path:`out/menu_${scheme}.png`});
await p.click('a.ex');
await p.waitForFunction(()=>window.__READY__,null,{timeout:60000});
await p.evaluate(()=>window.__go(5,'lateral'));
await p.waitForTimeout(300);
await p.screenshot({path:`out/ex_${scheme}.png`});
const ov=await p.evaluate(()=>document.documentElement.scrollWidth);
await p.goBack();await p.waitForTimeout(300);
console.log(scheme,'overflow',ov,'menuVisible',await p.isVisible('#menuView'),errs);
}
await b.close();
