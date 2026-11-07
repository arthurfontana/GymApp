import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for (const [w,h,dark,name] of [[390,844,false,'m.png'],[390,844,true,'md.png']]){
const p=await b.newPage({viewport:{width:w,height:h},colorScheme:dark?'dark':'light',deviceScaleFactor:1});
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto('http://localhost:8765/test.html');await p.waitForFunction(()=>window.__READY__,null,{timeout:120000});
await p.evaluate(()=>window.__go(4.9,'lateral'));await p.waitForTimeout(300);
const ov=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);console.log(name,'overflow',ov);
await p.screenshot({path:name,fullPage:false});await p.close();}
await b.close();
