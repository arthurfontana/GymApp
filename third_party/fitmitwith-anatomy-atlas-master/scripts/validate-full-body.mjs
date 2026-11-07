import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const map=JSON.parse(fs.readFileSync(path.join(root,'public/full-body-map.json')));
const audit=JSON.parse(fs.readFileSync(path.join(root,'public/full-body-audit.json')));
assert.equal(map.muscles.length,218);
assert.equal(new Set(map.muscles.map(m=>m.id)).size,218);
for(const left of map.muscles.filter(m=>m.side==='left'))assert(map.muscles.some(m=>m.id===left.key+'_right'));
const expected=[...map.muscles,...map.bones,...map.support].map(m=>m.id).sort();
const results=[];
for(const asset of map.assets){
  const bytes=fs.readFileSync(path.join(root,'public',asset.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
  const nodes=doc.nodes.filter(n=>n.mesh!==undefined);
  assert.equal(nodes.length,asset.meshCount);assert.equal(doc.scenes.length,1);
  assert.deepEqual(nodes.map(n=>n.extras?.muscleId||n.extras?.boneId||n.extras?.supportId).sort(),expected);
  const binStart=20+jsonLength+8;
  let triangles=0;const bounds={};
  for(const node of nodes){
    const id=node.extras.muscleId||node.extras.boneId||node.extras.supportId;
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const prim of doc.meshes[node.mesh].primitives){
      assert.equal(prim.mode??4,4);triangles+=doc.accessors[prim.indices].count/3;
      for(const attribute of ['POSITION','NORMAL']){
        const a=doc.accessors[prim.attributes[attribute]],v=doc.bufferViews[a.bufferView];assert.equal(a.componentType,5126);
        const offset=binStart+(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||12;
        for(let i=0;i<a.count;i++)for(let c=0;c<3;c++){
          const value=bytes.readFloatLE(offset+i*stride+c*4);assert(Number.isFinite(value));
          if(attribute==='POSITION'){min[c]=Math.min(min[c],value);max[c]=Math.max(max[c],value);}
        }
      }
    }
    bounds[id]={min,max};
  }
  const center=(id,c)=>(bounds[id].min[c]+bounds[id].max[c])/2;
  assert(center('deltoid_anterior_left',0)>.08,'Left shoulder on anatomical left');
  assert(center('deltoid_anterior_right',0)<-.08,'Right shoulder on anatomical right');
  assert(center('deltoid_anterior_left',1)>1.25,'Evaluated source shoulder height');
  assert(center('rectus_femoris_left',1)>.5&&center('rectus_femoris_left',1)<.9,'Thigh source position');
  const stature=bounds.skeleton.max[1]-bounds.skeleton.min[1];
  assert(stature>1.5&&stature<1.9,'Human skeleton stature');
  assert(bounds.skeleton.max[0]-bounds.skeleton.min[0]>.45,'Full body width');
  assert.equal(triangles,asset.triangles);assert.equal(bytes.length,asset.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  results.push({file:asset.url,meshes:nodes.length,triangles,bytes:bytes.length,statureMetres:stature,status:'passed'});
}
for(const row of audit.meshes){const l=audit.limits[row.quality];assert(row.maxSampledErrorMm<=l.maxMm&&row.rmsSampledErrorMm<=l.rmsMm,row.id+' surface fidelity');}
const report={status:'passed',muscleIds:218,assets:results,sampledGeometryChecks:audit.meshes.length,note:'Structural and source-deviation checks; not an anatomy expert review.'};
fs.writeFileSync(path.join(root,'output/full-body-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
