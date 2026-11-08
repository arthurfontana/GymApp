import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    plugins: [pontosPlugin()],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
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
          rollupOptions: { output: { format: 'iife' } },
        }
      // three + 3D ≈ 1 MB num chunk só até a S03 (3D sob demanda)
      : { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
    test: { include: ['tests/unit/**/*.test.js'], environment: 'node' },
  };
});
