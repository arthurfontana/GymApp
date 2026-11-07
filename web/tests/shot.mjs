import { chromium } from 'playwright';
const shots=JSON.parse(process.argv[2]);const W=+process.argv[3]||900,H=+process.argv[4]||1000;
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H}});
p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CONSOLE',m.type(),m.text())});
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto('http://localhost:8765/test.html');
await p.waitForFunction(()=>window.__READY__||document.getElementById('loading').textContent.includes('Erro')||document.getElementById('loading').textContent.includes('Não'),null,{timeout:120000});
for(const [t,v,name,cp,ct] of shots){await p.evaluate(([t,v,cp,ct,r])=>{window.__REST__=r;return window.__go(t,v,cp,ct)},[t,v,cp,ct,name.startsWith('REST')]);await p.waitForTimeout(300);
 const el=await p.$('#stage');await el.screenshot({path:name});console.log('saved',name);}
await b.close();
