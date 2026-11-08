# CLAUDE.md — Meu Treino 3D (treino de academia com boneco 3D)

Idioma do usuário: pt-BR (Arthur). Respostas curtas, sem jargão técnico desnecessário; ele usa o app do Claude no celular.

Página web pessoal com o treino de academia do Arthur: cada exercício tem um boneco 3D que demonstra a execução correta (câmera girável, 9 frames, músculos coloridos por função), mais a jornada de treino (conjuntos, sessão com descanso, resumo) e a pontuação gamificada. Hoje é um **Artifact do claude.ai** (HTML único) e está em evolução para um **app web multiusuário** (Vercel + Supabase, login por convite, ranking). Roadmap e prompts das sessões S01–S18: `docs/wiki/Roadmap-e-Sessoes.md`.

## Documentação em camadas — como usar este repositório

Este `CLAUDE.md` é um **índice enxuto**, carregado inteiro em toda sessão. O detalhe de cada domínio vive em `docs/wiki/` (normativa: o que o sistema é e por quê) e em `docs/claude/` (implementação, sob demanda). **Antes de mexer em um domínio, leia o ponteiro da tabela "Onde vive o quê"** — não "leia o projeto inteiro". Para achar um trecho em arquivo grande: `grep -n "#region:" src/*/*.js` ([mapa](docs/claude/Mapa-de-Regioes.md)). Pesquisa exploratória ampla vale mais num subagent de busca.

**Regra de tamanho:** feature nova documenta na camada certa; aqui entra **no máximo 1 linha** na tabela. Teto de 450 linhas (meta ≤ 200), checado por `npm run check:claude-md` no CI. Estourou? Poda primeiro: mova o que virou "detalhe" para o doc de domínio e deixe o ponteiro. **Nunca apague informação para caber.** Spillover: a tabela vai para `docs/claude/Onde-Vive-O-Que.md` com 1 link aqui.

## Comandos

```bash
npm install && npm run dev         # app em http://localhost:5173 (?test=1 liga os ganchos de teste)
npm run check                      # check:claude-md + vitest + build (dist/)
npm run test:e2e                   # build + Playwright com assert (smoke, exercicios, jornada, calistenia, gamificacao; claro e escuro)
npm run build:artifact             # dist-artifact/index.html + body-model.wasm (publicar no Artifact)
node tests/visual/ex.mjs|mini.mjs|mob.mjs   # prints da skill 3D (com npm run dev ligado; saída em tests/visual/out/)
```

Os e2e falham sozinhos em erro de JS ou largura > **390**. Detalhe dos testes e da publicação: `docs/claude/Build-e-Publicacao.md`.

## Regras invioláveis

1. **Skill de animação 3D, sempre.** Quando o Arthur enviar o descritivo/briefing de uma animação (ou pedir exercício novo ou ajuste na execução 3D), use a skill `animacao-3d-exercicio` (`.claude/skills/animacao-3d-exercicio/SKILL.md`): padrão do boneco, 9 frames, vistas, erros comuns, os 4 pontos de integração (`src/3d/app3d.js`, menu do `index.html`, `LIB` em `src/jornada/treino.js`, `PX` em `src/jornada/pontos.js`), régua de pontuação (`r`/`s`, `ref`, `met`), verificação com prints e publicação no mesmo Artifact. Não improvise outro caminho. Se o ambiente não carregar skills do projeto, leia o arquivo e siga-o passo a passo.
2. **Build com Vite** (S02): edite `src/` e a casca `index.html`; `dist/` e `dist-artifact/` são saída de build (não commitadas, nunca editar). O Artifact recebe `dist-artifact/` (`npm run build:artifact`).
3. **Os dados do Arthur ficam no db do Artifact, não no git** (coleções `treinos`, `conjuntos`, `sessoes`, `config`; `ArtifactData` com a URL do artifact). `data/` é uma **cópia** (snapshot manual; ver `data/README.md`): ao fim de uma sessão em que ele treinou, atualizar e commitar. `seed/` só reconstrói o ponto de partida.
4. **Textos do app em pt-BR, curtos, sem jargão** (títulos curtos em maiúsculas; o Arthur lê no celular). Toda tela é testada em 390×844, tema claro e escuro, sem rolagem horizontal.
5. **Publicar no mesmo Artifact** (mesma URL, mesmo `file_path`), nunca criar outro: passos em `docs/claude/Build-e-Publicacao.md`.
6. Restrições dos briefings (sem hiperextensão, sem travar articulações, sem objetos flutuando) e o crédito do modelo 3D no rodapé (CC BY 4.0): `docs/claude/Exercicios-3D.md` ("Padrões de conteúdo"). O repositório é público (o Arthur sabe: `seed/`, `data/` e o peso dele ficam visíveis).

## Estrutura (resumida)

```
CLAUDE.md             este índice
index.html            casca HTML (menu da biblioteca, palco 3D, telas); vite.config.js (plugin de pontos)
src/main.js           entrada: CSS, three-setup, 3d/app3d.js (biblioteca 3D), jornada/treino.js (+ pontos.js)
src/styles/           app.css (casca) e treino.css (jornada)
public/modelos/       body-model-v1.glb (no Artifact vira body-model.wasm)
tests/                e2e/ (Playwright com assert), unit/ (vitest), visual/ (prints da skill 3D)
docs/wiki/            documentação normativa (sincroniza com a Wiki)
docs/claude/          detalhe de implementação para a IA
scripts/              check-claude-md.mjs, build-artifact.mjs
seed/  data/          dados dos PDFs; cópia do histórico do Arthur
tools/  third_party/  geração do modelo; atlas (CC BY-SA 4.0: manter ATTRIBUTION e LICENSE)
.claude/skills/       animacao-3d-exercicio
```

**Exclusões de varredura:** `dist/`, `dist-artifact/` (build), `tests/visual/out/`, `test-results/`, `playwright-report/` (prints e relatórios), `node_modules/` e `third_party/**/models` (binários/modelos): nunca ler, varrer nem editar. Para código, leia `src/3d/app3d.js`, `src/jornada/treino.js`, `src/jornada/pontos.js` (por região).

## Onde vive o quê (leia antes de mexer no domínio)

| Domínio | Doc | Código |
|---|---|---|
| Exercícios 3D (22: ids, consts, parâmetros, vistas, cores, tempo, erros; padrões de conteúdo) | `docs/claude/Exercicios-3D.md` + skill `animacao-3d-exercicio` | `src/3d/app3d.js` (`ex-*`), menu em `index.html` |
| Motor 3D (stack, modelo, rig, coordenadas, músculos, estrutura de um exercício, hooks de teste) | `docs/claude/Motor-3D.md` | `src/3d/app3d.js` (regiões do motor), `src/three-setup.js` |
| Jornada: conjuntos, treinos, sessão, resumo, circuito, aquecimento, ficha da semana, prévia 3D | `docs/wiki/Funcionalidade-Treinos-e-Sessao.md` §8 | `src/jornada/treino.js`, `src/styles/treino.css` |
| Pontuação: pontos, nível, liga, sequência, desafios, conquistas, calorias | `docs/wiki/Funcionalidade-Pontuacao.md` §8 | `src/jornada/pontos.js` (`PX`) |
| Dados: formato dos documentos, regras de acesso, migração | `docs/wiki/Modelo-de-Dados.md` | `src/jornada/treino.js` (`armazenamento`, `migracao`), `seed/`, `data/` |
| Build, testes e publicação no Artifact | `docs/claude/Build-e-Publicacao.md` | `vite.config.js`, `scripts/build-artifact.mjs`, `playwright.config.js`, `tests/`, `.github/workflows/ci.yml` |
| Navegação por regiões dos arquivos grandes | `docs/claude/Mapa-de-Regioes.md` | `grep -n "#region:" src/*/*.js` |
| Plano de evolução, sessões S01–S18, regras transversais, perguntas em aberto | `docs/wiki/Roadmap-e-Sessoes.md`, `docs/wiki/Sessoes/` | — |
| Visão, arquitetura e demais funcionalidades (ranking, contas, biblioteca, admin) | `docs/wiki/Home.md` (e `Visao-e-Escopo`, `Arquitetura`, `Funcionalidade-*`) | — |
| Decisões (ADRs e decisões do protótipo) | `docs/wiki/Decisoes.md` | — |

## Decisões arquiteturais (resumo — catálogo em `docs/wiki/Decisoes.md`)

| ADR | Decisão |
|---|---|
| 000a–g | Protótipo: visual de estátua anatômica, modelo CharacterZone (CC BY 4.0), um boneco para todos, Artifact único com GLB como `.wasm`, tema claro por padrão |
| 001 | Supabase (Auth + Postgres com RLS) como backend, front na Vercel |
| 002 | Front continua em JavaScript puro; só o build migra para Vite; 3D intocado |
| 003 | Catálogo de exercícios no código; treinos e programas da biblioteca no banco |
| 004 | Pontos oficiais calculados no servidor com o mesmo módulo puro do aparelho |
| 005 | Acesso por convite (link de uso único) + e-mail e senha, sem SMTP na v1 |
| 006 | Documentos do app em `jsonb`, com colunas extraídas só para posse e consulta |
| 007 | Usar algo da biblioteca = copiar (com origem e versão) |
| 008 | Sessão offline-first com fila persistente no aparelho |
| 009 | Fuso único do app: America/Sao_Paulo |
| 010 | Privacidade: histórico, peso e medidas privados; ranking expõe só agregados |
| 011 | Artifact congelado após a virada; um único app em produção |
| 012 | Guardrails de contexto: este índice, `docs/claude/`, guard no CI e âncoras de região |
| 013 | Dois projetos Supabase (dev e prod) e preview por PR |
| 014 | Login obrigatório para tudo, incluindo a biblioteca 3D |
| 015 | Build do Artifact pelo Vite (modo `artifact`, arquivo único, `dist-artifact/` fora do git); e2e com assert contra o build |
