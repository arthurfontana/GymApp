# Build e publicação

Como o app é montado (Vite, desde a S02), testado e publicado no Artifact (até a S09, ADR-011). A S03 acrescenta Vercel, PWA e CI completo.

## Estrutura do repositório

```
CLAUDE.md             índice enxuto, carregado em toda sessão
index.html            casca HTML completa: doctype, viewport, fontes, script do tema (antes do conteúdo),
                      script do modo de teste (?test=1), menu da biblioteca (#menuView), palco 3D (#exView/#stage),
                      telas da jornada (#appView), folhas, pílula e toast
src/main.js           entrada: importa, nesta ordem, CSS → three-setup → 3d/app3d.js → jornada/treino.js
src/three-setup.js    window.THREE = cópia do three r128 (npm) + OrbitControls + GLTFLoader (examples/jsm)
src/3d/app3d.js       biblioteca 3D: rig, exercícios, câmera (ex-web/app.js; não reescrever)
src/jornada/treino.js jornada: store db/localStorage, telas, sessão, roteador (IIFE)
src/jornada/pontos.js pontuação; o plugin do vite.config.js cola no lugar de /*@@PONTOS@@*/ em treino.js
src/styles/app.css    estilos da casca e da biblioteca 3D (ex-<style> do index.html)
src/styles/treino.css estilos da jornada
public/modelos/body-model-v1.glb   modelo GLB (servido em /modelos/; no Artifact vira body-model.wasm)
vite.config.js        plugin gymapp-pontos, modo artifact, config do vitest
playwright.config.js  e2e: preview na porta 4173, 390×844, projetos claro e escuro
scripts/              check-claude-md.mjs (guard do CLAUDE.md) e build-artifact.mjs (arquivo único)
tests/e2e/            specs com assert: smoke, exercicios, jornada, calistenia, gamificacao (+ fixtures.js)
tests/unit/           vitest (por enquanto só o plugin de pontos; os de verdade vêm na S06/S10)
tests/visual/         prints da skill 3D: ex.mjs, mini.mjs, mob.mjs; artifact.mjs confere dist-artifact/
seed/*.json           dados dos PDFs (academia A/B, calistenia) para semear o db
tools/                load.py e build_cz.js (geração do modelo a partir do atlas)
third_party/          atlas anatômico (CC BY-SA 4.0): manter ATTRIBUTION e LICENSE
data/                 cópia (snapshot manual) dos dados do Arthur; ver data/README.md
docs/wiki/            documentação normativa (sincroniza com a Wiki do GitHub)
docs/claude/          detalhe de implementação para a IA (este diretório)
.github/workflows/    ci.yml (job guardrails) e sync-wiki.yml
.claude/skills/       skill de projeto animacao-3d-exercicio
```

Saídas (fora do git; nunca ler nem editar): `dist/` (build web), `dist-artifact/` (build do Artifact), `test-results/` e `playwright-report/` (e2e), `tests/visual/out/` (prints).

## Fluxo

- **Editar** `src/` (ou o menu em `index.html`) → `npm run dev` (http://localhost:5173, recarrega sozinho; mudança em `pontos.js` recarrega o `treino.js`) → `npm run check` e `npm run test:e2e` → commit → publicar.
- **Comandos** (da raiz): `npm run dev` · `npm run build` (gera `dist/`: `index.html`, `assets/*` com hash, `modelos/body-model-v1.glb`) · `npm run preview` (serve `dist/` na porta 4173) · `npm run check` (`check:claude-md` + `test` (vitest) + `build`) · `npm run test:e2e` (build + Playwright) · `npm run build:artifact`.
- **Mesma semântica da concatenação antiga:** o plugin `gymapp-pontos` (hook `transform`) cola `pontos.js` dentro do IIFE do `treino.js`, como o `build.py` fazia; `app3d.js` e `treino.js` continuam IIFEs que só conversam por `window.__EX_IDS`, `__mini`, `__enterExercise` e os ganchos `window.__*`. Os módulos rodam em modo estrito (conferido: sem globais implícitas nem funções em bloco). O 3D ainda carrega junto com a jornada; sob demanda é a S03.
- **Modo de teste:** `?test=1` na URL define `window.__TEST__` (script inline no `index.html`, antes do módulo). Liga os ganchos (`__READY__`, `__go`, `__S`, `__put`…; ver [Motor-3D](Motor-3D.md)). Sem `?test=1`, nada disso existe.
- **Mudanças no `app3d.js` desde o `web/app.js`:** só a URL do modelo (`import.meta.env.BASE_URL + 'modelos/body-model-v1.glb'`; no modo `artifact`, `'body-model.wasm'`). Nada mais foi preciso para rodar como módulo.

## Publicar no Artifact (até a S09)

1. `npm run build:artifact` → `dist-artifact/index.html` (arquivo único: CSS em `<style>`, JS com three empacotado num `<script>` clássico no fim do `<body>`, sem nenhum script externo; só as fontes do Google ficam por link) e `dist-artifact/body-model.wasm` (cópia do `.glb`). Por baixo: `vite build --mode artifact` (bundle IIFE, base relativa, sem `public/`) + `scripts/build-artifact.mjs` (põe tudo inline e copia o modelo).
2. `node tests/visual/artifact.mjs` → serve `dist-artifact/`, abre no celular (claro e escuro), espera o modelo e **falha** se houver erro de JS ou largura > 390.
3. Ferramenta Artifact: primeiro `action:"read"` na URL `https://claude.ai/artifact/7rca7r3eRxTwX4kiZ4B7zK` (exigido para atualizar um artifact de outra conversa); depois publicar com `url` = essa URL, `file_path=dist-artifact/index.html` e `files={"body-model.wasm":"dist-artifact/body-model.wasm"}`. A capability `db` (`{rules:[{path:"",read:"admin",write:"owner"}]}`) é mantida se `capabilities` for omitido.
4. `dist-artifact/` não vai para o git (ADR-015): o que foi publicado é sempre reconstruível a partir do commit.

## Onde ficam os dados

- **Dados do Arthur ficam no db do Artifact, não no git** (coleções `treinos`, `conjuntos`, `sessoes`, `config`). Leia/escreva com `ArtifactData` passando a URL do artifact. `seed/` só reconstrói o ponto de partida. Há uma **cópia dos dados em `data/`** (snapshot manual; ver `data/README.md`): ao fim de uma sessão em que ele treinou, atualizar e commitar.
- **Repositório público:** o Arthur sabe e aceitou que `seed/`, `data/` e o peso dele ficam visíveis.
- Semeado a partir de `seed/seed.json` (e `seed/calistenia.json`) via ArtifactData; detalhes dos treinos semeados em [Treinos e Sessão §8](../wiki/Funcionalidade-Treinos-e-Sessao.md).

## Testes

- **Guard do CLAUDE.md:** `npm run check:claude-md` (teto de 450 linhas, ou `CLAUDE_MD_MAX_LINES`); roda no CI (`ci.yml`, job `guardrails`).
- **Unitários (`npm run test`, vitest):** `tests/unit/*.test.js`. Hoje só o plugin de pontos; os de verdade vêm na S06/S10.
- **E2E com assert (`npm run test:e2e`):** `@playwright/test` (versão fixa igual à do Chromium do ambiente) contra `npm run preview` (porta 4173), Chromium com WebGL por software, viewport 390×844, projetos `claro` e `escuro`, `--trace off`. A base `tests/e2e/fixtures.js` responde vazio às fontes do Google, aplica o tema do projeto, coleta `pageerror` e `console.error` e **reprova o teste se houver qualquer erro**; helpers `semear` (localStorage), `abrir` (`?test=1` + `__READY__`), `semRolagemLateral` (scrollWidth ≤ 390), `anexarPrint` (prints viram anexos do relatório; sem comparação de pixel), `canvasTemImagem`.
  - `smoke`: Início abre, `__READY__`, tema certo, pontes `__EX_IDS`/`__mini`/`__enterExercise`/`__go`/`__S`; biblioteca com 22 cartões; sem `?test=1` não há ganchos.
  - `exercicios`: cada id de `__EX_IDS` (9 frames) renderiza o 1º e o 5º frame em lateral e frontal (mesa flexora: posterior) com imagem no canvas; a prévia `__mini` desenha para todos.
  - `jornada` (ex-`jor`): migração, conjunto, treino, folhas, tema, sessão com prévia 3D → palco → volta, todas as séries, resumo, conjunto novo com treino compartilhado, treino sem equipamento, bibliotecas.
  - `calistenia` (ex-`cal`): ficha da semana, aquecimento guiado, ordem exata do circuito de 2 rodadas, resumo, ficha depois, próximo treino.
  - `gamificacao` (ex-`gam`): 6 semanas sintéticas → placar, jornada (liga, sequência, desafios, conquistas), regras, perfil, resumo com pontos, recorde ao vivo.
  - Relatório: `npx playwright show-report` (pasta `playwright-report/`). Só um spec: `npx playwright test jornada --project claro`.
- **Prints da skill 3D (`tests/visual/`, com `npm run dev` ligado; `BASE=http://localhost:4173/` para usar o preview):** `ex.mjs '<json de instantes>' <id> <prefixo>`, `mini.mjs [light|dark]` (todas as prévias), `mob.mjs` (celular, claro e escuro, largura 390), `artifact.mjs` (confere `dist-artifact/`). Saída em `tests/visual/out/`. Os antigos scripts por exercício (`lp`, `sup`, `row`… e `chk`, `menu`, `page`, `shot`, `vshot`) saíram na S02: o `ex.mjs` genérico cobre todos.

## Artifact publicado

- **Publicado como Artifact (claude.ai):** https://claude.ai/artifact/7rca7r3eRxTwX4kiZ4B7zK — título "Meu Treino 3D". Arquivos publicados: a página (`dist-artifact/index.html`, HTML único com CSS + JS inline) e `body-model.wasm` (o modelo GLB). Capability **`db`** declarada com a regra `{path:"", read:"admin", write:"owner"}` (só o Arthur lê e grava; quem receber o link não vê os dados).

- Restrições do Artifact e do host: ver Stack em [Motor-3D](Motor-3D.md) (scripts só de CDNs permitidos, por isso o three vai empacotado; `.glb` publicado como `body-model.wasm`).

- Se o ambiente de ferramentas mudar, o HTML publicado também contém todo o código (`Artifact read`).
