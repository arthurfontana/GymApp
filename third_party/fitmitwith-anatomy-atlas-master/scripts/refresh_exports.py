import bpy,json,hashlib
from pathlib import Path
ROOT=Path('C:/Users/slfresh/Desktop/codex cli 3d model/fitness-anatomy')
scene=bpy.data.scenes['Fitness anatomy optimized']
bpy.context.window.scene=scene
catalog=json.loads((ROOT/'public/muscle-map.json').read_text())
repairs=[]
for asset in catalog['assets']:
    col=bpy.data.collections[f"FIT_{asset['region']}_{asset['side']}_{asset['quality']}"]
    col.hide_viewport=False
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in col.objects:
        if obj.data.validate(clean_customdata=True): repairs.append(obj.name)
        obj.data.update()
        obj.data.calc_loop_triangles()
        obj.select_set(True)
    bpy.context.view_layer.objects.active=list(col.objects)[0]
    path=ROOT/'public'/asset['url']
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,use_active_scene=True,
        export_extras=True,export_animations=False,export_cameras=False,export_lights=False,
        export_yup=True,export_materials='EXPORT',export_texcoords=False,export_normals=True)
    asset['triangles']=sum(len(o.data.loop_triangles) for o in col.objects)
    asset['bytes']=path.stat().st_size
    asset['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
    col.hide_viewport=asset['quality']!='standard'
(ROOT/'public/muscle-map.json').write_text(json.dumps(catalog,indent=2),encoding='utf8')
bpy.data.libraries.write(str(ROOT/'fitness-anatomy-master.blend'),{scene,bpy.data.scenes['Fitness anatomy source inspection']},compress=True)
print(json.dumps({'repaired':repairs,'assets':len(catalog['assets'])}))
