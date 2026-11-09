// Primeiro teste unitário (S02): o plugin do Vite cola pontos.js dentro do treino.js como o
// antigo build.py. Os testes de verdade do núcleo vêm na S06/S10.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pontosPlugin } from '../../vite.config.js';

const ler = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

describe('plugin gymapp-pontos', () => {
  const plugin = pontosPlugin();
  const ctx = { addWatchFile() {}, error(m) { throw new Error(m); } };

  it('substitui o marcador pelo conteúdo de pontos.js, como o build.py', () => {
    const treino = ler('src/jornada/treino.js');
    const pontos = ler('src/jornada/pontos.js');
    const out = plugin.transform.call(ctx, treino, '/x/src/jornada/treino.js').code;
    expect(out).toBe(treino.split('/*@@PONTOS@@*/').join(pontos));
    expect(out).not.toContain('/*@@PONTOS@@*/');
    expect(out).toContain('const PX=');
  });

  it('não mexe em outros arquivos', () => {
    expect(plugin.transform.call(ctx, '/*@@PONTOS@@*/', '/x/src/3d/app3d.js')).toBeNull();
  });
});
