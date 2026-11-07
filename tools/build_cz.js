/* ---------- Carrega o modelo e cria o rig ---------- */
let body=null, skel=null, colorAttr=null, baseCol=null, eyeMesh=null;
const boneObjs=[];

/* pesos de deformação: blend contínuo ao longo de cada cadeia (tronco → braço → antebraço → mão; tronco → coxa → perna → pé) */
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
  return {t,d:Math.hypot(vx-dx*tc,vy-dy*tc,vz-dz*tc),L:Ln};}

/* regiões musculares no corpo em T-pose (medidas sobre o relevo do modelo) */
const band=(v,a,b,e=.008)=>sstep(a-e,a+e,v)*(1-sstep(b-e,b+e,v));
function masks(x,y,z,nx,ny,nz){
  const ax=Math.abs(x), lat=nx*Math.sign(x||1), out={};
  const front=sstep(.1,.35,nz), backF=sstep(.1,.35,-nz);
  /* peitoral maior */
  const pecLow=ax<.19?1.222+1.585*ax*ax:1.279+(ax-.19)*2.0, pecUp=ax<.12?1.432:1.432-(ax-.12)*.6;
  const pecX=band(ax,.006,.216,.006)*front;
  const pec=pecX*band(y,pecLow,pecUp,.007);
  if(pec>0){const split=1.36+.25*Math.max(0,ax-.13);const c=sstep(split-.006,split+.006,y);
    out.pecClav=pec*c;out.pecEst=pec*(1-c);}
  /* deltoide anterior: capa do ombro, face anterior */
  const dA=band(ax,.185,.33,.012)*band(y,1.31,1.49,.01)*sstep(.15,.45,nz)*(1-(out.pecClav||0)-(out.pecEst||0));
  if(dA>0)out.deltAnt=dA;
  /* braço: bíceps à frente, tríceps atrás */
  const arm=band(ax,.30,.52,.014)*band(y,1.27,1.44,.01);
  if(arm>0){const tr=arm*sstep(.1,.35,-nz);if(tr>0)out.triceps=tr;const bc=arm*sstep(.2,.45,nz)*band(ax,.31,.50,.012);if(bc>0)out.biceps=bc;}
  /* tronco anterior */
  const ra=band(ax,0,.072,.006)*band(y,.95,1.215,.008)*sstep(.35,.6,nz);if(ra>0)out.reto=ra;
  const ob=band(ax,.085,.19,.01)*band(y,.93,1.165,.01)*sstep(-.2,.15,nz)*sstep(.1,.4,lat+nz)*(1-ra);if(ob>0)out.obliquos=ob;
  const se=band(ax,.15,.215,.008)*band(y,1.15,1.285,.01)*sstep(.25,.5,lat)*sstep(-.35,-.1,nz);if(se>0)out.serratil=se;
  /* costas */
  const trapW=y<1.38?.03+(y-1.12)*.45:.15;
  const tp=band(ax,0,Math.max(.01,trapW),.01)*band(y,1.12,1.43,.01)*sstep(.3,.55,-nz);if(tp>0)out.trapezio=tp;
  const rc=band(ax,.09,.19,.01)*band(y,1.24,1.37,.01)*sstep(.3,.55,-nz)*(1-tp);if(rc>0)out.manguito=rc;
  const gl=band(ax,.005,.185,.01)*band(y,.76,.985,.012)*sstep(.15,.45,-nz);if(gl>0)out.gluteos=gl;
  return out;
}

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
  const acc={};MUS.forEach(m=>acc[m.id]={i:[],w:[],cx:0,cy:0,cz:0,n:0});
  for(let i=0;i<nv;i++){
    const x=P.getX(i),y=P.getY(i),z=P.getZ(i);
    col[i*3]=base.r;col[i*3+1]=base.g;col[i*3+2]=base.b;
    const w=weightsFor(x,y,z);
    for(let k=0;k<4;k++){sIdx[i*4+k]=w[k]?w[k][0]:0;sW[i*4+k]=w[k]?w[k][1]:0;}
    const mk=masks(x,y,z,N.getX(i),N.getY(i),N.getZ(i));
    for(const id in mk){const v=Math.min(1,mk[id]);if(v<.02)continue;const a=acc[id];a.i.push(i);a.w.push(v);
      if(x<0&&v>.5){a.cx+=x;a.cy+=y;a.cz+=z;a.n++;}}
  }
  colorAttr=new THREE.BufferAttribute(col,3);colorAttr.setUsage(THREE.DynamicDrawUsage);geo.setAttribute('color',colorAttr);
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(sIdx,4));
  geo.setAttribute('skinWeight',new THREE.BufferAttribute(sW,4));
  if(geo.attributes.uv)geo.setAttribute('uv2',geo.attributes.uv);
  baseCol=col.slice();
  MUS.forEach(m=>{const a=acc[m.id];m.vi=Uint32Array.from(a.i);m.vw=Float32Array.from(a.w);
    if(a.n){const c=V(a.cx/a.n,a.cy/a.n,a.cz/a.n);let best=-1,bd=1e9;
      for(const i of a.i){const d=(P.getX(i)-c.x)**2+(P.getY(i)-c.y)**2+(P.getZ(i)-c.z)**2;if(d<bd){bd=d;best=i;}}
      m.anchor={v:best,c:V(P.getX(best),P.getY(best),P.getZ(best))};}});
  const sm=src.material;
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,skinning:true,metalness:0,roughness:.78,
    normalMap:sm.normalMap||null,aoMap:sm.aoMap||null,aoMapIntensity:1});
  if(sm.normalMap)mat.normalScale.set(1.15,1.15);
  const root=new THREE.Group();scene.add(root);
  for(let i=0;i<NB;i++){const b=new THREE.Bone();b.matrixAutoUpdate=false;root.add(b);boneObjs.push(b);}
  skel=new THREE.Skeleton(boneObjs,boneObjs.map(()=>new THREE.Matrix4()));
  body=new THREE.SkinnedMesh(geo,mat);body.bind(skel,new THREE.Matrix4());
  body.frustumCulled=false;body.castShadow=true;body.receiveShadow=true;scene.add(body);
  /* olhos presos ao osso da cabeça */
  if(eyes.length){const parts=eyes.map(e=>{const g=e.geometry.clone();g.applyMatrix4(e.matrixWorld);g.applyMatrix4(fix);
      const n=g.attributes.position.count;return {g,n};});
    const tot=parts.reduce((s,p)=>s+p.n,0);const pos=new Float32Array(tot*3),nor=new Float32Array(tot*3);let o=0;const idx=[];
    parts.forEach(p=>{pos.set(p.g.attributes.position.array,o*3);nor.set(p.g.attributes.normal.array,o*3);
      if(p.g.index)for(const v of p.g.index.array)idx.push(v+o);else for(let k=0;k<p.n;k++)idx.push(k+o);o+=p.n;});
    const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.BufferAttribute(pos,3));eg.setAttribute('normal',new THREE.BufferAttribute(nor,3));eg.setIndex(idx);
    const si=new Uint16Array(tot*4),sw=new Float32Array(tot*4);for(let k=0;k<tot;k++){si[k*4]=BI.head;sw[k*4]=1;}
    eg.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));eg.setAttribute('skinWeight',new THREE.BufferAttribute(sw,4));
    eyeMesh=new THREE.SkinnedMesh(eg,new THREE.MeshStandardMaterial({color:0xcfcac3,roughness:.4,skinning:true}));
    eyeMesh.bind(skel,new THREE.Matrix4());eyeMesh.frustumCulled=false;scene.add(eyeMesh);}
}
