import json,struct,numpy as np
def load(p='fitmitwith-anatomy-atlas-master/models/full-body-male-mobile.glb'):
    b=open(p,'rb').read()
    L=struct.unpack('<I',b[12:16])[0]
    j=json.loads(b[20:20+L])
    off=20+L; L2=struct.unpack('<I',b[off:off+4])[0]; bin_=b[off+8:off+8+L2]
    def acc(i):
        a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]
        n={'SCALAR':1,'VEC3':3,'VEC2':2,'VEC4':4}[a['type']]
        dt={5126:np.float32,5125:np.uint32,5123:np.uint16}[a['componentType']]
        o=bv.get('byteOffset',0)+a.get('byteOffset',0)
        return np.frombuffer(bin_,dtype=dt,count=a['count']*n,offset=o).reshape(-1,n) if n>1 else np.frombuffer(bin_,dtype=dt,count=a['count'],offset=o)
    out=[]
    for n in j['nodes']:
        pr=j['meshes'][n['mesh']]['primitives'][0]
        out.append(dict(name=n['name'],ex=n.get('extras',{}),P=acc(pr['attributes']['POSITION']),I=acc(pr['indices'])))
    return j,out
