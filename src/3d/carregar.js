// Carregamento do 3D sob demanda (S03). A jornada abre sem three e sem o modelo; este módulo
// publica versões PROVISÓRIAS das pontes window.__mini e window.__enterExercise. Quando a jornada
// pede uma prévia (sessão) ou um exercício (#biblioteca, #<exercício>), baixam o pacote 3D
// (tres-d.js) por import() e repassam a chamada. O app3d, ao rodar, troca as pontes pelas reais
// e o contrato continua o de antes, inclusive __mini(null). No Artifact (modo artifact) o import()
// é embutido no bundle: o 3D vem junto.

let promessa = null;
let carregado = false;
let pendMini = null; // último pedido de prévia que ainda espera o 3D
let pendEx = null; // último exercício pedido que ainda espera o 3D

/** baixa o pacote 3D uma vez só; se falhar (sem rede), a próxima chamada tenta de novo */
export function carregar3D() {
  if (!promessa) {
    promessa = import('./tres-d.js').then(
      () => { carregado = true; },
      (e) => { promessa = null; throw e; },
    );
  }
  return promessa;
}

function falha(el) {
  const msg = 'Não foi possível carregar o 3D. Verifique a conexão e tente de novo.';
  const mini = el && el.querySelector && el.querySelector('[data-mini-load]');
  if (mini) { mini.hidden = false; mini.textContent = msg; }
  const ld = document.getElementById('loading');
  if (ld && !el) { ld.hidden = false; ld.textContent = msg; }
}

function mini(el, id) {
  if (carregado) return window.__mini(el, id); // já trocada pela real; só por segurança
  if (!el || !id) { pendMini = null; return; } // nada para desmontar: o 3D nem chegou
  const pedido = (pendMini = { el, id });
  carregar3D().then(
    () => { if (pendMini === pedido && el.isConnected) { pendMini = null; window.__mini(el, id); } },
    () => { if (pendMini === pedido) falha(el); },
  );
}

function entrar(id) {
  if (carregado) return window.__enterExercise(id);
  pendEx = id;
  const ld = document.getElementById('loading');
  if (ld) { ld.hidden = false; ld.textContent = 'Carregando 3D…'; }
  carregar3D().then(
    () => { if (pendEx === id && location.hash.slice(1) === id) { pendEx = null; window.__enterExercise(id); } },
    () => { if (pendEx === id) falha(null); },
  );
}

window.__carregar3D = () => { carregar3D().catch(() => falha(null)); };
window.__mini = mini;
window.__enterExercise = entrar;
