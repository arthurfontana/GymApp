"""Build full-body anatomy from the existing atlas. Run inside Blender; no source edits."""
import bpy, json, math, re, ast, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path('C:/Users/slfresh/Desktop/codex cli 3d model/fitness-anatomy')
OUT=ROOT/'public/models'
SOURCE=ROOT/'source/anatomy-source.blend'
# The regional definitions are data; parse them without executing the old builder.
tree=ast.parse((ROOT/'scripts/build_assets.py').read_text(encoding='utf8'))
definitions=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='definitions' for t in n.targets))
definitions=[d for d in definitions if d[5]!='bone']
extra={
 'Chest':('chest',[
 ('Clavicular head of pectoralis major muscle','pectoralis_major_clavicular','Upper pectoralis major'),
 ('Sternocostal head of pectoralis major muscle','pectoralis_major_sternocostal','Sternocostal pectoralis major'),
 ('(Abdominal part of pectoralis major muscle)','pectoralis_major_abdominal','Lower pectoralis major'),
 ('Pectoralis minor muscle','pectoralis_minor','Pectoralis minor')]),
 'Serratus':('chest',[('Serratus anterior muscle','serratus_anterior','Serratus anterior')]),
 'Trapezius':('back',[
 ('Descending part of trapezius muscle','trapezius_upper','Upper trapezius'),
 ('Transverse part of trapezius muscle','trapezius_middle','Middle trapezius'),
 ('Ascending part of trapezius muscle','trapezius_lower','Lower trapezius')]),
 'Lats':('back',[('Latissimus dorsi muscle','latissimus_dorsi','Latissimus dorsi')]),
 'Upper back':('back',[
 ('Rhomboid major muscle','rhomboid_major','Rhomboid major'),('Rhomboid minor muscle','rhomboid_minor','Rhomboid minor'),
 ('Levator scapulae','levator_scapulae','Levator scapulae'),
 ('Serratus posterior inferior muscle','serratus_posterior_inferior','Serratus posterior inferior'),
 ('Serratus posterior superior muscle','serratus_posterior_superior','Serratus posterior superior')]),
 'Spinal extensors':('back',[
 ('Iliocostalis lumborum muscle','iliocostalis_lumborum','Iliocostalis lumborum'),
 ('Iliocostalis thoracis muscle','iliocostalis_thoracis','Iliocostalis thoracis'),
 ('Longissimus thoracis muscle','longissimus_thoracis','Longissimus thoracis'),
 ('Spinalis thoracis muscle','spinalis_thoracis','Spinalis thoracis'),
 ('Multifidus lumborum muscle','multifidus_lumborum','Multifidus lumborum')]),
 'Abdominals':('core',[('Rectus abdominis muscle','rectus_abdominis','Rectus abdominis'),
 ('Transversus abdominis muscle','transversus_abdominis','Transversus abdominis')]),
 'Obliques':('core',[('External abdominal oblique muscle','external_oblique','External oblique'),
 ('Internal abdominal oblique muscle','internal_oblique','Internal oblique')]),
 'Lower back':('core',[('Quadratus lumborum muscle','quadratus_lumborum','Quadratus lumborum')]),
 'Neck':('neck',[('Sternocleidomastoid muscle','sternocleidomastoid','Sternocleidomastoid'),
 ('Scalenus medius muscle','scalenus_medius','Middle scalene'),('Scalenus anterior muscle','scalenus_anterior','Anterior scalene'),
 ('Scalenus posterior muscle','scalenus_posterior','Posterior scalene'),
 ('Splenius capitis muscle','splenius_capitis','Splenius capitis'),('Splenius colli muscle','splenius_colli','Splenius cervicis')]),
 'Biceps':('arms',[('Long head of biceps brachii','biceps_brachii_long','Biceps · long head'),
 ('Short head of biceps brachii','biceps_brachii_short','Biceps · short head')]),
 'Upper arms':('arms',[('Brachialis muscle','brachialis','Brachialis'),('Coracobrachialis muscle','coracobrachialis','Coracobrachialis')]),
 'Triceps':('arms',[('Long head of triceps brachii','triceps_long','Triceps · long head'),
 ('Lateral head of triceps brachii','triceps_lateral','Triceps · lateral head'),
 ('Medial head of triceps brachii','triceps_medial','Triceps · medial head')]),
 'Forearms':('forearms',[(n,re.sub('[^a-z0-9]+','_',n.lower()).strip('_'),n.replace(' muscle','')) for n in [
 'Brachioradialis muscle','Flexor carpi radialis','Palmaris longus muscle',
 'Humeral head of flexor carpi ulnaris','Ulnar head of flexor carpi ulnaris',
 'Humero-ulnar head of flexor digitorum superficialis','Radial head of flexor digitorum superficialis',
 'Flexor digitorum profundus','Flexor pollicis longus','Pronator quadratus',
 'Superficial head of pronator teres','Deep head of pronator teres','Supinator',
 'Extensor digitorum','Ulnar head of extensor carpi ulnaris','Humeral head of extensor carpi ulnaris',
 'Extensor carpi radialis longus','Extensor carpi radialis brevis','Anconeus muscle',
 'Extensor digiti minimi','Abductor pollicis longus','Extensor indicis','Extensor pollicis brevis','Extensor pollicis longus']]),
 'Glutes':('hips',[('Gluteus maximus muscle','gluteus_maximus','Gluteus maximus'),
 ('Gluteus medius muscle','gluteus_medius','Gluteus medius'),('Gluteus minimus muscle','gluteus_minimus','Gluteus minimus')]),
 'Hip flexors':('hips',[('Iliacus muscle','iliacus','Iliacus'),('Psoas major','psoas_major','Psoas major'),
 ('Tensor fasciae latae','tensor_fasciae_latae','Tensor fasciae latae')]),
 'Hip rotators':('hips',[('Piriformis muscle','piriformis','Piriformis'),('Quadratus femoris muscle','quadratus_femoris','Quadratus femoris'),
 ('Obturator internus','obturator_internus','Obturator internus'),('Obturator externus','obturator_externus','Obturator externus'),
 ('Inferior gemellus muscle','gemellus_inferior','Inferior gemellus'),('Superior gemellus muscle','gemellus_superior','Superior gemellus')]),
 'Calves':('calves',[('Lateral head of gastrocnemius','gastrocnemius_lateral','Gastrocnemius · lateral head'),
 ('Medial head of gastrocnemius','gastrocnemius_medial','Gastrocnemius · medial head'),('Soleus muscle','soleus','Soleus'),
 ('Plantaris muscle','plantaris','Plantaris')]),
 'Lower legs':('calves',[('Tibialis anterior muscle','tibialis_anterior','Tibialis anterior'),
 ('Tibialis posterior muscle','tibialis_posterior','Tibialis posterior'),('Fibularis longus muscle','fibularis_longus','Fibularis longus'),
 ('Fibularis brevis muscle','fibularis_brevis','Fibularis brevis'),('Fibularis tertius muscle','fibularis_tertius','Fibularis tertius'),
 ('Extensor digitorum longus','extensor_digitorum_longus','Extensor digitorum longus'),
 ('Extensor hallucis longus','extensor_hallucis_longus','Extensor hallucis longus'),
 ('Flexor digitorum longus','flexor_digitorum_longus','Flexor digitorum longus'),
 ('Flexor hallucis longus','flexor_hallucis_longus','Flexor hallucis longus'),('Popliteus muscle','popliteus','Popliteus')])
}
deep={'pectoralis_minor','rhomboid_major','rhomboid_minor','transversus_abdominis','internal_oblique','quadratus_lumborum',
      'gluteus_minimus','iliacus','psoas_major','triceps_medial','tibialis_posterior','popliteus','multifidus_lumborum'}
for group,(region,items) in extra.items():
    for name,key,label in items: definitions.append((name,key,label,region,group,'deep' if key in deep or group in ['Hip rotators','Spinal extensors'] else 'superficial'))

with bpy.data.libraries.load(str(SOURCE),link=True) as (src,dst):
    dst.collections=['4: Muscular system','1: Skeletal system']
muscle_col,bone_col=dst.collections
# Linked objects have unevaluated identity world matrices until their hierarchy
# participates in a scene dependency graph. Snapshot transforms before exporting.
source_scene=bpy.data.scenes.new('Full body source evaluation')
source_scene.collection.children.link(muscle_col)
source_scene.collection.children.link(bone_col)
bpy.context.window.scene=source_scene
bpy.context.view_layer.update()
world_matrices={o:o.matrix_world.copy() for o in source_scene.objects}
muscle_sources={o.name:o for o in muscle_col.all_objects if o.type=='MESH'}
bone_sources={o.name:o for o in bone_col.all_objects if o.type=='MESH'}
required=[d[0]+'.'+s for d in definitions for s in ['l','r']]
missing=[n for n in required if n not in muscle_sources]
if missing: raise RuntimeError('Missing explicitly required muscles: '+repr(missing))

# Context muscles give the head, hands, feet and neck their anatomical form.
# They are kept separate from selectable training-muscle IDs and merged by surface type for rendering.
accessory_bases=[
 'Frontalis muscle','Occipitalis muscle','Temporoparietalis muscle','Nasalis muscle',
 'Orbital part of orbicularis oculi','Palpebral part of orbicularis oculi','Orbicularis oris muscle',
 'Zygomaticus major muscle','Corrugator supercilii','Depressor anguli oris','Depressor labii inferioris',
 'Levator anguli oris','Procerus muscle','Risorius muscle','Zygomaticus minor muscle','Levator labii superioris',
 'Depressor septi nasi','Mentalis muscle','Levator nasolabialis','Bucinator','Superficial part of masseter',
 'Deep part of masseter','Temporalis muscle','Platysma','Mylohyoid muscle','Sternohyoid muscle',
 'Sternothyroid muscle','Thyrohyoid muscle','Omohyoid muscle','Anterior belly of digastric muscle',
 'Posterior belly of digastric muscle','External intercostal muscles',
 'Superficial head of flexor pollicis brevis','Deep head of flexor pollicis brevis','Oblique head of adductor pollicis',
 'Transverse head of adductor pollicis','Abductor pollicis brevis','Opponens pollicis muscle',
 'Abductor digiti minimi of hand','Flexor digiti minimi of hand','Opponens digiti minimi muscle of hand',
 'Lumbrical muscles of hand','Dorsal interossei muscles of hand','Palmar interossei muscles',
 'Medial head of flexor hallucis brevis','Lateral head of flexor hallucis brevis','Oblique head of adductor hallucis',
 'Transverse head of adductor hallucis','Abductor digiti minimi of foot','Abductor hallucis',
 'Extensor digitorum brevis','Extensor hallucis brevis','Dorsal interossei muscles of foot','Flexor digitorum brevis',
 'Flexor digiti minimi of foot','Lumbrical muscles of foot','Plantar interossei muscles','Quadratus plantae muscle']
support_bases=['Epicranial aponeurosis','Posterior layer of thoracolumbar fascia','Calcaneal tendon','Iliotibial tract',
 'Palmar aponeurosis','Plantar aponeurosis','Lateral patellar retinaculum','Medial patellar retinaculum',
 'Tendon of extensor digitorum longus']
accessory=[muscle_sources[b+'.'+s] for b in accessory_bases for s in ['l','r'] if b+'.'+s in muscle_sources]
supports=[muscle_sources[b+'.'+s] for b in support_bases for s in ['l','r'] if b+'.'+s in muscle_sources]
if 'Linea alba' in muscle_sources:supports.append(muscle_sources['Linea alba'])
bones=[o for name,o in bone_sources.items() if (re.search(r'\.[lr]$',name) or '.' not in name)
       and not any(x in name.lower() for x in ['sinus','cells of ethmoid','malleus','incus','stapes'])]

scene_name='Fitness full body verified'
if bpy.data.scenes.get(scene_name):raise RuntimeError('Full-body scene already exists; use a new build name to preserve earlier work.')
scene=bpy.data.scenes.new(scene_name);scene.unit_settings.system='METRIC';bpy.context.window.scene=scene
materials={}
for key,color in [('muscle',(.36,.42,.35,1)),('bone',(.7,.68,.58,1)),('connective',(.5,.55,.46,1))]:
    m=bpy.data.materials.new('FULL_'+key);m.diffuse_color=color;m.use_nodes=True
    m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=color
    m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.65
    materials[key]=m

catalog={'schemaVersion':2,'sex':'male','scope':'Full body with individually selectable training muscles',
 'source':'Z-Anatomy / BodyParts3D','assetLicense':'CC-BY-SA-4.0','units':'metres',
 'coordinateSystem':'glTF Y up, anterior +Z, anatomical left +X',
 'muscles':[],'bones':[],'support':[],'assets':[],'femaleStatus':'Not included; requires independently sourced anatomy.'}
audit={'method':'Bidirectional sampled nearest-surface distances, at most 1200 vertices per direction per mesh, in mm. Sampled, not exact Hausdorff distance.',
 'limits':{'standard':{'maxMm':3,'rmsMm':0.8},'mobile':{'maxMm':5,'rmsMm':1.4}},
 'anatomyExpertReview':'not performed','meshes':[],'contextSources':{'bones':[o.name for o in bones],
 'accessoryMuscles':[o.name for o in accessory],'connective':[o.name for o in supports]}}
entries=[]
for d in definitions:
    for side,suffix in [('left','l'),('right','r')]:
        name,key,label,region,group,layer=d
        meta={'id':key+'_'+side,'key':key,'label':label,'side':side,'region':region,'group':group,'layer':layer,'sourceName':name+'.'+suffix}
        catalog['muscles'].append(meta);entries.append((muscle_sources[meta['sourceName']],meta))
if len({m['id'] for m in catalog['muscles']})!=len(entries):raise RuntimeError('Duplicate muscle identity')

def triangles(mesh):mesh.calc_loop_triangles();return len(mesh.loop_triangles)
def sample_error(source,mesh):
    def distance(a,b):
        b.calc_loop_triangles()
        tree=BVHTree.FromPolygons([v.co for v in b.vertices],[tuple(t.vertices) for t in b.loop_triangles],all_triangles=True)
        values=[]
        for i in range(0,len(a.vertices),max(1,math.ceil(len(a.vertices)/1200))):
            hit=tree.find_nearest(a.vertices[i].co)
            if hit[0] is not None:values.append(hit[3]*1000)
        return values
    v=distance(source,mesh)+distance(mesh,source)
    return {'maxSampledErrorMm':round(max(v,default=0),4),'rmsSampledErrorMm':round(math.sqrt(sum(x*x for x in v)/max(1,len(v))),4),'samples':len(v)}

def copy_mesh(src,col,quality,kind,ident):
    mesh=src.data.copy();mesh.transform(world_matrices[src])
    if world_matrices[src].determinant()<0:mesh.flip_normals()
    mesh.materials.clear();mesh.materials.append(materials[kind])
    mesh.validate(clean_customdata=True);mesh.update();before=triangles(mesh)
    obj=bpy.data.objects.new(ident+'__'+quality,mesh);col.objects.link(obj)
    if quality=='standard':target=min(before,max(170,min(1500,int(before*.16)))) if kind=='muscle' else min(before,max(80,min(650,int(before*.12))))
    elif quality=='mobile':target=min(before,max(80,min(650,int(before*.065)))) if kind=='muscle' else min(before,max(36,min(260,int(before*.055))))
    else:target=before
    if target<before:
        reference=mesh.copy()
        ratio=target/before
        limits=audit['limits'][quality]
        while True:
            mod=obj.modifiers.new('Preserve anatomy surface','DECIMATE');mod.ratio=ratio;mod.use_collapse_triangulate=True
            bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);obj.select_set(False)
            error=sample_error(reference,obj.data)
            if error['maxSampledErrorMm']<=limits['maxMm'] and error['rmsSampledErrorMm']<=limits['rmsMm']:break
            old=obj.data;obj.data=reference.copy();bpy.data.meshes.remove(old)
            ratio=min(1,ratio*1.65)
            if ratio>=1:break
        bpy.data.meshes.remove(reference)
    obj.data.validate(clean_customdata=True);obj.data.update()
    for face in obj.data.polygons:face.use_smooth=True
    return obj,before

def merge_context(objs,label,kind,quality,col):
    vertices=[];faces=[]
    for obj in objs:
        offset=len(vertices);vertices.extend(tuple(v.co) for v in obj.data.vertices)
        faces.extend(tuple(i+offset for i in p.vertices) for p in obj.data.polygons)
    mesh=bpy.data.meshes.new(label+'_'+quality);mesh.from_pydata(vertices,[],faces);mesh.materials.append(materials[kind]);mesh.update()
    for p in mesh.polygons:p.use_smooth=True
    context=bpy.data.objects.new(label+'__'+quality,mesh);col.objects.link(context)
    context['boneId' if kind=='bone' else 'supportId']=label
    context['label']=label.replace('_',' ').title();context['contextType']=kind;context['assetLicense']='CC-BY-SA-4.0'
    for obj in objs:
        orphan=obj.data;bpy.data.objects.remove(obj,do_unlink=True)
        if orphan.users==0:bpy.data.meshes.remove(orphan)
    return context

for quality in ['standard','mobile','reference']:
    col=bpy.data.collections.new('FULL_VERIFIED_'+quality);scene.collection.children.link(col)
    for source,meta in entries:
        obj,before=copy_mesh(source,col,quality,'muscle',meta['id'])
        for key,value in meta.items():obj['muscleId' if key=='id' else key]=value
        obj['assetLicense']='CC-BY-SA-4.0'
        if quality!='reference':
            ref=source.data.copy();ref.transform(world_matrices[source])
            row={'id':meta['id'],'quality':quality,'sourceTriangles':before,'triangles':triangles(obj.data),**sample_error(ref,obj.data)}
            audit['meshes'].append(row);bpy.data.meshes.remove(ref)
    for sources,label,kind in [(bones,'skeleton','bone'),(accessory,'head_hands_feet','muscle'),(supports,'connective_tissue','connective')]:
        parts=[copy_mesh(o,col,quality,kind,label+'_'+str(i))[0] for i,o in enumerate(sources)]
        merge_context(parts,label,kind,quality,col)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in col.objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=list(col.objects)[0]
    file=OUT/f'full-body-male-{quality}.glb'
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,use_active_scene=True,
      export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_texcoords=False)
    catalog['assets'].append({'region':'body','side':'both','sex':'male','quality':quality,'url':'models/'+file.name,
     'triangles':sum(triangles(o.data) for o in col.objects),'meshCount':len(col.objects),
     'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
    col.hide_viewport=quality!='standard';col.hide_render=quality!='standard'
    print('FULL BODY COMPLETE '+quality,flush=True)

catalog['bones']=[{'id':'skeleton','label':'Supporting skeleton','sourceNames':audit['contextSources']['bones']}]
catalog['support']=[{'id':'head_hands_feet','label':'Head, hand, foot and neck context muscles'}, {'id':'connective_tissue','label':'Tendons, fascia and aponeuroses'}]
(ROOT/'public/full-body-map.json').write_text(json.dumps(catalog,indent=2),encoding='utf8')
(ROOT/'public/full-body-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
bpy.data.libraries.write(str(ROOT/'fitness-full-body-male.blend'),{scene},compress=True)
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':
  area.spaces.active.region_3d.view_distance=3.1;area.spaces.active.region_3d.view_location=Vector((0,0,.9))
  area.spaces.active.shading.type='MATERIAL';area.spaces.active.overlay.show_floor=False
print(json.dumps({'muscles':len(entries),'assets':catalog['assets'],'sourceContextCount':sum(len(x) for x in audit['contextSources'].values())}))
