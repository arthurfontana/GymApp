"""Run inside Blender after inspect_source.py. Retains the source scene and writes new assets."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path('C:/Users/slfresh/Desktop/codex cli 3d model/fitness-anatomy')
OUT = ROOT/'public/models'
SOURCE_SCENE = bpy.data.scenes['Fitness anatomy source inspection']
definitions = [
    ('Clavicular part of deltoid muscle','deltoid_anterior','Anterior deltoid','shoulder','Deltoids','superficial'),
    ('Acromial part of deltoid muscle','deltoid_lateral','Lateral deltoid','shoulder','Deltoids','superficial'),
    ('Scapular spinal part of deltoid muscle','deltoid_posterior','Posterior deltoid','shoulder','Deltoids','superficial'),
    ('Supraspinatus muscle','supraspinatus','Supraspinatus','shoulder','Rotator cuff','deep'),
    ('Infraspinatus muscle','infraspinatus','Infraspinatus','shoulder','Rotator cuff','deep'),
    ('Subscapularis muscle','subscapularis','Subscapularis','shoulder','Rotator cuff','deep'),
    ('Teres minor muscle','teres_minor','Teres minor','shoulder','Rotator cuff','deep'),
    ('Teres major muscle','teres_major','Teres major','shoulder','Teres major','superficial'),
    ('Rectus femoris muscle','rectus_femoris','Rectus femoris','thigh','Quadriceps','superficial'),
    ('Vastus lateralis muscle','vastus_lateralis','Vastus lateralis','thigh','Quadriceps','superficial'),
    ('Vastus medialis muscle','vastus_medialis','Vastus medialis','thigh','Quadriceps','superficial'),
    ('Vastus intermedius muscle','vastus_intermedius','Vastus intermedius','thigh','Quadriceps','deep'),
    ('Long head of biceps femoris','biceps_femoris_long','Biceps femoris · long head','thigh','Hamstrings','superficial'),
    ('Short head of biceps femoris','biceps_femoris_short','Biceps femoris · short head','thigh','Hamstrings','deep'),
    ('Semitendinosus muscle','semitendinosus','Semitendinosus','thigh','Hamstrings','superficial'),
    ('Semimembranosus muscle','semimembranosus','Semimembranosus','thigh','Hamstrings','deep'),
    ('Sartorius muscle','sartorius','Sartorius','thigh','Sartorius','superficial'),
    ('Adductor magnus','adductor_magnus','Adductor magnus','thigh','Adductors','deep'),
    ('Adductor longus','adductor_longus','Adductor longus','thigh','Adductors','superficial'),
    ('Adductor brevis','adductor_brevis','Adductor brevis','thigh','Adductors','deep'),
    ('Gracilis muscle','gracilis','Gracilis','thigh','Adductors','superficial'),
    ('Pectineus muscle','pectineus','Pectineus','thigh','Adductors','deep'),
    ('Scapula','scapula','Scapula','shoulder','Bone','bone'),
    ('Clavicle','clavicle','Clavicle','shoulder','Bone','bone'),
    ('Humerus','humerus','Humerus','shoulder','Bone','bone'),
    ('Femur','femur','Femur','thigh','Bone','bone'),
    ('Patella','patella','Patella','thigh','Bone','bone'),
]

if bpy.data.scenes.get('Fitness anatomy optimized'):
    raise RuntimeError('Output scene already exists. Use a fresh build session to avoid duplicate assets.')
scene = bpy.data.scenes.new('Fitness anatomy optimized')
scene.unit_settings.system='METRIC'
bpy.context.window.scene=scene
base_mat=bpy.data.materials.new('FIT_muscle_neutral')
base_mat.diffuse_color=(.39,.43,.45,1)
base_mat.use_nodes=True
bsdf=base_mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value=(.39,.43,.45,1)
bsdf.inputs['Roughness'].default_value=.55
bone_mat=bpy.data.materials.new('FIT_bone_ivory')
bone_mat.diffuse_color=(.75,.72,.65,1)
bone_mat.use_nodes=True
bone_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.75,.72,.65,1)
bone_mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.7

catalog={'schemaVersion':1,'sex':'male','scope':'Shoulder and thigh proof of concept',
    'source':'Z-Anatomy / BodyParts3D','assetLicense':'CC-BY-SA-4.0',
    'coordinateSystem':'glTF: right-handed, Y up, anterior +Z; anatomical left +X',
    'units':'metres','muscles':[],'bones':[],'assets':[]}
audit={'sourceZipSha256':'E029688545627BD0214B269E1063143ABB580AAD72B2C2445D6D8A9A0D9DA736',
    'anatomyExpertReview':'not performed','femaleAsset':'not supplied by this dataset',
    'distanceMethod':'Bidirectional nearest-surface distances from up to 1200 evenly indexed vertices per mesh; sampled, not an exact Hausdorff distance.',
    'meshes':[]}
standard_objects=[]

def mesh_bvh(mesh):
    mesh.calc_loop_triangles()
    return BVHTree.FromPolygons([v.co for v in mesh.vertices],[tuple(t.vertices) for t in mesh.loop_triangles],all_triangles=True)

def distances(a,b):
    tree=mesh_bvh(b)
    step=max(1,math.ceil(len(a.vertices)/1200))
    values=[]
    for v in list(a.vertices)[::step]:
        hit=tree.find_nearest(v.co)
        if hit[0] is not None: values.append(hit[3]*1000)
    return values

for region in ['shoulder','thigh']:
    for side,suffix in [('left','l'),('right','r')]:
        selected_defs=[d for d in definitions if d[3]==region]
        for quality,ratio in [('reference',1.0),('standard',.6),('mobile',.3)]:
            col=bpy.data.collections.new(f'FIT_{region}_{side}_{quality}')
            scene.collection.children.link(col)
            objs=[]
            for source_base,key,label,_,group,layer in selected_defs:
                source_name=source_base+'.'+suffix
                source=SOURCE_SCENE.objects[source_name]
                source.data.calc_loop_triangles()
                source_tris=len(source.data.loop_triangles)
                mesh=source.data.copy()
                mesh.transform(source.matrix_world)
                # Strip unrelated source app properties/material dependencies from the export.
                mesh.materials.clear()
                obj=bpy.data.objects.new(f'{key}_{side}__{quality}',mesh)
                col.objects.link(obj)
                mat=bone_mat if layer=='bone' else base_mat
                mesh.materials.append(mat)
                ident=f'{key}_{side}'
                obj['muscleId' if layer!='bone' else 'boneId']=ident
                obj['label']=label
                obj['side']=side
                obj['region']=region
                obj['group']=group
                obj['layer']=layer
                obj['sourceName']=source_name
                obj['assetLicense']='CC-BY-SA-4.0'
                if ratio<1 and source_tris>450:
                    modifier=obj.modifiers.new('Preserve form - polygon reduction','DECIMATE')
                    modifier.ratio=max(ratio,450/source_tris)
                    modifier.use_collapse_triangulate=True
                    bpy.context.view_layer.objects.active=obj
                    obj.select_set(True)
                    bpy.ops.object.modifier_apply(modifier=modifier.name)
                    obj.select_set(False)
                obj.data.validate(clean_customdata=True)
                obj.data.update()
                obj.data.calc_loop_triangles()
                for p in obj.data.polygons: p.use_smooth=True
                if quality=='standard':
                    standard_objects.append(obj)
                    entry={'id':ident,'key':key,'label':label,'side':side,'region':region,'group':group,'layer':layer,'sourceName':source_name}
                    catalog['bones' if layer=='bone' else 'muscles'].append(entry)
                if quality!='reference':
                    reference=source.data.copy()
                    reference.transform(source.matrix_world)
                    delta=distances(reference,obj.data)+distances(obj.data,reference)
                    audit['meshes'].append({'id':ident,'quality':quality,'sourceTriangles':source_tris,
                        'triangles':len(obj.data.loop_triangles),'sampleCount':len(delta),
                        'maxSampledErrorMm':round(max(delta,default=0),4),
                        'rmsSampledErrorMm':round(math.sqrt(sum(x*x for x in delta)/max(1,len(delta))),4)})
                    bpy.data.meshes.remove(reference)
                objs.append(obj)
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objs: obj.select_set(True)
            bpy.context.view_layer.objects.active=objs[0]
            filename=f'{region}-{side}-{quality}.glb'
            bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,use_active_scene=True,
                export_extras=True,export_animations=False,export_cameras=False,export_lights=False,
                export_yup=True,export_materials='EXPORT',export_texcoords=False,export_normals=True)
            catalog['assets'].append({'region':region,'side':side,'quality':quality,'url':'models/'+filename,
                'triangles':sum(len(o.data.loop_triangles) for o in objs),'meshCount':len(objs),
                'bytes':(OUT/filename).stat().st_size,'sha256':hashlib.sha256((OUT/filename).read_bytes()).hexdigest()})
            if quality!='standard':
                col.hide_viewport=True
                col.hide_render=True
            print(f'Exported {filename}',flush=True)

bpy.ops.object.select_all(action='DESELECT')
for o in standard_objects: o.select_set(True)
bpy.context.view_layer.objects.active=standard_objects[0]
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=2.0
        area.spaces.active.region_3d.view_location=Vector((0,0,.95))
        area.spaces.active.clip_end=100
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.overlay.show_floor=False
        area.spaces.active.overlay.show_axis_x=False
        area.spaces.active.overlay.show_axis_y=False

(ROOT/'public/muscle-map.json').write_text(json.dumps(catalog,indent=2),encoding='utf8')
(ROOT/'public/geometry-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
bpy.data.libraries.write(str(ROOT/'fitness-anatomy-master.blend'),{scene,SOURCE_SCENE},compress=True)
print(json.dumps({'assets':len(catalog['assets']),'muscles':len(catalog['muscles']),
    'bones':len(catalog['bones']),'maxStandardErrorMm':max(x['maxSampledErrorMm'] for x in audit['meshes'] if x['quality']=='standard')}))
