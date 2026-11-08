# CLAUDE.md — Meu Treino 3D (treino de academia com boneco 3D)

Idioma do usuário: pt-BR (Arthur). Respostas curtas, sem jargão técnico desnecessário; ele usa o app do Claude no celular.

Página web pessoal com o treino de academia do Arthur: cada exercício tem um boneco 3D que demonstra a execução correta (câmera girável, 9 frames, músculos coloridos por função), mais a jornada de treino (conjuntos, sessão com descanso, resumo) e a pontuação gamificada. Hoje é um **Artifact do claude.ai** (HTML único) e está em evolução para um **app web multiusuário** (Vercel + Supabase, login por convite, ranking). Roadmap e prompts das sessões S01–S18: `docs/wiki/Roadmap-e-Sessoes.md`.

## Documentação em camadas — como usar este repositório

Este `CLAUDE.md` é um **índice enxuto**, carregado inteiro em toda sessão. O detalhe de cada domínio vive em `docs/wiki/` (normativa: o que o sistema é e por quê) e em `docs/claude/` (implementação, sob demanda). **Antes de mexer em um domínio, leia o ponteiro da tabela "Onde vive o quê"** — não "leia o projeto inteiro". Para achar um trecho em arquivo grande: `grep -n "#region:" web/*.js` ([mapa](docs/claude/Mapa-de-Regioes.md)). Pesquisa exploratória ampla vale mais num subagent de busca.

**Regra de tamanho:** feature nova documenta na camada certa; aqui entra **no máximo 1 linha** na tabela. Teto de 450 linhas (meta ≤ 200), checado por `npm run check:claude-md` no CI. Estourou? Poda primeiro: mova o que virou "detalhe" para o doc de domínio e deixe o ponteiro. **Nunca apague informação para caber.** Spillover: a tabela vai para `docs/claude/Onde-Vive-O-Que.md` com 1 link aqui.

## Comandos

```bash
cd web && python3 build.py          # monta web/index.html e web/test.html (idempotente)
cd web && npm install && npm run serve   # servidor local (porta 8765)
cd web && node tests/<nome>.mjs light|dark   # com o servidor ligado: gam, cal, jor, mob, menu, chk, mini, ex...
cd web && npm run test:gam|test:cal|test:jor # atalhos (prints em web/out/)
cd web && npm run check:claude-md   # guard do teto deste arquivo (CLAUDE_MD_MAX_LINES muda o teto)
```

Todo teste imprime erros de JS e a largura da página (deve ser **390**). Detalhe dos testes e da publicação: `docs/claude/Build-e-Publicacao.md`.

## Regras invioláveis

1. **Skill de animação 3D, sempre.** Quando o Arthur enviar o descritivo/briefing de uma animação (ou pedir exercício novo ou ajuste na execução 3D), use a skill `animacao-3d-exercicio` (`.claude/skills/animacao-3d-exercicio/SKILL.md`): padrão do boneco, 9 frames, vistas, erros comuns, os 4 pontos de integração (`app.js`, menu do `index.html`, `LIB` em `treino.js`, `PX` em `pontos.js`), régua de pontuação (`r`/`s`, `ref`, `met`), verificação com prints e publicação no mesmo Artifact. Não improvise outro caminho. Se o ambiente não carregar skills do projeto, leia o arquivo e siga-o passo a passo.
2. **Nunca editar `web/index.html` na mão**: é saída do build (`python3 build.py`), mas é **commitado** porque é exatamente o que vai para o Artifact. Edite `web/app.js` / `treino.js` / `pontos.js` / `treino.css` e rode o build.
3. **Os dados do Arthur ficam no db do Artifact, não no git** (coleções `treinos`, `conjuntos`, `sessoes`, `config`; `ArtifactData` com a URL do artifact). `data/` é uma **cópia** (snapshot manual; ver `data/README.md`): ao fim de uma sessão em que ele treinou, atualizar e commitar. `seed/` só reconstrói o ponto de partida.
4. **Textos do app em pt-BR, curtos, sem jargão** (títulos curtos em maiúsculas; o Arthur lê no celular). Toda tela é testada em 390×844, tema claro e escuro, sem rolagem horizontal.
5. **Publicar no mesmo Artifact** (mesma URL, mesmo `file_path`), nunca criar outro: passos em `docs/claude/Build-e-Publicacao.md`.
6. Restrições dos briefings (sem hiperextensão, sem travar articulações, sem objetos flutuando) e o crédito do modelo 3D no rodapé (CC BY 4.0): `docs/claude/Exercicios-3D.md` ("Padrões de conteúdo"). O repositório é público (o Arthur sabe: `seed/`, `data/` e o peso dele ficam visíveis).

## Estrutura (resumida)

```
CLAUDE.md             este índice
web/app.js            biblioteca 3D: rig, 22 exercícios, câmera (fonte principal)
web/treino.js         jornada: store, telas, sessão, roteador (IIFE)
web/pontos.js         pontuação; o build cola no lugar de /*@@PONTOS@@*/ em treino.js
web/treino.css        estilos da jornada (entram no <style> do index.html no build)
web/index.html        casca + saída do build (commitado; é o que vai para o Artifact)
web/build.py          monta index.html e test.html
web/body-model.wasm   modelo GLB (o Artifact não serve .glb, por isso .wasm)
web/tests/*.mjs       testes Playwright de ponta a ponta (rodar de dentro de web/)
docs/wiki/            documentação normativa (sincroniza com a Wiki)
docs/claude/          detalhe de implementação para a IA
scripts/              check-claude-md.mjs
seed/  data/          dados dos PDFs; cópia do histórico do Arthur
tools/  third_party/  geração do modelo; atlas (CC BY-SA 4.0: manter ATTRIBUTION e LICENSE)
.claude/skills/       animacao-3d-exercicio
```

**Exclusões de varredura:** `web/out/` (prints de teste), `web/index.html` e `web/test.html` (gerados pelo build), `node_modules/` e `third_party/**/models` (binários/modelos): nunca ler, varrer nem editar. Para código, leia `web/app.js`, `treino.js`, `pontos.js` (por região).

## Onde vive o quê (leia antes de mexer no domínio)

| Domínio | Doc | Código |
|---|---|---|
| Exercícios 3D (22: ids, consts, parâmetros, vistas, cores, tempo, erros; padrões de conteúdo) | `docs/claude/Exercicios-3D.md` + skill `animacao-3d-exercicio` | `web/app.js` (`ex-*`), menu em `web/index.html` |
| Motor 3D (stack, modelo, rig, coordenadas, músculos, estrutura de um exercício, hooks de teste) | `docs/claude/Motor-3D.md` | `web/app.js` (regiões do motor) |
| Jornada: conjuntos, treinos, sessão, resumo, circuito, aquecimento, ficha da semana, prévia 3D | `docs/wiki/Funcionalidade-Treinos-e-Sessao.md` §8 | `web/treino.js`, `web/treino.css` |
| Pontuação: pontos, nível, liga, sequência, desafios, conquistas, calorias | `docs/wiki/Funcionalidade-Pontuacao.md` §8 | `web/pontos.js` (`PX`) |
| Dados: formato dos documentos, regras de acesso, migração | `docs/wiki/Modelo-de-Dados.md` | `web/treino.js` (`armazenamento`, `migracao`), `seed/`, `data/` |
| Build, testes e publicação no Artifact | `docs/claude/Build-e-Publicacao.md` | `web/build.py`, `web/tests/`, `.github/workflows/ci.yml` |
| Navegação por regiões dos arquivos grandes | `docs/claude/Mapa-de-Regioes.md` | `grep -n "#region:" web/*.js` |
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
