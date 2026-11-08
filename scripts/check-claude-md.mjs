#!/usr/bin/env node
// Guard mecânico do teto do CLAUDE.md (guardrail G3 — skill guardrails-de-contexto).
// O CLAUDE.md é carregado inteiro em TODA sessão de IA: este script falha o CI se ele
// voltar a crescer sem controle.
//
// Instalação no projeto:
//   1. Copie para scripts/check-claude-md.mjs na raiz do repositório.
//      (ESM sempre, independente do "type" do package.json. Em projeto sem Node,
//       chame direto no CI: `node scripts/check-claude-md.mjs`.)
//   2. package.json → "scripts": { "check:claude-md": "node scripts/check-claude-md.mjs" }
//   3. Plugue num step do workflow de CI existente, logo após instalar dependências.
//   4. Teste nos dois sentidos antes de commitar: verde no tamanho atual, e vermelho
//      de verdade com um teto artificialmente baixo
//      (`CLAUDE_MD_MAX_LINES=10 node scripts/check-claude-md.mjs`).
//
// Estourou o teto? NUNCA apague para caber: pode uma seção que virou "detalhe" para a
// doc de domínio (docs/claude/ ou a doc normativa) e deixe só o ponteiro de 1 linha.
//
// Uso: node scripts/check-claude-md.mjs [caminho] [maxLinhas]
//   caminho    default: CLAUDE.md (relativo ao diretório de execução)
//   maxLinhas  default: env CLAUDE_MD_MAX_LINES ou 450

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const filePath = path.resolve(process.argv[2] || 'CLAUDE.md');
const MAX_LINES = Number.parseInt(
  process.argv[3] || process.env.CLAUDE_MD_MAX_LINES || '450',
  10
);

if (!existsSync(filePath)) {
  console.error(`[check-claude-md] Arquivo não encontrado: ${filePath}`);
  process.exit(1);
}

const lineCount = readFileSync(filePath, 'utf8').split('\n').length;
const name = path.basename(filePath);

if (lineCount > MAX_LINES) {
  console.error(
    `[check-claude-md] ${name} tem ${lineCount} linhas (limite: ${MAX_LINES}).\n` +
      'Antes de adicionar mais conteúdo: pode uma seção que virou "detalhe" para a doc ' +
      'de domínio (docs/claude/ ou a doc normativa) e deixe só o ponteiro de 1 linha na ' +
      'tabela "Onde vive o quê". Nunca apague informação para caber — conteúdo é movido.'
  );
  process.exit(1);
}

console.log(`[check-claude-md] ${name}: ${lineCount}/${MAX_LINES} linhas.`);
