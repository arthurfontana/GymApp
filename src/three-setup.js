// Expõe o three r128 (npm, versão fixa) como o global que src/3d/app3d.js espera:
// THREE, THREE.OrbitControls e THREE.GLTFLoader, como faziam os scripts do CDN.
// O namespace de um módulo é congelado, por isso a cópia com Object.assign.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

window.THREE = Object.assign({}, THREE, { OrbitControls, GLTFLoader });
