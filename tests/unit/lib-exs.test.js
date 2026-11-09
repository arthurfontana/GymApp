// S03: __EX_IDS passou a ser derivado de LIB (jornada), antes de o 3D carregar.
// Este teste garante que o catálogo da jornada (LIB) e o registro do 3D (EXS) têm os mesmos ids,
// e que o menu da biblioteca (index.html) lista exatamente esses exercícios.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ler = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

function chavesLIB() {
  const src = ler('src/jornada/treino.js');
  const bloco = src.slice(src.indexOf('const LIB={'), src.indexOf('const GRUPOS='));
  return [...bloco.matchAll(/^\s*'([a-z0-9-]+)':\{/gm)].map((m) => m[1]);
}
function chavesEXS() {
  const src = ler('src/3d/app3d.js');
  const linha = src.split('\n').find((l) => l.startsWith('const EXS={'));
  return [...linha.matchAll(/'([a-z0-9-]+)':[A-Z0-9]+/g)].map((m) => m[1]);
}

describe('catálogo de exercícios', () => {
  it('LIB (jornada) == EXS (3D)', () => {
    const lib = chavesLIB().sort(), exs = chavesEXS().sort();
    expect(lib.length).toBeGreaterThan(20);
    expect(lib).toEqual(exs);
  });
  it('o menu da biblioteca (index.html) lista os mesmos ids', () => {
    const menu = [...ler('index.html').matchAll(/<a class="ex" href="#([a-z0-9-]+)"/g)].map((m) => m[1]).sort();
    expect(menu).toEqual(chavesLIB().sort());
  });
});
