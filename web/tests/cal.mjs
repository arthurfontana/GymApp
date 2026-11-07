// Teste do conjunto "Calistenia em casa": ficha da semana, circuito, aquecimento, contagem por lado
import { chromium } from 'playwright';
import fs from 'fs';
const seed=JSON.parse(fs.readFileSync('../seed/seed.json','utf8'));
const cal=JSON.parse(fs.readFileSync('../seed/calistenia.json','utf8'));
const treinos={},conjuntos={};
for(const src of [seed,cal])for(const k in src){const [col,id]=k.split('/');if(col==='treinos')treinos[id]=Object.assign({id},src[k]);if(col==='conjuntos')conjuntos[id]=Object.assign({id},src[k]);}
conjuntos.academia={id:'academia',nome:'Treino na academia',descricao:'Full Body A/B · Recomposição corporal',ordem:1,criado:1,frequencia:'2x por semana',treinos:[{id:'A',dia:'Terça'},{id:'B',dia:'Quinta'}]};
const config=Object.assign({},seed['config/programa'],{migrado:true});
const scheme=process.argv[2]||'light';
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:scheme,deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(([t,c,cf,th])=>{if(sessionStorage.getItem('ok'))return;sessionStorage.setItem('ok',1);localStorage.setItem('mt3d.theme',th);localStorage.setItem('mt3d.treinos',JSON.stringify(t));localStorage.setItem('mt3d.conjuntos',JSON.stringify(c));localStorage.setItem('mt3d.config',JSON.stringify(cf));localStorage.setItem('mt3d.sessoes','{}');},[treinos,conjuntos,config,scheme]);
await p.goto('http://localhost:8765/test.html');
await p.waitForFunction(()=>window.__READY__,null,{timeout:60000});await p.waitForTimeout(300);
const P='out/cal_'+scheme+'_';
const shot=async(n,full=true)=>{await p.screenshot({path:P+n+'.png',fullPage:full});};
const W=async(ms=300)=>p.waitForTimeout(ms);
await shot('home');
await p.click('a.card.cj[href="#conjunto/calistenia"]');await W();await shot('conj');
console.log('ficha:',await p.evaluate(()=>[...document.querySelectorAll('.ficha .chk b')].map(x=>x.textContent).join(' | ')),'|',await p.evaluate(()=>document.querySelector('.ficha-h .tr-m').textContent),'|',await p.evaluate(()=>document.querySelector('.fase').textContent));
await p.click('.chk[data-k="cam1"]');await W();
console.log('cam1 marcada:',await p.evaluate(()=>JSON.stringify(window.__S.conjuntos.calistenia.semana)),await p.evaluate(()=>document.querySelector('.ficha-h .tr-m').textContent));
await p.evaluate(()=>document.querySelector('details.guide').open=true);await W();await shot('conj_guia');
await p.click('a.card.tr[href="#conjunto/calistenia/treino/cal-a"]');await W();await shot('treinoA');
console.log('lista A:',await p.evaluate(()=>[...document.querySelectorAll('.exr-m')].map(x=>x.textContent).join(' | ')));
await p.click('[data-act="editItem"][data-i="3"]');await W();await p.screenshot({path:P+'sheetItem.png'});
await p.click('#sheet [data-act="close"]');await W();
await p.click('[data-act="editTreino"]');await W();await p.screenshot({path:P+'sheetTreino.png'});
await p.click('#sheet [data-act="close"]');await W();
await p.click('.sticky-cta [data-act="start"]');await W(500);await shot('sess0');
await p.click('[data-act="aqStart"]');await W(400);await shot('aq1',false);
// avança o aquecimento para o 3º movimento
await p.evaluate(()=>{const s=Object.values(window.__S.sessoes).find(x=>x.status==='andamento');const x=JSON.parse(JSON.stringify(s));x.descansoFim=Date.now()+50000;window.__put('sessoes',x.id,x);});await W(600);
console.log('aquec passo:',await p.evaluate(()=>document.querySelector('#restNext').textContent),await p.evaluate(()=>[...document.querySelectorAll('#restCard [data-aq]')].map(l=>l.className||'-').join(',')));
await shot('aq2',false);
await p.click('[data-act="skipRest"]');await W(400);
const ordem=[];
for(let k=0;k<8;k++){
  const nome=await p.evaluate(()=>document.querySelector('.exnow h2').textContent);
  const eb=await p.evaluate(()=>document.querySelector('.exnow .eyebrow').textContent);
  const cta=await p.evaluate(()=>document.querySelector('[data-act="doneSet"]').textContent.trim());
  await p.click('[data-act="effort"][data-v="ideal"]');
  await p.click('[data-act="doneSet"]');await W(450);
  const lbl=await p.evaluate(()=>{const l=document.querySelector('#restLbl');return l?l.textContent+' '+document.querySelector('#restTime').textContent:'(sem descanso)';});
  ordem.push(`${eb} :: ${nome} [${cta}] -> ${lbl}`);
  if(k===0)await shot('sess_pausa');
  if(k===3)await shot('sess_rodada');
  if(await p.$('#restCard [data-act="skipRest"]'))await p.click('#restCard [data-act="skipRest"]');await W(300);
}
console.log(ordem.join('\n'));
await shot('sess_fim');
await p.click('.fin [data-act="finish"]');await W(500);await shot('resumo');
console.log('resumo:',await p.evaluate(()=>[...document.querySelectorAll('.sumr')].map(x=>x.innerText.replace(/\n/g,' / ')).join(' || ')));
await p.click('#resumoView a.btn.primary');await W(400);await shot('conj_depois');
console.log('ficha depois:',await p.evaluate(()=>[...document.querySelectorAll('.ficha .chk')].map(x=>(x.classList.contains('on')?'✓':'·')+x.querySelector('b').textContent).join(' | ')));
// início: próximo treino é B
console.log('hero:',await p.evaluate(()=>document.querySelector('.hero h2').textContent));
// biblioteca de treinos
await p.goto('http://localhost:8765/test.html#biblioteca/treinos');await W(600);await shot('bib');
const ov=await p.evaluate(()=>document.documentElement.scrollWidth);
console.log('errors',JSON.stringify(errs),'overflow',ov);
await b.close();
