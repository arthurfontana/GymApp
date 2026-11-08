/* =====================================================================================
   JORNADA DE TREINO — treinos, sessão ao vivo (séries + descanso), resumo e histórico
   Dados: capacidade `db` da página (sincroniza entre aparelhos). Sem ela, localStorage.
   ===================================================================================== */
(function(){
// #region: utilitarios
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtKg=v=>{if(v==null||v==='')return '–';const n=Math.round(+v*100)/100;return String(n).replace('.',',');};
const parseNum=s=>{const n=parseFloat(String(s).replace(',','.'));return isFinite(n)?n:0;};
const mmss=sec=>{sec=Math.max(0,Math.round(sec));const m=Math.floor(sec/60),s=sec%60;return m+':'+String(s).padStart(2,'0');};
const hhmm=sec=>{sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const clone=o=>JSON.parse(JSON.stringify(o));
const DIAS=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const dataCurta=ms=>{const d=new Date(ms);return `${DIAS[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;};
function haQuanto(ms){const h=(Date.now()-ms)/36e5;if(h<1)return 'agora há pouco';if(h<24)return `há ${Math.round(h)} h`;const d=Math.round(h/24);return d===1?'ontem':`há ${d} dias`;}

// #region: lib-catalogo
/* ---------- Biblioteca (exercícios com demonstração 3D) ---------- */
const LIB={
  'supino-inclinado':{nome:'Supino inclinado com halteres',grupo:'Peito',foco:'Peitoral superior e tríceps',passo:1,porHalter:true,principal:true,eq:['banco','halteres'],eqTxt:'Banco e halteres'},
  'supino-maquina':{nome:'Supino na máquina',grupo:'Peito',foco:'Peitoral, tríceps e ombros',passo:5,principal:true,eq:['maquina'],eqTxt:'Máquina de supino'},
  'leg-press-45':{nome:'Leg press 45°',grupo:'Pernas',foco:'Quadríceps e glúteos',passo:5,principal:true,eq:['maquina'],eqTxt:'Máquina de leg press'},
  'stiff-halteres':{nome:'Stiff com halteres',grupo:'Pernas',foco:'Posterior de coxa e glúteos',passo:1,porHalter:true,principal:true,eq:['halteres'],eqTxt:'Halteres'},
  'agachamento-goblet':{nome:'Agachamento goblet',grupo:'Pernas',foco:'Quadríceps e glúteos',passo:1,principal:true,eq:['halteres'],eqTxt:'1 halter'},
  'mesa-flexora':{nome:'Mesa flexora',grupo:'Pernas',foco:'Posterior de coxa',passo:2.5,eq:['maquina'],eqTxt:'Mesa flexora'},
  'panturrilha-em-pe':{nome:'Panturrilha em pé',grupo:'Pernas',foco:'Panturrilhas',passo:2.5,eq:['maquina'],eqTxt:'Máquina de panturrilha'},
  'elevacao-pelvica':{nome:'Elevação pélvica',grupo:'Pernas',foco:'Glúteos e posterior de coxa',passo:5,principal:true,eq:['barra','banco'],eqTxt:'Barra, anilhas e banco'},
  'remada-sentada':{nome:'Remada sentada',grupo:'Costas',foco:'Costas e bíceps',passo:2.5,principal:true,eq:['polia'],eqTxt:'Polia baixa'},
  'puxada-alta':{nome:'Puxada alta',grupo:'Costas',foco:'Costas e bíceps',passo:2.5,principal:true,eq:['polia'],eqTxt:'Polia alta'},
  'elevacao-lateral':{nome:'Elevação lateral',grupo:'Ombros',foco:'Ombros',passo:1,porHalter:true,eq:['halteres'],eqTxt:'Halteres'},
  'triceps-polia':{nome:'Tríceps na polia',grupo:'Braços',foco:'Tríceps',passo:2.5,eq:['polia'],eqTxt:'Polia alta e corda'},
  'rosca-biceps':{nome:'Rosca bíceps',grupo:'Braços',foco:'Bíceps',passo:1,porHalter:true,eq:['halteres'],eqTxt:'Halteres'},
  'prancha':{nome:'Prancha abdominal',grupo:'Core',foco:'Estabilidade do core',tipo:'tempo',semCarga:true,eq:[],eqTxt:'Sem equipamento'},
  'flexao-joelhos':{nome:'Flexão com joelhos apoiados',grupo:'Peito',foco:'Peitoral, tríceps e ombros',semCarga:true,principal:true,eq:[],eqTxt:'Sem equipamento'},
  'flexao-parede':{nome:'Flexão na parede',grupo:'Peito',foco:'Peitoral, tríceps e ombros',semCarga:true,eq:[],eqTxt:'Sem equipamento'},
  'agachamento-livre':{nome:'Agachamento livre',grupo:'Pernas',foco:'Quadríceps e glúteos',semCarga:true,principal:true,eq:[],eqTxt:'Sem equipamento'},
  'afundo-tras':{nome:'Afundo para trás',grupo:'Pernas',foco:'Quadríceps e glúteos (cada perna)',semCarga:true,principal:true,lado:'perna',eq:[],eqTxt:'Sem equipamento'},
  'bom-dia':{nome:'Bom dia sem carga',grupo:'Pernas',foco:'Posterior de coxa e glúteos',semCarga:true,eq:[],eqTxt:'Sem equipamento'},
  'ponte-gluteos':{nome:'Ponte de glúteos',grupo:'Pernas',foco:'Glúteos',semCarga:true,eq:[],eqTxt:'Sem equipamento'},
  'bird-dog':{nome:'Bird dog',grupo:'Core',foco:'Estabilidade do core (cada lado)',semCarga:true,lado:'lado',eq:[],eqTxt:'Sem equipamento'},
  'dead-bug':{nome:'Dead bug',grupo:'Core',foco:'Estabilidade do core (cada lado)',semCarga:true,lado:'lado',eq:[],eqTxt:'Sem equipamento'},
};
const GRUPOS=['Peito','Pernas','Costas','Ombros','Braços','Core'];
/* equipamento: categorias para os resumos dos treinos */
const EQ={maquina:'Máquina',polia:'Polia',barra:'Barra',halteres:'Halteres',banco:'Banco'};
const EQ_ORD=Object.keys(EQ);
window.__LIB_IDS=Object.keys(LIB);

// #region: estado
/* ---------- Estado ---------- */
const S={mode:'loading',ready:false,conjuntos:{},treinos:{},sessoes:{},config:null,note:'',saveErr:false,readOnly:false};
const ui={view:'home',conjuntoId:null,treinoId:null,resumoId:null,draft:{},histAll:false,stopwatch:null,lastHash:''};
let db=null;
const LS={get(k,d){try{const v=localStorage.getItem('mt3d.'+k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem('mt3d.'+k,JSON.stringify(v));}catch(e){}}};

// #region: armazenamento
/* ---------- Armazenamento ---------- */
const wq={};
function saveLocal(){if(S.mode!=='local')return;LS.set('conjuntos',S.conjuntos);LS.set('treinos',S.treinos);LS.set('sessoes',S.sessoes);LS.set('config',S.config);}
function put(col,id,data){
  if(col==='config')S.config=data;else S[col][id]=data;
  saveLocal();schedule();
  if(S.mode!=='db')return;
  const key=col+'/'+id;const q=wq[key]||(wq[key]={busy:false,next:null,del:false});q.next=data;q.del=false;
  if(!q.busy)flush(key);
}
function del(col,id){
  delete S[col][id];saveLocal();schedule();
  if(S.mode!=='db')return;
  const key=col+'/'+id;const q=wq[key]||(wq[key]={busy:false,next:null,del:false});q.next=null;q.del=true;
  if(!q.busy)flush(key);
}
async function flush(key){
  const q=wq[key];q.busy=true;
  const ref=db.doc(key);
  while(q.next||q.del){
    const d=q.next,isDel=q.del;q.next=null;q.del=false;
    let ok=false;
    for(let a=0;a<2&&!ok;a++){
      try{if(isDel)await ref.delete();else await ref.set(d);ok=true;S.saveErr=false;}
      catch(e){
        if(e&&e.code==='unavailable'&&a===0){await new Promise(r=>setTimeout(r,600+Math.random()*900));continue;}
        S.saveErr=true;if(e&&e.code==='invalid_argument')S.readOnly=true;
        if(e&&e.code==='quota_exceeded')toast('O armazenamento da página está cheio. Apague sessões antigas no histórico.');
        break;
      }
    }
    schedule();
  }
  q.busy=false;
}
async function initStore(){
  let d=null;
  try{if(window.claude&&typeof window.claude.use==='function')d=await window.claude.use('db');}catch(e){d=null;}
  if(!d){
    S.mode='local';S.conjuntos=LS.get('conjuntos',{});S.treinos=LS.get('treinos',{});S.sessoes=LS.get('sessoes',{});S.config=LS.get('config',null);S.ready=true;migrar();schedule();return;
  }
  db=d;S.mode='db';
  const got={t:false,s:false,c:false,k:false};
  const timer=setTimeout(()=>{if(!(got.t&&got.s)){S.note='Não consegui carregar seus dados agora. Confira a conexão; o que já apareceu pode estar desatualizado.';S.ready=true;schedule();}},10000);
  const check=()=>{if(got.t&&got.s&&got.c&&got.k){clearTimeout(timer);S.note='';migrar();}S.ready=S.ready||(got.t&&got.s&&got.k);schedule();};
  const onErr=e=>{clearTimeout(timer);S.note='A conexão com seus dados foi interrompida. Recarregue a página mais tarde.';S.ready=true;schedule();};
  db.collection('conjuntos').onSnapshot(q=>{const o={};q.docs.forEach(x=>{o[x.id]=Object.assign(clone(x.data()),{id:x.id});});S.conjuntos=o;if(!q.metadata.fromCache)got.k=true;check();},onErr);
  db.collection('treinos').onSnapshot(q=>{const o={};q.docs.forEach(x=>{o[x.id]=Object.assign(clone(x.data()),{id:x.id});});S.treinos=o;if(!q.metadata.fromCache)got.t=true;check();},onErr);
  db.collection('sessoes').onSnapshot(q=>{const o={};q.docs.forEach(x=>{o[x.id]=Object.assign(clone(x.data()),{id:x.id});});S.sessoes=o;if(!q.metadata.fromCache)got.s=true;check();},onErr);
  db.doc('config/programa').onSnapshot(x=>{S.config=x.exists?clone(x.data()):null;if(!x.metadata.fromCache)got.c=true;check();},onErr);
}

// #region: migracao
/* O primeiro programa (Full Body A/B) vira o conjunto "Treino na academia", uma única vez */
let migrou=false;
function migrar(){
  if(migrou||S.readOnly)return;migrou=true;
  const cfg=S.config;
  if(Object.keys(S.conjuntos).length||!Object.keys(S.treinos).length||(cfg&&cfg.migrado))return;
  const c={id:'academia',nome:'Treino na academia',descricao:cfg?[cfg.nome,cfg.objetivo].filter(Boolean).join(' · '):'',ordem:1,criado:Date.now(),
    frequencia:cfg&&cfg.frequencia||'',duracao:cfg&&cfg.duracao||'',intervalo:cfg&&cfg.intervalo||'',intervaloH:cfg&&/48/.test(cfg.intervalo||'')?48:0,
    orientacoes:cfg&&cfg.orientacoes||[],inicio:cfg&&cfg.inicio||'',aerobico:cfg&&cfg.aerobico||'',indicadores:cfg&&cfg.indicadores||[],
    treinos:treinosOrd().map(t=>({id:t.id,dia:t.dia||''}))};
  put('conjuntos',c.id,c);
  Object.values(S.sessoes).forEach(x=>{if(!x.conjuntoId&&c.treinos.some(m=>m.id===x.treinoId))put('sessoes',x.id,Object.assign(clone(x),{conjuntoId:c.id,conjuntoNome:c.nome}));});
  if(cfg)put('config','programa',Object.assign(clone(cfg),{migrado:true}));
}

// #region: derivados
/* ---------- Derivados ---------- */
const treinosOrd=()=>Object.values(S.treinos).sort((a,b)=>(a.ordem||99)-(b.ordem||99)||String(a.nome).localeCompare(b.nome));
const sessoesFeitas=()=>Object.values(S.sessoes).filter(s=>s.status==='concluida').sort((a,b)=>(b.fim||0)-(a.fim||0));
const sessaoAtiva=()=>Object.values(S.sessoes).filter(s=>s.status==='andamento').sort((a,b)=>b.inicio-a.inicio)[0]||null;
const keyOf=it=>it.exId||('nome:'+String(it.nome).trim().toLowerCase());
const nomeKey=it=>String(it.nome||'').trim().toLowerCase();
/* mesmo exercício: mesmo id da biblioteca ou mesmo nome (itens antigos sem 3D continuam no histórico) */
const mesmoEx=(a,b)=>keyOf(a)===keyOf(b)||(!!nomeKey(a)&&nomeKey(a)===nomeKey(b));
function ultimaVez(it,excluirId){
  for(const s of sessoesFeitas()){if(s.id===excluirId)continue;const x=(s.itens||[]).find(i=>mesmoEx(i,it)&&i.sets&&i.sets.length);if(x)return {sets:x.sets,quando:s.fim,sessao:s};}
  return null;
}
/* conjuntos: cada um referencia treinos da biblioteca (o mesmo treino pode estar em vários) */
const conjuntosOrd=()=>Object.values(S.conjuntos).sort((a,b)=>(a.ordem||99)-(b.ordem||99)||(a.criado||0)-(b.criado||0));
const treinosDe=c=>((c&&c.treinos)||[]).filter(m=>S.treinos[m.id]).map(m=>S.treinos[m.id]);
const diaEm=(c,tid)=>{const m=c&&(c.treinos||[]).find(x=>x.id===tid);return m?m.dia||'':'';};
const conjuntosCom=tid=>conjuntosOrd().filter(c=>(c.treinos||[]).some(m=>m.id===tid));
const daSessao=(s,c)=>s.conjuntoId?s.conjuntoId===c.id:(c.treinos||[]).some(m=>m.id===s.treinoId);
const sessoesDe=c=>sessoesFeitas().filter(s=>daSessao(s,c));
const treinosLib=()=>Object.values(S.treinos).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
const enc=encodeURIComponent;
const hrefTreino=(tid,cid)=>cid?`#conjunto/${enc(cid)}/treino/${enc(tid)}`:`#treino/${enc(tid)}`;
const hrefVolta=s=>s&&s.conjuntoId&&S.conjuntos[s.conjuntoId]?'#conjunto/'+enc(s.conjuntoId):'#';
const nomeConj=s=>(s.conjuntoId&&S.conjuntos[s.conjuntoId]&&S.conjuntos[s.conjuntoId].nome)||s.conjuntoNome||'';
function proximoTreino(c){
  const ts=treinosDe(c);if(!ts.length)return null;
  const last=sessoesDe(c)[0];if(!last)return ts[0];
  const i=ts.findIndex(t=>t.id===last.treinoId);return ts[(i+1)%ts.length]||ts[0];
}
function proximaLetra(ts){const used=new Set(ts.map(t=>t.letra));for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){if(!used.has(c))return c;}return 'A';}
/* equipamento */
function eqTag(id){const L=LIB[id];if(!L)return '';return L.eq.length?`<span class="eq sim">${icon.dumb}${esc(L.eqTxt)}</span>`:`<span class="eq nao">${icon.free}Sem equipamento</span>`;}
function eqCats(t){const known=(t.itens||[]).filter(i=>i.exId&&LIB[i.exId]);if(!known.length)return null;const set=new Set();known.forEach(i=>LIB[i.exId].eq.forEach(c=>set.add(c)));return EQ_ORD.filter(c=>set.has(c));}
function eqResumoTag(t){const c=eqCats(t);if(!c)return '';return c.length?`<span class="eq sim">${icon.dumb}${esc(c.map(k=>EQ[k]).join(' · '))}</span>`:`<span class="eq nao">${icon.free}Sem equipamento</span>`;}
const totalSeries=t=>(t.itens||[]).reduce((a,i)=>a+(+i.series||0),0);
/* circuito: um exercício depois do outro; cada rodada = 1 série de cada exercício */
const ehCircuito=t=>!!t&&t.formato==='circuito';
const nRodadas=t=>Math.max(1,Math.round(+t.rodadas||2));
const volumeTxt=t=>ehCircuito(t)?`${nRodadas(t)} ${nRodadas(t)===1?'rodada':'rodadas'}`:`${totalSeries(t)} séries`;
const aqSeg=t=>(t&&t.aquecimento||[]).reduce((a,x)=>a+(+x.s||0),0);
function estimaMin(t){let s=0;(t.itens||[]).forEach(i=>{s+=(+i.series||0)*((i.tipo==='tempo'?(i.max||40):45)+(i.descanso==null?90:+i.descanso));});
  if(ehCircuito(t))s+=(nRodadas(t)-1)*(+t.descansoRodada||60);s+=aqSeg(t);return Math.max(10,Math.round(s/60/5)*5);}
function feitoSessao(s){let f=0,t=0;(s.itens||[]).forEach(i=>{t+=+i.series||0;f+=Math.min(i.sets?i.sets.length:0,+i.series||0);});return {f,t};}
function volumeSessao(s){let v=0,r=0,n=0;(s.itens||[]).forEach(i=>(i.sets||[]).forEach(x=>{n++;if(i.tipo!=='tempo'){r+=+x.reps||0;v+=(+x.carga||0)*(+x.reps||0);}}));return {v,r,n};}
const LADO={lado:'por lado',perna:'por perna'};
const faixa=it=>+it.min===+it.max?`${it.min}`:`${it.min}–${it.max}`;
const rotFaixa=it=>it.tipo==='tempo'?`${faixa(it)} s`:`${faixa(it)} reps${LADO[it.lado]?' '+LADO[it.lado]:''}`;
const rotSet=(it,x)=>it.tipo==='tempo'?`${x.reps} s`:(it.semCarga?`${x.reps}`:`${fmtKg(x.carga)}×${x.reps}`);

// #region: progressao
/* sugestão de progressão: aumentar repetições, depois a carga (orientação da ficha) */
function sugestao(it,u){
  if(!u)return {cls:'novo',txt:it.tipo==='tempo'?`Primeira vez: segure ${faixa(it)} s com o corpo alinhado.`:it.semCarga?`Primeira vez: faça ${rotFaixa(it)} com calma, priorizando a técnica. Se a execução piorar, pare antes.`:`Primeira vez: escolha uma carga que deixe 2–3 repetições sobrando no fim de cada série.`};
  const reps=u.sets.map(s=>+s.reps||0), cargas=u.sets.map(s=>+s.carga||0), cmax=Math.max(...cargas), dificil=u.sets.some(s=>s.esforco==='dificil');
  if(it.tipo==='tempo'){
    if(reps.every(r=>r>=it.max))return {cls:'up',txt:`Segurou ${it.max} s em todas as séries. Tente ${it.max+5} s hoje.`,reps:it.max+5};
    return {cls:'keep',txt:`Tente alguns segundos a mais que na última vez.`};
  }
  if(it.semCarga){
    const facil=u.sets.length&&u.sets.every(s=>s.esforco==='facil'), alvo=`${it.max}${LADO[it.lado]?' '+LADO[it.lado]:''}`;
    if(reps.every(r=>r>=it.max)&&facil)return {cls:'up',txt:`Fez ${alvo} em todas e ficou fácil: hora de aumentar a dificuldade, com mais repetições ou uma variação mais difícil.`};
    if(reps.every(r=>r>=it.max)&&dificil)return {cls:'keep',txt:`Completou ${alvo}, mas foi difícil. Mantenha até ficar confortável.`};
    if(reps.every(r=>r>=it.max))return {cls:'keep',txt:`Fez ${alvo} em todas. Mantenha com boa técnica; quando ficar fácil, aumente a dificuldade.`};
    if(reps.some(r=>r<it.min))return {cls:'keep',txt:`Ficou abaixo de ${it.min} na última vez. Mantenha a variação e busque completar ${rotFaixa(it)} com técnica.`};
    return {cls:'keep',txt:+it.min===+it.max?`Busque ${rotFaixa(it)} em todas as séries, com controle.`:'Tente 1 repetição a mais por série.'};}
  if(reps.every(r=>r>=it.max)&&!dificil){const inc=+it.passo||2.5;return {cls:'up',carga:cmax+inc,reps:it.min,txt:`Fez ${it.max} repetições em todas as séries com ${fmtKg(cmax)} kg. Suba para ${fmtKg(cmax+inc)} kg e recomece em ${it.min}.`};}
  if(reps.some(r=>r<it.min))return {cls:'down',carga:cmax,txt:`Ficou abaixo de ${it.min} repetições na última vez. Mantenha ${fmtKg(cmax)} kg (ou reduza um pouco) até completar a faixa.`};
  return {cls:'keep',carga:cmax,txt:`Mantenha ${fmtKg(cmax)} kg e tente 1 repetição a mais por série, até chegar a ${it.max}.`};
}
function prefill(s,ii,si){
  const it=s.itens[ii];const k=it.uid+'#'+si;if(ui.draft[k])return ui.draft[k];
  const prev=it.sets[si-1]||it.sets[it.sets.length-1];
  const u=ultimaVez(it,s.id);const sg=sugestao(it,u);const lastSet=u?(u.sets[si]||u.sets[u.sets.length-1]):null;
  let carga,reps;
  if(prev){carga=prev.carga;reps=prev.reps;}
  else{
    carga=sg.carga!=null?sg.carga:(lastSet?lastSet.carga:(it.cargaInicial||0));
    if(sg.reps!=null)reps=sg.reps;else if(lastSet)reps=Math.min(it.max,(+lastSet.reps||it.min)+(sg.cls==='keep'?1:0));else reps=Math.round((it.min+it.max)/2);
  }
  return ui.draft[k]={carga:+carga||0,reps:+reps||0,esforco:null};
}

/*@@PONTOS@@*/

// #region: render
/* ---------- Render ---------- */
let rq=0,pendingRender=false,mini3d=false;
function schedule(){if(rq)return;rq=requestAnimationFrame(()=>{rq=0;render();});}
function render(force){
  const ae=document.activeElement;
  if(!force&&ae&&ae.matches&&ae.matches('#appView input,#appView textarea,#sheet input,#sheet textarea')){pendingRender=true;return;}
  pendingRender=false;G=null;
  livePill();if(sessaoAtiva()&&!wake)keepAwake(true);
  if(ui.view==='home')$('#homeView').innerHTML=vInicio();
  else if(ui.view==='conjunto')$('#conjuntoView').innerHTML=vConjunto();
  else if(ui.view==='bib')$('#bibView').innerHTML=vBib();
  else if(ui.view==='treino')$('#treinoView').innerHTML=vTreino();
  else if(ui.view==='sessao'){$('#sessaoView').innerHTML=vSessao();tick(true);}
  else if(ui.view==='resumo'){$('#resumoView').innerHTML=vResumo();animaResumo();}
  else if(ui.view==='pontos')$('#pontosView').innerHTML=vJornada();
  if(ui.view==='sessao'||mini3d)mountMini();mini3d=ui.view==='sessao';
}
document.addEventListener('focusout',()=>setTimeout(()=>{if(pendingRender)render();},0));

// #region: tema
/* ---------- Tema (padrão claro; escolha guardada neste aparelho) ---------- */
const temaAtual=()=>document.documentElement.dataset.theme==='dark'?'dark':'light';
function themeBtn(){const d=temaAtual()==='dark';return `<button class="themebtn" type="button" aria-label="${d?'Usar tema claro':'Usar tema escuro'}" title="${d?'Tema claro':'Tema escuro'}"><svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg><svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg></button>`;}
function syncThemeBtns(){const d=temaAtual()==='dark';document.querySelectorAll('.themebtn').forEach(b=>{b.setAttribute('aria-label',d?'Usar tema claro':'Usar tema escuro');b.title=d?'Tema claro':'Tema escuro';});}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.themebtn');if(!b)return;
  const v=temaAtual()==='dark'?'light':'dark';document.documentElement.dataset.theme=v;try{localStorage.setItem('mt3d.theme',v);}catch(err){}syncThemeBtns();});
document.querySelectorAll('[data-themebtn]').forEach(x=>{x.outerHTML=themeBtn();});
// #region: biblioteca-menu
/* biblioteca de exercícios (HTML fixo): tag de equipamento em cada card + filtro */
function enfeitaBiblioteca(){
  const menuV=document.getElementById('menuView');if(!menuV)return;
  menuV.querySelectorAll('a.ex').forEach(a=>{const id=(a.getAttribute('href')||'').slice(1);const L=LIB[id];if(!L)return;
    a.dataset.eq=L.eq.length?'com':'sem';const t=document.createElement('span');t.className='eqtags';t.innerHTML=eqTag(id)+intensTag(id);a.appendChild(t);});
  const bar=menuV.querySelector('.eqfilter');if(!bar)return;
  const emp=menuV.querySelector('.eqempty');
  bar.addEventListener('click',e=>{const b=e.target.closest('[data-eqf]');if(!b)return;const f=b.dataset.eqf;
    bar.querySelectorAll('[data-eqf]').forEach(x=>x.setAttribute('aria-pressed',x===b));
    let n=0;menuV.querySelectorAll('.group').forEach(g=>{let k=0;g.querySelectorAll('a.ex').forEach(a=>{const on=f==='todos'||a.dataset.eq===f;a.hidden=!on;if(on)k++;});g.hidden=!k;n+=k;});
    if(emp)emp.hidden=n>0;});
}

// #region: icones
const icon={
  play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',
  chev:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M9 5l7 7-7 7"/></svg>',
  back:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M15 5l-7 7 7 7"/></svg>',
  cube:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
  check:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M12 5v14M5 12h14"/></svg>',
  edit:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  clock:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  dumb:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/></svg>',
  free:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><circle cx="12" cy="4.8" r="2"/><path d="M12 7.5v6.5M7 10.5h10M12 14l-3.2 6M12 14l3.2 6"/></svg>',
  stack:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><rect x="4" y="4" width="16" height="5" rx="1.5"/><rect x="4" y="11" width="16" height="5" rx="1.5"/><path d="M7 19.5h10"/></svg>',
  link:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  loop:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5"/></svg>',
  fire:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.8 2.3-5 .2 1.6 1 2.6 2.2 3 0-3 .5-5.6.5-8z"/></svg>',
  walk:'<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><circle cx="13" cy="4.5" r="1.8"/><path d="M10.5 21l2-6-2.5-2.5 1-5 3.5 2.5 2.5 1M10 12.5l-2 1.5-1.5 3M12.5 15l2.5 2 1 4"/></svg>',
};
// #region: componentes-home
/* aquecimento: lista simples (treino) */
const AQ_PADRAO=[{t:'Marcha no lugar',s:30},{t:'Rotação dos ombros',s:30},{t:'Mobilidade do quadril',s:30},{t:'Agachamentos leves',s:30}];
function vAquecLista(t){
  return `<section class="card aq"><div class="aq-h">${icon.fire}<span class="tr-b"><span class="tr-n">Aquecimento</span><span class="tr-m">${mmss(aqSeg(t))} antes de começar · guiado no início do treino</span></span></div>
    <ol class="aqlist">${t.aquecimento.map(x=>`<li><b>${mmss(x.s)}</b><span>${esc(x.t)}</span></li>`).join('')}</ol></section>`;
}

function vStatus(){
  let h='';
  if(!S.ready)h+='<p class="note">Carregando seus treinos…</p>';
  if(S.note)h+=`<p class="note warn">${esc(S.note)}</p>`;
  if(S.saveErr)h+='<p class="note warn">Não consegui salvar a última alteração. Ela continua aqui na tela; tente de novo quando a conexão voltar.</p>';
  if(S.readOnly)h+='<p class="note">Você está vendo os treinos em modo leitura.</p>';
  return h;
}

function heroAtivo(act){
  const p=feitoSessao(act), cn=nomeConj(act);
  return `<section class="hero live"><div class="hero-top"><span class="letter">${esc(act.letra||'•')}</span><div><span class="eyebrow">Treino em andamento${cn?' · '+esc(cn):''}</span><h2>${esc(act.treinoNome)}</h2>
    <div class="meta"><span data-live="elapsed">${hhmm((Date.now()-act.inicio)/1000)}</span><span>${p.f} de ${p.t} séries</span></div></div></div>
    <div class="bar"><i style="width:${p.t?Math.round(p.f/p.t*100):0}%"></i></div>
    <a class="btn primary" href="#sessao">${icon.play}Continuar treino</a></section>`;
}
function histRow(s,comConj){const v=volumeSessao(s);const dur=(s.fim-s.inicio)/1000;const cn=comConj?nomeConj(s):'';
  return `<a class="hrow" href="#resumo/${enc(s.id)}"><span class="letter xs">${esc(s.letra||'•')}</span><span class="hr-b"><b>${esc(s.treinoNome)}</b><span>${dataCurta(s.fim)} · ${hhmm(dur)} · ${v.n} séries${cn?' · '+esc(cn):''}</span></span>${icon.chev}</a>`;}
const footNote=()=>`<p class="small foot">${S.mode==='db'?'Seus treinos e séries ficam salvos nesta página e aparecem em qualquer aparelho em que você abrir.':S.mode==='local'?'Os dados estão sendo salvos só neste aparelho e navegador.':''}</p>`;
const libCard=()=>`<a class="card lib" href="#biblioteca">${icon.cube}<span class="tr-b"><span class="tr-n">Biblioteca</span><span class="tr-m">${Object.keys(LIB).length} exercícios 3D e ${Object.keys(S.treinos).length} treinos, compartilhados por todos os conjuntos</span></span>${icon.chev}</a>`;

// #region: v-inicio
/* ---------- Início: lista de conjuntos ---------- */
function vInicio(){
  const cs=conjuntosOrd(), act=sessaoAtiva(), feitas=sessoesFeitas(), ro=S.readOnly;
  let h=`<header class="top tb">${themeBtn()}<span class="eyebrow">Meu Treino 3D</span><h1>Meus treinos</h1></header>`+vStatus();
  if(act)h+=heroAtivo(act);
  if(S.ready)h+=vPlacarCard();
  h+=`<section class="sec"><div class="sec-h"><h3>Conjuntos de treino</h3>${ro?'':`<button class="link" data-act="novoConjunto">${icon.plus}Novo conjunto</button>`}</div>`;
  if(!cs.length&&S.ready)h+=`<div class="empty">Nenhum conjunto ainda. Um conjunto junta os treinos de uma rotina, como "Treino na academia" ou "Treino em casa".${ro?'':' <button class="link" data-act="novoConjunto">Criar o primeiro conjunto</button>'}</div>`;
  cs.forEach(c=>{const ts=treinosDe(c), nx=proximoTreino(c), ult=sessoesDe(c)[0], vivo=act&&daSessao(act,c);
    h+=`<a class="card cj${vivo?' vivo':''}" href="#conjunto/${enc(c.id)}"><span class="cj-b">
      <span class="cj-n">${esc(c.nome)}</span>${c.descricao?`<span class="tr-m">${esc(c.descricao)}</span>`:''}
      <span class="cj-l">${ts.map(t=>`<span class="letter xs">${esc(t.letra||t.nome.slice(-1))}</span>`).join('')}<span class="tr-m">${ts.length} ${ts.length===1?'treino':'treinos'}${c.frequencia?' · '+esc(c.frequencia):''}</span></span>
      <span class="cj-nx">${vivo?'<b>Treino em andamento</b>':nx?`Próximo: <b>${esc(nx.nome)}</b>${ult?' · último '+haQuanto(ult.fim):''}`:'Ainda sem treinos'}</span></span>${icon.chev}</a>`;});
  h+=`</section>`;
  if(feitas.length){
    h+=`<section class="sec"><div class="sec-h"><h3>Últimos treinos</h3></div><div class="hist">`;
    (ui.histAll?feitas:feitas.slice(0,3)).forEach(s=>{h+=histRow(s,true);});
    h+=`</div>${feitas.length>3&&!ui.histAll?`<button class="link" data-act="histAll">Ver todas as ${feitas.length} sessões</button>`:''}</section>`;
  }
  const ids=Object.keys(LIB), nSem=ids.filter(k=>!LIB[k].eq.length).length, nT=Object.keys(S.treinos).length;
  h+=`<section class="sec"><div class="sec-h"><h3>Biblioteca</h3><span class="small">compartilhada por todos os conjuntos</span></div>
    <a class="card lib" href="#biblioteca">${icon.cube}<span class="tr-b"><span class="tr-n">Exercícios 3D</span><span class="tr-m">${ids.length} exercícios · ${nSem} sem equipamento</span></span>${icon.chev}</a>
    <a class="card lib" href="#biblioteca/treinos">${icon.stack}<span class="tr-b"><span class="tr-n">Treinos</span><span class="tr-m">${nT} ${nT===1?'treino salvo':'treinos salvos'} para reutilizar em qualquer conjunto</span></span>${icon.chev}</a></section>`;
  return h+footNote();
}

// #region: v-conjunto
/* ---------- Conjunto ---------- */
function vConjunto(){
  const c=S.conjuntos[ui.conjuntoId];
  if(!c)return `<div class="navrow"><a class="back" href="#">${icon.back}Meus treinos</a>${themeBtn()}</div>${S.ready?'<p class="empty">Conjunto não encontrado.</p>':'<p class="note">Carregando…</p>'}`;
  const ro=S.readOnly, ts=treinosDe(c), act=sessaoAtiva(), feitas=sessoesDe(c), nx=proximoTreino(c);
  let h=`<div class="navrow"><a class="back" href="#">${icon.back}Meus treinos</a>${themeBtn()}</div>${vStatus()}
    <header class="top">${c.descricao?`<span class="eyebrow">${esc(c.descricao)}</span>`:'<span class="eyebrow">Conjunto de treino</span>'}
    <div class="title-row"><h1>${esc(c.nome)}</h1>${ro?'':`<button class="iconbtn" data-act="editConjunto" aria-label="Editar conjunto">${icon.edit}</button>`}</div>`;
  if(c.frequencia||c.duracao||c.intervalo)h+=`<div class="specs">${c.frequencia?`<span><b>${esc(c.frequencia)}</b></span>`:''}${c.duracao?`<span><b>${esc(c.duracao)}</b></span>`:''}${c.intervalo?`<span>${esc(c.intervalo)}</span>`:''}</div>`;
  h+=`</header>`;
  if(act&&daSessao(act,c))h+=heroAtivo(act);
  else{
    if(act)h+=`<p class="note">Há um treino em andamento em ${esc(nomeConj(act)||'outro conjunto')}: <a class="link" href="#sessao">continuar ${esc(act.treinoNome)}</a></p>`;
    if(nx){const ult=feitas[0];const horas=ult?(Date.now()-ult.fim)/36e5:1e9;const dia=diaEm(c,nx.id);
      h+=`<section class="hero"><div class="hero-top"><span class="letter">${esc(nx.letra||nx.nome.slice(-1))}</span><div><span class="eyebrow">Próximo treino${dia?' · '+esc(dia):''}</span><h2>${esc(nx.nome)}</h2>
        <div class="meta"><span>${(nx.itens||[]).length} exercícios</span><span>${volumeTxt(nx)}</span><span>~${estimaMin(nx)} min</span><span>~${fmtN(estimaPts(nx))} pts</span></div></div></div>
        ${nx.foco?`<p class="foco">${esc(nx.foco)}</p>`:''}
        ${ult?`<p class="small">Último treino: ${esc(ult.treinoNome)}, ${dataCurta(ult.fim)} (${haQuanto(ult.fim)}).</p>`:''}
        ${c.intervaloH&&horas<c.intervaloH?`<p class="note warn">Faz ${Math.round(horas)} h desde o último treino. O ideal é esperar pelo menos ${c.intervaloH} h entre as sessões.</p>`:''}
        <button class="btn primary" data-act="start" data-id="${esc(nx.id)}" data-c="${esc(c.id)}" ${!(nx.itens||[]).length||ro||act?'disabled':''}>${icon.play}Começar ${esc(nx.nome)}</button></section>`;}
  }
  h+=`<section class="sec"><div class="sec-h"><h3>Treinos</h3>${ro?'':`<button class="link" data-act="addTreino">${icon.plus}Adicionar treino</button>`}</div>`;
  if(!ts.length&&S.ready)h+=`<div class="empty">Este conjunto ainda não tem treinos.${ro?'':` <button class="link" data-act="novoTreino">Criar um treino</button> ou <button class="link" data-act="addTreino">escolher da biblioteca</button>.`}</div>`;
  ts.forEach(t=>{const ult=feitas.find(s=>s.treinoId===t.id), dia=diaEm(c,t.id), outros=conjuntosCom(t.id).filter(x=>x.id!==c.id);
    h+=`<a class="card tr" href="${hrefTreino(t.id,c.id)}"><span class="letter sm">${esc(t.letra||t.nome.slice(-1))}</span><span class="tr-b"><span class="tr-n">${esc(t.nome)}${dia?` <em>${esc(dia)}</em>`:''}</span>
      <span class="tr-m">${(t.itens||[]).length} exercícios · ${volumeTxt(t)} · ~${estimaMin(t)} min</span>
      <span class="eqtags">${eqResumoTag(t)}${outros.length?`<span class="eq shared">${icon.link}também em ${esc(outros.map(x=>x.nome).join(', '))}</span>`:''}</span>
      <span class="tr-m">${ult?'Feito '+haQuanto(ult.fim):'Ainda não feito'}</span></span>${icon.chev}</a>`;});
  h+=`</section>`;
  /* semana */
  const now=new Date();const dow=(now.getDay()+6)%7;const seg=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow).getTime();
  const sem=feitas.filter(s=>s.fim>=seg);
  const meta=parseInt(((c.frequencia||'').match(/\d+/)||[])[0])||ts.length||2, sp=semanaPrograma(c);
  h+=`<section class="sec"><div class="sec-h"><h3>Esta semana</h3><span class="small">${sp?(sp.n>sp.total?`programa de ${sp.total} semanas concluído`:`semana ${sp.n} de ${sp.total}`):`${sem.length} de ${meta} treinos`}</span></div><div class="week">`;
  ['S','T','Q','Q','S','S','D'].forEach((l,i)=>{const d0=seg+i*864e5,d1=d0+864e5;const s=sem.find(x=>x.fim>=d0&&x.fim<d1);const hoje=i===dow;
    h+=`<span class="day${s?' on':''}${hoje?' today':''}" title="${s?esc(s.treinoNome):''}"><b>${l}</b><i>${s?esc(s.letra||'✓'):''}</i></span>`;});
  h+=`</div>${sp?vFicha(c,sp,ts,sem):''}</section>`;
  if(feitas.length){
    h+=`<section class="sec"><div class="sec-h"><h3>Histórico</h3></div><div class="hist">`;
    (ui.histAll?feitas:feitas.slice(0,5)).forEach(s=>{h+=histRow(s,false);});
    h+=`</div>${feitas.length>5&&!ui.histAll?`<button class="link" data-act="histAll">Ver todas as ${feitas.length} sessões</button>`:''}</section>`;
  }
  if(c.orientacoes&&c.orientacoes.length){
    h+=`<details class="card guide"><summary><span class="tr-n">Orientações da ficha</span>${icon.chev}</summary><dl class="params">`;
    c.orientacoes.forEach(o=>{h+=`<dt>${esc(o.t)}</dt><dd>${esc(o.d)}</dd>`;});
    h+=`</dl>${c.inicio?`<p class="small">${esc(c.inicio)}</p>`:''}${c.aerobico?`<p class="small"><b>Aeróbico:</b> ${esc(c.aerobico)}</p>`:''}${c.indicadores&&c.indicadores.length?`<p class="small"><b>Acompanhar:</b> ${esc(c.indicadores.join(' · '))}</p>`:''}</details>`;
  }
  return h+libCard()+footNote();
}

// #region: ficha-semana
/* programa com semanas: fase atual, meta de caminhada e ficha da semana (marcações guardadas no conjunto) */
const segundaDe=ms=>{const d=new Date(ms);const dow=(d.getDay()+6)%7;return new Date(d.getFullYear(),d.getMonth(),d.getDate()-dow).getTime();};
function semanaPrograma(c){
  const pr=c&&c.programa;if(!pr)return null;
  const fs=sessoesDe(c), seg=segundaDe(Date.now()), ini=fs.length?segundaDe(fs[fs.length-1].fim):seg;
  const n=Math.round((seg-ini)/(7*864e5))+1, total=pr.semanas||8;
  const em=a=>(a||[]).find(f=>n>=f.de&&n<=f.ate)||(n>total?(a||[]).slice(-1)[0]:null);
  return {n,total,seg,fase:em(pr.fases),cam:em(pr.caminhada),pr};
}
function vFicha(c,sp,ts,sem){
  const marc=fichasDe(c)[sp.seg]||{}, ro=S.readOnly, its=[];
  ts.forEach(t=>{const auto=sem.some(s=>s.treinoId===t.id);const d=diaEm(c,t.id);
    its.push({k:'t:'+t.id,t:`Treino ${t.letra?t.letra+' · ':''}${t.nome}`,sub:[d,auto?'registrado no app':''].filter(Boolean).join(' · '),on:auto||!!marc['t:'+t.id],auto});});
  if(sp.cam)for(let i=1;i<=sp.cam.vezes;i++)its.push({k:'cam'+i,t:`Caminhada ${i}`,sub:`${sp.cam.min} min`,on:!!marc['cam'+i],walk:true});
  (sp.pr.extras||[]).forEach((x,i)=>its.push({k:'x'+i,t:x,on:!!marc['x'+i]}));
  const on=its.filter(x=>x.on).length, manual=its.some(x=>x.on&&!x.auto);
  let h=`<div class="card ficha"><div class="ficha-h"><span class="tr-n">Ficha da semana</span><span class="tr-m">${on}/${its.length} concluídos</span></div>`;
  if(sp.fase)h+=`<p class="fase"><span class="fase-t">${sp.n>sp.total?'Depois das '+sp.total+' semanas':'Semanas '+sp.fase.de+'–'+sp.fase.ate}</span><span><b>${esc(sp.fase.t)}</b> · ${esc(sp.fase.d)}</span></p>`;
  h+=`<ul class="checks">${its.map(x=>`<li><button class="chk${x.on?' on':''}${x.auto?' auto':''}" data-act="fichaTog" data-k="${esc(x.k)}" aria-pressed="${x.on}" ${x.auto||ro?'disabled':''}><i>${icon.check}</i><span><b>${esc(x.t)}</b>${x.sub?`<small>${esc(x.sub)}</small>`:''}</span>${x.walk?icon.walk:''}</button></li>`).join('')}</ul>`;
  if(manual&&!ro)h+=`<button class="link" data-act="fichaReset">Reiniciar semana</button>`;
  return h+`</div>`;
}

// #region: v-bib
/* ---------- Biblioteca de treinos (aba "Treinos") ---------- */
function vBib(){
  const ts=treinosLib(), ro=S.readOnly;
  let h=`<div class="navrow"><a class="back" href="#">${icon.back}Meus treinos</a>${themeBtn()}</div>${vStatus()}
    <header class="top"><span class="eyebrow">Compartilhada por todos os conjuntos</span><h1>Biblioteca</h1></header>
    <nav class="libtabs" aria-label="Biblioteca"><a href="#biblioteca">Exercícios 3D</a><a href="#biblioteca/treinos" aria-current="page">Treinos</a></nav>
    <p class="foco">Treinos salvos para reutilizar. O mesmo treino pode estar em vários conjuntos; ao editar, a mudança vale em todos. Para mudar só em um, crie uma cópia.</p>`;
  if(!ro)h+=`<button class="btn ghost dashed" data-act="novoTreino">${icon.plus}Novo treino</button>`;
  if(!ts.length&&S.ready)h+=`<div class="empty">Nenhum treino salvo ainda.</div>`;
  ts.forEach(t=>{const us=conjuntosCom(t.id);
    h+=`<a class="card tr" href="${hrefTreino(t.id,null)}"><span class="letter sm">${esc(t.letra||t.nome.slice(-1))}</span><span class="tr-b"><span class="tr-n">${esc(t.nome)}</span>
      <span class="tr-m">${(t.itens||[]).length} exercícios · ${volumeTxt(t)} · ~${estimaMin(t)} min</span>
      <span class="eqtags">${eqResumoTag(t)}${us.length?`<span class="eq shared">${icon.link}em ${esc(us.map(x=>x.nome).join(', '))}</span>`:'<span class="eq">fora de conjuntos</span>'}</span></span>${icon.chev}</a>`;});
  return h+footNote();
}

// #region: v-treino
function vTreino(){
  const t=S.treinos[ui.treinoId], c=ui.conjuntoId?S.conjuntos[ui.conjuntoId]:null;
  const back=c?`<a class="back" href="#conjunto/${enc(c.id)}">${icon.back}${esc(c.nome)}</a>`:`<a class="back" href="#biblioteca/treinos">${icon.back}Treinos</a>`;
  if(!t)return `<div class="navrow">${back}${themeBtn()}</div>${S.ready?'<p class="empty">Treino não encontrado.</p>':'<p class="note">Carregando…</p>'}`;
  const ro=S.readOnly, dia=c?diaEm(c,t.id):'', us=conjuntosCom(t.id), outros=us.filter(x=>!c||x.id!==c.id);
  let h=`<div class="navrow">${back}${themeBtn()}</div>${vStatus()}
    <header class="top"><span class="eyebrow">${esc(['Treino '+(t.letra||''),dia].filter(x=>x&&x.trim()!=='Treino').join(' · ')||'Treino')}</span>
    <div class="title-row"><h1>${esc(t.nome)}</h1>${ro?'':`<button class="iconbtn" data-act="editTreino" aria-label="Editar treino">${icon.edit}</button>`}</div>
    ${t.foco?`<p class="foco">${esc(t.foco)}</p>`:''}
    <div class="specs"><span><b>${(t.itens||[]).length}</b> exercícios</span><span><b>${ehCircuito(t)?nRodadas(t):totalSeries(t)}</b> ${ehCircuito(t)?(nRodadas(t)===1?'rodada':'rodadas'):'séries'}</span><span>~<b>${estimaMin(t)}</b> min</span><span class="ptsest">${gic.bolt}~<b>${fmtN(estimaPts(t))}</b> pts</span></div>
    <div class="eqtags">${eqResumoTag(t)}</div></header>`;
  if(c&&outros.length)h+=`<p class="note">${icon.link} Este treino também está em <b>${esc(outros.map(x=>x.nome).join(', '))}</b>. Mudanças aqui valem para todos. Para mudar só neste conjunto, use <button class="link" data-act="dupTreino">Criar cópia</button>.</p>`;
  if(!c)h+=`<p class="note">${us.length?`Está em <b>${esc(us.map(x=>x.nome).join(', '))}</b>. `:'Ainda não está em nenhum conjunto. '}${ro?'':`<button class="link" data-act="editTreino">Escolher conjuntos</button>`}</p>`;
  if(t.aquecimento&&t.aquecimento.length)h+=vAquecLista(t);
  const circ=ehCircuito(t), n=(t.itens||[]).length, dr=+t.descansoRodada||60;
  h+=`<section class="sec">${circ?`<div class="sec-h"><h3>Circuito · ${volumeTxt(t)}</h3></div><p class="small">Faça um exercício depois do outro, com uma pausa curta só se precisar. Ao terminar ${n===1?'o exercício':'os '+n}, descanse ${mmss(dr)} e repita.</p>`:''}<ol class="exlist${circ?' circ':''}">`;
  (t.itens||[]).forEach((it,i)=>{const u=ultimaVez(it);
    const m=circ?`${rotFaixa(it)}${i<n-1?(+it.descanso?` · pausa até ${mmss(it.descanso)}`:''):` · depois ${mmss(dr)} de descanso`}`:`${it.series} × ${rotFaixa(it)} · descanso ${mmss(it.descanso)}`;
    h+=`<li class="card exr"><button class="exr-main" data-act="editItem" data-i="${i}" ${ro?'disabled':''}>
        <span class="num">${String(i+1).padStart(2,'0')}</span>
        <span class="exr-b"><span class="exr-n">${esc(it.nome)}</span>
        <span class="exr-m">${m}</span>
        ${it.nota?`<span class="exr-note">${esc(it.nota)}</span>`:''}
        ${it.dica?`<span class="exr-dica">${esc(it.dica)}</span>`:''}
        <span class="exr-last">${u?'Última: '+u.sets.map(x=>rotSet(it,x)).join(' · ')+(it.tipo!=='tempo'&&!it.semCarga?' kg':''):'Sem registros ainda'}</span></span></button>
        ${it.exId&&LIB[it.exId]?`<a class="chip3d" href="#${esc(it.exId)}" aria-label="Ver ${esc(it.nome)} em 3D">${icon.cube}3D</a>`:'<span class="chip3d off">sem 3D</span>'}</li>`;});
  if(circ&&n)h+=`<li class="circ-end">${icon.loop}<span>Descanse ${mmss(dr)} e repita · ${volumeTxt(t)} no total</span></li>`;
  h+=`</ol>${ro?'':`<button class="btn ghost dashed" data-act="addItem">${icon.plus}Adicionar exercício</button>`}</section>`;
  if(!ro)h+=c?`<button class="link danger" data-act="rmDoConjunto">Remover deste conjunto</button>`:`<button class="link danger" data-act="delTreino">Excluir este treino</button>`;
  const act=sessaoAtiva(), cid=c?c.id:(us.length===1?us[0].id:'');
  h+=`<div class="sticky-cta">${act?`<a class="btn primary" href="#sessao">${icon.play}Continuar ${esc(act.treinoNome)}</a>`:`<button class="btn primary" data-act="start" data-id="${esc(t.id)}" data-c="${esc(cid)}" ${!(t.itens||[]).length||ro?'disabled':''}>${icon.play}Começar ${esc(t.nome)}</button>`}</div>`;
  return h;
}

// #region: sessao-viva
/* ---------- Sessão ao vivo ---------- */
function exAtual(s){return Math.min(Math.max(0,s.atual||0),s.itens.length-1);}
function proxPendente(s,from){const n=s.itens.length;for(let k=0;k<n;k++){const i=(from+k)%n;const it=s.itens[i];if(it.sets.length<it.series)return i;}return -1;}
/* circuito: o próximo é quem está mais atrás; dentro da rodada segue a ordem, rodada nova recomeça do 1º */
function proxCircuito(s,ii){
  const pend=s.itens.map((x,i)=>i).filter(i=>s.itens[i].sets.length<s.itens[i].series);if(!pend.length)return -1;
  const m=Math.min(...pend.map(i=>s.itens[i].sets.length)), k=s.itens[ii].sets.length, n=s.itens.length;
  if(m<k){for(let d=1;d<=n;d++){const i=(ii+d)%n;if(pend.includes(i)&&s.itens[i].sets.length===m)return i;}}
  return pend.find(i=>s.itens[i].sets.length===m);
}
const RLBL={serie:'Descanso',troca:'Pausa',rodada:'Fim da rodada',aquec:'Aquecimento'};
const RFIM={serie:'Próxima série!',troca:'Próximo exercício!',rodada:'Próxima rodada!',aquec:'Hora de treinar!'};
function aqPasso(s){const tot=s.descansoTotal||aqSeg(s);const el=tot-(s.descansoFim-Date.now())/1000;let c=0;
  for(let i=0;i<s.aquecimento.length;i++){c+=+s.aquecimento[i].s||0;if(el<c)return {i,falta:c-el};}return {i:s.aquecimento.length-1,falta:0};}
const aqNextTxt=(s,a)=>{const x=s.aquecimento[a.i],nx=s.aquecimento[a.i+1];return `Agora: <b>${esc(x.t)}</b> · ${mmss(a.falta)}${nx?`<br><span class="small">Depois: ${esc(nx.t)}</span>`:'<br><span class="small">Último movimento</span>'}`;};
// #region: v-sessao
function vSessao(){
  const s=sessaoAtiva();
  if(!s)return `<a class="back" href="#">${icon.back}Meus treinos</a>${S.ready?'<p class="empty">Nenhum treino em andamento.</p>':'<p class="note">Carregando…</p>'}`;
  const p=feitoSessao(s), ii=exAtual(s), it=s.itens[ii], si=it.sets.length, done=si>=it.series, n=s.itens.length;
  const circ=ehCircuito(s), R=circ?nRodadas(s):0, dr=+s.descansoRodada||60, unid=circ?'rodada':'série';
  const todoFeito=proxPendente(s,0)<0, lv=pontosAoVivo(s);
  const rodadasFeitas=circ?Math.min(...s.itens.map(x=>x.sets.length)):0;
  let h=`<div class="sbar"><a class="sbar-x" href="${hrefVolta(s)}" aria-label="Voltar">${icon.back}</a><div class="sbar-t"><b>${esc(s.treinoNome)}</b><span><span data-live="elapsed">${hhmm((Date.now()-s.inicio)/1000)}</span> · ${circ?`rodada ${Math.min(R,rodadasFeitas+1)}/${R} · `:''}${p.f}/${p.t} ${circ?'feitos':'séries'} · <b class="sbar-pts" id="sbarPts">${gic.bolt}${fmtN(lv.total)}</b></span></div><button class="sbar-end" data-act="endMenu">Encerrar</button></div>
    <div class="segbar">${s.itens.map((x,i)=>`<i class="${x.sets.length>=x.series?'ok':''}${i===ii?' cur':''}" style="flex:${x.series}"><b style="width:${Math.min(100,x.sets.length/x.series*100)}%"></b></i>`).join('')}</div>${vStatus()}
    <nav class="exstrip" aria-label="Exercícios do treino">${s.itens.map((x,i)=>`<button class="exchip${i===ii?' cur':''}${x.sets.length>=x.series?' ok':''}" data-act="goEx" data-i="${i}"><span>${i+1}</span>${esc(x.nome)}<em>${x.sets.length}/${x.series}</em></button>`).join('')}</nav>`;
  /* descanso / pausa / aquecimento */
  const rest=s.descansoFim&&s.descansoFim>Date.now()-60000, tipo=s.descansoTipo||'serie';
  if(rest){
    let prox='',btns=`<button class="btn ghost" data-act="rest" data-d="-15">−15 s</button><button class="btn ghost" data-act="rest" data-d="15">+15 s</button><button class="btn ghost" data-act="skipRest">Pular</button>`,extra='';
    if(tipo==='aquec'&&s.aquecimento&&s.aquecimento.length){const a=aqPasso(s);prox=aqNextTxt(s,a);btns=`<button class="btn ghost wide" data-act="skipRest">Pular aquecimento</button>`;
      extra=`<ol class="aqlist live">${s.aquecimento.map((x,i)=>`<li class="${i<a.i?'ok':i===a.i?'cur':''}" data-aq="${i}"><b>${mmss(x.s)}</b><span>${esc(x.t)}</span></li>`).join('')}</ol>`;}
    else if(circ){prox=tipo==='rodada'?`Rodada ${Math.min(R,it.sets.length+1)} de ${R} · começa com <b>${esc(it.nome)}</b>`:`Próximo: <b>${esc(it.nome)}</b>`;
      if(tipo==='rodada'&&rodadasFeitas>=1)extra=`<button class="link" data-act="finish">Parar aqui com ${rodadasFeitas} ${rodadasFeitas===1?'rodada':'rodadas'}</button>`;}
    else{const nxi=proxPendente(s,ii);const nx=nxi>=0?s.itens[nxi]:null;prox=nx?(nxi===ii?`Série ${nx.sets.length+1} de ${nx.series} · ${esc(nx.nome)}`:`Próximo exercício: ${esc(nx.nome)}`):'';}
    const lbl=tipo==='rodada'?`Fim da rodada ${Math.max(1,rodadasFeitas)}`:RLBL[tipo]||'Descanso';
    h+=`<section class="rest${tipo==='aquec'?' aq':''}" id="restCard" data-tipo="${tipo}"><div class="ring"><svg viewBox="0 0 120 120"><circle class="rt" cx="60" cy="60" r="52"/><circle class="rp" id="restArc" cx="60" cy="60" r="52"/></svg>
      <div class="ring-c"><span class="eyebrow" id="restLbl">${esc(lbl)}</span><b id="restTime">${mmss((s.descansoFim-Date.now())/1000)}</b></div></div>
      <p class="rest-next" id="restNext">${prox}</p>${extra}
      <div class="rest-btns${tipo==='aquec'?' one':''}">${btns}</div></section>`;
  }
  /* aquecimento antes da primeira série */
  if(!rest&&s.aquecimento&&s.aquecimento.length&&!s.aqFeito&&p.f===0){
    h+=`<section class="card aq now"><div class="aq-h">${icon.fire}<span class="tr-b"><span class="tr-n">Aquecimento · ${mmss(aqSeg(s))}</span><span class="tr-m">Antes da primeira ${unid}</span></span></div>
      <ol class="aqlist">${s.aquecimento.map(x=>`<li><b>${mmss(x.s)}</b><span>${esc(x.t)}</span></li>`).join('')}</ol>
      <button class="btn primary" data-act="aqStart">${icon.play}Iniciar aquecimento guiado</button><button class="link" data-act="aqSkip">Já aqueci, pular</button></section>`;
  }
  if(todoFeito){
    h+=`<section class="card fin"><h2>${icon.check} ${circ?'Todas as rodadas feitas':'Todas as séries feitas'}</h2><p class="small">${circ?`${R} ${R===1?'rodada':'rodadas'}`:p.f+' séries'} em ${hhmm((Date.now()-s.inicio)/1000)}. Confira os números e finalize.</p><button class="btn primary" data-act="finish">Finalizar treino</button></section>`;
  }
  /* exercício atual */
  const u=ultimaVez(it,s.id), sg=sugestao(it,u);
  const eb=circ?`Rodada ${Math.min(R,si+1)} de ${R} · exercício ${ii+1} de ${n}`:`Exercício ${ii+1} de ${n}${it.nota?' · '+esc(it.nota):''}`;
  const specs=circ?`<span><b>${rotFaixa(it)}</b></span>${ii<n-1?(+it.descanso?`<span>pausa até <b>${mmss(it.descanso)}</b></span>`:''):`<span>depois descanso <b>${mmss(dr)}</b></span>`}`
    :`<span><b>${it.series}</b> × ${rotFaixa(it)}</span><span>descanso <b>${mmss(it.descanso)}</b></span>${it.porHalter?'<span>carga por halter</span>':''}`;
  const dica=(circ&&it.nota)||it.dica?`<p class="dica">${circ&&it.nota?`<b>${esc(it.nota)}.</b> `:''}${esc(it.dica||'')}</p>`:'';
  h+=`<section class="card exnow"><div class="exnow-h"><div><span class="eyebrow">${eb}</span><h2>${esc(it.nome)}</h2>
      <div class="specs">${specs}</div></div></div>${dica}
      <p class="sug ${sg.cls}">${esc(sg.txt)}</p>
      <div class="sets"><div class="sets-h"><span>${circ?'Rodada':'Série'}</span><span>Anterior</span><span>Hoje</span><span></span></div>`;
  for(let k=0;k<Math.max(it.series,it.sets.length);k++){
    const x=it.sets[k], prev=u&&u.sets[k];
    h+=`<div class="srow${x?' ok':''}${k===si&&!done?' cur':''}"><span class="sn">${k+1}</span><span class="sp">${prev?rotSet(it,prev):'–'}</span>
      <span class="sh">${x?rotSet(it,x)+(x.esforco?` <i class="efx ${x.esforco}">${{facil:'fácil',ideal:'no ponto',dificil:'difícil'}[x.esforco]}</i>`:''):(k===si&&!done?'agora':'')}</span>
      ${x?`<button class="iconbtn sm" data-act="editSet" data-k="${k}" aria-label="Editar ${unid} ${k+1}">${icon.edit}</button>`:'<span></span>'}</div>`;
  }
  h+=`</div>`;
  if(!done){
    const d=prefill(s,ii,si);
    let cta=`Concluir série ${si+1}`;
    if(circ){const t2=clone(s);t2.itens[ii].sets.push({});const nx=proxCircuito(t2,ii);
      cta=nx<0?'Concluir último exercício':t2.itens[nx].sets.length>=si+1?`Concluir rodada ${si+1}`:'Concluir e seguir';}
    h+=`<div class="entry"><span class="eyebrow">${circ?'Rodada':'Série'} ${si+1} de ${it.series}</span><div class="steppers">`;
    if(!it.semCarga&&it.tipo!=='tempo')h+=stepper('carga','Carga · kg'+(it.porHalter?' (cada)':''),fmtKg(d.carga));
    h+=stepper('reps',it.tipo==='tempo'?'Tempo · s':LADO[it.lado]?'Reps '+LADO[it.lado]:'Repetições',d.reps);
    h+=`</div>`;
    if(it.tipo==='tempo')h+=`<button class="btn ghost" data-act="stopwatch" id="swBtn">${icon.clock}${ui.stopwatch?'Parar cronômetro':'Iniciar cronômetro'}</button><p class="sw" id="swTime">${ui.stopwatch?mmss((Date.now()-ui.stopwatch)/1000):''}</p>`;
    h+=`<div class="effort"><span class="small">Como foi?</span>${[['facil','Fácil','sobraram 4+'],['ideal','No ponto','sobraram 2–3'],['dificil','Difícil','0–1 sobrando']].map(([k,l,t])=>`<button class="ef-b${d.esforco===k?' on':''}" data-act="effort" data-v="${k}" title="${t}"><b>${l}</b><span>${t}</span></button>`).join('')}</div>
      <button class="btn primary big" data-act="doneSet">${icon.check}${cta}</button>
      <div class="row-links"><button class="link" data-act="skipEx">Pular para o próximo</button>${circ?'':`<button class="link" data-act="addSet">${icon.plus}Série extra</button>`}</div></div>`;
  }else{
    const nxi=circ?proxCircuito(s,ii):proxPendente(s,ii);
    h+=`<div class="entry"><p class="small">${icon.check} ${circ?'Todas as rodadas deste exercício feitas.':'Exercício concluído.'}</p>${nxi>=0?`<button class="btn primary big" data-act="goEx" data-i="${nxi}">Ir para ${esc(s.itens[nxi].nome)}</button>`:''}${circ?'':`<div class="row-links"><button class="link" data-act="addSet">${icon.plus}Série extra</button></div>`}</div>`;
  }
  h+=`</section>`;
  if(!todoFeito)h+=vComoFazer(it);
  return h;
}
// #region: v-como-fazer
function vComoFazer(it){
  const tem=it.exId&&LIB[it.exId];
  if(!tem)return `<section class="card howto none"><span class="eyebrow">Como fazer</span><p class="small">Este exercício ainda não tem animação 3D. Use a observação da ficha e confirme a execução com o professor.</p></section>`;
  return `<section class="card howto" aria-label="Como fazer ${esc(it.nome)}"><div class="howto-h"><span class="eyebrow">Como fazer</span><h3>${esc(LIB[it.exId].nome)}</h3></div>
    <div class="mini" id="miniStage" data-ex="${esc(it.exId)}"><span class="mini-cap" data-mini-cap aria-live="off"></span><span class="mini-load" data-mini-load>Carregando 3D…</span></div>
    <a class="btn ghost more" href="#${esc(it.exId)}"><span><b>Mais detalhes</b><small>Frames, ângulos, músculos e erros comuns</small></span>${icon.chev}</a></section>`;
}
function mountMini(){
  const el=ui.view==='sessao'?$('#miniStage'):null;
  if(!window.__mini){if(el){const l=el.querySelector('[data-mini-load]');if(l)l.textContent='Não foi possível carregar o 3D.';}return;}
  window.__mini(el,el?el.dataset.ex:null);
}
function stepper(f,label,val){
  return `<div class="stp"><span class="stp-l">${label}</span><div class="stp-r"><button data-act="step" data-f="${f}" data-d="-1" aria-label="Diminuir">−</button><input data-f="${f}" inputmode="decimal" value="${esc(val)}" aria-label="${esc(label)}"><button data-act="step" data-f="${f}" data-d="1" aria-label="Aumentar">+</button></div></div>`;
}

// #region: v-resumo
/* ---------- Resumo ---------- */
function vResumo(){
  const s=S.sessoes[ui.resumoId];
  if(!s)return `<a class="back" href="#">${icon.back}Meus treinos</a>${S.ready?'<p class="empty">Sessão não encontrada.</p>':'<p class="note">Carregando…</p>'}`;
  const v=volumeSessao(s), dur=((s.fim||Date.now())-s.inicio)/1000, cn=nomeConj(s), volta=hrefVolta(s);
  let h=`<div class="navrow"><a class="back" href="${volta}">${icon.back}${esc(volta==='#'?'Meus treinos':cn)}</a>${themeBtn()}</div>${vStatus()}
    <header class="top"><span class="eyebrow">${cn?esc(cn)+' · ':''}${dataCurta(s.fim||s.inicio)}${s.fim?' · '+new Date(s.fim).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''}</span><h1>${esc(s.treinoNome)}</h1></header>
    <div class="stats"><div><b>${hhmm(dur)}</b><span>duração</span></div><div><b>${v.n}</b><span>séries</span></div><div><b>${v.r}</b><span>repetições</span></div><div><b>${Math.round(v.v).toLocaleString('pt-BR')}</b><span>kg levantados</span></div></div>
    ${s.status==='concluida'?vPontosResumo(s):''}
    <section class="sec"><h3>Exercícios</h3><div class="sumlist">`;
  s.itens.forEach(it=>{
    if(!it.sets.length){h+=`<div class="card sumr skip"><b>${esc(it.nome)}</b><span class="small">Não feito</span></div>`;return;}
    const u=ultimaVez(it,s.id);let cmp='';
    if(u&&it.tipo!=='tempo'&&!it.semCarga){const best=a=>a.reduce((m,x)=>(+x.carga>m.c||(+x.carga===m.c&&+x.reps>m.r))?{c:+x.carga,r:+x.reps}:m,{c:-1,r:0});
      const b1=best(it.sets),b0=best(u.sets);const dc=b1.c-b0.c;
      cmp=dc>0?`<span class="cmp up">+${fmtKg(dc)} kg</span>`:dc<0?`<span class="cmp down">${fmtKg(dc)} kg</span>`:(b1.r>b0.r?`<span class="cmp up">+${b1.r-b0.r} reps</span>`:b1.r<b0.r?`<span class="cmp down">${b1.r-b0.r} reps</span>`:'<span class="cmp">igual</span>');}
    else if(u&&it.semCarga&&it.tipo!=='tempo'){const m1=Math.max(...it.sets.map(x=>+x.reps)),m0=Math.max(...u.sets.map(x=>+x.reps));cmp=m1>m0?`<span class="cmp up">+${m1-m0} reps</span>`:m1<m0?`<span class="cmp down">${m1-m0} reps</span>`:'<span class="cmp">igual</span>';}
    else if(u&&it.tipo==='tempo'){const m1=Math.max(...it.sets.map(x=>+x.reps)),m0=Math.max(...u.sets.map(x=>+x.reps));cmp=m1>m0?`<span class="cmp up">+${m1-m0} s</span>`:m1<m0?`<span class="cmp down">${m1-m0} s</span>`:'<span class="cmp">igual</span>';}
    else cmp='<span class="cmp">1ª vez</span>';
    const sg=sugestao(it,{sets:it.sets});
    h+=`<div class="card sumr"><div class="sumr-h"><b>${esc(it.nome)}</b>${cmp}</div><span class="sumr-s">${it.sets.map(x=>rotSet(it,x)).join(' · ')}${it.tipo!=='tempo'&&!it.semCarga?' kg':''}</span><span class="small">Próxima vez: ${esc(sg.txt)}</span></div>`;});
  h+=`</div></section>
    <section class="sec"><h3>Anotações</h3><textarea id="notas" rows="3" placeholder="Como foi o treino? Dor, energia, ajustes de máquina…" ${S.readOnly?'disabled':''}>${esc(s.notas||'')}</textarea>${S.readOnly?'':'<button class="btn ghost" data-act="saveNotes">Salvar anotação</button>'}</section>
    <a class="btn primary" href="${volta}">${volta==='#'?'Voltar ao início':'Voltar para '+esc(cn)}</a>${S.readOnly?'':'<button class="link danger" data-act="delSessao">Apagar esta sessão</button>'}`;
  return h;
}

// #region: pilula
/* ---------- Pílula ao vivo (fora da tela da sessão) ---------- */
function livePill(){
  const pill=$('#livePill'), s=sessaoAtiva();
  if(!s||ui.view==='sessao'){pill.hidden=true;return;}
  pill.hidden=false;
  const r=s.descansoFim&&s.descansoFim>Date.now();
  pill.innerHTML=r?`${icon.clock}<span>${esc(RLBL[s.descansoTipo]||'Descanso')} <b data-live="pill">${mmss((s.descansoFim-Date.now())/1000)}</b></span><em>Voltar ao treino</em>`:`${icon.play}<span>${esc(s.treinoNome)} · ${feitoSessao(s).f}/${feitoSessao(s).t}</span><em>Voltar ao treino</em>`;
  pill.classList.toggle('resting',!!r);
}

// #region: relogio
/* ---------- Relógio: descanso, tempo de treino, cronômetro ---------- */
let audio=null, alerted=0, wake=null;
function beep(freq,dur,when=0){try{if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.0001,audio.currentTime+when);g.gain.exponentialRampToValueAtTime(.35,audio.currentTime+when+.02);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+when+dur);o.connect(g).connect(audio.destination);o.start(audio.currentTime+when);o.stop(audio.currentTime+when+dur+.05);}catch(e){}}
function unlockAudio(){try{if(!audio){const A=window.AudioContext||window.webkitAudioContext;if(A)audio=new A();}if(audio&&audio.state==='suspended')audio.resume();}catch(e){}}
let lastTickSec=-1, aqStep=-1;
function tick(force){
  const s=sessaoAtiva();
  document.querySelectorAll('[data-live="elapsed"]').forEach(e=>{if(s)e.textContent=hhmm((Date.now()-s.inicio)/1000);});
  if(s&&s.descansoFim){
    const left=(s.descansoFim-Date.now())/1000;
    const sec=Math.ceil(left);
    const t=$('#restTime'),arc=$('#restArc'),lbl=$('#restLbl'),card=$('#restCard'),pill=document.querySelector('[data-live="pill"]');
    if(t)t.textContent=left>0?mmss(left):'0:00';
    if(pill)pill.textContent=left>0?mmss(left):'0:00';
    if(arc){const tot=s.descansoTotal||60;const f=Math.max(0,Math.min(1,left/tot));const c=2*Math.PI*52;arc.style.strokeDasharray=c;arc.style.strokeDashoffset=c*(1-f);}
    if(left<=0){
      if(lbl)lbl.textContent=RFIM[s.descansoTipo]||'Próxima série!';if(card)card.classList.add('go');
      if(alerted!==s.descansoFim){alerted=s.descansoFim;beep(880,.18);beep(880,.18,.25);beep(1175,.35,.5);try{navigator.vibrate&&navigator.vibrate([250,120,250,120,400]);}catch(e){}livePill();}
      if(left<-60&&!force){schedule();}
    }else if(sec<=3&&sec>=1&&sec!==lastTickSec){lastTickSec=sec;beep(660,.08);}
    if(s.descansoTipo==='aquec'&&s.aquecimento&&s.aquecimento.length&&left>0){const a=aqPasso(s),nx=$('#restNext');
      if(nx)nx.innerHTML=aqNextTxt(s,a);
      document.querySelectorAll('#restCard [data-aq]').forEach(li=>{const k=+li.dataset.aq;li.className=k<a.i?'ok':k===a.i?'cur':'';});
      if(aqStep!==a.i){if(aqStep>=0&&a.i>aqStep){beep(988,.12);beep(988,.12,.18);}aqStep=a.i;}}
    else if(s.descansoTipo==='aquec'&&left<=0){const nx=$('#restNext');if(nx&&!nx.dataset.fim){nx.dataset.fim=1;nx.innerHTML='Aquecimento concluído. Vamos ao primeiro exercício.';}
      document.querySelectorAll('#restCard [data-aq]').forEach(li=>{li.className='ok';});}
  }
  if(ui.stopwatch){const e=$('#swTime');if(e)e.textContent=mmss((Date.now()-ui.stopwatch)/1000);}
}
setInterval(()=>tick(false),250);
async function keepAwake(on){
  try{if(on&&!wake&&navigator.wakeLock){wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>{wake=null;});}
    if(!on&&wake){await wake.release();wake=null;}}catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(sessaoAtiva())keepAwake(true);tick(true);schedule();}});

// #region: folhas
/* ---------- Bottom sheet ---------- */
let sheetHandler=null;
function openSheet(html,handler){const w=$('#sheetWrap');$('#sheet').innerHTML=html;sheetHandler=handler;w.hidden=false;requestAnimationFrame(()=>w.classList.add('open'));const f=$('#sheet [autofocus]');if(f)setTimeout(()=>f.focus(),60);}
function closeSheet(){const w=$('#sheetWrap');w.classList.remove('open');setTimeout(()=>{w.hidden=true;$('#sheet').innerHTML='';sheetHandler=null;if(pendingRender)render();},180);}
$('#sheetWrap').addEventListener('click',e=>{if(e.target.id==='sheetWrap'){closeSheet();return;}const b=e.target.closest('[data-act]');if(!b)return;if(b.dataset.act==='close'){closeSheet();return;}if(sheetHandler)sheetHandler(b.dataset.act,b,e);});
$('#sheetWrap').addEventListener('input',e=>{if(sheetHandler)sheetHandler('input',e.target,e);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sheetWrap').hidden)closeSheet();});
let toastT=0;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>{t.classList.remove('on');setTimeout(()=>t.hidden=true,200);},2600);}
function confirmSheet(title,text,okLabel,onOk,danger){
  openSheet(`<h3>${esc(title)}</h3><p class="small">${esc(text)}</p><div class="sheet-btns"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn ${danger?'danger':'primary'}" data-act="ok">${esc(okLabel)}</button></div>`,act=>{if(act==='ok'){closeSheet();onOk();}});
}

// #region: folhas-edicao
/* ---------- Edição de treino ---------- */
function itemPadrao(exId,nome,t){
  const L=exId?LIB[exId]:null;
  const tempo=L&&L.tipo==='tempo', circ=ehCircuito(t);
  const it={uid:uid('i'),exId:exId||null,nome:L?L.nome:nome,nota:L?L.foco.replace(/\s*\(cada (lado|perna)\)/,''):'',series:circ?nRodadas(t):2,tipo:tempo?'tempo':'reps',min:tempo?30:(L&&!L.principal?10:8),max:tempo?40:(L&&!L.principal?15:12),
    descanso:circ?30:(L&&L.principal?120:60),passo:L?(L.passo||2.5):2.5,porHalter:!!(L&&L.porHalter),semCarga:!!(L&&L.semCarga)};
  if(L&&L.lado)it.lado=L.lado;
  return it;
}
function sheetItem(t,i){
  const it=clone(t.itens[i]);const isLib=it.exId&&LIB[it.exId];const circ=ehCircuito(t);
  const draw=()=>`<h3>${esc(it.nome)}</h3>
    ${isLib?'':`<label class="fld"><span>Nome</span><input data-k="nome" value="${esc(it.nome)}"></label>`}
    <div class="grid2">${circ?`<div class="fld"><span>Rodadas</span><p class="fixo">${volumeTxt(t)} <small>definidas no treino</small></p></div>`:num('series','Séries',it.series)}<div class="fld"><span>Tipo</span><div class="seg2"><button data-act="tipo" data-v="reps" aria-pressed="${it.tipo!=='tempo'}">Repetições</button><button data-act="tipo" data-v="tempo" aria-pressed="${it.tipo==='tempo'}">Tempo</button></div></div></div>
    <div class="grid2">${num('min',it.tipo==='tempo'?'Mínimo (s)':'Reps mínimas',it.min)}${num('max',it.tipo==='tempo'?'Máximo (s)':'Reps máximas',it.max)}</div>
    ${it.tipo==='tempo'?'':`<div class="fld"><span>Contagem das repetições</span><div class="seg2">${[['','Total'],['lado','Por lado'],['perna','Por perna']].map(([v,l])=>`<button data-act="lado" data-v="${v}" aria-pressed="${(it.lado||'')===v}">${l}</button>`).join('')}</div></div>`}
    <div class="fld"><span>${circ?(i===t.itens.length-1?'Pausa · no último vale o descanso da rodada':'Pausa até o próximo exercício'):'Descanso entre séries'}</span><div class="chips">${(circ?[0,15,20,30,40,60]:[45,60,90,120,150,180]).map(v=>`<button data-act="desc" data-v="${v}" aria-pressed="${+it.descanso===v}">${v?mmss(v):'Sem pausa'}</button>`).join('')}</div></div>
    ${it.tipo==='tempo'||it.semCarga?'':`<div class="grid2">${num('passo','Aumento de carga (kg)',fmtKg(it.passo))}<div class="fld"><span>Carga</span><div class="seg2"><button data-act="ph" data-v="0" aria-pressed="${!it.porHalter}">Total</button><button data-act="ph" data-v="1" aria-pressed="${!!it.porHalter}">Por halter</button></div></div></div>`}
    <label class="fld"><span>Observação</span><input data-k="nota" value="${esc(it.nota||'')}" placeholder="Ex.: banco na posição 4"></label>
    <label class="fld"><span>Dica de execução</span><input data-k="dica" value="${esc(it.dica||'')}" placeholder="Ex.: corpo alinhado e descida controlada"></label>
    <div class="sheet-row"><button class="btn ghost" data-act="up" ${i===0?'disabled':''}>↑ Subir</button><button class="btn ghost" data-act="down" ${i===t.itens.length-1?'disabled':''}>↓ Descer</button><button class="btn ghost danger-t" data-act="rm">Remover</button></div>
    <div class="sheet-btns"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn primary" data-act="save">Salvar</button></div>`;
  const num=(k,l,v)=>`<label class="fld"><span>${l}</span><input data-k="${k}" inputmode="decimal" value="${esc(v)}"></label>`;
  const redraw=()=>{$('#sheet').innerHTML=draw();};
  openSheet(draw(),(act,b)=>{
    if(act==='input'){const k=b.dataset.k;if(!k)return;it[k]=['nome','nota','dica'].includes(k)?b.value:parseNum(b.value);return;}
    if(act==='lado'){if(b.dataset.v)it.lado=b.dataset.v;else delete it.lado;redraw();}
    if(act==='tipo'){it.tipo=b.dataset.v;if(it.tipo==='tempo'&&it.max>120){it.min=30;it.max=40;}if(it.tipo==='reps'&&it.max>30){it.min=8;it.max=12;}redraw();}
    if(act==='desc'){it.descanso=+b.dataset.v;redraw();}
    if(act==='ph'){it.porHalter=b.dataset.v==='1';redraw();}
    const T=clone(S.treinos[t.id]);
    if(act==='up'||act==='down'){const j=act==='up'?i-1:i+1;[T.itens[i],T.itens[j]]=[T.itens[j],T.itens[i]];put('treinos',T.id,T);closeSheet();}
    if(act==='rm'){T.itens.splice(i,1);put('treinos',T.id,T);closeSheet();toast('Exercício removido');}
    if(act==='save'){it.series=circ?nRodadas(T):Math.max(1,Math.round(it.series||1));if(!(it.dica||'').trim())delete it.dica;it.min=Math.max(1,Math.round(it.min||1));it.max=Math.max(it.min,Math.round(it.max||it.min));it.passo=it.passo>0?it.passo:2.5;
      T.itens[i]=it;put('treinos',T.id,T);closeSheet();}
  });
}
function sheetAdd(t){
  let q='', f='todos';
  const draw=()=>{const have=new Set((S.treinos[t.id].itens||[]).map(x=>x.exId));
    let h=`<h3>Adicionar exercício</h3><input class="search" data-k="q" placeholder="Buscar na biblioteca" value="${esc(q)}">
      <div class="chips">${[['todos','Todos'],['sem','Sem equipamento'],['com','Com equipamento']].map(([v,l])=>`<button data-act="eqf" data-v="${v}" aria-pressed="${f===v}">${l}</button>`).join('')}</div>`;
    let n=0;
    GRUPOS.forEach(g=>{const ids=Object.keys(LIB).filter(k=>LIB[k].grupo===g&&(!q||LIB[k].nome.toLowerCase().includes(q.toLowerCase()))&&(f==='todos'||(f==='sem')===!LIB[k].eq.length));if(!ids.length)return;n+=ids.length;
      h+=`<div class="pick-g">${g}</div>`;ids.forEach(k=>{h+=`<button class="pick" data-act="pick" data-id="${k}"><span><b>${esc(LIB[k].nome)}</b><span>${esc(LIB[k].foco)}</span><span class="eqtags">${eqTag(k)}${intensTag(k)}</span></span>${have.has(k)?`<em class="in">${icon.check}no treino</em>`:`<em>${icon.plus}</em>`}</button>`;});});
    if(!n)h+=`<p class="small">Nenhum exercício da biblioteca com esse filtro. Use "Outro exercício" abaixo.</p>`;
    h+=`<div class="pick-g">Outro exercício (sem 3D)</div><div class="sheet-row"><input data-k="livre" id="livre" placeholder="Nome do exercício"><button class="btn ghost" data-act="addLivre">Adicionar</button></div>
      <div class="sheet-btns"><button class="btn primary" data-act="close">Pronto</button></div>`;return h;};
  openSheet(draw(),(act,b)=>{
    if(act==='eqf'){f=b.dataset.v;$('#sheet').innerHTML=draw();return;}
    if(act==='input'){if(b.dataset.k==='q'){q=b.value;const pos=b.selectionStart;$('#sheet').innerHTML=draw();const n=$('#sheet .search');n.focus();n.setSelectionRange(pos,pos);}return;}
    const T=clone(S.treinos[t.id]);T.itens=T.itens||[];
    if(act==='pick'){T.itens.push(itemPadrao(b.dataset.id,null,T));put('treinos',T.id,T);toast(LIB[b.dataset.id].nome+' adicionado');$('#sheet').innerHTML=draw();}
    if(act==='addLivre'){const v=($('#livre').value||'').trim();if(!v)return;T.itens.push(itemPadrao(null,v,T));put('treinos',T.id,T);toast(v+' adicionado');$('#sheet').innerHTML=draw();}
  });
}
function sheetTreino(t,isNew,cid){
  const x=clone(t), c=cid?S.conjuntos[cid]:null;let dia=c?diaEm(c,t.id):'';
  const cs=conjuntosOrd();const sel=new Set(isNew?(c?[c.id]:[]):conjuntosCom(t.id).map(k=>k.id));
  const draw=()=>`<h3>${isNew?'Novo treino':'Editar treino'}</h3>
    <label class="fld"><span>Nome</span><input data-k="nome" value="${esc(x.nome)}" ${isNew?'autofocus':''}></label>
    <div class="grid2"><label class="fld"><span>Letra</span><input data-k="letra" maxlength="2" value="${esc(x.letra||'')}"></label>${c?`<label class="fld"><span>Dia neste conjunto</span><input data-k="dia" value="${esc(dia)}" placeholder="Ex.: Terça"></label>`:'<span></span>'}</div>
    <label class="fld"><span>Foco</span><input data-k="foco" value="${esc(x.foco||'')}" placeholder="Ex.: Ênfase em agachamento, empurrar e puxar"></label>
    <div class="fld"><span>Formato</span><div class="seg2"><button data-act="fmt" data-v="series" aria-pressed="${!ehCircuito(x)}">Séries</button><button data-act="fmt" data-v="circuito" aria-pressed="${ehCircuito(x)}">Circuito</button></div>
      <small class="fhint">${ehCircuito(x)?'Um exercício depois do outro; ao fim de cada rodada, um descanso maior.':'Todas as séries de um exercício antes de passar ao próximo.'}</small></div>
    ${ehCircuito(x)?`<div class="grid2"><label class="fld"><span>Rodadas</span><input data-k="rodadas" inputmode="numeric" value="${esc(nRodadas(x))}"></label><span></span></div>
      <div class="fld"><span>Descanso entre rodadas</span><div class="chips">${[30,45,60,90,120].map(v=>`<button data-act="dRod" data-v="${v}" aria-pressed="${(+x.descansoRodada||60)===v}">${mmss(v)}</button>`).join('')}</div></div>`:''}
    <div class="fld"><span>Aquecimento guiado</span><div class="seg2"><button data-act="aq" data-v="0" aria-pressed="${!(x.aquecimento&&x.aquecimento.length)}">Sem</button><button data-act="aq" data-v="1" aria-pressed="${!!(x.aquecimento&&x.aquecimento.length)}">${mmss(aqSeg(x.aquecimento&&x.aquecimento.length?x:{aquecimento:AQ_PADRAO}))} no início</button></div></div>
    ${cs.length?`<div class="fld"><span>Conjuntos em que este treino aparece</span><div class="chips">${cs.map(k=>`<button data-act="cj" data-id="${esc(k.id)}" aria-pressed="${sel.has(k.id)}">${sel.has(k.id)?icon.check:''}${esc(k.nome)}</button>`).join('')}</div></div>`:''}
    ${isNew?'':`<div class="sheet-row"><button class="btn ghost" data-act="dup">Duplicar${c?' só para este conjunto':''}</button><button class="btn ghost danger-t" data-act="del">Excluir treino</button></div>`}
    <div class="sheet-btns"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn primary" data-act="save">${isNew?'Criar':'Salvar'}</button></div>`;
  openSheet(draw(),(act,b)=>{
    if(act==='input'){const k=b.dataset.k;if(k==='dia')dia=b.value;else if(k==='rodadas')x.rodadas=Math.max(1,Math.min(10,Math.round(parseNum(b.value))||1));else if(k)x[k]=b.value;return;}
    if(act==='fmt'){if(b.dataset.v==='circuito'){x.formato='circuito';x.rodadas=nRodadas(x);x.descansoRodada=+x.descansoRodada||60;(x.itens||[]).forEach(i=>{if(+i.descanso>60)i.descanso=30;});}
      else{x.formato='series';}$('#sheet').innerHTML=draw();return;}
    if(act==='dRod'){x.descansoRodada=+b.dataset.v;$('#sheet').innerHTML=draw();return;}
    if(act==='aq'){if(b.dataset.v==='1'){if(!(x.aquecimento&&x.aquecimento.length))x.aquecimento=clone(AQ_PADRAO);}else delete x.aquecimento;$('#sheet').innerHTML=draw();return;}
    if(act==='cj'){const id=b.dataset.id;if(sel.has(id))sel.delete(id);else sel.add(id);$('#sheet').innerHTML=draw();return;}
    if(act==='dup'){closeSheet();duplicarTreino(t.id,cid);return;}
    if(act==='del'){closeSheet();excluirTreino(t.id,cid);return;}
    if(act==='save'){x.nome=(x.nome||'').trim()||'Treino';delete x.dia;delete x.ordem;
      if(ehCircuito(x)){x.rodadas=nRodadas(x);x.descansoRodada=+x.descansoRodada||60;(x.itens||[]).forEach(i=>{i.series=x.rodadas;});}
      else if(x.formato){const eraC=ehCircuito(t);delete x.formato;delete x.rodadas;delete x.descansoRodada;if(eraC)(x.itens||[]).forEach(i=>{if(+i.descanso<45)i.descanso=60;});}
      put('treinos',x.id,x);
      cs.forEach(k=>{const tem=(k.treinos||[]).some(m=>m.id===x.id), quer=sel.has(k.id);
        if(tem===quer&&!(c&&k.id===c.id))return;
        const K=clone(k);K.treinos=K.treinos||[];
        if(quer&&!tem)K.treinos.push({id:x.id,dia:c&&k.id===c.id?dia.trim():''});
        if(!quer&&tem)K.treinos=K.treinos.filter(m=>m.id!==x.id);
        if(quer&&c&&k.id===c.id)K.treinos.forEach(m=>{if(m.id===x.id)m.dia=dia.trim();});
        put('conjuntos',K.id,K);});
      closeSheet();
      if(isNew)location.hash=hrefTreino(x.id,c&&sel.has(c.id)?c.id:null);
      else if(c&&!sel.has(c.id)){toast('Removido de '+c.nome+'. O treino continua na biblioteca.');location.hash='#conjunto/'+enc(c.id);}
    }
  });
}
function novoTreino(cid){
  const L=proximaLetra(treinosLib());   /* letra livre na biblioteca inteira: evita dois "Treino A" diferentes */
  sheetTreino({id:uid('t'),nome:'Treino '+L,letra:L,foco:'',itens:[]},true,cid||null);
}
function duplicarTreino(tid,cid){
  const t=S.treinos[tid];if(!t)return;const c=cid?S.conjuntos[cid]:null;
  const y=Object.assign(clone(t),{id:uid('t'),nome:t.nome+' (cópia)',itens:(t.itens||[]).map(it=>Object.assign(clone(it),{uid:uid('i')}))});delete y.dia;delete y.ordem;
  put('treinos',y.id,y);
  if(c){const K=clone(c);K.treinos=(K.treinos||[]).map(m=>m.id===tid?{id:y.id,dia:m.dia||''}:m);put('conjuntos',K.id,K);
    toast('Cópia criada: agora só '+c.nome+' usa esta versão.');}
  else toast('Cópia criada na biblioteca.');
  location.hash=hrefTreino(y.id,c?c.id:null);
}
function excluirTreino(tid,cid){
  const t=S.treinos[tid];if(!t)return;const us=conjuntosCom(tid);
  confirmSheet('Excluir '+t.nome+'?',(us.length?`Ele sai da biblioteca e de ${us.length===1?'"'+us[0].nome+'"':us.length+' conjuntos'}. `:'Ele sai da biblioteca. ')+'O histórico de sessões já feitas continua salvo.','Excluir treino',()=>{
    us.forEach(k=>{const K=clone(k);K.treinos=(K.treinos||[]).filter(m=>m.id!==tid);put('conjuntos',K.id,K);});
    del('treinos',tid);location.hash=cid&&S.conjuntos[cid]?'#conjunto/'+enc(cid):'#biblioteca/treinos';},true);
}
function sheetConjunto(c,isNew){
  const x=clone(c);
  const ints=[[0,'Sem mínimo'],[24,'24 h'],[48,'48 h'],[72,'72 h']];
  const draw=()=>`<h3>${isNew?'Novo conjunto de treino':'Editar conjunto'}</h3>
    <label class="fld"><span>Nome</span><input data-k="nome" value="${esc(x.nome||'')}" placeholder="Ex.: Treino em casa" ${isNew?'autofocus':''}></label>
    <label class="fld"><span>Descrição</span><input data-k="descricao" value="${esc(x.descricao||'')}" placeholder="Ex.: Full Body A/B · Recomposição corporal"></label>
    <div class="grid2"><label class="fld"><span>Frequência</span><input data-k="frequencia" value="${esc(x.frequencia||'')}" placeholder="Ex.: 3x por semana"></label><label class="fld"><span>Duração</span><input data-k="duracao" value="${esc(x.duracao||'')}" placeholder="Ex.: 40 min"></label></div>
    <div class="fld"><span>Intervalo mínimo entre treinos</span><div class="chips">${ints.map(([v,l])=>`<button data-act="int" data-v="${v}" aria-pressed="${(+x.intervaloH||0)===v}">${l}</button>`).join('')}</div></div>
    ${isNew?'':'<div class="sheet-row"><button class="btn ghost danger-t" data-act="del">Excluir conjunto</button></div>'}
    <div class="sheet-btns"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn primary" data-act="save">${isNew?'Criar conjunto':'Salvar'}</button></div>`;
  openSheet(draw(),(act,b)=>{
    if(act==='input'){x[b.dataset.k]=b.value;return;}
    if(act==='int'){x.intervaloH=+b.dataset.v;x.intervalo=x.intervaloH?x.intervaloH+' h entre sessões':'';$('#sheet').innerHTML=draw();return;}
    if(act==='del'){closeSheet();confirmSheet('Excluir '+x.nome+'?','Os treinos continuam na biblioteca e o histórico de sessões continua salvo.','Excluir conjunto',()=>{del('conjuntos',x.id);location.hash='#';},true);return;}
    if(act==='save'){x.nome=(x.nome||'').trim()||'Novo conjunto';put('conjuntos',x.id,x);closeSheet();if(isNew)location.hash='#conjunto/'+enc(x.id);}
  });
}
function sheetAddTreino(c){
  const draw=()=>{const k=S.conjuntos[c.id]||c;const tem=new Set((k.treinos||[]).map(m=>m.id));const ts=treinosLib();
    let h=`<h3>Adicionar treino a ${esc(k.nome)}</h3><button class="btn ghost dashed" data-act="novo">${icon.plus}Criar um treino novo</button><div class="pick-g">Da biblioteca</div>`;
    if(!ts.length)h+=`<p class="small">Nenhum treino salvo ainda.</p>`;
    ts.forEach(t=>{const outros=conjuntosCom(t.id).filter(x=>x.id!==k.id);const cats=eqCats(t);
      h+=`<button class="pick" data-act="pickT" data-id="${esc(t.id)}" ${tem.has(t.id)?'disabled':''}><span class="letter xs">${esc(t.letra||t.nome.slice(-1))}</span><span><b>${esc(t.nome)}</b><span>${(t.itens||[]).length} exercícios${cats?' · '+(cats.length?cats.map(q=>EQ[q]).join(', '):'sem equipamento'):''}${outros.length?' · em '+esc(outros.map(x=>x.nome).join(', ')):''}</span></span>${tem.has(t.id)?`<em class="in">${icon.check}no conjunto</em>`:`<em>${icon.plus}</em>`}</button>`;});
    return h+`<div class="sheet-btns"><button class="btn primary" data-act="close">Pronto</button></div>`;};
  openSheet(draw(),(act,b)=>{
    if(act==='novo'){closeSheet();setTimeout(()=>novoTreino(c.id),200);return;}
    if(act==='pickT'){const K=clone(S.conjuntos[c.id]);K.treinos=K.treinos||[];if(K.treinos.some(m=>m.id===b.dataset.id))return;
      K.treinos.push({id:b.dataset.id,dia:''});put('conjuntos',K.id,K);toast(S.treinos[b.dataset.id].nome+' adicionado a '+K.nome);$('#sheet').innerHTML=draw();}
  });
}

// #region: acoes-sessao
/* ---------- Ações da sessão ---------- */
function iniciar(tid,cid){
  const t=S.treinos[tid];if(!t)return;const c=cid&&S.conjuntos[cid]?S.conjuntos[cid]:null;
  const act=sessaoAtiva();
  if(act){confirmSheet('Já existe um treino em andamento',`${act.treinoNome} começou ${haQuanto(act.inicio)}. Continue esse treino ou descarte para começar outro.`,'Continuar treino em andamento',()=>{location.hash='#sessao';});return;}
  unlockAudio();
  const s={id:uid('s'),conjuntoId:c?c.id:null,conjuntoNome:c?c.nome:'',treinoId:t.id,treinoNome:t.nome,letra:t.letra||'',inicio:Date.now(),fim:null,status:'andamento',atual:0,descansoFim:null,descansoTotal:0,notas:'',
    itens:(t.itens||[]).map(it=>Object.assign(clone(it),{sets:[]},ehCircuito(t)?{series:nRodadas(t)}:{}))};
  if(ehCircuito(t)){s.formato='circuito';s.rodadas=nRodadas(t);s.descansoRodada=+t.descansoRodada||60;}
  if(t.aquecimento&&t.aquecimento.length)s.aquecimento=clone(t.aquecimento);
  s.pesoCorp=perfil().peso;
  ui.draft={};put('sessoes',s.id,s);location.hash='#sessao';
}
function mutS(fn){const s=clone(sessaoAtiva());fn(s);put('sessoes',s.id,s);return s;}
function lerDraft(s){const ii=exAtual(s),it=s.itens[ii];const d=prefill(s,ii,it.sets.length);
  document.querySelectorAll('#sessaoView .stp input').forEach(inp=>{d[inp.dataset.f]=parseNum(inp.value);});return d;}
function concluirSerie(){
  unlockAudio();
  const s0=sessaoAtiva();if(!s0)return;const d=lerDraft(s0);
  if(ui.stopwatch){d.reps=Math.round((Date.now()-ui.stopwatch)/1000);ui.stopwatch=null;}
  const ii=exAtual(s0);
  const s=mutS(s=>{const it=s.itens[ii];it.sets.push({carga:it.semCarga||it.tipo==='tempo'?null:d.carga,reps:Math.max(0,Math.round(d.reps)),esforco:d.esforco||null,t:Date.now()});
    s.aqFeito=true;
    if(ehCircuito(s)){
      const nx=proxCircuito(s,ii);
      if(nx<0){s.descansoFim=null;}
      else{const nova=s.itens[nx].sets.length>=it.sets.length, dur=nova?(+s.descansoRodada||60):(+it.descanso||0);
        s.atual=nx;s.descansoTipo=nova?'rodada':'troca';
        if(dur>0){s.descansoTotal=dur;s.descansoFim=Date.now()+dur*1000;}else s.descansoFim=null;}
    }else{
      const nx=proxPendente(s,ii);s.descansoTipo='serie';
      if(nx<0){s.descansoFim=null;}
      else{s.descansoTotal=+it.descanso||60;s.descansoFim=Date.now()+s.descansoTotal*1000;if(it.sets.length>=it.series)s.atual=nx;}
    }
  });
  alerted=0;lastTickSec=-1;
  /* pontos da série e recorde na hora */
  try{const g=jogo(),it=s.itens[ii],x=it.sets[it.sets.length-1],pts=Math.round(ptsSerie(it,x,+s.pesoCorp||g.peso));
    const m=marcaDe(it,x),ant=g.best[exChave(it)];let antes=ant;it.sets.slice(0,-1).forEach(y=>{const my=marcaDe(it,y);if(my&&ant)antes=juntaMarca(antes,my);});
    const rec=!!(m&&ant&&melhorQue(m,antes));voaPontos(pts,rec?'recorde!':'');
    if(rec){toast(`Recorde pessoal em ${it.nome}: ${txtMarca(it,x)}`);try{beep(1175,.12);beep(1568,.18,.14);}catch(e){}}}catch(e){}
  try{navigator.vibrate&&navigator.vibrate(40);}catch(e){}
  window.scrollTo({top:0,behavior:'smooth'});
}

// #region: eventos
/* ---------- Eventos ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('#appView [data-act]');if(!b)return;
  const act=b.dataset.act;
  if(act==='start'){iniciar(b.dataset.id,b.dataset.c);return;}
  if(act==='histAll'){ui.histAll=true;render(true);return;}
  if(act==='perfil'){sheetPerfil();return;}
  if(act==='extratoAll'){ui.extratoAll=true;render(true);return;}
  if(act==='recAll'){ui.recAll=true;render(true);return;}
  if(act==='wtip'){const tip=$('#wcTip');if(tip)tip.textContent=b.dataset.tip;document.querySelectorAll('.wc-col').forEach(c=>c.classList.toggle('sel',c===b));return;}
  const cv=(ui.view==='conjunto'||ui.view==='treino')&&ui.conjuntoId?S.conjuntos[ui.conjuntoId]:null;
  if(act==='novoConjunto'){const cs=conjuntosOrd();sheetConjunto({id:uid('c'),nome:'',descricao:'',frequencia:'',duracao:'',intervalo:'',intervaloH:0,treinos:[],ordem:(cs.length?Math.max(...cs.map(c=>c.ordem||0)):0)+1,criado:Date.now()},true);return;}
  if(act==='editConjunto'&&cv){sheetConjunto(cv,false);return;}
  if(act==='addTreino'&&cv){sheetAddTreino(cv);return;}
  if(act==='novoTreino'){novoTreino(cv?cv.id:null);return;}
  const t=S.treinos[ui.treinoId];
  if(act==='editTreino'&&t){sheetTreino(t,false,cv?cv.id:null);return;}
  if(act==='dupTreino'&&t){duplicarTreino(t.id,cv?cv.id:null);return;}
  if(act==='editItem'&&t){sheetItem(t,+b.dataset.i);return;}
  if(act==='addItem'&&t){sheetAdd(t);return;}
  if(act==='delTreino'&&t){excluirTreino(t.id,null);return;}
  if((act==='fichaTog'||act==='fichaReset')&&cv){const K=clone(cv), seg=segundaDe(Date.now());
    K.fichas=fichasDe(K);delete K.semana;
    if(act==='fichaReset')K.fichas[seg]={};
    else{const k=b.dataset.k,f=Object.assign({},K.fichas[seg]||{});if(f[k])delete f[k];else{f[k]=Date.now();if(/^cam/.test(k))voaPontos(P_CAM,'caminhada');else if(/^x/.test(k))voaPontos(P_EXTRA,'');}K.fichas[seg]=f;}
    put('conjuntos',K.id,K);if(act==='fichaReset')toast('Semana reiniciada');return;}
  if(act==='rmDoConjunto'&&t&&cv){const K=clone(cv);K.treinos=(K.treinos||[]).filter(m=>m.id!==t.id);put('conjuntos',K.id,K);toast('Removido de '+K.nome+'. O treino continua na biblioteca.');location.hash='#conjunto/'+enc(K.id);return;}
  /* sessão */
  const s=sessaoAtiva();
  if(act==='goEx'&&s){mutS(x=>{x.atual=+b.dataset.i;});ui.stopwatch=null;window.scrollTo({top:0,behavior:'smooth'});return;}
  if(act==='step'&&s){const inp=b.parentNode.querySelector('input');const f=b.dataset.f;const ii=exAtual(s),it=s.itens[ii];
    const stepV=f==='carga'?(+it.passo||2.5):(it.tipo==='tempo'?5:1);let v=parseNum(inp.value)+(+b.dataset.d)*stepV;v=Math.max(0,Math.round(v*100)/100);
    inp.value=f==='carga'?fmtKg(v):v;const d=prefill(s,ii,it.sets.length);d[f]=v;return;}
  if(act==='effort'&&s){const ii=exAtual(s),it=s.itens[ii];const d=prefill(s,ii,it.sets.length);lerDraft(s);d.esforco=d.esforco===b.dataset.v?null:b.dataset.v;
    b.parentNode.querySelectorAll('.ef-b').forEach(x=>x.classList.toggle('on',x.dataset.v===d.esforco));return;}
  if(act==='doneSet'&&s){concluirSerie();return;}
  if(act==='stopwatch'&&s){unlockAudio();if(ui.stopwatch){const sec=Math.round((Date.now()-ui.stopwatch)/1000);ui.stopwatch=null;const ii=exAtual(s),it=s.itens[ii];const d=prefill(s,ii,it.sets.length);d.reps=sec;render(true);}
    else{ui.stopwatch=Date.now();b.innerHTML=icon.clock+'Parar cronômetro';}return;}
  if(act==='rest'&&s){mutS(x=>{const base=Math.max(Date.now(),x.descansoFim||Date.now());x.descansoFim=base+(+b.dataset.d)*1000;x.descansoTotal=Math.max(15,(x.descansoTotal||60)+(+b.dataset.d));});alerted=0;return;}
  if(act==='skipRest'&&s){mutS(x=>{x.descansoFim=null;});return;}
  if(act==='aqStart'&&s){unlockAudio();aqStep=-1;alerted=0;lastTickSec=-1;mutS(x=>{const tot=aqSeg(x)||120;x.aqFeito=true;x.aqGuiado=true;x.descansoTipo='aquec';x.descansoTotal=tot;x.descansoFim=Date.now()+tot*1000;});window.scrollTo({top:0,behavior:'smooth'});return;}
  if(act==='aqSkip'&&s){mutS(x=>{x.aqFeito=true;});return;}
  if(act==='addSet'&&s){mutS(x=>{x.itens[exAtual(x)].series++;});return;}
  if(act==='skipEx'&&s){const nx=proxPendente(s,exAtual(s)+1);if(nx>=0&&nx!==exAtual(s))mutS(x=>{x.atual=nx;});else toast('Não há outro exercício pendente.');return;}
  if(act==='editSet'&&s){sheetSet(s,exAtual(s),+b.dataset.k);return;}
  if(act==='endMenu'&&s){const p=feitoSessao(s);
    openSheet(`<h3>Encerrar treino?</h3><p class="small">${p.f} de ${p.t} séries feitas.</p><div class="sheet-col"><button class="btn primary" data-act="fin">Finalizar e salvar</button><button class="btn ghost" data-act="close">Continuar treinando</button><button class="btn ghost danger-t" data-act="discard">Descartar este treino</button></div>`,a=>{
      if(a==='fin'){closeSheet();finalizar();}
      if(a==='discard'){closeSheet();confirmSheet('Descartar o treino?','As séries registradas nesta sessão serão apagadas.','Descartar',()=>{const v=hrefVolta(s);del('sessoes',s.id);keepAwake(false);location.hash=v;},true);}
    });return;}
  if(act==='finish'&&s){finalizar();return;}
  /* resumo */
  const r=S.sessoes[ui.resumoId];
  if(act==='saveNotes'&&r){const x=clone(r);x.notas=$('#notas').value;put('sessoes',x.id,x);toast('Anotação salva');return;}
  if(act==='delSessao'&&r){confirmSheet('Apagar esta sessão?','Ela some do histórico e das comparações.','Apagar',()=>{const v=hrefVolta(r);del('sessoes',r.id);location.hash=v;},true);return;}
});
document.addEventListener('input',e=>{const inp=e.target.closest('#sessaoView .stp input');if(!inp)return;const s=sessaoAtiva();if(!s)return;const ii=exAtual(s),it=s.itens[ii];prefill(s,ii,it.sets.length)[inp.dataset.f]=parseNum(inp.value);});
$('#livePill').addEventListener('click',()=>{location.hash='#sessao';});
function finalizar(){const s=sessaoAtiva();if(!s)return;mutS(x=>{x.status='concluida';x.fim=Date.now();x.descansoFim=null;});keepAwake(false);ui.stopwatch=null;location.hash='#resumo/'+s.id;}
function sheetSet(s,ii,k){
  const it=s.itens[ii];const x=clone(it.sets[k]);
  openSheet(`<h3>${esc(it.nome)} · série ${k+1}</h3><div class="grid2">${it.semCarga||it.tipo==='tempo'?'':`<label class="fld"><span>Carga (kg)</span><input data-k="carga" inputmode="decimal" value="${fmtKg(x.carga)}"></label>`}<label class="fld"><span>${it.tipo==='tempo'?'Tempo (s)':'Repetições'}</span><input data-k="reps" inputmode="numeric" value="${x.reps}"></label></div>
    <div class="sheet-btns"><button class="btn ghost danger-t" data-act="rm">Apagar série</button><button class="btn primary" data-act="save">Salvar</button></div>`,(a,b)=>{
    if(a==='input'){x[b.dataset.k]=parseNum(b.value);return;}
    if(a==='save'){mutS(z=>{z.itens[ii].sets[k]=x;});closeSheet();}
    if(a==='rm'){mutS(z=>{z.itens[ii].sets.splice(k,1);});closeSheet();}
  });
}

// #region: roteador
/* ---------- Navegação (#hash; o voltar do celular funciona) ---------- */
const app=$('#appView'), menu=$('#menuView'), exv=$('#exView');
const VIEWS={home:'#homeView',conjunto:'#conjuntoView',bib:'#bibView',treino:'#treinoView',sessao:'#sessaoView',resumo:'#resumoView',pontos:'#pontosView'};
function route(){
  const h=location.hash.slice(1);
  const prev=ui.lastHash;ui.lastHash=h;
  const exIds=window.__EX_IDS||Object.keys(LIB);
  if(exIds.includes(h)){
    ui.view='ex';app.hidden=true;menu.hidden=true;exv.hidden=false;
    const back=exv.querySelector('.back');
    if(back){let ret='#biblioteca';if(/^(sessao|treino\/|conjunto\/[^/]+\/treino\/)/.test(prev))ret='#'+prev;else if(exIds.includes(prev)&&back.dataset.ret)ret=back.dataset.ret;
      back.dataset.ret=ret;back.setAttribute('href',ret);back.lastChild.textContent=ret==='#biblioteca'?'Biblioteca':'Voltar ao treino';}
    window.scrollTo(0,0);if(window.__enterExercise)window.__enterExercise(h);livePill();return;
  }
  exv.hidden=true;
  if(h==='biblioteca'){if(window.__mini)window.__mini(null);mini3d=false;ui.view='lib';app.hidden=true;menu.hidden=false;document.title='Biblioteca 3D';window.scrollTo(0,0);livePill();return;}
  menu.hidden=true;app.hidden=false;
  let v='home',m;
  if((m=h.match(/^conjunto\/([^/]+)\/treino\/([^/]+)$/))){v='treino';ui.conjuntoId=decodeURIComponent(m[1]);ui.treinoId=decodeURIComponent(m[2]);}
  else if((m=h.match(/^conjunto\/([^/]+)$/))){v='conjunto';ui.conjuntoId=decodeURIComponent(m[1]);}
  else if(h==='biblioteca/treinos'){v='bib';}
  else if(h.startsWith('treino/')){v='treino';ui.conjuntoId=null;ui.treinoId=decodeURIComponent(h.slice(7));}
  else if(h==='sessao'){v='sessao';}
  else if(h==='pontos'){v='pontos';}
  else if(h.startsWith('resumo/')){v='resumo';ui.resumoId=decodeURIComponent(h.slice(7));}
  ui.view=v;
  Object.entries(VIEWS).forEach(([k,sel])=>{$(sel).hidden=k!==v;});
  if(prev!==h)ui.histAll=false;
  document.title=v==='sessao'?'Treinando · Meu Treino':'Meu Treino 3D';
  keepAwake(!!sessaoAtiva());
  if(prev!==h)window.scrollTo(0,0);
  render(true);
}
window.addEventListener('hashchange',route);
enfeitaBiblioteca();
route();
initStore();
if(window.__TEST__)window.__S=S,window.__ui=ui,window.__put=put;
})();
