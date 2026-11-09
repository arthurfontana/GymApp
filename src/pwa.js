// PWA (S03): registra o service worker e avisa quando há versão nova.
// O aviso usa o visual do toast do app, com o botão "Atualizar".
import { registerSW } from 'virtual:pwa-register';

function avisoNovaVersao(atualizar) {
  if (document.getElementById('updToast')) return;
  const el = document.createElement('div');
  el.className = 'toast on upd';
  el.id = 'updToast';
  el.setAttribute('role', 'status');
  el.innerHTML = '<span>Nova versão disponível</span><button type="button" class="link">Atualizar</button>';
  el.querySelector('button').addEventListener('click', () => { atualizar(true); });
  document.body.appendChild(el);
}

const atualizar = registerSW({
  onNeedRefresh() { avisoNovaVersao(atualizar); },
  onRegisterError(e) { console.warn('service worker', e); },
});
