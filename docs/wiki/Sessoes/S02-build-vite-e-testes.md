# Sessão 02 — Build com Vite e testes com assert

**Modelo:** `Opus 5.5` (`claude-opus-5-5`) · **Depende de:** S01 · **Marco:** M0

> **Por que Opus:** hoje três arquivos são concatenados num único `<script>`, e o `pontos.js` é colado **dentro** do fechamento do `treino.js`. Passar para ES modules muda escopo, ordem de execução e variáveis globais de um jeito que nem sempre quebra na hora: um tema que pisca, um gancho de teste que some, uma prévia 3D que não volta ao palco. Erros sutis em 4.800 linhas de 3D validadas visualmente custam caro para achar depois.

## Antes de abrir a sessão (Arthur)

Nada.

## Prompt

> Você está implementando a **Sessão 02 do GymApp — build com Vite e testes com assert**.
>
> **Leia antes de começar:** `docs/wiki/Arquitetura.md` §2, §3 e §7; `docs/wiki/Decisoes.md` ADR-002 e ADR-011; `docs/claude/Build-e-Publicacao.md` e `docs/claude/Mapa-de-Regioes.md` (criados na S01); a skill `.claude/skills/animacao-3d-exercicio/SKILL.md` §3–§5 (ela precisa continuar funcionando depois desta sessão).
>
> ### Estado atual
> `web/build.py` monta `web/index.html` (559 KB, fragmento sem `<!doctype>`) concatenando `app.js` + `treino.js` (com `pontos.js` colado no marcador `/*@@PONTOS@@*/`) e injetando `treino.css` no `<style>`. O three r128 vem de CDN como global (`THREE`, `THREE.OrbitControls`, `THREE.GLTFLoader`). O modelo é carregado de `body-model.wasm`. `web/test.html` usa o three local e `window.__TEST__=1`. Os 23 scripts de `web/tests/` **imprimem** erros e largura, mas não falham. O 3D e a jornada só conversam por `window.__EX_IDS`, `window.__mini`, `window.__enterExercise` e os ganchos `window.__*` de teste.
>
> ### Objetivo
> O mesmo app, **idêntico para o usuário**, construído com Vite a partir da raiz do repositório. Testes e2e que **falham sozinhos**. O Artifact continua publicável (o Arthur treina nele até a S09).
>
> ### Escopo
> 1. **Estrutura (com `git mv`, para manter o histórico)**: `web/app.js` → `src/3d/app3d.js`; `web/treino.js` → `src/jornada/treino.js`; `web/pontos.js` → `src/jornada/pontos.js`; `web/treino.css` → `src/styles/treino.css`; o `<style>` da casca (fora do bloco "Jornada de treino") → `src/styles/app.css`; a casca HTML (menu da biblioteca `#menuView`, `#stage`, `#appView`, folhas…) → `index.html` na raiz, **documento completo** (`<!doctype html>`, `<html lang="pt-BR">`, `<meta charset>`, viewport `width=device-width, initial-scale=1, viewport-fit=cover`, `theme-color`, fontes do Google, o script curto do tema **antes** do conteúdo, sem piscar); `web/body-model.wasm` → `public/modelos/body-model-v1.glb`; `web/package.json` → `package.json` na raiz (versão 22.0.0). Apague `web/build.py` e `web/` no fim, quando houver paridade.
> 2. **three por npm (0.128.0 fixo)**: `src/three-setup.js` monta `window.THREE = Object.assign({}, THREE, {OrbitControls, GLTFLoader})` a partir de `three` e `three/examples/jsm/...` (o namespace de módulo é congelado, por isso a cópia). No `app3d.js`, as **únicas** mudanças permitidas são a URL do modelo (`import.meta.env.BASE_URL + 'modelos/body-model-v1.glb'`) e o que for estritamente necessário para rodar como módulo. Documente cada uma no PR.
> 3. **Mesma semântica de escopo**: plugin local em `vite.config.js` (hook `transform`) que substitui `/*@@PONTOS@@*/` no `treino.js` pelo conteúdo de `pontos.js`, exatamente como o `build.py` fazia. Entrada `src/main.js` importando, nesta ordem: CSS, `three-setup`, `app3d`, `treino` (a mesma ordem da concatenação). O carregamento do 3D sob demanda é da S03; aqui o 3D ainda carrega junto.
> 4. **Modo de teste**: script inline no `index.html` que define `window.__TEST__` quando a URL tem `?test=1` (precisa vir antes do módulo). Os testes bloqueiam `fonts.googleapis.com` por `page.route`.
> 5. **Testes com assert** (`@playwright/test`, Chromium; `playwright.config.js` com `webServer: npm run preview`, viewport 390×844, projetos claro e escuro, `--trace off`): converter em asserts `smoke` (carrega, `__READY__`, **nenhum `pageerror`/`console.error`**, `scrollWidth ≤ 390`), `exercicios` (cada id de `__EX_IDS` renderiza 2 instantes em lateral e frontal sem erro; equivalente a `mini`/`ex`), `jornada` (fluxo de `jor`), `calistenia` (`cal`) e `gamificacao` (`gam`). Prints viram anexos do teste, sem comparação de pixel. Os scripts de print usados pela skill 3D (`ex.mjs`, `mini.mjs`, `mob.mjs`) passam para `tests/visual/`, apontando para a URL nova.
> 6. **Build do Artifact**: `npm run build:artifact` gera `dist-artifact/index.html` (arquivo único com JS e CSS inline; three e o código empacotados, sem módulos externos, sem CDN fora da lista do Artifact) + `dist-artifact/body-model.wasm` (cópia do `.glb`), e o código aponta para `body-model.wasm` nesse modo. Pode ser um script pós-build (`scripts/build-artifact.mjs`) sobre um build em modo `artifact`. Verifique abrindo o arquivo gerado com Playwright.
>
> ### Testes
> - Os 5 specs e2e verdes em claro e escuro.
> - **Prova de que falham**: injete temporariamente um `throw` na jornada e mostre o teste vermelho; remova e mostre verde. Registre no PR.
> - Comparação visual antes/depois (prints gerados pelo `build.py` antigo **antes** de apagar `web/`): supino, leg press e prancha em lateral e frontal; Início; sessão com prévia 3D. Descreva no PR o que conferiu.
>
> ### Critérios de aceite
> - `npm run dev` abre o app igual ao Artifact v21; `npm run build` gera `dist/` com `index.html`, assets com hash e `modelos/body-model-v1.glb`.
> - `npm run check` (`check:claude-md` + `test` + `build`) e `npm run test:e2e` verdes. O vitest pode começar com um teste trivial: os de verdade vêm na S06/S10.
> - `npm run build:artifact` gera os 2 arquivos e o app abre a partir deles.
> - Nenhuma mudança de comportamento; `app3d.js` só com as mudanças listadas.
>
> ### Fora do escopo
> Vercel, PWA, CI completo e 3D sob demanda (S03); Supabase (S04+); extrair a pontuação para `core/` (S10).
>
> ### Atualização da documentação (obrigatório)
> `CLAUDE.md` (comandos e estrutura: 1 linha cada, com ponteiro), `docs/claude/Build-e-Publicacao.md` (novo fluxo, inclusive como publicar no Artifact com `dist-artifact/`), `docs/claude/Mapa-de-Regioes.md` (caminhos novos), **skill `animacao-3d-exercicio`** (caminhos: `src/3d/app3d.js`, `index.html` para o menu, `src/jornada/treino.js` → `LIB`, `src/jornada/pontos.js` → `PX`, testes em `tests/visual/` e `tests/e2e/`, publicação com `npm run build:artifact`), `docs/wiki/Arquitetura.md` (se algo mudou em relação ao planejado), `Decisoes.md` (decisões tomadas aqui) e `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. Não adicione dependências fora de `Arquitetura.md` §7 sem perguntar. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `build: Vite, estrutura src/ e e2e com assert (S02)`, push, PR. Resposta ao Arthur: o que mudou para ele (nada visível) e como publicar no Artifact agora.
