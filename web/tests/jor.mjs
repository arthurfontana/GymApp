import { chromium } from 'playwright';
import fs from 'fs';
const seed=JSON.parse(fs.readFileSync('../seed/seed.json','utf8'));
const treinos={},config=seed['config/programa'];
for(const k in seed)if(k.startsWith('treinos/')){const id=k.split('/')[1];treinos[id]=Object.assign({id},seed[k]);}
// sessão anterior do treino A, para testar "anterior" e sugestões
const now=Date.now();
const prevA={id:'s0',treinoId:'A',treinoNome:'Treino A',letra:'A',inicio:now-3*864e5-3600e3,fim:now-3*864e5,status:'concluida',atual:0,descansoFim:null,notas:'',
 itens:treinos.A.itens.map((it,i)=>Object.assign(JSON.parse(JSON.stringify(it)),{sets:it.tipo==='tempo'?[{reps:30},{reps:35}]:Array.from({length:it.series},(_,k)=>({carga:[100,40,45,10,6,20][i],reps:i===0?12:10-k,esforco:'ideal'}))}))};
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const scheme=process.argv[2]||'light';
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:scheme,deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(([t,c,s,th])=>{localStorage.setItem('mt3d.theme',th);localStorage.setItem('mt3d.treinos',JSON.stringify(t));localStorage.setItem('mt3d.config',JSON.stringify(c));localStorage.setItem('mt3d.sessoes',JSON.stringify(s));},[treinos,config,{s0:prevA},scheme]);
await p.goto('http://localhost:8765/test.html');
await p.waitForFunction(()=>window.__READY__,null,{timeout:60000});await p.waitForTimeout(300);
const shot=async n=>{await p.screenshot({path:`out/jor_${n}.png`,fullPage:true});};
await shot('home');
console.log('migração',await p.evaluate(()=>{const c=window.__S.conjuntos.academia;return c?[c.nome,c.descricao,c.treinos.map(m=>m.id+':'+m.dia).join(','),Object.values(window.__S.sessoes).map(s=>s.conjuntoId).join(',')]:'sem conjunto';}));
await p.click('a.card.cj[href="#conjunto/academia"]');await p.waitForTimeout(300);await shot('conj');
await p.click('a.card.tr[href="#conjunto/academia/treino/A"]');await p.waitForTimeout(300);await shot('treinoA');
await p.click('[data-act="editItem"][data-i="0"]');await p.waitForTimeout(300);await p.screenshot({path:'out/jor_sheetItem.png'});
await p.click('#sheet [data-act="close"]');await p.waitForTimeout(300);
await p.click('[data-act="addItem"]');await p.waitForTimeout(300);await p.screenshot({path:'out/jor_sheetAdd.png'});
await p.click('#sheet [data-act="close"]');await p.waitForTimeout(300);
const th0=await p.evaluate(()=>document.documentElement.dataset.theme);
await p.click('#treinoView .themebtn');const th1=await p.evaluate(()=>document.documentElement.dataset.theme);
await p.click('#treinoView .themebtn');const th2=await p.evaluate(()=>document.documentElement.dataset.theme);
console.log('tema',th0,'->',th1,'->',th2);
await p.click('.sticky-cta [data-act="start"]');await p.waitForTimeout(400);await shot('sess1');
await p.evaluate(()=>document.querySelector('.howto').scrollIntoView({block:'end'}));await p.waitForTimeout(200);await p.screenshot({path:'out/jor_howto.png'});
console.log('mini canvas na sessão',await p.evaluate(()=>!!document.querySelector('#miniStage canvas')));
await p.click('.howto .btn.more');await p.waitForTimeout(800);await p.evaluate(()=>window.__go(2.7,'lateral'));await p.screenshot({path:'out/jor_exFromMini.png'});
console.log('canvas no palco',await p.evaluate(()=>!!document.querySelector('#stage canvas')&&!document.getElementById('exView').hidden), await p.evaluate(()=>document.querySelector('#exView .back').getAttribute('href')));
await p.click('#exView .back');await p.waitForTimeout(500);
console.log('mini de volta',await p.evaluate(()=>!!document.querySelector('#miniStage canvas')&&location.hash));
await p.evaluate(()=>window.scrollTo(0,0));
await p.click('[data-act="step"][data-f="carga"][data-d="1"]');
await p.click('[data-act="effort"][data-v="ideal"]');
await p.click('[data-act="doneSet"]');await p.waitForTimeout(600);await p.screenshot({path:'out/jor_rest.png'});
// pula descanso e completa o resto rápido
for(let k=0;k<30;k++){
  const cl=async sel=>{try{const e=await p.$(sel);if(!e)return false;await e.click({timeout:3000});return true;}catch(err){return 'retry';}};
  if(await cl('[data-act="skipRest"]'))await p.waitForTimeout(120);
  let r=await cl('[data-act="doneSet"]');if(r){await p.waitForTimeout(150);continue;}
  r=await cl('.entry [data-act="goEx"]');if(r){await p.waitForTimeout(150);continue;}
  break;
}
await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(200);
await shot('sessDone');
await p.click('[data-act="finish"]');await p.waitForTimeout(500);await shot('resumo');
await p.goto('http://localhost:8765/test.html#');await p.waitForTimeout(500);await shot('home2');
/* novo conjunto reaproveitando o Treino B da biblioteca */
await p.click('#homeView [data-act="novoConjunto"]');await p.waitForTimeout(300);
await p.fill('#sheet input[data-k="nome"]','Treino em casa');await p.fill('#sheet input[data-k="descricao"]','Sem equipamento, 3x por semana');
await p.click('#sheet [data-act="save"]');await p.waitForTimeout(400);
console.log('novo conjunto',await p.evaluate(()=>location.hash));
await p.click('#conjuntoView .sec-h [data-act="addTreino"]');await p.waitForTimeout(300);await p.screenshot({path:'out/jor_addTreino.png'});
await p.click('#sheet [data-act="pickT"][data-id="B"]');await p.waitForTimeout(200);await p.click('#sheet [data-act="close"]');await p.waitForTimeout(300);
await shot('conj2');
const hB=await p.evaluate(()=>document.querySelector('#conjuntoView a.card.tr').getAttribute('href'));
await p.click('#conjuntoView a.card.tr');await p.waitForTimeout(300);await shot('treinoShared');
console.log('treino compartilhado',hB,await p.evaluate(()=>document.querySelector('#treinoView .note')?.textContent.trim()));
/* novo treino dentro do conjunto, sem equipamento */
await p.click('#treinoView .back');await p.waitForTimeout(300);
await p.click('#conjuntoView .sec-h [data-act="addTreino"]');await p.waitForTimeout(300);await p.click('#sheet [data-act="novo"]');await p.waitForTimeout(500);
await p.fill('#sheet input[data-k="dia"]','Sábado');await p.click('#sheet [data-act="save"]');await p.waitForTimeout(400);
await p.click('[data-act="addItem"]');await p.waitForTimeout(300);await p.click('#sheet [data-act="eqf"][data-v="sem"]');await p.waitForTimeout(200);
await p.screenshot({path:'out/jor_addSem.png'});
await p.click('#sheet [data-act="pick"][data-id="prancha"]');await p.waitForTimeout(200);await p.click('#sheet [data-act="close"]');await p.waitForTimeout(300);
await shot('treinoNovo');
await p.click('#treinoView .back');await p.waitForTimeout(300);await shot('conj3');
await p.goto('http://localhost:8765/test.html#biblioteca/treinos');await p.waitForTimeout(400);await shot('bib');
await p.goto('http://localhost:8765/test.html#biblioteca');await p.waitForTimeout(300);await shot('libTodos');
await p.click('.eqfilter [data-eqf="sem"]');await p.waitForTimeout(200);await shot('libSem');
await p.goto('http://localhost:8765/test.html#');await p.waitForTimeout(400);await shot('home3');
console.log('errors',errs, 'overflow', await p.evaluate(()=>document.documentElement.scrollWidth));
await b.close();
