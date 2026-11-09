// Pacote do 3D (three + OrbitControls + GLTFLoader + app3d). Só entra no app por import()
// em src/3d/carregar.js: a jornada abre primeiro e este arquivo é baixado sob demanda (S03).
// A ordem importa: window.THREE precisa existir antes de o app3d rodar.
import '../three-setup.js';
import './app3d.js';
