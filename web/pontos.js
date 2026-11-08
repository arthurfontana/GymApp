/* ================= Pontos, níveis, ligas, desafios, conquistas e calorias ================= */
/* Nada de placar guardado à parte: tudo é recalculado a partir das sessões gravadas.
   Assim a regra é igual para todos, dá para conferir cada ponto e, se a regra mudar, o histórico acompanha. */

// #region: px
/* Biblioteca reavaliada para a pontuação.
   r   = pontos por repetição (intensidade: massa muscular envolvida + exigência do movimento)
   s   = pontos por segundo (isométricos)
   ref = carga de referência, em fração do peso corporal (carga total; halteres somados)
   met = gasto energético do Compendium of Physical Activities 2024 (02052 agachamento/terra 5,0 ·
         02054 musculação 8–15 reps 3,5 · 02022 calistenia moderada 3,8 · 02024 calistenia leve/prancha 2,8) */
const PX={
  'leg-press-45':{r:3.0,ref:1.2,met:5.0},
  'agachamento-goblet':{r:2.8,ref:.3,met:5.0},
  'stiff-halteres':{r:2.6,ref:.5,met:5.0},
  'elevacao-pelvica':{r:2.6,ref:1.0,met:5.0},
  'supino-inclinado':{r:2.2,ref:.45,met:3.5},
  'supino-maquina':{r:2.0,ref:.6,met:3.5},
  'remada-sentada':{r:2.0,ref:.7,met:3.5},
  'puxada-alta':{r:2.0,ref:.7,met:3.5},
  'mesa-flexora':{r:1.6,ref:.45,met:3.5},
  'panturrilha-em-pe':{r:1.2,ref:1.0,met:3.5},
  'elevacao-lateral':{r:1.2,ref:.2,met:3.5},
  'triceps-polia':{r:1.2,ref:.3,met:3.5},
  'rosca-biceps':{r:1.2,ref:.25,met:3.5},
  'prancha':{s:.5,met:2.8},
  'afundo-tras':{r:1.8,met:3.8},
  'agachamento-livre':{r:1.6,met:3.8},
  'flexao-joelhos':{r:1.6,met:3.8},
  'ponte-gluteos':{r:1.0,met:2.8},
  'flexao-parede':{r:.8,met:3.8},
  'bom-dia':{r:.8,met:2.8},
  'bird-dog':{r:.7,met:2.8},
  'dead-bug':{r:.7,met:2.8},
};
// #region: regras-constantes
const MET_CIRC=5.0, MET_CAM=3.8;   /* 02035 circuito moderado · 17190 caminhada 2,8–3,4 mph */
const P_REC=15, P_NOVO=10, P_COMPLETO=20, P_AQ=5, P_CAM=10, P_EXTRA=5;
const DIA=864e5, JANELA=28*DIA;
const LIGAS=[{n:'Bronze',min:0,c:'bronze'},{n:'Prata',min:800,c:'prata'},{n:'Ouro',min:2000,c:'ouro'},{n:'Platina',min:3500,c:'platina'},{n:'Diamante',min:5500,c:'diamante'}];
const TITULOS=[[1,'Iniciante'],[5,'Em ritmo'],[10,'Constante'],[15,'Dedicado'],[20,'Atleta'],[30,'Fera'],[40,'Lenda']];
const xpNivel=n=>Math.round(150*Math.pow(n-1,1.9));
function nivelDe(xp){let n=1;while(xpNivel(n+1)<=xp)n++;const a=xpNivel(n),b=xpNivel(n+1);return {n,a,b,falta:b-xp,frac:Math.max(0,Math.min(1,(xp-a)/(b-a))),titulo:TITULOS.filter(t=>n>=t[0]).pop()[1]};}
function ligaDe(p){let i=0;LIGAS.forEach((l,k)=>{if(p>=l.min)i=k;});return Object.assign({},LIGAS[i],{i,prox:LIGAS[i+1]||null});}
// #region: regras-pontuacao
const perfil=()=>Object.assign({apelido:'',peso:75,meta:2},(S.config&&S.config.perfil)||{});
const nrm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
const ID_NOME={};Object.keys(LIB).forEach(k=>{ID_NOME[nrm(LIB[k].nome)]=k;});
const exIdDe=it=>(it.exId&&LIB[it.exId])?it.exId:(ID_NOME[nrm(it.nome)]||null);
const exChave=it=>exIdDe(it)||'nome:'+nrm(it.nome);
function pxDe(it){const id=exIdDe(it);if(id&&PX[id])return PX[id];return it.tipo==='tempo'?{s:.4,met:2.8}:it.semCarga?{r:1,met:3.8}:{r:1.5,met:3.5};}
const intensidade=p=>p.s?2:p.r>=2.6?5:p.r>=2?4:p.r>=1.5?3:p.r>=1?2:1;
const comCarga=it=>!it.semCarga&&it.tipo!=='tempo';
const repsEq=(it,x)=>it.tipo==='tempo'?0:(+x.reps||0)*(it.lado?2:1);
const cargaTot=(it,x)=>comCarga(it)?(+x.carga||0)*(it.porHalter?2:1):0;
/* fator de carga: raiz da carga relativa ao peso corporal (0,5 a 2). Sem carga registrada = 0,5. */
function fCarga(it,x,peso){const p=pxDe(it);if(!comCarga(it)||!p.ref)return 1;const c=cargaTot(it,x);if(c<=0)return .5;return Math.max(.5,Math.min(2,Math.sqrt(c/(p.ref*peso))));}
function ptsSerie(it,x,peso){const p=pxDe(it);return it.tipo==='tempo'?(p.s||.4)*(+x.reps||0):(p.r||1)*repsEq(it,x)*fCarga(it,x,peso);}
/* recordes: carga (maior carga ou maior 1RM estimado, Epley), repetições ou tempo */
function marcaDe(it,x){
  if(it.tipo==='tempo')return {tempo:+x.reps||0};
  if(!comCarga(it))return {reps:+x.reps||0};
  const c=cargaTot(it,x);if(c<=0)return null;return {carga:c,e1:c*(1+(+x.reps||0)/30)};
}
function melhorQue(m,b){
  if(!b)return false;
  if(m.tempo!=null)return b.tempo!=null&&m.tempo>b.tempo;
  if(m.carga!=null)return b.carga!=null&&(m.carga>b.carga||m.e1>b.e1+.01);
  return b.reps!=null&&m.reps>b.reps;
}
function juntaMarca(b,m){if(!b)return Object.assign({},m);const r=Object.assign({},b);['tempo','carga','e1','reps'].forEach(k=>{if(m[k]!=null)r[k]=Math.max(r[k]==null?-1:r[k],m[k]);});return r;}
const txtMarca=(it,x)=>it.tipo==='tempo'?`${x.reps} s`:comCarga(it)?`${fmtKg(x.carga)} kg × ${x.reps}${it.porHalter?' (cada halter)':''}`:`${x.reps} reps${LADO[it.lado]?' '+LADO[it.lado]:''}`;
/* tempo ativo: intervalo antes de cada série (máx. 5 min), base das calorias e do teste de ritmo */
function tempos(s,peso){
  const ls=[];(s.itens||[]).forEach(it=>(it.sets||[]).forEach(x=>ls.push({it,x,t:+x.t||0})));
  ls.sort((a,b)=>a.t-b.t);
  let prev=s.inicio,ativo=0,minimo=0,kcal=0;const circ=s.formato==='circuito';
  ls.forEach((o,k)=>{const work=o.it.tipo==='tempo'?(+o.x.reps||0):repsEq(o.it,o.x)*3;
    let gap=o.t&&prev?(o.t-prev)/1000:work+60;if(!(gap>=0))gap=work;gap=Math.min(gap,300);if(o.t)prev=o.t;
    ativo+=gap;minimo+=(o.it.tipo==='tempo'?(+o.x.reps||0):repsEq(o.it,o.x)*2)+(k?15:0);
    const met=circ?Math.max(MET_CIRC,pxDe(o.it).met):pxDe(o.it).met;kcal+=met*peso*gap/3600;});
  return {ativo,minimo,kcal};
}
const semEquip=s=>(s.itens||[]).some(it=>it.sets&&it.sets.length)&&(s.itens||[]).every(it=>{const id=exIdDe(it);return !id||!LIB[id].eq.length;});
function pontuar(s,best,vistos,mult,peso){
  const T=tempos(s,peso);let base=0,series=0,reps=0,ton=0;const prs=[],novos=[],linhas=[];
  (s.itens||[]).forEach(it=>{if(!it.sets||!it.sets.length)return;const k=exChave(it);let pi=0;
    it.sets.forEach(x=>{pi+=ptsSerie(it,x,peso);series++;reps+=repsEq(it,x);ton+=cargaTot(it,x)*(+x.reps||0);});
    base+=pi;linhas.push({nome:it.nome,p:Math.round(pi)});
    const ant=best[k];let pr=null;
    it.sets.forEach(x=>{const m=marcaDe(it,x);if(m&&melhorQue(m,ant)&&(!pr||melhorQue(m,pr.m)))pr={m,x};});
    if(!vistos.has(k))novos.push(it.nome);else if(pr)prs.push({nome:it.nome,txt:txtMarca(it,pr.x)});});
  const completo=(s.itens||[]).length>0&&s.itens.every(it=>(it.sets||[]).length>=it.series);
  const bonus=[];
  if(prs.length)bonus.push({t:prs.length>1?`${prs.length} recordes pessoais`:'Recorde pessoal',p:P_REC*prs.length});
  if(novos.length)bonus.push({t:novos.length>1?`${novos.length} exercícios novos`:'Exercício novo',p:P_NOVO*novos.length});
  if(completo&&series)bonus.push({t:s.formato==='circuito'?'Circuito completo':'Treino completo',p:P_COMPLETO});
  if(s.aqGuiado&&series)bonus.push({t:'Aquecimento guiado',p:P_AQ});
  const sub=base+bonus.reduce((a,b)=>a+b.p,0);
  const pl0=T.minimo>0?Math.min(1,T.ativo/T.minimo):1, plaus=pl0>=.9?1:pl0;
  return {base:Math.round(base),bonus,prs,novos,completo,mult,plaus,sub:Math.round(sub),
    total:Math.round(sub*mult*plaus),extraSeq:Math.round(sub*(mult-1)*plaus),series,reps,ton,kcal:T.kcal,ativo:T.ativo,minimo:T.minimo,linhas};
}
// #region: semanas-fichas
/* semanas começam na segunda; somar 8 dias e voltar à segunda evita erro em horário de verão */
const proxSeg=w=>segundaDe(w+8*DIA);
const segAntes=(w,i)=>segundaDe(w-i*7*DIA+12*36e5);
/* marcações da ficha (caminhadas e extras), com histórico por semana */
const fichasDe=c=>{const f=Object.assign({},c.fichas||{});if(c.semana&&c.semana.ini&&!f[c.semana.ini])f[c.semana.ini]=c.semana.k||{};return f;};
function semanaN(c,ini){const fs=sessoesDe(c);const i0=fs.length?segundaDe(fs[fs.length-1].fim):ini;return Math.round((ini-i0)/(7*DIA))+1;}
function camDa(c,ini){const pr=c.programa;if(!pr)return null;const n=semanaN(c,ini);const a=pr.caminhada||[];return a.find(f=>n>=f.de&&n<=f.ate)||a[a.length-1]||null;}
// #region: desafios-conquistas
/* desafios: 1 fixo (meta semanal) + 2 que mudam toda semana */
const DESAFIOS=[
  {id:'rec',t:'Bata 1 recorde pessoal',alvo:1,v:s=>s.prs,p:25},
  {id:'ser',t:'Complete 20 séries',alvo:20,v:s=>s.series,p:25},
  {id:'rep',t:'Faça 200 repetições',alvo:200,v:s=>s.reps,p:25},
  {id:'cmp',t:'Termine 2 treinos sem pular nada',alvo:2,v:s=>s.completos,p:25},
  {id:'novo',t:'Experimente um exercício novo',alvo:1,v:s=>s.novos,p:20},
  {id:'kcal',t:'Gaste 400 kcal treinando',alvo:400,v:s=>Math.round(s.kcalT),p:20},
  {id:'aq',t:'Faça 2 aquecimentos guiados',alvo:2,v:s=>s.aq,p:20,precisa:'aq'},
  {id:'cam',t:'Faça 3 caminhadas',alvo:3,v:s=>s.cam,p:20,precisa:'ficha'},
];
function desafiosDa(w,meta){
  const tem={aq:Object.values(S.treinos).some(t=>t.aquecimento&&t.aquecimento.length),ficha:Object.values(S.conjuntos).some(c=>c.programa)};
  const pool=DESAFIOS.filter(d=>!d.precisa||tem[d.precisa]),n=pool.length,i=Math.round(w/(7*DIA)),md=(x,m)=>((x%m)+m)%m;
  const a=md(i*5,n),b=(a+1+md(i,n-1))%n;
  return [{id:'meta',t:`Faça ${meta} ${meta===1?'treino':'treinos'} na semana`,alvo:meta,v:s=>s.treinos,p:30},pool[a],pool[b]];
}
const CONQ=[
  {id:'primeiro',t:'Primeiro treino',d:'Concluir o primeiro treino',p:25,ic:'flag',cat:'freq',ok:C=>C.treinos>=1},
  {id:'semana',t:'Semana cheia',d:'Bater a meta semanal',p:25,ic:'cal',cat:'freq',ok:C=>C.semanasCheias>=1},
  {id:'t10',t:'Dez treinos',d:'Concluir 10 treinos',p:50,ic:'flag',cat:'freq',ok:C=>C.treinos>=10},
  {id:'seq4',t:'Um mês firme',d:'4 semanas seguidas na meta',p:75,ic:'fire',cat:'seq',ok:C=>C.maxSeq>=4},
  {id:'seq12',t:'Três meses firme',d:'12 semanas seguidas na meta',p:200,ic:'fire',cat:'seq',ok:C=>C.maxSeq>=12},
  {id:'t50',t:'Cinquenta treinos',d:'Concluir 50 treinos',p:150,ic:'flag',cat:'freq',ok:C=>C.treinos>=50},
  {id:'pr1',t:'Primeiro recorde',d:'Bater um recorde pessoal',p:25,ic:'trophy',cat:'forca',ok:C=>C.prs>=1},
  {id:'pr10',t:'Recordista',d:'10 recordes pessoais',p:75,ic:'trophy',cat:'forca',ok:C=>C.prs>=10},
  {id:'ton1',t:'Uma tonelada',d:'Levantar 1.000 kg num treino',p:25,ic:'dumb',cat:'forca',ok:C=>C.tonMax>=1000},
  {id:'ton10',t:'Dez toneladas',d:'10 t levantadas no total',p:50,ic:'dumb',cat:'forca',ok:C=>C.ton>=1e4},
  {id:'ton100',t:'Cem toneladas',d:'100 t levantadas no total',p:150,ic:'dumb',cat:'forca',ok:C=>C.ton>=1e5},
  {id:'reps1k',t:'Mil repetições',d:'1.000 repetições no total',p:50,ic:'bolt',cat:'forca',ok:C=>C.reps>=1000},
  {id:'cmp10',t:'Sem pular nada',d:'10 treinos completos',p:50,ic:'check',cat:'freq',ok:C=>C.completos>=10},
  {id:'exp10',t:'Explorador',d:'Fazer 10 exercícios diferentes',p:40,ic:'cube',cat:'esp',ok:C=>C.exs>=10},
  {id:'casa',t:'Sem desculpas',d:'Concluir um treino sem equipamento',p:15,ic:'home',cat:'casa',ok:C=>C.semEq>=1},
  {id:'circ',t:'Circuito fechado',d:'Fazer todas as rodadas de um circuito',p:20,ic:'loop',cat:'casa',ok:C=>C.circuitos>=1},
  {id:'aq10',t:'Bem aquecido',d:'10 aquecimentos guiados',p:25,ic:'fire',cat:'casa',ok:C=>C.aq>=10},
  {id:'cam12',t:'Caminhante',d:'12 caminhadas marcadas',p:40,ic:'walk',cat:'casa',ok:C=>C.cam>=12},
  {id:'cedo',t:'Madrugador',d:'Concluir um treino antes das 7h',p:15,ic:'sun',cat:'esp',ok:C=>C.cedo>=1},
  {id:'noite',t:'Coruja',d:'Começar um treino depois das 21h',p:15,ic:'moon',cat:'esp',ok:C=>C.noite>=1},
];
// #region: jogo
const stVazia=()=>({treinos:0,prs:0,series:0,reps:0,aq:0,completos:0,novos:0,cam:0,kcal:0,kcalT:0,pts:0,feitos:{}});
let G=null;
function jogo(){
  if(G)return G;
  const pf=perfil(),peso=+pf.peso||75,meta=Math.max(1,Math.round(+pf.meta||2)),agora=Date.now(),segAgora=segundaDe(agora);
  const ss=Object.values(S.sessoes).filter(s=>s.status==='concluida'&&s.fim).sort((a,b)=>a.fim-b.fim);
  const marcas=[];
  Object.values(S.conjuntos).forEach(c=>{if(!c.programa)return;const fx=fichasDe(c);
    Object.keys(fx).forEach(ini=>{const k=fx[ini]||{};Object.keys(k).forEach(key=>{if(!k[key]||!/^(cam|x)\d+$/.test(key))return;
      const t=typeof k[key]==='number'&&k[key]>1e12?k[key]:+ini+12*36e5;const cam=camDa(c,+ini);
      marcas.push({t,tipo:key.startsWith('cam')?'cam':'extra',min:cam?cam.min:20});});});});
  const nSem={};ss.forEach(s=>{const w=segundaDe(s.fim);nSem[w]=(nSem[w]||0)+1;});
  /* sequência de semanas na meta; a cada 4 semanas seguidas ganha 1 escudo (máx. 2), que salva uma semana fraca */
  const seqAntes={};let seq=0,escudos=0,cs=0;const usados=[];
  const ini0=Math.min(segAgora,ss.length?segundaDe(ss[0].fim):segAgora);
  for(let w=ini0,g=0;w<=segAgora&&g<600;w=proxSeg(w),g++){seqAntes[w]=seq;if(w===segAgora)break;
    if((nSem[w]||0)>=meta){seq++;cs++;if(cs%4===0&&escudos<2)escudos++;}
    else if(escudos>0&&seq>0){escudos--;usados.push(w);}else{seq=0;cs=0;}}
  const best={},vistos=new Set(),ev=[],porSessao={},W={},ganhos={};
  const C={treinos:0,prs:0,ton:0,tonMax:0,reps:0,cedo:0,noite:0,semEq:0,circuitos:0,aq:0,exs:0,completos:0,cam:0,semanasCheias:0,maxSeq:0};
  const wst=w=>W[w]||(W[w]=stVazia());
  const fila=ss.map(s=>({t:s.fim,s})).concat(marcas).sort((a,b)=>a.t-b.t);
  for(const o of fila){
    const w=segundaDe(o.t),st=wst(w),ref=o.s?o.s.id:null;
    if(o.s){const s=o.s,mult=1+.05*Math.min(5,seqAntes[w]||0),r=pontuar(s,best,vistos,mult,+s.pesoCorp||peso);porSessao[s.id]=r;
      s.itens.forEach(it=>{if(!it.sets||!it.sets.length)return;const k=exChave(it);vistos.add(k);it.sets.forEach(x=>{const m=marcaDe(it,x);if(m)best[k]=juntaMarca(best[k],m);});});
      ev.push({t:s.fim,p:r.total,tipo:'treino',txt:s.treinoNome,ref});
      st.treinos++;st.prs+=r.prs.length;st.series+=r.series;st.reps+=r.reps;st.kcal+=r.kcal;st.kcalT+=r.kcal;st.novos+=r.novos.length;st.pts+=r.total;
      if(s.aqGuiado){st.aq++;C.aq++;}if(r.completo){st.completos++;C.completos++;}
      C.treinos++;C.prs+=r.prs.length;C.ton+=r.ton;C.tonMax=Math.max(C.tonMax,r.ton);C.reps+=r.reps;C.exs=vistos.size;
      if(new Date(s.fim).getHours()<7)C.cedo++;if(new Date(s.inicio).getHours()>=21)C.noite++;
      if(semEquip(s))C.semEq++;if(s.formato==='circuito'&&r.completo)C.circuitos++;
      if(st.treinos===meta)C.semanasCheias++;
      C.maxSeq=Math.max(C.maxSeq,(seqAntes[w]||0)+(st.treinos>=meta?1:0));
    }else{const p=o.tipo==='cam'?P_CAM:P_EXTRA;
      ev.push({t:o.t,p,tipo:o.tipo,txt:o.tipo==='cam'?`Caminhada de ${o.min} min`:'Registro de peso e cintura'});
      if(o.tipo==='cam'){st.cam++;C.cam++;st.kcal+=MET_CAM*peso*o.min/60;}}
    desafiosDa(w,meta).forEach(d=>{if(st.feitos[d.id]||d.v(st)<d.alvo)return;st.feitos[d.id]=o.t;ev.push({t:o.t,p:d.p,tipo:'desafio',txt:'Desafio: '+d.t,ref});});
    CONQ.forEach(q=>{if(ganhos[q.id]||!q.ok(C))return;ganhos[q.id]={t:o.t,ref};ev.push({t:o.t,p:q.p,tipo:'conquista',txt:'Conquista: '+q.t,ref,id:q.id});});
  }
  const soma=a=>a.reduce((x,e)=>x+e.p,0);
  const xp=soma(ev),p28=soma(ev.filter(e=>e.t>agora-JANELA)),expira7=soma(ev.filter(e=>e.t>agora-JANELA&&e.t<=agora-JANELA+7*DIA));
  const semanas=[];for(let i=7;i>=0;i--){const w=segAntes(segAgora,i);const fimW=proxSeg(w);
    semanas.push({w,pts:soma(ev.filter(e=>e.t>=w&&e.t<fimW)),kcal:Math.round((W[w]||stVazia()).kcal),treinos:(W[w]||stVazia()).treinos});}
  const stA=wst(segAgora),seqAtual=(seqAntes[segAgora]||0)+(stA.treinos>=meta?1:0);
  G={peso,meta,pf,agora,xp,nivel:nivelDe(xp),p28,liga:ligaDe(p28),expira7,seq:seqAtual,seqAntes:seqAntes[segAgora]||0,escudos,usados,
    multAgora:1+.05*Math.min(5,seqAntes[segAgora]||0),semana:stA,
    desafios:desafiosDa(segAgora,meta).map(d=>Object.assign({},d,{atual:Math.min(d.alvo,d.v(stA)),feito:stA.feitos[d.id]})),
    conquistas:CONQ.map(q=>Object.assign({},q,{ganho:ganhos[q.id]||null})),ev:ev.slice().sort((a,b)=>b.t-a.t),porSessao,best,vistos,semanas,C,
    kcal28:Math.round(Object.keys(W).filter(w=>+w>=segAntes(segAgora,3)).reduce((a,w)=>a+W[w].kcal,0))};
  return G;
}
// #region: estimativas
/* pontos de uma sessão em andamento (ao vivo) */
function pontosAoVivo(s){const g=jogo();return pontuar(s,g.best,g.vistos,g.multAgora,+s.pesoCorp||g.peso);}
/* estimativa de pontos de um treino (para mostrar antes de começar) */
function estimaPts(t){const g=jogo();let p=0;(t.itens||[]).forEach(it=>{const u=ultimaVez(it);const x=u&&u.sets[0]?u.sets[0]:{carga:0,reps:Math.round(((+it.min||0)+(+it.max||0))/2)};
  const mid=Math.round(((+it.min||0)+(+it.max||0))/2);const y=Object.assign({},x,{reps:mid});if(!u&&comCarga(it)){const px=pxDe(it);y.carga=px.ref?px.ref*g.peso/(it.porHalter?2:1):0;}
  p+=(+it.series||0)*ptsSerie(it,y,g.peso);});return Math.round(p);}
// #region: formatacao
const fmtN=n=>Math.round(n).toLocaleString('pt-BR');
const fmtTon=kg=>kg>=1000?(Math.round(kg/100)/10).toLocaleString('pt-BR')+' t':fmtN(kg)+' kg';
const COMPARA=[[600,'um piano de cauda'],[1000,'um carro popular'],[2300,'um rinoceronte'],[6000,'um elefante-africano'],[12000,'um ônibus'],[30000,'uma baleia-jubarte'],[41000,'um Boeing 737 vazio']];
function comparacao(kg){let r=null;COMPARA.forEach(c=>{if(kg>=c[0])r=c;});if(!r)return '';const x=kg/r[0];return x>=1.95?`≈ ${Math.floor(x)} × ${r[1]}`:`≈ ${r[1]}`;}

// #region: icones
/* ---------- Ícones da gamificação ---------- */
const gic={
  bolt:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.6 4M16 6h3.5a3 3 0 0 1-3.6 4M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/></svg>',
  shield:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M12 3l7 3v5.5c0 4.3-3 8-7 9.5-4-1.5-7-5.2-7-9.5V6z"/></svg>',
  flag:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M6 21V4M6 4.5c4-2 6 2 12 0v8c-6 2-8-2-12 0"/></svg>',
  cal:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M9 14.5l2 2 4-4"/></svg>',
  home:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M4 11l8-7 8 7M6.5 9.5V20h11V9.5M10 20v-5h4v5"/></svg>',
  sun:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M5.6 10.6l2 1.6M18.4 10.6l-2 1.6"/></svg>',
  moon:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/></svg>',
  user:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
  users:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M14 19.5a4.5 4.5 0 0 1 7 0"/></svg>',
  target:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
};
const gIcon=k=>gic[k]||icon[k]||icon.check;
const ligaIc=l=>`<span class="liga-ic ${l.c}">${gic.shield}</span>`;

// #region: telas-placar
/* ---------- Card do placar (Início) ---------- */
function vPlacarCard(){
  const g=jogo(),nv=g.nivel;
  return `<a class="card placar" href="#pontos" aria-label="Pontos e conquistas: nível ${nv.n}, ${fmtN(g.p28)} pontos nos últimos 28 dias">
    <span class="lvl" style="--f:${nv.frac}"><b>${nv.n}</b><small>nível</small></span>
    <span class="pl-b"><span class="pl-t"><b>${esc(nv.titulo)}</b><span class="tr-m">${fmtN(g.xp)} XP · faltam ${fmtN(nv.falta)} para o nível ${nv.n+1}</span></span>
      <span class="xpbar"><i style="width:${Math.round(nv.frac*100)}%"></i></span>
      <span class="pl-row"><span>${ligaIc(g.liga)}<b>${fmtN(g.p28)}</b> pts · ${esc(g.liga.n)}</span><span class="${g.seq?'hot':''}">${icon.fire}<b>${g.seq}</b> ${g.seq===1?'semana':'semanas'}</span><span>${icon.fire.replace('class="ic"','class="ic kc"')}<b>${fmtN(g.semana.kcal)}</b> kcal</span></span></span>${icon.chev}</a>`;
}

// #region: telas-jornada
/* ---------- Página "Minha jornada" (#pontos) ---------- */
function vJornada(){
  const g=jogo(),nv=g.nivel,pf=g.pf,lg=g.liga;
  let h=`<div class="navrow"><a class="back" href="#">${icon.back}Meus treinos</a>${themeBtn()}</div>${vStatus()}
    <header class="top"><span class="eyebrow">Pontos e conquistas</span><h1>Minha jornada</h1>
    <button class="perfil-l" data-act="perfil">${gic.user}<span>${esc(pf.apelido||'Definir nome')} · ${fmtKg(g.peso)} kg · meta ${g.meta}×/semana</span>${icon.edit}</button></header>`;
  h+=`<section class="hero nivel"><div class="nv-top"><span class="lvl big" style="--f:${nv.frac}"><b>${nv.n}</b><small>nível</small></span>
      <div><span class="eyebrow">${esc(nv.titulo)}</span><h2>${fmtN(g.xp)} XP</h2><p class="small">Faltam <b>${fmtN(nv.falta)}</b> XP para o nível ${nv.n+1}. XP nunca expira.</p></div></div>
      <div class="xpbar"><i style="width:${Math.round(nv.frac*100)}%"></i></div></section>`;
  h+=`<div class="gstats">
    <div class="card gs"><span class="eyebrow">Liga · 28 dias</span><span class="gs-v">${ligaIc(lg)}<b>${fmtN(g.p28)}</b></span><span class="gs-n">${esc(lg.n)}${lg.prox?` · faltam ${fmtN(lg.prox.min-g.p28)} para ${esc(lg.prox.n)}`:' · topo da tabela'}</span>${g.expira7?`<span class="gs-x">${fmtN(g.expira7)} pts vencem nos próximos 7 dias</span>`:''}</div>
    <div class="card gs"><span class="eyebrow">Sequência</span><span class="gs-v ${g.seq?'hot':''}">${icon.fire}<b>${g.seq}</b></span><span class="gs-n">${g.seq===1?'semana':'semanas'} na meta · bônus ×${String(g.multAgora.toFixed(2)).replace('.',',')}</span><span class="gs-x">${gic.shield}${g.escudos} ${g.escudos===1?'escudo':'escudos'} · esta semana ${g.semana.treinos}/${g.meta}</span></div>
    <div class="card gs"><span class="eyebrow">Calorias</span><span class="gs-v">${icon.fire.replace('class="ic"','class="ic kc"')}<b>${fmtN(g.semana.kcal)}</b></span><span class="gs-n">kcal nesta semana</span><span class="gs-x">${fmtN(g.kcal28)} kcal em 4 semanas · estimativa</span></div>
    <div class="card gs"><span class="eyebrow">Total levantado</span><span class="gs-v">${icon.dumb}<b>${fmtTon(g.C.ton)}</b></span><span class="gs-n">${fmtN(g.C.reps)} repetições · ${g.C.treinos} treinos</span><span class="gs-x">${esc(comparacao(g.C.ton))||'&nbsp;'}</span></div></div>`;
  /* desafios */
  h+=`<section class="sec"><div class="sec-h"><h3>Desafios da semana</h3><span class="small">renovam na segunda</span></div><div class="desafios">`;
  g.desafios.forEach(d=>{h+=`<div class="card desf${d.feito?' ok':''}"><span class="desf-ic">${d.feito?icon.check:gic.target}</span><span class="desf-b"><b>${esc(d.t)}</b><span class="dbar"><i style="width:${Math.round(d.atual/d.alvo*100)}%"></i></span><span class="tr-m">${fmtN(d.atual)}/${fmtN(d.alvo)}</span></span><em>+${d.p}</em></div>`;});
  h+=`</div></section>`;
  /* gráfico semanal: uma série, barras finas, rótulo só na semana atual e na maior */
  const mx=Math.max(1,...g.semanas.map(s=>s.pts)),iMax=g.semanas.reduce((a,s,i,arr)=>s.pts>arr[a].pts?i:a,0);
  h+=`<section class="sec"><div class="sec-h"><h3>Pontos por semana</h3><span class="small">últimas 8 semanas</span></div><div class="card wchart" role="img" aria-label="Pontos por semana nas últimas 8 semanas: ${g.semanas.map(s=>fmtN(s.pts)).join(', ')}">
    <div class="wc-plot">${g.semanas.map((s,i)=>{const d=new Date(s.w);const lb=`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;const cur=i===g.semanas.length-1;
      return `<button class="wc-col${cur?' cur':''}" data-act="wtip" data-tip="Semana de ${lb}: ${fmtN(s.pts)} pts · ${s.treinos} ${s.treinos===1?'treino':'treinos'} · ${fmtN(s.kcal)} kcal" aria-label="Semana de ${lb}: ${fmtN(s.pts)} pontos">
        ${(cur||i===iMax)&&s.pts?`<em>${fmtN(s.pts)}</em>`:''}<i style="height:${s.pts?Math.max(3,Math.round(s.pts/mx*82)):0}%"></i></button>`;}).join('')}</div>
    <div class="wc-x" aria-hidden="true">${g.semanas.map((s,i)=>{const d=new Date(s.w);return `<span${i===g.semanas.length-1?' class="cur"':''}>${i===g.semanas.length-1?'agora':String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')}</span>`;}).join('')}</div>
    <p class="wc-tip small" id="wcTip">Toque numa barra para ver a semana.</p></div></section>`;
  /* recordes */
  const peso=k=>{const p=PX[k];return p?(p.r||p.s*3):0;};
  const recs=Object.keys(g.best).map(k=>({k,m:g.best[k]})).filter(o=>o.m.carga||o.m.reps||o.m.tempo).sort((a,b)=>peso(b.k)-peso(a.k));
  if(recs.length){h+=`<section class="sec"><div class="sec-h"><h3>Recordes pessoais</h3><span class="small">${recs.length} exercícios</span></div><div class="card recs">`;
    (ui.recAll?recs:recs.slice(0,6)).forEach(o=>{const id=o.k.startsWith('nome:')?null:o.k;const nome=id?LIB[id].nome:o.k.slice(5);
      const v=o.m.tempo!=null?`${o.m.tempo} s`:o.m.carga!=null?`${fmtKg(o.m.carga)} kg <small>1RM estimado ${fmtKg(Math.round(o.m.e1))} kg</small>`:`${o.m.reps} reps`;
      h+=`<div class="rec"><span>${gic.trophy}</span><b>${esc(nome)}</b><span class="rec-v">${v}</span></div>`;});
    h+=`</div>${recs.length>6&&!ui.recAll?`<button class="link" data-act="recAll">Ver todos os recordes</button>`:''}</section>`;}
  /* conquistas */
  const nG=g.conquistas.filter(q=>q.ganho).length;
  h+=`<section class="sec"><div class="sec-h"><h3>Conquistas</h3><span class="small">${nG} de ${g.conquistas.length}</span></div><div class="medalhas">`;
  g.conquistas.forEach(q=>{h+=`<div class="medalha ${q.cat}${q.ganho?' on':''}" title="${esc(q.d)} · +${q.p} XP"><span class="bd-ic">${gIcon(q.ic)}</span><b>${esc(q.t)}</b><span>${q.ganho?dataCurta(q.ganho.t):esc(q.d)}</span></div>`;});
  h+=`</div></section>`;
  /* extrato */
  if(g.ev.length){h+=`<section class="sec"><div class="sec-h"><h3>Extrato de pontos</h3></div><div class="card extrato">`;
    (ui.extratoAll?g.ev:g.ev.slice(0,8)).forEach(e=>{const vale=e.t>g.agora-JANELA;h+=`<${e.ref?`a href="#resumo/${enc(e.ref)}"`:'div'} class="exl${vale?'':' venc'}"><span class="exl-b"><b>${esc(e.txt)}</b><span class="tr-m">${dataCurta(e.t)}${vale?` · vale até ${dataCurta(e.t+JANELA)}`:' · fora da liga, só XP'}</span></span><em>+${fmtN(e.p)}</em></${e.ref?'a':'div'}>`;});
    h+=`</div>${g.ev.length>8&&!ui.extratoAll?`<button class="link" data-act="extratoAll">Ver todo o extrato (${g.ev.length})</button>`:''}</section>`;}
  /* ranking (futuro) */
  h+=`<section class="card futuro">${gic.users}<span class="tr-b"><span class="tr-n">Ranking com amigos</span><span class="tr-m">Em breve: cada pessoa com seus treinos, uma liga de 28 dias em comum e duelos semanais. A regra de pontos abaixo já é a mesma para todos.</span></span></section>`;
  h+=vRegras(g);
  return h+footNote();
}
function vRegras(g){
  const ids=Object.keys(LIB).filter(k=>PX[k]).sort((a,b)=>(PX[b].r||PX[b].s*3)-(PX[a].r||PX[a].s*3));
  return `<details class="card guide regras"><summary><span class="tr-n">Como funciona a pontuação</span>${icon.chev}</summary><div class="g-body">
    <p><b>Pontos de cada série</b> = repetições × pontos por repetição do exercício × fator de carga. Exercícios por lado contam os dois lados. Na prancha, 0,5 ponto por segundo.</p>
    <p><b>Fator de carga</b>: raiz quadrada da carga dividida pela carga de referência do exercício (uma fração do seu peso corporal), entre 0,5 e 2. Carga em relação ao peso do corpo deixa a comparação justa entre pessoas de tamanhos diferentes. Série sem carga registrada vale 0,5.</p>
    <p><b>Bônus do treino</b>: recorde pessoal +${P_REC} por exercício (maior carga, maior 1RM estimado, mais repetições ou mais tempo) · exercício novo +${P_NOVO} · treino completo +${P_COMPLETO} · aquecimento guiado +${P_AQ}. A <b>sequência</b> multiplica o treino: +5% por semana seguida na meta, até +25%.</p>
    <p><b>Fora do treino</b>: caminhada marcada na ficha +${P_CAM} · registro de peso e cintura +${P_EXTRA} · desafios da semana +20 a +30 · conquistas +15 a +200.</p>
    <p><b>Nível e liga</b>: cada nível pede um pouco mais de XP que o anterior. Ligas pelos pontos dos últimos 28 dias: ${LIGAS.map(l=>`${l.n} ${fmtN(l.min)}`).join(' · ')}.</p>
    <p><b>Validade</b>: XP é para sempre e define o nível. A <b>liga</b> soma só os pontos dos últimos 28 dias: parou de treinar, os pontos vão vencendo. A sequência quebra quando uma semana termina abaixo da meta, a não ser que você tenha um <b>escudo</b> (ganha 1 a cada 4 semanas seguidas, guarda até 2).</p>
    <p><b>Ritmo</b>: séries registradas mais rápido do que é possível executar (menos de ~2 s por repetição e 15 s entre séries) valem proporcionalmente menos.</p>
    <p><b>Calorias</b>: estimativa pelo método MET do Compendium of Physical Activities 2024: MET do exercício × peso (${fmtKg(g.peso)} kg) × tempo ativo (intervalo antes de cada série, até 5 min). Circuito usa no mínimo 5,0 MET; caminhada 3,8. Pode errar para mais ou para menos.</p>
    <table class="ptab"><thead><tr><th>Exercício</th><th>Intensidade</th><th>pts/rep</th><th>Ref.</th></tr></thead><tbody>
    ${ids.map(k=>{const p=PX[k],n=intensidade(p);return `<tr><td>${esc(LIB[k].nome)}</td><td><span class="intens" aria-label="${n} de 5">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5-n)}</span></td><td>${p.s?String(p.s).replace('.',',')+'/s':String(p.r).replace('.',',')}</td><td>${p.ref?String(p.ref).replace('.',',')+'× peso':'corpo'}</td></tr>`;}).join('')}
    </tbody></table></div></details>`;
}
// #region: intensidade-tag
/* tag de intensidade (biblioteca e folha de adicionar) */
function intensTag(id){const p=PX[id];if(!p)return '';const n=intensidade(p);return `<span class="intens" title="Intensidade ${n} de 5 · ${p.s?String(p.s).replace('.',',')+' pt por segundo':String(p.r).replace('.',',')+' pts por repetição'}" aria-label="Intensidade ${n} de 5">${gic.bolt}${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5-n)}</span>`;}

// #region: telas-resumo
/* ---------- Resumo: pontos do treino ---------- */
function vPontosResumo(s){
  const g=jogo(),r=g.porSessao[s.id];if(!r)return '';
  const extras=g.ev.filter(e=>e.ref===s.id&&e.tipo!=='treino');
  const xpAntes=g.ev.filter(e=>e.t<s.fim&&e.ref!==s.id).reduce((a,e)=>a+e.p,0), xpDepois=xpAntes+r.total+extras.reduce((a,e)=>a+e.p,0);
  const n0=nivelDe(xpAntes),n1=nivelDe(xpDepois),subiu=n1.n>n0.n, festa=subiu||r.prs.length||extras.some(e=>e.tipo==='conquista');
  let h=`<section class="card ptsres${festa?' festa':''}" data-festa="${festa?s.id:''}"><div class="pr-top"><span class="eyebrow">Pontos do treino</span><b class="pr-big" data-count="${r.total}">+${fmtN(r.total)}</b>
    <span class="pr-kc">${icon.fire.replace('class="ic"','class="ic kc"')}≈ ${fmtN(r.kcal)} kcal · ${hhmm(r.ativo)} ativos</span></div>
    <ul class="pr-lines"><li><span>${r.series} séries · ${fmtN(r.reps)} reps${r.ton?' · '+fmtTon(r.ton):''}</span><b>${fmtN(r.base)}</b></li>
    ${r.bonus.map(b=>`<li><span>${esc(b.t)}</span><b>+${b.p}</b></li>`).join('')}
    ${r.mult>1?`<li class="hot"><span>${icon.fire}Sequência ×${String(r.mult.toFixed(2)).replace('.',',')}</span><b>+${fmtN(r.extraSeq)}</b></li>`:''}
    ${r.plaus<1?`<li class="warn"><span>Séries registradas rápido demais (${hhmm(r.ativo)} para ${r.series} séries) · ×${String(r.plaus.toFixed(2)).replace('.',',')}</span><b>−${fmtN(Math.round(r.sub*r.mult)-r.total)}</b></li>`:''}
    ${extras.map(e=>`<li class="ext"><span>${e.tipo==='conquista'?gic.trophy:gic.target}${esc(e.txt)}</span><b>+${e.p}</b></li>`).join('')}</ul>`;
  if(r.prs.length)h+=`<div class="pr-recs">${r.prs.map(p=>`<span>${gic.trophy}<b>${esc(p.nome)}</b> ${esc(p.txt)}</span>`).join('')}</div>`;
  h+=`<div class="pr-lvl"><span class="lvl sm" style="--f:${n1.frac}"><b>${n1.n}</b></span><span class="tr-b"><b>${subiu?`Subiu para o nível ${n1.n}!`:`Nível ${n1.n} · ${esc(n1.titulo)}`}</b><span class="xpbar"><i style="width:${Math.round(n1.frac*100)}%"></i></span><span class="tr-m">${fmtN(xpDepois)} XP · faltam ${fmtN(n1.falta)} para o nível ${n1.n+1}</span></span></div>
    <a class="link" href="#pontos">Ver minha jornada</a></section>`;
  return h;
}
// #region: animacoes
/* animações: contagem do número e confete (respeita "reduzir movimento") */
const calmo=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function animaResumo(){
  const el=document.querySelector('#resumoView .pr-big[data-count]');if(!el)return;const id=ui.resumoId;
  if(ui.animado===id||calmo())return;ui.animado=id;const alvo=+el.dataset.count,t0=performance.now();
  const f=now=>{const k=Math.min(1,(now-t0)/900),e=1-Math.pow(1-k,3);el.textContent='+'+fmtN(alvo*e);if(k<1)requestAnimationFrame(f);};requestAnimationFrame(f);
  const card=el.closest('.ptsres');if(card&&card.dataset.festa)confete(card);
}
function confete(host){if(calmo())return;const cores=['var(--accent)','var(--orange)','var(--conc)','var(--yellow)','var(--purple)','var(--red)'];
  const w=document.createElement('div');w.className='confete';w.setAttribute('aria-hidden','true');
  for(let i=0;i<36;i++){const p=document.createElement('i');p.style.left=(Math.random()*100)+'%';p.style.background=cores[i%cores.length];p.style.animationDelay=(Math.random()*.35)+'s';p.style.setProperty('--dx',(Math.random()*80-40)+'px');p.style.setProperty('--r',(Math.random()*720-360)+'deg');w.appendChild(p);}
  host.appendChild(w);setTimeout(()=>w.remove(),2600);}
/* "+N" subindo do botão ao concluir uma série */
function voaPontos(n,extra){if(!n)return;const b=document.querySelector('#sbarPts')||document.querySelector('#appView .chk:focus')||null;
  const r=b?b.getBoundingClientRect():{left:innerWidth/2,top:innerHeight*.35,width:0,height:0};
  const e=document.createElement('div');e.className='voa'+(extra?' rec':'');e.innerHTML=`${gic.bolt}+${n}${extra?` <small>${esc(extra)}</small>`:''}`;
  e.style.left=Math.max(70,Math.min(innerWidth-70,r.left+r.width/2))+'px';e.style.top=(b?r.top+r.height+70:r.top)+'px';document.body.appendChild(e);setTimeout(()=>e.remove(),1600);}

// #region: perfil
/* ---------- Perfil ---------- */
function sheetPerfil(){
  const x=perfil();
  const draw=()=>`<h3>Meu perfil</h3>
    <label class="fld"><span>Nome no placar</span><input data-k="apelido" value="${esc(x.apelido||'')}" placeholder="Como você quer aparecer no ranking"></label>
    <div class="grid2"><label class="fld"><span>Peso corporal (kg)</span><input data-k="peso" inputmode="decimal" value="${fmtKg(x.peso)}"></label><span></span></div>
    <small class="fhint">O peso entra nas calorias e no fator de carga (carga em relação ao peso do corpo, para comparar pessoas diferentes de forma justa).</small>
    <div class="fld"><span>Meta semanal de treinos</span><div class="chips">${[1,2,3,4,5,6].map(v=>`<button data-act="meta" data-v="${v}" aria-pressed="${+x.meta===v}">${v}×</button>`).join('')}</div>
      <small class="fhint">Bater a meta mantém a sequência e o bônus de até +25%.</small></div>
    <div class="sheet-btns"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn primary" data-act="save">Salvar</button></div>`;
  openSheet(draw(),(a,b)=>{
    if(a==='input'){const k=b.dataset.k;if(k==='peso')x.peso=parseNum(b.value);else if(k)x[k]=b.value;return;}
    if(a==='meta'){x.meta=+b.dataset.v;$('#sheet').innerHTML=draw();return;}
    if(a==='save'){const p={apelido:String(x.apelido||'').trim().slice(0,30),peso:Math.max(30,Math.min(250,+x.peso||75)),meta:Math.max(1,Math.min(7,+x.meta||2))};
      put('config','programa',Object.assign(clone(S.config||{}),{perfil:p}));closeSheet();toast('Perfil salvo');}
  });
}
