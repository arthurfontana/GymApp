import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const views=JSON.parse(process.argv[2]);
for(const [name,v] of Object.entries(views)){const p=await b.newPage({viewport:{width:1000,height:1000}});p.on('pageerror',e=>console.log(e.message));p.on('console',m=>console.log(m.text()));
await p.goto('http://localhost:8765/view.html');await p.evaluate(v=>window.go(v),v);await p.waitForTimeout(500);await p.screenshot({path:name});console.log('ok',name);await p.close();}
await b.close();
