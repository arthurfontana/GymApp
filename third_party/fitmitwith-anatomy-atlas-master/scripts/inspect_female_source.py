"""Inventory an acquired female source in a separate Blender scene.

Run inside the connected Blender instance after placing the licensed download
under source/female. Does not execute embedded source scripts or edit sources.
"""
import bpy
import json
from pathlib import Path

ROOT = Path('C:/Users/slfresh/Desktop/codex cli 3d model/fitness-anatomy')
folder = ROOT / 'source/female'
blend = folder / 'source.blend'
glb = folder / 'source.glb'
if not blend.exists() and not glb.exists():
    raise FileNotFoundError('Acquire the female source first: ' + str(folder))

scene = bpy.data.scenes.new('Female source inspection')
bpy.context.window.scene = scene
if blend.exists():
    with bpy.data.libraries.load(str(blend), link=False) as (source, loaded):
        loaded.objects = source.objects
    for obj in loaded.objects:
        if obj is not None:
            scene.collection.objects.link(obj)
else:
    bpy.ops.import_scene.gltf(filepath=str(glb))
bpy.context.view_layer.update()

records = []
for obj in scene.objects:
    if obj.type != 'MESH':
        continue
    obj.data.calc_loop_triangles()
    coordinates = [obj.matrix_world @ v.co for v in obj.data.vertices]
    records.append({
        'name': obj.name,
        'vertices': len(obj.data.vertices),
        'triangles': len(obj.data.loop_triangles),
        'parent': obj.parent.name if obj.parent else None,
        'properties': {k: str(v) for k, v in obj.items()},
        'bounds': [[min(v[i] for v in coordinates), max(v[i] for v in coordinates)]
                   for i in range(3)] if coordinates else None,
        'mirroredTransform': obj.matrix_world.determinant() < 0,
    })
report = {'source': str(blend if blend.exists() else glb),
          'scene': scene.name, 'meshCount': len(records), 'objects': records}
(folder / 'inventory.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps({'scene': scene.name, 'meshCount': len(records),
                  'inventory': str(folder / 'inventory.json')}))
