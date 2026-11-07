// Teste da gamificação: histórico sintético de 6 semanas → início, jornada, resumo, sessão ao vivo
import { chromium } from 'playwright';
import fs from 'fs';
const seed=JSON.parse(fs.readFileSync('../seed/seed.json','utf8'));
const cal=JSON.parse(fs.readFileSync('../seed/calistenia.json','utf8'));
const treinos={},conjuntos={};
for(const src of [seed,cal])for(const k in src){const [col,id]=k.split('/');if(col==='treinos')treinos[id]=Object.assign({id},src[k]);if(col==='conjuntos')conjuntos[id]=Object.assign({id},src[k]);}
conjuntos.academia={id:'academia',nome:'Treino na academia',descricao:'Full Body A/B · Recomposição corporal',ordem:1,criado:1,frequencia:'2x por semana',treinos:[{id:'A',dia:'Terça'},{id:'B',dia:'Quinta'}],intervaloH:48};
const config=Object.assign({},seed['config/programa'],{migrado:true,perfil:{apelido:'Arthur',peso:78.5,meta:2}});
const PESO=78.5, REF={'leg-press-45':1.2,'agachamento-goblet':.3,'stiff-halteres':.5,'elevacao-pelvica':1,'supino-inclinado':.45,'supino-maquina':.6,'remada-sentada':.7,'puxada-alta':.7,'mesa-flexora':.45,'panturrilha-em-pe':1,'elevacao-lateral':.2,'triceps-polia':.3,'rosca-biceps':.25};
const DIA=864e5, now=Date.now();
const sessoes={};let n=0;
function sess(tid,cid,quando,sem){const t=treinos[tid];const id='s'+(n++);let ts=quando;
  const s={id,conjuntoId:cid,conjuntoNome:conjuntos[cid].nome,treinoId:tid,treinoNome:t.nome,letra:t.letra,inicio:quando-60000,status:'concluida',atual:0,notas:'',pesoCorp:PESO,itens:[]};
  if(t.formato){s.formato='circuito';s.rodadas=t.rodadas;s.descansoRodada=t.descansoRodada;s.aquecimento=t.aquecimento;s.aqGuiado=true;s.aqFeito=true;}
  s.itens=t.itens.map(it=>{const x=JSON.parse(JSON.stringify(it));x.sets=[];const ref=REF[x.exId];
    for(let k=0;k<x.series;k++){ts+=150000;let carga=null,reps;
      if(x.tipo==='tempo')reps=30+sem*2;else reps=Math.min(x.max,x.min+sem);
      if(ref){const tot=ref*PESO*(.85+.04*sem);carga=Math.round((x.porHalter?tot/2:tot)/2)*2;}
      x.sets.push({carga,reps,esforco:'ideal',t:ts});}return x;});
  s.fim=ts+60000;sessoes[id]=s;}
for(let w=6;w>=1;w--){const sem=6-w;const base=now-w*7*DIA;sess('A','academia',base-2*DIA,sem);sess('B','academia',base,sem);if(w<=2)sess('cal-a','calistenia',base+DIA,sem);}
const scheme=process.argv[2]||'light';
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:scheme,deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(([t,c,cf,ss,th])=>{if(sessionStorage.getItem('ok'))return;sessionStorage.setItem('ok',1);localStorage.setItem('mt3d.theme',th);localStorage.setItem('mt3d.treinos',JSON.stringify(t));localStorage.setItem('mt3d.conjuntos',JSON.stringify(c));localStorage.setItem('mt3d.config',JSON.stringify(cf));localStorage.setItem('mt3d.sessoes',JSON.stringify(ss));},[treinos,conjuntos,config,sessoes,scheme]);
await p.goto('http://localhost:8765/test.html');
await p.waitForFunction(()=>window.__READY__,null,{timeout:60000});await p.waitForTimeout(400);
const P='out/gam_'+scheme+'_';const W=ms=>p.waitForTimeout(ms||300);
await p.screenshot({path:P+'home.png'});
console.log('placar:',await p.evaluate(()=>document.querySelector('.placar').innerText.replace(/\n/g,' | ')));
await p.click('a.placar');await W(500);await p.screenshot({path:P+'jornada.png',fullPage:true});
console.log('stats:',await p.evaluate(()=>[...document.querySelectorAll('.gs')].map(x=>x.innerText.replace(/\n/g,' ')).join(' || ')));
console.log('desafios:',await p.evaluate(()=>[...document.querySelectorAll('.desf')].map(x=>x.innerText.replace(/\n/g,' ')).join(' || ')));
console.log('conquistas:',await p.evaluate(()=>[...document.querySelectorAll('.medalha.on b')].map(x=>x.textContent).join(', ')));
await p.click('.wc-col:nth-child(5)');await W();console.log('tip:',await p.evaluate(()=>document.querySelector('#wcTip').textContent));
await p.evaluate(()=>document.querySelector('details.regras').open=true);await W();await p.screenshot({path:P+'regras.png',fullPage:true});
await p.click('[data-act="perfil"]');await W(400);await p.screenshot({path:P+'perfil.png'});await p.click('#sheet [data-act="close"]');await W(300);
// último resumo
const ult=await p.evaluate(()=>Object.values(window.__S.sessoes).sort((a,b)=>b.fim-a.fim)[0].id);
await p.goto('http://localhost:8765/test.html#resumo/'+ult);await W(1300);await p.screenshot({path:P+'resumo.png',fullPage:true});
console.log('resumo:',await p.evaluate(()=>document.querySelector('.ptsres').innerText.replace(/\n/g,' | ')));
// sessão ao vivo: Treino B da academia com carga acima do recorde
await p.goto('http://localhost:8765/test.html#conjunto/academia/treino/B');await W(500);await p.screenshot({path:P+'treinoB.png'});
await p.click('.sticky-cta [data-act="start"]');await W(600);
await p.evaluate(()=>{const i=document.querySelector('#sessaoView .stp input[data-f="carga"]');if(i){i.value='40';i.dispatchEvent(new Event('input',{bubbles:true}));}});
await p.click('[data-act="doneSet"]');await W(250);await p.screenshot({path:P+'voa.png'});
console.log('toast:',await p.evaluate(()=>document.querySelector('#toast').textContent),'| sbar:',await p.evaluate(()=>document.querySelector('.sbar-t span').textContent));
// biblioteca
await p.goto('http://localhost:8765/test.html#biblioteca');await W(500);await p.screenshot({path:P+'bib.png'});
console.log('errors',JSON.stringify(errs),'overflow',await p.evaluate(()=>document.documentElement.scrollWidth));
await b.close();
