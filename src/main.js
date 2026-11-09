// Entrada do app. A jornada carrega primeiro; o 3D (three + app3d + modelo) só por import()
// sob demanda, via src/3d/carregar.js (S03). carregar.js precisa vir antes da jornada: ele
// publica as pontes provisórias window.__mini e window.__enterExercise que a jornada usa.
import './styles/app.css';
import './styles/treino.css';
import './3d/carregar.js';
import './jornada/treino.js';
import './pwa.js';
