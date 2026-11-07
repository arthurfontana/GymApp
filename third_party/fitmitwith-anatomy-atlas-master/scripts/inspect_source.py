import bpy, json
from pathlib import Path

ROOT = Path('C:/Users/slfresh/Desktop/codex cli 3d model/fitness-anatomy')
bases = [
    'Clavicular part of deltoid muscle', 'Acromial part of deltoid muscle',
    'Scapular spinal part of deltoid muscle', 'Supraspinatus muscle',
    'Infraspinatus muscle', 'Subscapularis muscle', 'Teres minor muscle', 'Teres major muscle',
    'Rectus femoris muscle', 'Vastus lateralis muscle', 'Vastus medialis muscle',
    'Vastus intermedius muscle', 'Long head of biceps femoris', 'Short head of biceps femoris',
    'Semitendinosus muscle', 'Semimembranosus muscle', 'Sartorius muscle',
    'Adductor magnus', 'Adductor longus', 'Adductor brevis', 'Gracilis muscle', 'Pectineus muscle',
    'Scapula', 'Clavicle', 'Humerus', 'Femur', 'Patella'
]
names = [base+'.'+side for base in bases for side in ['l','r']]
with bpy.data.libraries.load(str(ROOT/'source/anatomy-source.blend'), link=False) as (src,dst):
    missing = sorted(set(names) - set(src.objects))
    if missing: raise RuntimeError('Missing source structures: '+repr(missing))
    dst.objects = names
scene = bpy.data.scenes.new('Fitness anatomy source inspection')
scene.unit_settings.system = 'METRIC'
collection = bpy.data.collections.new('Anatomy source - untouched')
scene.collection.children.link(collection)
for obj in dst.objects:
    collection.objects.link(obj)
if bpy.context.window: bpy.context.window.scene=scene
report=[]
from mathutils import Vector
for obj in dst.objects:
    corners=[obj.matrix_world @ Vector(c) for c in obj.bound_box]
    report.append({'name':obj.name,'type':obj.type,'vertices':len(obj.data.vertices) if obj.type=='MESH' else None,
        'dimensions':list(obj.dimensions),'location':list(obj.location),
        'bounds_min':[min(c[i] for c in corners) for i in range(3)],
        'bounds_max':[max(c[i] for c in corners) for i in range(3)],
        'parent':obj.parent.name if obj.parent else None,
        'modifiers':[{'name':m.name,'type':m.type,'viewport':m.show_viewport} for m in obj.modifiers]})
(ROOT/'source/inspection.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps({'count':len(report),'sample':report[:3]+report[-6:]}))
