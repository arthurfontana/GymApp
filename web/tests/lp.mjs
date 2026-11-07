import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:900,height:700}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:8765/test.html#leg-press-45');
await p.waitForFunction(()=>window.__READY__,null,{timeout:90000});
const shots=JSON.parse(process.argv[2]);
for(const s of shots){
  await p.evaluate(s=>{if(s.parts!==undefined)window.__parts(s.parts);window.__go(s.t,s.v,s.cp,s.ct,s.err);},s);
  await p.waitForTimeout(150);
  const st=await p.evaluate(()=>[...document.querySelectorAll('#readouts b')].map(b=>b.textContent).join(' ')+' | '+document.getElementById('phase').textContent+' | '+document.getElementById('errBadge').textContent);
  console.log(s.name,st);
  await p.locator('#stage').screenshot({path:`out/lp_${s.name}.png`});
}
console.log('errors',errs);
await b.close();
