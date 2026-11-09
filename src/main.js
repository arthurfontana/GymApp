// Entrada do app. A ordem dos imports é a mesma da antiga concatenação do build.py:
// CSS da casca + jornada, depois window.THREE, depois o 3D (que publica window.__EX_IDS,
// __mini e __enterExercise) e por fim a jornada (que usa essas pontes).
// O carregamento do 3D sob demanda é da S03.
import './styles/app.css';
import './styles/treino.css';
import './three-setup.js';
import './3d/app3d.js';
import './jornada/treino.js';
