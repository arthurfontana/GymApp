import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

const PONTOS = fileURLToPath(new URL('./src/jornada/pontos.js', import.meta.url));
const MARCADOR = '/*@@PONTOS@@*/';

/**
 * Cola src/jornada/pontos.js no lugar de /*@@PONTOS@@*\/ em src/jornada/treino.js,
 * exatamente como o antigo web/build.py: o código da pontuação continua dentro do
 * IIFE da jornada, com acesso às mesmas variáveis (S, put, esc...). Até a S10.
 */
export function pontosPlugin() {
  return {
    name: 'gymapp-pontos',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0].endsWith('/src/jornada/treino.js')) return null;
      if (!code.includes(MARCADOR)) this.error('treino.js sem o marcador ' + MARCADOR);
      this.addWatchFile(PONTOS);
      return { code: code.split(MARCADOR).join(readFileSync(PONTOS, 'utf8')), map: null };
    },
  };
}

/** Cabeçalhos de segurança do vercel.json (source "/(.*)") para o `vite preview`: o e2e roda sob a mesma CSP da Vercel. */
function cabecalhosDoVercel() {
  const cfg = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
  const geral = cfg.headers.find((h) => h.source === '/(.*)');
  return Object.fromEntries(geral.headers.map((h) => [h.key, h.value]));
}

const pwa = VitePWA({
  registerType: 'prompt', // o usuário decide quando atualizar (toast "Nova versão disponível")
  injectRegister: false, // o registro está em src/pwa.js
  includeAssets: ['icons/icone.svg', 'icons/apple-touch-icon.png'],
  manifest: {
    name: 'Meu Treino 3D',
    short_name: 'Meu Treino',
    description: 'Treino de academia com boneco 3D que mostra a execução correta.',
    lang: 'pt-BR',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    background_color: '#0e1318',
    theme_color: '#edf0f3',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // shell no precache; o pacote 3D (tres-d-*.js) e o modelo entram só quando usados (cache em tempo de execução)
    globPatterns: ['**/*.{html,css,js,svg,png,webmanifest}'],
    globIgnores: ['**/tres-d-*.js', '**/modelos/**'],
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/^\/api\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      { urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
        handler: 'StaleWhileRevalidate', options: { cacheName: 'fontes' } },
      { urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/modelos/'),
        handler: 'CacheFirst', options: { cacheName: 'modelos', expiration: { maxEntries: 4 }, cacheableResponse: { statuses: [200] } } },
      { urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/tres-d-'),
        handler: 'CacheFirst', options: { cacheName: 'tres-d', expiration: { maxEntries: 4 }, cacheableResponse: { statuses: [200] } } },
      // /api/* nunca vai para o cache (NetworkOnly explícito)
      { urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
    ],
  },
});

export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    plugins: artifact ? [pontosPlugin()] : [pontosPlugin(), pwa],
    // o Artifact não tem service worker: o registro vira um stub
    resolve: artifact ? { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa-stub.js', import.meta.url)) } } : {},
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true, headers: cabecalhosDoVercel() },
    // Modo artifact (npm run build:artifact): um único bundle clássico, sem public/
    // (o modelo vira body-model.wasm no scripts/build-artifact.mjs), base relativa.
    publicDir: artifact ? false : 'public',
    base: artifact ? './' : '/',
    build: artifact
      ? {
          outDir: 'dist-artifact/.vite',
          emptyOutDir: true,
          modulePreload: { polyfill: false },
          cssCodeSplit: false,
          assetsInlineLimit: 0,
          chunkSizeWarningLimit: 1200,
          // sem divisão de código: o import() do 3D (src/3d/carregar.js) vira parte do bundle e o 3D vem junto
          rollupOptions: { output: { format: 'iife' } },
        }
      // three + 3D (≈ 1 MB) ficam no chunk tres-d-*.js, baixado só quando o 3D é pedido (S03)
      : { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
    test: { include: ['tests/unit/**/*.test.js'], environment: 'node' },
  };
});
