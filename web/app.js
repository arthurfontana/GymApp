// #region: utilitarios
(function(){
const stage=document.getElementById('stage');
let host=stage; /* onde o canvas está: palco do exercício ou prévia da sessão */
const loadingEl=document.getElementById('loading');
if(typeof THREE==='undefined'||!THREE.OrbitControls||!THREE.GLTFLoader){
  loadingEl.textContent='Não foi possível carregar o 3D. Verifique a conexão e recarregue a página.';return;
}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const DEG=Math.PI/180, YUP=V(0,1,0), ZAX=V(0,0,1), XAX=V(1,0,0);
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sum=(...t)=>{const r=V(0,0,0);for(let i=0;i<t.length;i+=2)r.addScaledVector(t[i],t[i+1]);return r;};
const lin=h=>new THREE.Color(h).convertSRGBToLinear();
const sstep=(a,b,x)=>{let t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);};
const ease=s=>s<=0?0:s>=1?1:.5-.5*Math.cos(Math.PI*s);
const $=id=>document.getElementById(id);

// #region: renderer-cena
/* ---------- Renderer / cena ---------- */
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:!!window.__TEST__});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
stage.insertBefore(renderer.domElement,stage.firstChild);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,0.05,60);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.enablePan=false;controls.minDistance=0.6;controls.maxDistance=7;controls.maxPolarAngle=Math.PI*0.49;

scene.add(new THREE.HemisphereLight(0xffffff,0x6a6560,0.75));
const sun=new THREE.DirectionalLight(0xffffff,1.0);
sun.position.set(1.4,3.6,2.4);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
Object.assign(sun.shadow.camera,{left:-2.2,right:2.2,top:2.2,bottom:-2.2,near:0.5,far:9});sun.shadow.bias=-0.0008;sun.shadow.normalBias=0.02;
scene.add(sun);
const rim=new THREE.DirectionalLight(0xffffff,0.45);rim.position.set(-2.2,1.8,-1.8);scene.add(rim);

const mats={
  pad:new THREE.MeshStandardMaterial({roughness:.85}),
  steel:new THREE.MeshStandardMaterial({metalness:.6,roughness:.35}),
  frame:new THREE.MeshStandardMaterial({metalness:.45,roughness:.45}),
  plate:new THREE.MeshStandardMaterial({color:0x232528,roughness:.55,metalness:.15}),
  chrome:new THREE.MeshStandardMaterial({color:0xc2c8cf,metalness:.85,roughness:.25}),
  deck:new THREE.MeshStandardMaterial({roughness:.7,metalness:.3}),
  lock:new THREE.MeshStandardMaterial({roughness:.5,metalness:.2}),
  floor:new THREE.MeshStandardMaterial({roughness:1}),
  guide:new THREE.LineBasicMaterial({transparent:true,opacity:.85}),
};
const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,14),mats.floor);
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
let grid=null;

function seg(mesh,a,b){const d=b.clone().sub(a);const L=d.length();mesh.position.copy(a).addScaledVector(d,.5);mesh.quaternion.setFromUnitVectors(YUP,d.divideScalar(L));mesh.scale.set(1,L,1);}
function meshIn(parent,geo,mat,shadow=true){const m=new THREE.Mesh(geo,mat);m.castShadow=shadow;m.receiveShadow=shadow;parent.add(m);return m;}
function railIn(parent,a,b,r=.022,mat=mats.steel){const m=meshIn(parent,new THREE.CylinderGeometry(r,r,1,14),mat);seg(m,a,b);return m;}
function ik(S,H,a,b,pole){const d=H.clone().sub(S);let L=d.length();L=Math.min(Math.max(L,Math.abs(a-b)+1e-3),a+b-1e-4);const e=d.normalize();const ca=(a*a+L*L-b*b)/(2*a*L);const sa=Math.sqrt(Math.max(0,1-ca*ca));const pp=pole.clone().addScaledVector(e,-pole.dot(e)).normalize();return S.clone().addScaledVector(e,a*ca).addScaledVector(pp,a*sa);}
function lineIn(parent,pts){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),mats.guide);parent.add(l);return l;}

// #region: rig-esqueleto
/* ---------- Esqueleto de animação (pontos anatômicos do modelo, pose anatômica) ---------- */
/* coordenadas do modelo (T-pose, escalado para 1,75 m): Y para cima, +Z anterior, +X lado esquerdo anatômico */
const LM={P:[0,.90,-.03],neck:[0,1.47,-.04],Sj:[.195,1.36,-.04],E:[.54,1.35,-.02],G:[.84,1.31,.012],MCP:[.862,1.352,.015],
  Hip:[.095,.90,-.03],K:[.173,.47,.01],A:[.228,.085,-.01]};
const L=(k,m=1)=>V(LM[k][0]*m,LM[k][1],LM[k][2]);
const LEN={ua:L('Sj').distanceTo(L('E')),fa:L('E').distanceTo(L('G')),th:L('Hip').distanceTo(L('K')),sn:L('K').distanceTo(L('A'))};
/* ossos: 0 tronco, 1 meio-pescoço, 2 cabeça; por lado (12): meio-ombro, braço, meio-cotovelo, antebraço, antebraço-giro, dedos, meio-quadril, coxa, meio-joelho, perna, meio-tornozelo, pé */
const BI={torso:0,neckH:1,head:2};
const SB=['shH','ua','elH','fn','ft','fing','hipH','th','knH','sn','anH','foot'];
const bi=(name,m)=>3+(m>0?0:12)+SB.indexOf(name);
const NB=27;

// #region: cinematica
/* ---------- Cinemática ---------- */
const mTmp=new THREE.Matrix4();
function basisQ(y,ref){const yy=y.clone().normalize();const x=ref.clone().addScaledVector(yy,-ref.dot(yy)).normalize();const z=new THREE.Vector3().crossVectors(x,yy);
  mTmp.makeBasis(x,yy,z);return new THREE.Quaternion().setFromRotationMatrix(mTmp);}
function alignQ(yRest,refRest,yT,refT){return basisQ(yT,refT).multiply(basisQ(yRest,refRest).invert());}
function hingeQ(from,to){const ax=new THREE.Vector3().crossVectors(from,to);const s=ax.length();if(s<1e-6)return new THREE.Quaternion();
  return new THREE.Quaternion().setFromAxisAngle(ax.divideScalar(s),Math.atan2(s,from.dot(to)));}
const slerpQ=(a,b,t)=>a.clone().slerp(b,t);
const PALM=V(0,-1,0);
const curlQ=[1,-1].map(m=>new THREE.Quaternion().setFromAxisAngle(ZAX,-m*1.85));
const torsoQ=(u,n)=>new THREE.Quaternion().setFromRotationMatrix(mTmp.makeBasis(ZAX.clone().negate(),u,n));

function torsoBones(bones,qT,P,tilt){
  const Pr=L('P');const mapT=p=>P.clone().add(p.clone().sub(Pr).applyQuaternion(qT));
  bones[0]={q:qT,pr:Pr,pt:P};
  const qN=qT.clone().multiply(new THREE.Quaternion().setFromAxisAngle(XAX,tilt));
  const neckT=mapT(L('neck'));
  bones[1]={q:slerpQ(qT,qN,.5),pr:L('neck'),pt:neckT};bones[2]={q:qN,pr:L('neck'),pt:neckT};
  return mapT;
}
function armBones(bones,qT,s,Sj,H,pole,palmT){
  const m=-s;
  const E=ik(Sj,H,LEN.ua,LEN.fa,pole);
  const ya=E.clone().sub(Sj).normalize(), fd=H.clone().sub(E).normalize();
  const pp=pole.clone().addScaledVector(ya,-pole.dot(ya)).normalize().negate();
  const flex=fd.clone().addScaledVector(ya,-fd.dot(ya)).addScaledVector(pp,.02);
  const qUA=alignQ(L('E',m).sub(L('Sj',m)).normalize(),ZAX,ya,flex);
  const faR=L('G',m).sub(L('E',m)).normalize();
  let qFN=hingeQ(ya,fd).multiply(qUA);
  qFN=new THREE.Quaternion().setFromUnitVectors(faR.clone().applyQuaternion(qFN),fd).multiply(qFN);
  const cur=PALM.clone().applyQuaternion(qFN);cur.addScaledVector(fd,-cur.dot(fd)).normalize();
  const pt=palmT.clone();pt.addScaledVector(fd,-pt.dot(fd)).normalize();
  const ang=Math.atan2(new THREE.Vector3().crossVectors(cur,pt).dot(fd),cur.dot(pt));
  const qFT=new THREE.Quaternion().setFromAxisAngle(fd,ang).multiply(qFN);
  const B=(name,q,pr,p)=>bones[bi(name,m)]={q,pr,pt:p};
  B('shH',slerpQ(qT,qUA,.5),L('Sj',m),Sj);B('ua',qUA,L('Sj',m),Sj);
  B('elH',slerpQ(qUA,qFN,.5),L('E',m),E);B('fn',qFN,L('E',m),E);B('ft',qFT,L('E',m),E);B('fing',qFT,L('E',m),E);
  return {E,qFT};
}
function legBones(bones,qT,s,hip,A,lpole,qFoot){
  const m=-s;
  const K=ik(hip,A,LEN.th,LEN.sn,lpole);
  const yt=K.clone().sub(hip).normalize();
  const qTH=alignQ(L('K',m).sub(L('Hip',m)).normalize(),ZAX,yt,lpole);
  const sd=A.clone().sub(K).normalize();
  let qSN=hingeQ(yt,sd).multiply(qTH);
  qSN=new THREE.Quaternion().setFromUnitVectors(L('A',m).sub(L('K',m)).normalize().applyQuaternion(qSN),sd).multiply(qSN);
  const B=(name,q,pr,p)=>bones[bi(name,m)]={q,pr,pt:p};
  B('hipH',slerpQ(qT,qTH,.5),L('Hip',m),hip);B('th',qTH,L('Hip',m),hip);
  B('knH',slerpQ(qTH,qSN,.5),L('K',m),K);B('sn',qSN,L('K',m),K);
  B('anH',slerpQ(qSN,qFoot,.5),L('A',m),A);B('foot',qFoot,L('A',m),A);
  return K;
}
const kneeAngle=(hip,K,A)=>hip.clone().sub(K).angleTo(A.clone().sub(K))/DEG;

// #region: pesos-deformacao
/* ---------- Pesos de deformação ---------- */
function weightsFor(x,y,z){
  const m=x>=0?1:-1, ax=Math.abs(x), xm=x*m;
  const w={};const add=(i,v)=>{if(v>1e-4)w[i]=(w[i]||0)+v;};
  let done=false;
  if(y>1.1&&xm>.1){
    const s1=sstep(-.05,.06,xm-LM.Sj[0])*sstep(1.12,1.22,y);
    if(s1>0){done=true;
      const s2=sstep(-.035,.035,xm-LM.E[0]);
      const faL=LM.G[0]-LM.E[0];
      const stw=sstep(.1*faL,.9*faL,xm-LM.E[0]);
      const sf=(z>.055&&xm<.9)?0:sstep(-.008,.014,xm-LM.MCP[0]);
      add(BI.torso,(1-s1)**2);add(bi('shH',m),2*s1*(1-s1));
      const Aw=s1*s1;
      add(bi('ua',m),Aw*(1-s2)**2);add(bi('elH',m),Aw*2*s2*(1-s2));
      const F=Aw*s2*s2;add(bi('fn',m),F*(1-stw));const Ft=F*stw;add(bi('fing',m),Ft*sf);add(bi('ft',m),Ft*(1-sf));
    }
  }
  if(!done&&y<1.02){
    const Hp=L('Hip',m),K=L('K',m),A=L('A',m);
    const th=segInfo(x,y,z,Hp,K), sn=segInfo(x,y,z,K,A);
    const s1=sstep(-.05,.10,th.t)*sstep(.004,.045,ax);
    if(s1>0){done=true;
      const s2=sstep(-.04,.04,sn.t);
      const s3=sn.t>.7*sn.L?sstep(-.012,.03,A.y-y):0;
      add(BI.torso,(1-s1)**2);add(bi('hipH',m),2*s1*(1-s1));
      const Aw=s1*s1;add(bi('th',m),Aw*(1-s2)**2);add(bi('knH',m),Aw*2*s2*(1-s2));
      const Bw=Aw*s2*s2;add(bi('sn',m),Bw*(1-s3)**2);add(bi('anH',m),Bw*2*s3*(1-s3));add(bi('foot',m),Bw*s3*s3);
    }
  }
  if(!done){
    const sh=ax<.16?sstep(1.46,1.53,y):0;
    add(BI.torso,(1-sh)**2);add(BI.neckH,2*sh*(1-sh));add(BI.head,sh*sh);
  }
  const arr=Object.entries(w).map(([i,v])=>[+i,v]).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const tot=arr.reduce((s,e)=>s+e[1],0)||1;
  return arr.map(e=>[e[0],e[1]/tot]);
}
function segInfo(px,py,pz,a,b){const ax=b.x-a.x,ay=b.y-a.y,az=b.z-a.z;const Ln=Math.hypot(ax,ay,az);const dx=ax/Ln,dy=ay/Ln,dz=az/Ln;
  const vx=px-a.x,vy=py-a.y,vz=pz-a.z;const t=vx*dx+vy*dy+vz*dz;const tc=t<0?0:t>Ln?Ln:t;
  return {t,d:Math.hypot(vx-dx*tc,vy-dy*tc,vz-dz*tc),L:Ln,cx:a.x+dx*tc,cz:a.z+dz*tc};}

// #region: mascaras
/* ---------- Regiões musculares no corpo em T-pose (medidas sobre o relevo do modelo) ---------- */
const band=(v,a,b,e=.008)=>sstep(a-e,a+e,v)*(1-sstep(b-e,b+e,v));
/* faixa angular em graus em volta do eixo do membro: 0 = frente, +90 = lateral, ±180 = trás, −90 = medial */
const arcBand=(th,a,b,e=12)=>sstep(a-e,a+e,th)*(1-sstep(b-e,b+e,th));
function masks(x,y,z,nx,ny,nz){
  const ax=Math.abs(x), m=x>=0?1:-1, lat=nx*m, out={};
  const front=sstep(.1,.35,nz);
  /* peitoral maior */
  const pecLow=ax<.19?1.222+1.585*ax*ax:1.279+(ax-.19)*2.0, pecUp=ax<.12?1.432:1.432-(ax-.12)*.6;
  const pec=band(ax,.006,.216,.006)*front*band(y,pecLow,pecUp,.007);
  if(pec>0){const split=1.36+.25*Math.max(0,ax-.13);const c=sstep(split-.006,split+.006,y);
    out.pecClav=pec*c;out.pecEst=pec*(1-c);}
  const dA=band(ax,.185,.33,.012)*band(y,1.31,1.49,.01)*sstep(.15,.45,nz)*(1-(out.pecClav||0)-(out.pecEst||0));
  if(dA>0)out.deltAnt=dA;
  const arm=band(ax,.30,.52,.014)*band(y,1.27,1.44,.01);
  if(arm>0){const tr=arm*sstep(.1,.35,-nz);if(tr>0)out.triceps=tr;const bc=arm*sstep(.2,.45,nz)*band(ax,.31,.50,.012);if(bc>0){out.biceps=bc;const lh=sstep(-.06,.06,ny);out.bicLong=bc*lh;out.bicShort=bc*(1-lh);}}
  const ra=band(ax,0,.072,.006)*band(y,.95,1.215,.008)*sstep(.35,.6,nz);if(ra>0)out.reto=ra;
  const ob=band(ax,.085,.19,.01)*band(y,.93,1.165,.01)*sstep(-.2,.15,nz)*sstep(.1,.4,lat+nz)*(1-ra);if(ob>0)out.obliquos=ob;
  const se=band(ax,.15,.215,.008)*band(y,1.15,1.285,.01)*sstep(.25,.5,lat)*sstep(-.35,-.1,nz);if(se>0)out.serratil=se;
  const trapW=y<1.38?.03+(y-1.12)*.45:.15;
  const tp=band(ax,0,Math.max(.01,trapW),.01)*band(y,1.12,1.43,.01)*sstep(.3,.55,-nz);if(tp>0)out.trapezio=tp;
  const rc=band(ax,.09,.19,.01)*band(y,1.24,1.37,.01)*sstep(.3,.55,-nz)*(1-tp);if(rc>0)out.manguito=rc;
  const gl=band(ax,.005,.185,.01)*band(y,.76,.985,.012)*sstep(.15,.45,-nz);if(gl>0)out.gluteos=gl;
  const gm=band(ax,.09,.205,.012)*band(y,.94,1.06,.012)*sstep(-.05,.3,lat)*sstep(-.25,.15,-nz)*(1-gl);if(gm>0)out.gluteoMed=gm;
  /* costas (remada): trapézio por porções, romboides, latíssimo, eretores, deltoide posterior; braço: braquial e braquiorradial */
  const backN=sstep(.25,.5,-nz);
  const rh=band(ax,.022,.088,.006)*band(y,1.235,1.345,.008)*backN;if(rh>0)out.romboides=rh;
  if(tp>0){if(y>=1.375)out.trapSup=tp;else if(y>=1.27)out.trapMed=tp*(1-rh);else out.trapInf=tp;}
  const tsx=band(ax,.035,.175,.012)*band(y,1.40,1.50,.01)*sstep(-.05,.25,Math.max(ny,-nz))*(1-sstep(.1,.3,nz))*(1-tp);
  if(tsx>0)out.trapSup=Math.max(out.trapSup||0,tsx);
  const latIn=.055+Math.max(0,y-1.0)*.25, latOut=y<1.2?.17+(y-.98)*.18:.215;
  const tmj=band(ax,.12,.195,.008)*band(y,1.272,1.335,.008)*sstep(.15,.45,-nz+.3*lat);if(tmj>0)out.redondo=tmj;
  const la=band(y,.98,1.30,.012)*band(ax,latIn,latOut,.01)*sstep(-.15,.2,-nz+.6*lat)*(1-tp)*(1-rh)*(1-rc)*(1-tmj);if(la>0)out.latissimo=la;
  const er=band(ax,.008,.055,.006)*band(y,.92,1.24,.012)*backN*(1-tp);if(er>0)out.eretor=er;
  const dP=band(ax,.185,.33,.012)*band(y,1.31,1.49,.01)*sstep(.15,.45,-nz)*(1-tp)*(1-tsx);if(dP>0)out.deltPost=dP;
  const bq=band(ax,.43,.535,.012)*band(y,1.29,1.365,.01)*sstep(-.15,.15,nz)*(1-(out.biceps||0)*.7);if(bq>0)out.braquial=bq;
  const brr=band(ax,.535,.71,.012)*band(y,1.30,1.42,.01)*sstep(.12,.42,nz);if(brr>0)out.braquiorradial=brr;
  const dL=band(ax,.19,.34,.012)*band(y,1.30,1.50,.01)*sstep(-.62,-.3,nz)*(1-sstep(.3,.62,nz));if(dL>0)out.deltLat=dL;
  const sp=band(ax,.07,.17,.01)*band(y,1.385,1.45,.008)*backN;if(sp>0)out.supra=sp;
  const armR=band(y,1.26,1.45,.01);
  const tl=band(ax,.26,.46,.014)*armR*sstep(.2,.45,-nz-ny)*sstep(-.3,0,-ny);if(tl>0)out.tricLong=tl;
  const tla=band(ax,.30,.45,.014)*armR*sstep(.1,.35,-nz)*sstep(-.15,.1,ny)*(1-tl);if(tla>0)out.tricLat=tla;
  const tmd=band(ax,.44,.535,.012)*armR*sstep(.05,.3,-nz)*(1-tl*.5)*(1-tla*.5);if(tmd>0)out.tricMed=tmd;
  const anc=band(ax,.535,.595,.008)*band(y,1.30,1.43,.01)*sstep(.1,.35,-nz)*sstep(-.15,.15,ny);if(anc>0)out.anconeo=anc;
  const ext=band(ax,.56,.80,.012)*band(y,1.30,1.44,.01)*sstep(.2,.5,ny)*(1-anc);if(ext>0)out.extAnte=ext;
  const fa=band(ax,.56,.80,.012)*band(y,1.26,1.40,.01)*sstep(.2,.5,-ny);if(fa>0)out.flexAnte=fa;
  /* membros inferiores: posição em volta do eixo da coxa e da perna */
  if(y<.98&&ax>.012){
    const Hp=L('Hip',m),K=L('K',m),A=L('A',m);
    const th=segInfo(x,y,z,Hp,K);
    const ut=th.t/th.L;
    if(ut>.02&&ut<1.04){
      const ang=Math.atan2((x-th.cx)*m,z-th.cz)/DEG;
      const rf=band(ut,.10,.86,.04)*arcBand(ang,-24,24,10);if(rf>0)out.retoFem=rf;
      const vi=band(ut,.30,.82,.05)*arcBand(ang,-14,14,8);if(vi>0)out.vastoInt=vi;
      const vl=band(ut,.14,.93,.04)*arcBand(ang,30,112,10);if(vl>0)out.vastoLat=vl;
      const vm=band(ut,.56,.96,.04)*arcBand(ang,-78,-30,10)*(ut>.56?1:0);if(vm>0)out.vastoMed=vm;
      const ad=band(ut,.06,.66,.05)*arcBand(ang,-150,-84,10);if(ad>0)out.adutor=ad*(1-(out.gluteos||0));
      const post=band(ut,.24,.92,.05)*(1-(out.gluteos||0));
      const bf=post*arcBand(ang,118,182,10);if(bf>0)out.bicepsFem=bf;
      const st=post*arcBand(ang,-150,-118,8);if(st>0)out.semitend=st;
      const sm=post*(arcBand(ang,-182,-152,8));if(sm>0)out.semimemb=sm;
      const sc=-20-90*Math.min(1,Math.max(0,(ut-.05)/.9));
      const sa=band(ut,.06,.98,.04)*arcBand(ang,sc-11,sc+11,6);if(sa>0)out.sartorio=sa;
      const gr=band(ut,.22,1.02,.05)*arcBand(ang,-128,-104,6)*(1-sa);if(gr>0)out.gracil=gr;
    }
    const sn=segInfo(x,y,z,K,A);const us=sn.t/sn.L;
    if(us>-.02&&us<.9){
      const ang=Math.atan2((x-sn.cx)*m,z-sn.cz)/DEG, back=Math.abs(ang);
      const ga=band(us,.04,.56,.05)*sstep(105,130,back);if(ga>0)out.gastro=ga;
      const po=band(us,-.04,.10,.03)*sstep(140,160,back);if(po>0)out.popliteo=po;
      if(ga>0){const lat2=sstep(-8,8,(ang>0?180-ang:-180-ang)*-1);out.gastroLat=ga*(ang>0?1:0);out.gastroMed=ga*(ang<=0?1:0);}
      const fb=band(us,.12,.86,.05)*arcBand(ang,68,118,8);if(fb>0)out.fibular=fb;
      const aq=band(us,.80,1.02,.03)*sstep(150,168,back);if(aq>0)out.aquiles=aq;
      const so=band(us,.42,.86,.05)*sstep(70,95,back)*(1-(ga||0));if(so>0)out.soleo=so;
    }
  }
  return out;
}
const MASK={};

// #region: carga-modelo
/* ---------- Carrega o modelo e cria o rig ---------- */
let body=null, skel=null, colorAttr=null, baseCol=null;
const boneObjs=[];
function buildBody(gltf){
  gltf.scene.updateMatrixWorld(true);
  let src=null;const eyes=[];
  gltf.scene.traverse(o=>{if(!o.isMesh)return;if(/body/i.test(o.name))src=o;else if(!/TransP/i.test(o.name))eyes.push(o);});
  if(!src)throw new Error('malha do corpo não encontrada');
  const geo=src.geometry.clone();geo.applyMatrix4(src.matrixWorld);
  if(geo.attributes.tangent)geo.deleteAttribute('tangent');
  geo.computeBoundingBox();const bb=geo.boundingBox;const sc=1.75/(bb.max.y-bb.min.y);
  const fix=new THREE.Matrix4().makeTranslation(0,-bb.min.y*sc,0).multiply(new THREE.Matrix4().makeScale(sc,sc,sc));
  geo.applyMatrix4(fix);
  const P=geo.attributes.position, N=geo.attributes.normal, nv=P.count;
  const col=new Float32Array(nv*3),sIdx=new Uint16Array(nv*4),sW=new Float32Array(nv*4);
  const base=lin('#e4e0da');
  const acc={};
  for(let i=0;i<nv;i++){
    const x=P.getX(i),y=P.getY(i),z=P.getZ(i);
    col[i*3]=base.r;col[i*3+1]=base.g;col[i*3+2]=base.b;
    const w=weightsFor(x,y,z);
    for(let k=0;k<4;k++){sIdx[i*4+k]=w[k]?w[k][0]:0;sW[i*4+k]=w[k]?w[k][1]:0;}
    const mk=masks(x,y,z,N.getX(i),N.getY(i),N.getZ(i));
    for(const id in mk){const v=Math.min(1,mk[id]);if(v<.02)continue;const a=acc[id]||(acc[id]={i:[],w:[],cx:0,cy:0,cz:0,n:0});a.i.push(i);a.w.push(v);
      if(x<0&&v>.5){a.cx+=x;a.cy+=y;a.cz+=z;a.n++;}}
  }
  colorAttr=new THREE.BufferAttribute(col,3);colorAttr.setUsage(THREE.DynamicDrawUsage);geo.setAttribute('color',colorAttr);
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(sIdx,4));
  geo.setAttribute('skinWeight',new THREE.BufferAttribute(sW,4));
  if(geo.attributes.uv)geo.setAttribute('uv2',geo.attributes.uv);
  baseCol=col.slice();
  for(const id in acc){const a=acc[id];const mk=MASK[id]={vi:Uint32Array.from(a.i),vw:Float32Array.from(a.w),anchor:null};
    if(a.n){const c=V(a.cx/a.n,a.cy/a.n,a.cz/a.n);let best=-1,bd=1e9;
      for(const i of a.i){const d=(P.getX(i)-c.x)**2+(P.getY(i)-c.y)**2+(P.getZ(i)-c.z)**2;if(d<bd){bd=d;best=i;}}
      mk.anchor={v:best,c:V(P.getX(best),P.getY(best),P.getZ(best))};}}
  const sm=src.material;
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,skinning:true,metalness:0,roughness:.78,
    normalMap:sm.normalMap||null,aoMap:sm.aoMap||null,aoMapIntensity:1});
  if(sm.normalMap)mat.normalScale.set(1.15,1.15);
  const root=new THREE.Group();scene.add(root);
  for(let i=0;i<NB;i++){const b=new THREE.Bone();b.matrixAutoUpdate=false;root.add(b);boneObjs.push(b);}
  skel=new THREE.Skeleton(boneObjs,boneObjs.map(()=>new THREE.Matrix4()));
  body=new THREE.SkinnedMesh(geo,mat);body.bind(skel,new THREE.Matrix4());
  body.frustumCulled=false;body.castShadow=true;body.receiveShadow=true;scene.add(body);if(window.__TEST__)window.__body=body;
  if(eyes.length){const parts=eyes.map(e=>{const g=e.geometry.clone();g.applyMatrix4(e.matrixWorld);g.applyMatrix4(fix);
      const n=g.attributes.position.count;return {g,n};});
    const tot=parts.reduce((s,p)=>s+p.n,0);const pos=new Float32Array(tot*3),nor=new Float32Array(tot*3);let o=0;const idx=[];
    parts.forEach(p=>{pos.set(p.g.attributes.position.array,o*3);nor.set(p.g.attributes.normal.array,o*3);
      if(p.g.index)for(const v of p.g.index.array)idx.push(v+o);else for(let k=0;k<p.n;k++)idx.push(k+o);o+=p.n;});
    const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.BufferAttribute(pos,3));eg.setAttribute('normal',new THREE.BufferAttribute(nor,3));eg.setIndex(idx);
    const si=new Uint16Array(tot*4),sw=new Float32Array(tot*4);for(let k=0;k<tot;k++){si[k*4]=BI.head;sw[k*4]=1;}
    eg.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));eg.setAttribute('skinWeight',new THREE.BufferAttribute(sw,4));
    const eyeMesh=new THREE.SkinnedMesh(eg,new THREE.MeshStandardMaterial({color:0xcfcac3,roughness:.4,skinning:true}));
    eyeMesh.bind(skel,new THREE.Matrix4());eyeMesh.frustumCulled=false;scene.add(eyeMesh);}
}

/* ====================================================================================
   EXERCÍCIO 1 — SUPINO INCLINADO COM HALTERES
   ==================================================================================== */
// #region: utils-peso-do-corpo
/* ---------- Utilidades dos exercícios com peso do corpo ---------- */
const WREST=[1,-1].map(m=>L('E',m).lerp(L('G',m),.82));
/* dobra o punho (rotação da mão em volta do punho, no espaço do modelo); a>0 = extensão (dorso da mão para trás) */
function wristBend(BM,m,a){if(!a)return;const w=WREST[m>0?0:1];const q=new THREE.Quaternion().setFromAxisAngle(ZAX,m*a);
  const piv=new THREE.Matrix4().makeTranslation(w.x,w.y,w.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-w.x,-w.y,-w.z));
  BM[bi('ft',m)].multiply(piv);BM[bi('fing',m)].multiply(piv);}
const matMatBW=new THREE.MeshStandardMaterial({roughness:.95});
function mkMatBW(grp,cx,len,wid){const mt=meshIn(grp,new THREE.BoxGeometry(len,.012,wid),matMatBW);mt.position.set(cx,.006,0);mt.castShadow=false;
  [-1,1].forEach(k=>{const ed=meshIn(grp,new THREE.BoxGeometry(len,.013,.012),mats.frame,false);ed.position.set(cx,.0065,k*wid/2);});return mt;}
function mkArcBW(guides){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(l);return l;}
function setArcBW(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
  for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
const fkSag=(A,al,th,sag)=>{const K=V(A.x+LEN.sn*Math.sin(al*DEG)*sag,A.y+LEN.sn*Math.cos(al*DEG),0);return {K,P:V(K.x+LEN.th*Math.sin(th*DEG)*sag,K.y+LEN.th*Math.cos(th*DEG),0)};};
const errAmt=(errMode,t,T_END)=>{const rep=errMode&&t<T_END?1:0, tr=t%T_END;const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;return {rep,tr,amt,err:errMode&&amt>0?errMode:null};};

// #region: ex-sup
const SUP=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const BENCH=30*DEG, SEAT_H=.45;
  const hinge=V(0,SEAT_H,0), dirB=V(-Math.cos(BENCH),Math.sin(BENCH),0), nB=V(Math.sin(BENCH),Math.cos(BENCH),0);
  const seat=meshIn(grp,new THREE.BoxGeometry(.36,.07,.30),mats.pad);seat.position.set(.15,SEAT_H-.035,0);
  const back=meshIn(grp,new THREE.BoxGeometry(.9,.07,.28),mats.pad);back.position.copy(sum(hinge,1,dirB,.47,nB,-.035));back.rotation.z=Math.PI-BENCH;
  railIn(grp,V(-.82,.05,0),V(.36,.05,0),.028);
  railIn(grp,V(.36,.03,-.25),V(.36,.03,.25),.03);
  railIn(grp,V(-.82,.03,-.25),V(-.82,.03,.25),.03);
  railIn(grp,V(.15,.05,0),V(.15,SEAT_H-.075,0),.03);
  railIn(grp,V(-.01,SEAT_H-.08,0),V(.31,SEAT_H-.08,0));
  railIn(grp,sum(hinge,1,nB,-.08),sum(hinge,1,dirB,.9,nB,-.08));
  railIn(grp,V(-.34,.05,0),sum(hinge,1,dirB,.6,nB,-.08),.026);
  railIn(grp,sum(hinge,1,nB,-.08,ZAX,-.06),sum(hinge,1,nB,-.08,ZAX,.06),.035);
  (function(){const z=.17;const pts=[sum(hinge,1,V(-.5,0,0),1),hinge.clone(),sum(hinge,1,dirB,.55)];pts.forEach(p=>p.z=z);lineIn(guides,pts);
    const arc=[];for(let a=180;a>=150;a-=2){arc.push(V(hinge.x+Math.cos(a*DEG)*.34,hinge.y+Math.sin(a*DEG)*.34,z));}lineIn(guides,arc);})();
  const degAnchor=V(hinge.x+Math.cos(165*DEG)*.44,hinge.y+Math.sin(165*DEG)*.44,.17);
  const DUMB=[];
  for(let i=0;i<2;i++){const g=new THREE.Group();
    const hd=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.17,12),mats.chrome);hd.castShadow=true;g.add(hd);
    [-1,1].forEach(k=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.072,.072,.06,6),mats.plate);p.position.y=k*.1;p.castShadow=true;g.add(p);
      const c=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.012,14),mats.chrome);c.position.y=k*.066;g.add(c);});
    grp.add(g);DUMB.push(g);}

  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Deitado no banco a 30°, pés no chão, costas e glúteos apoiados. Halteres acima dos ombros, cotovelos quase estendidos, pegada pronada.'},
   {t:.7,  title:'Início da descida',d:'Os cotovelos começam a flexionar e os halteres descem juntos; os braços começam a se afastar do centro.',ph:'ecc'},
   {t:1.0, title:'Descida intermediária',d:'Cotovelos com ~45–60° de flexão, halteres se aproximando do tórax superior, antebraços quase verticais.',ph:'ecc'},
   {t:1.5, title:'Aproximação da posição inferior',d:'Cotovelos com ~70–85° de flexão, halteres perto da linha de cima do peito, braços a 45–60° do tronco.',ph:'ecc'},
   {t:2.4, title:'Posição inferior',d:'Cotovelos com ~80–100° de flexão, halteres ao lado do tórax superior, antebraços verticais. Pausa curta.'},
   {t:3.1, title:'Início da subida',d:'Empurre os halteres: os cotovelos começam a estender e os braços voltam para o centro.',ph:'conc'},
   {t:3.85,title:'Subida intermediária',d:'Cotovelos com ~45–60° de flexão; peitoral e deltoide anterior elevam o braço e o tríceps estende o cotovelo.',ph:'conc'},
   {t:4.3, title:'Aproximação da posição inicial',d:'Cotovelos com ~10–20° de flexão, halteres chegando acima dos ombros.',ph:'conc'},
   {t:4.6, title:'Posição final',d:'Cotovelos estendidos sem travar, halteres acima dos ombros sem encostar um no outro. Repetição completa.'},
  ];
  const T_END=4.8;
  const pBase=t=>t<.4?0:t<2.4?ease((t-.4)/2):t<2.8?1:t<4.4?1-ease((t-2.8)/1.6):0;
  const TOP=[.22,.611,-.015], BOT=[-.06,.33,.282], PT=[-.45,-.2,.87], PB=[-.57,.06,.82];
  const ERR={
    cotovelos:{name:'Cotovelos abertos a 90°',fix:'Braços a 45–60° do tronco na parte de baixo, nem colados nem em "T".'},
    punhos:{name:'Punhos dobrados',fix:'Punho reto, alinhado com o antebraço, halter em cima do cotovelo.'},
    antebracos:{name:'Antebraços inclinados',fix:'Na parte de baixo, antebraços quase verticais quando vistos de frente.'},
    abdomen:{name:'Halteres descendo para o abdômen',fix:'Os halteres descem até a lateral do tórax superior, não da barriga.'},
    colidir:{name:'Halteres batendo no topo',fix:'Termine com os halteres acima dos ombros, separados.'},
    lombar:{name:'Lombar arqueada e glúteos fora do banco',fix:'Glúteos no assento e curvatura natural da lombar, sem fazer ponte.'},
    ombros:{name:'Ombros avançando',fix:'Escápulas encaixadas no encosto; no topo o ombro não sai do banco.'},
    assimetria:{name:'Movimento assimétrico',fix:'Os dois halteres descem e sobem juntos, na mesma altura.'},
    travar:{name:'Hiperextensão dos cotovelos',fix:'Pare a subida com 0–10° de flexão, sem forçar a trava.'},
  };
  let errMode=null, wristA=0;
  const W_REST=[1,-1].map(m=>L('E',m).lerp(L('G',m),.82));
  const P_LIE=V(.06,.57,0);
  function solveSup(st){
    const {p,err,amt}=st;
    const th=30*DEG;
    let u=V(-Math.cos(th),Math.sin(th),0), n=V(Math.sin(th),Math.cos(th),0);
    let P=P_LIE.clone();
    if(err==='lombar'){const k=amt*sstep(.2,.9,p);P=P.add(V(.02*k,.07*k,0));const a2=(30-6*k)*DEG;u=V(-Math.cos(a2),Math.sin(a2),0);n=V(Math.sin(a2),Math.cos(a2),0);}
    const qT=torsoQ(u,n);
    const bones=new Array(NB);
    const mapT=torsoBones(bones,qT,P,-9*DEG);
    const side=[];
    [1,-1].forEach(s=>{const m=-s;
      let pp=p;if(err==='assimetria'&&s<0)pp=p*(1-.38*amt);
      const pz=1-Math.pow(1-pp,1.6);
      let hu=TOP[0]+(BOT[0]-TOP[0])*pp, hn=TOP[1]+(BOT[1]-TOP[1])*pp, hz=TOP[2]+(BOT[2]-TOP[2])*pz;
      let pu=PT[0]+(PB[0]-PT[0])*pp, pn=PT[1]+(PB[1]-PT[1])*pp, pzz=PT[2]+(PB[2]-PT[2])*pp;
      let sh=V(0,0,0);
      if(err==='cotovelos'){hz+=amt*.07*pp;hu+=amt*.08*pp;pu+=amt*.5*pp;pzz+=amt*.6*pp;}
      if(err==='antebracos')hz-=amt*.15*pp;
      if(err==='abdomen'){hu-=amt*.2*pp;pu-=amt*.4*pp;pzz-=amt*.5*pp;}
      if(err==='colidir')hz-=amt*.12*(1-sstep(0,.35,pp));
      if(err==='ombros')sh=sum(n,amt*.055*(1-sstep(0,.4,pp)));
      if(err==='travar'){const k=amt*(1-sstep(0,.3,pp));hn+=.03*k;}
      const Sj=mapT(L('Sj',m)).add(sh);
      const H=sum(Sj,1,u,hu,n,hn,ZAX,hz*s);
      const pole=sum(u,pu,n,pn,ZAX,pzz*s);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,pole,u.clone().negate());
      const hip=mapT(L('Hip',m)), A=V(.42,.085,.21*s), lpole=V(1,1.2,.25*s);
      const K=legBones(bones,qT,s,hip,A,lpole,alignQ(YUP,ZAX,YUP,V(1,0,.18*s)));
      side.push({s,m,Sj,E,H,hip,K,A,qFT});
    });
    return {u,n,P,side,bones};
  }
  const trajLines=[];
  [0,1].forEach(i=>{const pts=[];for(let k=0;k<=30;k++){pts.push(solveSup({p:k/30,err:null,amt:0}).side[i].H);}trajLines.push(lineIn(guides,pts));});
  const arrows=[0,1].map(()=>{const a=new THREE.ArrowHelper(YUP,V(0,0,0),.16,0xffffff,.055,.04);guides.add(a);return a;});
  const prevH=[V(0,0,0),V(0,0,0)];
  const elbArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(elbArc);
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  const PARTS=[
    {label:'Encosto a 30°',pos:()=>sum(hinge,1,dirB,.75,nB,.02,ZAX,.16)},
    {label:'Assento',pos:()=>V(.22,SEAT_H+.01,.16)},
    {label:'Halter sextavado',pos:()=>DUMB[0].position.clone().add(V(0,.09,.1))},
    {label:'Empunhadura',pos:()=>DUMB[0].position.clone().add(V(.05,-.05,.0))},
  ];

  return {
    id:'supino', title:'Supino Inclinado 3D', loadingText:'Carregando modelo anatômico…',
    eyebrow:'Treino · Peitoral superior', h1:'Supino inclinado com halteres',
    specs:'<span>Banco <b>30°</b></span><span>2 halteres <b>independentes</b></span><span>Cotovelos <b>0–10° → 80–100°</b></span><span>Braços <b>45–60°</b></span>',
    groups:{p:{label:'Principais',col:'--red'},s:{label:'Secundários',col:'--yellow'},e:{label:'Estabilizadores',col:'--green'},n:{label:'Abdômen',col:'--muted'}},
    strongE:true,
    muscles:[
     {id:'pecClav',name:'Peitoral maior · porção clavicular (maior ênfase)',g:'p',col:'--red',tag:'Peitoral · clavicular'},
     {id:'pecEst',name:'Peitoral maior · porção esternocostal',g:'p',col:'--orange',tag:'Peitoral · esternocostal'},
     {id:'deltAnt',name:'Deltoide anterior',g:'s',col:'--yellow',tag:'Deltoide anterior'},
     {id:'triceps',name:'Tríceps braquial',g:'s',col:'--blue',tag:'Tríceps braquial'},
     {id:'serratil',name:'Serrátil anterior',g:'e',col:'--green',tag:'Serrátil anterior'},
     {id:'manguito',name:'Manguito rotador',g:'e',col:'--purple'},
     {id:'trapMed',name:'Trapézio médio',g:'e',col:'--sky'},
     {id:'trapInf',name:'Trapézio inferior',g:'e',col:'--sky'},
     {id:'romboides',name:'Romboides',g:'e',col:'--slate'},
     {id:'reto',name:'Reto abdominal',g:'n'},{id:'obliquos',name:'Oblíquos',g:'n'},
    ],
    muscleTarget(m,kind){
      if(m.id==='pecClav')return kind==='conc'?1:kind==='ecc'?.85:kind==='hold'?.75:.4;
      if(m.id==='pecEst')return kind==='conc'?.85:kind==='ecc'?.7:kind==='hold'?.6:.3;
      if(m.g==='s')return kind==='conc'?.95:kind==='ecc'?.65:.4;
      if(m.g==='e')return .45;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp,guides, parts:PARTS,
    readouts:[{id:'elbow',label:'Flexão do cotovelo'},{id:'abd',label:'Braço × tronco · alvo 45–60°'},{id:'fa',label:'Antebraço × vertical'}],
    views:{lateral:{pos:V(-.16,1.05,2.65),tgt:V(-.1,.82,0)},frontal:{pos:V(2.1,1.5,.02),tgt:V(-.22,.86,0)},
      diagonal:{pos:V(1.25,1.55,1.55),tgt:V(-.18,.8,0)},anatomia:{pos:V(.5,2.0,.55),tgt:V(-.28,.9,0)}},
    degTag:'30°', degAnchor,
    errors:ERR,
    info:`<section class="card"><h2>Equipamento</h2><dl class="params">
          <dt>Banco ajustável</dt><dd>Encosto a 30° em relação ao chão, assento acolchoado.</dd>
          <dt>Dois halteres</dt><dd>Independentes e iguais, com empunhadura central e cabeças sextavadas.</dd></dl>
          <p class="small" style="margin:10px 0 0">Ligue <b>Peças da máquina</b> abaixo da cena para ver os nomes no 3D.</p></section>
          <section class="card"><h2>Ajuste e postura</h2><dl class="params">
          <dt>Apoios</dt><dd>Cabeça no encosto, parte de cima das costas e glúteos no banco o tempo todo.</dd>
          <dt>Pés</dt><dd>No chão, na largura dos ombros, joelhos com 80–100° de flexão.</dd>
          <dt>Coluna</dt><dd>Curvatura natural da lombar, sem ponte; abdômen firme.</dd>
          <dt>Escápulas</dt><dd>Encaixadas contra o encosto do início ao fim.</dd>
          <dt>Pegada pronada</dt><dd>Palmas para a frente, polegares envolvendo a empunhadura, punhos neutros.</dd>
          <dt>Topo</dt><dd>Halteres acima dos ombros, cotovelos com 0–10° de flexão, sem encostar um halter no outro.</dd>
          <dt>Braços 45–60°</dt><dd>Ângulo entre braço e tronco na parte de baixo.</dd>
          <dt>Fundo</dt><dd>Cotovelos com 80–100° de flexão, halteres ao lado do tórax superior, antebraços verticais.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div>
          <p class="small" style="margin:10px 0 0">Também evite banco reto ou inclinado demais, pés sem apoio e transformar o movimento num desenvolvimento de ombros.</p></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const p=pBase(tr), v=(pBase(Math.min(T_END,tr+.02))-pBase(Math.max(0,tr-.02)))/.04;
      const J=solveSup({p,err,amt});
      wristA=err==='punhos'?amt*(.3+.7*sstep(.1,.8,p))*35*DEG:0;
      J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;J.amt=amt;return J;},
    postBones(BM){
      if(wristA<=0)return;
      [1,-1].forEach((m,k)=>{const w=W_REST[k];const q=new THREE.Quaternion().setFromAxisAngle(ZAX,m*wristA);
        const piv=new THREE.Matrix4().makeTranslation(w.x,w.y,w.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-w.x,-w.y,-w.z));
        BM[bi('ft',m)].multiply(piv);BM[bi('fing',m)].multiply(piv);});
    },
    phase(J){
      if(J.v>.05)return {kind:'ecc',label:'Descida controlada · excêntrica',cue:'Flexão do cotovelo e alongamento do peitoral sob resistência.'};
      if(J.v<-.05)return {kind:'conc',label:'Subida dos halteres · concêntrica',cue:'Peitoral e deltoide anterior elevam o braço; o tríceps estende o cotovelo.'};
      if(J.p>.5)return {kind:'hold',label:'Posição inferior',cue:'Antebraços verticais, braços a 45–60°, sem quicar.'};
      return {kind:'hold',label:'Posição inicial',cue:'Halteres acima dos ombros, cotovelos quase estendidos, sem travar.'};},
    update(J,t,ph){
      /* halteres seguem a mão (inclui o punho dobrado no erro) */
      const tq=new THREE.Quaternion(), tv=new THREE.Vector3();
      J.side.forEach((sd,i)=>{const B=BM[bi('ft',sd.m)];DUMB[i].position.copy(L('G',sd.m)).applyMatrix4(B);
        B.decompose(tv,tq,new THREE.Vector3());DUMB[i].quaternion.setFromUnitVectors(YUP,ZAX.clone().applyQuaternion(tq));});
      J.side.forEach((sd,i)=>{const a=arrows[i];const vel=sd.H.clone().sub(prevH[i]);prevH[i].copy(sd.H);
        const mov=Math.abs(J.v)>.05&&vel.lengthSq()>1e-9;a.visible=mov;
        if(mov){a.position.copy(sum(sd.H,1,ZAX,sd.s*.21));a.setDirection(vel.normalize());a.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}});
      const R=J.side[0];
      arc(elbArc,R.E,R.Sj.clone().sub(R.E),R.H.clone().sub(R.E),V(0,0,.08),.09);
      const elbF=180-kneeAngle(R.Sj,R.E,R.H);
      const abd=R.E.clone().sub(R.Sj).angleTo(J.u.clone().negate())/DEG;
      const f=R.H.clone().sub(R.E);f.addScaledVector(J.u,-f.dot(J.u));const fa=f.angleTo(J.n)/DEG;
      const elbShow=J.err==='travar'&&J.p<.1?'0° (travado)':Math.round(elbF)+'°';
      let es='';if(J.p<.05)es=J.err==='travar'?'warn':(elbF<=12?'ok':'warn');else if(J.p>.95)es=(elbF>=78&&elbF<=102)?'ok':'warn';
      return {elbow:{v:elbShow,s:es},
              abd:{v:Math.round(abd)+'°',s:J.p>.9?((abd>=42&&abd<=63)?'ok':'warn'):''},
              fa:{v:Math.round(fa)+'°',s:J.p>.9?(fa<=18?'ok':'warn'):''}};
    },
  };
})();

// #region: ex-lpx
/* ====================================================================================
   EXERCÍCIO 2 — LEG PRESS 45°
   ==================================================================================== */
const LPX=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const REC=35*DEG, TILT=-20*DEG;
  const u0=V(-Math.cos(REC),Math.sin(REC),0), n0=V(Math.sin(REC),Math.cos(REC),0);
  const d=V(Math.SQRT1_2,Math.SQRT1_2,0), e=V(-Math.SQRT1_2,Math.SQRT1_2,0);
  const nP=d.clone().applyAxisAngle(ZAX,TILT), tP=e.clone().applyAxisAngle(ZAX,TILT);
  const P0=V(0,.52,0), FOOTZ=.20, OFF=0;
  /* distância quadril→tornozelo ao longo do trilho para um ângulo de joelho desejado */
  const lat=FOOTZ-.095;
  const Dfor=k=>{const a=LEN.th,b=LEN.sn;const dd=a*a+b*b-2*a*b*Math.cos(k*DEG);return Math.sqrt(Math.max(.01,dd-OFF*OFF-lat*lat));};
  const D_TOP=Dfor(167), D_BOT=Dfor(92);
  const TRAV=D_TOP-D_BOT;
  /* centro da face da plataforma */
  const PF=p=>sum(P0,1,d,D_TOP-TRAV*p,e,OFF,nP,.085,tP,.10);
  const PF0=PF(0);
  const RAIL_OFF=sum(e,-.34);   /* linha dos trilhos, fixa */
  const railPt=(s,z)=>sum(PF0,1,RAIL_OFF,1,d,s,ZAX,z);
  const RZ=.34;

  /* --- Estrutura fixa --- */
  const fixed=new THREE.Group();grp.add(fixed);
  const RS0=-.62, RS1=.78;
  [-1,1].forEach(k=>{
    railIn(fixed,railPt(RS0,k*RZ),railPt(RS1,k*RZ),.028,mats.chrome);            /* trilhos */
    const lo=railPt(RS0,k*RZ), hi=railPt(RS1,k*RZ);
    railIn(fixed,lo,V(lo.x,.04,lo.z),.035,mats.frame);                           /* pé dianteiro */
    railIn(fixed,hi,V(hi.x,.04,hi.z),.04,mats.frame);                            /* coluna traseira */
    railIn(fixed,V(-.78,.035,k*RZ),V(hi.x+.08,.035,k*RZ),.04,mats.frame);         /* base no chão */
    railIn(fixed,sum(lo,1,d,.45),V(lo.x+.32,.04,k*RZ),.026,mats.frame);           /* mão-francesa */
    const stop=meshIn(fixed,new THREE.BoxGeometry(.04,.05,.065),mats.lock);        /* batente de segurança no trilho */
    stop.position.copy(railPt(RS0+.10,k*RZ)).addScaledVector(e,.03);stop.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(d,e,ZAX));
  });
  railIn(fixed,railPt(RS0,-RZ),railPt(RS0,RZ),.03,mats.frame);
  railIn(fixed,railPt(RS1,-RZ),railPt(RS1,RZ),.03,mats.frame);
  railIn(fixed,V(-.78,.035,-RZ),V(-.78,.035,RZ),.04,mats.frame);

  /* assento e encosto, posicionados pelo corpo */
  const backN=n0.clone(), seatDir=V(Math.cos(25*DEG),Math.sin(25*DEG),0), seatN=V(-Math.sin(25*DEG),Math.cos(25*DEG),0);
  const backLine=sum(P0,1,backN,-.16);
  const backPad=meshIn(fixed,new THREE.BoxGeometry(.07,.98,.38),mats.pad);
  backPad.position.copy(sum(backLine,1,u0,.40,backN,-.035));backPad.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(backN,u0,ZAX));
  const corner=sum(P0,1,backN,-.14,u0,-.13);
  const seatPad=meshIn(fixed,new THREE.BoxGeometry(.40,.07,.40),mats.pad);
  seatPad.position.copy(sum(corner,1,seatDir,.17,seatN,-.035));seatPad.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(seatDir,seatN,ZAX));
  const seatBase=sum(corner,1,seatDir,.16,seatN,-.08);
  railIn(fixed,sum(backLine,1,u0,.05,backN,-.08),sum(backLine,1,u0,.85,backN,-.08),.035,mats.frame);
  railIn(fixed,seatBase,V(seatBase.x,.04,0),.045,mats.frame);
  railIn(fixed,sum(backLine,1,u0,.62,backN,-.08),V(-.70,.04,0),.03,mats.frame);
  railIn(fixed,V(-.78,.04,0),V(seatBase.x+.25,.04,0),.035,mats.frame);
  railIn(fixed,V(seatBase.x,.035,-RZ),V(seatBase.x,.035,RZ),.035,mats.frame);

  /* --- Carrinho deslizante + plataforma --- */
  const sled=new THREE.Group();grp.add(sled);
  const deckMat=mats.deck.clone();
  const plate=new THREE.Group();sled.add(plate);plate.quaternion.setFromAxisAngle(ZAX,TILT);
  const face=meshIn(plate,new THREE.BoxGeometry(.035,.66,.80),deckMat);face.position.set(.0175,0,0);
  for(let i=-5;i<=5;i++){const r=meshIn(plate,new THREE.BoxGeometry(.006,.006,.76),mats.frame,false);r.position.set(-.002,i*.055,0);}
  const sledFrame=[];
  const B=(sx,sy,sz,x,y,z,mat=mats.frame)=>{const b=meshIn(sled,new THREE.BoxGeometry(sx,sy,sz),mat);b.position.set(x,y,z);sledFrame.push(b);return b;};
  B(.05,.08,.80,.12,-.24,0);B(.05,.08,.80,.12,.22,0);                     /* travessas */
  [-1,1].forEach(k=>{
    B(.56,.07,.06,.24,-.26,k*RZ);                                          /* longarinas sobre os trilhos */
    B(.06,.52,.05,.08,-.02,k*.37);                                         /* laterais da plataforma */
    [.04,.44].forEach(x=>{const r=meshIn(sled,new THREE.CylinderGeometry(.038,.038,.05,16),mats.steel);r.rotation.x=Math.PI/2;r.position.set(x,-.31,k*RZ);});
    /* suportes de anilhas */
    const horn=meshIn(sled,new THREE.CylinderGeometry(.024,.024,.26,14),mats.chrome);horn.rotation.x=Math.PI/2;horn.position.set(.34,.10,k*.53);
    B(.36,.05,.05,.20,.10,k*.40);
    [.47,.52].forEach(z=>{const pl=meshIn(sled,new THREE.CylinderGeometry(.17,.17,.04,32),mats.plate);pl.rotation.x=Math.PI/2;pl.position.set(.34,.10,k*z);
      const hub=meshIn(sled,new THREE.CylinderGeometry(.045,.045,.044,16),mats.chrome,false);hub.rotation.x=Math.PI/2;hub.position.set(.34,.10,k*z);});
    /* alavanca da trava de segurança */
    const lv=meshIn(sled,new THREE.CylinderGeometry(.011,.011,1,10),mats.frame);seg(lv,V(.10,-.22,k*.41),V(-.07,-.31,k*.41));
    const kn=meshIn(sled,new THREE.SphereGeometry(.022,14,10),mats.lock);kn.position.set(-.07,-.31,k*.41);
  });
  const sledQ=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(d,e,ZAX));
  sled.quaternion.copy(sledQ);

  /* pegadores laterais: posicionados pela pose de referência */
  const handleObjs=[];
  const lpPose=(st)=>solveLP(st);
  /* --- Guias --- */
  const statics=new THREE.Group();guides.add(statics);
  const trajZ=.62;
  const trajA=PF(-.02).add(V(0,0,trajZ)), trajB=PF(1.02).add(V(0,0,trajZ));
  lineIn(statics,[trajA,trajB]);
  [trajA,trajB].forEach(pt=>{lineIn(statics,[sum(pt,1,e,-.05),sum(pt,1,e,.05)]);});
  const arrow=new THREE.ArrowHelper(d,V(0,0,0),.18,0xffffff,.06,.045);guides.add(arrow);
  const base45=railPt(RS0,RZ+.08);base45.y=Math.max(base45.y,.05);
  (function(){const o=railPt(RS0,RZ+.06);lineIn(statics,[o,sum(o,1,XAX,.42)]);lineIn(statics,[o,sum(o,1,d,.42)]);
    const arc=[];for(let a=0;a<=45;a+=3)arc.push(sum(o,1,V(Math.cos(a*DEG),Math.sin(a*DEG),0),.3));lineIn(statics,arc);})();
  const degAnchor=sum(railPt(RS0,RZ+.06),1,V(Math.cos(22*DEG),Math.sin(22*DEG),0),.42);
  const kneeArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(kneeArc);

  /* --- Linha do tempo --- */
  const KEYS=[
   {t:0,  title:'Posição inicial',d:'Costas e glúteos apoiados, mãos nos pegadores, pés na largura dos ombros e joelhos com 10–15° de flexão.'},
   {t:1.0,title:'Início da descida',d:'Joelhos e quadris começam a flexionar; a plataforma desce pelos trilhos.',ph:'ecc'},
   {t:1.6,title:'Descida intermediária',d:'A flexão aumenta com velocidade controlada. Joelhos na direção das pontas dos pés.',ph:'ecc'},
   {t:2.1,title:'Aproximação da posição inferior',d:'Coxas se aproximam do tronco. Lombar e glúteos continuam no encosto.',ph:'ecc'},
   {t:2.6,title:'Ponto máximo da descida',d:'Joelhos perto de 90°: maior flexão sem o quadril sair do banco.'},
   {t:3.4,title:'Início da subida',d:'Empurre com o pé inteiro; joelhos e quadris começam a estender.',ph:'conc'},
   {t:3.9,title:'Subida intermediária',d:'Coxas se afastam do tronco, calcanhares apoiados e pressão distribuída nos pés.',ph:'conc'},
   {t:4.5,title:'Aproximação da extensão final',d:'Joelhos quase estendidos, mantendo uma flexão residual.',ph:'conc'},
   {t:4.9,title:'Posição inicial recuperada',d:'Joelhos sem travar. Estável e pronto para a próxima repetição.'},
  ];
  const T_END=5.4;
  const pBase=t=>t<.6?0:t<2.6?ease((t-.6)/2):t<2.9?1:t<4.9?1-ease((t-2.9)/2):0;
  function pFast(t){ /* descida descontrolada: cai rápido, quica e sobe */
    if(t<.6)return 0;if(t<1.25){const s=(t-.6)/.65;return 1.07*s*s;}
    if(t<1.5)return 1.07-.2*ease((t-1.25)/.25);if(t<1.75)return .87+.1*ease((t-1.5)/.25);
    if(t<3.75)return .97*(1-ease((t-1.75)/2));return 0;}

  const ERR={
    valgo:{name:'Joelhos entrando para dentro',fix:'Joelhos seguem a direção das pontas dos pés durante toda a repetição.'},
    lombar:{name:'Perda do contato da lombar',fix:'Desça só até onde a lombar e os glúteos continuam apoiados no banco.'},
    calcanhar:{name:'Calcanhares saindo da plataforma',fix:'Empurre com o pé inteiro, com o peso no meio do pé e no calcanhar.'},
    travar:{name:'Travar os joelhos',fix:'Termine a subida com uma leve flexão nos joelhos.'},
    pes:{name:'Pés baixos demais na plataforma',fix:'Pés no meio da plataforma, na largura dos ombros e com as pontas um pouco para fora.'},
    rapida:{name:'Descida descontrolada',fix:'Cerca de 2 segundos de descida, sem quicar na parte de baixo.'},
  };

  function solveLP(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let u=u0.clone(), n=n0.clone(), P=P0.clone();
    /* erro: pelve rola para trás e o glúteo sai do assento no fundo da descida */
    if(err==='lombar'&&amt>0){const g=amt*sstep(.72,1.15,p)*16*DEG;
      const piv=sum(P0,1,u0,.42,n0,-.13);
      let q=new THREE.Quaternion().setFromAxisAngle(ZAX,g);
      let Pn=P0.clone().sub(piv).applyQuaternion(q).add(piv);
      if(Pn.clone().sub(P0).dot(n0)<0){q=new THREE.Quaternion().setFromAxisAngle(ZAX,-g);Pn=P0.clone().sub(piv).applyQuaternion(q).add(piv);}
      P=Pn;u.applyQuaternion(q);n.applyQuaternion(q);}
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,4*DEG);
    const plateC=PF(p);
    const side=[];
    [1,-1].forEach(s=>{const m=-s;
      const Sj=mapT(L('Sj',m));
      /* mãos nos pegadores ao lado do assento, cotovelo levemente flexionado */
      const reach=Math.sqrt(LEN.ua**2+LEN.fa**2-2*LEN.ua*LEN.fa*Math.cos(158*DEG));
      const hd=sum(u0,-1,ZAX,.40*s,n0,.04).normalize();
      const S0=sum(P0,1,L('Sj',m).sub(L('P')).applyQuaternion(torsoQ(u0,n0)),1);
      const H=sum(S0,1,hd,reach);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,sum(ZAX,s,n0,-.35,u0,.1),ZAX.clone().multiplyScalar(-s));
      const hip=mapT(L('Hip',m));
      /* pé apoiado na plataforma, pontas levemente para fora */
      let offE=OFF, heel=0;
      if(err==='pes'){offE=OFF-.15*amt;heel=amt*sstep(.3,1,p)*16*DEG;}
      if(err==='calcanhar')heel=amt*sstep(.15,.9,p)*24*DEG;
      const toe=tP.clone().addScaledVector(ZAX,.27*s).normalize();
      let A=sum(plateC,1,nP,-.085,tP,-.10+(offE-OFF),ZAX,FOOTZ*s);
      let qFoot=alignQ(YUP,ZAX,nP.clone().negate(),toe);
      if(heel>0){const ball=sum(A,1,nP,.085,toe,.14);const axis=new THREE.Vector3().crossVectors(toe,nP).normalize();
        let q=new THREE.Quaternion().setFromAxisAngle(axis,heel);let An=A.clone().sub(ball).applyQuaternion(q).add(ball);
        if(An.clone().sub(A).dot(nP)>0){q=new THREE.Quaternion().setFromAxisAngle(axis,-heel);An=A.clone().sub(ball).applyQuaternion(q).add(ball);}
        A=An;qFoot=q.multiply(qFoot);}
      let kz=.14;if(err==='valgo')kz=.14-.8*amt*sstep(.1,.9,p);
      const lpole=sum(e,1,ZAX,kz*s);
      const K=legBones(bones,qT,s,hip,A,lpole,qFoot);
      side.push({s,m,Sj,E,H,hip,K,A,qFT});
    });
    return {u,n,P,side,bones,plateC};
  }
  const refPose=solveLP({p:0,err:null,amt:0});
  refPose.side.forEach(sd=>{
    const g=new THREE.Group();fixed.add(g);
    const ax=ZAX.clone().applyQuaternion(sd.qFT);
    const h=meshIn(g,new THREE.CylinderGeometry(.017,.017,.15,12),mats.chrome);h.position.copy(sd.H);h.quaternion.setFromUnitVectors(YUP,ax);
    const end=sum(sd.H,1,ax,-.075*Math.sign(ax.y||1));
    const lowEnd=ax.y>0?sum(sd.H,1,ax,-.075):sum(sd.H,1,ax,.075);
    const foot=V(lowEnd.x,.04,lowEnd.z);
    railIn(g,lowEnd,V(lowEnd.x,lowEnd.y-.02,lowEnd.z));
    railIn(g,lowEnd,V(seatBase.x+.02,Math.min(lowEnd.y,seatBase.y)-.05,lowEnd.z*.55),.02,mats.frame);
    railIn(g,V(seatBase.x+.02,Math.min(lowEnd.y,seatBase.y)-.05,lowEnd.z*.55),V(seatBase.x,Math.min(lowEnd.y,seatBase.y)-.05,0),.02,mats.frame);
    handleObjs.push(g);
  });

  const PARTS=[
    {label:'Plataforma',pos:()=>sum(LPX_state.plateC,1,tP,.36)},
    {label:'Carrinho',pos:()=>sum(LPX_state.plateC,1,d,.30,e,-.26,ZAX,.34)},
    {label:'Trilhos',pos:()=>railPt(RS1-.05,RZ)},
    {label:'Suporte de anilhas',pos:()=>sum(LPX_state.plateC,1,d,.34,e,.10,ZAX,.64)},
    {label:'Encosto',pos:()=>sum(backLine,1,u0,.62,backN,-.05,ZAX,.24)},
    {label:'Assento',pos:()=>sum(corner,1,seatDir,.22,ZAX,.24)},
    {label:'Pegador',pos:()=>refPose.side[0].H.clone().add(V(0,-.05,0))},
    {label:'Trava',pos:()=>sum(LPX_state.plateC,1,d,-.07,e,-.31,ZAX,.41)},
  ];
  let LPX_state=refPose;
  /* nas vistas frontal e anatômica, carrinho e parte de cima da estrutura ficam translúcidos para mostrar pernas e pés */
  const ghostMat=new THREE.MeshStandardMaterial({color:0x8a939e,transparent:true,opacity:.16,depthWrite:false,roughness:.6});
  const ghostDeck=new THREE.MeshStandardMaterial({color:0x8a939e,transparent:true,opacity:.28,depthWrite:false,roughness:.6});
  const ghostables=[];
  sled.traverse(o=>{if(o.isMesh){o.userData.mat=o.material;if(o.material===deckMat)o.userData.ghost=ghostDeck;ghostables.push(o);}});
  fixed.children.forEach(o=>{if(o.isMesh&&o.material!==mats.pad){const p=o.position;if(p.x>.25&&p.y>.45){o.userData.mat=o.material;ghostables.push(o);}}});

  /* erro em demonstração: 1 repetição incorreta e 1 corrigida */
  let errMode=null;
  return {
    id:'legpress', title:'Leg Press 45° 3D', loadingText:'Carregando modelo anatômico…',
    eyebrow:'Treino · Quadríceps e glúteos', h1:'Leg press 45°',
    specs:'<span>Trilho <b>45°</b></span><span>Joelhos <b>10–15° → ~90°</b></span><span>Descida <b>~2 s</b></span><span>Subida <b>~2 s</b></span>',
    groups:{p:{label:'Principais',col:'--red'},s:{label:'Secundários',col:'--orange'},e:{label:'Estabilizadores',col:'--yellow'}},
    muscles:[
     {id:'retoFem',name:'Quadríceps · reto femoral',g:'p',tag:'Reto femoral'},
     {id:'vastoLat',name:'Quadríceps · vasto lateral',g:'p',tag:'Vasto lateral'},
     {id:'vastoMed',name:'Quadríceps · vasto medial',g:'p',tag:'Vasto medial'},
     {id:'vastoInt',name:'Quadríceps · vasto intermédio (profundo, sob o reto femoral)',g:'p'},
     {id:'gluteos',name:'Glúteo máximo (apoiado no assento)',g:'p'},
     {id:'adutor',name:'Adutor magno',g:'s',tag:'Adutor magno'},
     {id:'bicepsFem',name:'Bíceps femoral',g:'s',tag:'Posteriores da coxa'},
     {id:'semitend',name:'Semitendíneo',g:'s'},
     {id:'semimemb',name:'Semimembranáceo',g:'s'},
     {id:'gluteoMed',name:'Glúteo médio',g:'e'},
     {id:'gastro',name:'Gastrocnêmio',g:'e',tag:'Gastrocnêmio'},
     {id:'soleo',name:'Sóleo',g:'e'},
    ],
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS,
    readouts:[{id:'knee',label:'Flexão do joelho'},{id:'hip',label:'Quadril × tronco'}],
    views:{lateral:{pos:V(.2,.95,2.65),tgt:V(.2,.78,0)},frontal:{pos:V(.62,3.05,0),tgt:V(.22,.78,0)},anatomia:{pos:V(.45,1.3,1.75),tgt:V(.2,.76,0)}},
    degTag:'45°', degAnchor, deckMat, portrait:1.85,
    errors:ERR,
    info:`<section class="card"><h2>O equipamento</h2><dl class="params">
          <dt>Plataforma</dt><dd>Onde os pés empurram. Sobe e desce junto com o carrinho.</dd>
          <dt>Carrinho e trilhos</dt><dd>O carrinho desliza em dois trilhos inclinados a 45°.</dd>
          <dt>Suportes de anilhas</dt><dd>Pinos laterais do carrinho onde se coloca a carga.</dd>
          <dt>Assento e encosto</dt><dd>Acolchoados. Seguram glúteos, lombar, costas e cabeça.</dd>
          <dt>Pegadores</dt><dd>Ao lado do assento, para manter o corpo firme no banco.</dd>
          <dt>Travas</dt><dd>Alavancas do carrinho e batentes nos trilhos. Seguram a plataforma antes e depois da série.</dd></dl>
          <p class="small" style="margin:10px 0 0">Ligue <b>Peças da máquina</b> abaixo da cena para ver os nomes no 3D.</p></section>
          <section class="card"><h2>Posição inicial</h2><dl class="params">
          <dt>Apoios</dt><dd>Costas e lombar no encosto, glúteos no assento, cabeça alinhada ao tronco.</dd>
          <dt>Mãos</dt><dd>Nos pegadores laterais, com os cotovelos levemente flexionados.</dd>
          <dt>Pés</dt><dd>Na largura dos ombros, no meio da plataforma, pontas um pouco para fora.</dd>
          <dt>Calcanhares</dt><dd>Totalmente apoiados durante todo o movimento.</dd>
          <dt>Joelhos 10–15°</dt><dd>Flexão no início e no fim de cada repetição. Nunca travados.</dd>
          <dt>Amplitude</dt><dd>Desça até perto de 90° no joelho, ou até onde o quadril não sai do banco.</dd>
          <dt>Travas</dt><dd>Solte com as pernas já sustentando a plataforma. Recoloque ao terminar a série.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;},
    getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      let p=pBase(tr);
      if(err==='rapida'&&rep)p=pFast(tr);
      if(err==='travar')p=p-.16*amt*(1-sstep(0,.35,p));
      if(err==='lombar')p=p*(1+.17*amt);
      const J=solveLP({p,err,amt});LPX_state=J;
      const p2=(rr=>{let q=(err==='rapida'&&rep)?pFast(rr):pBase(rr);return q;})(Math.min(T_END,tr+.02));
      const p1=(rr=>{let q=(err==='rapida'&&rep)?pFast(rr):pBase(rr);return q;})(Math.max(0,tr-.02));
      J.p=p;J.v=(p2-p1)/.04;J.active=true;J.err=err;J.rep=rep;J.tr=tr;return J;},
    phase(J){
      if(J.v>.05)return {kind:'ecc',label:'Excêntrica · descida',cue:'Joelhos e quadris flexionam; quadríceps e glúteos alongam sob controle.'};
      if(J.v<-.05)return {kind:'conc',label:'Concêntrica · subida',cue:'Empurre com o pé inteiro: joelhos e quadris estendem.'};
      if(J.p>.5)return {kind:'hold',label:'Ponto mais baixo',cue:'Pausa curta. Lombar e glúteos apoiados, calcanhares no lugar.'};
      return {kind:'hold',label:'Posição inicial',cue:'Joelhos quase estendidos, sem travar.'};},
    update(J,t,ph){
      sled.position.copy(J.plateC);
      arrow.visible=Math.abs(J.v)>.05&&statics.visible;
      if(arrow.visible){arrow.position.copy(sum(J.plateC,1,d,.02,ZAX,trajZ));arrow.setDirection(J.v>0?d.clone().negate():d);arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const R=J.side[0];
      const kA=kneeAngle(R.hip,R.K,R.A), flex=180-kA;
      const hipA=J.u.angleTo(R.K.clone().sub(R.hip))/DEG;
      /* arco do ângulo do joelho, do lado direito */
      const a1=R.hip.clone().sub(R.K).normalize(), a2=R.A.clone().sub(R.K).normalize();
      const pos=kneeArc.geometry.attributes.position;const c=R.K.clone().add(V(0,0,.09));
      for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(.12).add(c);pos.setXYZ(i,v.x,v.y,v.z);}
      pos.needsUpdate=true;
      let ks='';if(J.p<.03)ks=flex<5?'warn':(flex<=20?'ok':'');if(J.p>.95)ks=(flex>=80&&flex<=100)?'ok':(flex>100?'warn':'');
      return {knee:{v:Math.round(flex)+'°',s:ks},hip:{v:Math.round(hipA)+'°',s:''}};
    },
    viewChanged(v){const see=v!=='lateral';statics.visible=!see;kneeArc.visible=v!=='frontal';
      ghostables.forEach(m=>{m.material=see?(m.userData.ghost||ghostMat):m.userData.mat;m.castShadow=!see||m.userData.keepShadow;});},
  };
})();

// #region: ex-row
/* ====================================================================================
   EXERCÍCIO 3 — REMADA SENTADA NA POLIA BAIXA (puxador triangular)
   ==================================================================================== */
const ROW=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const SEAT_Y=.42, P0=V(0,.54,0);
  const FOOT_N=V(-Math.cos(25*DEG),Math.sin(25*DEG),0);           /* normal da face do apoio de pé (aponta para a pessoa) */
  const FOOT_T=V(Math.sin(25*DEG),Math.cos(25*DEG),0);            /* direção "para cima" ao longo do apoio */
  const FOOTZ=.12;
  /* tornozelo para joelho a ~157° (≈23° de flexão) com a pelve em P0 */
  const kneeDist=k=>Math.sqrt(LEN.th**2+LEN.sn**2-2*LEN.th*LEN.sn*Math.cos(k*DEG));
  const AY=.40, latL=FOOTZ-.095;
  const AX=Math.sqrt(kneeDist(157)**2-(P0.y-AY)**2-latL**2);
  const ankle=s=>V(AX,AY,FOOTZ*s);
  const PUL=V(.99,.47,0);                                          /* polia baixa */
  const P2=V(1.36,.10,0), P3=V(1.36,2.02,0), P4=V(1.53,2.02,0);    /* polias da torre */
  const STACK_X=1.53, PL_T=.045, PL_GAP=.004, NPL=14, PL_Y0=.13, SEL=6;

  /* --- Estrutura --- */
  const fixed=new THREE.Group();grp.add(fixed);
  /* banco */
  const seat=meshIn(fixed,new THREE.BoxGeometry(1.0,.07,.32),mats.pad);seat.position.set(-.02,SEAT_Y-.035,0);
  railIn(fixed,V(-.42,.04,0),V(-.42,SEAT_Y-.07,0),.035,mats.frame);railIn(fixed,V(.36,.04,0),V(.36,SEAT_Y-.07,0),.035,mats.frame);
  railIn(fixed,V(-.48,SEAT_Y-.08,0),V(.44,SEAT_Y-.08,0),.03,mats.frame);
  railIn(fixed,V(-.56,.035,0),V(1.70,.035,0),.04,mats.frame);                               /* longarina */
  railIn(fixed,V(-.56,.03,-.22),V(-.56,.03,.22),.035,mats.frame);
  /* apoios dos pés + carenagem da polia */
  const footPads=[];
  [1,-1].forEach(s=>{const A=ankle(s);const toe=FOOT_T.clone().addScaledVector(ZAX,.12*s).normalize();
    const c=sum(A,1,FOOT_N,-.085-.012,toe,.07);
    const fp=meshIn(fixed,new THREE.BoxGeometry(.024,.30,.15),mats.deck);fp.position.copy(c);
    fp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(FOOT_N.clone().negate(),FOOT_T,ZAX));footPads.push(fp);
    railIn(fixed,sum(c,1,FOOT_N,-.03),V(c.x+.12,.05,c.z*.7),.025,mats.frame);});
  railIn(fixed,V(1.02,.04,0),V(1.02,.62,0),.045,mats.frame);
  const housing=meshIn(fixed,new THREE.BoxGeometry(.10,.16,.09),mats.frame);housing.position.set(1.03,.47,0);
  /* torre de pesos */
  const tower=new THREE.Group();grp.add(tower);
  [-1,1].forEach(k=>{railIn(tower,V(1.30,.04,k*.27),V(1.30,2.10,k*.27),.035,mats.frame);railIn(tower,V(1.72,.04,k*.27),V(1.72,2.10,k*.27),.035,mats.frame);
    railIn(tower,V(1.30,2.10,k*.27),V(1.72,2.10,k*.27),.03,mats.frame);railIn(tower,V(1.30,.04,k*.27),V(1.72,.04,k*.27),.035,mats.frame);
    railIn(tower,V(STACK_X,.10,k*.15),V(STACK_X,2.0,k*.15),.012,mats.chrome);});                 /* hastes-guia */
  railIn(tower,V(1.30,2.10,-.27),V(1.30,2.10,.27),.03,mats.frame);railIn(tower,V(1.72,2.10,-.27),V(1.72,2.10,.27),.03,mats.frame);
  const shroud=meshIn(tower,new THREE.BoxGeometry(.02,1.55,.50),mats.frame);shroud.position.set(1.76,.95,0);
  const wheels=[];
  [PUL,P2,P3,P4].forEach(p=>{const w=meshIn(tower,new THREE.CylinderGeometry(.045,.045,.03,24),mats.steel);w.rotation.x=Math.PI/2;w.position.copy(p);wheels.push(w);});
  railIn(tower,V(1.36,2.10,0),V(1.53,2.10,0),.02,mats.frame);
  /* pilha de placas */
  const plates=[];
  for(let i=0;i<NPL;i++){const pl=meshIn(tower,new THREE.BoxGeometry(.24,PL_T,.42),mats.plate);const y=PL_Y0+i*(PL_T+PL_GAP)+PL_T/2;pl.position.set(STACK_X,y,0);pl.userData.y0=y;plates.push(pl);}
  const topIdx=NPL-1, selIdx=NPL-SEL;            /* pino na 6ª placa a partir do topo */
  const selRod=meshIn(tower,new THREE.CylinderGeometry(.009,.009,1,10),mats.chrome);
  const pin=new THREE.Group();tower.add(pin);
  { const sh=meshIn(pin,new THREE.CylinderGeometry(.007,.007,.16,10),mats.chrome);sh.rotation.z=Math.PI/2;sh.position.x=-.03;
    const kn=meshIn(pin,new THREE.SphereGeometry(.018,14,10),mats.lock);kn.position.x=-.12; }
  const cap=meshIn(tower,new THREE.BoxGeometry(.10,.035,.10),mats.steel);
  /* cabo */
  const cableMat=new THREE.MeshStandardMaterial({color:0x2b2f34,roughness:.5,metalness:.4});
  const cable=[0,1,2,3,4].map(()=>meshIn(grp,new THREE.CylinderGeometry(.0045,.0045,1,6),cableMat,false));
  seg(cable[1],sum(PUL,1,YUP,-.045),sum(P2,1,XAX,-.045));
  seg(cable[2],sum(P2,1,XAX,-.045).setY(P2.y),sum(P3,1,XAX,-.045));
  seg(cable[3],sum(P3,1,YUP,.045),sum(P4,1,YUP,.045));
  /* puxador triangular + mosquetão */
  const vbar=new THREE.Group();grp.add(vbar);
  { [-1,1].forEach(k=>{const h=meshIn(vbar,new THREE.CylinderGeometry(.016,.016,.13,14),mats.chrome);h.position.set(0,0,k*.045);
      const rb=meshIn(vbar,new THREE.CylinderGeometry(.007,.007,1,8),mats.steel);seg(rb,V(0,.06,k*.045),V(.17,0,0));
      const rb2=meshIn(vbar,new THREE.CylinderGeometry(.007,.007,1,8),mats.steel);seg(rb2,V(0,-.06,k*.045),V(.17,0,0));});
    const top=meshIn(vbar,new THREE.CylinderGeometry(.007,.007,.09,8),mats.steel);top.rotation.x=Math.PI/2;top.position.set(0,.068,0);
    const bot=meshIn(vbar,new THREE.CylinderGeometry(.007,.007,.09,8),mats.steel);bot.rotation.x=Math.PI/2;bot.position.set(0,-.068,0);
    const eye=meshIn(vbar,new THREE.TorusGeometry(.016,.004,8,18),mats.steel);eye.position.set(.185,0,0);
    const crab=meshIn(vbar,new THREE.TorusGeometry(.022,.0045,8,20),mats.lock);crab.position.set(.215,0,0);crab.rotation.x=Math.PI/2;crab.scale.set(1.4,1,1); }
  const VB_TIP=.24;

  /* --- Linha do tempo --- */
  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Sentado de frente para a polia, braços estendidos, escápulas em protração natural e pés nos apoios.'},
   {t:.8,  title:'Início da puxada',d:'Cotovelos começam a flexionar e as escápulas começam a se aproximar.',ph:'conc'},
   {t:1.4, title:'Puxada intermediária',d:'Braços vão para trás junto ao tronco e o puxador se aproxima do abdômen.',ph:'conc'},
   {t:1.9, title:'Aproximação da posição final',d:'Cotovelos perto das laterais do tronco, escápulas cada vez mais retraídas.',ph:'conc'},
   {t:2.4, title:'Posição final',d:'Puxador perto do abdômen, cotovelos flexionados e escápulas retraídas. Pausa curta.'},
   {t:3.3, title:'Início do retorno',d:'Cotovelos começam a estender e os braços avançam.',ph:'ecc'},
   {t:4.15,title:'Retorno intermediário',d:'Escápulas começam a voltar à protração e os braços avançam sob controle.',ph:'ecc'},
   {t:4.9, title:'Aproximação da extensão',d:'Braços quase estendidos e o puxador se aproximando da polia.',ph:'ecc'},
   {t:5.4, title:'Posição inicial recuperada',d:'Braços estendidos sem travar, escápulas em protração natural, corpo estável.'},
  ];
  const T_END=5.4;
  const pBase=t=>t<.4?0:t<2.4?ease((t-.4)/2):t<2.9?1:t<5.4?1-ease((t-2.9)/2.5):0;
  function pJerk(t){ /* movimento brusco: puxa de uma vez e solta */
    if(t<.4)return 0;if(t<.85){const s=(t-.4)/.45;return Math.min(1,1.08*s*(2-s));}
    if(t<1.2)return 1-.06*ease((t-.85)/.35);if(t<1.55){const s=(t-1.2)/.35;return .94*(1-s*s);}return 0;}

  const ERR={
    balanco:{name:'Balanço excessivo do tronco',fix:'Tronco quase parado e vertical. Quem puxa são as costas e os braços.'},
    arredondar:{name:'Arredondamento da coluna',fix:'Peito aberto e coluna neutra, inclusive com os braços estendidos à frente.'},
    ombros:{name:'Elevação dos ombros',fix:'Ombros longe das orelhas: escápulas para trás e para baixo.'},
    cotovelos:{name:'Cotovelos excessivamente abertos',fix:'Cotovelos perto do tronco, a 10–30° dele.'},
    amplitude:{name:'Amplitude reduzida',fix:'Estenda bem os braços na volta e traga o puxador até o abdômen.'},
    brusco:{name:'Movimento brusco',fix:'Cerca de 2 s puxando, pausa curta e 2,5 s voltando, sem trancos.'},
    excessiva:{name:'Puxada excessiva para trás',fix:'Pare com o puxador no abdômen; cotovelos não passam muito da linha do tronco.'},
    joelhos:{name:'Joelhos travados',fix:'Mantenha 15–30° de flexão nos joelhos durante toda a série.'},
  };
  let errMode=null;

  function solveRow(st){
    const {p,r,err,amt}=st;
    const bones=new Array(NB);
    /* inclinação do tronco em graus (positivo = para a frente) */
    let lean=7-9*p, head=0, shUp=0, flare=0, hEnd=0, Pshift=0;
    if(err==='balanco')lean+=amt*(14-28*p);
    if(err==='arredondar'){lean+=amt*(16-8*p);head=amt*(18-6*p);}
    if(err==='ombros')shUp=amt*sstep(.15,.9,p)*.07;
    if(err==='cotovelos')flare=amt;
    if(err==='excessiva'){lean-=amt*sstep(.5,1,p)*14;hEnd=amt*sstep(.5,1,p);}
    if(err==='joelhos')Pshift=amt*.03;
    const a=lean*DEG;
    const u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    const P=P0.clone().add(V(-Pshift,0,0));
    const mapT=torsoBones(bones,qT,P,(4+head)*DEG);
    /* escápulas: protração (r=0) → retração (r=1) */
    const scap=s=>sum(n,.024-.052*r-(err==='arredondar'?amt*.03*(1-p):0),ZAX,s*(.012-.024*r),u,shUp-.006*r-(err==='arredondar'?amt*.015:0));
    /* centro do puxador no referencial do tronco: estendido à frente → abdômen */
    const C0=[.21,.586], C1=[.25-.03*hEnd,.25-.15*hEnd];
    const cu=C0[0]+(C1[0]-C0[0])*p, cn=C0[1]+(C1[1]-C0[1])*p+.035*Math.sin(Math.PI*p);
    const C=sum(P,1,u,cu,n,cn);
    const side=[];
    [1,-1].forEach(s=>{const m=-s;
      const Sj=mapT(L('Sj',m)).add(scap(s));
      const H=sum(C,1,ZAX,.045*s);
      const pole=sum(n,-1.5+1.2*flare,u,-.3+1.1*flare,ZAX,s*(1.2+2.2*flare));
      const {E,qFT}=armBones(bones,qT,s,Sj,H,pole,ZAX.clone().multiplyScalar(-s));
      const hip=mapT(L('Hip',m));
      const A=ankle(s);
      const toe=FOOT_T.clone().addScaledVector(ZAX,.12*s).normalize();
      const K=legBones(bones,qT,s,hip,A,sum(YUP,1,ZAX,.1*s),alignQ(YUP,ZAX,FOOT_N,toe));
      side.push({s,m,Sj,E,H,hip,K,A,qFT});
    });
    /* ombros (meio-osso) acompanham o deslocamento escapular */
    return {u,n,P,side,bones,C,lean};
  }
  const ref=solveRow({p:0,r:0,err:null,amt:0});
  const cableLen0=ref.C.distanceTo(PUL);

  /* --- Guias --- */
  const path=[];for(let k=0;k<=24;k++){const J=solveRow({p:k/24,r:Math.min(1,k/24*1.4),err:null,amt:0});path.push(J.C.clone().add(V(0,0,.24)));}
  lineIn(statics,path);
  const arrow=new THREE.ArrowHelper(XAX,V(0,0,0),.15,0xffffff,.055,.04);guides.add(arrow);
  const scapLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);guides.add(scapLine);
  const scapTicks=[0,1].map(()=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);guides.add(l);return l;});
  const elbowArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(elbowArc);
  const kneeArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(kneeArc);
  function arc(line,c,a,b,off){const pos=line.geometry.attributes.position;const a1=a.clone().sub(c).normalize(),a2=b.clone().sub(c).normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(.1).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}

  let S=ref;
  const PARTS=[
    {label:'Banco',pos:()=>V(-.30,SEAT_Y,.17)},
    {label:'Apoio dos pés',pos:()=>sum(ankle(1),1,FOOT_N,-.1,FOOT_T,.2,ZAX,.06)},
    {label:'Polia baixa',pos:()=>sum(PUL,1,YUP,.06)},
    {label:'Cabo de aço',pos:()=>S.C.clone().lerp(PUL,.62).add(V(0,.02,.02))},
    {label:'Puxador triangular',pos:()=>S.C.clone().add(V(.05,-.09,.06))},
    {label:'Mosquetão',pos:()=>sum(S.C,1,S.cdir,.215).add(V(0,.03,0))},
    {label:'Torre de pesos',pos:()=>V(1.53,1.35,.27)},
    {label:'Pino seletor',pos:()=>pin.position.clone().add(V(-.12,0,0))},
    {label:'Estrutura',pos:()=>V(1.30,1.75,.27)},
  ];
  const GT=[
    {label:'Inicial',pos:()=>path[0].clone().add(V(.02,.06,0)),views:['lateral']},
    {label:'Final',pos:()=>path[path.length-1].clone().add(V(0,.07,0)),views:['lateral']},
  ];

  const ghostMat=new THREE.MeshStandardMaterial({color:0x8a939e,transparent:true,opacity:.16,depthWrite:false,roughness:.6});
  const ghostables=[];tower.traverse(o=>{if(o.isMesh){o.userData.mat=o.material;ghostables.push(o);}});
  cable.slice(1).forEach(o=>{o.userData.mat=o.material;ghostables.push(o);});

  return {
    id:'remada', title:'Remada Sentada 3D',
    eyebrow:'Treino · Costas', h1:'Remada sentada na polia baixa',
    specs:'<span>Puxador <b>triangular</b></span><span>Pegada <b>neutra</b></span><span>Puxada <b>~2 s</b></span><span>Retorno <b>~2,5 s</b></span>',
    groups:{p:{label:'Principal',col:'--red'},s:{label:'Destaque secundário',col:'--orange'},e:{label:'Flexores do cotovelo',col:'--yellow'},n:{label:'Também trabalham (cinza)',col:'--muted'}},
    strongE:true,
    muscles:[
     {id:'latissimo',name:'Latíssimo do dorso',g:'p',tag:'Latíssimo do dorso'},
     {id:'trapMed',name:'Trapézio · porção média',g:'s',tag:'Trapézio médio'},
     {id:'romboides',name:'Romboides maior e menor',g:'s',tag:'Romboides'},
     {id:'deltPost',name:'Deltoide posterior',g:'s',tag:'Deltoide posterior'},
     {id:'biceps',name:'Bíceps braquial',g:'e',tag:'Bíceps'},
     {id:'braquial',name:'Braquial',g:'e'},
     {id:'braquiorradial',name:'Braquiorradial',g:'e',tag:'Braquiorradial'},
     {id:'trapSup',name:'Trapézio · porção superior',g:'n'},
     {id:'trapInf',name:'Trapézio · porção inferior',g:'n'},
     {id:'eretor',name:'Eretor da espinha (estabilizador)',g:'n'},
     {id:'manguito',name:'Manguito rotador (estabilizador)',g:'n'},
     {id:'reto',name:'Reto abdominal (estabilizador)',g:'n'},
     {id:'obliquos',name:'Oblíquos (estabilizadores)',g:'n'},
    ],
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'elbow',label:'Flexão do cotovelo'},{id:'knee',label:'Flexão do joelho'},{id:'trunk',label:'Tronco × vertical'}],
    views:{lateral:{pos:V(.5,1.05,2.75),tgt:V(.5,.85,0)},frontal:{pos:V(2.5,1.75,0),tgt:V(.3,.95,0)},anatomia:{pos:V(-1.75,1.55,.75),tgt:V(.05,1.0,0)}},
    portrait:1.75, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>O equipamento</h2><dl class="params">
          <dt>Banco</dt><dd>Assento baixo e comprido, de frente para a polia.</dd>
          <dt>Apoios dos pés</dt><dd>Duas plataformas inclinadas para firmar os pés.</dd>
          <dt>Polia baixa</dt><dd>Roldana na altura dos pés. O cabo sai dela em linha reta até o puxador.</dd>
          <dt>Cabo de aço</dt><dd>Passa pelas roldanas da torre e liga o puxador às placas. Fica sempre esticado.</dd>
          <dt>Torre de pesos</dt><dd>Pilha de placas que sobe na puxada e desce no retorno.</dd>
          <dt>Pino seletor</dt><dd>Escolhe a carga: as placas acima dele sobem juntas.</dd>
          <dt>Puxador triangular</dt><dd>Duas alças paralelas, pegada neutra com as palmas uma de frente para a outra.</dd>
          <dt>Mosquetão</dt><dd>Gancho que prende o puxador ao cabo.</dd></dl>
          <p class="small" style="margin:10px 0 0">Ligue <b>Peças da máquina</b> abaixo da cena para ver os nomes no 3D.</p></section>
          <section class="card"><h2>Posição inicial</h2><dl class="params">
          <dt>Tronco</dt><dd>Quase vertical, coluna neutra, peito naturalmente elevado, abdômen firme e cabeça alinhada.</dd>
          <dt>Glúteos</dt><dd>Apoiados no banco durante toda a série.</dd>
          <dt>Pés</dt><dd>Inteiros nos apoios, afastados na largura do quadril.</dd>
          <dt>Joelhos 15–30°</dt><dd>Levemente flexionados, nunca travados.</dd>
          <dt>Braços</dt><dd>Estendidos à frente, cotovelos quase retos e sem travar.</dd>
          <dt>Punhos</dt><dd>Retos, alinhados com os antebraços. Palmas uma de frente para a outra.</dd>
          <dt>Escápulas</dt><dd>Começam levemente à frente (protração natural), ombros longe das orelhas.</dd>
          <dt>Final da puxada</dt><dd>Puxador no abdômen, cotovelos com 80–110° de flexão, a 10–30° do tronco, escápulas juntas.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde). A linha azul nas costas mostra as escápulas abrindo e fechando.</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='brusco'&&rep)?pJerk(x):pBase(x);
      let p=fp(tr);
      if(err==='amplitude')p=(1-amt)*p+amt*(.22+.33*p);
      const v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      /* escápulas: retraem cedo na puxada e só voltam depois que os cotovelos começam a estender */
      let r=v>=0?Math.min(1,p*1.45):Math.pow(p,.6);
      if(err==='amplitude')r*=1-.6*amt;
      if(err==='excessiva')r=Math.min(1,r+.15*amt);
      const J=solveRow({p,r,err,amt});
      const cdir=PUL.clone().sub(J.C).normalize();
      J.cdir=cdir;S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;J.r=r;return J;},
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Concêntrica · puxada',cue:'Escápulas se aproximam e os cotovelos vão para trás junto ao tronco.'};
      if(J.v<-.05)return {kind:'ecc',label:'Excêntrica · retorno',cue:'Braços avançam sob controle e as escápulas voltam à frente.'};
      if(J.p>.5)return {kind:'hold',label:'Posição final',cue:'Puxador no abdômen, escápulas juntas, ombros baixos.'};
      return {kind:'hold',label:'Posição inicial',cue:'Braços estendidos sem travar, tronco firme e quase vertical.'};},
    update(J,t,ph){
      /* puxador alinhado ao cabo */
      const f=J.cdir, upv=YUP.clone().addScaledVector(f,-f.y).normalize();
      vbar.position.copy(J.C);vbar.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f,upv,new THREE.Vector3().crossVectors(f,upv)));
      const tip=sum(J.C,1,f,VB_TIP);
      seg(cable[0],tip,sum(PUL,1,YUP,.045,XAX,-.01));
      /* pilha: sobe o quanto o cabo é puxado */
      const lift=Math.max(0,.025+J.C.distanceTo(PUL)-cableLen0);
      plates.forEach((pl,i)=>{pl.position.y=pl.userData.y0+(i>=selIdx?lift:0);});
      const topY=plates[topIdx].position.y+PL_T/2;
      cap.position.set(STACK_X,topY+.0175,0);
      seg(cable[4],sum(P4,1,XAX,.045),V(STACK_X,topY+.035,0));
      seg(selRod,V(STACK_X,topY,0),V(STACK_X,plates[selIdx].position.y-.02,0));
      pin.position.set(STACK_X-.10,plates[selIdx].position.y,0);
      /* setas e linhas */
      arrow.visible=Math.abs(J.v)>.05;
      if(arrow.visible){arrow.position.copy(J.C.clone().add(V(0,.11,.24)));arrow.setDirection(J.v>0?J.n.clone().negate():J.n.clone());arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const R=J.side[0], Lf=J.side[1];
      const back=J.n.clone().multiplyScalar(-.11), dn=J.u.clone().multiplyScalar(-.07);
      const a=R.Sj.clone().add(back).add(dn).addScaledVector(ZAX,-.07), b=Lf.Sj.clone().add(back).add(dn).addScaledVector(ZAX,.07);
      scapLine.geometry.setFromPoints([a,b]);
      [a,b].forEach((q,i)=>scapTicks[i].geometry.setFromPoints([q.clone().addScaledVector(J.u,-.04),q.clone().addScaledVector(J.u,.04)]));
      arc(elbowArc,R.E,R.Sj,R.H,V(0,0,.07));
      arc(kneeArc,R.K,R.hip,R.A,V(0,0,.09));
      const elbF=180-kneeAngle(R.Sj,R.E,R.H), kneeF=180-kneeAngle(R.hip,R.K,R.A);
      let es='';if(J.p>.95)es=(elbF>=78&&elbF<=112)?'ok':'warn';else if(J.p<.03)es=elbF<4?'warn':(elbF<=30?'ok':'');
      const ks=kneeF<8?'warn':(kneeF>=12&&kneeF<=32?'ok':'');
      const ts=Math.abs(J.lean)<=10?'ok':'warn';
      return {elbow:{v:Math.round(elbF)+'°',s:es},knee:{v:Math.round(kneeF)+'°',s:ks},trunk:{v:(J.lean>0?'+':'')+Math.round(J.lean)+'°',s:ts}};
    },
    viewChanged(v){const see=v==='frontal';statics.visible=v==='lateral';
      ghostables.forEach(m=>{m.material=see?ghostMat:m.userData.mat;m.castShadow=!see;});
      cable.slice(1).forEach(c=>c.visible=!see);selRod.visible=!see;
      kneeArc.visible=elbowArc.visible=v!=='anatomia';},
  };
})();

// #region: ex-stf
/* ====================================================================================
   EXERCÍCIO 4 — STIFF COM HALTERES
   ==================================================================================== */
const STF=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const FOOTZ=.11, HANDZ=.215;
  const ankle=s=>V(0,.085,FOOTZ*s);
  /* halteres sextavados emborrachados */
  const rubber=new THREE.MeshStandardMaterial({color:0x26282c,roughness:.85,metalness:0});
  const DUMB=[];
  for(let i=0;i<2;i++){const g=new THREE.Group();
    const hd=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.15,12),mats.chrome);hd.castShadow=true;g.add(hd);
    [-1,1].forEach(k=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.068,.068,.055,6),rubber);p.position.y=k*.1;p.castShadow=true;g.add(p);
      const c=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,.012,14),mats.chrome);c.position.y=k*.066;g.add(c);});
    grp.add(g);DUMB.push(g);}

  const KEYS=[
   {t:0,  title:'Posição inicial',d:'Em pé, halteres ao lado das coxas, coluna neutra e joelhos levemente flexionados.'},
   {t:.9, title:'Início da descida',d:'O quadril começa a ir para trás e o tronco começa a inclinar.',ph:'ecc'},
   {t:1.8,title:'Inclinação intermediária',d:'A flexão do quadril aumenta; joelhos estáveis e halteres perto das pernas.',ph:'ecc'},
   {t:2.55,title:'Descida avançada',d:'Tronco mais inclinado, halteres abaixo dos joelhos, posteriores da coxa alongando.',ph:'ecc'},
   {t:3.3,title:'Ponto máximo da descida',d:'Maior flexão controlável do quadril, halteres perto do meio das canelas, coluna neutra.'},
   {t:4.1,title:'Início da subida',d:'O quadril começa a estender e o tronco volta em direção à vertical.',ph:'conc'},
   {t:4.8,title:'Subida intermediária',d:'A pelve vai para a frente e os halteres sobem rente às pernas.',ph:'conc'},
   {t:5.4,title:'Aproximação da posição inicial',d:'Quadril quase estendido e tronco quase vertical.',ph:'conc'},
   {t:5.8,title:'Posição inicial recuperada',d:'Em pé, quadril neutro, joelhos levemente flexionados, sem jogar o quadril à frente.'},
  ];
  const T_END=6.0;
  const pBase=t=>t<.3?0:t<3.3?ease((t-.3)/3):t<3.8?1:t<5.8?1-ease((t-3.8)/2):0;
  function pJerk(t){if(t<.3)return 0;if(t<1.2){const s=(t-.3)/.9;return Math.min(1.06,1.06*s*s*(3-2*s)+.0);} if(t<1.45)return 1.06-.12*ease((t-1.2)/.25);
    if(t<2.05){const s=(t-1.45)/.6;return .94*(1-s*s*(3-2*s));}return 0;}
  const ERR={
    arredondar:{name:'Arredondamento da coluna',fix:'Coluna neutra do início ao fim: peito aberto e o movimento sai do quadril.'},
    joelhos:{name:'Flexão excessiva dos joelhos',fix:'Joelhos com 5–15° de flexão, quase sem mudar. Não vira agachamento.'},
    afastados:{name:'Halteres afastados das pernas',fix:'Halteres descem e sobem rente às coxas e canelas.'},
    alem:{name:'Descida além do controlável',fix:'Pare perto do meio da canela, antes de a coluna ou a pelve perderem a posição.'},
    hiper:{name:'Hiperextensão lombar na subida',fix:'Termine em pé com o quadril neutro, sem jogar o tronco para trás.'},
    cotovelos:{name:'Flexão dos cotovelos',fix:'Braços estendidos o tempo todo; os halteres só acompanham o tronco.'},
    brusco:{name:'Movimento brusco',fix:'Cerca de 3 s descendo, pausa curta e 2 s subindo, sem impulso.'},
    pes:{name:'Perda do apoio dos pés',fix:'Pés inteiros no chão, com o peso no meio do pé e nos calcanhares.'},
  };
  let errMode=null;

  function solveStiff(st){
    const {p,err,amt,tr}=st;
    const bones=new Array(NB);
    /* pernas: inclinação da canela (α) e da coxa (θ) em relação à vertical, positivo = para a frente */
    let al=4-8*p, th=-2-11*p, lean=80*p, head=0, scapF=0, reachCut=0, handFwd=0, heel=0;
    if(err==='arredondar'){th=-5-13*p*(1-.55*amt);lean+=amt*8*p;head=amt*24*p;scapF=amt*p;}
    if(err==='joelhos'){al+=amt*20*p;th-=amt*20*p;lean-=amt*16*p;}
    if(err==='afastados')handFwd=amt;
    if(err==='alem'){lean+=amt*22*sstep(.6,1,p);head=amt*20*sstep(.6,1,p);scapF=amt*sstep(.6,1,p);}
    if(err==='hiper'&&tr>3.8)lean-=amt*15*sstep(.4,0,p);
    if(err==='cotovelos')reachCut=amt*.22*Math.sin(Math.PI*Math.min(1,p*1.1));
    if(err==='pes')heel=amt*sstep(.2,.9,p)*16*DEG;
    /* pé: calcanhar sobe girando em volta da base dos dedos */
    const feet=[1,-1].map(s=>{let A=ankle(s);const toe=V(1,0,.14*s).normalize();let qF=alignQ(YUP,ZAX,YUP,toe);
      if(heel>0){const ball=sum(A,1,YUP,-.075,toe,.14);const ax=new THREE.Vector3().crossVectors(YUP,toe).normalize();
        let q=new THREE.Quaternion().setFromAxisAngle(ax,heel);let An=A.clone().sub(ball).applyQuaternion(q).add(ball);
        if(An.y<A.y){q=new THREE.Quaternion().setFromAxisAngle(ax,-heel);An=A.clone().sub(ball).applyQuaternion(q).add(ball);}A=An;qF=q.multiply(qF);}
      return {A,qF};});
    const Ac=feet[0].A.clone().add(feet[1].A).multiplyScalar(.5);Ac.z=0;
    const K=sum(Ac,1,V(Math.sin(al*DEG),Math.cos(al*DEG),0),LEN.sn);
    const P=sum(K,1,V(Math.sin(th*DEG),Math.cos(th*DEG),0),LEN.th*.998);
    const a=lean*DEG;
    const u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,-head*DEG);
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const Sj=mapT(L('Sj',m)).add(sum(n,.03*scapF,u,-.02*scapF));
      /* braços pendurados; mãos puxadas para perto das pernas */
      const reach=.632-reachCut;
      const tgt=Math.min(Sj.x,.12), hx=tgt+(Sj.x+.04-tgt)*handFwd;
      const dz=HANDZ*s-Sj.z, dx=hx-Sj.x;
      const dy=Math.sqrt(Math.max(.01,reach*reach-dx*dx-dz*dz));
      const H=V(hx,Sj.y-dy,HANDZ*s);
      const pole=sum(XAX,-1,ZAX,.35*s,YUP,reachCut>0?.2:0);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,pole,ZAX.clone().multiplyScalar(-s));
      const hip=mapT(L('Hip',m));
      const Kk=legBones(bones,qT,s,hip,feet[i].A,sum(XAX,1,ZAX,.12*s),feet[i].qF);
      side.push({s,m,Sj,E,H,hip,K:Kk,A:feet[i].A,qFT});
    });
    return {u,n,P,side,bones,lean};
  }

  /* --- Guias --- */
  const vz=.42;
  lineIn(statics,[V(.04,0,vz),V(.04,1.95,vz)]);                  /* linha vertical de referência sobre o meio do pé */
  const dPath=[];for(let k=0;k<=24;k++){const J=solveStiff({p:k/24,err:null,amt:0,tr:0});dPath.push(J.side[0].H.clone().add(V(0,0,.13)));}
  lineIn(statics,dPath);
  const arrowD=new THREE.ArrowHelper(YUP,V(0,0,0),.14,0xffffff,.05,.04);guides.add(arrowD);
  const arrowH=new THREE.ArrowHelper(XAX,V(0,0,0),.16,0xffffff,.055,.04);guides.add(arrowH);
  const mkArc=()=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(l);return l;};
  const kneeArc=mkArc(), hipArc=mkArc(), trunkArc=mkArc();
  const trunkRef=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);guides.add(trunkRef);
  function arc(line,c,a,b,off,r=.1){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=solveStiff({p:0,err:null,amt:0,tr:0});
  const GT=[
    {label:'Tronco',text:()=>`Tronco ${Math.round(S.lean)}°`,pos:()=>S.P.clone().add(V(.06,.30,.30)),views:['lateral']},
  ];
  const PARTS=[
    {label:'Halter sextavado',pos:()=>DUMB[0].position.clone().add(V(0,.06,.12))},
    {label:'Pegada metálica',pos:()=>DUMB[0].position.clone().add(V(0,-.06,.10))},
  ];

  return {
    id:'stiff', title:'Stiff com Halteres 3D',
    eyebrow:'Treino · Posteriores da coxa e glúteos', h1:'Stiff com halteres',
    specs:'<span>Joelhos <b>5–15°</b></span><span>Halteres até <b>meio da canela</b></span><span>Descida <b>~3 s</b></span><span>Subida <b>~2 s</b></span>',
    groups:{p:{label:'Principais',col:'--red'},s:{label:'Auxiliar',col:'--orange'},e:{label:'Estabilizadores',col:'--yellow'}},
    strongE:true,
    muscles:[
     {id:'bicepsFem',name:'Isquiotibiais · bíceps femoral',g:'p',tag:'Bíceps femoral'},
     {id:'semitend',name:'Isquiotibiais · semitendíneo',g:'p',tag:'Semitendíneo'},
     {id:'semimemb',name:'Isquiotibiais · semimembranáceo',g:'p'},
     {id:'gluteos',name:'Glúteo máximo',g:'p',tag:'Glúteo máximo'},
     {id:'adutor',name:'Adutor magno',g:'s',tag:'Adutor magno'},
     {id:'eretor',name:'Eretor da espinha',g:'e',tag:'Eretor da espinha'},
     {id:'gluteoMed',name:'Glúteo médio',g:'e'},
     {id:'trapezio',name:'Trapézio',g:'e'},
     {id:'flexAnte',name:'Flexores dos dedos e do antebraço',g:'e'},
    ],
    /* posteriores: fortes alongando na descida; glúteo máximo ganha destaque na subida */
    muscleTarget(m,kind){
      const ham=['bicepsFem','semitend','semimemb'].includes(m.id), glu=m.id==='gluteos';
      if(kind==='ecc')return ham?.85:glu?.5:null;
      if(kind==='conc')return ham?.9:glu?1:null;
      return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'knee',label:'Flexão do joelho'},{id:'hip',label:'Flexão do quadril'},{id:'trunk',label:'Tronco × vertical'}],
    views:{lateral:{pos:V(.1,1.05,3.25),tgt:V(.05,.93,0)},frontal:{pos:V(2.6,1.25,0),tgt:V(0,.8,0)},anatomia:{pos:V(-1.75,1.35,1.25),tgt:V(-.05,.72,0)}},
    portrait:1.6, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>Os halteres</h2><dl class="params">
          <dt>Dois halteres</dt><dd>Independentes e de mesmo peso, um em cada mão.</dd>
          <dt>Sextavados</dt><dd>Cabeças de borracha em seis faces, que não rolam no chão.</dd>
          <dt>Pegada central</dt><dd>Barra metálica no meio, segurada com a mão inteira.</dd>
          <dt>Sem apoio</dt><dd>Não usa barra, máquina, polia nem banco.</dd></dl></section>
          <section class="card"><h2>Posição e dobradiça do quadril</h2><dl class="params">
          <dt>Pés</dt><dd>Na largura do quadril, paralelos ou um pouco para fora, inteiros no chão.</dd>
          <dt>Joelhos 5–15°</dt><dd>Levemente flexionados e quase sem mudar durante a repetição.</dd>
          <dt>Quadril</dt><dd>É ele que move: vai para trás na descida e volta para a frente na subida.</dd>
          <dt>Coluna</dt><dd>Neutra, abdômen firme, cabeça alinhada. O tronco inclina inteiro, sem curvar.</dd>
          <dt>Braços</dt><dd>Estendidos, palmas voltadas para as pernas, halteres rentes às coxas e canelas.</dd>
          <dt>Amplitude</dt><dd>Até sentir os posteriores alongando, com os halteres perto do meio da canela. Não precisa encostar no chão.</dd>
          <dt>Final</dt><dd>Em pé com o quadril neutro, sem jogar o tronco para trás.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde). Use a vista lateral e a linha vertical como referência.</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='brusco'&&rep)?pJerk(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solveStiff({p:Math.min(p,1.06),err,amt,tr});
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    phase(J){
      if(J.v>.05)return {kind:'ecc',label:'Excêntrica · descida',cue:'Quadril vai para trás; os posteriores da coxa alongam sob controle.'};
      if(J.v<-.05)return {kind:'conc',label:'Concêntrica · subida',cue:'Glúteos e posteriores estendem o quadril e trazem o tronco de volta.'};
      if(J.p>.5)return {kind:'hold',label:'Ponto mais baixo',cue:'Coluna neutra, halteres perto do meio da canela.'};
      return {kind:'hold',label:'Posição inicial',cue:'Em pé, joelhos destravados, quadril neutro.'};},
    update(J,t,ph){
      J.side.forEach((sd,i)=>{DUMB[i].position.copy(sd.H);DUMB[i].quaternion.setFromUnitVectors(YUP,ZAX.clone().applyQuaternion(sd.qFT));});
      const R=J.side[0];
      const mov=Math.abs(J.v)>.05&&statics.visible;
      arrowD.visible=arrowH.visible=mov;
      if(mov){const c=lin(ph.kind==='conc'?COL.conc:COL.accent);
        arrowD.position.copy(R.H.clone().add(V(.09,0,.13)));arrowD.setDirection(J.v>0?YUP.clone().negate():YUP);arrowD.setColor(c);
        arrowH.position.copy(J.P.clone().add(V(J.v>0?-.08:-.24,0,.30)));arrowH.setDirection(J.v>0?XAX.clone().negate():XAX);arrowH.setColor(c);}
      const thigh=R.K.clone().sub(R.hip), shin=R.A.clone().sub(R.K);
      arc(kneeArc,R.K,thigh.clone().negate(),shin,V(0,0,.1));
      arc(hipArc,R.hip,J.u,thigh,V(0,0,.12),.12);
      arc(trunkArc,J.P,YUP,J.u,V(0,0,.30),.22);
      trunkRef.geometry.setFromPoints([J.P.clone().add(V(0,0,.30)),J.P.clone().add(V(0,.3,.30))]);
      const kneeF=180-kneeAngle(R.hip,R.K,R.A), hipF=J.u.angleTo(thigh.clone().negate())/DEG, hipFlex=hipF;
      const ks=kneeF<3?'warn':kneeF<=17?'ok':'warn';
      let ts='';if(J.p<.05)ts=J.lean<-4?'warn':'ok';else if(J.p>.95)ts=J.lean>92?'warn':'ok';
      return {knee:{v:Math.round(kneeF)+'°',s:ks},hip:{v:Math.round(hipFlex)+'°',s:''},trunk:{v:Math.round(J.lean)+'°',s:ts}};
    },
    viewChanged(v){statics.visible=v==='lateral';trunkArc.visible=trunkRef.visible=hipArc.visible=v==='lateral';},
  };
})();

// #region: ex-lat
/* ====================================================================================
   EXERCÍCIO 5 — ELEVAÇÃO LATERAL COM HALTERES
   ==================================================================================== */
const LAT=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const FOOTZ=.13, SCAP=25*DEG, TH0=8, TH1=77;
  const rubber=new THREE.MeshStandardMaterial({color:0x26282c,roughness:.85,metalness:0});
  const DUMB=[];
  for(let i=0;i<2;i++){const g=new THREE.Group();
    const hd=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.13,12),mats.chrome);hd.castShadow=true;g.add(hd);
    [-1,1].forEach(k=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.052,.052,.045,6),rubber);p.position.y=k*.085;p.castShadow=true;g.add(p);
      const c=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.01,14),mats.chrome);c.position.y=k*.058;g.add(c);});
    grp.add(g);DUMB.push(g);}
  /* direção lateral no plano escapular (25° à frente do plano frontal) */
  const Ldir=s=>V(Math.sin(SCAP),0,Math.cos(SCAP)*s);
  const W_REST=[1,-1].map(m=>L('E',m).lerp(L('G',m),.82));
  const wristQ=[1,-1].map(m=>a=>new THREE.Quaternion().setFromAxisAngle(ZAX,-m*a));

  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Em pé, halteres ao lado das coxas, cotovelos levemente flexionados, tronco estável.'},
   {t:.7,  title:'Início da elevação',d:'Os braços começam a se afastar do tronco para os lados.',ph:'conc'},
   {t:.95, title:'Elevação inicial',d:'Braços a cerca de 25–35° do tronco.',ph:'conc'},
   {t:1.26,title:'Elevação intermediária',d:'Braços a cerca de 45°, cotovelos acompanhando a trajetória.',ph:'conc'},
   {t:2.3, title:'Posição máxima',d:'Braços perto da horizontal (80–90°), cotovelos na altura dos ombros ou um pouco acima das mãos.'},
   {t:3.1, title:'Início da descida',d:'Os braços começam a voltar em direção às laterais do corpo.',ph:'ecc'},
   {t:4.3, title:'Descida intermediária',d:'Braços a cerca de 45°, descendo com controle.',ph:'ecc'},
   {t:5.3, title:'Aproximação da posição inicial',d:'Braços perto do tronco e halteres perto das coxas.',ph:'ecc'},
   {t:5.8, title:'Posição inicial recuperada',d:'Braços ao lado do corpo, cotovelos levemente flexionados, tronco estável.'},
  ];
  KEYS[3].t=1.35;
  const T_END=6.0;
  const pBase=t=>t<.3?0:t<2.3?ease((t-.3)/2):t<2.8?1:t<5.8?1-ease((t-2.8)/3):0;
  const pDrop=t=>t<.3?0:t<2.3?ease((t-.3)/2):t<2.8?1:t<3.5?1-Math.pow((t-2.8)/.7,2):t<3.7?.05*Math.sin(Math.PI*(t-3.5)/.2):0;
  const ERR={
    encolher:{name:'Encolhimento exagerado dos ombros',fix:'Ombros longe das orelhas; quem sobe é o braço, não o ombro.'},
    balanco:{name:'Balanço do tronco',fix:'Tronco parado. Se precisar de impulso, a carga está pesada demais.'},
    excessiva:{name:'Elevação excessiva dos braços',fix:'Pare perto da horizontal, com os braços a 80–90°.'},
    rotacao:{name:'Rotação interna exagerada',fix:'Palmas para baixo no topo, sem virar o polegar para o chão.'},
    cotovelos:{name:'Flexão excessiva dos cotovelos',fix:'Cotovelos só levemente flexionados (15–30°) e sem mudar durante a repetição.'},
    punhos:{name:'Punhos desalinhados',fix:'Punho reto, alinhado com o antebraço do início ao fim.'},
    descida:{name:'Descida descontrolada',fix:'Cerca de 3 s descendo, resistindo ao peso.'},
    assimetria:{name:'Assimetria dos braços',fix:'Os dois braços sobem e descem juntos, na mesma altura.'},
  };
  let errMode=null;

  function solveLat(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let lean=0, side=0, shrug=0, thMax=TH1, elb=20, rot=0, lag=0;
    if(err==='balanco')lean=amt*(8*Math.sin(Math.PI*Math.min(1,p*1.6))-9*sstep(.6,1,p));
    if(err==='encolher')shrug=amt*.055;
    if(err==='excessiva')thMax=TH1+amt*38;
    if(err==='rotacao')rot=amt*62*DEG;
    if(err==='cotovelos')elb=20+amt*55*Math.sin(Math.PI*Math.min(1,p*1.05))*.9+amt*10;
    if(err==='assimetria')lag=amt;
    /* pernas em pé */
    const feet=[1,-1].map(s=>({A:V(0,.085,FOOTZ*s),qF:alignQ(YUP,ZAX,YUP,V(1,0,.12*s).normalize())}));
    const K=V(.389*Math.sin(3*DEG),.085+LEN.sn*Math.cos(3*DEG),0);
    const P=sum(K,1,V(Math.sin(-3*DEG),Math.cos(-3*DEG),0),LEN.th*.998);
    const a=lean*DEG;
    const u=V(-Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),Math.sin(a),0);
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,0);
    const sides=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const pp=s<0&&lag?p*(1-.32*lag):p;
      const th=(TH0+(thMax-TH0)*pp)*DEG, thN=Math.min(1,(th/DEG)/90);
      /* rotação superior da escápula: o ombro sobe um pouco e se desloca para o lado */
      const L0=Ldir(s);
      const scapUp=.022*Math.pow(thN,1.3)+shrug*sstep(.05,.6,pp)+(s<0&&lag?-.012*lag:0);
      const Sj=mapT(L('Sj',m)).add(sum(YUP,scapUp,L0,.008*thN));
      const ad=sum(YUP,-Math.cos(th),L0,Math.sin(th)).normalize();
      const reach=Math.sqrt(LEN.ua**2+LEN.fa**2-2*LEN.ua*LEN.fa*Math.cos((180-elb)*DEG));
      const H=sum(Sj,1,ad,reach);
      const pole=sum(XAX,-Math.cos(th)*1.0,YUP,Math.sin(th)*1.0,L0,.15);
      let palm=sum(L0,-Math.cos(th),YUP,-Math.sin(th)).normalize();
      if(rot>0)palm=palm.multiplyScalar(Math.cos(rot*Math.sin(th))).addScaledVector(XAX,-Math.sin(rot*Math.sin(th))).normalize();
      const {E,qFT}=armBones(bones,qT,s,Sj,H,pole,palm);
      const hip=mapT(L('Hip',m));
      const Kk=legBones(bones,qT,s,hip,feet[i].A,sum(XAX,1,ZAX,.12*s),feet[i].qF);
      sides.push({s,m,Sj,E,H,hip,K:Kk,A:feet[i].A,qFT,th:th/DEG,thN});
    });
    return {u,n,P,side:sides,bones,lean};
  }

  /* --- Guias --- */
  const ref=solveLat({p:1,err:null,amt:0});
  const shY=ref.side[0].Sj.y;
  lineIn(statics,[V(.12,shY,-1.05),V(.12,shY,1.05)]);                                  /* horizontal na altura dos ombros */
  [1,-1].forEach(s=>{const o=V(0,.004,0);lineIn(statics,[o,sum(o,1,Ldir(s),.85)]);      /* plano escapular no chão */
    lineIn(statics,[o,V(0,.004,.85*s)]);
    const arc=[];for(let a=0;a<=25;a+=2.5)arc.push(V(Math.sin(a*DEG)*.6,.004,Math.cos(a*DEG)*.6*s));lineIn(statics,arc);});
  const trajs=[0,1].map(i=>{const pts=[];for(let k=0;k<=24;k++)pts.push(solveLat({p:k/24,err:null,amt:0}).side[i].H.clone());return lineIn(statics,pts);});
  const arrows=[0,1].map(()=>{const a=new THREE.ArrowHelper(YUP,V(0,0,0),.13,0xffffff,.05,.038);guides.add(a);return a;});
  const prevH=[V(0,0,0),V(0,0,0)];
  const mkArc=()=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(l);return l;};
  const abdArc=mkArc(), elbArc=mkArc();
  const scapLines=[0,1].map(()=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);guides.add(l);return l;});
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=solveLat({p:0,err:null,amt:0}), curView='frontal', wristA=0;
  const GT=[
    {label:'Abdução',text:()=>`Abdução ${Math.round(S.abd||0)}°`,pos:()=>S.side[0].Sj.clone().add(V(.10,.20,.22)),views:['frontal']},
    {label:'Altura dos ombros',pos:()=>V(.12,shY+.035,-.82),views:['frontal']},
    {label:'Plano escapular ~25°',pos:()=>sum(V(0,.004,0),1,Ldir(1),.72),views:['frontal']},
  ];
  const PARTS=[
    {label:'Halter sextavado',pos:()=>DUMB[0].position.clone().add(V(0,.08,0))},
    {label:'Manopla metálica',pos:()=>DUMB[0].position.clone().add(V(.06,-.07,0))},
  ];
  const tmpM=new THREE.Matrix4(), tq=new THREE.Quaternion(), tsx=new THREE.Vector3();

  return {
    id:'elevacao', title:'Elevação Lateral 3D',
    eyebrow:'Treino · Ombros', h1:'Elevação lateral com halteres',
    specs:'<span>Plano escapular <b>~25°</b></span><span>Até <b>80–90°</b></span><span>Subida <b>~2 s</b></span><span>Descida <b>~3 s</b></span>',
    groups:{p:{label:'Principal',col:'--red'},s:{label:'Secundários',col:'--orange'},e:{label:'Estabilizadores · trapézio e serrátil',col:'--yellow'},b:{label:'Estabilizadores · manguito rotador',col:'--sky'}},
    strongE:true, defaultView:'frontal',
    muscles:[
     {id:'deltLat',name:'Deltoide lateral',g:'p',tag:'Deltoide lateral'},
     {id:'deltAnt',name:'Deltoide anterior',g:'s',tag:'Deltoide anterior'},
     {id:'deltPost',name:'Deltoide posterior',g:'s',tag:'Deltoide posterior'},
     {id:'supra',name:'Supraespinal',g:'s',tag:'Supraespinal'},
     {id:'trapSup',name:'Trapézio superior',g:'e',tag:'Trapézio superior'},
     {id:'trapInf',name:'Trapézio inferior',g:'e'},
     {id:'serratil',name:'Serrátil anterior',g:'e',tag:'Serrátil anterior'},
     {id:'manguito',name:'Infraespinal e redondo menor',g:'b',tag:'Infraespinal'},
     {id:'subesc',name:'Subescapular (na face interna da escápula, não aparece)',g:'b'},
    ],
    muscleTarget(m,kind){if(m.id==='deltLat')return kind==='conc'?1:kind==='ecc'?.8:kind==='hold'?.75:.3;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'abd',label:'Abdução do ombro'},{id:'elbow',label:'Flexão do cotovelo'},{id:'trunk',label:'Tronco'}],
    views:{frontal:{pos:V(2.75,1.45,0),tgt:V(0,1.12,0)},lateral:{pos:V(.15,1.3,2.9),tgt:V(0,1.12,0)},anatomia:{pos:V(-1.5,1.75,1.75),tgt:V(0,1.22,0)}},
    portrait:1.55, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>Os halteres</h2><dl class="params">
          <dt>Dois halteres</dt><dd>Independentes e de mesmo peso. Na elevação lateral a carga costuma ser leve.</dd>
          <dt>Sextavados</dt><dd>Cabeças de borracha em seis faces.</dd>
          <dt>Manopla central</dt><dd>Metálica, segurada com a mão inteira e o punho reto.</dd></dl></section>
          <section class="card"><h2>Posição e trajetória</h2><dl class="params">
          <dt>Pés</dt><dd>Na largura do quadril ou dos ombros, inteiros no chão.</dd>
          <dt>Joelhos 5–15°</dt><dd>Levemente flexionados.</dd>
          <dt>Tronco</dt><dd>Ereto, coluna neutra, abdômen firme, sem inclinar para os lados nem balançar.</dd>
          <dt>Cotovelos 15–30°</dt><dd>Levemente flexionados e com o mesmo ângulo durante toda a repetição.</dd>
          <dt>Punhos</dt><dd>Neutros, alinhados com o antebraço. Palmas para dentro no início e para baixo no topo.</dd>
          <dt>Plano escapular</dt><dd>Braços sobem cerca de 25° à frente da linha dos ombros, não exatamente para o lado.</dd>
          <dt>Amplitude</dt><dd>De 0° até perto da horizontal (80–90°).</dd>
          <dt>Escápulas</dt><dd>Giram para cima naturalmente enquanto o braço sobe, sem encolher os ombros.</dd></dl>
          <p class="small" style="margin:10px 0 0">Na vista Anatomia, as linhas azuis nas costas mostram a rotação das escápulas.</p></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='descida'&&rep)?pDrop(x):pBase(x);
      const p=Math.max(0,fp(tr)), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solveLat({p,err,amt});
      wristA=err==='punhos'?amt*(.15+.85*sstep(.05,.5,p))*38*DEG:0;
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    /* punho: dobra a mão em volta do punho (antebraço distal + mão) */
    postBones(BM){
      if(wristA<=0)return;
      [1,-1].forEach((m,k)=>{const w=W_REST[k];const piv=new THREE.Matrix4().makeTranslation(w.x,w.y,w.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(wristQ[k](wristA))).multiply(new THREE.Matrix4().makeTranslation(-w.x,-w.y,-w.z));
        BM[bi('ft',m)].multiply(piv);BM[bi('fing',m)].multiply(piv);});
    },
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Concêntrica · subida',cue:'Deltoide lateral eleva o braço; a escápula gira para cima junto.'};
      if(J.v<-.05)return {kind:'ecc',label:'Excêntrica · descida',cue:'Desça devagar, resistindo ao peso, sem deixar o braço cair.'};
      if(J.p>.5)return {kind:'hold',label:'Topo',cue:'Braços perto da horizontal, ombros baixos, punhos retos.'};
      return {kind:'hold',label:'Posição inicial',cue:'Braços ao lado do corpo, cotovelos levemente flexionados.'};},
    update(J,t,ph){
      /* halteres seguem a mão (inclui o punho dobrado no erro) */
      J.side.forEach((sd,i)=>{const m=sd.m;const B=BM[bi('ft',m)];
        DUMB[i].position.copy(L('G',m)).applyMatrix4(B);
        B.decompose(tsx,tq,new THREE.Vector3());DUMB[i].quaternion.setFromUnitVectors(YUP,ZAX.clone().applyQuaternion(tq));});
      const R=J.side[0];
      const abd=R.E.clone().sub(R.Sj).angleTo(J.u.clone().negate())/DEG;J.abd=abd;
      const elbF=180-kneeAngle(R.Sj,R.E,R.H);
      J.side.forEach((sd,i)=>{const a=arrows[i];const vel=DUMB[i].position.clone().sub(prevH[i]);prevH[i].copy(DUMB[i].position);
        const mov=Math.abs(J.v)>.05&&vel.lengthSq()>1e-9;a.visible=mov;
        if(mov){a.position.copy(DUMB[i].position.clone().add(V(.08,0,0)));a.setDirection(vel.normalize());a.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}});
      const off=curView==='lateral'?V(0,0,.1):V(.1,0,0);
      arc(abdArc,R.Sj,J.u.clone().negate(),R.E.clone().sub(R.Sj),off,.16);
      arc(elbArc,R.E,R.Sj.clone().sub(R.E),R.H.clone().sub(R.E),off,.08);
      /* escápulas: borda medial gira (ângulo inferior vai para fora) conforme o braço sobe */
      J.side.forEach((sd,i)=>{const s=sd.s;const r=sd.th/3*DEG;
        const c=sum(J.P,1,J.u,.40,J.n,-.135,ZAX,.085*s,YUP,.012*sd.thN);
        const dir=sum(YUP,-Math.cos(r),ZAX,s*Math.sin(r));
        scapLines[i].geometry.setFromPoints([c.clone().addScaledVector(dir,-.075),c.clone().addScaledVector(dir,.085)]);});
      const elevSh=(R.Sj.y-shY);
      const as=J.p>.95?(abd>=75&&abd<=98?'ok':'warn'):'';
      const es=(elbF>=12&&elbF<=34)?'ok':'warn';
      const ts=Math.abs(J.lean)<=3?'ok':'warn';
      return {abd:{v:Math.round(abd)+'°',s:as},elbow:{v:Math.round(elbF)+'°',s:es},trunk:{v:Math.abs(J.lean)<1?'estável':(J.lean>0?'+':'')+Math.round(J.lean)+'°',s:ts}};
    },
    viewChanged(v){curView=v;statics.visible=v!=='anatomia';scapLines.forEach(l=>l.visible=v==='anatomia');elbArc.visible=abdArc.visible=v!=='anatomia';},
  };
})();

// #region: ex-tri
/* ====================================================================================
   EXERCÍCIO 6 — TRÍCEPS NA POLIA ALTA COM CORDA
   ==================================================================================== */
const TRI=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const FOOTZ=.12, LEAN0=11;
  const P1=V(.52,2.18,0), P2=V(.955,2.18,0), STACK_X=1.0, PL_T=.045, PL_GAP=.004, NPL=14, PL_Y0=.13, SEL=5;
  const STRAND=.27;
  /* --- Estação de polia --- */
  const tower=new THREE.Group();grp.add(tower);
  [-1,1].forEach(k=>{railIn(tower,V(.78,.04,k*.27),V(.78,2.3,k*.27),.035,mats.frame);railIn(tower,V(1.22,.04,k*.27),V(1.22,2.3,k*.27),.035,mats.frame);
    railIn(tower,V(.78,2.3,k*.27),V(1.22,2.3,k*.27),.03,mats.frame);railIn(tower,V(.70,.035,k*.27),V(1.30,.035,k*.27),.04,mats.frame);
    railIn(tower,V(STACK_X,.10,k*.15),V(STACK_X,2.08,k*.15),.012,mats.chrome);});
  railIn(tower,V(.78,2.3,-.27),V(.78,2.3,.27),.03,mats.frame);railIn(tower,V(1.22,2.3,-.27),V(1.22,2.3,.27),.03,mats.frame);
  railIn(tower,V(.78,.035,-.27),V(.78,.035,.27),.035,mats.frame);
  railIn(tower,V(.45,2.27,0),V(1.22,2.27,0),.04,mats.frame);                                  /* braço da polia alta */
  railIn(tower,V(.62,2.27,0),V(.78,2.05,0),.025,mats.frame);
  const shroud=meshIn(tower,new THREE.BoxGeometry(.02,1.6,.5),mats.frame);shroud.position.set(1.26,1.0,0);
  [P1,P2].forEach(p=>{const w=meshIn(tower,new THREE.CylinderGeometry(.045,.045,.03,24),mats.steel);w.rotation.x=Math.PI/2;w.position.copy(p);
    const b=meshIn(tower,new THREE.BoxGeometry(.06,.07,.05),mats.frame);b.position.copy(p).add(V(0,.06,0));});
  const plates=[];
  for(let i=0;i<NPL;i++){const pl=meshIn(tower,new THREE.BoxGeometry(.24,PL_T,.42),mats.plate);const y=PL_Y0+i*(PL_T+PL_GAP)+PL_T/2;pl.position.set(STACK_X,y,0);pl.userData.y0=y;plates.push(pl);}
  const selIdx=NPL-SEL;
  const selRod=meshIn(tower,new THREE.CylinderGeometry(.009,.009,1,10),mats.chrome);
  const pin=new THREE.Group();tower.add(pin);
  { const sh=meshIn(pin,new THREE.CylinderGeometry(.007,.007,.16,10),mats.chrome);sh.rotation.z=Math.PI/2;sh.position.x=-.03;
    const kn=meshIn(pin,new THREE.SphereGeometry(.018,14,10),mats.lock);kn.position.x=-.12; }
  const cap=meshIn(tower,new THREE.BoxGeometry(.10,.035,.10),mats.steel);
  const cableMat=new THREE.MeshStandardMaterial({color:0x2b2f34,roughness:.5,metalness:.4});
  const cable=[0,1,2].map(()=>meshIn(grp,new THREE.CylinderGeometry(.0045,.0045,1,6),cableMat,false));
  seg(cable[1],sum(P1,1,YUP,.045),sum(P2,1,YUP,.045));
  /* corda de tríceps: duas pontas ligadas ao mesmo ponto central, terminais emborrachados */
  const ropeMat=new THREE.MeshStandardMaterial({color:0x1d2024,roughness:.9});
  const endMat=new THREE.MeshStandardMaterial({color:0x111214,roughness:.7});
  const strands=[0,1].map(()=>meshIn(grp,new THREE.CylinderGeometry(.011,.011,1,10),ropeMat));
  const ends=[0,1].map(()=>{const e=meshIn(grp,new THREE.CylinderGeometry(.024,.02,.045,16),endMat);return e;});
  const sleeve=meshIn(grp,new THREE.CylinderGeometry(.016,.016,.05,12),mats.steel);
  const crab=meshIn(grp,new THREE.TorusGeometry(.02,.0045,8,20),mats.lock);crab.scale.set(1,1.5,1);

  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Cotovelos com ~90° de flexão, mãos na altura da parte de baixo do peito, braços junto ao tronco, corda esticada.'},
   {t:.88, title:'Início da extensão',d:'Os antebraços começam a descer: cotovelos passam de ~90° para ~70° de flexão.',ph:'conc'},
   {t:1.12,title:'Extensão intermediária',d:'Cotovelos com ~45–55° de flexão, antebraços inclinados para baixo, ombros e tronco parados.',ph:'conc'},
   {t:1.48,title:'Aproximação da extensão completa',d:'Cotovelos com ~15–25° de flexão, mãos perto das coxas, pontas da corda começando a se afastar.',ph:'conc'},
   {t:1.9, title:'Contração final',d:'Cotovelos quase estendidos (0–10° de flexão), mãos ao lado das coxas, pontas da corda separadas.'},
   {t:2.6, title:'Início do retorno',d:'Flexão controlada dos cotovelos: a corda começa a subir e as mãos se aproximam.',ph:'ecc'},
   {t:3.3, title:'Retorno intermediário',d:'Cotovelos com ~40–55° de flexão, antebraços subindo com controle.',ph:'ecc'},
   {t:3.7, title:'Aproximação da posição inicial',d:'Cotovelos com ~65–80° de flexão, mãos voltando à parte de baixo do peito.',ph:'ecc'},
   {t:4.3, title:'Posição inicial recuperada',d:'Cotovelos de novo a ~90°, corda no lugar, postura igual ao frame 1. Repetição completa.'},
  ];
  const T_END=4.6;
  const pBase=t=>t<.4?0:t<1.9?ease((t-.4)/1.5):t<2.3?1:t<4.3?1-ease((t-2.3)/2):0;
  const pDrop=t=>t<.4?0:t<1.9?ease((t-.4)/1.5):t<2.3?1:t<2.75?1-Math.pow((t-2.3)/.45,2)*1.08:t<3.0?-.08+.08*ease((t-2.75)/.25):0;
  const ERR={
    frente:{name:'Cotovelos indo para a frente',fix:'Braços colados nas laterais do tronco; só o antebraço se move.'},
    abertos:{name:'Cotovelos abertos para os lados',fix:'Cotovelos junto às costelas, apontando para trás.'},
    ombros:{name:'Ombros encolhidos',fix:'Ombros baixos e para trás, longe das orelhas.'},
    balanco:{name:'Tronco balançando',fix:'Tronco firme, só levemente inclinado. Quem empurra é o tríceps.'},
    quadril:{name:'Flexão excessiva do quadril',fix:'Inclinação pequena do tronco (5–15°), sem dobrar o quadril para empurrar.'},
    punhos:{name:'Punhos dobrados',fix:'Punhos retos, alinhados com os antebraços.'},
    travar:{name:'Hiperextensão dos cotovelos',fix:'Pare a extensão com 0–10° de flexão, sem forçar a trava.'},
    retorno:{name:'Retorno descontrolado',fix:'Deixe a corda subir devagar, em cerca de 2 s, resistindo ao peso.'},
  };
  let errMode=null, wristA=0;
  const W_REST=[1,-1].map(m=>L('E',m).lerp(L('G',m),.82));

  function solveTri(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let lean=LEAN0, fwd=13, flare=0, shrug=0, flexEnd=5;
    if(err==='frente')fwd=13+amt*30*Math.sin(Math.PI*Math.min(1,p*1.1))+amt*6;
    if(err==='abertos')flare=amt;
    if(err==='ombros')shrug=amt*.05;
    if(err==='balanco')lean=LEAN0+amt*(14*Math.sin(Math.PI*Math.min(1,p*1.25))-6*(1-p));
    if(err==='quadril')lean=LEAN0+amt*30;
    if(err==='travar')flexEnd=5-amt*13;
    const flex=(90-(90-flexEnd)*p);
    const a=lean*DEG;
    const u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    /* pernas em pé: quadril recua um pouco quando o tronco inclina */
    const feet=[1,-1].map(s=>({A:V(0,.085,FOOTZ*s),qF:alignQ(YUP,ZAX,YUP,V(1,0,.12*s).normalize())}));
    const thA=-3-.28*(lean-LEAN0);
    const K=V(LEN.sn*Math.sin(3*DEG),.085+LEN.sn*Math.cos(3*DEG),0);
    const P=sum(K,1,V(Math.sin(thA*DEG),Math.cos(thA*DEG),0),LEN.th*.998);
    const mapT=torsoBones(bones,qT,P,-3*DEG);
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const Sj=mapT(L('Sj',m)).add(sum(YUP,shrug,n,-.008));
      /* braço: quase paralelo ao tronco, cotovelo junto às costelas */
      const fa=fwd*DEG;
      const dU=sum(u,-Math.cos(fa),n,Math.sin(fa),ZAX,s*(.07+.75*flare)).normalize();
      const E=sum(Sj,1,dU,LEN.ua);
      const perp=n.clone().addScaledVector(dU,-n.dot(dU)).normalize();
      const fr=flex*DEG;
      /* mãos juntas em cima, afastando para os lados das coxas no fim */
      const handZ=.065+.15*sstep(.55,1,p)+(flare?amt*.05:0);
      let dF=sum(dU,Math.cos(fr),perp,Math.sin(fr)).normalize();
      const Hpre=sum(E,1,dF,LEN.fa);
      const dz=handZ*s-Hpre.z;
      dF=sum(dF,1,ZAX,dz/LEN.fa,n,.12*sstep(.4,1,p)).normalize();
      const H=sum(E,1,dF,LEN.fa);
      const pole=sum(E,1,Sj.clone().lerp(H,.5),-1).normalize();
      const {E:E2,qFT}=armBones(bones,qT,s,Sj,H,pole,ZAX.clone().multiplyScalar(-s).addScaledVector(n,-.15*sstep(.6,1,p)).normalize());
      const hip=mapT(L('Hip',m));
      const Kk=legBones(bones,qT,s,hip,feet[i].A,sum(XAX,1,ZAX,.12*s),feet[i].qF);
      side.push({s,m,Sj,E:E2,H,hip,K:Kk,A:feet[i].A,qFT,dU});
    });
    return {u,n,P,side,bones,lean,flex};
  }
  const ref=solveTri({p:0,err:null,amt:0});
  const ropeC=Jr=>{const M=Jr.side[0].H.clone().add(Jr.side[1].H).multiplyScalar(.5);const d=P1.clone().sub(M).normalize();
    const w=Jr.side[0].H.distanceTo(Jr.side[1].H)/2;return sum(M,1,d,Math.sqrt(Math.max(.002,STRAND*STRAND-w*w)));};
  const L0=ropeC(ref).distanceTo(P1);

  /* --- Guias --- */
  const handPath=[];for(let k=0;k<=24;k++)handPath.push(solveTri({p:k/24,err:null,amt:0}).side[0].H.clone().add(V(0,0,.16)));
  lineIn(statics,handPath);
  const refLine=lineIn(statics,[V(0,0,0),V(0,0,0)]);                 /* linha do braço (deve ficar parada) */
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.13,0xffffff,.05,.038);guides.add(arrow);
  const elbArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(elbArc);
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=ref, prevH=V(0,0,0);
  const GT=[
    {label:'Cotovelo',text:()=>`Cotovelo ${Math.round(S.flex)}°`,pos:()=>S.side[0].E.clone().add(V(.10,-.04,.16)),views:['lateral','detalhe']},
  ];
  const PARTS=[
    {label:'Polia alta',pos:()=>P1.clone().add(V(0,.10,0))},
    {label:'Cabo de aço',pos:()=>S.C.clone().lerp(P1,.55).add(V(.02,0,.02))},
    {label:'Mosquetão',pos:()=>S.C.clone().add(V(.04,.03,0))},
    {label:'Corda de tríceps',pos:()=>S.side[0].H.clone().lerp(S.C,.5).add(V(.03,0,.05))},
    {label:'Pegador emborrachado',pos:()=>S.ends[0].clone().add(V(0,-.03,.04))},
    {label:'Torre de pesos',pos:()=>V(1.0,1.5,.27)},
    {label:'Pino seletor',pos:()=>pin.position.clone().add(V(-.12,0,0))},
  ];
  const ghostMat=new THREE.MeshStandardMaterial({color:0x8a939e,transparent:true,opacity:.16,depthWrite:false,roughness:.6});
  const ghostables=[];tower.traverse(o=>{if(o.isMesh){o.userData.mat=o.material;ghostables.push(o);}});

  return {
    id:'triceps', title:'Tríceps na Polia 3D',
    eyebrow:'Treino · Tríceps', h1:'Tríceps na polia alta com corda',
    specs:'<span>Cotovelos <b>90° → 0–10°</b></span><span>Pegada <b>neutra</b></span><span>Braços <b>parados</b></span>',
    groups:{p:{label:'Tríceps · cabeça longa',col:'--red'},s:{label:'Tríceps · cabeça lateral',col:'--orange'},e:{label:'Tríceps · cabeça medial',col:'--yellow'},
      b:{label:'Auxiliar da extensão',col:'--sky'},d:{label:'Deltoide e estabilizadores do ombro',col:'--blue'},n:{label:'Antebraço e tronco (estabilizam)',col:'--muted'}},
    strongE:true,
    muscles:[
     {id:'tricLong',name:'Tríceps braquial — cabeça longa',g:'p',tag:'Cabeça longa'},
     {id:'tricLat',name:'Tríceps braquial — cabeça lateral',g:'s',tag:'Cabeça lateral'},
     {id:'tricMed',name:'Tríceps braquial — cabeça medial',g:'e',tag:'Cabeça medial'},
     {id:'anconeo',name:'Ancôneo — músculo auxiliar',g:'b',tag:'Ancôneo'},
     {id:'deltPost',name:'Deltoide posterior',g:'d'},{id:'deltLat',name:'Deltoide lateral',g:'d'},{id:'deltAnt',name:'Deltoide anterior',g:'d'},
     {id:'manguito',name:'Manguito rotador',g:'d'},
     {id:'extAnte',name:'Extensores do antebraço',g:'n'},{id:'flexAnte',name:'Flexores do antebraço e dos dedos',g:'n'},
     {id:'reto',name:'Reto abdominal',g:'n'},{id:'obliquos',name:'Oblíquos',g:'n'},{id:'eretor',name:'Eretor da espinha',g:'n'},
    ],
    muscleTarget(m,kind){const tri=['tricLong','tricLat','tricMed'].includes(m.id);
      if(tri)return kind==='conc'?1:kind==='ecc'?.8:kind==='hold'?.8:.45;
      if(m.id==='anconeo')return kind==='conc'?.9:kind==='ecc'?.7:.6;
      if(m.g==='d')return .45;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'elbow',label:'Flexão do cotovelo'},{id:'arm',label:'Braço × vertical'},{id:'trunk',label:'Tronco'}],
    views:{lateral:{pos:V(.32,1.05,3.3),tgt:V(.32,.98,0)},frontal:{pos:V(2.85,1.5,0),tgt:V(.15,1.0,0)},
      anatomia:{pos:V(-1.15,1.45,1.3),tgt:V(.02,1.1,.1)},detalhe:{pos:V(1.0,1.15,1.05),tgt:V(.22,.9,.05)}},
    portrait:1.6, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>O equipamento</h2><dl class="params">
          <dt>Polia alta</dt><dd>Roldana no alto da estação, acima da cabeça.</dd>
          <dt>Torre de pesos</dt><dd>Placas selecionadas pelo pino; sobem quando você empurra a corda.</dd>
          <dt>Cabo de aço</dt><dd>Liga a corda às placas e fica esticado o tempo todo.</dd>
          <dt>Mosquetão</dt><dd>Gancho metálico que prende a corda ao cabo.</dd>
          <dt>Corda de tríceps</dt><dd>Duas pontas independentes saindo do mesmo ponto central, com pegadores emborrachados.</dd></dl>
          <p class="small" style="margin:10px 0 0">Ligue <b>Peças da máquina</b> abaixo da cena para ver os nomes no 3D. A vista <b>Close</b> mostra mãos, punhos, corda e cotovelos.</p></section>
          <section class="card"><h2>Posição inicial</h2><dl class="params">
          <dt>Pés</dt><dd>Na largura do quadril ou dos ombros, de frente para a polia. Um pé um pouco à frente, se ajudar no equilíbrio.</dd>
          <dt>Joelhos 5–15°</dt><dd>Discretamente flexionados.</dd>
          <dt>Tronco 5–15°</dt><dd>Ereto com leve inclinação à frente, coluna neutra, abdômen firme.</dd>
          <dt>Pegada</dt><dd>Uma ponta da corda em cada mão, palmas uma de frente para a outra, punhos retos.</dd>
          <dt>Cotovelos</dt><dd>Junto às laterais das costelas, com ~90° de flexão no início.</dd>
          <dt>Mãos</dt><dd>Na altura da parte de baixo do peito, ou um pouco abaixo.</dd>
          <dt>Movimento</dt><dd>Só o cotovelo estende e flexiona. O braço fica parado; o ombro não ajuda.</dd>
          <dt>Final</dt><dd>0–10° de flexão, pontas da corda afastadas ao lado das coxas, sem travar.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros técnicos</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde). A linha azul ao lado do braço mostra se o braço saiu do lugar.</p><div class="errs" id="errList"></div>
          <p class="small" style="margin:10px 0 0">Também evite trocar a posição dos pés durante a série.</p></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='retorno'&&rep)?pDrop(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solveTri({p,err,amt});
      wristA=err==='punhos'?amt*(.3+.7*sstep(.1,.8,p))*35*DEG:0;
      J.C=ropeC(J);S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    postBones(BM){
      if(wristA<=0)return;
      [1,-1].forEach((m,k)=>{const w=W_REST[k];const q=new THREE.Quaternion().setFromAxisAngle(ZAX,m*wristA);
        const piv=new THREE.Matrix4().makeTranslation(w.x,w.y,w.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-w.x,-w.y,-w.z));
        BM[bi('ft',m)].multiply(piv);BM[bi('fing',m)].multiply(piv);});
    },
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Extensão do cotovelo · concêntrica',cue:'As três cabeças do tríceps estendem o cotovelo. Braços parados.'};
      if(J.v<-.05)return {kind:'ecc',label:'Flexão controlada · excêntrica',cue:'Retorno controlado: o tríceps continua ativo segurando a corda.'};
      if(J.p>.5)return {kind:'hold',label:'Contração final',cue:'Cotovelos quase retos, sem travar; pontas da corda afastadas.'};
      return {kind:'hold',label:'Posição inicial',cue:'Cotovelos a ~90°, junto às costelas; corda esticada.'};},
    update(J,t,ph){
      const tq=new THREE.Quaternion(), tv=new THREE.Vector3();
      const gr=J.side.map(sd=>{const B=BM[bi('ft',sd.m)];const g=L('G',sd.m).applyMatrix4(B);B.decompose(tv,tq,new THREE.Vector3());return {g,ax:ZAX.clone().applyQuaternion(tq)};});
      const C=J.C;
      /* corda: do ponto central passa pela mão e termina no pegador emborrachado logo abaixo */
      const endPts=[];
      gr.forEach((g,i)=>{let ax=g.ax.clone();if(ax.dot(g.g.clone().sub(C))<0)ax.negate();
        const end=sum(g.g,1,ax,.06);endPts.push(end);
        seg(strands[i],C,sum(g.g,1,ax,.035));
        ends[i].position.copy(end);ends[i].quaternion.setFromUnitVectors(YUP,ax);});
      J.ends=endPts;
      const cd=P1.clone().sub(C).normalize();
      sleeve.position.copy(sum(C,1,cd,.02));sleeve.quaternion.setFromUnitVectors(YUP,cd);
      crab.position.copy(sum(C,1,cd,.06));crab.quaternion.setFromUnitVectors(YUP,cd);
      seg(cable[0],sum(C,1,cd,.08),sum(P1,1,XAX,-.045));
      const lift=Math.max(0,.02+C.distanceTo(P1)-L0);
      plates.forEach((pl,i)=>{pl.position.y=pl.userData.y0+(i>=selIdx?lift:0);});
      const topY=plates[NPL-1].position.y+PL_T/2;
      cap.position.set(STACK_X,topY+.0175,0);
      seg(cable[2],sum(P2,1,XAX,.045),V(STACK_X,topY+.035,0));
      seg(selRod,V(STACK_X,topY,0),V(STACK_X,plates[selIdx].position.y-.02,0));
      pin.position.set(STACK_X-.10,plates[selIdx].position.y,0);
      const R=J.side[0];
      const mov=Math.abs(J.v)>.05&&statics.visible;arrow.visible=mov;
      if(mov){arrow.position.copy(R.H.clone().add(V(.06,0,.16)));arrow.setDirection(R.H.clone().sub(prevH).normalize());arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      prevH.copy(R.H);
      refLine.geometry.setFromPoints([R.Sj.clone().add(V(0,0,.14)),R.E.clone().add(V(0,0,.14))]);
      arc(elbArc,R.E,R.Sj.clone().sub(R.E),R.H.clone().sub(R.E),V(0,0,.09),.09);
      const elbF=J.flex;
      const armA=R.E.clone().sub(R.Sj).angleTo(YUP.clone().negate())/DEG;
      let es='';if(J.p>.95)es=elbF<-.5||elbF>12?'warn':'ok';else if(J.p<.03)es=Math.abs(elbF-90)<=12?'ok':'';
      const as=armA<=12?'ok':'warn';
      const ts=(J.lean>=4&&J.lean<=16)?'ok':'warn';
      return {elbow:{v:Math.round(elbF)+'°',s:es},arm:{v:Math.round(armA)+'°',s:as},trunk:{v:Math.round(J.lean)+'° à frente',s:ts}};
    },
    viewChanged(v){const see=v==='frontal';statics.visible=v==='lateral'||v==='detalhe';
      ghostables.forEach(m=>{m.material=see?ghostMat:m.userData.mat;m.castShadow=!see;});
      cable[1].visible=cable[2].visible=selRod.visible=!see;elbArc.visible=v!=='frontal';},
  };
})();

// #region: ex-plk
/* ====================================================================================
   EXERCÍCIO 7 — PRANCHA ABDOMINAL FRONTAL SOBRE ANTEBRAÇOS (isométrico)
   ==================================================================================== */
const PLK=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const SCX=.5, EZ=.19;
  /* colchonete */
  const matMat=new THREE.MeshStandardMaterial({roughness:.95});
  const mat=meshIn(grp,new THREE.BoxGeometry(1.95,.012,.66),matMat);mat.position.set(-.12,.006,0);mat.castShadow=false;
  [-1,1].forEach(k=>{const ed=meshIn(grp,new THREE.BoxGeometry(1.95,.013,.012),mats.frame,false);ed.position.set(-.12,.0065,k*.33);});

  /* poses-chave: altura dos ombros, inclinação do tronco, ângulos da coxa e da perna (graus, positivo = descendo para trás), pés (0 dorso no chão, 1 dedos apoiados), cotovelo à frente do ombro */
  const PK=[
   {t:0,   sh:.14,b:0,   th:8.5, sn:0,   ft:0,ex:.30},
   {t:.4,  sh:.14,b:0,   th:8.5, sn:0,   ft:0,ex:.30},
   {t:1.4, sh:.40,b:35.9,th:8.5, sn:0,   ft:0,ex:0},
   {t:2.4, sh:.40,b:21.9,th:21.9,sn:-3,  ft:0,ex:0},
   {t:3.3, sh:.40,b:14.5,th:14.5,sn:9,   ft:.85,ex:0},
   {t:3.8, sh:.40,b:10.5,th:10.5,sn:10.5,ft:1,ex:0},
   {t:8.6, sh:.40,b:10.5,th:10.5,sn:10.5,ft:1,ex:0},
   {t:9.6, sh:.40,b:21.9,th:21.9,sn:-3,  ft:0,ex:0},
   {t:10.8,sh:.14,b:0,   th:8.5, sn:0,   ft:0,ex:.30},
   {t:11.4,sh:.14,b:0,   th:8.5, sn:0,   ft:0,ex:.30},
  ];
  const T_END=11.4, H0=3.8, H1=8.6;
  function stAt(t){let i=0;while(i<PK.length-2&&t>PK[i+1].t)i++;const a=PK[i],b=PK[i+1];let s=(t-a.t)/(b.t-a.t);s=s<0?0:s>1?1:s;s=s*s*(3-2*s);
    const o={};for(const k of ['sh','b','th','sn','ft','ex'])o[k]=a[k]+(b[k]-a[k])*s;return o;}

  const KEYS=[
   {t:0,   title:'Posição deitada',d:'Deitado de barriga para baixo no colchonete, pronto para começar.'},
   {t:1.4, title:'Posicionamento dos antebraços',d:'Cotovelos na largura dos ombros, flexionados a 90°, antebraços paralelos.'},
   {t:2.2, title:'Preparação do tronco',d:'Abdômen e glúteos contraídos, pelve organizada, coluna estável. Joelhos ainda no chão.'},
   {t:3.0, title:'Elevação dos joelhos',d:'As pernas estendem e os joelhos saem do chão; o peso passa para antebraços e pontas dos pés.'},
   {t:3.8, title:'Posição correta da prancha',d:'Corpo alinhado da cabeça aos calcanhares, cotovelos a ~90° sob os ombros, abdômen e glúteos contraídos.'},
   {t:6.0, title:'Estabilização frontal',d:'Mesma posição. Braços, cotovelos e pés simétricos, sem girar o tronco nem deslocar a pelve. Veja na vista Frontal.'},
   {t:8.0, title:'Sustentação anatômica',d:'Postura igual aos frames 5 e 6. Toque em Anatomia para ver o core e os estabilizadores.'},
   {t:9.6, title:'Retorno controlado',d:'Joelhos dobram e descem até o colchonete; o quadril desce com controle e os antebraços continuam apoiados.'},
   {t:10.8,title:'Posição final',d:'Joelhos no chão e corpo relaxado sobre o colchonete. Fim do exercício.'},
  ];

  const ERR={
    afundado:{name:'Quadril afundado',fix:'Abdômen e glúteos firmes: quadril na linha entre ombros e tornozelos.'},
    alto:{name:'Quadril alto demais',fix:'Desça o quadril até formar uma linha reta da cabeça aos calcanhares.'},
    cabeca:{name:'Cabeça caída',fix:'Cabeça alinhada com a coluna, olhando para o chão logo à frente das mãos.'},
    pescoco:{name:'Pescoço hiperestendido',fix:'Não olhe para a frente; nuca alongada, alinhada ao tronco.'},
    cotovelos:{name:'Cotovelos muito à frente dos ombros',fix:'Cotovelos logo abaixo dos ombros, a cerca de 90°.'},
    torax:{name:'Tórax afundado entre os ombros',fix:'Empurre o chão com os antebraços, afastando o tórax do chão.'},
    joelhos:{name:'Joelhos flexionados na sustentação',fix:'Pernas estendidas, joelhos perto de 0° durante toda a sustentação.'},
    rotacao:{name:'Rotação do quadril',fix:'Quadril nivelado: os dois lados da pelve na mesma altura.'},
  };
  let errMode=null;

  function solvePlank(st,err,amt){
    const bones=new Array(NB);
    const hold=sstep(H0,H0+.6,st.tr)*(1-sstep(H1-.4,H1+.2,st.tr));
    const e=amt*hold;
    let sh=st.sh, b=st.b, head=0, ex=st.ex, sink=0, kneeIn=0, roll=0, hipOff=0;
    if(err==='afundado')hipOff=-.085*e;
    if(err==='alto')hipOff=.13*e;
    if(err==='cabeca')head=-30*e;
    if(err==='pescoco')head=28*e;
    if(err==='cotovelos')ex+=.17*e;
    if(err==='torax'){sink=.045*e;sh-=.03*e;}
    if(err==='joelhos')kneeIn=e;
    if(err==='rotacao')roll=11*e;
    const Sc=V(SCX,sh,0);
    /* posição de referência (correta) do quadril e dos tornozelos */
    const bR=b*DEG, u0=V(Math.cos(bR),Math.sin(bR),0), n0=V(Math.sin(bR),-Math.cos(bR),0);
    const P0=sum(Sc,1,u0,-.46,n0,.01);
    const thD=V(-Math.cos(st.th*DEG),-Math.sin(st.th*DEG),0), snD=V(-Math.cos(st.sn*DEG),-Math.sin(st.sn*DEG),0);
    /* erros de quadril: o quadril sai da linha, tronco e pernas se ajustam (ombros e pés no lugar) */
    let P=P0.clone(), u=u0.clone(), n=n0.clone();
    if(hipOff){const Pt=P0.clone().add(V(0,hipOff,0));u=Sc.clone().sub(Pt).normalize();n=V(u.y,-u.x,0);P=sum(Sc,1,u,-.46,n,.01);}
    let qT=torsoQ(u,n);
    if(roll){const qr=new THREE.Quaternion().setFromAxisAngle(u,roll*DEG);qT=qr.multiply(qT);}
    const mapT=torsoBones(bones,qT,P,head*DEG);
    const side=[];
    [1,-1].forEach(s=>{const m=-s;
      const Sj=mapT(L('Sj',m)).add(sum(n,sink));
      const E0=V(SCX+ex,.045,EZ*s);
      const H=sum(E0,1,XAX,LEN.fa*.96).setY(.035);
      const pole=E0.clone().sub(Sj.clone().lerp(H,.5)).normalize();
      const {E,qFT}=armBones(bones,qT,s,Sj,H,pole,V(0,-1,0));
      /* pernas: posição de referência (cinemática direta) */
      const hip0=sum(P0,1,u0,0,ZAX,.095*s);
      const K0=sum(hip0,1,thD,LEN.th);
      let A=sum(K0,1,snD,LEN.sn);A.z=.11*s;
      const hip=mapT(L('Hip',m));
      if(kneeIn)A=A.clone().add(sum(u0,.035*kneeIn));
      const qFlat=alignQ(YUP,ZAX,V(0,-1,0),snD), qTuck=alignQ(YUP,ZAX,snD.clone().negate(),V(-.12,-1,0).normalize());
      const qF=qFlat.clone().slerp(qTuck,st.ft);
      const K=legBones(bones,qT,s,hip,A,sum(n,1,u,.02*kneeIn),qF);
      side.push({s,m,Sj,E,H,hip,K,A,qFT});
    });
    return {u,n,P,Sc,side,bones,P0,u0};
  }

  /* --- Guias --- */
  const bodyLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0),V(0,0,0)]),mats.guide);statics.add(bodyLine);
  const elbArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(elbArc);
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  /* largura dos apoios (vista superior) */
  lineIn(statics,[V(SCX-.05,.02,-EZ),V(SCX-.05,.02,EZ)]);
  let S=null, holdT=0;
  const GT=[
    {label:'Corpo alinhado',text:()=>S&&S.hold>.5?(Math.abs(S.dev)<=6?'Corpo alinhado':'Fora da linha'):'Linha do corpo',pos:()=>S?S.P.clone().add(V(0,.17,.36)):V(0,0,0),views:['lateral']},
    {label:'Cotovelos ~90°',pos:()=>S?S.side[0].E.clone().add(V(.02,.1,.12)):V(0,0,0),views:['lateral','frontal']},
  ];

  return {
    id:'prancha', title:'Prancha Abdominal 3D',
    eyebrow:'Treino · Core', h1:'Prancha abdominal frontal',
    specs:'<span>Apoio nos <b>antebraços</b></span><span>Cotovelos <b>~90°</b></span><span>Exercício <b>isométrico</b></span>',
    groups:{p:{label:'Core · principais',col:'--red'},e:{label:'Auxiliares e estabilizadores',col:'--blue'}},
    strongE:true,
    muscles:[
     {id:'reto',name:'Reto abdominal',g:'p',col:'--red',tag:'Reto abdominal'},
     {id:'transverso',name:'Transverso do abdômen (profundo, sob os oblíquos)',g:'p',col:'--orange'},
     {id:'obliquos',name:'Oblíquo externo',g:'p',col:'--yellow',tag:'Oblíquo externo'},
     {id:'obliquoInt',name:'Oblíquo interno (profundo, sob o externo)',g:'p',col:'--lightyellow'},
     {id:'multifidos',name:'Multífidos (profundos, junto à coluna lombar)',g:'p',col:'--navy'},
     {id:'eretor',name:'Eretores da espinha',g:'e',col:'--blue',tag:'Eretores da espinha'},
     {id:'gluteos',name:'Glúteo máximo',g:'e',col:'--purple',tag:'Glúteo máximo'},
     {id:'retoFem',name:'Quadríceps · reto femoral',g:'e',col:'--slate'},
     {id:'vastoLat',name:'Quadríceps · vastos',g:'e',col:'--slate'},
     {id:'vastoMed',name:'Quadríceps · vasto medial',g:'e',col:'--slate'},
     {id:'serratil',name:'Serrátil anterior',g:'e',col:'--green',tag:'Serrátil anterior'},
     {id:'deltAnt',name:'Deltoide',g:'e',col:'--sky',tag:'Deltoide'},
     {id:'deltLat',name:'Deltoide · porção lateral',g:'e',col:'--sky'},
     {id:'manguito',name:'Estabilizadores do ombro (manguito rotador)',g:'e',col:'--sky'},
    ],
    muscleTarget(m,kind){if(kind==='iso')return m.g==='p'?1:.8;if(kind==='prep')return m.g==='p'?.45:.35;return .15;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, guideTags:GT,
    readouts:[{id:'elbow',label:'Cotovelo'},{id:'line',label:'Ombro–quadril–tornozelo'},{id:'hold',label:'Sustentação'}],
    views:{lateral:{pos:V(-.05,.6,2.45),tgt:V(-.05,.3,0)},frontal:{pos:V(2.2,.65,0),tgt:V(.1,.25,0)},
      superior:{pos:V(-.05,2.9,.02),tgt:V(-.05,.1,0)},anatomia:{pos:V(.15,.32,1.05),tgt:V(.05,.24,0)}},
    portrait:1.75, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>Equipamento</h2><dl class="params">
          <dt>Colchonete</dt><dd>Tapete de academia sobre piso plano e antiderrapante. Nenhum outro equipamento.</dd></dl></section>
          <section class="card"><h2>Posição correta</h2><dl class="params">
          <dt>Antebraços</dt><dd>Apoiados e paralelos, mãos no chão com punhos neutros.</dd>
          <dt>Cotovelos ~90°</dt><dd>Na largura dos ombros, logo abaixo deles (ombros sobre os cotovelos ou um pouco à frente).</dd>
          <dt>Braços</dt><dd>Quase perpendiculares ao chão. Empurre o chão sem afundar o tórax.</dd>
          <dt>Pernas</dt><dd>Estendidas, joelhos perto de 0°, pés na largura do quadril sobre as pontas.</dd>
          <dt>Linha do corpo</dt><dd>Cabeça, ombros, quadril, joelhos e tornozelos praticamente em linha reta.</dd>
          <dt>Coluna</dt><dd>Neutra, com as curvas naturais; pelve estável, levemente encaixada.</dd>
          <dt>Cabeça</dt><dd>Alinhada à coluna, olhando para o chão.</dd>
          <dt>Abdômen e glúteos</dt><dd>Contraídos durante toda a sustentação.</dd>
          <dt>Respiração</dt><dd>Contínua e controlada. Não prenda o ar.</dd></dl>
          <p class="small" style="margin:10px 0 0">É isométrico: o corpo entra na posição, fica parado e sai com controle. Não é para subir e descer o quadril.</p></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz a prancha com o erro (vermelho) e depois a corrigida (verde). Na vista Lateral, a linha azul mostra o alinhamento.</p><div class="errs" id="errList"></div>
          <p class="small" style="margin:10px 0 0">Também evite ombros encolhidos, pés deslizando, prender a respiração e subir e descer o quadril repetidamente.</p></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const st=stAt(tr);st.tr=tr;
      const J=solvePlank(st,err,amt);
      J.tr=tr;J.p=0;J.v=0;J.active=true;J.err=err;J.rep=rep;J.hold=sstep(H0-.1,H0,tr)*(1-sstep(H1,H1+.1,tr));
      const R=J.side,Am=R[0].A.clone().add(R[1].A).multiplyScalar(.5);Am.z=0;
      const Pc=J.P.clone();Pc.z=0;const Scc=J.Sc.clone();
      const v1=Scc.clone().sub(Pc), v2=Pc.clone().sub(Am);
      const dev=v1.angleTo(v2)/DEG, sgn=(v2.x*v1.y-v2.y*v1.x)>0?-1:1;
      J.dev=dev*sgn;J.Am=Am;S=J;return J;},
    phase(J){const t=J.tr;
      if(t<.4)return {kind:'rest',label:'Preparação',cue:'Deitado de barriga para baixo.'};
      if(t<H0)return {kind:'prep',label:'Entrada na posição',cue:'Antebraços no lugar, abdômen e glúteos firmes, depois estenda as pernas.'};
      if(t<H1)return {kind:'iso',label:'Sustentação isométrica',cue:'Corpo alinhado, abdômen e glúteos contraídos, respiração contínua.'};
      if(t<10.8)return {kind:'prep',label:'Retorno controlado',cue:'Joelhos ao chão primeiro, depois o quadril desce devagar.'};
      return {kind:'rest',label:'Posição final',cue:'Corpo relaxado sobre o colchonete.'};},
    update(J,t,ph){
      const R=J.side[0];
      const head=sum(J.Sc,1,J.u,.25);
      bodyLine.geometry.setFromPoints([head.clone().setZ(.36),J.P.clone().setZ(.36),J.Am.clone().setZ(.36)]);
      arc(elbArc,R.E,R.Sj.clone().sub(R.E),R.H.clone().sub(R.E),V(0,0,.07),.09);
      const elbF=180-kneeAngle(R.Sj,R.E,R.H);
      const kneeF=180-kneeAngle(R.hip,R.K,R.A);
      if(J.tr<H0)holdT=0;
      const hs=Math.max(0,Math.min(J.tr,H1)-H0);
      const iso=ph.kind==='iso';
      const ls=iso?(Math.abs(J.dev)<=6&&kneeF<12?'ok':'warn'):'';
      const lineTxt=iso||J.hold>0?(kneeF>=12?'joelhos dobrados':Math.abs(J.dev)<=6?'alinhado':(J.dev>0?'quadril alto':'quadril baixo')):'–';
      const es=iso?(elbF>=80&&elbF<=100?'ok':'warn'):'';
      return {elbow:{v:Math.round(elbF)+'°',s:es},line:{v:lineTxt,s:ls},hold:{v:(hs).toFixed(1).replace('.',',')+' s',s:iso?'ok':''}};
    },
    viewChanged(v){statics.visible=v==='lateral'||v==='superior';},
    themeChanged(){matMat.color.copy(lin(css('--mat')));},
  };
})();

// #region: ex-gob
/* ====================================================================================
   EXERCÍCIO 8 — AGACHAMENTO GOBLET COM HALTER
   ==================================================================================== */
const GOB=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const FOOTZ=.17, TOE=15*DEG;
  const toeDir=s=>V(Math.cos(TOE),0,Math.sin(TOE)*s);
  /* halter único, segurado na vertical pela cabeça de cima */
  const rubber=new THREE.MeshStandardMaterial({color:0x26282c,roughness:.85,metalness:0});
  const DB=new THREE.Group();grp.add(DB);
  { const hd=meshIn(DB,new THREE.CylinderGeometry(.017,.017,.2,12),mats.chrome);
    [-1,1].forEach(k=>{const p=meshIn(DB,new THREE.CylinderGeometry(.085,.085,.07,6),rubber);p.position.y=k*.125;
      const c=meshIn(DB,new THREE.CylinderGeometry(.026,.026,.012,14),mats.chrome);c.position.y=k*.085;}); }

  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Em pé, pés na largura dos ombros com as pontas 10–20° para fora, halter vertical junto ao peito, cotovelos para baixo.'},
   {t:.9,  title:'Início da descida',d:'Quadris e joelhos começam a flexionar; o quadril desce e vai um pouco para trás. Calcanhares no chão.',ph:'ecc'},
   {t:1.5, title:'Descida intermediária',d:'Joelhos com ~45–65° de flexão, tronco com inclinação moderada, halter junto ao peito.',ph:'ecc'},
   {t:2.0, title:'Aproximação da posição inferior',d:'Joelhos com ~75–95° de flexão, quadril descendo entre as pernas, tíbias avançando.',ph:'ecc'},
   {t:2.9, title:'Posição inferior',d:'Joelhos com ~110° de flexão, coxas perto da paralela, calcanhares no chão, joelhos na linha dos pés. Pausa curta.'},
   {t:3.6, title:'Início da subida',d:'Empurre o chão com o pé inteiro: quadris e joelhos começam a estender juntos.',ph:'conc'},
   {t:4.4, title:'Subida intermediária',d:'Joelhos com ~45–65° de flexão, quadril subindo e tronco voltando à vertical.',ph:'conc'},
   {t:4.95,title:'Aproximação da posição inicial',d:'Joelhos com ~10–25° de flexão, quadril quase estendido, abdômen firme.',ph:'conc'},
   {t:5.4, title:'Posição final',d:'Em pé, quadris e joelhos estendidos sem hiperextensão. Repetição completa.'},
  ];
  const T_END=5.6, DOWN0=.4, DOWN1=2.9, UP0=3.4, UP1=5.4;
  const pBase=t=>t<DOWN0?0:t<DOWN1?ease((t-DOWN0)/2.5):t<UP0?1:t<UP1?1-ease((t-UP0)/2):0;
  function pJerk(t){if(t<.4)return 0;if(t<1.2){const s=(t-.4)/.8;return 1.05*s*s;}if(t<1.4)return 1.05-.15*ease((t-1.2)/.2);
    if(t<1.6)return .9+.08*ease((t-1.4)/.2);if(t<2.5)return .98*(1-ease((t-1.6)/.9));return 0;}
  const ERR={
    valgo:{name:'Joelhos colapsando para dentro',fix:'Joelhos apontam na mesma direção das pontas dos pés, na descida e na subida.'},
    calcanhar:{name:'Calcanhares levantando',fix:'Pé inteiro no chão; o peso fica no meio do pé e no calcanhar.'},
    inclinacao:{name:'Inclinação exagerada do tronco',fix:'Peito aberto e tronco só moderadamente inclinado; o halter ajuda a manter o tronco em pé.'},
    lombar:{name:'Coluna lombar arredondando',fix:'Desça só até onde a coluna continua neutra, sem a pelve "virar" no fundo.'},
    halter:{name:'Halter afastado do peito',fix:'Halter colado no esterno durante toda a repetição.'},
    cotovelos:{name:'Cotovelos muito abertos',fix:'Cotovelos para baixo, perto do tronco.'},
    quadril:{name:'Quadril subindo antes do tronco',fix:'Quadril e tronco sobem juntos, empurrando o chão com o pé inteiro.'},
    hiper:{name:'Hiperextensão dos joelhos no final',fix:'Termine em pé com os joelhos estendidos, sem empurrá-los para trás.'},
    brusco:{name:'Movimento brusco',fix:'Desça em cerca de 2,5 s, pausa curta e suba em cerca de 2 s, sem quicar.'},
  };
  let errMode=null;

  function solveGob(st){
    const {p,err,amt,asc}=st;
    const bones=new Array(NB);
    let pk=p, extraLean=0, head=0, dbOut=0, flare=0, heel=0, valg=0, hyp=0;
    if(err==='quadril'&&asc){pk=Math.pow(p,1.9);extraLean=amt*28*(p-pk)/.4;}
    if(err==='inclinacao')extraLean+=amt*24*p;
    if(err==='lombar'){extraLean+=amt*10*sstep(.6,1,p);head=amt*22*sstep(.6,1,p);}
    if(err==='halter')dbOut=amt*sstep(0,.5,p);
    if(err==='cotovelos')flare=amt;
    if(err==='calcanhar')heel=amt*sstep(.3,1,p)*20*DEG;
    if(err==='valgo')valg=amt*sstep(.2,.9,p);
    if(err==='hiper')hyp=amt*(1-sstep(0,.25,p));
    const al=(2+28*pk-5*hyp)*DEG, th=-(2+78*pk-5*hyp)*DEG, lean=5+30*p+extraLean;
    const feet=[1,-1].map(s=>{let A=V(0,.085,FOOTZ*s);const td=toeDir(s);let qF=alignQ(YUP,ZAX,YUP,td);
      if(heel>0){const ball=sum(A,1,YUP,-.075,td,.14);const ax=new THREE.Vector3().crossVectors(YUP,td).normalize();
        let q=new THREE.Quaternion().setFromAxisAngle(ax,heel);let An=A.clone().sub(ball).applyQuaternion(q).add(ball);
        if(An.y<A.y){q=new THREE.Quaternion().setFromAxisAngle(ax,-heel);An=A.clone().sub(ball).applyQuaternion(q).add(ball);}A=An;qF=q.multiply(qF);}
      return {A,qF,td};});
    /* pelve por cinemática direta no plano sagital (canela inclina à frente, coxa vai para trás) */
    const ay=(feet[0].A.y+feet[1].A.y)/2, axx=(feet[0].A.x+feet[1].A.x)/2;
    const sag=Math.cos(TOE*.6);
    const K2=V(axx+LEN.sn*Math.sin(al)*sag,ay+LEN.sn*Math.cos(al),0);
    const P=V(K2.x+LEN.th*Math.sin(th)*sag,K2.y+LEN.th*Math.cos(th)*.995,0);
    const a=lean*DEG;
    const u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,-head*DEG);
    /* halter junto ao esterno, eixo quase vertical */
    const dAx=YUP.clone().lerp(u,.45).normalize();
    const C=sum(P,1,u,.32,n,.175+.16*dbOut);
    const top=sum(C,1,dAx,.125);
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const Sj=mapT(L('Sj',m));
      const H=sum(top,1,dAx,-.06,ZAX,.05*s,n,.01);
      const pole=sum(u,-1,n,.5,ZAX,s*(.25+2.2*flare));
      const palm=sum(dAx,1,ZAX,-.6*s).normalize();
      const {E,qFT}=armBones(bones,qT,s,Sj,H,pole,palm);
      const hip=mapT(L('Hip',m));
      const td=feet[i].td;
      const kp=sum(td,1,ZAX,-s*1.3*valg,YUP,.05);
      const K=legBones(bones,qT,s,hip,feet[i].A,kp,feet[i].qF);
      side.push({s,m,Sj,E,H,hip,K,A:feet[i].A,qFT});
    });
    return {u,n,P,side,bones,lean,C,dAx,al:al/DEG,thd:th/DEG};
  }

  /* --- Guias --- */
  const vz=.48;const latOnly=new THREE.Group();statics.add(latOnly);
  lineIn(latOnly,[V(.05,0,vz),V(.05,1.85,vz)]);                     /* vertical sobre o meio do pé */
  [1,-1].forEach(s=>{const A=V(0,.003,FOOTZ*s);lineIn(statics,[A,sum(A,1,toeDir(s),.45)]);});   /* direção dos pés */
  const hipPath=[];for(let k=0;k<=24;k++){const J=solveGob({p:k/24,err:null,amt:0});hipPath.push(J.P.clone().add(V(0,0,vz)));}
  lineIn(latOnly,hipPath);
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.15,0xffffff,.055,.04);guides.add(arrow);
  const mkArc=()=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(l);return l;};
  const kneeArc=mkArc(), hipArc=mkArc(), ankArc=mkArc();
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=solveGob({p:0,err:null,amt:0});
  const GT=[
    {label:'Tronco',text:()=>`Tronco ${Math.round(S.lean)}°`,pos:()=>S.P.clone().add(sum(S.u,.55,ZAX,.3)),views:['lateral']},
  ];
  const PARTS=[{label:'Halter (cabeça de cima nas mãos)',pos:()=>S.C.clone().add(V(.08,.18,0))},{label:'Empunhadura central',pos:()=>S.C.clone().add(V(.1,-.02,.05))}];

  return {
    id:'goblet', title:'Agachamento Goblet 3D',
    eyebrow:'Treino · Quadríceps e glúteos', h1:'Agachamento goblet com halter',
    specs:'<span>Pés <b>largura dos ombros</b>, 10–20° para fora</span><span>Joelhos até <b>~110°</b></span><span>Halter <b>no peito</b></span>',
    groups:{p:{label:'Principais',col:'--red'},e:{label:'Estabilizadores e auxiliares',col:'--blue'},n:{label:'Também trabalham',col:'--muted'}},
    strongE:true,
    muscles:[
     {id:'retoFem',name:'Quadríceps · reto femoral',g:'p',col:'--red',tag:'Quadríceps'},
     {id:'vastoLat',name:'Quadríceps · vasto lateral',g:'p',col:'--red'},
     {id:'vastoMed',name:'Quadríceps · vasto medial',g:'p',col:'--red'},
     {id:'vastoInt',name:'Quadríceps · vasto intermédio (profundo)',g:'p',col:'--red'},
     {id:'gluteos',name:'Glúteo máximo',g:'p',col:'--orange',tag:'Glúteo máximo'},
     {id:'adutor',name:'Adutor magno',g:'p',col:'--yellow',tag:'Adutor magno'},
     {id:'gluteoMed',name:'Glúteo médio (e mínimo, por baixo dele)',g:'e',col:'--green',tag:'Glúteo médio'},
     {id:'bicepsFem',name:'Isquiotibiais · bíceps femoral',g:'e',col:'--blue'},
     {id:'semitend',name:'Isquiotibiais · semitendíneo',g:'e',col:'--blue'},
     {id:'semimemb',name:'Isquiotibiais · semimembranáceo',g:'e',col:'--blue'},
     {id:'eretor',name:'Eretores da espinha',g:'e',col:'--navy',tag:'Eretores'},
     {id:'reto',name:'Reto abdominal',g:'e',col:'--purple',tag:'Core'},
     {id:'obliquos',name:'Oblíquos (e transverso, profundo)',g:'e',col:'--purple'},
     {id:'gastro',name:'Gastrocnêmio',g:'e',col:'--slate'},
     {id:'soleo',name:'Sóleo',g:'e',col:'--slate'},
     {id:'trapezio',name:'Trapézio',g:'e',col:'--sky'},
     {id:'latissimo',name:'Latíssimo do dorso',g:'e',col:'--sky'},
     {id:'romboides',name:'Romboides',g:'n'},
     {id:'flexAnte',name:'Flexores dos dedos e antebraço',g:'n'},
    ],
    muscleTarget(m,kind){if(m.g==='p')return kind==='conc'?1:kind==='ecc'?.75:kind==='hold'?.6:.3;if(m.g==='e')return .4;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'knee',label:'Flexão do joelho'},{id:'hip',label:'Flexão do quadril'},{id:'ankle',label:'Dorsiflexão'}],
    views:{lateral:{pos:V(0,1.0,3.45),tgt:V(0,.86,0)},frontal:{pos:V(2.9,1.05,0),tgt:V(0,.8,0)},
      diagonal:{pos:V(2.0,1.4,2.0),tgt:V(0,.8,0)},anatomia:{pos:V(-1.8,1.15,1.5),tgt:V(-.05,.68,0)}},
    portrait:1.55, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>Equipamento</h2><dl class="params">
          <dt>Um halter</dt><dd>Duas cabeças e empunhadura central. Segurado na vertical, com as duas mãos por baixo da cabeça de cima.</dd>
          <dt>Piso</dt><dd>Firme, plano e antiderrapante. Tênis de sola estável é opcional.</dd></dl></section>
          <section class="card"><h2>Posição e técnica</h2><dl class="params">
          <dt>Pés</dt><dd>Na largura dos ombros, pontas 10–20° para fora, peso no pé inteiro.</dd>
          <dt>Halter</dt><dd>Junto ao esterno o tempo todo, punhos firmes.</dd>
          <dt>Cotovelos</dt><dd>Flexionados, apontando para baixo e perto do tronco.</dd>
          <dt>Descida</dt><dd>Quadril desce e vai um pouco para trás; joelhos avançam na direção dos pés; calcanhares no chão.</dd>
          <dt>Fundo</dt><dd>Joelhos com ~90–120° de flexão, coxas perto da paralela, quadril entre as pernas.</dd>
          <dt>Tornozelos</dt><dd>Dorsiflexão de ~20–35° no fundo.</dd>
          <dt>Tronco</dt><dd>Inclinação moderada à frente, coluna neutra, abdômen firme.</dd>
          <dt>Subida</dt><dd>Empurre o chão com o pé inteiro; quadril e joelhos estendem juntos até ficar em pé, sem hiperestender.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde). Na vista Frontal, as linhas no chão mostram para onde os joelhos devem apontar.</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='brusco'&&rep)?pJerk(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solveGob({p:Math.min(p,1.05),err,amt,asc:v<-.02});
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    phase(J){
      if(J.v>.05)return {kind:'ecc',label:'Descida controlada · excêntrica',cue:'Flexão de quadril, de joelhos e dorsiflexão do tornozelo, com controle.'};
      if(J.v<-.05)return {kind:'conc',label:'Subida · concêntrica',cue:'Extensão de quadril e de joelhos: quadríceps e glúteos empurram o chão.'};
      if(J.p>.5)return {kind:'hold',label:'Posição inferior',cue:'Calcanhares no chão, joelhos na linha dos pés, halter no peito.'};
      return {kind:'hold',label:'Posição inicial',cue:'Em pé, halter no peito, cotovelos para baixo, abdômen firme.'};},
    update(J,t,ph){
      DB.position.copy(J.C);DB.quaternion.setFromUnitVectors(YUP,J.dAx);
      const R=J.side[0];
      const mov=Math.abs(J.v)>.05&&statics.visible;arrow.visible=mov;
      if(mov){arrow.position.copy(J.P.clone().add(V(-.12,0,vz)));arrow.setDirection(J.v>0?YUP.clone().negate():YUP);arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const thigh=R.K.clone().sub(R.hip), shin=R.A.clone().sub(R.K);
      arc(kneeArc,R.K,thigh.clone().negate(),shin,V(0,0,.1),.1);
      arc(hipArc,R.hip,J.u,thigh,V(0,0,.14),.12);
      arc(ankArc,R.A,YUP,shin.clone().negate(),V(0,0,.08),.13);
      const kneeF=180-kneeAngle(R.hip,R.K,R.A);
      const hipF=J.u.angleTo(thigh.clone().negate())/DEG;
      const dors=shin.clone().negate().angleTo(YUP)/DEG*Math.sign(-shin.x||1);
      const kneeShow=J.err==='hiper'&&J.p<.1?-Math.round(5*(1-sstep(0,.25,J.p))):Math.round(kneeF);
      let ks='';if(J.p>.95)ks=(kneeF>=88&&kneeF<=122)?'ok':'warn';else if(J.p<.03)ks=kneeShow<0?'warn':'ok';
      const as=J.p>.95?(dors>=18&&dors<=38?'ok':'warn'):'';
      return {knee:{v:kneeShow+'°',s:ks},hip:{v:Math.round(hipF)+'°',s:''},ankle:{v:Math.round(dors)+'°',s:as}};
    },
    viewChanged(v){statics.visible=v==='lateral'||v==='frontal';latOnly.visible=v==='lateral';kneeArc.visible=hipArc.visible=ankArc.visible=v==='lateral'||v==='diagonal';},
  };
})();

// #region: ex-pdn
/* ====================================================================================
   EXERCÍCIO 9 — PUXADA ALTA NA POLIA PELA FRENTE (LAT PULLDOWN)
   ==================================================================================== */
const PDN=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const LEAN0=-15, SEAT_Y=.45, P0=V(0,.56,0), GRIP=.33;
  const P1=V(.17,2.28,0), P2=V(.78,2.28,0), STACK_X=.98, PL_T=.045, PL_GAP=.004, NPL=14, PL_Y0=.13, SEL=6;
  const ankle=s=>V(.38,.085,.15*s);
  /* --- Máquina --- */
  const fixed=new THREE.Group();grp.add(fixed);
  const seat=meshIn(fixed,new THREE.BoxGeometry(.40,.07,.36),mats.pad);seat.position.set(.0,SEAT_Y-.035,0);
  railIn(fixed,V(.0,.04,0),V(.0,SEAT_Y-.07,0),.04,mats.frame);
  railIn(fixed,V(-.25,.035,0),V(1.3,.035,0),.045,mats.frame);railIn(fixed,V(-.25,.035,-.25),V(-.25,.035,.25),.04,mats.frame);
  /* apoio das coxas: dois rolos acolchoados sobre as coxas */
  const padY=.69, padX=.30;
  railIn(fixed,V(padX+.02,.04,0),V(padX+.02,padY,0),.035,mats.frame);
  railIn(fixed,V(padX,padY,-.30),V(padX,padY,.30),.022,mats.steel);
  const pads=[-1,1].map(k=>{const pd=meshIn(fixed,new THREE.CylinderGeometry(.055,.055,.20,20),mats.pad);pd.rotation.x=Math.PI/2;pd.position.set(padX,padY,k*.15);return pd;});
  const tower=new THREE.Group();grp.add(tower);
  [-1,1].forEach(k=>{railIn(tower,V(.80,.04,k*.27),V(.80,2.38,k*.27),.035,mats.frame);railIn(tower,V(1.22,.04,k*.27),V(1.22,2.38,k*.27),.035,mats.frame);
    railIn(tower,V(.80,2.38,k*.27),V(1.22,2.38,k*.27),.03,mats.frame);railIn(tower,V(.75,.035,k*.27),V(1.3,.035,k*.27),.04,mats.frame);
    railIn(tower,V(STACK_X,.10,k*.15),V(STACK_X,2.1,k*.15),.012,mats.chrome);});
  railIn(tower,V(.80,2.38,-.27),V(.80,2.38,.27),.03,mats.frame);railIn(tower,V(1.22,2.38,-.27),V(1.22,2.38,.27),.03,mats.frame);
  railIn(tower,V(.08,2.38,0),V(1.22,2.38,0),.045,mats.frame);railIn(tower,V(.38,2.38,0),V(.80,2.0,0),.028,mats.frame);
  const shroud=meshIn(tower,new THREE.BoxGeometry(.02,1.6,.5),mats.frame);shroud.position.set(1.26,1.0,0);
  [P1,P2].forEach(p=>{const w=meshIn(tower,new THREE.CylinderGeometry(.045,.045,.03,24),mats.steel);w.rotation.x=Math.PI/2;w.position.copy(p);
    const b=meshIn(tower,new THREE.BoxGeometry(.06,.08,.05),mats.frame);b.position.copy(p).add(V(0,.06,0));});
  const plates=[];
  for(let i=0;i<NPL;i++){const pl=meshIn(tower,new THREE.BoxGeometry(.24,PL_T,.42),mats.plate);const y=PL_Y0+i*(PL_T+PL_GAP)+PL_T/2;pl.position.set(STACK_X,y,0);pl.userData.y0=y;plates.push(pl);}
  const selIdx=NPL-SEL;
  const selRod=meshIn(tower,new THREE.CylinderGeometry(.009,.009,1,10),mats.chrome);
  const pin=new THREE.Group();tower.add(pin);
  { const sh=meshIn(pin,new THREE.CylinderGeometry(.007,.007,.16,10),mats.chrome);sh.rotation.z=Math.PI/2;sh.position.x=-.03;
    const kn=meshIn(pin,new THREE.SphereGeometry(.018,14,10),mats.lock);kn.position.x=-.12; }
  const cap=meshIn(tower,new THREE.BoxGeometry(.10,.035,.10),mats.steel);
  const cableMat=new THREE.MeshStandardMaterial({color:0x2b2f34,roughness:.5,metalness:.4});
  const cable=[0,1,2].map(()=>meshIn(grp,new THREE.CylinderGeometry(.0045,.0045,1,6),cableMat,false));
  seg(cable[1],sum(P1,1,YUP,.045),sum(P2,1,YUP,.045));
  /* barra longa com pontas levemente curvas */
  const bar=new THREE.Group();grp.add(bar);
  { const mid=meshIn(bar,new THREE.CylinderGeometry(.014,.014,.92,14),mats.chrome);mid.rotation.x=Math.PI/2;
    [-1,1].forEach(k=>{const e=meshIn(bar,new THREE.CylinderGeometry(.014,.014,.2,14),mats.chrome);seg(e,V(0,0,k*.46),V(0,-.065,k*.64));
      const g=meshIn(bar,new THREE.CylinderGeometry(.019,.019,.11,14),endMatP());seg(g,V(0,-.032,k*.55),V(0,-.06,k*.63));});
    const ring=meshIn(bar,new THREE.TorusGeometry(.018,.005,8,18),mats.steel);ring.position.set(0,.025,0);
    const crab=meshIn(bar,new THREE.TorusGeometry(.02,.0045,8,20),mats.lock);crab.position.set(0,.07,0);crab.scale.set(1,1.5,1); }
  function endMatP(){return new THREE.MeshStandardMaterial({color:0x17191c,roughness:.8});}

  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Sentado, pés no chão, coxas presas pelo apoio. Pegada pronada aberta, braços elevados, cotovelos quase retos, tronco ~15° para trás.'},
   {t:.6,  title:'Início da puxada',d:'A barra começa a descer: ombros em adução e extensão, cotovelos começando a flexionar e descer.',ph:'conc'},
   {t:.85, title:'Puxada intermediária',d:'Cotovelos flexionando, barra chegando à altura do rosto, braços descendo juntos. Tronco estável.',ph:'conc'},
   {t:1.35,title:'Aproximação do peito',d:'A barra passa à frente do queixo; cotovelos se aproximam das laterais do tronco.',ph:'conc'},
   {t:1.9, title:'Posição final da puxada',d:'Barra perto da parte de cima do peito (clavículas), cotovelos flexionados, escápulas para baixo. Pausa curta.'},
   {t:2.6, title:'Início do retorno',d:'A barra começa a subir; cotovelos iniciam a extensão sob controle.',ph:'ecc'},
   {t:3.85,title:'Retorno intermediário',d:'Barra subindo em direção à altura do rosto; escápulas acompanham a elevação dos braços.',ph:'ecc'},
   {t:4.2, title:'Aproximação da posição inicial',d:'Braços quase totalmente elevados, cotovelos perto da extensão.',ph:'ecc'},
   {t:4.5, title:'Posição inicial recuperada',d:'Braços elevados, barra estável acima da cabeça, pés e coxas apoiados. Repetição completa.'},
  ];
  const T_END=4.9;
  const pBase=t=>t<.4?0:t<1.9?ease((t-.4)/1.5):t<2.3?1:t<4.5?1-ease((t-2.3)/2.2):0;
  const pDrop=t=>t<.4?0:t<1.9?ease((t-.4)/1.5):t<2.3?1:t<2.75?1-1.04*Math.pow((t-2.3)/.45,2):t<2.95?-.04+.04*ease((t-2.75)/.2):0;
  const ERR={
    nuca:{name:'Puxar atrás da nuca',fix:'A barra desce sempre à frente do rosto, até a parte de cima do peito.'},
    inclinacao:{name:'Tronco inclinado demais para trás',fix:'Mantenha só 10–20° de inclinação, a mesma do início ao fim.'},
    balanco:{name:'Balanço do corpo',fix:'Tronco parado; quem puxa são as costas e os braços, não o impulso.'},
    ombros:{name:'Ombros encolhidos',fix:'No final da puxada, ombros para baixo e longe das orelhas.'},
    assimetria:{name:'Cotovelos assimétricos',fix:'Os dois cotovelos descem juntos e a barra fica nivelada.'},
    abdomen:{name:'Barra descendo até o abdômen',fix:'Pare com a barra na altura das clavículas ou do esterno superior.'},
    punhos:{name:'Punhos dobrados',fix:'Punhos retos, alinhados com os antebraços.'},
    brusco:{name:'Retorno brusco',fix:'Deixe a barra subir devagar, em cerca de 2 s, sem as placas baterem.'},
    coxas:{name:'Coxas saindo do apoio',fix:'Ajuste o apoio para prender as coxas e mantenha o quadril no banco.'},
  };
  let errMode=null, wristA=0;
  const W_REST=[1,-1].map(m=>L('E',m).lerp(L('G',m),.82));

  function solvePull(st){
    const {p,err,amt,r}=st;
    const bones=new Array(NB);
    let lean=LEAN0, head=-12, shrug=0, lag=0, Ci=null, lift=0;
    if(err==='inclinacao')lean-=amt*(12+14*p);
    if(err==='balanco')lean-=amt*(22*Math.sin(Math.PI*Math.min(1,p*1.2))-4);
    if(err==='ombros')shrug=amt*.055*sstep(.4,1,p);
    if(err==='assimetria')lag=amt;
    if(err==='coxas')lift=amt*.05*sstep(.0,.5,1-p);
    const a=lean*DEG;
    const u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    const P=P0.clone().add(V(-.02*lift/.05,lift,0));
    /* barra no referencial do tronco: acima da cabeça → à frente do rosto → parte de cima do peito */
    let C0=[1.097,.125], C1=[.45,.34];
    if(err==='abdomen'){C1=[.45-.28*amt,.36];lean-=0;}
    if(err==='nuca'){C1=[.47,-.10];head=-12-30*amt*sstep(.3,.8,p);}
    const bulge=err==='nuca'?-.0:.09*Math.sin(Math.PI*p);
    const cu=C0[0]+(C1[0]-C0[0])*p, cn0=C0[1]+(C1[1]-C0[1])*p+bulge;
    const cn=err==='nuca'?cn0+amt*.28*Math.sin(Math.PI*Math.min(1,p*1.1))*(1-sstep(.75,1,p))+0:cn0;
    const C=sum(P,1,u,cu,n,cn);
    const mapT=torsoBones(bones,qT,P,(head)*DEG);
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      /* escápulas: elevação no alto, depressão/rotação inferior na puxada */
      const Sj=mapT(L('Sj',m)).add(sum(u,.02-.045*r+shrug,n,-.012*r));
      let H=sum(C,1,ZAX,GRIP*s);
      if(lag&&s<0)H=H.add(sum(u,.12*lag*Math.sin(Math.PI*p)));
      const pole=sum(u,-1,ZAX,s*.9,n,-.25);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,pole,n.clone().addScaledVector(u,-.2).normalize());
      const hip=mapT(L('Hip',m));
      const K=legBones(bones,qT,s,hip,ankle(s),sum(XAX,1,YUP,.8),alignQ(YUP,ZAX,YUP,V(1,0,.1*s)));
      side.push({s,m,Sj,E,H,hip,K,A:ankle(s),qFT});
    });
    return {u,n,P,side,bones,lean,C};
  }
  const ref=solvePull({p:0,err:null,amt:0,r:0});
  const L0=ref.C.distanceTo(P1);

  /* --- Guias --- */
  const path=[];for(let k=0;k<=24;k++)path.push(solvePull({p:k/24,err:null,amt:0,r:Math.min(1,k/24*1.3)}).C.clone().add(V(0,0,.42)));
  lineIn(statics,path);
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.14,0xffffff,.05,.04);guides.add(arrow);
  const mkArc=()=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(l);return l;};
  const elbArc=mkArc(), shArc=mkArc();
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=ref, prevC=V(0,0,0);
  const GT=[
    {label:'Inicial',pos:()=>path[0].clone().add(V(.03,.05,0)),views:['lateral']},
    {label:'Final · clavículas',pos:()=>path[path.length-1].clone().add(V(.06,-.03,0)),views:['lateral']},
  ];
  const PARTS=[
    {label:'Polia superior',pos:()=>P1.clone().add(V(0,.1,0))},
    {label:'Cabo de aço',pos:()=>S.C.clone().lerp(P1,.5).add(V(.03,0,.03))},
    {label:'Mosquetão',pos:()=>S.C.clone().add(V(.03,.09,0))},
    {label:'Barra longa',pos:()=>S.C.clone().add(V(0,.04,-.5))},
    {label:'Banco',pos:()=>V(-.1,SEAT_Y,.2)},
    {label:'Apoio das coxas',pos:()=>V(padX,padY+.07,.27)},
    {label:'Torre de pesos',pos:()=>V(STACK_X,1.55,.27)},
    {label:'Pino seletor',pos:()=>pin.position.clone().add(V(-.12,0,0))},
  ];
  const ghostMat=new THREE.MeshStandardMaterial({color:0x8a939e,transparent:true,opacity:.16,depthWrite:false,roughness:.6});
  const ghostables=[];tower.traverse(o=>{if(o.isMesh){o.userData.mat=o.material;ghostables.push(o);}});

  return {
    id:'puxada', title:'Puxada Alta 3D',
    eyebrow:'Treino · Costas', h1:'Puxada alta na polia pela frente',
    specs:'<span>Pegada <b>pronada</b>, ~1,5× ombros</span><span>Tronco <b>10–20°</b> para trás</span><span>Barra até as <b>clavículas</b></span>',
    groups:{p:{label:'Principal',col:'--red'},s:{label:'Secundários',col:'--orange'},e:{label:'Escapulares e estabilizadores',col:'--blue'},n:{label:'Tronco e antebraço',col:'--muted'}},
    strongE:true,
    muscles:[
     {id:'latissimo',name:'Latíssimo do dorso (grande dorsal)',g:'p',col:'--red',tag:'Latíssimo do dorso'},
     {id:'redondo',name:'Redondo maior',g:'s',col:'--orange',tag:'Redondo maior'},
     {id:'biceps',name:'Bíceps braquial',g:'s',col:'--yellow',tag:'Bíceps braquial'},
     {id:'braquial',name:'Braquial',g:'s',col:'--lightyellow',tag:'Braquial'},
     {id:'braquiorradial',name:'Braquiorradial',g:'s',col:'--slate'},
     {id:'deltPost',name:'Deltoide posterior',g:'s',col:'--purple'},
     {id:'trapMed',name:'Trapézio médio',g:'e',col:'--blue',tag:'Trapézio'},
     {id:'trapInf',name:'Trapézio inferior',g:'e',col:'--blue'},
     {id:'romboides',name:'Romboides',g:'e',col:'--green',tag:'Romboides'},
     {id:'manguito',name:'Manguito rotador',g:'e',col:'--sky'},
     {id:'serratil',name:'Serrátil anterior',g:'e',col:'--sky'},
     {id:'reto',name:'Reto abdominal',g:'n'},{id:'obliquos',name:'Oblíquos',g:'n'},{id:'eretor',name:'Eretores da espinha',g:'n'},
     {id:'flexAnte',name:'Flexores dos dedos e antebraço',g:'n'},
    ],
    muscleTarget(m,kind){if(m.g==='p'||m.g==='s')return kind==='conc'?1:kind==='ecc'?.8:kind==='hold'?.7:.35;if(m.g==='e')return .45;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'elbow',label:'Flexão do cotovelo'},{id:'sh',label:'Elevação do braço'},{id:'trunk',label:'Tronco'}],
    views:{lateral:{pos:V(.25,1.35,3.9),tgt:V(.25,1.28,0)},frontal:{pos:V(3.1,1.6,0),tgt:V(.1,1.25,0)},
      anatomia:{pos:V(-2.0,1.65,.7),tgt:V(0,1.18,0)},detalhe:{pos:V(.95,1.55,.9),tgt:V(.25,1.25,.2)}},
    portrait:1.6, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>A máquina</h2><dl class="params">
          <dt>Polia superior</dt><dd>No alto da máquina; o cabo desce dela até a barra.</dd>
          <dt>Torre de pesos</dt><dd>Placas escolhidas pelo pino; sobem na puxada e descem no retorno sem bater.</dd>
          <dt>Mosquetão</dt><dd>Prende a barra ao cabo, no centro.</dd>
          <dt>Barra longa</dt><dd>Reta no meio, com as pontas levemente curvas para baixo.</dd>
          <dt>Banco</dt><dd>Ajuste a altura para os pés ficarem no chão com joelhos a ~90°.</dd>
          <dt>Apoio das coxas</dt><dd>Rolos acolchoados ajustados para prender as coxas logo acima dos joelhos.</dd></dl>
          <p class="small" style="margin:10px 0 0">Ligue <b>Peças da máquina</b> abaixo da cena para ver os nomes no 3D.</p></section>
          <section class="card"><h2>Posição e pegada</h2><dl class="params">
          <dt>Pés e joelhos</dt><dd>Pés no chão, joelhos com 80–100° de flexão, coxas firmes sob o apoio.</dd>
          <dt>Tronco 10–20°</dt><dd>Levemente inclinado para trás, coluna neutra, abdômen firme, olhar à frente.</dd>
          <dt>Pegada pronada</dt><dd>Palmas para a frente, mãos a ~1,5 vez a largura dos ombros, simétricas, polegares firmes.</dd>
          <dt>Punhos</dt><dd>Retos, alinhados com os antebraços.</dd>
          <dt>Puxada</dt><dd>Barra desce à frente do rosto até as clavículas; cotovelos descem e vão um pouco para trás.</dd>
          <dt>Ombros</dt><dd>Adução e extensão; escápulas descem e giram para baixo, sem encolher.</dd>
          <dt>Retorno</dt><dd>Barra sobe com controle até os braços ficarem elevados, cotovelos quase retos.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div>
          <p class="small" style="margin:10px 0 0">Também evite tirar os pés do chão.</p></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='brusco'&&rep)?pDrop(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const r=v>=0?Math.min(1,p*1.3):Math.pow(Math.max(0,p),.7);
      const J=solvePull({p:Math.max(p,-.05),err,amt,r});
      wristA=err==='punhos'?amt*(.3+.7*sstep(.1,.8,p))*35*DEG:0;
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    postBones(BM){
      if(wristA<=0)return;
      [1,-1].forEach((m,k)=>{const w=W_REST[k];const q=new THREE.Quaternion().setFromAxisAngle(ZAX,-m*wristA);
        const piv=new THREE.Matrix4().makeTranslation(w.x,w.y,w.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-w.x,-w.y,-w.z));
        BM[bi('ft',m)].multiply(piv);BM[bi('fing',m)].multiply(piv);});
    },
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Puxada · concêntrica',cue:'Adução e extensão do ombro com flexão do cotovelo; latíssimo em destaque.'};
      if(J.v<-.05)return {kind:'ecc',label:'Retorno controlado · excêntrica',cue:'A barra sobe devagar; os músculos continuam segurando a carga.'};
      if(J.p>.5)return {kind:'hold',label:'Posição final',cue:'Barra nas clavículas, ombros baixos, tronco na mesma inclinação.'};
      return {kind:'hold',label:'Posição inicial',cue:'Braços elevados, cotovelos quase retos, pegada pronada.'};},
    update(J,t,ph){
      bar.position.copy(J.C);
      const HL=J.side[1].H, HR=J.side[0].H;const ax=HR.clone().sub(HL).normalize();
      bar.quaternion.setFromUnitVectors(ZAX,ax);
      const cd=P1.clone().sub(J.C).normalize();
      seg(cable[0],sum(J.C,1,YUP,.085),sum(P1,1,XAX,-.045));
      const lift=Math.max(0,.02+J.C.distanceTo(P1)-L0);
      plates.forEach((pl,i)=>{pl.position.y=pl.userData.y0+(i>=selIdx?lift:0);});
      const topY=plates[NPL-1].position.y+PL_T/2;
      cap.position.set(STACK_X,topY+.0175,0);
      seg(cable[2],sum(P2,1,XAX,.045),V(STACK_X,topY+.035,0));
      seg(selRod,V(STACK_X,topY,0),V(STACK_X,plates[selIdx].position.y-.02,0));
      pin.position.set(STACK_X-.10,plates[selIdx].position.y,0);
      const Rs=J.side[0];
      const mov=Math.abs(J.v)>.05&&statics.visible;arrow.visible=mov;
      if(mov){arrow.position.copy(J.C.clone().add(V(.05,0,.42)));arrow.setDirection(J.C.clone().sub(prevC).normalize());arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      prevC.copy(J.C);
      arc(elbArc,Rs.E,Rs.Sj.clone().sub(Rs.E),Rs.H.clone().sub(Rs.E),V(0,0,.07),.09);
      arc(shArc,Rs.Sj,J.u.clone().negate(),Rs.E.clone().sub(Rs.Sj),V(0,0,.12),.13);
      const elbF=180-kneeAngle(Rs.Sj,Rs.E,Rs.H);
      const shA=Rs.E.clone().sub(Rs.Sj).angleTo(J.u.clone().negate())/DEG;
      let es='';if(J.p>.95)es=(elbF>=70&&elbF<=118)?'ok':'warn';else if(J.p<.03)es=elbF<=16?'ok':'warn';
      let ss='';if(J.p<.03)ss=shA>=145?'ok':'warn';
      const back=-J.lean;const ts=(back>=8&&back<=22)?'ok':'warn';
      return {elbow:{v:Math.round(elbF)+'°',s:es},sh:{v:Math.round(shA)+'°',s:ss},trunk:{v:Math.round(back)+'° para trás',s:ts}};
    },
    viewChanged(v){const see=v==='frontal';statics.visible=v==='lateral';
      ghostables.forEach(m=>{m.material=see?ghostMat:m.userData.mat;m.castShadow=!see;});
      cable[1].visible=cable[2].visible=selRod.visible=!see;elbArc.visible=shArc.visible=v==='lateral'||v==='detalhe';},
  };
})();

// #region: ex-flx
/* ====================================================================================
   EXERCÍCIO 10 — MESA FLEXORA DEITADA (prone leg curl)
   ==================================================================================== */
const FLX=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const P0=V(0,.87,0), PAD_Y=.75, TH_DROP=5*DEG;
  const thDir=V(-Math.cos(TH_DROP),-Math.sin(TH_DROP),0);
  const KP=sum(P0,1,thDir,LEN.th);KP.z=0;                       /* eixo da máquina alinhado ao joelho */
  const TX=1.62, STACK_X=TX, PL_T=.045, PL_GAP=.004, NPL=12, PL_Y0=.13, SEL=5;
  const PB=V(KP.x,.10,0), PT1=V(TX-.20,.10,0), PT2=V(TX-.20,1.85,0), PT3=V(TX-.045,1.85,0), CAM_R=.075;
  /* --- Estrutura --- */
  const fixed=new THREE.Group();grp.add(fixed);
  const pad=meshIn(fixed,new THREE.BoxGeometry(1.02,.08,.34),mats.pad);pad.position.set(KP.x+.07+.51,PAD_Y-.04,0);
  const chest=meshIn(fixed,new THREE.BoxGeometry(.32,.08,.40),mats.pad);chest.position.set(KP.x+.07+1.02+.16,PAD_Y-.06,0);
  railIn(fixed,V(KP.x+.12,PAD_Y-.1,0),V(KP.x+1.45,PAD_Y-.1,0),.04,mats.frame);
  [KP.x+.18,KP.x+1.30].forEach(x=>{railIn(fixed,V(x,.04,0),V(x,PAD_Y-.1,0),.04,mats.frame);railIn(fixed,V(x,.035,-.28),V(x,.035,.28),.04,mats.frame);});
  railIn(fixed,V(KP.x-.05,.035,0),V(TX+.1,.035,0),.045,mats.frame);
  /* eixo/pivô do braço mecânico, ao lado dos joelhos */
  railIn(fixed,V(KP.x,KP.y,-.30),V(KP.x,KP.y,.30),.018,mats.steel);
  [-1,1].forEach(k=>{railIn(fixed,V(KP.x+.12,PAD_Y-.1,k*.28),V(KP.x,KP.y,k*.28),.03,mats.frame);railIn(fixed,V(KP.x+.12,PAD_Y-.1,k*.28),V(KP.x+.12,PAD_Y-.1,0),.03,mats.frame);
    const hub=meshIn(fixed,new THREE.CylinderGeometry(.045,.045,.05,20),mats.steel);hub.rotation.x=Math.PI/2;hub.position.set(KP.x,KP.y,k*.29);});
  const cam=meshIn(fixed,new THREE.CylinderGeometry(CAM_R,CAM_R,.03,24),mats.frame);cam.rotation.x=Math.PI/2;cam.position.set(KP.x,KP.y,0);
  /* braço mecânico + rolete (gira em volta do eixo) */
  const lever=new THREE.Group();grp.add(lever);lever.position.copy(KP);
  const leverParts=new THREE.Group();lever.add(leverParts);
  /* torre de pesos */
  const tower=new THREE.Group();grp.add(tower);
  [-1,1].forEach(k=>{railIn(tower,V(TX-.22,.04,k*.27),V(TX-.22,2.0,k*.27),.035,mats.frame);railIn(tower,V(TX+.22,.04,k*.27),V(TX+.22,2.0,k*.27),.035,mats.frame);
    railIn(tower,V(TX-.22,2.0,k*.27),V(TX+.22,2.0,k*.27),.03,mats.frame);railIn(tower,V(TX-.28,.035,k*.27),V(TX+.28,.035,k*.27),.04,mats.frame);
    railIn(tower,V(STACK_X,.10,k*.15),V(STACK_X,1.75,k*.15),.012,mats.chrome);});
  railIn(tower,V(TX-.22,2.0,-.27),V(TX-.22,2.0,.27),.03,mats.frame);railIn(tower,V(TX+.22,2.0,-.27),V(TX+.22,2.0,.27),.03,mats.frame);
  const shroud=meshIn(tower,new THREE.BoxGeometry(.02,1.5,.5),mats.frame);shroud.position.set(TX+.26,.95,0);
  [PB,PT1,PT2,PT3].forEach(p=>{const w=meshIn(tower,new THREE.CylinderGeometry(.04,.04,.03,22),mats.steel);w.rotation.x=Math.PI/2;w.position.copy(p);});
  const plates=[];
  for(let i=0;i<NPL;i++){const pl=meshIn(tower,new THREE.BoxGeometry(.24,PL_T,.42),mats.plate);const y=PL_Y0+i*(PL_T+PL_GAP)+PL_T/2;pl.position.set(STACK_X,y,0);pl.userData.y0=y;plates.push(pl);}
  const selIdx=NPL-SEL;
  const selRod=meshIn(tower,new THREE.CylinderGeometry(.009,.009,1,10),mats.chrome);
  const pin=new THREE.Group();tower.add(pin);
  { const sh=meshIn(pin,new THREE.CylinderGeometry(.007,.007,.16,10),mats.chrome);sh.rotation.z=Math.PI/2;sh.position.x=-.03;
    const kn=meshIn(pin,new THREE.SphereGeometry(.018,14,10),mats.lock);kn.position.x=-.12; }
  const capP=meshIn(tower,new THREE.BoxGeometry(.10,.035,.10),mats.steel);
  const cableMat=new THREE.MeshStandardMaterial({color:0x2b2f34,roughness:.5,metalness:.4});
  const cable=[0,1,2,3,4].map(()=>meshIn(grp,new THREE.CylinderGeometry(.0045,.0045,1,6),cableMat,false));
  seg(cable[1],sum(PB,1,YUP,-.04),sum(PT1,1,YUP,-.04));
  seg(cable[2],sum(PT1,1,XAX,-.04),sum(PT2,1,XAX,-.04));
  seg(cable[3],sum(PT2,1,YUP,.04),sum(PT3,1,YUP,.04));

  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Deitado de barriga para baixo, pernas quase estendidas, joelhos alinhados ao eixo e rolete perto dos tornozelos.'},
   {t:.7,  title:'Início da flexão',d:'Joelhos com ~15–25° de flexão; o rolete começa a subir e os isquiotibiais começam a contrair.',ph:'conc'},
   {t:.95, title:'Flexão intermediária',d:'Joelhos com ~35–45°; calcanhares começando a se aproximar dos glúteos, pelve apoiada.',ph:'conc'},
   {t:1.2, title:'Flexão avançada',d:'Joelhos com ~60–75°; contração dos posteriores da coxa bem visível.',ph:'conc'},
   {t:1.9, title:'Contração máxima',d:'Joelhos com ~110° de flexão, calcanhares perto dos glúteos. Pausa breve.'},
   {t:2.6, title:'Início do retorno',d:'Extensão controlada dos joelhos: o rolete começa a descer (excêntrica dos isquiotibiais).',ph:'ecc'},
   {t:3.48,title:'Retorno intermediário',d:'Joelhos com ~60–75° de flexão, retorno suave e contínuo.',ph:'ecc'},
   {t:3.93,title:'Retorno avançado',d:'Joelhos com ~30–45° de flexão; pernas se aproximando da extensão.',ph:'ecc'},
   {t:4.8, title:'Posição inicial',d:'Joelhos quase estendidos, sem travar. Repetição completa.'},
  ];
  const T_END=5.2;
  const pBase=t=>t<.4?0:t<1.9?ease((t-.4)/1.5):t<2.3?1:t<4.8?1-ease((t-2.3)/2.5):0;
  function pJerk(t){if(t<.4)return 0;if(t<.85){const s=(t-.4)/.45;return Math.min(1.05,1.05*s*(2-s));}if(t<1.1)return 1.05-.05*ease((t-.85)/.25);
    if(t<1.55){const s=(t-1.1)/.45;return 1-s*s;}return 0;}
  const ERR={
    quadril:{name:'Elevação do quadril',fix:'Quadril e coxas colados no banco durante toda a repetição.'},
    lombar:{name:'Hiperextensão da lombar',fix:'Tronco apoiado e coluna neutra; o movimento acontece só nos joelhos.'},
    impulso:{name:'Balanço e impulso',fix:'Suba em cerca de 1,5 s, sem tranco nem ajuda do quadril.'},
    eixo:{name:'Joelho fora do eixo da máquina',fix:'Deite de forma que o joelho fique alinhado ao eixo do braço mecânico.'},
    rolete:{name:'Rolete no meio da panturrilha',fix:'Ajuste o rolete para apoiar logo acima dos tornozelos.'},
    pes:{name:'Pés girando',fix:'Pés e tornozelos alinhados com as pernas, sem girar para os lados.'},
    travar:{name:'Joelhos travados na extensão',fix:'Volte até perto da extensão, deixando uma leve flexão.'},
    excesso:{name:'Flexão além do confortável',fix:'Pare perto de 90–120°, sem forçar os calcanhares contra os glúteos.'},
    cotovelos:{name:'Puxar o corpo com os braços',fix:'Mãos só seguram as alças; cotovelos parados.'},
  };
  let errMode=null;

  function solveFlx(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let flex=8+102*p, hipUp=0, chest=0, shift=0, rollOff=0, footTw=0, pullArms=0;
    if(err==='quadril')hipUp=amt*.07*sstep(.2,.9,p);
    if(err==='lombar')chest=amt*14*sstep(.1,.8,p);
    if(err==='impulso')hipUp=amt*.06*Math.sin(Math.PI*Math.min(1,p*1.3));
    if(err==='eixo')shift=amt*.09;
    if(err==='rolete')rollOff=amt*.15;
    if(err==='pes')footTw=amt*28*DEG;
    if(err==='travar')flex=Math.max(-4,flex-amt*12*(1-sstep(0,.3,p)));
    if(err==='excesso'){flex+=amt*24*sstep(.6,1,p);hipUp=Math.max(hipUp,amt*.05*sstep(.75,1,p));}
    if(err==='cotovelos')pullArms=amt*Math.sin(Math.PI*Math.min(1,p*1.2));
    /* tronco de bruços, cabeça para +X; peito para baixo */
    const P=P0.clone().add(V(shift+.025*pullArms,hipUp,0));
    const tilt=(chest*DEG)+Math.atan2(hipUp*.0,1);
    const u=V(Math.cos(tilt),Math.sin(tilt),0), n=V(Math.sin(tilt),-Math.cos(tilt),0);
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,0);
    /* perna: gira em volta do joelho; extensão = continuação da coxa */
    const K=sum(P0,1,V(shift,hipUp*.4,0),1,thDir,LEN.th);
    const ang=Math.PI+TH_DROP-flex*DEG;
    const sd=V(Math.cos(ang),Math.sin(ang),0), ant=V(Math.cos(ang-Math.PI/2),Math.sin(ang-Math.PI/2),0);
    const side=[];
    [1,-1].forEach(s=>{const m=-s;
      const Sj=mapT(L('Sj',m));
      const H=V(.71-.03*pullArms,.56,.265*s);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,sum(ZAX,s,XAX,-.3,YUP,.2),ZAX.clone().multiplyScalar(-s).addScaledVector(YUP,-.6).normalize());
      const hip=mapT(L('Hip',m));
      const A=sum(K,1,sd,LEN.sn).setZ(.10*s);
      let toe=ant.clone();if(footTw)toe=toe.applyAxisAngle(sd,footTw*s).normalize();
      const qF=alignQ(YUP,ZAX,sd.clone().negate(),toe);
      const Kk=legBones(bones,qT,s,hip,A,ant.clone().add(V(0,0,.05*s)),qF);
      side.push({s,m,Sj,E,H,hip,K:Kk,A,qFT});
    });
    return {u,n,P,side,bones,flex,sd,ant,K,rollOff};
  }
  const ref=solveFlx({p:0,err:null,amt:0});
  /* rolete de referência (posição inicial correta) e braço mecânico com raio fixo */
  const rollerAt=J=>{const A=J.side[0].A.clone().setZ(0);return sum(A,1,J.ant,-.075,J.sd,-.045-J.rollOff);};
  const R0=rollerAt(ref), RAD=R0.distanceTo(KP);
  { const roll=meshIn(leverParts,new THREE.CylinderGeometry(.05,.05,.44,22),mats.pad);roll.rotation.x=Math.PI/2;roll.userData.roll=1;
    leverParts.userData.roll=roll;
    [-1,1].forEach(k=>{const arm=meshIn(leverParts,new THREE.BoxGeometry(1,.035,.03),mats.frame);arm.userData.arm=k;
      const knob=meshIn(leverParts,new THREE.CylinderGeometry(.018,.018,.05,12),mats.lock);knob.rotation.x=Math.PI/2;knob.userData.knob=k;});
    const ax=meshIn(leverParts,new THREE.CylinderGeometry(.012,.012,.62,10),mats.steel);ax.rotation.x=Math.PI/2;ax.userData.axle=1; }
  /* pegadores ao lado da frente do banco */
  ref.side.forEach(sd=>{const ax=ZAX.clone().applyQuaternion(sd.qFT);const h=meshIn(fixed,new THREE.CylinderGeometry(.017,.017,.14,12),mats.chrome);h.position.copy(sd.H);h.quaternion.setFromUnitVectors(YUP,ax);
    railIn(fixed,sd.H,V(sd.H.x-.12,PAD_Y-.1,sd.H.z),.016,mats.frame);railIn(fixed,V(sd.H.x-.12,PAD_Y-.1,sd.H.z),V(sd.H.x-.12,PAD_Y-.1,0),.016,mats.frame);});

  /* --- Guias --- */
  const rollPath=[];for(let k=0;k<=24;k++){const a=-((102/24)*k)*DEG;rollPath.push(R0.clone().sub(KP).applyAxisAngle(ZAX,-a*-1).add(KP).setZ(.3));}
  const rp=[];for(let k=0;k<=24;k++){const J=solveFlx({p:k/24,err:null,amt:0});rp.push(rollerAt(J).setZ(.30));}
  lineIn(statics,rp);
  lineIn(statics,[KP.clone().setZ(.31),R0.clone().setZ(.31)]);
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.13,0xffffff,.05,.038);guides.add(arrow);
  const kneeArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(kneeArc);
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=ref, prevR=R0.clone(), Rcur=R0.clone();
  const GT=[{label:'Eixo da máquina',pos:()=>KP.clone().add(V(0,-.08,.32)),views:['lateral','diagonal']}];
  const PARTS=[
    {label:'Banco acolchoado',pos:()=>V(KP.x+.6,PAD_Y+.02,.19)},
    {label:'Rolete',pos:()=>Rcur.clone().add(V(0,.07,.22))},
    {label:'Braço mecânico',pos:()=>KP.clone().lerp(Rcur,.5).add(V(0,0,.24))},
    {label:'Eixo de rotação',pos:()=>KP.clone().add(V(0,-.06,.3))},
    {label:'Regulagem',pos:()=>KP.clone().lerp(Rcur,.72).add(V(0,-.05,.27))},
    {label:'Alças',pos:()=>ref.side[0].H.clone().add(V(0,-.05,.06))},
    {label:'Torre de pesos',pos:()=>V(TX,1.5,.27)},
    {label:'Seletor',pos:()=>pin.position.clone().add(V(-.12,0,0))},
  ];

  return {
    id:'flexora', title:'Mesa Flexora 3D',
    eyebrow:'Treino · Posteriores da coxa', h1:'Mesa flexora deitada',
    specs:'<span>Joelhos <b>~8° → ~110°</b></span><span>Rolete <b>acima dos tornozelos</b></span><span>Subida <b>~1,5 s</b></span><span>Descida <b>~2,5 s</b></span>',
    groups:{p:{label:'Principais · isquiotibiais',col:'--red'},s:{label:'Secundários',col:'--orange'},e:{label:'Estabilizadores',col:'--blue'}},
    strongE:true,
    muscles:[
     {id:'bicepsFem',name:'Bíceps femoral (cabeças longa e curta)',g:'p',col:'--red',tag:'Bíceps femoral'},
     {id:'semitend',name:'Semitendíneo',g:'p',col:'--red',tag:'Semitendíneo'},
     {id:'semimemb',name:'Semimembranáceo',g:'p',col:'--red',tag:'Semimembranáceo'},
     {id:'gastro',name:'Gastrocnêmio',g:'s',col:'--orange',tag:'Gastrocnêmio'},
     {id:'sartorio',name:'Sartório',g:'s',col:'--yellow'},
     {id:'gracil',name:'Grácil',g:'s',col:'--yellow'},
     {id:'popliteo',name:'Poplíteo (atrás do joelho, profundo)',g:'s',col:'--yellow'},
     {id:'gluteos',name:'Glúteo máximo',g:'e',col:'--blue',tag:'Glúteo máximo'},
     {id:'reto',name:'Abdômen',g:'e',col:'--blue'},{id:'obliquos',name:'Oblíquos',g:'e',col:'--blue'},
     {id:'eretor',name:'Estabilizadores lombares',g:'e',col:'--blue'},
    ],
    muscleTarget(m,kind){if(m.g==='p')return kind==='conc'?1:kind==='ecc'?.85:kind==='hold'?.85:.35;if(m.g==='s')return kind==='conc'?.8:kind==='ecc'?.6:.4;if(m.g==='e')return .35;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'knee',label:'Flexão do joelho'},{id:'hip',label:'Quadril'},{id:'elbow',label:'Cotovelos'}],
    views:{lateral:{pos:V(.1,1.05,3.1),tgt:V(.1,.85,0)},posterior:{pos:V(-.7,2.75,0),tgt:V(-.18,.85,0)},
      diagonal:{pos:V(-1.85,1.75,1.7),tgt:V(-.2,.82,0)},anatomia:{pos:V(-.95,1.55,.85),tgt:V(-.35,.92,0)}},
    portrait:1.75, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>A máquina</h2><dl class="params">
          <dt>Banco</dt><dd>Horizontal e acolchoado, apoia tronco, quadril e coxas.</dd>
          <dt>Rolete</dt><dd>Acolchoado, apoia atrás das pernas, logo acima dos tornozelos.</dd>
          <dt>Braço mecânico</dt><dd>Sustenta o rolete e gira em volta do eixo.</dd>
          <dt>Eixo de rotação</dt><dd>Fica na altura do joelho; os dois devem estar alinhados.</dd>
          <dt>Regulagem</dt><dd>Ajusta o comprimento do braço para o rolete cair no lugar certo.</dd>
          <dt>Alças</dt><dd>Na frente do banco, só para segurar.</dd>
          <dt>Torre e seletor</dt><dd>Placas escolhidas pelo pino; sobem quando você flexiona os joelhos.</dd></dl>
          <p class="small" style="margin:10px 0 0">Ligue <b>Peças da máquina</b> abaixo da cena para ver os nomes no 3D.</p></section>
          <section class="card"><h2>Posição</h2><dl class="params">
          <dt>Corpo</dt><dd>De barriga para baixo, tronco e pelve apoiados, cabeça e pescoço neutros.</dd>
          <dt>Joelhos</dt><dd>Logo depois da borda do banco, alinhados ao eixo da máquina.</dd>
          <dt>Pernas</dt><dd>Quase estendidas no início (0–15°), sem travar; pés e tornozelos alinhados.</dd>
          <dt>Mãos</dt><dd>Nas alças, cotovelos flexionados (70–110°) e parados.</dd>
          <dt>Subida</dt><dd>Flexione os joelhos e traga os calcanhares em direção aos glúteos, até ~90–120°.</dd>
          <dt>Descida</dt><dd>Estenda devagar, controlando o rolete, até quase esticar.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='impulso'&&rep)?pJerk(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solveFlx({p,err,amt});
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Flexão do joelho · concêntrica',cue:'Isquiotibiais contraem e trazem os calcanhares em direção aos glúteos.'};
      if(J.v<-.05)return {kind:'ecc',label:'Retorno controlado · excêntrica',cue:'Os isquiotibiais continuam ativos, controlando a descida do rolete.'};
      if(J.p>.5)return {kind:'hold',label:'Contração máxima',cue:'Pausa breve, quadril no banco.'};
      return {kind:'hold',label:'Posição inicial',cue:'Pernas quase estendidas, sem travar.'};},
    update(J,t,ph){
      /* rolete: segue a perna; o braço mecânico gira em volta do eixo da máquina */
      const Rleg=rollerAt(J);
      const dir=Rleg.clone().sub(KP);const a=Math.atan2(dir.y,dir.x);
      const R=V(KP.x+Math.cos(a)*RAD,KP.y+Math.sin(a)*RAD,0);Rcur.copy(R);
      leverParts.children.forEach(c=>{
        if(c.userData.roll){c.position.copy(R.clone().sub(KP));}
        if(c.userData.axle){c.position.copy(R.clone().sub(KP));}
        if(c.userData.arm){const k=c.userData.arm;c.position.copy(R.clone().sub(KP).multiplyScalar(.5)).setZ(k*.24);c.scale.x=RAD;c.rotation.z=a;}
        if(c.userData.knob){const k=c.userData.knob;c.position.copy(R.clone().sub(KP).multiplyScalar(.7)).setZ(k*.265);}
      });
      /* came no eixo: a placa sobe conforme o braço gira */
      const rot=Math.max(0,(Math.atan2(R0.y-KP.y,R0.x-KP.x)-a));
      const lift=Math.max(0,.015+CAM_R*rot*1.1);
      plates.forEach((pl,i)=>{pl.position.y=pl.userData.y0+(i>=selIdx?lift:0);});
      const topY=plates[NPL-1].position.y+PL_T/2;
      capP.position.set(STACK_X,topY+.0175,0);
      seg(cable[0],sum(KP,1,YUP,-CAM_R),sum(PB,1,XAX,.04));
      seg(cable[4],sum(PT3,1,XAX,.04),V(STACK_X,topY+.035,0));
      seg(selRod,V(STACK_X,topY,0),V(STACK_X,plates[selIdx].position.y-.02,0));
      pin.position.set(STACK_X-.10,plates[selIdx].position.y,0);
      const mov=Math.abs(J.v)>.05&&statics.visible;arrow.visible=mov;
      if(mov){arrow.position.copy(R.clone().add(V(0,0,.30)));arrow.setDirection(R.clone().sub(prevR).normalize());arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      prevR.copy(R);
      const Rs=J.side[0];
      arc(kneeArc,Rs.K,Rs.hip.clone().sub(Rs.K),Rs.A.clone().sub(Rs.K),V(0,0,.12),.11);
      const kneeF=J.flex;
      const elbF=180-kneeAngle(Rs.Sj,Rs.E,Rs.H);
      const hipTxt=J.P.y-P0.y>.02?'elevado':'apoiado';
      let ks='';if(J.p<.03)ks=kneeF<2?'warn':(kneeF<=15?'ok':'');else if(J.p>.95)ks=(kneeF>=88&&kneeF<=122)?'ok':'warn';
      return {knee:{v:Math.round(kneeF)+'°',s:ks},hip:{v:hipTxt,s:hipTxt==='apoiado'?'ok':'warn'},elbow:{v:Math.round(elbF)+'°',s:(elbF>=65&&elbF<=115)?'ok':'warn'}};
    },
    viewChanged(v){statics.visible=v==='lateral'||v==='diagonal';kneeArc.visible=v!=='posterior';},
  };
})();

// #region: ex-rsc
/* ====================================================================================
   EXERCÍCIO 11 — ROSCA BÍCEPS EM PÉ COM HALTERES (supinada, simultânea)
   ==================================================================================== */
const RSC=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const FOOTZ=.11;
  const rubber=new THREE.MeshStandardMaterial({color:0x26282c,roughness:.85,metalness:0});
  const DUMB=[];
  for(let i=0;i<2;i++){const g=new THREE.Group();
    const hd=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.13,12),mats.chrome);hd.castShadow=true;g.add(hd);
    [-1,1].forEach(k=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.05,6),rubber);p.position.y=k*.088;p.castShadow=true;g.add(p);
      const c=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.01,14),mats.chrome);c.position.y=k*.06;g.add(c);});
    grp.add(g);DUMB.push(g);}
  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Em pé, tronco ereto, braços ao lado do corpo, halteres perto das coxas, cotovelos com 10–20° de flexão, palmas para a frente.'},
   {t:.76, title:'Início da flexão',d:'Cotovelos começam a flexionar (~25–35°); os halteres começam a subir.',ph:'conc'},
   {t:1.05,title:'Flexão intermediária',d:'Cotovelos com ~50–60°; antebraços sobem com controle.',ph:'conc'},
   {t:1.32,title:'Flexão avançada',d:'Cotovelos com ~80–95°; halteres chegando à altura do abdômen superior.',ph:'conc'},
   {t:1.9, title:'Contração máxima',d:'Cotovelos com ~130° de flexão, halteres perto dos ombros, ombros relaxados. Pausa curta.'},
   {t:2.6, title:'Início da descida',d:'Extensão controlada dos cotovelos; os halteres começam a descer.',ph:'ecc'},
   {t:3.3, title:'Extensão intermediária',d:'Cotovelos com ~80–95°; antebraços descendo de forma contínua.',ph:'ecc'},
   {t:3.95,title:'Extensão avançada',d:'Cotovelos com ~40–50°; halteres chegando ao lado das coxas.',ph:'ecc'},
   {t:4.8, title:'Posição inicial',d:'Cotovelos levemente flexionados, sem travar, halteres perto das coxas. Repetição completa.'},
  ];
  const T_END=5.2;
  const pBase=t=>t<.4?0:t<1.9?ease((t-.4)/1.5):t<2.3?1:t<4.8?1-ease((t-2.3)/2.5):0;
  const pDrop=t=>t<.4?0:t<1.9?ease((t-.4)/1.5):t<2.3?1:t<2.85?1-Math.pow((t-2.3)/.55,2):0;
  const ERR={
    balanco:{name:'Balanço do tronco',fix:'Tronco parado e ereto; só o antebraço se move.'},
    lombar:{name:'Hiperextensão lombar',fix:'Abdômen firme, sem jogar o tronco para trás no topo.'},
    pernas:{name:'Impulso das pernas',fix:'Joelhos parados; a força vem só dos flexores do cotovelo.'},
    ombros:{name:'Elevação dos ombros',fix:'Ombros relaxados e baixos durante toda a repetição.'},
    punhos:{name:'Punhos flexionados',fix:'Punho reto, alinhado com o antebraço.'},
    frente:{name:'Cotovelos indo para a frente',fix:'Braço quase vertical, cotovelo perto da lateral do tronco.'},
    abertos:{name:'Cotovelos afastados do corpo',fix:'Cotovelos junto ao tronco o tempo todo.'},
    brusco:{name:'Descida brusca',fix:'Desça em cerca de 2,5 s, controlando o peso.'},
    travar:{name:'Travamento dos cotovelos',fix:'Embaixo, deixe 10–20° de flexão.'},
    pegada:{name:'Perder a pegada supinada',fix:'Palmas para a frente embaixo e para cima no topo, sem girar o antebraço.'},
  };
  let errMode=null, wristA=0;
  const W_REST=[1,-1].map(m=>L('E',m).lerp(L('G',m),.82));

  function solveCurl(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let lean=0, knee=3, shrug=0, fwd=2, out=.05, flexMin=15, pron=0;
    if(err==='balanco')lean=amt*(6*(1-sstep(0,.3,p))*sstep(0,.1,p)-16*sstep(.15,.75,p));
    if(err==='lombar')lean=-amt*13*sstep(.3,.9,p);
    if(err==='pernas')knee=3+amt*20*Math.max(0,Math.sin(Math.PI*Math.min(1,(p+.15)*1.6)))*(p<.6?1:0);
    if(err==='ombros')shrug=amt*.05*sstep(.2,.9,p);
    if(err==='frente')fwd=2+amt*38*sstep(.25,1,p);
    if(err==='abertos')out=.05+amt*.55*sstep(.1,.8,p);
    if(err==='travar')flexMin=15-amt*14*(1-sstep(0,.3,p));
    if(err==='pegada')pron=amt*70*DEG*sstep(.2,.9,p);
    const flex=(flexMin+(130-flexMin)*p)*DEG;
    const a=lean*DEG;
    const u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    const feet=[1,-1].map(s=>({A:V(0,.085,FOOTZ*s),qF:alignQ(YUP,ZAX,YUP,V(1,0,.12*s).normalize())}));
    const kr=knee*DEG;
    const K=V(LEN.sn*Math.sin(kr),.085+LEN.sn*Math.cos(kr),0);
    const P=sum(K,1,V(Math.sin(-kr),Math.cos(-kr),0),LEN.th*.998);
    const mapT=torsoBones(bones,qT,P,0);
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const Sj=mapT(L('Sj',m)).add(sum(YUP,shrug));
      const fr=fwd*DEG;
      const dU=sum(YUP,-Math.cos(fr),XAX,Math.sin(fr),ZAX,s*out).normalize();
      const E=sum(Sj,1,dU,LEN.ua);
      const fw=XAX.clone().addScaledVector(dU,-XAX.dot(dU)).normalize();
      const dF=sum(dU,Math.cos(flex),fw,Math.sin(flex)).normalize();
      const H=sum(E,1,dF,LEN.fa,ZAX,.012*s);
      let palm=sum(fw,Math.cos(flex),dU,-Math.sin(flex)).normalize();
      if(pron)palm=palm.applyAxisAngle(dF,pron*s).normalize();
      const pole=E.clone().sub(Sj.clone().lerp(H,.5)).normalize();
      const {E:E2,qFT}=armBones(bones,qT,s,Sj,H,pole,palm);
      const hip=mapT(L('Hip',m));
      const Kk=legBones(bones,qT,s,hip,feet[i].A,sum(XAX,1,ZAX,.1*s),feet[i].qF);
      side.push({s,m,Sj,E:E2,H,hip,K:Kk,A:feet[i].A,qFT,dU});
    });
    return {u,n,P,side,bones,lean,flex:flex/DEG};
  }
  const path=[];for(let k=0;k<=24;k++)path.push(solveCurl({p:k/24,err:null,amt:0}).side[0].H.clone().add(V(0,0,.14)));
  lineIn(statics,path);
  const armRef=lineIn(statics,[V(0,0,0),V(0,0,0)]);
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.13,0xffffff,.05,.038);guides.add(arrow);
  const elbArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(elbArc);
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=solveCurl({p:0,err:null,amt:0}), prevH=V(0,0,0);
  const GT=[{label:'Cotovelo',text:()=>`Cotovelo ${Math.round(S.flex)}°`,pos:()=>S.side[0].E.clone().add(V(-.06,-.02,.16)),views:['lateral']}];
  const PARTS=[{label:'Halter',pos:()=>DUMB[0].position.clone().add(V(0,.07,.08))},{label:'Empunhadura',pos:()=>DUMB[0].position.clone().add(V(.06,-.05,0))}];

  return {
    id:'rosca', title:'Rosca Bíceps 3D',
    eyebrow:'Treino · Bíceps', h1:'Rosca bíceps em pé com halteres',
    specs:'<span>Pegada <b>supinada</b></span><span>Cotovelos <b>15° → ~130°</b></span><span>Braços <b>parados</b></span>',
    groups:{p:{label:'Principais',col:'--red'},s:{label:'Antebraço (auxiliares)',col:'--yellow'},d:{label:'Ombro e tronco (estabilizadores)',col:'--blue'}},
    strongE:true,
    muscles:[
     {id:'bicLong',name:'Bíceps braquial — cabeça longa',g:'p',col:'--red',tag:'Bíceps · cabeça longa'},
     {id:'bicShort',name:'Bíceps braquial — cabeça curta',g:'p',col:'--red',tag:'Bíceps · cabeça curta'},
     {id:'braquial',name:'Braquial (camada profunda, sob o bíceps)',g:'p',col:'--orange',tag:'Braquial'},
     {id:'braquiorradial',name:'Braquiorradial',g:'p',col:'--yellow',tag:'Braquiorradial'},
     {id:'flexAnte',name:'Flexores do punho',g:'s',col:'--yellow'},
     {id:'extAnte',name:'Extensores do punho',g:'s',col:'--yellow'},
     {id:'supinador',name:'Supinador e pronador redondo (profundos)',g:'s',col:'--yellow'},
     {id:'deltAnt',name:'Deltoide anterior',g:'d',col:'--blue'},
     {id:'manguito',name:'Manguito rotador',g:'d',col:'--blue'},
     {id:'reto',name:'Abdômen',g:'d',col:'--blue'},{id:'obliquos',name:'Oblíquos',g:'d',col:'--blue'},
     {id:'eretor',name:'Eretores da coluna',g:'d',col:'--blue'},
    ],
    muscleTarget(m,kind){if(m.g==='p')return kind==='conc'?1:kind==='ecc'?.85:kind==='hold'?.85:.35;if(m.g==='s')return kind==='conc'?.75:.5;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'elbow',label:'Flexão do cotovelo'},{id:'arm',label:'Braço × vertical'},{id:'trunk',label:'Tronco'}],
    views:{lateral:{pos:V(.15,1.15,2.75),tgt:V(.1,1.0,0)},frontal:{pos:V(2.6,1.3,0),tgt:V(0,1.0,0)},
      diagonal:{pos:V(1.85,1.45,1.85),tgt:V(0,1.0,0)},anatomia:{pos:V(.9,1.3,1.0),tgt:V(.05,1.08,.15)}},
    portrait:1.8, degTag:null, degAnchor:null,
    errors:ERR,
    postBones(BM){
      if(wristA<=0)return;
      [1,-1].forEach((m,k)=>{const w=W_REST[k];const q=new THREE.Quaternion().setFromAxisAngle(ZAX,-m*wristA);
        const piv=new THREE.Matrix4().makeTranslation(w.x,w.y,w.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-w.x,-w.y,-w.z));
        BM[bi('ft',m)].multiply(piv);BM[bi('fing',m)].multiply(piv);});
    },
    info:`<section class="card"><h2>Equipamento</h2><dl class="params">
          <dt>Dois halteres</dt><dd>Iguais e independentes, um em cada mão, com empunhadura cilíndrica. Sem banco, barra ou polia.</dd></dl></section>
          <section class="card"><h2>Posição e movimento</h2><dl class="params">
          <dt>Pés</dt><dd>Na largura do quadril, inteiros no chão; joelhos destravados (5–10°).</dd>
          <dt>Tronco</dt><dd>Ereto, coluna neutra, abdômen levemente firme, ombros relaxados.</dd>
          <dt>Braços</dt><dd>Ao lado do tronco, quase verticais, cotovelos perto do corpo o tempo todo.</dd>
          <dt>Pegada</dt><dd>Supinada: palmas para a frente embaixo e para cima no topo; punhos retos.</dd>
          <dt>Início</dt><dd>Cotovelos com 10–20° de flexão, halteres ao lado das coxas.</dd>
          <dt>Subida</dt><dd>Só o cotovelo flexiona, até ~120–140°, halteres perto dos ombros.</dd>
          <dt>Descida</dt><dd>Lenta e controlada, sem travar os cotovelos embaixo.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde). A linha azul ao lado do braço mostra se ele saiu da vertical.</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='brusco'&&rep)?pDrop(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solveCurl({p:Math.max(0,p),err,amt});
      wristA=err==='punhos'?amt*(.3+.7*sstep(.1,.8,p))*38*DEG:0;
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Flexão do cotovelo · concêntrica',cue:'Bíceps, braquial e braquiorradial contraem; o braço fica parado.'};
      if(J.v<-.05)return {kind:'ecc',label:'Descida controlada · excêntrica',cue:'Os flexores continuam ativos controlando a descida.'};
      if(J.p>.5)return {kind:'hold',label:'Contração máxima',cue:'Halteres perto dos ombros, ombros relaxados.'};
      return {kind:'hold',label:'Posição inicial',cue:'Cotovelos levemente flexionados, palmas para a frente.'};},
    update(J,t,ph){
      const tq=new THREE.Quaternion(), tv=new THREE.Vector3();
      J.side.forEach((sd,i)=>{const B=BM[bi('ft',sd.m)];DUMB[i].position.copy(L('G',sd.m)).applyMatrix4(B);
        B.decompose(tv,tq,new THREE.Vector3());DUMB[i].quaternion.setFromUnitVectors(YUP,ZAX.clone().applyQuaternion(tq));});
      const R=J.side[0];
      const mov=Math.abs(J.v)>.05&&statics.visible;arrow.visible=mov;
      if(mov){arrow.position.copy(R.H.clone().add(V(.06,0,.14)));arrow.setDirection(R.H.clone().sub(prevH).normalize());arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      prevH.copy(R.H);
      armRef.geometry.setFromPoints([R.Sj.clone().add(V(0,0,.14)),R.E.clone().add(V(0,0,.14))]);
      arc(elbArc,R.E,R.Sj.clone().sub(R.E),R.H.clone().sub(R.E),V(0,0,.09),.09);
      const armA=R.E.clone().sub(R.Sj).angleTo(YUP.clone().negate())/DEG;
      let es='';if(J.p<.03)es=(J.flex>=8&&J.flex<=22)?'ok':'warn';else if(J.p>.95)es=(J.flex>=118&&J.flex<=142)?'ok':'warn';
      return {elbow:{v:Math.round(J.flex)+'°',s:es},arm:{v:Math.round(armA)+'°',s:armA<=12?'ok':'warn'},trunk:{v:Math.abs(J.lean)<1?'ereto':Math.round(Math.abs(J.lean))+'° '+(J.lean<0?'para trás':'à frente'),s:Math.abs(J.lean)<=3?'ok':'warn'}};
    },
    viewChanged(v){statics.visible=v==='lateral'||v==='diagonal';elbArc.visible=v!=='frontal';},
  };
})();

// #region: ex-clf
/* ====================================================================================
   EXERCÍCIO 12 — PANTURRILHA EM PÉ NA MÁQUINA (standing calf raise)
   ==================================================================================== */
const CLF=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const PLAT_Y=.13, EDGE=0, FOOTZ=.11, BALL=.14, PH0=20, PH1=-35;
  /* --- Máquina --- */
  const fixed=new THREE.Group();grp.add(fixed);
  const plat=meshIn(fixed,new THREE.BoxGeometry(.42,PLAT_Y,.62),mats.deck);plat.position.set(EDGE+.21,PLAT_Y/2,0);
  for(let i=0;i<6;i++){const r=meshIn(fixed,new THREE.BoxGeometry(.4,.004,.6),mats.frame,false);r.position.set(EDGE+.21,PLAT_Y+.002,0);r.visible=i===0;}
  const lip=meshIn(fixed,new THREE.BoxGeometry(.025,.02,.62),mats.steel);lip.position.set(EDGE+.012,PLAT_Y+.008,0);
  railIn(fixed,V(-.45,.035,0),V(.95,.035,0),.045,mats.frame);railIn(fixed,V(-.45,.035,-.35),V(-.45,.035,.35),.04,mats.frame);
  const TX=.72, STACK_X=TX;
  const tower=new THREE.Group();grp.add(tower);
  [-1,1].forEach(k=>{railIn(tower,V(TX-.2,.04,k*.27),V(TX-.2,2.15,k*.27),.04,mats.frame);railIn(tower,V(TX+.22,.04,k*.27),V(TX+.22,2.15,k*.27),.035,mats.frame);
    railIn(tower,V(TX-.2,2.15,k*.27),V(TX+.22,2.15,k*.27),.03,mats.frame);railIn(tower,V(TX-.26,.035,k*.27),V(TX+.28,.035,k*.27),.04,mats.frame);
    railIn(tower,V(STACK_X,.10,k*.15),V(STACK_X,1.4,k*.15),.012,mats.chrome);});
  railIn(tower,V(TX-.2,2.15,-.27),V(TX-.2,2.15,.27),.03,mats.frame);
  /* guia vertical do carro (na frente da torre) */
  [-1,1].forEach(k=>railIn(tower,V(TX-.24,.1,k*.1),V(TX-.24,2.1,k*.1),.018,mats.chrome));
  const PL_T=.045,PL_GAP=.004,NPL=10,PL_Y0=.13,SEL=4;
  const plates=[];
  for(let i=0;i<NPL;i++){const pl=meshIn(tower,new THREE.BoxGeometry(.24,PL_T,.42),mats.plate);const y=PL_Y0+i*(PL_T+PL_GAP)+PL_T/2;pl.position.set(STACK_X,y,0);pl.userData.y0=y;plates.push(pl);}
  const selIdx=NPL-SEL;
  const selRod=meshIn(tower,new THREE.CylinderGeometry(.009,.009,1,10),mats.chrome);
  const pin=new THREE.Group();tower.add(pin);
  { const sh=meshIn(pin,new THREE.CylinderGeometry(.007,.007,.16,10),mats.chrome);sh.rotation.z=Math.PI/2;sh.position.x=-.03;
    const kn=meshIn(pin,new THREE.SphereGeometry(.018,14,10),mats.lock);kn.position.x=-.12; }
  const capP=meshIn(tower,new THREE.BoxGeometry(.10,.035,.10),mats.steel);
  const cableMat=new THREE.MeshStandardMaterial({color:0x2b2f34,roughness:.5,metalness:.4});
  const cable=meshIn(grp,new THREE.CylinderGeometry(.0045,.0045,1,6),cableMat,false);
  const TP=V(TX,2.08,0);{const w=meshIn(tower,new THREE.CylinderGeometry(.045,.045,.03,22),mats.steel);w.rotation.x=Math.PI/2;w.position.copy(TP);}
  /* carro deslizante com braço, almofadas de ombro, alças e trava */
  const carriage=new THREE.Group();grp.add(carriage);
  const cbox=meshIn(carriage,new THREE.BoxGeometry(.10,.22,.30),mats.frame);
  const armBeam=meshIn(carriage,new THREE.BoxGeometry(1,.05,.05),mats.frame);
  const yoke=meshIn(carriage,new THREE.BoxGeometry(.05,.05,.46),mats.frame);
  const pads=[-1,1].map(k=>{const p=meshIn(carriage,new THREE.CylinderGeometry(.055,.055,.17,20),mats.pad);p.rotation.z=Math.PI/2;return p;});
  const handles=[-1,1].map(k=>meshIn(carriage,new THREE.CylinderGeometry(.016,.016,.13,12),mats.chrome));
  const hbars=[-1,1].map(k=>meshIn(carriage,new THREE.CylinderGeometry(.014,.014,1,10),mats.frame));
  const adj=meshIn(carriage,new THREE.CylinderGeometry(.02,.02,.06,12),mats.lock);
  const lockLv=meshIn(carriage,new THREE.CylinderGeometry(.011,.011,.16,10),mats.lock);

  const KEYS=[
   {t:0,   title:'Alongamento inicial',d:'Calcanhares abaixo da plataforma, apoio na parte da frente dos pés, joelhos estendidos, tornozelos em dorsiflexão controlada.'},
   {t:.7,  title:'Início da subida',d:'Começa a flexão plantar: os calcanhares sobem; gastrocnêmio e sóleo contraem.',ph:'conc'},
   {t:1.05,title:'Elevação intermediária',d:'Calcanhares chegando ao nível da plataforma; joelhos e quadril estáveis.',ph:'conc'},
   {t:1.35,title:'Elevação avançada',d:'Calcanhares acima da plataforma, corpo subindo sobre a frente dos pés.',ph:'conc'},
   {t:1.9, title:'Contração máxima',d:'Maior elevação confortável dos calcanhares, flexão plantar máxima controlada. Pausa breve.'},
   {t:2.7, title:'Início da descida',d:'Calcanhares começam a descer devagar: fase excêntrica do gastrocnêmio e do sóleo.',ph:'ecc'},
   {t:3.87,title:'Retorno intermediário',d:'Calcanhares de volta ao nível da plataforma; tornozelos perto da posição neutra.',ph:'ecc'},
   {t:4.25,title:'Alongamento avançado',d:'Calcanhares passando abaixo da plataforma, dorsiflexão progressiva.',ph:'ecc'},
   {t:4.9, title:'Posição inicial',d:'Calcanhares abaixo da plataforma, sem quicar nem relaxar de uma vez.'},
  ];
  const T_END=5.3;
  const pBase=t=>t<.4?0:t<1.9?ease((t-.4)/1.5):t<2.4?1:t<4.9?1-ease((t-2.4)/2.5):0;
  const pBounce=t=>t<.4?0:t<1.9?ease((t-.4)/1.5):t<2.4?1:t<2.9?1-Math.pow((t-2.4)/.5,2)*1.1:t<3.1?-.1+.25*Math.sin(Math.PI*(t-2.9)/.2):0;
  const ERR={
    joelhos:{name:'Impulso com os joelhos',fix:'Joelhos estendidos (0–10°) e parados; só o tornozelo se move.'},
    balanco:{name:'Balanço do tronco',fix:'Tronco vertical e parado sob as almofadas.'},
    quadril:{name:'Quadril inclinado',fix:'Quadril alinhado ao tronco, sem dobrar para a frente.'},
    pontas:{name:'Apoio só nas pontas dos dedos',fix:'Apoie a parte da frente do pé inteira (região dos metatarsos) na plataforma.'},
    quique:{name:'Quicar embaixo',fix:'Desça devagar e pare no alongamento, sem quique.'},
    amplitude:{name:'Amplitude exagerada',fix:'Suba e desça só até onde o tornozelo vai com conforto.'},
    rotacao:{name:'Pés girados demais',fix:'Pés paralelos ou só um pouco para fora.'},
    unilateral:{name:'Um lado subindo mais',fix:'Os dois calcanhares sobem e descem juntos.'},
  };
  let errMode=null;

  function solveCalf(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let ph0=PH0, ph1=PH1, knee=3, lean=0, hipF=0, ballX=.035, toe=8, lagL=0;
    if(err==='joelhos')knee=3+amt*24*Math.max(0,Math.sin(Math.PI*Math.min(1,(p+.1)*1.8)))*(p<.55?1:0);
    if(err==='balanco')lean=amt*(-8*Math.sin(Math.PI*p));
    if(err==='quadril')hipF=amt*18*sstep(.1,.8,p);
    if(err==='pontas')ballX=.035+amt*.075;
    if(err==='amplitude'){ph0=PH0+amt*12;ph1=PH1-amt*12;}
    if(err==='rotacao')toe=8+amt*32;
    if(err==='unilateral')lagL=amt;
    const sides=[1,-1].map(s=>{
      const pp=(s<0&&lagL)?p*(1-.45*lagL):p;
      const ph=(ph0+(ph1-ph0)*pp)*DEG;
      const td=V(Math.cos(toe*DEG),0,Math.sin(toe*DEG)*s).normalize();
      const fwd=td.clone().multiplyScalar(Math.cos(ph)).addScaledVector(YUP,Math.sin(ph));
      const up=YUP.clone().multiplyScalar(Math.cos(ph)).addScaledVector(td,-Math.sin(ph));
      const B=V(EDGE+ballX,PLAT_Y,FOOTZ*s);
      const A=sum(B,1,fwd,-BALL,up,.085);
      return {s,A,qF:alignQ(YUP,ZAX,up,fwd),ph};});
    const Ay=(sides[0].A.y+sides[1].A.y)/2, Ax=(sides[0].A.x+sides[1].A.x)/2;
    const kr=knee*DEG;
    const K=V(Ax+LEN.sn*Math.sin(kr),Ay+LEN.sn*Math.cos(kr),0);
    const P=sum(K,1,V(Math.sin(-kr),Math.cos(-kr),0),LEN.th*.998);
    const a=(lean+hipF)*DEG;
    const u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,-hipF*.5*DEG);
    const side=[];
    sides.forEach((sd,i)=>{const s=sd.s,m=-s;
      const Sj=mapT(L('Sj',m));
      const H=sum(Sj,1,XAX,.30,YUP,-.50,ZAX,.10*s);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,sum(XAX,-1,ZAX,.5*s),ZAX.clone().multiplyScalar(-s));
      const hip=mapT(L('Hip',m));
      const Kk=legBones(bones,qT,s,hip,sd.A,sum(XAX,1,ZAX,.08*s),sd.qF);
      side.push({s,m,Sj,E,H,hip,K:Kk,A:sd.A,qFT,ph:sd.ph/DEG});
    });
    const nk=mapT(L('neck'));
    return {u,n,P,side,bones,lean:lean+hipF,knee,neck:nk};
  }
  const ref=solveCalf({p:0,err:null,amt:0});
  const shTop=ref.side.map(sd=>sd.Sj.clone());
  const refNeck=ref.neck.clone();

  /* --- Guias --- */
  const heelPath=[];for(let k=0;k<=24;k++){const J=solveCalf({p:k/24,err:null,amt:0});const A=J.side[0].A;heelPath.push(V(A.x-.07,A.y-.07,.30));}
  lineIn(statics,heelPath);
  lineIn(statics,[V(-.3,PLAT_Y,.32),V(EDGE+.42,PLAT_Y,.32)]);
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.12,0xffffff,.045,.035);guides.add(arrow);
  const ankArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(ankArc);
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=ref, prevA=V(0,0,0);
  const GT=[{label:'Nível da plataforma',pos:()=>V(-.28,PLAT_Y+.03,.32),views:['lateral']}];
  const PARTS=[
    {label:'Plataforma',pos:()=>V(EDGE+.3,PLAT_Y+.02,.3)},
    {label:'Almofadas dos ombros',pos:()=>S.side[0].Sj.clone().add(V(0,.13,.06))},
    {label:'Carro deslizante',pos:()=>V(TX-.26,S.neck.y+.08,.16)},
    {label:'Alças',pos:()=>S.side[0].H.clone().add(V(0,-.06,.05))},
    {label:'Regulagem de altura',pos:()=>V(TX-.30,S.neck.y-.12,.06)},
    {label:'Trava de segurança',pos:()=>V(TX-.36,S.neck.y-.03,-.14)},
    {label:'Torre de pesos',pos:()=>V(TX,1.5,.27)},
    {label:'Pino seletor',pos:()=>pin.position.clone().add(V(-.12,0,0))},
  ];

  return {
    id:'panturrilha', title:'Panturrilha em Pé 3D',
    eyebrow:'Treino · Panturrilhas', h1:'Panturrilha em pé na máquina',
    specs:'<span>Tornozelo <b>20° dorsiflexão → 35° flexão plantar</b></span><span>Joelhos <b>estendidos</b></span>',
    groups:{p:{label:'Principais',col:'--red'},s:{label:'Sóleo',col:'--orange'},e:{label:'Auxiliares',col:'--yellow'},d:{label:'Estabilizadores',col:'--blue'},n:{label:'Tendão (tecido conjuntivo, não é músculo)',col:'--muted'}},
    strongE:true,
    muscles:[
     {id:'gastroMed',name:'Gastrocnêmio — cabeça medial',g:'p',col:'--red',tag:'Gastrocnêmio medial'},
     {id:'gastroLat',name:'Gastrocnêmio — cabeça lateral',g:'p',col:'--red',tag:'Gastrocnêmio lateral'},
     {id:'soleo',name:'Sóleo',g:'s',col:'--orange',tag:'Sóleo'},
     {id:'fibular',name:'Fibulares longo e curto',g:'e',col:'--yellow',tag:'Fibulares'},
     {id:'tibPost',name:'Tibial posterior, flexores longos dos dedos e do hálux, plantar delgado (profundos)',g:'e',col:'--yellow'},
     {id:'gluteoMed',name:'Estabilizadores do quadril',g:'d',col:'--blue'},
     {id:'reto',name:'Abdômen',g:'d',col:'--blue'},{id:'eretor',name:'Eretores (tronco)',g:'d',col:'--blue'},
     {id:'peIntr',name:'Musculatura do pé e do tornozelo',g:'d',col:'--blue'},
     {id:'aquiles',name:'Tendão calcâneo (de Aquiles)',g:'n',col:'--tendon',tag:'Tendão de Aquiles'},
    ],
    muscleTarget(m,kind){if(m.g==='p'||m.g==='s')return kind==='conc'?1:kind==='ecc'?.85:kind==='hold'?.85:.4;if(m.g==='e')return kind==='conc'?.7:.45;if(m.g==='d')return .3;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'ankle',label:'Tornozelo'},{id:'heel',label:'Calcanhar × plataforma'},{id:'knee',label:'Joelhos'}],
    views:{lateral:{pos:V(.2,1.05,3.5),tgt:V(.2,1.0,0)},posterior:{pos:V(-2.2,.85,.25),tgt:V(0,.55,0)},
      diagonal:{pos:V(-1.9,1.6,2.3),tgt:V(.15,1.05,0)},anatomia:{pos:V(-.95,.55,.75),tgt:V(-.05,.38,0)}},
    portrait:1.6, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>A máquina</h2><dl class="params">
          <dt>Plataforma</dt><dd>Degrau para a frente dos pés; os calcanhares ficam livres para descer além da borda.</dd>
          <dt>Almofadas</dt><dd>Apoiadas em cima dos ombros, presas ao carro deslizante.</dd>
          <dt>Carro deslizante</dt><dd>Sobe e desce numa guia vertical junto com o corpo.</dd>
          <dt>Regulagem</dt><dd>Ajusta a altura das almofadas para os joelhos ficarem estendidos.</dd>
          <dt>Alças</dt><dd>Só para equilíbrio.</dd>
          <dt>Trava de segurança</dt><dd>Segura o carro antes e depois da série.</dd>
          <dt>Torre e pino</dt><dd>As placas acima do pino sobem junto com o carro.</dd></dl>
          <p class="small" style="margin:10px 0 0">Ligue <b>Peças da máquina</b> abaixo da cena para ver os nomes no 3D.</p></section>
          <section class="card"><h2>Posição e movimento</h2><dl class="params">
          <dt>Pés</dt><dd>Na largura do quadril, paralelos ou um pouco para fora; a parte da frente na plataforma.</dd>
          <dt>Joelhos</dt><dd>Estendidos ou levemente flexionados (0–10°), sem mudar.</dd>
          <dt>Tronco</dt><dd>Vertical, coluna neutra, abdômen firme, olhar à frente.</dd>
          <dt>Braços</dt><dd>Mãos nas alças, cotovelos levemente flexionados, só para estabilizar.</dd>
          <dt>Subida</dt><dd>Empurre com a frente dos pés: flexão plantar até a maior elevação confortável.</dd>
          <dt>Descida</dt><dd>Lenta, com dorsiflexão controlada até abaixo da plataforma, sem quicar.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div>
          <p class="small" style="margin:10px 0 0">Também evite encolher os ombros contra as almofadas.</p></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='quique'&&rep)?pBounce(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solveCalf({p,err,amt});
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Flexão plantar · concêntrica',cue:'Gastrocnêmio e sóleo elevam os calcanhares; o tendão de Aquiles transmite a força ao calcâneo.'};
      if(J.v<-.05)return {kind:'ecc',label:'Dorsiflexão controlada · excêntrica',cue:'As panturrilhas continuam ativas controlando a descida.'};
      if(J.p>.5)return {kind:'hold',label:'Contração máxima',cue:'Calcanhares no alto, joelhos estendidos.'};
      return {kind:'hold',label:'Alongamento inicial',cue:'Calcanhares abaixo da plataforma, sem quicar.'};},
    update(J,t,ph){
      /* carro e almofadas acompanham os ombros */
      const dy=J.neck.y-refNeck.y;
      const Sm=J.side[0].Sj.clone().add(J.side[1].Sj).multiplyScalar(.5);
      const padY=Sm.y+.10;
      cbox.position.set(TX-.30,padY-.05,0);
      armBeam.position.set((TX-.30+Sm.x)/2,padY+.03,0);armBeam.scale.x=Math.abs(TX-.30-Sm.x)+.05;
      yoke.position.set(Sm.x-.02,padY+.03,0);
      J.side.forEach((sd,i)=>{const pd=pads[i];pd.position.set(sd.Sj.x-.02,padY,sd.s*.13);});
      J.side.forEach((sd,i)=>{const h=handles[i];h.position.copy(sd.H);h.quaternion.setFromUnitVectors(YUP,ZAX.clone().applyQuaternion(sd.qFT));
        seg(hbars[i],sd.H,V(TX-.30,padY-.1,sd.s*.13));});
      adj.position.set(TX-.36,padY-.12,0);adj.rotation.z=Math.PI/2;
      lockLv.position.set(TX-.36,padY-.03,-.12);lockLv.rotation.z=Math.PI/2.6;
      const lift=Math.max(0,.02+dy);
      plates.forEach((pl,i)=>{pl.position.y=pl.userData.y0+(i>=selIdx?lift:0);});
      const topY=plates[NPL-1].position.y+PL_T/2;
      capP.position.set(STACK_X,topY+.0175,0);
      seg(cable,V(STACK_X,topY+.035,0),sum(TP,1,YUP,-.045));
      seg(selRod,V(STACK_X,topY,0),V(STACK_X,plates[selIdx].position.y-.02,0));
      pin.position.set(STACK_X-.10,plates[selIdx].position.y,0);
      const R=J.side[0];
      const heel=V(R.A.x-.07,R.A.y-.07,.30);
      const mov=Math.abs(J.v)>.05&&statics.visible;arrow.visible=mov;
      if(mov){arrow.position.copy(heel.clone().add(V(-.06,0,0)));arrow.setDirection(J.v>0?YUP:YUP.clone().negate());arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const shin=R.K.clone().sub(R.A);
      const fwd=V(Math.cos(R.ph*DEG),Math.sin(R.ph*DEG),0);
      arc(ankArc,R.A,shin,fwd,V(0,0,.09),.09);
      const angTxt=R.ph>1?`${Math.round(R.ph)}° dorsiflexão`:R.ph<-1?`${Math.round(-R.ph)}° flexão plantar`:'neutro';
      const heelH=Math.round(((R.A.y-.07)-PLAT_Y)*100);
      const ks=J.knee<=10?'ok':'warn';
      return {ankle:{v:angTxt,s:''},heel:{v:(heelH>0?'+':'')+heelH+' cm',s:''},knee:{v:Math.round(J.knee)+'°',s:ks}};
    },
    viewChanged(v){statics.visible=v==='lateral'||v==='diagonal';ankArc.visible=v!=='posterior';},
  };
})();

// #region: ex-chp
/* ====================================================================================
   SUPINO NA MÁQUINA — supino horizontal sentado, braços articulados convergentes, pegada neutra
   Pessoa de frente para +X, lado direito = +Z. Cada pegador gira em volta de um eixo fixo
   (acima, atrás e por fora do ombro): a trajetória é um arco que avança e converge.
   ==================================================================================== */
const CHP=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const SEAT_Y=.46, P0=V(0,.58,0), LEAN0=-7, FOOTZ=.17, TOE=8*DEG;
  const kneeDist=k=>Math.sqrt(LEN.th**2+LEN.sn**2-2*LEN.th*LEN.sn*Math.cos(k*DEG));
  const AX=Math.sqrt(kneeDist(90)**2-(P0.y-.085)**2-(FOOTZ-.095)**2);
  const toeDir=s=>V(Math.cos(TOE),0,Math.sin(TOE)*s);
  const frameOf=a=>{const r=a*DEG;return {u:V(Math.sin(r),Math.cos(r),0),n:V(Math.cos(r),-Math.sin(r),0)};};
  const F0=frameOf(LEAN0);
  const mapT0=torsoBones(new Array(NB),torsoQ(F0.u,F0.n),P0,0);
  /* trajetória do pegador direito: início com cotovelo a ~92° e fim com ~15° de flexão */
  const reach=f=>Math.sqrt(LEN.ua**2+LEN.fa**2-2*LEN.ua*LEN.fa*Math.cos((180-f)*DEG));
  const SJ0=mapT0(L('Sj',-1));
  const H0R=SJ0.clone().add(V(.30,-.14,.30).normalize().multiplyScalar(reach(92)));
  const H1R=SJ0.clone().add(V(.62,-.12,-.07).normalize().multiplyScalar(reach(15)));
  const mir=v=>V(v.x,v.y,-v.z);
  /* eixo de cada braço articulado: equidistante do início e do fim, normal ao plano do arco */
  const ARM=[1,-1].map(s=>{
    const H0=s>0?H0R.clone():mir(H0R), H1=s>0?H1R.clone():mir(H1R);
    const mid=H0.clone().add(H1).multiplyScalar(.5), dd=H1.clone().sub(H0).normalize();
    const Q=SJ0.clone().add(V(-.16,.60,.40));if(s<0)Q.z*=-1;
    Q.addScaledVector(dd,-Q.clone().sub(mid).dot(dd));
    const W=new THREE.Vector3().crossVectors(H0.clone().sub(Q),H1.clone().sub(Q)).normalize();
    const TH=H0.clone().sub(Q).angleTo(H1.clone().sub(Q));
    return {s,H0,H1,Q,W,TH};});
  const qArm=(a,p)=>new THREE.Quaternion().setFromAxisAngle(a.W,a.TH*p);
  const handle=(a,p)=>a.Q.clone().add(a.H0.clone().sub(a.Q).applyQuaternion(qArm(a,p)));

  /* --- Máquina --- */
  const fixed=new THREE.Group();grp.add(fixed);
  const QX=ARM[0].Q.x, QY=ARM[0].Q.y, QZ=Math.abs(ARM[0].Q.z);
  const SIDE=QZ+.07;
  /* base */
  [-1,1].forEach(k=>{railIn(fixed,V(-1.12,.04,k*SIDE),V(.22,.04,k*SIDE),.04,mats.frame);});
  [-1.12,-.02].forEach(x=>railIn(fixed,V(x,.04,-SIDE),V(x,.04,SIDE),.035,mats.frame));
  /* assento regulável: tubo externo, tubo interno com furos e pino de regulagem */
  const seatG=new THREE.Group();grp.add(seatG);
  railIn(fixed,V(0,.04,0),V(0,.27,0),.048,mats.frame);
  railIn(seatG,V(0,.22,0),V(0,SEAT_Y-.075,0),.033,mats.steel);
  [.30,.335,.37].forEach(y=>{const h=meshIn(seatG,new THREE.CylinderGeometry(.008,.008,.012,10),mats.plate,false);h.rotation.z=Math.PI/2;h.position.set(.033,y,0);});
  const seatPin=new THREE.Group();fixed.add(seatPin);
  { const sh=meshIn(seatPin,new THREE.CylinderGeometry(.008,.008,.09,10),mats.chrome);sh.rotation.z=Math.PI/2;sh.position.set(.075,.25,0);
    const kn=meshIn(seatPin,new THREE.SphereGeometry(.024,14,10),mats.lock);kn.position.set(.125,.25,0); }
  const seatPlate=meshIn(seatG,new THREE.BoxGeometry(.34,.018,.30),mats.frame);seatPlate.position.set(.03,SEAT_Y-.08,0);
  const seat=meshIn(seatG,new THREE.BoxGeometry(.42,.07,.38),mats.pad);seat.position.set(.03,SEAT_Y-.035,0);
  /* encosto e apoio de cabeça */
  const BACK=.165, bq=new THREE.Quaternion().setFromAxisAngle(ZAX,-LEAN0*DEG);
  const backPad=meshIn(fixed,new THREE.BoxGeometry(.07,.80,.36),mats.pad);backPad.position.copy(sum(P0,1,F0.u,.43,F0.n,-BACK));backPad.quaternion.copy(bq);
  const headPad=meshIn(fixed,new THREE.BoxGeometry(.07,.20,.24),mats.pad);headPad.position.copy(sum(P0,1,F0.u,1.00,F0.n,-BACK-.01));headPad.quaternion.copy(bq);
  const upB=sum(P0,1,F0.n,-BACK-.09);upB.y=.04;
  const upT=sum(P0,1,F0.u,1.06,F0.n,-BACK-.09);
  railIn(fixed,upB,upT,.04,mats.frame);
  railIn(fixed,sum(P0,1,F0.u,.12,F0.n,-BACK-.09),sum(P0,1,F0.u,.12,F0.n,-BACK-.04),.03,mats.frame);
  railIn(fixed,sum(P0,1,F0.u,.78,F0.n,-BACK-.09),sum(P0,1,F0.u,.78,F0.n,-BACK-.04),.03,mats.frame);
  /* travessa superior com os eixos dos braços e colunas laterais */
  railIn(fixed,upT,V(QX,QY+.10,0),.035,mats.frame);
  railIn(fixed,V(QX,QY+.10,-SIDE),V(QX,QY+.10,SIDE),.04,mats.frame);
  [-1,1].forEach(k=>{railIn(fixed,V(QX,.04,k*SIDE),V(QX,QY+.10,k*SIDE),.04,mats.frame);
    railIn(fixed,V(QX,QY+.10,k*SIDE),V(QX,QY,k*QZ),.03,mats.frame);});
  /* torre de pesos atrás do encosto */
  const STACK_X=-.88, PL_T=.045, PL_GAP=.004, NPL=14, PL_Y0=.13, SEL=5, TOP_Y=1.86;
  const tower=new THREE.Group();grp.add(tower);
  [-1,1].forEach(k=>{railIn(tower,V(-1.08,.04,k*.25),V(-1.08,TOP_Y,k*.25),.035,mats.frame);railIn(tower,V(-.68,.04,k*.25),V(-.68,TOP_Y,k*.25),.035,mats.frame);
    railIn(tower,V(-1.08,TOP_Y,k*.25),V(-.68,TOP_Y,k*.25),.03,mats.frame);
    railIn(tower,V(STACK_X,.10,k*.13),V(STACK_X,TOP_Y-.12,k*.13),.012,mats.chrome);});
  railIn(tower,V(-1.08,TOP_Y,-.25),V(-1.08,TOP_Y,.25),.03,mats.frame);railIn(tower,V(-.68,TOP_Y,-.25),V(-.68,TOP_Y,.25),.03,mats.frame);
  railIn(tower,V(-.68,1.20,0),upB.clone().lerp(upT,(1.0-upB.y)/(upT.y-upB.y)),.03,mats.frame);
  const shroud=meshIn(tower,new THREE.BoxGeometry(.02,1.5,.50),mats.frame);shroud.position.set(-1.12,.95,0);
  const PT=[1,-1].map(k=>V(STACK_X,TOP_Y-.06,k*.07));
  PT.forEach(p=>{const w=meshIn(tower,new THREE.CylinderGeometry(.045,.045,.025,24),mats.steel);w.rotation.x=Math.PI/2;w.position.copy(p);});
  const plates=[];
  for(let i=0;i<NPL;i++){const pl=meshIn(tower,new THREE.BoxGeometry(.22,PL_T,.40),mats.plate);const y=PL_Y0+i*(PL_T+PL_GAP)+PL_T/2;pl.position.set(STACK_X,y,0);pl.userData.y0=y;plates.push(pl);}
  const selIdx=NPL-SEL;
  const selRod=meshIn(tower,new THREE.CylinderGeometry(.009,.009,1,10),mats.chrome);
  const pin=new THREE.Group();tower.add(pin);
  { const sh=meshIn(pin,new THREE.CylinderGeometry(.007,.007,.16,10),mats.chrome);sh.rotation.z=Math.PI/2;sh.position.x=.03;
    const kn=meshIn(pin,new THREE.SphereGeometry(.018,14,10),mats.lock);kn.position.x=.12; }
  const cap=meshIn(tower,new THREE.BoxGeometry(.10,.035,.18),mats.steel);
  const cableMat=new THREE.MeshStandardMaterial({color:0x2b2f34,roughness:.5,metalness:.4});
  const cable=[0,1,2,3].map(()=>meshIn(grp,new THREE.CylinderGeometry(.0045,.0045,1,6),cableMat,false));

  /* braços articulados (giram em volta do eixo) + pegadores com articulação (ficam na vertical) */
  const grip=new THREE.MeshStandardMaterial({color:0x17191c,roughness:.85});
  const LEV=ARM.map(a=>{
    const g=new THREE.Group();g.position.copy(a.Q);grp.add(g);
    const loc=v=>v.clone().sub(a.Q);
    const S0=a.H0.clone().add(V(0,0,.085*a.s));
    const top=S0.clone().add(V(-.03,.24,.03*a.s));
    const hub=meshIn(g,new THREE.CylinderGeometry(.045,.045,.11,20),mats.steel);hub.quaternion.setFromUnitVectors(YUP,a.W);
    const cam=meshIn(g,new THREE.CylinderGeometry(.085,.085,.02,28),mats.steel);cam.quaternion.setFromUnitVectors(YUP,a.W);cam.position.copy(a.W.clone().multiplyScalar(-.075*a.s));
    railIn(g,V(0,0,0),loc(top),.022,mats.frame);
    railIn(g,loc(top),loc(S0).add(V(0,0,.035*a.s)),.019,mats.frame);
    const brg=meshIn(g,new THREE.CylinderGeometry(.022,.022,.04,14),mats.chrome);brg.position.copy(loc(S0).add(V(0,0,.018*a.s)));brg.rotation.x=Math.PI/2;
    const adj=new THREE.Group();g.add(adj);
    { const rod=meshIn(adj,new THREE.CylinderGeometry(.009,.009,.13,10),mats.chrome);rod.position.set(0,.08,0);
      const kn=meshIn(adj,new THREE.SphereGeometry(.022,14,10),mats.lock);kn.position.set(0,.15,0);
      adj.quaternion.setFromUnitVectors(YUP,V(-.6,.7,0).normalize());adj.position.copy(a.W.clone().multiplyScalar(.07*a.s)); }
    /* pegador em "U": barra vertical + duas hastes até a articulação */
    const U=new THREE.Group();grp.add(U);
    const gb=meshIn(U,new THREE.CylinderGeometry(.019,.019,.15,16),grip);
    [-1,1].forEach(k=>{const st=meshIn(U,new THREE.CylinderGeometry(.011,.011,1,10),mats.chrome);seg(st,V(0,k*.083,0),V(.085,k*.083,0));});
    const con=meshIn(U,new THREE.CylinderGeometry(.012,.012,.18,10),mats.chrome);con.position.set(.085,0,0);
    return {g,U,a,S0};});
  const CAM_R=.10, LIFT=.36;

  /* --- Linha do tempo --- */
  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Sentado, costas no encosto, pés no chão. Pegadores na altura do meio do peito, cotovelos com ~80–100° de flexão.'},
   {t:1.05,title:'Início do empurrar',d:'Os cotovelos começam a estender (~70–85° de flexão) e os pegadores avançam.',ph:'conc'},
   {t:1.35,title:'Empurrar intermediário',d:'Cotovelos com ~55–70° de flexão; o peitoral começa a contrair.',ph:'conc'},
   {t:1.62,title:'Empurrar avançado',d:'Cotovelos com ~30–45° de flexão; os pegadores se aproximam da frente do corpo.',ph:'conc'},
   {t:2.15,title:'Extensão final',d:'Braços quase estendidos, cotovelos com 10–20° de flexão, pegadores à frente do tórax. Pausa curta.'},
   {t:2.6, title:'Início do retorno',d:'Os cotovelos começam a flexionar devagar e os pegadores voltam em direção ao tórax.',ph:'ecc'},
   {t:3.2, title:'Retorno intermediário',d:'Cotovelos com ~45–60° de flexão; os braços se afastam da linha central.',ph:'ecc'},
   {t:3.8, title:'Retorno avançado',d:'Cotovelos com ~70–85° de flexão; os pegadores chegam perto da posição inicial.',ph:'ecc'},
   {t:5.0, title:'Posição inicial',d:'Cotovelos de volta a ~80–100°, pegadores perto do tórax, peso sem encostar na pilha. Repetição completa.'},
  ];
  const T_END=5.2, PUSH0=.4, PUSH1=2.0, RET0=2.4, RET1=4.9;
  const pBase=t=>t<PUSH0?0:t<PUSH1?ease((t-PUSH0)/(PUSH1-PUSH0)):t<RET0?1:t<RET1?1-ease((t-RET0)/(RET1-RET0)):0;
  function pDrop(t){if(t<RET0)return pBase(t);if(t<2.85){const s=(t-RET0)/.45;return 1-s*s;}if(t<3.05)return .06*Math.sin(Math.PI*(t-2.85)/.2);return 0;}
  function pKick(t){if(t<PUSH0)return 0;if(t<1.05){const s=(t-PUSH0)/.65;return Math.min(1,s*(2-s)*1.02);}return pBase(Math.max(t,PUSH1));}
  const ERR={
    tronco:{name:'Tronco saindo do encosto',fix:'Costas inteiras no encosto do início ao fim; só os braços se movem.'},
    lombar:{name:'Hiperextensão lombar',fix:'Glúteos no fundo do assento e lombar apoiada, sem arquear para empurrar.'},
    ombros:{name:'Ombros elevados',fix:'Ombros baixos e longe das orelhas, escápulas encaixadas no encosto.'},
    cotovelos:{name:'Cotovelos muito abertos',fix:'Cotovelos abaixo da linha dos ombros, braços a 30–60° do tronco, seguindo os pegadores.'},
    punhos:{name:'Punhos dobrados',fix:'Punho reto, alinhado com o antebraço, empurrando com a palma.'},
    travar:{name:'Travamento dos cotovelos',fix:'Pare a extensão com 10–20° de flexão nos cotovelos, sem forçar a trava.'},
    pernas:{name:'Impulso das pernas',fix:'Pés apoiados e quadril parado no assento; a força vem do peito e dos braços.'},
    cabeca:{name:'Cabeça projetada para a frente',fix:'Cabeça encostada e alinhada ao tronco, olhando para a frente.'},
    assento:{name:'Assento baixo demais',fix:'Regule o assento até os pegadores ficarem na altura do meio do peito.'},
    brusco:{name:'Retorno sem controle',fix:'Volte em cerca de 2,5 s, sem deixar as placas baterem na pilha.'},
  };
  let errMode=null, wristA=0;
  const W_REST=[1,-1].map(m=>L('E',m).lerp(L('G',m),.82));

  function solveChp(st){
    const {p,err,amt,kick}=st;
    const bones=new Array(NB);
    let lean=LEAN0, head=0, shUp=0, flare=0, pp=p;
    const Pd=V(0,0,0);let drop=0;
    if(err==='tronco')lean+=amt*(3+10*sstep(.05,.9,p));
    if(err==='lombar'){const k=amt*sstep(.05,.8,p);lean-=7*k;Pd.x+=.075*k;Pd.y+=.012*k;}
    if(err==='ombros')shUp=amt*sstep(.05,.8,p)*.06;
    if(err==='cotovelos')flare=amt;
    if(err==='cabeca')head=amt*(.4+.6*sstep(.05,.7,p));
    if(err==='pernas'){Pd.y+=.05*kick;Pd.x+=.035*kick;lean+=6*kick;}
    if(err==='assento')drop=.10*amt;
    if(err==='travar')pp=p+amt*.035*sstep(.75,1,p);
    const F=frameOf(lean);
    const P=P0.clone().add(Pd);P.y-=drop;
    const qT=torsoQ(F.u,F.n);
    const mapT=torsoBones(bones,qT,P,(-4+8*head)*DEG);
    if(head>0){const fw=F.n.clone().multiplyScalar(.065*head);bones[1].pt=bones[1].pt.clone().addScaledVector(fw,.5);bones[2].pt=bones[2].pt.clone().add(fw);}
    const side=[];
    ARM.forEach((a,i)=>{const s=a.s,m=-s;
      const Sj=mapT(L('Sj',m)).addScaledVector(F.u,shUp);
      const H=handle(a,Math.min(pp,1.08));
      const pole=sum(F.n,-.55,F.u,-1.0+1.6*flare,ZAX,s*(1.0+.8*flare));
      const {E,qFT}=armBones(bones,qT,s,Sj,H,pole,ZAX.clone().multiplyScalar(-s));
      const hip=mapT(L('Hip',m));
      const A=V(AX,.085,FOOTZ*s);
      const K=legBones(bones,qT,s,hip,A,sum(YUP,1,toeDir(s),.25),alignQ(YUP,ZAX,YUP,toeDir(s)));
      side.push({s,m,Sj,E,H,hip,K,A,qFT});});
    return {u:F.u,n:F.n,P,side,bones,lean,drop,pp};
  }

  /* --- Guias --- */
  const paths=ARM.map(a=>{const pts=[];for(let k=0;k<=30;k++)pts.push(handle(a,k/30));return lineIn(statics,pts);});
  const arrows=[0,1].map(()=>{const a=new THREE.ArrowHelper(XAX,V(0,0,0),.15,0xffffff,.05,.035);guides.add(a);return a;});
  const prevH=[V(0,0,0),V(0,0,0)];
  const latOnly=new THREE.Group();statics.add(latOnly);
  lineIn(latOnly,[V(H0R.x-.06,H0R.y,.62),V(H1R.x+.06,H1R.y,.62)]);
  const elbArc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(elbArc);
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=solveChp({p:0,err:null,amt:0,kick:0});
  const GT=[
    {label:'Meio do peito',pos:()=>V(H1R.x+.1,H0R.y+.04,.62),views:['lateral']},
    {label:'Pegadores',text:()=>`Pegadores a ${Math.round(S.side[0].H.distanceTo(S.side[1].H)*100)} cm`,pos:()=>S.side[0].H.clone().lerp(S.side[1].H,.5).add(V(0,.17,0)),views:['frontal','diagonal']},
  ];
  const PARTS=[
    {label:'Assento regulável',pos:()=>V(.20,SEAT_Y-.01-S.drop,.20)},
    {label:'Pino de altura do assento',pos:()=>V(.13,.25,.03)},
    {label:'Encosto',pos:()=>sum(P0,1,F0.u,.62,F0.n,-BACK,ZAX,.19)},
    {label:'Pegador (pegada neutra)',pos:()=>S.side[0].H.clone().add(V(.02,-.11,.05))},
    {label:'Braço articulado',pos:()=>LEV[0].g.localToWorld(LEV[0].S0.clone().add(V(-.03,.24,.03)).sub(ARM[0].Q).multiplyScalar(.55))},
    {label:'Eixo de rotação',pos:()=>ARM[0].Q.clone().add(V(0,.08,.04))},
    {label:'Regulagem da posição inicial',pos:()=>ARM[0].Q.clone().add(V(-.12,.20,.08))},
    {label:'Torre de pesos',pos:()=>V(STACK_X,1.35,.26)},
    {label:'Pino seletor',pos:()=>pin.position.clone().add(V(.14,0,0))},
  ];

  const ghostMat=new THREE.MeshStandardMaterial({color:0x8a939e,transparent:true,opacity:.18,depthWrite:false,roughness:.6});
  const nearGhost=[];
  LEV[0].g.traverse(o=>{if(o.isMesh){o.userData.mat=o.material;nearGhost.push(o);}});
  fixed.traverse(o=>{if(o.isMesh&&o.position.z>QZ-.02&&o!==seat){o.userData.mat=o.material;nearGhost.push(o);}});

  return {
    id:'supino-maquina', title:'Supino na Máquina 3D',
    eyebrow:'Treino · Peitoral', h1:'Supino sentado na máquina',
    specs:'<span>Pegada <b>neutra</b></span><span>Braços <b>convergentes</b></span><span>Cotovelos <b>80–100° → 10–20°</b></span><span>Pegadores no <b>meio do peito</b></span>',
    groups:{p:{label:'Principal · peitoral maior',col:'--red'},s:{label:'Secundários',col:'--orange'},d:{label:'Estabilizadores',col:'--blue'}},
    muscles:[
     {id:'pecClav',name:'Peitoral maior · porção clavicular',g:'p',col:'--red',tag:'Peitoral · clavicular'},
     {id:'pecEst',name:'Peitoral maior · porção esternocostal',g:'p',col:'--red',tag:'Peitoral · esternocostal'},
     {id:'tricLong',name:'Tríceps · cabeça longa',g:'s',col:'--orange',tag:'Tríceps'},
     {id:'tricLat',name:'Tríceps · cabeça lateral',g:'s',col:'--orange'},
     {id:'tricMed',name:'Tríceps · cabeça medial',g:'s',col:'--orange'},
     {id:'deltAnt',name:'Deltoide anterior',g:'s',col:'--yellow',tag:'Deltoide anterior'},
     {id:'serratil',name:'Serrátil anterior',g:'d',col:'--blue',tag:'Serrátil'},
     {id:'manguito',name:'Manguito rotador',g:'d',col:'--blue'},
     {id:'trapMed',name:'Trapézio médio',g:'d',col:'--blue'},
     {id:'trapInf',name:'Trapézio inferior',g:'d',col:'--blue'},
     {id:'reto',name:'Reto abdominal',g:'d',col:'--blue'},
     {id:'obliquos',name:'Oblíquos',g:'d',col:'--blue'},
     {id:'eretor',name:'Estabilizadores da coluna',g:'d',col:'--blue'},
    ],
    muscleTarget(m,kind){
      if(m.g==='p')return kind==='conc'?1:kind==='ecc'?.85:kind==='hold'?.6:.35;
      if(m.id==='deltAnt')return kind==='conc'?.9:kind==='ecc'?.7:.45;
      if(m.g==='s')return kind==='conc'?.95:kind==='ecc'?.72:.45;
      return .45;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'elbow',label:'Flexão do cotovelo'},{id:'abd',label:'Braço × tronco · início 30–60°'},{id:'grip',label:'Entre os pegadores'}],
    views:{lateral:{pos:V(.22,1.0,3.0),tgt:V(.12,.86,0)},frontal:{pos:V(2.55,1.3,0),tgt:V(.05,1.0,0)},
      diagonal:{pos:V(1.85,1.55,1.85),tgt:V(-.05,.95,0)},anatomia:{pos:V(1.45,1.45,.75),tgt:V(.1,1.05,0)}},
    portrait:1.6, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>O equipamento</h2><dl class="params">
          <dt>Assento</dt><dd>Regulável: sobe e desce no pino de regulagem. Ajuste antes de começar: pegadores na altura do meio do peito.</dd>
          <dt>Encosto</dt><dd>Vertical e acolchoado, com apoio para a cabeça. As costas ficam nele o tempo todo.</dd>
          <dt>Braços</dt><dd>Articulados: dois braços independentes que giram em volta de um eixo acima dos ombros. A trajetória avança e converge para a frente do peito.</dd>
          <dt>Pegadores</dt><dd>Verticais, pegada neutra (palmas uma de frente para a outra).</dd>
          <dt>Regulagem</dt><dd>Da posição inicial: define onde os braços começam: perto do tórax, sem alongar demais o ombro.</dd>
          <dt>Pesos</dt><dd>Torre de placas com pino seletor: as placas acima do pino sobem quando você empurra.</dd></dl>
          <p class="small" style="margin:10px 0 0">Ligue <b>Peças da máquina</b> abaixo da cena para ver os nomes no 3D.</p></section>
          <section class="card"><h2>Posição inicial</h2><dl class="params">
          <dt>Tronco</dt><dd>Glúteos no fundo do assento, costas e cabeça no encosto, coluna neutra, abdômen firme.</dd>
          <dt>Pés</dt><dd>No chão, na largura dos ombros, joelhos com 80–100° de flexão.</dd>
          <dt>Braços 30–60°</dt><dd>Afastados do tronco, cotovelos abaixo da linha dos ombros.</dd>
          <dt>Cotovelos 80–100°</dt><dd>No início, com os pegadores perto do tórax.</dd>
          <dt>Punhos</dt><dd>Neutros, alinhados com os antebraços.</dd>
          <dt>Final</dt><dd>Cotovelos com 10–20° de flexão residual, pegadores à frente do tórax, ombros parados.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='brusco'&&rep)?pDrop(x):(err==='pernas'&&rep)?pKick(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const kick=(err==='pernas'&&rep&&tr>PUSH0&&tr<1.25)?Math.sin(Math.PI*(tr-PUSH0)/.85):0;
      const J=solveChp({p,err,amt,kick});
      wristA=err==='punhos'?amt*(.35+.65*sstep(.05,.7,p))*32*DEG:0;
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;J.amt=amt;return J;},
    postBones(BM){
      if(wristA<=0)return;
      [1,-1].forEach((m,k)=>{const w=W_REST[k];const q=new THREE.Quaternion().setFromAxisAngle(ZAX,m*wristA);
        const piv=new THREE.Matrix4().makeTranslation(w.x,w.y,w.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-w.x,-w.y,-w.z));
        BM[bi('ft',m)].multiply(piv);BM[bi('fing',m)].multiply(piv);});
    },
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Empurrar · concêntrica',cue:'Adução horizontal do ombro e extensão do cotovelo: peitoral, tríceps e deltoide anterior.'};
      if(J.v<-.05)return {kind:'ecc',label:'Retorno controlado · excêntrica',cue:'Cotovelos flexionam devagar; o peitoral controla a volta dos braços.'};
      if(J.p>.5)return {kind:'hold',label:'Extensão final',cue:'Braços quase estendidos, cotovelos sem travar, costas no encosto.'};
      return {kind:'hold',label:'Posição inicial',cue:'Pegadores no meio do peito, cotovelos a 80–100°, pés no chão.'};},
    update(J,t,ph){
      /* assento acompanha a regulagem (erro "assento baixo") */
      seatG.position.y=-J.drop;
      const lifts=[];
      LEV.forEach((L2,i)=>{const a=L2.a;const pp=Math.min(J.pp,1.08);const q=qArm(a,pp);L2.g.quaternion.copy(q);
        const H=handle(a,pp);
        const lat=V(0,0,a.s).applyQuaternion(q);
        const gd=YUP.clone().addScaledVector(lat,-YUP.dot(lat)).normalize();
        L2.U.position.copy(H);L2.U.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(lat,gd,new THREE.Vector3().crossVectors(lat,gd)));
        /* cabo sai do came em direção à polia da torre */
        const to=PT[i].clone().sub(a.Q);to.addScaledVector(a.W,-to.dot(a.W)).normalize();
        seg(cable[i],a.Q.clone().addScaledVector(a.W,-.075*a.s).addScaledVector(to,CAM_R),PT[i].clone().add(V(.045,0,0)));
        lifts.push(a.TH*pp);});
      const lift=Math.max(0,.012+LIFT*(lifts[0]+lifts[1])/2);
      plates.forEach((pl,i)=>{pl.position.y=pl.userData.y0+(i>=selIdx?lift:0);});
      const topY=plates[NPL-1].position.y+PL_T/2;
      cap.position.set(STACK_X,topY+.0175,0);
      PT.forEach((p,i)=>seg(cable[2+i],p.clone().add(V(-.045,0,0)).setX(STACK_X),V(STACK_X,topY+.035,p.z*.5)));
      seg(selRod,V(STACK_X,topY,0),V(STACK_X,plates[selIdx].position.y-.02,0));
      pin.position.set(STACK_X+.10,plates[selIdx].position.y,0);
      /* setas nos pegadores */
      J.side.forEach((sd,i)=>{const a=arrows[i];const vel=sd.H.clone().sub(prevH[i]);prevH[i].copy(sd.H);
        const mov=Math.abs(J.v)>.05&&vel.lengthSq()>1e-9;a.visible=mov;
        if(mov){a.position.copy(sd.H.clone().add(V(0,.16,0)));a.setDirection(vel.normalize());a.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}});
      const R=J.side[0];
      arc(elbArc,R.E,R.Sj.clone().sub(R.E),R.H.clone().sub(R.E),V(0,0,.08),.09);
      const elbF=180-kneeAngle(R.Sj,R.E,R.H);
      const abd=R.E.clone().sub(R.Sj).angleTo(J.u.clone().negate())/DEG;
      const dist=Math.round(J.side[0].H.distanceTo(J.side[1].H)*100);
      const locked=J.err==='travar'&&J.pp>1.005;
      let es='';if(J.p<.03)es=(elbF>=78&&elbF<=102)?'ok':'warn';else if(J.p>.97)es=locked?'warn':(elbF>=8&&elbF<=22?'ok':'warn');
      return {elbow:{v:locked?'0° (travado)':Math.round(elbF)+'°',s:es},
              abd:{v:Math.round(abd)+'°',s:J.p<.03?((abd>=28&&abd<=62)?'ok':'warn'):''},
              grip:{v:dist+' cm',s:''}};
    },
    viewChanged(v){statics.visible=v!=='anatomia';latOnly.visible=v==='lateral';elbArc.visible=v==='lateral'||v==='diagonal';
      const g=v==='lateral'||v==='anatomia';
      nearGhost.forEach(m=>{m.material=g?ghostMat:m.userData.mat;m.castShadow=!g;});},
  };
})();

// #region: ex-hpt
/* ====================================================================================
   ELEVAÇÃO PÉLVICA COM BARRA (barbell hip thrust)
   Banco atravessado atrás da pessoa (comprimento em Z). Cabeça para −X, peito para cima,
   pés no chão em +X; lado direito = +Z. As costas giram apoiadas na borda do banco.
   ==================================================================================== */
const HPT=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const BENCH_H=.43, BX=-.02, ER=.04, EC=V(BX-ER,BENCH_H-ER,0);
  const CU0=.36, CN=.13, FOOTZ=.19, TOE=10*DEG, AXF=.75, BR_OFF=.18, HANDZ=.31;
  const A0=50, A1=9;
  const toeDir=s=>V(Math.cos(TOE),0,Math.sin(TOE)*s);
  const frameOf=a=>{const r=a*DEG;return {u:V(-Math.cos(r),Math.sin(r),0),n:V(Math.sin(r),Math.cos(r),0)};};

  /* --- Banco reto (atravessado) --- */
  const fixed=new THREE.Group();grp.add(fixed);
  const pad=meshIn(fixed,new THREE.BoxGeometry(.30-ER,.08,1.20),mats.pad);pad.position.set(BX-ER-(.30-ER)/2,BENCH_H-.04,0);
  const edge=meshIn(fixed,new THREE.CylinderGeometry(ER,ER,1.20,20),mats.pad);edge.rotation.x=Math.PI/2;edge.position.copy(EC);
  const under=meshIn(fixed,new THREE.BoxGeometry(.24,.02,1.10),mats.frame);under.position.set(BX-.15,BENCH_H-.09,0);
  [-1,1].forEach(k=>{railIn(fixed,V(BX-.15,.05,k*.45),V(BX-.15,BENCH_H-.10,k*.45),.035,mats.frame);
    railIn(fixed,V(BX-.36,.03,k*.45),V(BX+.06,.03,k*.45),.035,mats.frame);});
  railIn(fixed,V(BX-.15,BENCH_H-.13,-.45),V(BX-.15,BENCH_H-.13,.45),.03,mats.frame);

  /* --- Barra olímpica, anilhas, presilhas e almofada --- */
  const bar=new THREE.Group();grp.add(bar);
  const foam=new THREE.MeshStandardMaterial({color:0x5b7d9c,roughness:.9});
  const bumper=new THREE.MeshStandardMaterial({color:0x1c1e21,roughness:.8,metalness:.05});
  const zc=(len,r,mat,z)=>{const m=meshIn(bar,new THREE.CylinderGeometry(r,r,len,24),mat);m.rotation.x=Math.PI/2;m.position.z=z;return m;};
  zc(1.30,.014,mats.chrome,0);
  zc(.40,.055,foam,0);
  const nearBar=[];
  [-1,1].forEach(k=>{const parts=[zc(.42,.025,mats.chrome,k*.86),zc(.03,.04,mats.chrome,k*.66),
      zc(.055,.225,bumper,k*.71),zc(.055,.225,bumper,k*.768),zc(.025,.035,mats.lock,k*.81)];
    const hub=zc(.115,.06,mats.steel,k*.74);parts.push(hub);
    if(k>0)parts.forEach(m=>nearBar.push(m));});

  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Costas (abaixo das escápulas) na borda do banco, pés no chão, barra sobre a dobra do quadril e pelve perto do solo.'},
   {t:.75, title:'Início da subida',d:'O quadril começa a estender; pelve e barra começam a subir. O glúteo máximo inicia a contração.',ph:'conc'},
   {t:1.0, title:'Elevação intermediária',d:'Pelve a ~25–40% da subida; tronco e coxas começam a se alinhar.',ph:'conc'},
   {t:1.35,title:'Elevação avançada',d:'Pelve a ~60–75% da subida, pés apoiados, joelhos na linha dos pés, coluna neutra.',ph:'conc'},
   {t:2.2, title:'Extensão máxima controlada',d:'Quadril perto da extensão neutra, tronco e coxas alinhados, joelhos a ~90°, canelas quase verticais. Pausa curta.'},
   {t:2.7, title:'Início da descida',d:'O quadril começa a flexionar; pelve e barra descem com os glúteos ainda ativos.',ph:'ecc'},
   {t:3.6, title:'Descida intermediária',d:'A pelve desce aos poucos, com controle e o corpo alinhado.',ph:'ecc'},
   {t:4.15,title:'Descida avançada',d:'A pelve se aproxima da posição inferior e o quadril volta a flexionar.',ph:'ecc'},
   {t:4.8, title:'Posição inicial',d:'Pelve de volta perto do solo, sem deixar a barra despencar. Repetição completa.'},
  ];
  const T_END=5.0, UP0=.4, UP1=1.9, DN0=2.5, DN1=4.7;
  const pBase=t=>t<UP0?0:t<UP1?ease((t-UP0)/(UP1-UP0)):t<DN0?1:t<DN1?1-ease((t-DN0)/(DN1-DN0)):0;
  function pDrop(t){if(t<DN0)return pBase(t);if(t<2.95){const s=(t-DN0)/.45;return 1-s*s;}if(t<3.15)return .05*Math.sin(Math.PI*(t-2.95)/.2);return 0;}
  const ERR={
    hiper:{name:'Hiperextensão lombar no topo',fix:'Pare quando tronco e coxas ficarem alinhados; costelas para baixo e abdômen firme.'},
    cabeca:{name:'Cabeça jogada para trás',fix:'Queixo levemente recolhido, olhando para a frente; a cabeça acompanha o tronco.'},
    calcanhar:{name:'Calcanhares levantando',fix:'Pés inteiros no chão, empurrando pelos calcanhares.'},
    valgo:{name:'Joelhos colapsando para dentro',fix:'Joelhos na direção das pontas dos pés durante toda a subida.'},
    barra:{name:'Barra sobre o abdômen',fix:'Barra na dobra do quadril, entre o tronco e as coxas, com a almofada.'},
    inclinada:{name:'Barra inclinada / pelve girando',fix:'Barra na horizontal e centralizada; os dois lados do quadril sobem juntos.'},
    escapulas:{name:'Costas deslizando no banco',fix:'Mantenha a parte de baixo das escápulas fixa na borda do banco.'},
    pes:{name:'Pés longe demais',fix:'Pés mais perto do quadril: no topo, joelhos a ~90° e canelas verticais.'},
    amplitude:{name:'Quadril sem extensão completa',fix:'Suba até tronco e coxas ficarem alinhados, contraindo os glúteos no topo.'},
    brusco:{name:'Descida sem controle',fix:'Desça em cerca de 2 s; a barra não despenca.'},
  };
  let errMode=null;

  function solveHpt(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let a=A0+(A1-A0)*p, tilt=6+20*p, heel=0, valg=0, roll=0, CU=CU0, ax=AXF, barUp=0;
    if(err==='hiper'){const k=amt*sstep(.55,1,p);a-=16*k;tilt-=14*k;}
    if(err==='cabeca')tilt-=46*amt*sstep(.25,1,p);
    if(err==='calcanhar')heel=amt*sstep(.35,1,p)*24*DEG;
    if(err==='valgo')valg=amt*sstep(.25,1,p);
    if(err==='barra')barUp=amt;
    if(err==='inclinada')roll=amt*sstep(.1,.85,p)*9*DEG;
    if(err==='escapulas')CU=CU0-.12*amt*sstep(.15,1,p);
    if(err==='pes')ax=AXF+.20*amt;
    const F=frameOf(a);
    const n=F.n.clone().applyAxisAngle(F.u,roll);
    const P=EC.clone().addScaledVector(F.n,ER+CN).addScaledVector(F.u,-CU);
    const qT=torsoQ(F.u,n);
    const mapT=torsoBones(bones,qT,P,tilt*DEG);
    const side=[];
    /* pernas: pés fixos no chão (calcanhar pode subir no erro) */
    [1,-1].forEach(s=>{const m=-s;
      const td=toeDir(s);let A=V(ax,.085,FOOTZ*s);let qF=alignQ(YUP,ZAX,YUP,td);
      if(heel>0){const ball=sum(A,1,YUP,-.075,td,.14);const axr=new THREE.Vector3().crossVectors(YUP,td).normalize();
        let q=new THREE.Quaternion().setFromAxisAngle(axr,heel);let An=A.clone().sub(ball).applyQuaternion(q).add(ball);
        if(An.y<A.y){q=new THREE.Quaternion().setFromAxisAngle(axr,-heel);An=A.clone().sub(ball).applyQuaternion(q).add(ball);}A=An;qF=q.multiply(qF);}
      const hip=mapT(L('Hip',m));
      const kp=sum(YUP,1,XAX,.45,ZAX,s*(.22-1.6*valg));
      const K=legBones(bones,qT,s,hip,A,kp,qF);
      side.push({s,m,hip,K,A});});
    /* barra na dobra do quadril: bissetriz entre a normal do tronco e a normal da coxa */
    const R=side[0];
    const td=R.K.clone().sub(R.hip);td.z=0;td.normalize();
    let nth=V(-td.y,td.x,0);if(nth.dot(F.n)<0)nth.negate();
    const nb=F.n.clone().add(nth).normalize();
    const nbar=nb.clone().lerp(F.n,barUp).normalize();
    const Bc=P.clone().addScaledVector(nbar,BR_OFF).addScaledVector(F.u,.15*barUp);
    const zb=ZAX.clone().applyAxisAngle(F.u,roll*1.4);
    side.forEach(sd=>{const s=sd.s,m=sd.m;
      const Sj=mapT(L('Sj',m));
      const H=Bc.clone().addScaledVector(zb,HANDZ*s);
      const pole=sum(ZAX,s*1.0,F.n,-.75,F.u,.1);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,pole,nbar.clone().negate());
      Object.assign(sd,{Sj,E,H,qFT});});
    return {u:F.u,n,P,side,bones,Bc,zb,a,tilt};
  }

  /* --- Guias --- */
  const gz=.30;
  const latOnly=new THREE.Group();statics.add(latOnly);
  const hipPath=[];for(let k=0;k<=24;k++){const J=solveHpt({p:k/24,err:null,amt:0});hipPath.push(J.P.clone().setZ(gz));}
  lineIn(latOnly,hipPath);
  lineIn(latOnly,[V(AXF,.0,gz+.02),V(AXF,.62,gz+.02)]);
  const alignL=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0),V(0,0,0)]),mats.guide);latOnly.add(alignL);
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.15,0xffffff,.055,.04);guides.add(arrow);
  const mkArc=()=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V(0,0,0))),mats.guide);guides.add(l);return l;};
  const kneeArc=mkArc(), hipArc=mkArc();
  function arc(line,c,a,b,off,r){const pos=line.geometry.attributes.position;const a1=a.clone().normalize(),a2=b.clone().normalize();const cc=c.clone().add(off);
    for(let i=0;i<16;i++){const v=a1.clone().lerp(a2,i/15).normalize().multiplyScalar(r).add(cc);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;}
  let S=solveHpt({p:0,err:null,amt:0});
  const hipFlex=J=>{const R=J.side[0];const th=R.K.clone().sub(R.hip);th.z=0;const d=J.u.clone().negate();d.z=0;
    return Math.atan2(d.x*th.y-d.y*th.x,d.dot(th))/DEG;};
  const GT=[
    {label:'Quadril',text:()=>{const f=Math.round(hipFlex(S));return f<-3?`Quadril ${-f}° além da linha`:`Quadril ${Math.max(0,f)}°`;},pos:()=>S.P.clone().add(V(.02,.22,gz)),views:['lateral']},
    {label:'Apoio: escápulas na borda',pos:()=>EC.clone().add(V(-.10,-.16,gz+.05)),views:['lateral','diagonal']},
  ];
  const PARTS=[
    {label:'Banco reto',pos:()=>V(BX-.16,BENCH_H+.03,.52)},
    {label:'Borda do banco',pos:()=>EC.clone().add(V(.04,.05,.42))},
    {label:'Barra olímpica',pos:()=>S.Bc.clone().addScaledVector(S.zb,.48).add(V(0,.05,0))},
    {label:'Anilhas',pos:()=>S.Bc.clone().addScaledVector(S.zb,.74).add(V(0,.25,0))},
    {label:'Presilha',pos:()=>S.Bc.clone().addScaledVector(S.zb,-.81).add(V(0,.06,0))},
    {label:'Almofada da barra',pos:()=>S.Bc.clone().add(V(0,.08,.06))},
  ];
  const ghostMat=new THREE.MeshStandardMaterial({color:0x8a939e,transparent:true,opacity:.16,depthWrite:false,roughness:.6});
  nearBar.forEach(m=>{m.userData.mat=m.material;});

  return {
    id:'elevacao-pelvica', title:'Elevação Pélvica 3D',
    eyebrow:'Treino · Glúteos', h1:'Elevação pélvica com barra',
    specs:'<span>Costas no <b>banco</b></span><span>Barra na <b>dobra do quadril</b></span><span>Topo: joelhos <b>~90°</b></span><span>Subida <b>~1,5 s</b> · descida <b>~2 s</b></span>',
    groups:{p:{label:'Principal',col:'--red'},s:{label:'Secundários',col:'--orange'},d:{label:'Estabilizadores',col:'--blue'}},
    muscles:[
     {id:'gluteos',name:'Glúteo máximo',g:'p',col:'--red',tag:'Glúteo máximo'},
     {id:'gluteoMed',name:'Glúteo médio',g:'s',col:'--orange',tag:'Glúteo médio'},
     {id:'gluteoMin',name:'Glúteo mínimo (profundo, sob o glúteo médio)',g:'s',col:'--orange'},
     {id:'adutor',name:'Adutor magno (porção posterior)',g:'s',col:'--orange',tag:'Adutor magno'},
     {id:'bicepsFem',name:'Isquiotibiais · bíceps femoral',g:'s',col:'--yellow',tag:'Isquiotibiais'},
     {id:'semitend',name:'Isquiotibiais · semitendíneo',g:'s',col:'--yellow'},
     {id:'semimemb',name:'Isquiotibiais · semimembranáceo',g:'s',col:'--yellow'},
     {id:'reto',name:'Reto abdominal',g:'d',col:'--blue',tag:'Abdômen'},
     {id:'obliquos',name:'Oblíquos',g:'d',col:'--blue'},
     {id:'eretor',name:'Eretor da espinha',g:'d',col:'--blue',tag:'Eretores'},
     {id:'quadLomb',name:'Quadrado lombar (profundo)',g:'d',col:'--blue'},
     {id:'estPelve',name:'Estabilizadores profundos da pelve',g:'d',col:'--blue'},
    ],
    muscleTarget(m,kind){
      if(m.g==='p')return kind==='conc'?1:kind==='iso'?.95:kind==='ecc'?.8:.35;
      if(m.g==='s')return kind==='conc'?.85:kind==='iso'?.75:kind==='ecc'?.65:.3;
      return kind==='iso'?.55:.45;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, parts:PARTS, guideTags:GT,
    readouts:[{id:'hip',label:'Flexão do quadril'},{id:'knee',label:'Flexão do joelho · topo ~90°'},{id:'shin',label:'Canela × vertical'}],
    views:{lateral:{pos:V(.24,.72,2.55),tgt:V(.22,.45,0)},posterior:{pos:V(2.4,.24,0),tgt:V(.3,.40,0)},
      diagonal:{pos:V(1.75,1.25,1.8),tgt:V(.2,.42,0)},anatomia:{pos:V(1.05,.17,1.5),tgt:V(.28,.42,0)}},
    portrait:1.5, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>O equipamento</h2><dl class="params">
          <dt>Banco reto</dt><dd>Firme e acolchoado, encostado de lado (atravessado) atrás de você, com ~40–45 cm de altura.</dd>
          <dt>Barra olímpica</dt><dd>Com anilhas e presilhas de segurança nas pontas.</dd>
          <dt>Almofada</dt><dd>Envolve o meio da barra e protege o quadril.</dd></dl>
          <p class="small" style="margin:10px 0 0">Ligue <b>Peças da máquina</b> abaixo da cena para ver os nomes no 3D.</p></section>
          <section class="card"><h2>Montagem e posição</h2><dl class="params">
          <dt>Costas</dt><dd>A parte de baixo das escápulas fica na borda do banco e não desliza.</dd>
          <dt>Barra</dt><dd>Sobre a dobra do quadril (entre tronco e coxas), centralizada, nunca sobre o abdômen.</dd>
          <dt>Mãos</dt><dd>Seguram a barra dos dois lados só para estabilizar, cotovelos a 70–110°.</dd>
          <dt>Pés</dt><dd>No chão, na largura do quadril ou dos ombros, pontas para a frente ou um pouco para fora.</dd>
          <dt>Cabeça</dt><dd>Alinhada ao tronco, queixo levemente recolhido.</dd>
          <dt>Topo</dt><dd>Tronco e coxas alinhados, joelhos a ~90°, canelas quase verticais, glúteos contraídos. Sem arquear a lombar.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const rep=errMode&&t<T_END?1:0, tr=t%T_END;
      const amt=errMode?(rep?1:1-sstep(0,.45,tr)):0;
      const err=errMode&&amt>0?errMode:null;
      const fp=x=>(err==='brusco'&&rep)?pDrop(x):pBase(x);
      let p=fp(tr);const v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      if(err==='amplitude')p*=1-.48*amt;
      const J=solveHpt({p,err,amt});
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Subida · concêntrica',cue:'Extensão do quadril: o glúteo máximo empurra a barra para cima.'};
      if(J.v<-.05)return {kind:'ecc',label:'Descida controlada · excêntrica',cue:'O quadril flexiona devagar e os glúteos seguem ativos, freando a barra.'};
      if(J.p>.4)return {kind:'iso',label:'Topo · contração dos glúteos',cue:'Tronco e coxas alinhados, joelhos a ~90°, sem arquear a lombar.'};
      return {kind:'hold',label:'Posição inicial',cue:'Escápulas na borda do banco, barra na dobra do quadril, pés firmes.'};},
    update(J,t,ph){
      bar.position.copy(J.Bc);bar.quaternion.setFromUnitVectors(ZAX,J.zb);
      const R=J.side[0];
      alignL.geometry.setFromPoints([R.Sj.clone().setZ(gz),R.hip.clone().setZ(gz),R.K.clone().setZ(gz)]);
      const mov=Math.abs(J.v)>.05;arrow.visible=mov&&latOnly.visible;
      if(arrow.visible){arrow.position.copy(J.P.clone().add(V(-.1,0,gz)));arrow.setDirection(J.v>0?YUP:YUP.clone().negate());arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const thigh=R.K.clone().sub(R.hip), shin=R.A.clone().sub(R.K);
      arc(kneeArc,R.K,thigh.clone().negate(),shin,V(0,0,.1),.1);
      arc(hipArc,R.hip,J.u,thigh,V(0,0,.14),.12);
      const hf=hipFlex(J);
      const kneeF=180-kneeAngle(R.hip,R.K,R.A);
      const sh=shin.clone().negate();sh.z=0;const shinA=sh.angleTo(YUP)/DEG;
      const top=J.p>.9;
      const hs=top&&!['valgo','calcanhar','inclinada'].includes(J.err)?(hf<-4?'warn':hf<=14?'ok':'warn'):'';
      return {hip:{v:hf<-3?`${Math.round(-hf)}° de extensão`:`${Math.round(Math.max(0,hf))}°`,s:hs},
              knee:{v:Math.round(kneeF)+'°',s:top?(kneeF>=78&&kneeF<=102?'ok':'warn'):''},
              shin:{v:Math.round(shinA)+'°',s:top?(shinA<=12?'ok':'warn'):''}};
    },
    viewChanged(v){latOnly.visible=v==='lateral';statics.visible=v==='lateral'||v==='diagonal';
      kneeArc.visible=hipArc.visible=v==='lateral'||v==='diagonal';
      const g=v==='lateral'||v==='anatomia';
      nearBar.forEach(m=>{m.material=g?ghostMat:m.userData.mat;m.castShadow=!g;});},
  };
})();

/* @@ex_bw1.js@@ */
// #region: ex-sql
/* ====================================================================================
   AGACHAMENTO LIVRE (peso do corpo, braços à frente como contrapeso)
   ==================================================================================== */
const SQL=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const FOOTZ=.17, TOE=12*DEG;
  const toeDir=s=>V(Math.cos(TOE),0,Math.sin(TOE)*s);
  const KEYS=[
   {t:0,   title:'Preparação',d:'Em pé, pés na largura dos ombros com as pontas um pouco para fora, braços à frente na altura dos ombros, coluna neutra.'},
   {t:.85, title:'Início da descida',d:'O quadril começa a recuar, joelhos e tornozelos começam a dobrar. Os braços seguem à frente como contrapeso.',ph:'ecc'},
   {t:1.35,title:'Descida inicial',d:'Quadris e joelhos flexionam juntos; joelhos na direção dos pés e calcanhares inteiros no chão.',ph:'ecc'},
   {t:1.85,title:'Descida intermediária',d:'Coxas a cerca de 45° da vertical; o tronco inclina naturalmente, sem arredondar a lombar.',ph:'ecc'},
   {t:3.0, title:'Fundo controlado',d:'Coxas perto do paralelo ao chão, joelhos a ~90–110°, tripé do pé no chão. Sem quicar.'},
   {t:3.75,title:'Início da subida',d:'Empurre o chão com o pé inteiro: quadris e joelhos estendem juntos, quadril e tronco sobem juntos.',ph:'conc'},
   {t:4.3, title:'Subida intermediária',d:'Joelhos e quadris continuam estendendo, joelhos alinhados aos pés, tronco estável.',ph:'conc'},
   {t:4.85,title:'Subida final',d:'Pernas quase estendidas, tronco volta à vertical, braços ainda à frente.',ph:'conc'},
   {t:5.5, title:'Posição inicial',d:'Em pé, quadris e joelhos estendidos sem hiperextensão. Repetição completa.'},
  ];
  const T_END=5.6, D0=.4, D1=2.9, U0=3.4, U1=5.4;
  const pBase=t=>t<D0?0:t<D1?ease((t-D0)/2.5):t<U0?1:t<U1?1-ease((t-U0)/2):0;
  function pJerk(t){if(t<.4)return 0;if(t<1.2){const s=(t-.4)/.8;return 1.06*s*s;}if(t<1.4)return 1.06-.16*ease((t-1.2)/.2);if(t<1.6)return .9+.08*ease((t-1.4)/.2);if(t<2.5)return .98*(1-ease((t-1.6)/.9));return 0;}
  const ERR={
    valgo:{name:'Joelhos colapsando para dentro',fix:'Joelhos apontam para o segundo/terceiro dedo do pé na descida e na subida.'},
    calcanhar:{name:'Calcanhares levantando',fix:'Pé inteiro no chão: calcanhar, base do dedão e base do dedo mínimo.'},
    lombar:{name:'Lombar arredondando no fundo',fix:'Desça só até onde a coluna continua neutra, sem a pelve "virar".'},
    quadril:{name:'Quadril subindo antes do tronco',fix:'Quadril e tronco sobem juntos, empurrando o chão com o pé inteiro.'},
    hiper:{name:'Hiperextensão lombar no topo',fix:'Termine em pé com costelas sobre a pelve, sem arquear a lombar.'},
    brusco:{name:'Queda rápida e quique no fundo',fix:'Desça em cerca de 2,5 s, pausa curta, sem rebote.'},
  };
  let errMode=null;
  function solve(st){
    const {p,err,amt,asc}=st;
    const bones=new Array(NB);
    let pk=p, extra=0, head=0, heel=0, valg=0, hyp=0;
    if(err==='quadril'&&asc){pk=Math.pow(p,1.9);extra=amt*28*(p-pk)/.4;}
    if(err==='lombar'){extra+=amt*12*sstep(.6,1,p);head=amt*22*sstep(.6,1,p);}
    if(err==='calcanhar')heel=amt*sstep(.3,1,p)*20*DEG;
    if(err==='valgo')valg=amt*sstep(.2,.9,p);
    if(err==='hiper')hyp=amt*(1-sstep(0,.25,p));
    const feet=[1,-1].map(s=>{let A=V(0,.085,FOOTZ*s);const td=toeDir(s);let qF=alignQ(YUP,ZAX,YUP,td);
      if(heel>0){const ball=sum(A,1,YUP,-.075,td,.14);const ax=new THREE.Vector3().crossVectors(YUP,td).normalize();
        let q=new THREE.Quaternion().setFromAxisAngle(ax,heel);let An=A.clone().sub(ball).applyQuaternion(q).add(ball);
        if(An.y<A.y){q=new THREE.Quaternion().setFromAxisAngle(ax,-heel);An=A.clone().sub(ball).applyQuaternion(q).add(ball);}A=An;qF=q.multiply(qF);}
      return {A,qF,td};});
    const Am=V((feet[0].A.x+feet[1].A.x)/2,(feet[0].A.y+feet[1].A.y)/2,0);
    const {P:Pk}=fkSag(Am,2+30*pk,-(2+72*pk),Math.cos(TOE*.6));
    const P=Pk.add(V(.05*hyp,0,0));
    const lean=5+33*p+extra-12*hyp, a=lean*DEG;
    const u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,(-head+6*hyp)*DEG);
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const Sj=mapT(L('Sj',m));
      const H=sum(Sj,1,V(.645,-.05,-.03*s),1);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,sum(YUP,-1,ZAX,s*.35),V(0,-1,0));
      const hip=mapT(L('Hip',m));
      const kp=sum(feet[i].td,1,ZAX,-s*1.3*valg,YUP,.05);
      const K=legBones(bones,qT,s,hip,feet[i].A,kp,feet[i].qF);
      side.push({s,m,Sj,E,H,hip,K,A:feet[i].A,qFT});});
    return {u,n,P,side,bones,lean};
  }
  const vz=.48;const latOnly=new THREE.Group();statics.add(latOnly);
  lineIn(latOnly,[V(.05,0,vz),V(.05,1.85,vz)]);
  [1,-1].forEach(s=>{const A=V(0,.003,FOOTZ*s);lineIn(statics,[A,sum(A,1,toeDir(s),.45)]);});
  const hipPath=[];for(let k=0;k<=24;k++)hipPath.push(solve({p:k/24,err:null,amt:0}).P.clone().setZ(vz));
  lineIn(latOnly,hipPath);
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.15,0xffffff,.055,.04);guides.add(arrow);
  const kneeArc=mkArcBW(guides), hipArc=mkArcBW(guides), ankArc=mkArcBW(guides);
  let S=solve({p:0,err:null,amt:0});
  return {
    id:'agachamento-livre', title:'Agachamento Livre 3D', openHands:true,
    eyebrow:'Treino · Pernas · sem equipamento', h1:'Agachamento livre',
    specs:'<span>Pés <b>largura dos ombros</b>, 5–20° para fora</span><span>Joelhos até <b>~90–110°</b></span><span>Braços <b>à frente</b></span>',
    groups:{p:{label:'Principal · quadríceps',col:'--red'},s:{label:'Extensores do quadril',col:'--orange'},e:{label:'Estabilizadores do quadril',col:'--yellow'},d:{label:'Tornozelo e pé',col:'--blue'},b:{label:'Tronco',col:'--sky'},n:{label:'Sinergistas',col:'--muted'}},
    strongE:true,
    muscles:[
     {id:'retoFem',name:'Quadríceps · reto femoral',g:'p',col:'--red',tag:'Quadríceps'},
     {id:'vastoLat',name:'Quadríceps · vasto lateral',g:'p',col:'--red'},
     {id:'vastoMed',name:'Quadríceps · vasto medial',g:'p',col:'--red'},
     {id:'vastoInt',name:'Quadríceps · vasto intermédio (profundo)',g:'p',col:'--red'},
     {id:'gluteos',name:'Glúteo máximo',g:'s',col:'--orange',tag:'Glúteo máximo'},
     {id:'adutor',name:'Adutor magno',g:'s',col:'--orange',tag:'Adutor magno'},
     {id:'gluteoMed',name:'Glúteo médio (e mínimo, por baixo)',g:'e',col:'--yellow',tag:'Glúteo médio'},
     {id:'soleo',name:'Sóleo',g:'d',col:'--blue'},{id:'gastro',name:'Gastrocnêmio',g:'d',col:'--blue',tag:'Panturrilha'},
     {id:'pePe',name:'Musculatura intrínseca do pé',g:'d',col:'--blue'},
     {id:'reto',name:'Reto abdominal',g:'b',col:'--sky'},{id:'obliquos',name:'Oblíquos e transverso',g:'b',col:'--sky'},{id:'eretor',name:'Eretores da coluna',g:'b',col:'--sky',tag:'Eretores'},
     {id:'bicepsFem',name:'Isquiotibiais (sinergistas)',g:'n'},{id:'semitend',name:'Semitendíneo',g:'n'},{id:'semimemb',name:'Semimembranáceo',g:'n'},
    ],
    muscleTarget(m,kind){if(m.g==='p'||m.g==='s')return kind==='conc'?1:kind==='ecc'?.75:kind==='hold'?.55:.3;if(m.g==='e')return kind==='conc'?.7:.5;if(m.g==='d'||m.g==='b')return .45;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides,
    readouts:[{id:'knee',label:'Flexão do joelho'},{id:'hip',label:'Flexão do quadril'},{id:'ankle',label:'Dorsiflexão'}],
    views:{lateral:{pos:V(0,1.0,3.45),tgt:V(.05,.86,0)},frontal:{pos:V(2.9,1.05,0),tgt:V(0,.8,0)},
      diagonal:{pos:V(2.0,1.4,2.0),tgt:V(0,.8,0)},anatomia:{pos:V(-1.8,1.15,1.5),tgt:V(-.05,.68,0)}},
    defaultView:'lateral', portrait:1.55, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>Equipamento</h2><dl class="params"><dt>Nenhum</dt><dd>Só um piso plano, firme e antiderrapante.</dd></dl></section>
          <section class="card"><h2>Posição e técnica</h2><dl class="params">
          <dt>Pés</dt><dd>Na largura dos ombros, pontas 5–20° para fora, peso no tripé do pé (calcanhar, base do dedão e base do dedo mínimo).</dd>
          <dt>Braços</dt><dd>À frente, na altura dos ombros, cotovelos quase estendidos: servem de contrapeso.</dd>
          <dt>Descida</dt><dd>Quadril para trás e para baixo enquanto joelhos e tornozelos dobram; os joelhos podem passar da ponta dos pés.</dd>
          <dt>Fundo</dt><dd>Coxas perto do paralelo, joelhos a ~90–110°, sem perder o apoio do pé nem a coluna neutra.</dd>
          <dt>Tronco</dt><dd>Inclina naturalmente à frente; não precisa ficar vertical.</dd>
          <dt>Subida</dt><dd>Empurre o chão com o pé inteiro; quadril e tronco sobem juntos, sem hiperestender no topo.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const {rep,tr,amt,err}=errAmt(errMode,t,T_END);
      const fp=x=>(err==='brusco'&&rep)?pJerk(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solve({p:Math.min(p,1.05),err,amt,asc:v<-.02});
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    phase(J){
      if(J.v>.05)return {kind:'ecc',label:'Descida controlada · excêntrica',cue:'Quadris e joelhos flexionam juntos; tornozelos em dorsiflexão.'};
      if(J.v<-.05)return {kind:'conc',label:'Subida · concêntrica',cue:'Quadríceps e glúteos estendem joelhos e quadris empurrando o chão.'};
      if(J.p>.5)return {kind:'hold',label:'Fundo controlado',cue:'Pés inteiros no chão, joelhos na linha dos pés, sem quicar.'};
      return {kind:'hold',label:'Posição inicial',cue:'Em pé, braços à frente, abdômen firme.'};},
    update(J,t,ph){
      const R=J.side[0];
      const mov=Math.abs(J.v)>.05&&latOnly.visible;arrow.visible=mov;
      if(mov){arrow.position.copy(J.P.clone().add(V(-.14,0,vz)));arrow.setDirection(J.v>0?YUP.clone().negate():YUP);arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const thigh=R.K.clone().sub(R.hip), shin=R.A.clone().sub(R.K);
      setArcBW(kneeArc,R.K,thigh.clone().negate(),shin,V(0,0,.1),.1);
      setArcBW(hipArc,R.hip,J.u,thigh,V(0,0,.14),.12);
      setArcBW(ankArc,R.A,YUP,shin.clone().negate(),V(0,0,.08),.13);
      const kneeF=180-kneeAngle(R.hip,R.K,R.A), hipF=J.u.angleTo(thigh.clone().negate())/DEG, dors=shin.clone().negate().angleTo(YUP)/DEG;
      return {knee:{v:Math.round(kneeF)+'°',s:J.p>.95?(kneeF>=88&&kneeF<=118?'ok':'warn'):''},hip:{v:Math.round(hipF)+'°',s:''},ankle:{v:Math.round(dors)+'°',s:''}};
    },
    viewChanged(v){statics.visible=v==='lateral'||v==='frontal';latOnly.visible=v==='lateral';kneeArc.visible=hipArc.visible=ankArc.visible=v==='lateral'||v==='diagonal';},
  };
})();

// #region: ex-gmn
/* ====================================================================================
   BOM DIA SEM CARGA (dobradiça do quadril, braços cruzados no peito)
   ==================================================================================== */
const GMN=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const FOOTZ=.11, TOE=6*DEG;
  const toeDir=s=>V(Math.cos(TOE),0,Math.sin(TOE)*s);
  const KEYS=[
   {t:0,   title:'Posição inicial',d:'Em pé, pés na largura do quadril, joelhos destravados (10–20°), braços cruzados no peito, coluna neutra.'},
   {t:.9,  title:'Início da dobradiça',d:'O quadril começa a ir para trás; os joelhos mantêm a pequena flexão.',ph:'ecc'},
   {t:1.4, title:'Inclinação inicial',d:'O tronco inclina a partir do quadril, com a coluna alinhada e os braços cruzados.',ph:'ecc'},
   {t:1.9, title:'Inclinação intermediária',d:'Quadril mais para trás, tronco a ~30–40° da vertical, canelas quase verticais.',ph:'ecc'},
   {t:3.0, title:'Posição inferior controlada',d:'Tronco a ~45–60° da vertical, conforme a mobilidade; alongamento atrás das coxas; coluna neutra.'},
   {t:3.6, title:'Início do retorno',d:'Glúteos e posteriores começam a estender o quadril; o quadril começa a avançar.',ph:'conc'},
   {t:4.2, title:'Retorno intermediário',d:'O tronco sobe em bloco a partir do quadril; joelhos com flexão suave.',ph:'conc'},
   {t:4.75,title:'Retorno final',d:'Quadril perto da extensão neutra e tronco voltando à vertical.',ph:'conc'},
   {t:5.4, title:'Posição inicial',d:'Em pé, coluna e quadril neutros, joelhos destravados. Repetição completa.'},
  ];
  const T_END=5.6, D0=.4, D1=2.9, U0=3.3, U1=5.3;
  const pBase=t=>t<D0?0:t<D1?ease((t-D0)/2.5):t<U0?1:t<U1?1-ease((t-U0)/2):0;
  function pJerk(t){if(t<.4)return 0;if(t<1.0){const s=(t-.4)/.6;return 1.08*s*s;}if(t<1.25)return 1.08-.2*ease((t-1.0)/.25);if(t<1.5)return .88+.1*ease((t-1.25)/.25);if(t<2.3)return .98*(1-ease((t-1.5)/.8));return 0;}
  const ERR={
    agachamento:{name:'Virar agachamento',fix:'Joelhos quase parados (10–20°); quem se move é o quadril, para trás.'},
    arredondar:{name:'Lombar arredondando',fix:'Coluna neutra do início ao fim; pare antes de a lombar curvar.'},
    hiper:{name:'Hiperextensão lombar no topo',fix:'Termine em pé com o quadril neutro, sem empurrar a pelve à frente.'},
    pontas:{name:'Peso nas pontas dos pés',fix:'Pé inteiro no chão; o peso fica no meio do pé e no calcanhar.'},
    joelhos:{name:'Joelhos indo muito à frente',fix:'Canelas quase verticais: leve o quadril para trás, não os joelhos à frente.'},
    paralelo:{name:'Forçar o tronco paralelo ao chão',fix:'Desça só até ~45–60° ou até sentir o alongamento, sem perder a coluna neutra.'},
    brusco:{name:'Movimento rápido com rebote',fix:'Desça em ~2,5 s, pausa curta e suba em ~2 s.'},
  };
  let errMode=null;
  function solve(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let al=6-9*p, th=-(9+14*p), lean=3+52*p, head=4, heel=0, rnd=0, Pd=0;
    if(err==='agachamento'){const k=amt*p;al+=22*k;th-=45*k;lean-=22*k;}
    if(err==='arredondar'){const k=amt*sstep(.3,1,p);lean+=12*k;head+=24*k;rnd=k;}
    if(err==='hiper'){const k=amt*(1-sstep(0,.25,p));lean-=11*k;Pd=.06*k;head-=10*k;}
    if(err==='pontas'){heel=amt*sstep(.3,1,p)*18*DEG;al+=10*amt*p;}
    if(err==='joelhos'){const k=amt*p;al+=16*k;th+=6*k;}
    if(err==='paralelo'){const k=amt*sstep(.4,1,p);lean+=32*k;al+=8*k;th-=14*k;head+=20*k;rnd=k*.8;}
    const feet=[1,-1].map(s=>{let A=V(0,.085,FOOTZ*s);const td=toeDir(s);let qF=alignQ(YUP,ZAX,YUP,td);
      if(heel>0){const ball=sum(A,1,YUP,-.075,td,.14);const ax=new THREE.Vector3().crossVectors(YUP,td).normalize();
        let q=new THREE.Quaternion().setFromAxisAngle(ax,heel);let An=A.clone().sub(ball).applyQuaternion(q).add(ball);
        if(An.y<A.y){q=new THREE.Quaternion().setFromAxisAngle(ax,-heel);An=A.clone().sub(ball).applyQuaternion(q).add(ball);}A=An;qF=q.multiply(qF);}
      return {A,qF,td};});
    const Am=V(feet[0].A.x,(feet[0].A.y+feet[1].A.y)/2,0);
    const {P:Pk}=fkSag(Am,al,th,1);const P=Pk.add(V(Pd,0,0));
    const a=lean*DEG, u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,head*DEG);
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const Sj=mapT(L('Sj',m)).addScaledVector(n,.03*rnd);
      const opp=mapT(L('Sj',-m));
      const H=sum(opp,1,n,.115+(s>0?.035:0),u,s>0?-.04:-.08);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,sum(n,1,u,-.7,ZAX,s*.55),n.clone().negate());
      const hip=mapT(L('Hip',m));
      const K=legBones(bones,qT,s,hip,feet[i].A,sum(feet[i].td,1,YUP,.05),feet[i].qF);
      side.push({s,m,Sj,E,H,hip,K,A:feet[i].A,qFT});});
    return {u,n,P,side,bones,lean,neck:mapT(L('neck'))};
  }
  const vz=.4;const latOnly=new THREE.Group();statics.add(latOnly);
  lineIn(latOnly,[V(.05,0,vz),V(.05,1.8,vz)]);
  const P0=solve({p:0,err:null,amt:0}).P.clone();
  const hipPath=[];for(let k=0;k<=24;k++)hipPath.push(solve({p:k/24,err:null,amt:0}).P.clone().setZ(vz));
  lineIn(latOnly,hipPath);
  const spine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);latOnly.add(spine);
  const tibia=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);latOnly.add(tibia);
  const arrow=new THREE.ArrowHelper(XAX,V(0,0,0),.15,0xffffff,.055,.04);guides.add(arrow);
  const kneeArc=mkArcBW(guides), trunkArc=mkArcBW(guides);
  let S=solve({p:0,err:null,amt:0});
  const GT=[{label:'Tronco',text:()=>`Tronco ${Math.round(S.lean)}°`,pos:()=>S.P.clone().add(sum(S.u,.5,ZAX,vz)),views:['lateral']}];
  return {
    id:'bom-dia', title:'Bom Dia sem Carga 3D', openHands:true,
    eyebrow:'Treino · Posterior de coxa · sem equipamento', h1:'Bom dia sem carga',
    specs:'<span>Dobradiça do <b>quadril</b></span><span>Joelhos <b>10–20°</b> quase parados</span><span>Tronco <b>30–60°</b></span><span>Braços <b>cruzados</b></span>',
    groups:{p:{label:'Principais · isquiotibiais',col:'--red'},s:{label:'Extensores do quadril',col:'--orange'},d:{label:'Estabilizadores',col:'--blue'},n:{label:'Estabilizador da pelve',col:'--muted'}},
    muscles:[
     {id:'bicepsFem',name:'Isquiotibiais · bíceps femoral',g:'p',col:'--red',tag:'Isquiotibiais'},
     {id:'semitend',name:'Isquiotibiais · semitendíneo',g:'p',col:'--red'},
     {id:'semimemb',name:'Isquiotibiais · semimembranáceo',g:'p',col:'--red'},
     {id:'gluteos',name:'Glúteo máximo',g:'s',col:'--orange',tag:'Glúteo máximo'},
     {id:'adutor',name:'Adutor magno (fibras posteriores)',g:'s',col:'--yellow',tag:'Adutor magno'},
     {id:'eretor',name:'Eretores da espinha e multífidos (isométrico)',g:'d',col:'--blue',tag:'Eretores'},
     {id:'reto',name:'Reto abdominal',g:'d',col:'--sky'},{id:'obliquos',name:'Oblíquos e transverso do abdômen',g:'d',col:'--sky'},
     {id:'gluteoMed',name:'Glúteo médio',g:'n'},
    ],
    muscleTarget(m,kind){
      if(m.g==='p')return kind==='conc'?1:kind==='ecc'?.85:kind==='hold'?.7:.3;
      if(m.g==='s')return kind==='conc'?1:kind==='ecc'?.6:kind==='hold'?.45:.3;
      if(m.g==='d')return .55;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, guideTags:GT,
    readouts:[{id:'knee',label:'Flexão do joelho · 10–20°'},{id:'trunk',label:'Tronco × vertical'},{id:'hipBack',label:'Quadril para trás'}],
    views:{lateral:{pos:V(-.05,1.0,3.35),tgt:V(-.05,.88,0)},frontal:{pos:V(2.8,1.15,0),tgt:V(0,.85,0)},
      diagonal:{pos:V(2.0,1.45,2.0),tgt:V(0,.85,0)},anatomia:{pos:V(-2.3,1.35,.6),tgt:V(-.05,.8,0)}},
    portrait:1.55, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>Equipamento</h2><dl class="params"><dt>Nenhum</dt><dd>Sem barra, halteres ou apoio. Só um piso plano e firme.</dd></dl></section>
          <section class="card"><h2>Posição e técnica</h2><dl class="params">
          <dt>Pés</dt><dd>Na largura do quadril, pontas para a frente ou até 10° para fora, pé inteiro no chão.</dd>
          <dt>Joelhos</dt><dd>Destravados, com 10–20° de flexão que quase não muda: não é agachamento.</dd>
          <dt>Braços</dt><dd>Cruzados no peito, mãos nos ombros opostos. Não puxe a cabeça.</dd>
          <dt>Descida</dt><dd>Leve o quadril para trás, como se fosse tocar uma parede atrás de você; o tronco inclina a partir do quadril.</dd>
          <dt>Até onde</dt><dd>Tronco a ~30–60° da vertical, até sentir alongamento atrás das coxas, sem perder a coluna neutra.</dd>
          <dt>Subida</dt><dd>Empurre o chão e leve o quadril à frente contraindo glúteos e posteriores; tronco e pelve sobem juntos.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde). As linhas mostram a coluna e a canela.</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const {rep,tr,amt,err}=errAmt(errMode,t,T_END);
      const fp=x=>(err==='brusco'&&rep)?pJerk(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solve({p:Math.min(p,1.08),err,amt});
      S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    phase(J){
      if(J.v>.05)return {kind:'ecc',label:'Descida · excêntrica',cue:'Quadril vai para trás e o tronco inclina; os posteriores alongam sob controle.'};
      if(J.v<-.05)return {kind:'conc',label:'Retorno · concêntrica',cue:'Glúteos e posteriores estendem o quadril; a coluna fica neutra.'};
      if(J.p>.5)return {kind:'hold',label:'Posição inferior',cue:'Coluna neutra, joelhos levemente flexionados, alongamento atrás das coxas.'};
      return {kind:'hold',label:'Posição inicial',cue:'Em pé, joelhos destravados, braços cruzados.'};},
    update(J,t,ph){
      const R=J.side[0];
      spine.geometry.setFromPoints([J.P.clone().setZ(vz),J.neck.clone().setZ(vz)]);
      tibia.geometry.setFromPoints([R.K.clone().setZ(vz),R.A.clone().setZ(vz)]);
      const mov=Math.abs(J.v)>.05&&latOnly.visible;arrow.visible=mov;
      if(mov){arrow.position.copy(J.P.clone().add(V(0,-.12,vz)));arrow.setDirection(J.v>0?XAX.clone().negate():XAX);arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const thigh=R.K.clone().sub(R.hip), shin=R.A.clone().sub(R.K);
      setArcBW(kneeArc,R.K,thigh.clone().negate(),shin,V(0,0,.1),.1);
      setArcBW(trunkArc,J.P,YUP,J.u,V(0,0,.2),.3);
      const kneeF=180-kneeAngle(R.hip,R.K,R.A);const back=Math.round((P0.x-J.P.x)*100);
      return {knee:{v:Math.round(kneeF)+'°',s:kneeF<=24?'ok':'warn'},trunk:{v:Math.round(J.lean)+'°',s:J.p>.95?(J.lean>=28&&J.lean<=62?'ok':'warn'):''},hipBack:{v:back+' cm',s:''}};
    },
    viewChanged(v){latOnly.visible=v==='lateral';statics.visible=v==='lateral';kneeArc.visible=trunkArc.visible=v==='lateral'||v==='diagonal';},
  };
})();

/* @@ex_bw1.js@@END */
/* @@ex_bw2.js@@ */
// #region: ex-kpu
/* ====================================================================================
   FLEXÃO COM JOELHOS APOIADOS (knee push-up). De bruços, cabeça para +X, peito para baixo.
   O corpo é uma linha reta joelho-quadril-ombro que gira em volta dos joelhos; mãos fixas.
   ==================================================================================== */
const KPU=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  mkMatBW(grp,.0,1.8,.8);
  const XK=-.45, KZ=.10, HZ=.27, FW=.82*LEN.fa, Kc=V(XK,.055,0);
  const reachW=f=>Math.sqrt(LEN.ua**2+FW**2-2*LEN.ua*FW*Math.cos((180-f)*DEG));
  const fr=b=>{const r=b*DEG;return {d:V(Math.cos(r),Math.sin(r),0),n:V(Math.sin(r),-Math.cos(r),0)};};
  const sjOf=(bu,bt,s)=>{const t=fr(bt),u=fr(bu);return sum(Kc,1,t.d,LEN.th,u.d,.46,u.n,.01,ZAX,.195*s);};
  let XH=.22;const W=s=>V(XH,.045,HZ*s);
  function solveB(f,dl){let lo=-8,hi=75;for(let i=0;i<34;i++){const mid=(lo+hi)/2;if(sjOf(mid,mid+dl,1).distanceTo(W(1))>reachW(f))hi=mid;else lo=mid;}return (lo+hi)/2;}
  for(let i=0;i<5;i++){const b=solveB(6,0);XH=sjOf(b,b,1).x+.035;}
  const KEYS=[
   {t:0,   title:'Prancha modificada',d:'Mãos um pouco mais abertas que os ombros, joelhos no chão, corpo reto da cabeça aos joelhos, cotovelos quase estendidos.'},
   {t:.7,  title:'Início da descida',d:'Os cotovelos começam a flexionar; tórax e quadril descem juntos.',ph:'ecc'},
   {t:1.3, title:'Descida inicial',d:'Cotovelos com ~25–35° de flexão; linha reta dos joelhos à cabeça.',ph:'ecc'},
   {t:1.6, title:'Descida intermediária',d:'Cotovelos com ~50–65°, indo na diagonal para trás; ombros longe das orelhas.',ph:'ecc'},
   {t:2.55,title:'Ponto inferior',d:'Tórax perto do chão, cotovelos a ~80–100°, quadril alinhado e joelhos firmes.'},
   {t:2.95,title:'Início da subida',d:'Empurre o chão: os cotovelos começam a estender, tronco e pelve sobem juntos.',ph:'conc'},
   {t:3.35,title:'Subida intermediária',d:'Cotovelos com ~40–55°, sem deixar a pelve atrasar ou cair.',ph:'conc'},
   {t:3.62,title:'Subida final',d:'Cotovelos com ~15–25°; as escápulas estabilizam o topo.',ph:'conc'},
   {t:4.4, title:'Posição inicial',d:'De volta à prancha modificada, corpo alinhado e cotovelos quase estendidos.'},
  ];
  const T_END=4.6, D0=.4, D1=2.4, U0=2.7, U1=4.2;
  const pBase=t=>t<D0?0:t<D1?ease((t-D0)/2):t<U0?1:t<U1?1-ease((t-U0)/1.5):0;
  function pDrop(t){if(t<D0)return 0;if(t<1.0){const s=(t-D0)/.6;return Math.min(1.04,1.04*s*s);}if(t<1.2)return 1.04-.04*ease((t-1)/.2);return pBase(Math.max(t,D1));}
  const ERR={
    alto:{name:'Quadril empinado ("V" invertido)',fix:'Abaixe o quadril até a linha joelho-quadril-ombro ficar reta.'},
    caido:{name:'Quadril caindo e lombar arqueando',fix:'Abdômen e glúteos firmes: o quadril acompanha o tronco.'},
    cabeca:{name:'Cabeça projetada para a frente',fix:'Cabeça alinhada à coluna, olhando o chão um pouco à frente das mãos.'},
    cotovelos:{name:'Cotovelos abertos a 90°',fix:'Cotovelos na diagonal para trás, a 30–45° do tronco.'},
    ombros:{name:'Ombros encolhidos',fix:'Ombros longe das orelhas, empurrando o chão.'},
    partes:{name:'Movimento em duas partes',fix:'Peito e quadril descem e sobem juntos, como uma tábua.'},
    brusco:{name:'Queda rápida no fundo',fix:'Desça em ~2 s, sem despencar, e suba em ~1,5 s.'},
  };
  let errMode=null;const wb=[0,0];
  function solve(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    const f=6+86*Math.min(p,1.06);
    let dl=0, head=-4, flare=0, sh=0, fwdHead=0;
    if(err==='alto')dl=24*amt;
    if(err==='caido')dl=-11*amt*(.4+.6*p);
    if(err==='cabeca'){head=-26*amt;fwdHead=amt;}
    if(err==='cotovelos')flare=amt;
    if(err==='ombros')sh=.05*amt;
    if(err==='partes')dl=16*amt*Math.sin(Math.PI*Math.min(1,p));
    const bu=solveB(f,dl), bt=bu+dl;
    const T=fr(bt), U=fr(bu);
    const P=sum(Kc,1,T.d,LEN.th), u=U.d, n=U.n;
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,head*DEG);
    if(fwdHead){const fw=u.clone().multiplyScalar(.05*fwdHead);bones[1].pt=bones[1].pt.clone().addScaledVector(fw,.5);bones[2].pt=bones[2].pt.clone().add(fw);}
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const Sj=mapT(L('Sj',m)).addScaledVector(u,sh);
      const Wp=W(s);
      const pole=sum(u,-1,ZAX,s*(.9+1.6*flare),n,-.3);
      const E1=ik(Sj,Wp.clone().add(V(0,-.055,0)),LEN.ua,LEN.fa,pole);
      const fd=Wp.clone().sub(E1).normalize();
      const {E,qFT}=armBones(bones,qT,s,Sj,Wp.clone().addScaledVector(fd,.055),pole,V(-1,0,0));
      wb[i]=fd.angleTo(V(Math.cos(8*DEG),0,Math.sin(8*DEG)*s));
      const K=V(XK,.055,KZ*s);
      const sa=(bt+80)*DEG, sd=V(Math.cos(sa),Math.sin(sa),0), ant=V(Math.cos(sa+Math.PI/2),Math.sin(sa+Math.PI/2),0);
      const A=K.clone().addScaledVector(sd,LEN.sn);A.z=.085*s;
      const hip=mapT(L('Hip',m));
      legBones(bones,qT,s,hip,A,V(.2,-1,0),alignQ(YUP,ZAX,ant,sd));
      side.push({s,m,Sj,E,H:Wp,hip,K,A,qFT});});
    return {u,n,P,side,bones,bu,bt,f};
  }
  const vz=.42;const latOnly=new THREE.Group();statics.add(latOnly);
  const lineB=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);latOnly.add(lineB);
  const elbArc=mkArcBW(guides);
  const arrows=[0].map(()=>{const a=new THREE.ArrowHelper(YUP,V(0,0,0),.15,0xffffff,.05,.035);guides.add(a);return a;});
  let S=solve({p:0,err:null,amt:0});
  const GT=[{label:'Linha',text:()=>Math.abs(S.bt-S.bu)<3?'Joelho, quadril e ombro em linha':'Fora da linha',pos:()=>sum(Kc,1,fr(S.bt).d,.5).add(V(0,.16,vz)),views:['lateral']}];
  return {
    id:'flexao-joelhos', title:'Flexão com Joelhos Apoiados 3D', openHands:true,
    eyebrow:'Treino · Peito · sem equipamento', h1:'Flexão com joelhos apoiados',
    specs:'<span>Joelhos <b>no chão</b></span><span>Cotovelos <b>0–10° → 80–100°</b></span><span>Cotovelos a <b>30–45°</b> do tronco</span>',
    groups:{p:{label:'Principal',col:'--red'},s:{label:'Secundários',col:'--orange'},d:{label:'Estabilizadores do ombro',col:'--blue'},b:{label:'Estabilizadores do tronco',col:'--sky'}},
    strongE:true,
    muscles:[
     {id:'pecEst',name:'Peitoral maior · porção esternocostal',g:'p',col:'--red',tag:'Peitoral maior'},
     {id:'pecClav',name:'Peitoral maior · porção clavicular',g:'p',col:'--red'},
     {id:'tricLong',name:'Tríceps · cabeça longa',g:'s',col:'--orange',tag:'Tríceps'},{id:'tricLat',name:'Tríceps · cabeça lateral',g:'s',col:'--orange'},{id:'tricMed',name:'Tríceps · cabeça medial',g:'s',col:'--orange'},
     {id:'deltAnt',name:'Deltoide anterior',g:'s',col:'--yellow',tag:'Deltoide anterior'},
     {id:'serratil',name:'Serrátil anterior',g:'d',col:'--blue',tag:'Serrátil'},{id:'manguito',name:'Manguito rotador',g:'d',col:'--blue'},
     {id:'reto',name:'Reto abdominal (isométrico)',g:'b',col:'--sky'},{id:'obliquos',name:'Oblíquos e transverso (isométrico)',g:'b',col:'--sky'},{id:'gluteos',name:'Glúteos (isométrico)',g:'b',col:'--sky'},
    ],
    muscleTarget(m,kind){if(m.g==='p')return kind==='conc'?1:kind==='ecc'?.8:kind==='hold'?.6:.35;if(m.g==='s')return kind==='conc'?.95:kind==='ecc'?.7:.45;return .45;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, guideTags:GT,
    readouts:[{id:'elbow',label:'Flexão do cotovelo'},{id:'abd',label:'Cotovelo × tronco · 30–45°'},{id:'line',label:'Quadril fora da linha'}],
    views:{lateral:{pos:V(-.05,.75,2.6),tgt:V(-.05,.3,0)},frontal:{pos:V(2.3,.65,0),tgt:V(0,.3,0)},
      diagonal:{pos:V(1.5,1.15,1.65),tgt:V(-.05,.3,0)},anatomia:{pos:V(1.25,.14,1.05),tgt:V(.05,.3,0)}},
    portrait:1.45, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>Equipamento</h2><dl class="params"><dt>Nenhum</dt><dd>Peso do corpo e piso firme; colchonete fino opcional para os joelhos.</dd></dl></section>
          <section class="card"><h2>Posição e técnica</h2><dl class="params">
          <dt>Mãos</dt><dd>Um pouco mais abertas que os ombros, palmas inteiras no chão, dedos à frente.</dd>
          <dt>Joelhos</dt><dd>No chão, na largura do quadril, flexionados ~90–110°; os pés não empurram.</dd>
          <dt>Linha</dt><dd>Cabeça, ombros, quadril e joelhos em linha reta. Abdômen e glúteos firmes.</dd>
          <dt>Descida</dt><dd>Cotovelos na diagonal para trás (30–45° do tronco) até o peito chegar perto do chão, cotovelos a ~80–100°.</dd>
          <dt>Subida</dt><dd>Empurre o chão e suba tórax, quadril e cabeça juntos, sem travar os cotovelos.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const {rep,tr,amt,err}=errAmt(errMode,t,T_END);
      const fp=x=>(err==='brusco'&&rep)?pDrop(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solve({p,err,amt});S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    postBones(BM){wristBend(BM,-1,wb[0]);wristBend(BM,1,wb[1]);},
    phase(J){
      if(J.v>.05)return {kind:'ecc',label:'Descida · excêntrica',cue:'Cotovelos flexionam na diagonal; peito e quadril descem juntos.'};
      if(J.v<-.05)return {kind:'conc',label:'Subida · concêntrica',cue:'Peitoral, tríceps e deltoide anterior empurram o chão.'};
      if(J.p>.5)return {kind:'hold',label:'Ponto inferior',cue:'Tórax perto do chão, corpo em linha, joelhos firmes.'};
      return {kind:'hold',label:'Prancha modificada',cue:'Corpo reto dos joelhos à cabeça, cotovelos quase estendidos.'};},
    update(J,t,ph){
      const R=J.side[0];
      lineB.geometry.setFromPoints([V(XK,.055,vz),J.P.clone().setZ(vz),sum(J.P,1,J.u,.62).setZ(vz)]);
      setArcBW(elbArc,R.E,R.Sj.clone().sub(R.E),R.H.clone().sub(R.E),V(0,0,.07),.08);
      const a=arrows[0];a.visible=Math.abs(J.v)>.05&&latOnly.visible;
      if(a.visible){a.position.copy(sum(J.P,1,J.u,.4).setZ(vz).add(V(0,.12,0)));a.setDirection(J.v>0?YUP.clone().negate():YUP);a.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const elbF=180-kneeAngle(R.Sj,R.E,R.H);
      const ua=R.E.clone().sub(R.Sj);const abd=Math.atan2(Math.abs(ua.z),ua.dot(J.u.clone().negate()))/DEG;
      const dev=Math.round(J.bt-J.bu);
      return {elbow:{v:Math.round(elbF)+'°',s:J.p>.95?(elbF>=78&&elbF<=102?'ok':'warn'):J.p<.03?(elbF<=12?'ok':''):''},
        abd:{v:Math.round(abd)+'°',s:J.p>.6?(abd>=25&&abd<=50?'ok':'warn'):''},line:{v:(dev>0?'+':'')+dev+'°',s:Math.abs(dev)<=3?'ok':'warn'}};
    },
    viewChanged(v){latOnly.visible=v==='lateral';elbArc.visible=v==='lateral'||v==='diagonal';},
  };
})();

// #region: ex-wpu
/* ====================================================================================
   FLEXÃO NA PAREDE (wall push-up). Em pé de frente para a parede (em +X); corpo reto gira
   em volta dos tornozelos; mãos fixas na parede na altura dos ombros.
   ==================================================================================== */
const WPU=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const FZ=.11, HZ=.25, FW=.82*LEN.fa, Ac=V(0,.085,0), LEG=(LEN.sn+LEN.th)*.995;
  const reachW=f=>Math.sqrt(LEN.ua**2+FW**2-2*LEN.ua*FW*Math.cos((180-f)*DEG));
  const fr=g=>{const r=g*DEG;return {d:V(Math.sin(r),Math.cos(r),0),n:V(Math.cos(r),-Math.sin(r),0)};};
  const sjOf=(gu,gl,s)=>{const l=fr(gl),u=fr(gu);return sum(Ac,1,l.d,LEG,u.d,.46,u.n,-.01,ZAX,.195*s);};
  const top=sjOf(8,8,1);
  const WY=top.y-.04;
  const WX=top.x+Math.sqrt(reachW(6)**2-.04**2-(HZ-.195)**2);
  const XW=WX+.045;
  const W=s=>V(WX,WY,HZ*s);
  function solveG(f,dl){let lo=-5,hi=45;for(let i=0;i<34;i++){const mid=(lo+hi)/2;if(sjOf(mid+dl,mid,1).distanceTo(W(1))>reachW(f))lo=mid;else hi=mid;}return (lo+hi)/2;}
  /* parede */
  const wallMat=new THREE.MeshStandardMaterial({color:0xd9dde2,roughness:.95});
  const wall=meshIn(grp,new THREE.BoxGeometry(.10,2.5,2.4),wallMat);wall.position.set(XW+.05,1.25,0);wall.userData.mat=wallMat;
  const KEYS=[
   {t:0,   title:'Preparação',d:'De frente para a parede, mãos na altura dos ombros, pés afastados, corpo em linha diagonal, cotovelos quase estendidos.'},
   {t:.7,  title:'Início da descida',d:'Os cotovelos começam a flexionar e o corpo inclina inteiro em direção à parede.',ph:'ecc'},
   {t:1.1, title:'Descida inicial',d:'Cotovelos com ~25–35° de flexão; ombros avançam com controle, corpo alinhado.',ph:'ecc'},
   {t:1.55,title:'Descida intermediária',d:'Cotovelos com ~50–65°, a 30–45° do tronco; o peito se aproxima da parede.',ph:'ecc'},
   {t:2.55,title:'Ponto inferior',d:'Cotovelos a ~70–90°, peito perto da parede, cabeça neutra, sem dobrar o quadril.'},
   {t:2.95,title:'Início do empurrar',d:'Pressione as palmas contra a parede; os cotovelos começam a estender.',ph:'conc'},
   {t:3.35,title:'Empurrar intermediário',d:'Cotovelos com ~40–55°; as escápulas acompanham a protração natural.',ph:'conc'},
   {t:3.75,title:'Retorno avançado',d:'Cotovelos com ~15–25°; o corpo volta à inclinação inicial.',ph:'conc'},
   {t:4.4, title:'Posição inicial',d:'Cotovelos quase estendidos, sem travar; corpo alinhado e estável.'},
  ];
  const T_END=4.6, D0=.4, D1=2.4, U0=2.7, U1=4.2;
  const pBase=t=>t<D0?0:t<D1?ease((t-D0)/2):t<U0?1:t<U1?1-ease((t-U0)/1.5):0;
  function pDrop(t){if(t<D0)return 0;if(t<.95){const s=(t-D0)/.55;return Math.min(1.04,1.04*s*s);}if(t<1.15)return 1.04-.04*ease((t-.95)/.2);return pBase(Math.max(t,D1));}
  const ERR={
    quadril:{name:'Quadril dobrando para trás',fix:'Corpo reto dos tornozelos à cabeça; não "sente" para trás.'},
    barriga:{name:'Barriga indo para a parede primeiro',fix:'Abdômen e glúteos firmes: o peito chega antes da barriga.'},
    cabeca:{name:'Cabeça avançando',fix:'Cabeça alinhada ao tronco; a testa não encosta na parede.'},
    cotovelos:{name:'Cotovelos abertos a 90°',fix:'Cotovelos na diagonal para baixo, a 30–45° do tronco.'},
    ombros:{name:'Ombros encolhidos',fix:'Ombros longe das orelhas enquanto empurra a parede.'},
    brusco:{name:'Movimento brusco',fix:'Desça em ~2 s e empurre em 1–2 s, sem trancos.'},
  };
  let errMode=null;const wb=[0,0];
  function solve(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    const f=6+76*Math.min(p,1.06);
    let dl=0, head=-3, flare=0, sh=0, fwdHead=0;
    if(err==='quadril')dl=24*amt;
    if(err==='barriga')dl=-9*amt*(.3+.7*p);
    if(err==='cabeca'){fwdHead=amt*(.3+.7*p);head=-14*amt;}
    if(err==='cotovelos')flare=amt;
    if(err==='ombros')sh=.05*amt;
    const gl=solveG(f,dl), gu=gl+dl;
    const Lg=fr(gl), U=fr(gu);
    const P=sum(Ac,1,Lg.d,LEG), u=U.d, n=U.n;
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,head*DEG);
    if(fwdHead){const fw=n.clone().multiplyScalar(.07*fwdHead);bones[1].pt=bones[1].pt.clone().addScaledVector(fw,.5);bones[2].pt=bones[2].pt.clone().add(fw);}
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const Sj=mapT(L('Sj',m)).addScaledVector(u,sh);
      const Wp=W(s);
      const pole=sum(YUP,-1,ZAX,s*(.22+1.8*flare),XAX,-.35);
      const E1=ik(Sj,Wp.clone().add(V(.055,0,0)),LEN.ua,LEN.fa,pole);
      const fd=Wp.clone().sub(E1).normalize();
      const {E,qFT}=armBones(bones,qT,s,Sj,Wp.clone().addScaledVector(fd,.055),pole,V(0,-1,0));
      wb[i]=fd.angleTo(V(0,1,0));
      const A=V(0,.085,FZ*s);
      const hip=mapT(L('Hip',m));
      legBones(bones,qT,s,hip,A,V(1,.05,0),alignQ(YUP,ZAX,YUP,XAX));
      side.push({s,m,Sj,E,H:Wp,hip,A,qFT});});
    return {u,n,P,side,bones,gl,gu,f,neck:mapT(L('neck'))};
  }
  const vz=.42;const latOnly=new THREE.Group();statics.add(latOnly);
  const lineB=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0),V(0,0,0)]),mats.guide);latOnly.add(lineB);
  const elbArc=mkArcBW(guides);
  const ghostMat=new THREE.MeshStandardMaterial({color:0x8a939e,transparent:true,opacity:.14,depthWrite:false});
  let S=solve({p:0,err:null,amt:0});
  return {
    id:'flexao-parede', title:'Flexão na Parede 3D', openHands:true,
    eyebrow:'Treino · Peito · sem equipamento', h1:'Flexão inclinada na parede',
    specs:'<span>Mãos na <b>altura dos ombros</b></span><span>Corpo em <b>linha diagonal</b></span><span>Cotovelos <b>0–10° → 70–90°</b></span>',
    groups:{p:{label:'Principal',col:'--red'},s:{label:'Secundários',col:'--orange'},d:{label:'Estabilizadores',col:'--blue'}},
    muscles:[
     {id:'pecEst',name:'Peitoral maior · porção esternocostal',g:'p',col:'--red',tag:'Peitoral maior'},
     {id:'pecClav',name:'Peitoral maior · porção clavicular',g:'p',col:'--red'},
     {id:'tricLong',name:'Tríceps · cabeça longa',g:'s',col:'--orange',tag:'Tríceps'},{id:'tricLat',name:'Tríceps · cabeça lateral',g:'s',col:'--orange'},{id:'tricMed',name:'Tríceps · cabeça medial',g:'s',col:'--orange'},
     {id:'deltAnt',name:'Deltoide anterior',g:'s',col:'--yellow',tag:'Deltoide anterior'},
     {id:'serratil',name:'Serrátil anterior',g:'d',col:'--blue',tag:'Serrátil'},{id:'manguito',name:'Manguito rotador',g:'d',col:'--blue'},
     {id:'reto',name:'Abdômen e oblíquos (isométrico)',g:'d',col:'--blue'},{id:'gluteos',name:'Glúteos (isométrico)',g:'d',col:'--blue'},{id:'retoFem',name:'Quadríceps (isométrico)',g:'d',col:'--blue'},
    ],
    muscleTarget(m,kind){if(m.g==='p')return kind==='conc'?1:kind==='ecc'?.8:kind==='hold'?.6:.35;if(m.g==='s')return kind==='conc'?.95:kind==='ecc'?.7:.45;return .5;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides,
    readouts:[{id:'elbow',label:'Flexão do cotovelo'},{id:'abd',label:'Cotovelo × tronco · 30–45°'},{id:'line',label:'Quadril fora da linha'}],
    views:{lateral:{pos:V(.45,1.05,3.0),tgt:V(.45,.9,0)},frontal:{pos:V(2.6,1.35,0),tgt:V(.3,1.05,0)},
      diagonal:{pos:V(-.9,1.6,2.2),tgt:V(.4,.95,0)},anatomia:{pos:V(1.6,1.3,1.2),tgt:V(.35,1.1,0)}},
    portrait:1.6, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>Equipamento</h2><dl class="params"><dt>Nenhum</dt><dd>Só uma parede lisa e firme e o chão. A parede não é aparelho.</dd></dl></section>
          <section class="card"><h2>Posição e técnica</h2><dl class="params">
          <dt>Pés</dt><dd>Na largura do quadril, afastados da parede o suficiente para inclinar o corpo; calcanhares no chão.</dd>
          <dt>Mãos</dt><dd>Na altura dos ombros, um pouco mais abertas que eles, dedos para cima.</dd>
          <dt>Linha</dt><dd>Cabeça, tronco, quadril e pernas em diagonal, sem dobrar o quadril.</dd>
          <dt>Aproximar</dt><dd>Cotovelos a 30–45° do tronco até ~70–90° de flexão; o peito chega perto da parede.</dd>
          <dt>Empurrar</dt><dd>Empurre com as palmas e volte com o corpo inteiro, sem travar os cotovelos.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const {rep,tr,amt,err}=errAmt(errMode,t,T_END);
      const fp=x=>(err==='brusco'&&rep)?pDrop(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solve({p,err,amt});S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    postBones(BM){wristBend(BM,-1,wb[0]);wristBend(BM,1,wb[1]);},
    phase(J){
      if(J.v>.05)return {kind:'ecc',label:'Aproximação · excêntrica',cue:'Cotovelos flexionam e o corpo inteiro se aproxima da parede.'};
      if(J.v<-.05)return {kind:'conc',label:'Empurrar · concêntrica',cue:'Peitoral, tríceps e deltoide anterior empurram a parede.'};
      if(J.p>.5)return {kind:'hold',label:'Ponto inferior',cue:'Peito perto da parede, corpo em linha, cabeça neutra.'};
      return {kind:'hold',label:'Posição inicial',cue:'Corpo em diagonal, cotovelos quase estendidos.'};},
    update(J,t,ph){
      const R=J.side[0];
      lineB.geometry.setFromPoints([Ac.clone().setZ(vz),J.P.clone().setZ(vz),J.neck.clone().setZ(vz)]);
      setArcBW(elbArc,R.E,R.Sj.clone().sub(R.E),R.H.clone().sub(R.E),V(0,0,.07),.08);
      const elbF=180-kneeAngle(R.Sj,R.E,R.H);
      const ua=R.E.clone().sub(R.Sj);const abd=Math.atan2(Math.abs(ua.z),ua.dot(J.u.clone().negate()))/DEG;
      const dev=Math.round(J.gu-J.gl);
      return {elbow:{v:Math.round(elbF)+'°',s:J.p>.95?(elbF>=68&&elbF<=92?'ok':'warn'):J.p<.03?(elbF<=12?'ok':''):''},
        abd:{v:Math.round(abd)+'°',s:J.p>.6?(abd>=25&&abd<=50?'ok':'warn'):''},line:{v:(dev>0?'+':'')+dev+'°',s:Math.abs(dev)<=3?'ok':'warn'}};
    },
    viewChanged(v){latOnly.visible=v==='lateral';elbArc.visible=v==='lateral'||v==='diagonal';
      const g=v==='frontal'||v==='anatomia';wall.material=g?ghostMat:wallMat;wall.castShadow=!g;},
  };
})();

/* @@ex_bw2.js@@END */
/* @@ex_bw3.js@@ */
// #region: ex-brg
/* ====================================================================================
   PONTE DE GLÚTEOS no solo. Deitado de costas, cabeça para −X; as escápulas ficam no chão
   (ponto de apoio C) e a pelve sobe girando em volta delas.
   ==================================================================================== */
const BRG=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  mkMatBW(grp,.05,1.9,.8);
  const CU=.40, CN=.12, C=V(-.30,.012,0), A_TOP=-24, FZ=.11;
  const frA=a=>{const r=a*DEG;return {u:V(-Math.cos(r),Math.sin(r),0),n:V(Math.sin(r),Math.cos(r),0)};};
  const pelvis=a=>{const F=frA(a);return C.clone().addScaledVector(F.u,-CU).addScaledVector(F.n,CN);};
  const Pt=pelvis(A_TOP);
  const AX=Pt.x+Math.sqrt(LEN.th**2+LEN.sn**2-(Pt.y-.085)**2-(FZ-.095)**2);
  const SJ0x=pelvis(0).x-.46;
  const KEYS=[
   {t:0,   title:'Posição inicial',d:'De costas, joelhos flexionados, pés na largura do quadril, braços ao lado do corpo e pelve no chão.'},
   {t:.6,  title:'Preparação',d:'Abdômen contrai de leve, costelas alinhadas à pelve, pressão no pé inteiro.'},
   {t:1.15,title:'Início da subida',d:'Os glúteos começam a estender o quadril; a pelve sai do chão.',ph:'conc'},
   {t:1.6, title:'Elevação intermediária',d:'A pelve sobe; tronco apoiado e joelhos alinhados.',ph:'conc'},
   {t:2.6, title:'Ponte completa',d:'Ombros, quadril e joelhos alinhados, quadril em extensão neutra, glúteos contraídos, sem arquear a lombar.'},
   {t:3.3, title:'Início da descida',d:'O quadril começa a flexionar; a pelve desce devagar e simétrica.',ph:'ecc'},
   {t:3.9, title:'Descida intermediária',d:'A pelve continua descendo; pés inteiros no chão e joelhos estáveis.',ph:'ecc'},
   {t:4.5, title:'Descida final',d:'A pelve chega perto do chão, sem perder o controle do abdômen.',ph:'ecc'},
   {t:5.2, title:'Posição inicial',d:'Pelve de volta ao chão, pronto para a próxima repetição.'},
  ];
  const T_END=5.3, U0=.8, U1=2.3, D0=3.0, D1=5.0;
  const pBase=t=>t<U0?0:t<U1?ease((t-U0)/(U1-U0)):t<D0?1:t<D1?1-ease((t-D0)/(D1-D0)):0;
  function pJerk(t){if(t<U0)return 0;if(t<1.15){const s=(t-U0)/.35;return Math.min(1.05,1.05*s*(2-s));}if(t<D0)return 1;if(t<3.35){const s=(t-D0)/.35;return 1-s*s;}return 0;}
  const ERR={
    hiper:{name:'Hiperextensão da lombar no topo',fix:'Pare quando ombros, quadril e joelhos ficarem alinhados; costelas para baixo.'},
    pes:{name:'Pés longe demais',fix:'Aproxime os pés: no topo, joelhos a ~80–100° e canelas quase verticais.'},
    valgo:{name:'Joelhos caindo para dentro',fix:'Joelhos na direção dos pés durante toda a subida.'},
    calcanhar:{name:'Calcanhares saindo do chão',fix:'Empurre o chão com o pé inteiro, calcanhares apoiados.'},
    cabeca:{name:'Cabeça levantando',fix:'Cabeça apoiada no chão e pescoço neutro.'},
    brusco:{name:'Subida explosiva e queda',fix:'Suba em ~1,5 s, segure no topo e desça em ~2 s.'},
  };
  let errMode=null;
  function solve(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let a=A_TOP*p, tilt=0, heel=0, valg=0, ax=AX;
    if(err==='hiper'){const k=amt*sstep(.55,1,p);a-=13*k;}
    if(err==='pes')ax=AX+.22*amt;
    if(err==='valgo')valg=amt*sstep(.2,1,p);
    if(err==='calcanhar')heel=amt*sstep(.3,1,p)*24*DEG;
    if(err==='cabeca')tilt=34*amt*sstep(.1,.6,p);
    const F=frA(a), P=pelvis(a);
    const qT=torsoQ(F.u,F.n);
    const mapT=torsoBones(bones,qT,P,(-a*1.1+tilt)*DEG);
    const side=[];
    [1,-1].forEach(s=>{const m=-s;
      const Sj=mapT(L('Sj',m));
      const H=V(SJ0x+.60,.03,.27*s);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,sum(YUP,1,ZAX,s*.3),V(0,-1,0));
      let A=V(ax,.085,FZ*s);let qF=alignQ(YUP,ZAX,YUP,XAX);
      if(heel>0){const ball=sum(A,1,YUP,-.075,XAX,.14);const axr=new THREE.Vector3().crossVectors(YUP,XAX).normalize();
        let q=new THREE.Quaternion().setFromAxisAngle(axr,heel);let An=A.clone().sub(ball).applyQuaternion(q).add(ball);
        if(An.y<A.y){q=new THREE.Quaternion().setFromAxisAngle(axr,-heel);An=A.clone().sub(ball).applyQuaternion(q).add(ball);}A=An;qF=q.multiply(qF);}
      const hip=mapT(L('Hip',m));
      const K=legBones(bones,qT,s,hip,A,sum(YUP,1,XAX,.3,ZAX,s*(.15-1.4*valg)),qF);
      side.push({s,m,Sj,E,H,hip,K,A,qFT});});
    return {u:F.u,n:F.n,P,side,bones,a};
  }
  const gz=.36;const latOnly=new THREE.Group();statics.add(latOnly);
  const hipPath=[];for(let k=0;k<=24;k++)hipPath.push(solve({p:k/24,err:null,amt:0}).P.clone().setZ(gz));
  lineIn(latOnly,hipPath);
  const alignL=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0),V(0,0,0)]),mats.guide);latOnly.add(alignL);
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.14,0xffffff,.05,.035);guides.add(arrow);
  const kneeArc=mkArcBW(guides), hipArc=mkArcBW(guides);
  const hipFlex=J=>{const R=J.side[0];const th=R.K.clone().sub(R.hip);th.z=0;const d=J.u.clone().negate();d.z=0;return Math.atan2(d.x*th.y-d.y*th.x,d.dot(th))/DEG;};
  let S=solve({p:0,err:null,amt:0});
  return {
    id:'ponte-gluteos', title:'Ponte de Glúteos 3D', openHands:true,
    eyebrow:'Treino · Glúteos · sem equipamento', h1:'Ponte de glúteos',
    specs:'<span>Costas <b>no chão</b></span><span>Topo: joelhos <b>~80–100°</b></span><span>Subida <b>~1,5 s</b> · descida <b>~2 s</b></span>',
    groups:{p:{label:'Principal',col:'--red'},s:{label:'Secundários',col:'--orange'},d:{label:'Estabilizadores',col:'--blue'},n:{label:'Sinergista profundo',col:'--muted'}},
    muscles:[
     {id:'gluteos',name:'Glúteo máximo',g:'p',col:'--red',tag:'Glúteo máximo'},
     {id:'gluteoMed',name:'Glúteo médio (e mínimo, por baixo)',g:'s',col:'--orange',tag:'Glúteo médio'},
     {id:'bicepsFem',name:'Isquiotibiais · bíceps femoral',g:'s',col:'--yellow',tag:'Isquiotibiais'},{id:'semitend',name:'Isquiotibiais · semitendíneo',g:'s',col:'--yellow'},{id:'semimemb',name:'Isquiotibiais · semimembranáceo',g:'s',col:'--yellow'},
     {id:'reto',name:'Reto abdominal',g:'d',col:'--blue',tag:'Abdômen'},{id:'obliquos',name:'Oblíquos e transverso',g:'d',col:'--blue'},{id:'eretor',name:'Eretores da coluna',g:'d',col:'--blue'},
     {id:'adutor',name:'Adutor magno',g:'n'},
    ],
    muscleTarget(m,kind){if(m.g==='p')return kind==='conc'?1:kind==='iso'?.95:kind==='ecc'?.8:.3;if(m.g==='s')return kind==='conc'?.8:kind==='iso'?.7:kind==='ecc'?.6:.25;if(m.g==='d')return .5;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides,
    readouts:[{id:'hip',label:'Flexão do quadril'},{id:'knee',label:'Flexão do joelho · topo 80–100°'},{id:'up',label:'Altura do quadril'}],
    views:{lateral:{pos:V(.12,.62,2.45),tgt:V(.1,.25,0)},frontal:{pos:V(2.3,.55,0),tgt:V(.2,.28,0)},
      diagonal:{pos:V(1.45,1.1,1.55),tgt:V(.05,.25,0)},anatomia:{pos:V(.9,.1,1.25),tgt:V(.12,.25,0)}},
    portrait:1.4, degTag:null, degAnchor:null,
    errors:ERR,
    info:`<section class="card"><h2>Equipamento</h2><dl class="params"><dt>Nenhum</dt><dd>Piso firme; colchonete fino opcional. Não é o hip thrust: as costas ficam no chão, sem banco.</dd></dl></section>
          <section class="card"><h2>Posição e técnica</h2><dl class="params">
          <dt>Apoios</dt><dd>Cabeça, parte de cima das costas e pés inteiros no chão; braços ao lado do corpo, sem empurrar.</dd>
          <dt>Pés</dt><dd>Na largura do quadril, a uma distância que deixe os joelhos a ~80–100° no topo.</dd>
          <dt>Subida</dt><dd>Contraia os glúteos e empurre o chão até ombros, quadril e joelhos ficarem alinhados.</dd>
          <dt>Topo</dt><dd>Quadril em extensão neutra, pelve nivelada, sem arquear a lombar; segure um instante.</dd>
          <dt>Descida</dt><dd>Desça a pelve devagar até tocar o chão.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde).</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const {rep,tr,amt,err}=errAmt(errMode,t,T_END);
      const fp=x=>(err==='brusco'&&rep)?pJerk(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solve({p,err,amt});S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;J.tr=tr;return J;},
    phase(J){
      if(J.v>.05)return {kind:'conc',label:'Subida · concêntrica',cue:'Extensão do quadril: o glúteo máximo eleva a pelve.'};
      if(J.v<-.05)return {kind:'ecc',label:'Descida · excêntrica',cue:'O quadril flexiona devagar, glúteos ainda ativos.'};
      if(J.p>.4)return {kind:'iso',label:'Ponte completa',cue:'Ombros, quadril e joelhos alinhados, sem arquear a lombar.'};
      return {kind:'hold',label:J.tr>.5&&J.tr<U0?'Preparação':'Posição inicial',cue:'Abdômen firme, pés inteiros no chão, braços relaxados.'};},
    update(J,t,ph){
      const R=J.side[0];
      alignL.geometry.setFromPoints([R.Sj.clone().setZ(gz),R.hip.clone().setZ(gz),R.K.clone().setZ(gz)]);
      const mov=Math.abs(J.v)>.05&&latOnly.visible;arrow.visible=mov;
      if(mov){arrow.position.copy(J.P.clone().add(V(-.1,.05,gz)));arrow.setDirection(J.v>0?YUP:YUP.clone().negate());arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const thigh=R.K.clone().sub(R.hip), shin=R.A.clone().sub(R.K);
      setArcBW(kneeArc,R.K,thigh.clone().negate(),shin,V(0,0,.1),.09);
      setArcBW(hipArc,R.hip,J.u,thigh,V(0,0,.14),.11);
      const hf=hipFlex(J), kneeF=180-kneeAngle(R.hip,R.K,R.A), top=J.p>.9;
      return {hip:{v:hf<-3?`${Math.round(-hf)}° de extensão`:`${Math.round(Math.max(0,hf))}°`,s:top&&!['valgo','calcanhar'].includes(J.err)?(hf<-4?'warn':hf<=14?'ok':'warn'):''},
        knee:{v:Math.round(kneeF)+'°',s:top?(kneeF>=78&&kneeF<=102?'ok':'warn'):''},up:{v:Math.round((J.P.y-pelvis(0).y)*100)+' cm',s:''}};
    },
    viewChanged(v){latOnly.visible=v==='lateral';kneeArc.visible=hipArc.visible=v==='lateral'||v==='diagonal';},
  };
})();

// #region: ex-dbg
/* ====================================================================================
   DEAD BUG contralateral. Deitado de costas, cabeça para −X, braços para o teto e pernas em 90/90.
   Uma repetição: braço direito + perna esquerda; a seguinte troca de lado.
   ==================================================================================== */
const DBG=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  mkMatBW(grp,.1,1.95,.8);
  const P0=V(.10,.132,0);
  const rot=(v,a)=>V(v.x*Math.cos(a)-v.y*Math.sin(a),v.x*Math.sin(a)+v.y*Math.cos(a),0);
  let lado=1;
  const KEYS=[
   {t:0,   title:'Posição 90/90',d:'Deitado, braços apontando para o teto, quadris e joelhos a 90°, lombar controlada no chão.'},
   {t:.55, title:'Preparação',d:'Contração suave do abdômen; o braço e a perna opostos começam a se afastar.'},
   {t:1.15,title:'Extensão inicial',d:'O braço desce em direção à cabeça; a coxa oposta sai da vertical e o joelho começa a estender.',ph:'ecc'},
   {t:1.7, title:'Extensão intermediária',d:'Braço a ~120–140° de flexão; perna se aproximando da extensão, sem mexer a pelve.',ph:'ecc'},
   {t:2.8, title:'Alcance máximo controlado',d:'Braço perto da orelha, perna quase estendida com o calcanhar acima do chão. Lombar, costelas e pelve estáveis.'},
   {t:3.4, title:'Início do retorno',d:'O braço volta para o teto e a perna começa a flexionar quadril e joelho.',ph:'conc'},
   {t:3.95,title:'Retorno intermediário',d:'Braço e perna se aproximam da posição de mesa; o tronco não oscila.',ph:'conc'},
   {t:4.5, title:'Retorno final',d:'Braço quase vertical; coxa sobre o quadril e joelho perto de 90°.',ph:'conc'},
   {t:5.2, title:'Posição inicial',d:'De volta ao 90/90 simétrico. A próxima repetição troca o lado.'},
  ];
  const T_END=5.3, E0=.8, E1=2.6, R0=3.2, R1=5.0;
  const pBase=t=>t<E0?0:t<E1?ease((t-E0)/(E1-E0)):t<R0?1:t<R1?1-ease((t-R0)/(R1-R0)):0;
  function pJerk(t){if(t<E0)return 0;if(t<1.2){const s=(t-E0)/.4;return Math.min(1,s*(2-s)*1.05);}if(t<R0)return 1;if(t<3.6){const s=(t-R0)/.4;return 1-s*s;}return 0;}
  const ERR={
    lombar:{name:'Lombar arqueando',fix:'Lombar em contato leve com o chão; estenda a perna só até onde o abdômen segura.'},
    cabeca:{name:'Cabeça e ombros subindo',fix:'Cabeça apoiada; não é abdominal. O tronco fica parado.'},
    mesmo:{name:'Braço e perna do mesmo lado',fix:'Lados opostos: braço direito com perna esquerda, e vice-versa.'},
    baixa:{name:'Perna descendo demais',fix:'Pare com o calcanhar acima do chão, antes de a lombar sair do apoio.'},
    travado:{name:'Joelho travado',fix:'Estenda a perna mantendo 10–20° de flexão no joelho.'},
    brusco:{name:'Movimento rápido',fix:'Estenda em ~2 s, segure um instante e volte em ~2 s.'},
  };
  let errMode=null;
  function solve(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let arch=0, crunch=0, legMax=80, kneeEnd=15, legSide=-lado;
    if(err==='lombar')arch=amt*sstep(.4,1,p);
    if(err==='cabeca')crunch=amt*sstep(.1,.6,p);
    if(err==='mesmo')legSide=lado;
    if(err==='baixa'){legMax=80+12*amt;arch=amt*sstep(.6,1,p)*.8;}
    if(err==='travado')kneeEnd=15-15*amt;
    const al=-6*arch+16*crunch, ar=al*DEG;
    const u=V(-Math.cos(ar),Math.sin(ar),0), n=V(Math.sin(ar),Math.cos(ar),0);
    const P=P0.clone().add(V(0,.035*arch,0));
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,(4+22*crunch)*DEG);
    const side=[];
    [1,-1].forEach(s=>{const m=-s;
      const Sj=mapT(L('Sj',m));
      const moveA=s===lado, moveL=s===legSide;
      const ph=(moveA?75*p:0)*DEG;
      const ad=V(-Math.sin(ph),Math.cos(ph),0);
      const armUp=u.clone().negate().multiplyScalar(0);
      const H=Sj.clone().addScaledVector(rot(ad,ar),.64);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,sum(ZAX,s,u,-.2),ZAX.clone().multiplyScalar(-s));
      const hip=mapT(L('Hip',m));
      const ps=(moveL?legMax*p:0)*DEG, kf=(moveL?90+(kneeEnd-90)*p:90)*DEG;
      const td=rot(V(Math.sin(ps),Math.cos(ps),0),ar), sd=rot(td,-kf);
      const K=hip.clone().addScaledVector(td,LEN.th), A=K.clone().addScaledVector(sd,LEN.sn);A.z=.1*s;
      legBones(bones,qT,s,hip,A,V(-.5,1,0),alignQ(YUP,ZAX,sd.clone().negate(),rot(sd,Math.PI/2)));
      side.push({s,m,Sj,E,H,hip,K,A,qFT,moveA,moveL,ph,kf,ps});});
    return {u,n,P,side,bones,arch,crunch};
  }
  const gz=.4;const latOnly=new THREE.Group();statics.add(latOnly);
  lineIn(latOnly,[V(-.55,.012,gz),V(.55,.012,gz)]);
  const spine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);latOnly.add(spine);
  let S=solve({p:0,err:null,amt:0});
  const GT=[{label:'Lombar',text:()=>S.arch>.15?'Lombar saindo do chão':'Lombar estável',pos:()=>S.P.clone().add(V(-.18,.2,gz)),views:['lateral']}];
  return {
    id:'dead-bug', title:'Dead Bug 3D', openHands:true,
    eyebrow:'Treino · Core · sem equipamento', h1:'Dead bug',
    specs:'<span>Braço e perna <b>opostos</b></span><span>Lombar <b>estável no chão</b></span><span>Alterna os <b>lados</b></span>',
    groups:{p:{label:'Principal',col:'--red'},s:{label:'Anti-rotação',col:'--yellow'},d:{label:'Coluna',col:'--blue'},e:{label:'Controle do quadril',col:'--green'},n:{label:'Auxiliares do braço',col:'--muted'}},
    strongE:true,
    muscles:[
     {id:'reto',name:'Reto abdominal',g:'p',col:'--red',tag:'Reto abdominal'},
     {id:'transverso',name:'Transverso do abdômen (profundo)',g:'p',col:'--orange'},
     {id:'obliquos',name:'Oblíquos interno e externo',g:'s',col:'--yellow',tag:'Oblíquos'},
     {id:'eretor',name:'Eretores da espinha e multífidos',g:'d',col:'--blue'},
     {id:'retoFem',name:'Reto femoral',g:'e',col:'--green',tag:'Reto femoral'},{id:'iliopsoas',name:'Iliopsoas (profundo)',g:'e',col:'--green'},
     {id:'deltAnt',name:'Deltoide anterior',g:'n'},{id:'serratil',name:'Serrátil anterior',g:'n'},
    ],
    muscleTarget(m,kind){if(m.g==='p')return kind==='ecc'||kind==='iso'?.9:kind==='conc'?.8:.55;if(m.g==='s')return kind==='hold'?.5:.75;if(m.g==='d')return .5;if(m.g==='e')return kind==='hold'?.35:.6;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, guideTags:GT,
    readouts:[{id:'arm',label:'Braço × tronco'},{id:'hip',label:'Flexão do quadril (perna)'},{id:'knee',label:'Flexão do joelho (perna)'}],
    views:{lateral:{pos:V(.12,.8,2.5),tgt:V(.12,.3,0)},superior:{pos:V(.12,2.75,.02),tgt:V(.12,.2,0)},
      diagonal:{pos:V(1.55,1.35,1.6),tgt:V(.08,.3,0)},anatomia:{pos:V(1.15,1.25,.95),tgt:V(-.02,.25,0)}},
    portrait:1.35, degTag:null, degAnchor:null,
    errors:ERR,
    flipSide(){lado=-lado;}, sideLabel(){return lado>0?'braço direito + perna esquerda':'braço esquerdo + perna direita';},
    info:`<section class="card"><h2>Equipamento</h2><dl class="params"><dt>Nenhum</dt><dd>Piso firme; colchonete fino opcional.</dd></dl></section>
          <section class="card"><h2>Posição e técnica</h2><dl class="params">
          <dt>90/90</dt><dd>De costas, braços para o teto, quadris e joelhos a 90° (coxas verticais, canelas paralelas ao chão).</dd>
          <dt>Lombar</dt><dd>Contato leve e constante com o chão; costelas sobre a pelve.</dd>
          <dt>Braço</dt><dd>Desce em direção à cabeça com o cotovelo estendido, até perto da orelha.</dd>
          <dt>Perna oposta</dt><dd>Estende quadril e joelho até o calcanhar ficar poucos centímetros acima do chão, joelho com 10–20° de flexão.</dd>
          <dt>Limite</dt><dd>Pare antes de a lombar sair do chão, as costelas abrirem ou a pelve girar. Respire o tempo todo.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde). Use <b>Lado</b> para ver o outro lado.</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const {rep,tr,amt,err}=errAmt(errMode,t,T_END);
      const fp=x=>(err==='brusco'&&rep)?pJerk(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solve({p,err,amt});S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;J.tr=tr;return J;},
    phase(J){const ld=lado>0?'braço direito e perna esquerda':'braço esquerdo e perna direita';
      if(J.v>.05)return {kind:'ecc',label:'Extensão · '+ld,cue:'O abdômen segura a lombar no chão enquanto braço e perna opostos se afastam.'};
      if(J.v<-.05)return {kind:'conc',label:'Retorno · '+ld,cue:'Braço volta para o teto e a perna para o 90/90, sem o tronco oscilar.'};
      if(J.p>.5)return {kind:'iso',label:'Alcance máximo',cue:'Calcanhar acima do chão, costelas baixas, pelve parada.'};
      return {kind:'hold',label:'Posição 90/90',cue:'Braços para o teto, quadris e joelhos a 90°, lombar estável.'};},
    update(J,t,ph){
      spine.geometry.setFromPoints([J.P.clone().setZ(gz),sum(J.P,1,J.u,.6).setZ(gz)]);
      const a=J.side.find(x=>x.moveA)||J.side[0], l=J.side.find(x=>x.moveL)||J.side[1];
      const armA=90+(a.ph/DEG), hipF=90-l.ps/DEG, kneeF=l.kf/DEG;
      return {arm:{v:Math.round(armA)+'°',s:''},hip:{v:Math.round(hipF)+'°',s:''},knee:{v:Math.round(kneeF)+'°',s:J.p>.95?(kneeF>=8&&kneeF<=22?'ok':'warn'):''}};
    },
    viewChanged(v){latOnly.visible=v==='lateral';},
  };
})();

/* @@ex_bw3.js@@END */
/* @@ex_bw4.js@@ */
// #region: ex-bdg
/* ====================================================================================
   BIRD DOG contralateral. Quatro apoios, cabeça para +X, peito para baixo.
   Uma repetição: braço direito + perna esquerda; a seguinte troca de lado.
   ==================================================================================== */
const BDG=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  mkMatBW(grp,-.05,1.9,.8);
  const XK=-.25, KZ=.10, HZ=.20, FW=.82*LEN.fa;
  const reachW=f=>Math.sqrt(LEN.ua**2+FW**2-2*LEN.ua*FW*Math.cos((180-f)*DEG));
  const P0=V(XK,.055+LEN.th,0);
  const B0=Math.asin((reachW(8)+.045-P0.y+.01)/.46)/DEG;
  const XH=P0.x+.46*Math.cos(B0*DEG)+.01*Math.sin(B0*DEG);
  const rot=(v,a)=>V(v.x*Math.cos(a)-v.y*Math.sin(a),v.x*Math.sin(a)+v.y*Math.cos(a),0);
  const qFlat=alignQ(YUP,ZAX,V(0,-1,0),V(-1,0,0));
  let lado=1;
  const KEYS=[
   {t:0,   title:'Quatro apoios',d:'Mãos sob os ombros, joelhos sob o quadril, coluna neutra, pelve nivelada, olhar para o chão.'},
   {t:.6,  title:'Preparação',d:'Abdômen firme; o peso se acomoda sem girar a pelve.'},
   {t:1.1, title:'Início da extensão',d:'O braço começa a avançar e a perna oposta começa a estender para trás.',ph:'conc'},
   {t:1.6, title:'Extensão intermediária',d:'Braço e perna saem do chão; o tronco fica parado e o quadril paralelo ao chão.',ph:'conc'},
   {t:2.8, title:'Extensão completa controlada',d:'Braço e coxa perto da linha do tronco, joelho estendido, pelve sem rotação. Pausa curta.'},
   {t:3.6, title:'Início do retorno',d:'Braço e perna começam a descer, com o tronco estável.',ph:'ecc'},
   {t:4.1, title:'Retorno intermediário',d:'Mão e joelho se aproximam do chão, sem arredondar nem arquear a lombar.',ph:'ecc'},
   {t:4.55,title:'Retorno final',d:'Braço e perna chegam perto dos apoios originais.',ph:'ecc'},
   {t:5.3, title:'Quatro apoios',d:'Mão e joelho de volta ao chão. A próxima repetição troca o lado.'},
  ];
  const T_END=5.4, E0=.8, E1=2.4, R0=3.3, R1=5.0;
  const pBase=t=>t<E0?0:t<E1?ease((t-E0)/(E1-E0)):t<R0?1:t<R1?1-ease((t-R0)/(R1-R0)):0;
  function pJerk(t){if(t<E0)return 0;if(t<1.15){const s=(t-E0)/.35;return Math.min(1.08,1.08*s*(2-s));}if(t<1.5)return 1.08-.08*ease((t-1.15)/.35);if(t<R0)return 1;if(t<3.65){const s=(t-R0)/.35;return 1-s*s;}return 0;}
  const ERR={
    rotacao:{name:'Pelve girando para o lado da perna',fix:'Quadris paralelos ao chão; imagine um copo d\'água sobre a lombar.'},
    lombar:{name:'Perna acima da linha e lombar arqueando',fix:'A coxa para na linha do tronco; a altura é limitada pelo controle da coluna.'},
    cabeca:{name:'Cabeça olhando para a frente',fix:'Olhar para o chão entre as mãos, pescoço alinhado à coluna.'},
    mesmo:{name:'Braço e perna do mesmo lado',fix:'Lados opostos: braço direito com perna esquerda, e vice-versa.'},
    peso:{name:'Transferência de peso exagerada',fix:'O tronco não desliza para o lado; mãos e joelhos de apoio ficam no lugar.'},
    brusco:{name:'Movimento rápido com balanço',fix:'Lento e deliberado: ~1,5 s para estender, pausa e ~1,7 s para voltar.'},
  };
  let errMode=null;const wb=[0,0];
  function solve(st){
    const {p,err,amt}=st;
    const bones=new Array(NB);
    let b=B0, roll=0, legMax=72, head=-6, shiftZ=0, sag=0, legSide=-lado;
    if(err==='rotacao')roll=12*amt*sstep(.2,1,p);
    if(err==='lombar'){legMax=72+30*amt;sag=amt*sstep(.4,1,p);}
    if(err==='cabeca')head=-6-34*amt*sstep(0,.5,p+.3);
    if(err==='mesmo')legSide=lado;
    if(err==='peso')shiftZ=-.06*lado*amt*sstep(0,.6,p);
    const br=b*DEG, u=V(Math.cos(br),Math.sin(br),0), n=V(Math.sin(br),-Math.cos(br),0);
    const P=P0.clone().add(V(0,-.025*sag,shiftZ));
    let qT=torsoQ(u,n);
    if(roll){qT=new THREE.Quaternion().setFromAxisAngle(u,roll*DEG*(legSide>0?-1:1)).multiply(qT);}
    const mapT=torsoBones(bones,qT,P,(head-8*sag)*DEG);
    const side=[];
    [1,-1].forEach((s,i)=>{const m=-s;
      const Sj=mapT(L('Sj',m));
      const moveA=s===lado, moveL=s===legSide;
      const W=V(XH,.045,HZ*s);
      let H,palm,pole;
      if(moveA){const ph=100*p*DEG;H=Sj.clone().add(V(Math.sin(ph),-Math.cos(ph),0).multiplyScalar(.62));
        const h0=Sj.clone().add(V(0,-.62,0));if(p<.25){H=W.clone().lerp(H,sstep(0,.25,p));}
        palm=V(-1,0,0).lerp(ZAX.clone().multiplyScalar(-s),sstep(.1,.7,p)).normalize();pole=sum(n,-.3,u,-1,ZAX,s*.4);}
      else{H=W;palm=V(-1,0,0);pole=sum(u,-1,ZAX,s*.4,n,-.2);}
      const E1=ik(Sj,H.clone().add(V(0,-.055,0)),LEN.ua,LEN.fa,pole);
      const fd=H.clone().sub(E1).normalize();
      const bend=fd.angleTo(V(1,0,.12*s).normalize());
      const G=moveA?H.clone().addScaledVector(fd,.055*(1-sstep(0,.3,p))):H.clone().addScaledVector(fd,.055);
      const {E,qFT}=armBones(bones,qT,s,Sj,moveA&&p>.3?Sj.clone().add(H.clone().sub(Sj).setLength(.64)):G,pole,palm);
      wb[i]=moveA?bend*(1-sstep(.05,.4,p)):bend;
      const hip=mapT(L('Hip',m));
      const ps=(moveL?legMax*p:0)*DEG, kf=(moveL?90-82*p:90)*DEG;
      const td=V(-Math.sin(ps),-Math.cos(ps),0), sd=rot(td,-kf);
      const K=hip.clone().addScaledVector(td,LEN.th);K.y=Math.max(K.y,.05);
      const A=K.clone().addScaledVector(sd,LEN.sn);A.z=.1*s;A.y=Math.max(A.y,.05);
      const qN=alignQ(YUP,ZAX,sd.clone(),rot(sd,Math.PI/2));
      legBones(bones,qT,s,hip,A,V(.3,-1,0),moveL?qFlat.clone().slerp(qN,sstep(.1,.8,p)):qFlat);
      side.push({s,m,Sj,E,H,hip,K,A,qFT,moveA,moveL,ps,kf});});
    return {u,n,P,side,bones,roll};
  }
  const gz=.42;
  const levelSh=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);guides.add(levelSh);
  const levelHip=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),mats.guide);guides.add(levelHip);
  const latOnly=new THREE.Group();statics.add(latOnly);
  const lineB=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0),V(0,0,0)]),mats.guide);latOnly.add(lineB);
  let S=solve({p:0,err:null,amt:0});
  const hipTilt=J=>{const a=J.side[0].hip,b=J.side[1].hip;return Math.round(Math.atan2(a.y-b.y,Math.abs(a.z-b.z))/DEG);};
  const GT=[{label:'Pelve',text:()=>Math.abs(hipTilt(S))<=3?'Pelve nivelada':'Pelve girando',pos:()=>S.P.clone().add(V(-.1,.2,0)),views:['posterior']}];
  return {
    id:'bird-dog', title:'Bird Dog 3D', openHands:true,
    eyebrow:'Treino · Core · sem equipamento', h1:'Bird dog',
    specs:'<span>Quatro <b>apoios</b></span><span>Braço e perna <b>opostos</b></span><span>Pelve <b>nivelada</b></span><span>Alterna os <b>lados</b></span>',
    groups:{p:{label:'Anti-rotação',col:'--red'},s:{label:'Coluna',col:'--orange'},e:{label:'Extensão do quadril',col:'--yellow'},d:{label:'Estabilizadores do quadril',col:'--blue'},b:{label:'Cintura escapular',col:'--sky'},n:{label:'Também participa',col:'--muted'}},
    strongE:true,
    muscles:[
     {id:'obliquos',name:'Oblíquos interno e externo',g:'p',col:'--red',tag:'Oblíquos'},
     {id:'transverso',name:'Transverso do abdômen (profundo)',g:'p',col:'--red'},
     {id:'eretor',name:'Eretores da espinha e multífidos',g:'s',col:'--orange',tag:'Eretores'},
     {id:'gluteos',name:'Glúteo máximo (perna que estende)',g:'e',col:'--yellow',tag:'Glúteo máximo'},
     {id:'gluteoMed',name:'Glúteo médio e mínimo',g:'d',col:'--blue',tag:'Glúteo médio'},
     {id:'serratil',name:'Serrátil anterior',g:'b',col:'--sky'},{id:'trapMed',name:'Trapézio',g:'b',col:'--sky'},{id:'manguito',name:'Manguito rotador',g:'b',col:'--sky'},
     {id:'reto',name:'Reto abdominal',g:'n'},
    ],
    muscleTarget(m,kind){if(m.g==='p'||m.g==='s')return kind==='hold'?.55:.9;if(m.g==='e')return kind==='conc'?.95:kind==='iso'?.9:kind==='ecc'?.7:.3;if(m.g==='d'||m.g==='b')return kind==='hold'?.4:.6;return null;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides, guideTags:GT,
    readouts:[{id:'arm',label:'Braço × tronco'},{id:'hip',label:'Coxa × tronco'},{id:'tilt',label:'Inclinação da pelve'}],
    views:{lateral:{pos:V(-.05,.85,2.7),tgt:V(-.05,.42,0)},posterior:{pos:V(-2.6,.75,.02),tgt:V(0,.45,0)},
      diagonal:{pos:V(1.5,1.35,1.75),tgt:V(-.05,.42,0)},anatomia:{pos:V(-1.0,1.75,1.15),tgt:V(-.05,.45,0)}},
    portrait:1.45, degTag:null, degAnchor:null,
    errors:ERR,
    flipSide(){lado=-lado;}, sideLabel(){return lado>0?'braço direito + perna esquerda':'braço esquerdo + perna direita';},
    info:`<section class="card"><h2>Equipamento</h2><dl class="params"><dt>Nenhum</dt><dd>Piso firme; colchonete fino opcional para os joelhos.</dd></dl></section>
          <section class="card"><h2>Posição e técnica</h2><dl class="params">
          <dt>Apoios</dt><dd>Mãos sob os ombros (cotovelos suavemente estendidos), joelhos sob o quadril, dorso dos pés no chão.</dd>
          <dt>Tronco</dt><dd>Coluna neutra, abdômen firme, pelve nivelada; olhar para o chão entre as mãos.</dd>
          <dt>Extensão</dt><dd>Leve um braço à frente e a perna oposta para trás, até perto da linha do tronco, joelho estendido.</dd>
          <dt>Limite</dt><dd>Pare antes de a pelve girar ou a lombar arquear; a perna não passa da linha do tronco.</dd>
          <dt>Retorno</dt><dd>Volte devagar aos quatro apoios e troque o lado.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde). Na vista Posterior, as linhas mostram se ombros e pelve estão nivelados. Use <b>Lado</b> para ver o outro lado.</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const {rep,tr,amt,err}=errAmt(errMode,t,T_END);
      const fp=x=>(err==='brusco'&&rep)?pJerk(x):pBase(x);
      const p=fp(tr), v=(fp(Math.min(T_END,tr+.02))-fp(Math.max(0,tr-.02)))/.04;
      const J=solve({p,err,amt});S=J;J.p=p;J.v=v;J.active=true;J.err=err;J.rep=rep;return J;},
    postBones(BM){wristBend(BM,-1,wb[0]);wristBend(BM,1,wb[1]);},
    phase(J){const ld=lado>0?'braço direito e perna esquerda':'braço esquerdo e perna direita';
      if(J.v>.05)return {kind:'conc',label:'Extensão · '+ld,cue:'O core segura o tronco parado enquanto braço e perna opostos se estendem.'};
      if(J.v<-.05)return {kind:'ecc',label:'Retorno · '+ld,cue:'Mão e joelho voltam ao chão sem a pelve oscilar.'};
      if(J.p>.5)return {kind:'iso',label:'Extensão completa',cue:'Braço e coxa na linha do tronco, pelve nivelada. Pausa curta.'};
      return {kind:'hold',label:'Quatro apoios',cue:'Mãos sob os ombros, joelhos sob o quadril, coluna neutra.'};},
    update(J,t,ph){
      const a=J.side.find(x=>x.moveA)||J.side[0], l=J.side.find(x=>x.moveL)||J.side[1];
      const sh=[J.side[0].Sj,J.side[1].Sj].map(v=>v.clone().add(V(0,.16,0))), hp=[J.side[0].hip,J.side[1].hip].map(v=>v.clone().add(V(0,.17,0)));
      levelSh.geometry.setFromPoints([sh[0].clone().add(V(0,0,.12)),sh[1].clone().add(V(0,0,-.12))]);
      levelHip.geometry.setFromPoints([hp[0].clone().add(V(0,0,.14)),hp[1].clone().add(V(0,0,-.14))]);
      lineB.geometry.setFromPoints([a.H.clone().setZ(gz),a.Sj.clone().setZ(gz),l.hip.clone().setZ(gz),l.K.clone().setZ(gz)]);
      const armT=a.E.clone().sub(a.Sj).angleTo(J.u.clone().negate())/DEG, thT=l.K.clone().sub(l.hip).angleTo(J.u.clone().negate())/DEG;
      const tl=hipTilt(J);
      return {arm:{v:Math.round(armT)+'°',s:''},hip:{v:Math.round(thT)+'°',s:J.p>.95?(thT>=150?'ok':''):''},tilt:{v:Math.abs(tl)+'°',s:Math.abs(tl)<=3?'ok':'warn'}};
    },
    viewChanged(v){levelSh.visible=levelHip.visible=v==='posterior'||v==='diagonal';latOnly.visible=v==='lateral';},
  };
})();

// #region: ex-lng
/* ====================================================================================
   AFUNDO PARA TRÁS (reverse lunge). Em pé de frente para +X; a perna que recua dá um passo
   para trás, desce até ~90° nos dois joelhos e volta. A repetição seguinte troca a perna.
   ==================================================================================== */
const LNG=(function(){
  const grp=new THREE.Group(), guides=new THREE.Group();scene.add(grp);grp.add(guides);
  const statics=new THREE.Group();guides.add(statics);
  const FZ=.11, rot=(v,a)=>V(v.x*Math.cos(a)-v.y*Math.sin(a),v.x*Math.sin(a)+v.y*Math.cos(a),0);
  const PS=V(-.01,.905,0);
  const {P:PB}=fkSag(V(0,.085,0),14,-84,1);
  const ZB=58*DEG;
  const ankleOf=(ball,z)=>ball.clone().add(rot(V(-.14,.075,0),-z));
  /* passo para trás: o joelho de trás fica a ~7 cm do chão no fundo */
  let XR=-.7;{let best=1e9;for(let x=-1.0;x<=-.45;x+=.005){const hip=PB.clone().add(V(0,0,-.095));const A=ankleOf(V(x,.012,-.11),ZB);
    const K=ik(hip,A,LEN.th,LEN.sn,V(1,-1,0));const e=Math.abs(K.y-.095);if(e<best){best=e;XR=x;}}}
  let lado=1;
  const KEYS=[
   {t:0,   title:'Preparação',d:'Em pé, pés na largura do quadril, mãos na cintura, tronco neutro.'},
   {t:.65, title:'Início da passada',d:'O peso passa para a perna da frente; o pé de trás começa a sair do chão.'},
   {t:1.05,title:'Pé de trás em deslocamento',d:'A perna recua com o tronco estável e os pés em trilhos separados.'},
   {t:1.55,title:'Base de afundo',d:'O pé de trás toca o chão pelo antepé, calcanhar elevado; os dois joelhos começam a flexionar.',ph:'ecc'},
   {t:3.05,title:'Fundo do afundo',d:'Joelho da frente perto de 90°, joelho de trás perto de 90° e acima do chão, pé da frente inteiro apoiado, pelve nivelada.'},
   {t:3.6, title:'Início da subida',d:'Pressione o chão com o pé da frente; quadril e joelho da frente começam a estender.',ph:'conc'},
   {t:4.2, title:'Subida intermediária',d:'O corpo sobe; a perna de trás começa a se aproximar, tronco estável.',ph:'conc'},
   {t:5.2, title:'Retorno da passada',d:'A perna da frente estende e o pé de trás volta para junto do outro.'},
   {t:6.2, title:'Posição inicial',d:'Em pé, pés na largura do quadril. A próxima repetição troca a perna.'},
  ];
  const T_END=6.4;
  const stepOut=t=>sstep(.45,1.35,t)*(1-sstep(4.8,5.8,t));
  const dBase=t=>t<1.35?0:t<2.9?ease((t-1.35)/1.55):t<3.3?1:t<4.8?1-ease((t-3.3)/1.5):0;
  const dDrop=t=>t<1.35?0:t<1.75?Math.min(1.08,1.08*((t-1.35)/.4)**2):t<1.95?1.08-.08*ease((t-1.75)/.2):dBase(Math.max(t,2.9));
  const ERR={
    curto:{name:'Passo curto demais',fix:'Dê um passo maior para trás; os joelhos não devem se aproximar um do outro.'},
    longo:{name:'Passo longo demais',fix:'Encurte o passo até a pelve ficar estável e os dois joelhos perto de 90°.'},
    corda:{name:'Pés na mesma linha',fix:'Pés em trilhos separados, na largura do quadril, como em trilhos de trem.'},
    valgo:{name:'Joelho da frente caindo para dentro',fix:'Joelho da frente na direção do segundo/terceiro dedo do pé.'},
    calcanhar:{name:'Calcanhar da frente levantando',fix:'Pé da frente inteiro no chão; empurre pelo pé todo.'},
    bate:{name:'Joelho de trás batendo no chão',fix:'Desça com controle e pare com o joelho a poucos centímetros do chão.'},
    tronco:{name:'Tronco inclinando demais',fix:'Tronco quase ereto (5–15° à frente), coluna neutra.'},
    brusco:{name:'Queda rápida',fix:'Desça em ~1,5 s e suba em ~1,5 s, sem despencar.'},
  };
  let errMode=null;
  function solve(st){
    const {tr,d,so,err,amt}=st;
    const bones=new Array(NB);
    const stp=-lado, fs=lado;   /* perna que recua: esquerda (−Z) quando lado=1 */
    let xr=XR, zr=FZ*stp, zf=FZ*fs, lean=3+9*d, valg=0, heel=0, deep=0;
    if(err==='curto')xr=XR+.24*amt;
    if(err==='longo')xr=XR-.22*amt;
    if(err==='corda'){zr=.0;zf=.0;}
    if(err==='valgo')valg=amt*d;
    if(err==='calcanhar')heel=amt*d*18*DEG;
    if(err==='bate')deep=amt;
    if(err==='tronco')lean+=24*amt*d;
    const dd=Math.min(d,1.12)+.07*deep*d;
    const Ps=PS.clone().add(V(-.03*so,-.015*so,.035*fs*so*(1-d)));
    let PBx=PB.clone();if(err==='curto')PBx.add(V(.10*amt,.02*amt,0));if(err==='longo')PBx.add(V(-.10*amt,-.03*amt,0));
    const P=Ps.clone().lerp(PBx,dd);
    const a=lean*DEG, u=V(Math.sin(a),Math.cos(a),0), n=V(Math.cos(a),-Math.sin(a),0);
    const qT=torsoQ(u,n);
    const mapT=torsoBones(bones,qT,P,(lean*.3-2)*DEG);
    /* pé de trás: sai do lugar, viaja num arco e pousa pelo antepé */
    const ball0=V(.14,.012,FZ*stp), ballB=V(xr,.012,zr);
    const ball=ball0.clone().lerp(ballB,ease(so));ball.y+=.07*Math.sin(Math.PI*so);
    const zz=(so<1?28*Math.sin(Math.PI*so)+30*sstep(.5,1,so):30)+28*d;
    const Ar=ankleOf(ball,Math.max(0,zz)*DEG);
    const qR=new THREE.Quaternion().setFromAxisAngle(ZAX,-Math.max(0,zz)*DEG).multiply(alignQ(YUP,ZAX,YUP,XAX));
    let Af=V(0,.085,zf), qFf=alignQ(YUP,ZAX,YUP,XAX);
    if(heel>0){const b=V(.14,.012,zf);Af=ankleOf(b,heel);qFf=new THREE.Quaternion().setFromAxisAngle(ZAX,-heel).multiply(qFf);}
    const side=[];
    [1,-1].forEach(s=>{const m=-s;
      const Sj=mapT(L('Sj',m));
      const H=sum(mapT(L('Hip',m)),1,u,.1,n,.03,ZAX,.06*s);
      const {E,qFT}=armBones(bones,qT,s,Sj,H,sum(ZAX,s,n,-.35),ZAX.clone().multiplyScalar(-s));
      const hip=mapT(L('Hip',m));
      const rear=s===stp;
      const K=rear?legBones(bones,qT,s,hip,Ar,V(1,-.8,0),qR):legBones(bones,qT,s,hip,Af,sum(XAX,1,YUP,.05,ZAX,-s*1.4*valg),qFf);
      side.push({s,m,Sj,E,H,hip,K,A:rear?Ar:Af,qFT,rear});});
    return {u,n,P,side,bones,lean};
  }
  const vz=.5;const latOnly=new THREE.Group();statics.add(latOnly);
  const trackL=[1,-1].map(k=>lineIn(statics,[V(-1.0,.004,FZ*k),V(.45,.004,FZ*k)]));
  const kneeArcF=mkArcBW(guides), kneeArcR=mkArcBW(guides);
  const arrow=new THREE.ArrowHelper(YUP,V(0,0,0),.15,0xffffff,.055,.04);guides.add(arrow);
  let S=solve({tr:0,d:0,so:0,err:null,amt:0});
  return {
    id:'afundo-tras', title:'Afundo para Trás 3D', openHands:true,
    eyebrow:'Treino · Pernas · sem equipamento', h1:'Afundo para trás',
    specs:'<span>Passo <b>para trás</b></span><span>Joelhos <b>~90°</b> no fundo</span><span>Pés em <b>trilhos separados</b></span><span>Alterna as <b>pernas</b></span>',
    groups:{p:{label:'Principal · quadríceps (perna da frente)',col:'--red'},s:{label:'Extensor do quadril',col:'--orange'},e:{label:'Estabilizadores da pelve',col:'--yellow'},d:{label:'Sinergistas do quadril',col:'--blue'},b:{label:'Tornozelo, pé e tronco',col:'--sky'}},
    strongE:true,
    muscles:[
     {id:'retoFem',name:'Quadríceps · reto femoral',g:'p',col:'--red',tag:'Quadríceps'},{id:'vastoLat',name:'Quadríceps · vasto lateral',g:'p',col:'--red'},
     {id:'vastoMed',name:'Quadríceps · vasto medial',g:'p',col:'--red'},{id:'vastoInt',name:'Quadríceps · vasto intermédio',g:'p',col:'--red'},
     {id:'gluteos',name:'Glúteo máximo',g:'s',col:'--orange',tag:'Glúteo máximo'},
     {id:'gluteoMed',name:'Glúteo médio e mínimo',g:'e',col:'--yellow',tag:'Glúteo médio'},
     {id:'bicepsFem',name:'Isquiotibiais',g:'d',col:'--blue'},{id:'semitend',name:'Semitendíneo',g:'d',col:'--blue'},{id:'semimemb',name:'Semimembranáceo',g:'d',col:'--blue'},{id:'adutor',name:'Adutor magno',g:'d',col:'--blue',tag:'Adutor magno'},
     {id:'soleo',name:'Sóleo',g:'b',col:'--sky'},{id:'gastro',name:'Gastrocnêmio',g:'b',col:'--sky'},
     {id:'reto',name:'Reto abdominal e oblíquos',g:'b',col:'--green'},{id:'eretor',name:'Eretores da coluna',g:'b',col:'--green'},
    ],
    muscleTarget(m,kind){if(m.g==='p'||m.g==='s')return kind==='conc'?1:kind==='ecc'?.75:kind==='hold'?.45:.3;if(m.g==='e')return .65;return .45;},
    keys:KEYS, T_END, loopStart:0, loopChip:false, grp, guides,
    readouts:[{id:'kf',label:'Joelho da frente'},{id:'kr',label:'Joelho de trás'},{id:'gap',label:'Joelho de trás × chão'}],
    views:{lateral:{pos:V(-.2,1.0,3.6),tgt:V(-.2,.72,0)},frontal:{pos:V(2.9,1.05,0),tgt:V(-.15,.7,0)},
      diagonal:{pos:V(1.6,1.45,2.4),tgt:V(-.2,.72,0)},anatomia:{pos:V(-2.3,1.2,1.5),tgt:V(-.2,.7,0)}},
    portrait:1.55, degTag:null, degAnchor:null,
    errors:ERR,
    flipSide(){lado=-lado;}, sideLabel(){return lado>0?'perna esquerda recua':'perna direita recua';},
    info:`<section class="card"><h2>Equipamento</h2><dl class="params"><dt>Nenhum</dt><dd>Piso plano e antiderrapante; colchonete fino opcional para o joelho de trás.</dd></dl></section>
          <section class="card"><h2>Posição e técnica</h2><dl class="params">
          <dt>Início</dt><dd>Em pé, pés na largura do quadril, mãos na cintura, coluna neutra.</dd>
          <dt>Passada</dt><dd>Uma perna dá um passo para trás e pousa pelo antepé, calcanhar elevado. Pés em trilhos separados.</dd>
          <dt>Fundo</dt><dd>Os dois joelhos perto de 90°, o de trás a poucos centímetros do chão; pé da frente inteiro apoiado.</dd>
          <dt>Joelho da frente</dt><dd>Acompanha o segundo/terceiro dedo do pé; pode passar um pouco da ponta do pé.</dd>
          <dt>Tronco</dt><dd>Quase ereto, 5–15° à frente, pelve nivelada.</dd>
          <dt>Volta</dt><dd>Empurre o chão com o pé da frente e traga a perna de trás para junto da outra.</dd></dl></section>`,
    infoAfter:`<section class="card"><h2>Erros comuns</h2><p class="small" style="margin:0 0 8px">Toque num erro: o boneco faz uma repetição errada (vermelho) e depois a corrigida (verde). Na vista Frontal, as linhas no chão mostram os trilhos dos pés. Use <b>Lado</b> para trocar a perna.</p><div class="errs" id="errList"></div></section>`,
    setErr(m){errMode=m;}, getErr(){return errMode;},
    pose(t){
      const {rep,tr,amt,err}=errAmt(errMode,t,T_END);
      const fd=x=>(err==='brusco'&&rep)?dDrop(x):dBase(x);
      const d=fd(tr), v=(fd(Math.min(T_END,tr+.02))-fd(Math.max(0,tr-.02)))/.04, so=stepOut(tr);
      const J=solve({tr,d,so,err,amt});S=J;J.p=d;J.so=so;J.v=v;J.tr=tr;J.active=true;J.err=err;J.rep=rep;return J;},
    phase(J){const ld=lado>0?'perna esquerda recua':'perna direita recua';
      if(J.v>.05)return {kind:'ecc',label:'Descida · '+ld,cue:'Os dois joelhos flexionam; o pé da frente fica inteiro no chão.'};
      if(J.v<-.05)return {kind:'conc',label:'Subida · '+ld,cue:'Quadríceps e glúteo da perna da frente empurram o chão.'};
      if(J.p>.5)return {kind:'hold',label:'Fundo do afundo',cue:'Joelhos perto de 90°, o de trás acima do chão, pelve nivelada.'};
      if(J.so>.02)return {kind:'hold',label:J.tr<2?'Passo para trás':'Retorno da passada',cue:'Tronco estável, pés em trilhos separados.'};
      return {kind:'hold',label:'Posição inicial',cue:'Em pé, mãos na cintura, peso nos dois pés.'};},
    update(J,t,ph){
      const F=J.side.find(x=>!x.rear), R=J.side.find(x=>x.rear);
      setArcBW(kneeArcF,F.K,F.hip.clone().sub(F.K),F.A.clone().sub(F.K),V(0,0,.1*F.s),.1);
      setArcBW(kneeArcR,R.K,R.hip.clone().sub(R.K),R.A.clone().sub(R.K),V(0,0,.1*R.s),.1);
      const mov=Math.abs(J.v)>.05;arrow.visible=mov&&statics.visible;
      if(arrow.visible){arrow.position.copy(J.P.clone().add(V(-.15,.1,vz)));arrow.setDirection(J.v>0?YUP.clone().negate():YUP);arrow.setColor(lin(ph.kind==='conc'?COL.conc:COL.accent));}
      const kf=180-kneeAngle(F.hip,F.K,F.A), kr=180-kneeAngle(R.hip,R.K,R.A), gap=Math.round((R.K.y-.05)*100);
      const bot=J.p>.95;
      return {kf:{v:Math.round(kf)+'°',s:bot?(kf>=80&&kf<=105?'ok':'warn'):''},kr:{v:Math.round(kr)+'°',s:bot?(kr>=75&&kr<=110?'ok':'warn'):''},gap:{v:Math.max(0,gap)+' cm',s:bot?(gap>=1&&gap<=10?'ok':'warn'):''}};
    },
    viewChanged(v){statics.visible=v==='frontal'||v==='diagonal'||v==='lateral';trackL.forEach(l=>l.visible=v==='frontal'||v==='diagonal');kneeArcF.visible=kneeArcR.visible=v==='lateral'||v==='diagonal';},
  };
})();

/* @@ex_bw4.js@@END */
// #region: exs-registro
const EXS={'supino-inclinado':SUP,'leg-press-45':LPX,'remada-sentada':ROW,'stiff-halteres':STF,'elevacao-lateral':LAT,'triceps-polia':TRI,'prancha':PLK,'agachamento-goblet':GOB,'puxada-alta':PDN,'mesa-flexora':FLX,'rosca-biceps':RSC,'panturrilha-em-pe':CLF,'supino-maquina':CHP,'elevacao-pelvica':HPT,'agachamento-livre':SQL,'bom-dia':GMN,'flexao-joelhos':KPU,'flexao-parede':WPU,'ponte-gluteos':BRG,'dead-bug':DBG,'bird-dog':BDG,'afundo-tras':LNG};
let EXC=null;
window.__EX_IDS=Object.keys(EXS);

// #region: tema
/* ---------- Tema ---------- */
let COL={};
function applyTheme(){
  COL={accent:css('--accent'),conc:css('--conc'),red:lin(css('--red')),orange:lin(css('--orange')),yellow:lin(css('--yellow')),grey:lin('#8d96a1'),sky:lin(css('--sky')),blue:lin(css('--blue'))};
  renderer.setClearColor(css('--scene'));
  mats.pad.color.copy(lin(css('--pad')));mats.steel.color.copy(lin(css('--steel')));mats.frame.color.copy(lin(css('--frame')));
  mats.deck.color.copy(lin(css('--deck')));LPX.deckMat.color.copy(lin(css('--deck')));mats.lock.color.copy(lin(css('--lock')));
  mats.floor.color.copy(lin(css('--floor')));mats.guide.color.copy(lin(COL.accent));
  if(grid)scene.remove(grid);
  grid=new THREE.GridHelper(14,28,lin(css('--grid')),lin(css('--grid')));grid.position.y=.002;scene.add(grid);
  Object.values(EXS).forEach(x=>x.themeChanged&&x.themeChanged());
  if(EXC)EXC.mus.forEach(m=>m.f=-1);
  matMatBW.color.copy(lin(css('--mat')));
}
applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

// #region: cameras
/* ---------- Câmeras ---------- */
let view='lateral', tween=null;
function viewPose(k){const v=EXC.ex.views[k];const a=host.clientWidth/Math.max(1,host.clientHeight);const pf=EXC.ex.portrait||1.4;const f=a<1?pf:a<1.3?1+(pf-1)*.3:1;
  return {pos:v.tgt.clone().add(v.pos.clone().sub(v.tgt).multiplyScalar(f)),tgt:v.tgt.clone()};}
function setView(k,instant){view=k;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===k));
  const to=viewPose(k);
  if(instant||reduce){camera.position.copy(to.pos);controls.target.copy(to.tgt);tween=null;}
  else tween={fp:camera.position.clone(),ft:controls.target.clone(),tp:to.pos,tt:to.tgt,t:0};
  if(k==='anatomia'&&!showMus){showMus=true;syncToggles();}
  if(EXC.ex.viewChanged)EXC.ex.viewChanged(k);
}

// #region: reproducao
/* ---------- Estado de reprodução ---------- */
let t=0, playing=!reduce&&!window.__TEST__, speed=1, loopMov=true, showMus=true, showGuide=true, showParts=false, iso=null;
const framesEl=$('frames'), ticks=$('ticks'), legend=$('legend'), tagsEl=$('tags'), roEl=$('readouts'), errBadge=$('errBadge');
const degTag=document.createElement('span');degTag.className='tag deg';tagsEl.appendChild(degTag);
const pv=new THREE.Vector3();
function placeTag(e,p,on){if(!on||!p){e.hidden=true;return;}pv.copy(p).project(camera);
  if(pv.z>1||Math.abs(pv.x)>1.05||Math.abs(pv.y)>1.05){e.hidden=true;return;}
  e.hidden=false;e.style.left=((pv.x+1)/2*stage.clientWidth)+'px';e.style.top=((1-pv.y)/2*stage.clientHeight)+'px';}
const totalT=()=>EXC.ex.getErr&&EXC.ex.getErr()?EXC.ex.T_END*2:EXC.ex.T_END;

function buildTicks(){ticks.innerHTML='';const TT=totalT();const reps=TT>EXC.ex.T_END+1e-6?2:1;
  EXC.ex.keys.forEach(k=>k.ticks=[]);
  for(let r=0;r<reps;r++)EXC.ex.keys.forEach((k,i)=>{const tk=document.createElement('i');tk.textContent=reps>1?'':String(i+1).padStart(2,'0');
    if(reps>1)tk.className='dot';tk.style.left=((k.t+r*EXC.ex.T_END)/TT*100)+'%';ticks.appendChild(tk);k.ticks.push(tk);});}

function mountExercise(ex){
  EXC&&EXC.tags.forEach(x=>x.e.remove());EXC&&EXC.partTags.forEach(x=>x.e.remove());EXC&&EXC.guideTags.forEach(x=>x.e.remove());
  Object.values(EXS).forEach(x=>x.grp.visible=x===ex);
  if(ex.setErr)ex.setErr(null);
  $('exEyebrow').textContent=ex.eyebrow;$('exTitle').textContent=ex.h1;$('exSpecs').innerHTML=ex.specs;
  $('infoBefore').innerHTML=ex.info;$('infoAfter').innerHTML=ex.infoAfter;
  document.querySelectorAll('[data-view]').forEach(b=>b.hidden=!ex.views[b.dataset.view]);
  $('tLoop').hidden=!ex.loopChip;$('tParts').hidden=!ex.parts;$('tSide').hidden=!ex.flipSide;if(ex.flipSide)$('tSide').textContent='Lado: '+ex.sideLabel()+' ⇄';
  degTag.textContent=ex.degTag||'';
  roEl.innerHTML='';const ro={};
  ex.readouts.forEach(r=>{const d=document.createElement('div');d.className='ro';d.innerHTML=`<span>${r.label}</span><b>–</b>`;roEl.appendChild(d);ro[r.id]={box:d,b:d.querySelector('b')};});
  framesEl.innerHTML='';
  ex.keys.forEach((k,i)=>{const li=document.createElement('li');const b=document.createElement('button');
    const ph=k.ph?`<span class="ph ${k.ph}">${k.ph==='ecc'?'excêntrica':'concêntrica'}</span>`:'';
    b.innerHTML=`<span class="n">${String(i+1).padStart(2,'0')}</span><span class="t">${k.title}${ph}</span><span class="d">${k.d}</span>`;
    b.addEventListener('click',()=>{if(ex.getErr&&ex.getErr()){ex.setErr(null);syncErr();}t=k.t;setPlaying(false);});li.appendChild(b);framesEl.appendChild(li);k.btn=b;});
  const mus=ex.muscles.map(m=>Object.assign({},m,{I:.2,f:-1}));
  legend.innerHTML='';
  Object.entries(ex.groups).forEach(([g,G])=>{const box=document.createElement('div');box.className='mgroup';box.style.setProperty('--c',`var(${G.col})`);
    box.innerHTML=`<h3><i></i>${G.label}</h3>`;
    mus.filter(m=>m.g===g).forEach(m=>{const b=document.createElement('button');b.className='mus';b.textContent=m.name;b.setAttribute('aria-pressed','false');if(m.col)b.style.setProperty('--c',`var(${m.col})`);
      b.addEventListener('click',()=>{iso=iso===m.id?null:m.id;if(!showMus){showMus=true;syncToggles();}
        legend.querySelectorAll('.mus').forEach(x=>x.setAttribute('aria-pressed',x===b&&iso===m.id));mus.forEach(x=>x.f=-1);});
      box.appendChild(b);});
    legend.appendChild(box);});
  const tags=mus.filter(m=>m.tag).map(m=>{const e=document.createElement('span');e.className='tag';e.textContent=m.tag;e.style.setProperty('--c',`var(${m.col||ex.groups[m.g].col})`);e.hidden=true;tagsEl.appendChild(e);return {e,m};});
  const partTags=(ex.parts||[]).map(pt=>{const e=document.createElement('span');e.className='tag part';e.textContent=pt.label;e.hidden=true;tagsEl.appendChild(e);return {e,pt};});
  const guideTags=(ex.guideTags||[]).map(pt=>{const e=document.createElement('span');e.className='tag deg';e.textContent=pt.label;e.hidden=true;tagsEl.appendChild(e);return {e,pt};});
  EXC={ex,mus,tags,partTags,guideTags,ro,lastFrame:-1};
  iso=null;
  if(ex.errors){const list=$('errList');
    Object.entries(ex.errors).forEach(([id,E])=>{const b=document.createElement('button');b.className='err';b.dataset.err=id;b.setAttribute('aria-pressed','false');
      b.innerHTML=`<span class="x" aria-hidden="true">✕</span><span class="en">${E.name}</span><span class="ef"><b>Correção:</b> ${E.fix}</span>`;
      b.addEventListener('click',()=>{const cur=ex.getErr();ex.setErr(cur===id?null:id);syncErr();t=0;setPlaying(!!ex.getErr()||playing);
        if(ex.getErr())stage.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});});
      list.appendChild(b);});}
  buildTicks();
  document.title=ex.title;
}
function syncErr(){const ex=EXC.ex;const cur=ex.getErr&&ex.getErr();
  document.querySelectorAll('#errList .err').forEach(b=>b.setAttribute('aria-pressed',b.dataset.err===cur));
  buildTicks();if(t>totalT())t=0;EXC.lastFrame=-1;}

const playBtn=$('play'), playIcon=$('playIcon');
let wake=null;
function setPlaying(v){playing=v;playBtn.setAttribute('aria-label',v?'Pausar':'Reproduzir');
  playIcon.innerHTML=v?'<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>':'<path d="M7 4v16l13-8z"/>';
  if(v&&!wake&&navigator.wakeLock){navigator.wakeLock.request('screen').then(w=>{wake=w;w.addEventListener('release',()=>wake=null);}).catch(()=>{});}}
setPlaying(playing);
playBtn.addEventListener('click',()=>{if(!playing&&t>=totalT()-1e-3)t=loopMov?EXC.ex.loopStart:0;setPlaying(!playing);});
const repOf=()=>{const T=EXC.ex.T_END;return t>=T&&totalT()>T?T:0;};
$('next').addEventListener('click',()=>{const o=repOf();const K=EXC.ex.keys;const k=K.find(k=>k.t+o>t+.01);t=k?k.t+o:K[0].t;setPlaying(false);});
$('prev').addEventListener('click',()=>{const o=repOf();const K=EXC.ex.keys;const k=[...K].reverse().find(k=>k.t+o<t-.01);t=k?k.t+o:K[K.length-1].t;setPlaying(false);});
const scrub=$('scrub');
scrub.addEventListener('input',()=>{t=scrub.value/1000*totalT();setPlaying(false);});
$('speeds').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{speed=+b.dataset.sp;
  $('speeds').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
function syncToggles(){$('tMus').setAttribute('aria-pressed',showMus);$('tGuide').setAttribute('aria-pressed',showGuide);$('tLoop').setAttribute('aria-pressed',loopMov);$('tParts').setAttribute('aria-pressed',showParts);if(EXC)EXC.mus.forEach(m=>m.f=-1);}
$('tMus').addEventListener('click',()=>{showMus=!showMus;if(!showMus)iso=null;legend.querySelectorAll('.mus').forEach(x=>x.setAttribute('aria-pressed','false'));syncToggles();});
$('tGuide').addEventListener('click',()=>{showGuide=!showGuide;syncToggles();});
$('tLoop').addEventListener('click',()=>{loopMov=!loopMov;syncToggles();});
$('tParts').addEventListener('click',()=>{showParts=!showParts;syncToggles();});
/* exercícios unilaterais alternados: troca o lado a cada repetição; o chip troca na hora */
function syncSide(){const ex=EXC&&EXC.ex;if(!ex||!ex.sideLabel)return;$('tSide').textContent='Lado: '+ex.sideLabel()+' ⇄';}
$('tSide').addEventListener('click',()=>{const ex=EXC&&EXC.ex;if(ex&&ex.flipSide){ex.flipSide();syncSide();t=0;EXC.lastFrame=-1;}});

function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();

// #region: cores-musculares
/* ---------- Cores musculares ---------- */
function paintMuscles(){
  if(!colorAttr)return;let dirty=false;const c=colorAttr.array;
  EXC.mus.forEach(m=>{
    let f=showMus?(m.g==='n'?.5:m.g==='d'?.28+.2*m.I:(m.g==='e'||m.g==='b'||m.g==='d')?(EXC.ex.strongE?.45+.35*m.I:.2+.22*m.I):.7+.3*m.I):0;
    if(iso&&iso!==m.id)f=0;
    if(Math.abs(f-m.f)<.01)return;m.f=f;dirty=true;
  });
  if(!dirty)return;
  c.set(baseCol);
  const ORD={n:0,d:1,b:2,e:3,s:4,p:5};
  [...EXC.mus].sort((a,b)=>ORD[a.g]-ORD[b.g]).forEach(m=>{const mk=MASK[m.id];if(!mk||m.f<=0)return;const gc=m.col?lin(css(m.col)):m.g==='p'?COL.red:m.g==='s'?COL.orange:m.g==='n'?COL.grey:m.g==='b'?COL.sky:m.g==='d'?COL.blue:COL.yellow;
    for(let k=0;k<mk.vi.length;k++){const o=mk.vi[k]*3,w=mk.vw[k]*m.f;
      c[o]+=(gc.r-c[o])*w;c[o+1]+=(gc.g-c[o+1])*w;c[o+2]+=(gc.b-c[o+2])*w;}});
  colorAttr.needsUpdate=true;
}

// #region: loop
/* ---------- Loop ---------- */
const clock=new THREE.Clock();
const fmt=x=>x.toFixed(1).replace('.',',');
const BM=[...Array(NB)].map(()=>new THREE.Matrix4());
const fingPiv=[1,-1].map((m,k)=>{const c=L('MCP',m);return new THREE.Matrix4().makeTranslation(c.x,c.y,c.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(curlQ[k])).multiply(new THREE.Matrix4().makeTranslation(-c.x,-c.y,-c.z));});
const tmpV=new THREE.Vector3(), anchorV=new THREE.Vector3();
function boneMatrix(b,out){out.makeRotationFromQuaternion(b.q);tmpV.copy(b.pr).applyQuaternion(b.q);out.setPosition(b.pt.x-tmpV.x,b.pt.y-tmpV.y,b.pt.z-tmpV.z);return out;}
function anchorPos(id){const mk=MASK[id];if(!mk||!mk.anchor||!body)return null;const a=mk.anchor.v;const si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight;
  const p=V(0,0,0);for(let k=0;k<4;k++){const w=sw.array[a*4+k];if(w<=0)continue;anchorV.copy(mk.anchor.c).applyMatrix4(BM[si.array[a*4+k]]);p.addScaledVector(anchorV,w);}return p;}
function declutter(list){const vis=list.filter(x=>!x.e.hidden).map(x=>({e:x.e,x:parseFloat(x.e.style.left),y:parseFloat(x.e.style.top),w:x.e.offsetWidth})).sort((a,b)=>a.y-b.y);
  for(let i=1;i<vis.length;i++)for(let j=0;j<i;j++){const A=vis[j],B=vis[i];if(Math.abs(A.x-B.x)<(A.w+B.w)/2+4&&B.y-A.y<22){B.y=A.y+22;B.e.style.top=B.y+'px';}}}

function frame(dtOverride){
  const ex=EXC.ex;
  const dt=dtOverride!=null?dtOverride:Math.min(clock.getDelta(),.05);
  const TT=totalT();
  if(playing){t+=dt*speed;if(t>TT){
    if(ex.getErr&&ex.getErr()){ex.setErr(null);syncErr();t=0;}
    else{t=loopMov?ex.loopStart+(t-TT):0;if(ex.flipSide){ex.flipSide();syncSide();}}}}
  t=Math.min(Math.max(t,0),totalT());
  const J=ex.pose(t);
  J.bones.forEach((b,i)=>boneMatrix(b,BM[i]));if(window.__TEST__){window.__J=J;window.__BM=BM;window.__bi=bi;}
  if(ex.postBones)ex.postBones(BM,J);
  if(!ex.openHands)[0,1].forEach(k=>{const m=k===0?1:-1;BM[bi('fing',m)].multiply(fingPiv[k]);});
  if(window.__REST__)BM.forEach(x=>x.identity());
  if(body){boneObjs.forEach((b,i)=>b.matrix.copy(BM[i]));}

  const ph=ex.phase(J);
  const phEl=$('phase');phEl.textContent=ph.label;phEl.dataset.k=ph.kind;$('cue').textContent=ph.cue;
  const err=ex.getErr&&ex.getErr();
  if(err){const bad=J.rep===1;errBadge.hidden=false;errBadge.dataset.k=bad?'bad':'good';
    errBadge.textContent=bad?`✕ Incorreto · ${ex.errors[err].name}`:'✓ Correto · execução corrigida';}
  else errBadge.hidden=true;

  const target={p:.25,s:.2,e:.25};
  if(ph.kind==='ecc'){target.p=.7;target.s=.45;target.e=.4;}
  else if(ph.kind==='conc'){target.p=1;target.s=1;target.e=.45;}
  else if(ph.kind==='hold'){target.p=.55;target.s=.4;target.e=.35;}
  EXC.mus.forEach(m=>{const o=ex.muscleTarget?ex.muscleTarget(m,ph.kind):null;m.I+=((o??target[m.g]??.3)-m.I)*(dtOverride!=null?1:.12);});
  paintMuscles();

  const tr=t%ex.T_END+(t>=totalT()-1e-6&&totalT()>0?0:0);
  const tl=t>=ex.T_END&&totalT()>ex.T_END?t-ex.T_END:Math.min(t,ex.T_END);
  let idx=0;ex.keys.forEach((k,i)=>{if(tl>=k.t-.02)idx=i;});
  const repI=(t>=ex.T_END&&totalT()>ex.T_END)?1:0;
  const fk=idx+repI*100;
  if(mini.cap&&mini.cap.dataset.k!==ph.kind)mini.cap.dataset.k=ph.kind;
  if(fk!==EXC.lastFrame){EXC.lastFrame=fk;$('frameNo').textContent=`FRAME ${String(idx+1).padStart(2,'0')} / 09`;$('frameTitle').textContent=ex.keys[idx].title;
    if(mini.cap)mini.cap.textContent=ex.keys[idx].title;
    ex.keys.forEach((k,i)=>{k.btn.classList.toggle('on',i===idx);k.ticks.forEach((tk,r)=>tk.classList.toggle('on',i===idx&&r===repI));});}

  const ro=ex.update(J,t,ph);
  for(const id in ro){const r=EXC.ro[id];if(!r)continue;r.b.textContent=ro[id].v;r.box.dataset.s=ro[id].s;}

  ex.guides.visible=showGuide;

  if(tween){tween.t=Math.min(1,tween.t+dt/0.9);const e=tween.t<.5?2*tween.t*tween.t:1-Math.pow(-2*tween.t+2,2)/2;
    camera.position.lerpVectors(tween.fp,tween.tp,e);controls.target.lerpVectors(tween.ft,tween.tt,e);if(tween.t>=1)tween=null;}
  controls.update();

  if(document.activeElement!==scrub)scrub.value=Math.round(t/totalT()*1000);
  $('time').textContent=`${fmt(t)} s / ${fmt(totalT())} s`;

  renderer.render(scene,camera);
  const labelsOn=showMus&&view==='anatomia'&&!!body;
  EXC.tags.forEach(({e,m})=>placeTag(e,labelsOn?anchorPos(m.id):null,labelsOn&&(!iso||iso===m.id)));
  if(labelsOn)declutter(EXC.tags);
  EXC.partTags.forEach(({e,pt})=>placeTag(e,showParts?pt.pos():null,showParts));
  if(showParts)declutter(EXC.partTags);
  placeTag(degTag,ex.degAnchor,!!ex.degTag&&showGuide&&view==='lateral');
  EXC.guideTags.forEach(({e,pt})=>{if(pt.text)e.textContent=pt.text();});
  EXC.guideTags.forEach(({e,pt})=>placeTag(e,pt.pos(),showGuide&&!showParts&&(!pt.views||pt.views.includes(view))));
}
const exView=document.getElementById('exView');
// #region: mini
/* ---------- Prévia animada na tela da sessão (mesmo renderer, levado para outro container) ---------- */
const mini={el:null,id:null,vis:true,cap:null,saved:null,io:null,ro:null};
function miniOff(){
  if(mini.io)mini.io.disconnect();if(mini.ro)mini.ro.disconnect();
  const was=!!mini.saved;
  mini.el=mini.cap=mini.io=mini.ro=null;mini.id=null;
  if(renderer.domElement.parentNode!==stage)stage.insertBefore(renderer.domElement,stage.firstChild);
  host=stage;controls.enabled=true;renderer.domElement.style.touchAction='none';
  if(was){showGuide=mini.saved.g;speed=mini.saved.sp;loopMov=mini.saved.lp;mini.saved=null;syncToggles();}
  resize();
}
window.__mini=(el,id)=>{
  const ex=el&&EXS[id];
  if(!ex){if(mini.el||mini.saved)miniOff();return;}
  if(!mini.saved)mini.saved={g:showGuide,sp:speed,lp:loopMov};
  const fresh=mini.id!==id||!EXC||EXC.ex!==ex;
  if(!EXC||EXC.ex!==ex)mountExercise(ex);
  if(renderer.domElement.parentNode!==el)el.insertBefore(renderer.domElement,el.firstChild);
  host=el;mini.el=el;mini.id=id;mini.cap=el.querySelector('[data-mini-cap]');
  const ld=el.querySelector('[data-mini-load]');if(ld)ld.hidden=!!body;
  controls.enabled=false;renderer.domElement.style.touchAction='pan-y';
  showGuide=false;loopMov=true;speed=1;iso=null;showMus=true;syncToggles();
  if(mini.io)mini.io.disconnect();mini.vis=true;
  if('IntersectionObserver' in window){mini.io=new IntersectionObserver(es=>{mini.vis=es[es.length-1].isIntersecting;});mini.io.observe(el);}
  if(mini.ro)mini.ro.disconnect();mini.ro=new ResizeObserver(resize);mini.ro.observe(el);
  resize();
  if(fresh){if(ex.getErr&&ex.getErr()){ex.setErr(null);syncErr();}setView(ex.defaultView||'lateral',true);t=ex.loopStart||0;playing=!reduce&&!window.__TEST__;}
  EXC.lastFrame=-1;
  if(window.__TEST__){t=ex.keys[Math.min(4,ex.keys.length-1)].t;for(let i=0;i<3;i++)frame(0);}
};
function loop(){if(EXC&&(!exView.hidden||(mini.el&&mini.vis&&mini.el.isConnected&&!document.hidden)))frame();requestAnimationFrame(loop);}
// #region: enter-exercise
window.__enterExercise=(id)=>{const ex=EXS[id];if(!ex)return;miniOff();if(!EXC||EXC.ex!==ex)mountExercise(ex);resize();setView(ex.defaultView||'lateral',true);t=0;
  if(ex.setErr){ex.setErr(null);syncErr();}setPlaying(!reduce&&!window.__TEST__);};

// #region: carga-modelo-fetch
const loadFail=err=>{loadingEl.textContent='Não foi possível carregar o modelo anatômico. Recarregue a página.';console.error(err);};
/* o arquivo GLB é publicado com extensão .wasm porque o host só serve tipos web padrão */
fetch('body-model.wasm').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();})
  .then(buf=>new THREE.GLTFLoader().parse(buf,'',g=>{
    try{buildBody(g);loadingEl.hidden=true;if(mini.el){const ld=mini.el.querySelector('[data-mini-load]');if(ld)ld.hidden=true;}if(EXC)EXC.mus.forEach(m=>m.f=-1);}catch(err){loadingEl.textContent='Erro ao montar o modelo: '+err.message;console.error(err);}
    if(window.__TEST__)window.__READY__=true;
  },loadFail)).catch(loadFail);

// #region: ganchos-teste
if(window.__TEST__){window.__EXC=()=>EXC;window.__go=(tt,vw,cp,ct,err)=>{if(err!==undefined&&EXC.ex.setErr){EXC.ex.setErr(err);syncErr();}t=tt;if(vw)setView(vw,true);tween=null;if(cp){camera.position.set(...cp);controls.target.set(...ct);}for(let i=0;i<3;i++)frame(0);return true;};
  window.__parts=v=>{showParts=v;syncToggles();};}
else requestAnimationFrame(loop);
})();

