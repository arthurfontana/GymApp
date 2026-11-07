"""Create the user-approved illustrative female variant; not a female atlas.

Coherent spatial deformation preserves shared attachment coordinates across
muscles and skeleton. Artistic proportions are explicit and unverified.
Run inside Blender after the male builds, or append their master scenes first.
"""
import bpy, json, hashlib, math, ast
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT=Path('C:/Users/slfresh/Desktop/codex cli 3d model/fitness-anatomy')
OUT=ROOT/'public/models'
full=bpy.data.scenes.get('Fitness full body verified')
regional=bpy.data.scenes.get('Fitness anatomy optimized')
if full is None or regional is None:
    raise RuntimeError('Append the male full-body and regional master scenes before building.')
if bpy.data.scenes.get('Fitness female illustrative'):
    raise RuntimeError('Female scene already exists. Preserve it and choose a new build name.')

levels=np.array([0,.12,.45,.72,.86,1.,1.10,1.22,1.40,1.48,1.80])
widths=np.array([.94,.94,.97,1.08,1.14,1.04,.91,.89,.88,.94,.93])
depths=np.array([.94,.94,.95,1.02,1.08,1.00,.92,.87,.89,.94,.94])
def smooth(a,b,value):
    t=np.clip((value-a)/(b-a),0,1)
    return t*t*(3-2*t)
def profile(z,values):
    i=np.clip(np.searchsorted(levels,z)-1,0,len(levels)-2)
    t=smooth(levels[i],levels[i+1],z)
    return values[i]*(1-t)+values[i+1]*t
def deform(points):
    x,y,z=points.T;ax=np.abs(x)
    arm=smooth(.145,.37,ax)*smooth(.72,.92,z)*(1-smooth(1.40,1.48,z))
    torso=ax*profile(z,widths)
    limb=.138+(ax-.16)*.90
    return np.column_stack([np.sign(x)*(torso*(1-arm)+limb*arm),
        y*(profile(z,depths)*(1-arm)+.90*arm),z*.963])

# Detect foldovers in the deformation itself (sampled, not a topology proof).
grid=np.array([[x,y,z] for x in np.linspace(-.36,.36,19)
              for y in np.linspace(-.16,.16,7) for z in np.linspace(0,1.75,71)])
eps=1e-5
jac=np.stack([(deform(grid+np.eye(3)[i]*eps)-deform(grid-np.eye(3)[i]*eps))/(2*eps) for i in range(3)],axis=2)
min_det=float(np.linalg.det(jac).min())
assert min_det>0, 'Deformation folds over'

scene=bpy.data.scenes.new('Fitness female illustrative')
scene.unit_settings.system='METRIC';bpy.context.window.scene=scene
scene['variantStatus']='Illustrative female proportions, artist-authored, unverified'
scene['sourceSex']='male'
scene['assetLicense']='CC-BY-SA-4.0'
catalog=json.loads((ROOT/'public/full-body-map.json').read_text())
catalog.update({'schemaVersion':3,'sex':'female','scope':'Full-body illustrative female variant',
    'variantStatus':'illustrative-unverified','sourceSex':'male',
    'source':'Artist-authored deformation of Z-Anatomy / BodyParts3D male geometry',
    'anatomyExpertReview':'not performed','assets':[]})
catalog.pop('femaleStatus',None)
catalog['support'] += [{'id':'breast_tissue_'+side,'label':'Illustrative breast tissue · '+side,
    'contextType':'breast_tissue','selectableMuscle':False} for side in ['left','right']]
regional_map=json.loads((ROOT/'public/muscle-map.json').read_text())
catalog['regionalBones']=regional_map['bones']
audit={'variantStatus':'illustrative-unverified','sourceSex':'male','anatomyExpertReview':'not performed',
 'method':'Same continuous deformation applied to every muscle, bone and support vertex at every geometry level. No measured female reference.',
 'parameters':{'heightScale':.963,'heightKnotsMetres':levels.tolist(),'widthMultipliers':widths.tolist(),'depthMultipliers':depths.tolist()},
 'deformationCheck':{'gridPoints':len(grid),'minSampledJacobianDeterminant':min_det},'meshes':[]}

# Reuse the established source-distance sampler for transformed LOD comparisons.
tree=ast.parse((ROOT/'scripts/build_full_body.py').read_text(encoding='utf8'))
functions=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['triangles','sample_error']]
from mathutils.bvhtree import BVHTree
exec(compile(ast.Module(body=functions,type_ignores=[]),'surface-audit','exec'))

def copy_deformed(source,col,quality):
    mesh=source.data.copy()
    mesh.transform(source.matrix_world)
    coords=np.empty(len(mesh.vertices)*3,dtype=np.float64)
    mesh.vertices.foreach_get('co',coords)
    transformed=deform(coords.reshape(-1,3))
    assert np.isfinite(transformed).all()
    mesh.vertices.foreach_set('co',transformed.ravel());mesh.update()
    obj=bpy.data.objects.new(source.name.split('__')[0]+'__female_'+quality,mesh)
    col.objects.link(obj)
    for key,value in source.items():obj[key]=value
    obj['sex']='female';obj['sourceSex']='male';obj['variantStatus']='illustrative-unverified'
    return obj

soft=bpy.data.materials.new('FEMALE_surface_context');soft.use_nodes=True
soft.diffuse_color=(.43,.48,.40,1)
soft.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=soft.diffuse_color
soft.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.65
def breast(side,quality,col):
    segments,rings={'mobile':(24,16),'standard':(32,24),'reference':(48,32)}[quality]
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,calc_uvs=False)
    obj=bpy.context.object
    for owner in list(obj.users_collection):owner.objects.unlink(obj)
    col.objects.link(obj)
    sign=1 if side=='left' else -1
    center=deform(np.array([[sign*.084,-.113,1.270]]))[0]
    for vertex in obj.data.vertices:
        x,y,z=vertex.co
        # Rounded taper toward superior attachment; no muscle IDs on this layer.
        taper=1-.13*max(0,z)
        vertex.co=(center[0]+x*.057*taper,center[1]+y*.046,
                   center[2]+z*.058+.010*y)
    for face in obj.data.polygons:face.use_smooth=True
    obj.data.materials.append(soft);obj.data.update()
    obj.name='breast_tissue_'+side+'__female_'+quality
    obj['supportId']='breast_tissue_'+side;obj['contextType']='breast_tissue'
    obj['label']='Breast tissue · '+side;obj['side']=side;obj['sex']='female'
    obj['variantStatus']='illustrative-unverified';obj['assetLicense']='CC-BY-SA-4.0'
    return obj

def export(col,quality,region='body',side='both'):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in col.objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=list(col.objects)[0]
    name=f'full-body-female-{quality}.glb' if region=='body' else f'{region}-female-{side}-{quality}.glb'
    file=OUT/name
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,use_active_scene=True,
      export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_texcoords=False)
    catalog['assets'].append({'region':region,'side':side,'sex':'female','quality':quality,'url':'models/'+name,
      'triangles':sum(triangles(o.data) for o in col.objects),'meshCount':len(col.objects),
      'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),
      'variantStatus':'illustrative-unverified'})
    col.hide_viewport=True;col.hide_render=True

fullcols={}
for quality in ['reference','standard','mobile']:
    col=bpy.data.collections.new('FEMALE_full_'+quality);scene.collection.children.link(col)
    source_col=next(c for c in full.collection.children if c.name=='FULL_VERIFIED_'+quality)
    for source in source_col.objects:copy_deformed(source,col,quality)
    for side in ['left','right']:breast(side,quality,col)
    fullcols[quality]=col
    if quality!='reference':
        refs={o.get('muscleId'):o for o in fullcols['reference'].objects if o.get('muscleId')}
        for obj in col.objects:
            ident=obj.get('muscleId')
            if ident:audit['meshes'].append({'id':ident,'quality':quality,**sample_error(refs[ident].data,obj.data)})
    export(col,quality)

for asset in regional_map['assets']:
    region,side,quality=[asset[k] for k in ['region','side','quality']]
    source_col=next(c for c in regional.collection.children if c.name==f'FIT_{region}_{side}_{quality}')
    col=bpy.data.collections.new(f'FEMALE_{region}_{side}_{quality}');scene.collection.children.link(col)
    for source in source_col.objects:copy_deformed(source,col,quality)
    export(col,quality,region,side)

fullcols['standard'].hide_viewport=False;fullcols['standard'].hide_render=False
(ROOT/'public/female-muscle-map.json').write_text(json.dumps(catalog,indent=2),encoding='utf8')
(ROOT/'public/female-geometry-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
bpy.data.libraries.write(str(ROOT/'fitness-female-illustrative.blend'),{scene},compress=True)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=3.0
        area.spaces.active.region_3d.view_location=Vector((0,0,.82))
result={'scene':scene.name,'muscleRegions':len(catalog['muscles']),'assets':catalog['assets'],'minimumJacobian':min_det}
