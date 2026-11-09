# Arquitetura

> **Estado**: 🚧 Protótipo v22 no ar na Vercel (S03: PWA, CSP, 3D sob demanda) e ainda em produção no Artifact · arquitetura alvo 🔮 planejada (S04–S16)
> **DECs**: ADR-001, ADR-002, ADR-003, ADR-004, ADR-006, ADR-008, ADR-009, ADR-012, ADR-013, ADR-015, ADR-016

## 1. Hoje (protótipo v21, build com Vite desde a S02)

```
src/3d/app3d.js        3D: three.js r128 (npm, global window.THREE), rig, 22 exercícios, câmera   4.827 linhas · 366 KB
src/jornada/treino.js  jornada: store, telas, sessão ao vivo, roteador por hash (IIFE)           925 linhas ·  89 KB
src/jornada/pontos.js  gamificação (colada DENTRO de treino.js pelo plugin do vite.config.js)    355 linhas ·  35 KB
src/styles/            app.css (casca) + treino.css (jornada)
index.html             casca completa (doctype, tema sem piscar, menu da biblioteca)
public/modelos/body-model-v1.glb   modelo GLB de 4,15 MB
Saídas: dist/ (web) e dist-artifact/ (arquivo único + body-model.wasm para o Artifact; ADR-015)
Dados: window.claude.use('db') (API no estilo Firestore) ou localStorage
```

Até a S02 era `web/` + `build.py` (concatenação num `index.html` de 559 KB sem `<!doctype>`, three pelo jsDelivr).

As peças conversam assim:

- **3D ↔ jornada** só por pontes globais: `window.__EX_IDS` (derivado de `LIB`, existe antes do 3D), `window.__mini(el, id)`, `window.__enterExercise(id)` (provisórias em `src/3d/carregar.js` até o 3D carregar; o `app3d.js` as troca pelas reais), `window.__carregar3D()` e os ganchos de teste `window.__*`. Essa costura limpa é o que permite trocar a casca sem mexer no 3D.
- **Armazenamento** fica concentrado em `put(col,id,data)` / `del(col,id)` (fila por documento, escrita otimista) e em `initStore()` (snapshots por coleção). Trocar o backend significa escrever um adaptador novo.
- **Pontuação** (`jogo()`) recalcula tudo a partir das sessões, mas lê o estado global `S` e usa o **fuso do aparelho** (`segundaDe`).

Diagnóstico completo: [S00 — Análise e plano](S00-analise-e-plano).

## 2. Arquitetura alvo

```
 Celular (PWA instalável)                         Vercel
 ┌──────────────────────────────┐   HTTPS   ┌──────────────────────────────────────┐
 │ index.html + JS (Vite)       │──────────▶│ estáticos (dist/) com cache          │
 │  ├ jornada (telas, sessão)   │           │ /api/* funções Node (servidor)       │
 │  ├ 3D (carregado sob demanda)│           │  ├ convites/aceitar · convites       │
 │  ├ core/ (pontuação, tempo)  │◀─ mesmo ─▶│  ├ pontos/recalcular · cron/placar   │
 │  └ dados/ (fila offline)     │  código   │  └ admin/usuarios · senha/*          │
 └──────────┬───────────────────┘           └───────────────┬──────────────────────┘
            │ supabase-js (JWT do usuário)                  │ chave secreta (só no servidor)
            ▼                                               ▼
        Supabase (região São Paulo): Auth · Postgres com RLS em todas as tabelas
```

| Camada | Escolha | Observações |
|---|---|---|
| Front | **Vite** + JavaScript puro (ES modules), sem framework de UI | O código da jornada continua com renderização por `innerHTML` + `esc()`; roteamento por `location.hash` (sem rewrites) |
| 3D | **three@0.128.0** via npm (versão fixa) | `app3d.js` (ex-`web/app.js`) **intocado** (só a URL do modelo mudou na S02); `three-setup.js` expõe `window.THREE` + `OrbitControls` + `GLTFLoader` (jsm r128). Carregado por `import()` dinâmico (`src/3d/carregar.js` → chunk `tres-d-*.js`) só quando a rota é `#biblioteca`, `#<exercício>` ou a sessão pede a prévia (S03). No Artifact o 3D vem embutido no bundle |
| Modelo | `public/modelos/body-model-v1.glb` | Volta a ser `.glb`, com a versão no nome para cache imutável pelos headers da Vercel. Crédito CC BY 4.0 no rodapé |
| Dados no aparelho | `src/dados/store.js` com a **mesma interface** que o código usa hoje (`put`/`del`/`S.*`) | Adaptadores: `nuvem` (Supabase), `local` (localStorage, para testes e preview sem backend) e `artifact` (db do claude.ai, só até a S09) |
| Fila offline | IndexedDB (fallback localStorage) | Toda escrita entra primeiro na fila persistente e depois sobe; sobrevive a fechar o app (ADR-008) |
| Núcleo compartilhado | `src/core/*.js` puro (sem DOM, sem estado global, fuso explícito) | `catalogo.js` (LIB + PX), `tempo.js`, `pontuacao.js`, `progressao.js`. Importado pelo front **e** pelas funções `/api` |
| Servidor | **Vercel Functions** (Node 22) em `api/` | Validam o JWT do Supabase; usam a chave secreta (service role) para escrever pontos, criar contas e administrar |
| Banco | **Supabase Postgres** com migrations SQL em `supabase/migrations/` | RLS em toda tabela; testes de política pgTAP em `supabase/tests/` |
| Auth | **Supabase Auth**, e-mail + senha, cadastro público **desligado** | Conta criada só pelo servidor ao aceitar um convite (ADR-005) |
| Agendamento | **Vercel Cron**, 1×/dia | Recalcula o placar (pontos expiram em 28 dias) e mantém o Supabase Free acordado |
| PWA | `vite-plugin-pwa` (generateSW, S03) | Manifest + ícones em `public/icons/`; precache só do shell; fontes em `StaleWhileRevalidate`, modelo e chunk do 3D em `CacheFirst`; `/api/*` nunca em cache; aviso "Nova versão disponível — Atualizar" |

## 3. Estrutura de pastas alvo (após S02/S03)

```
index.html               casca HTML (doctype, viewport, manifest, tema sem piscar, menu da biblioteca)
src/
  main.js                entrada: tema, roteador, jornada; importa o 3D sob demanda
  three-setup.js         window.THREE + OrbitControls + GLTFLoader (r128)
  3d/carregar.js         pontes provisórias + import() do 3D sob demanda (S03)
  3d/tres-d.js           pacote carregado sob demanda: three-setup + app3d
  3d/app3d.js            ex-web/app.js (biblioteca 3D) — não reescrever
  pwa.js                 registro do service worker e aviso "Nova versão disponível" (S03)
  jornada/treino.js      ex-web/treino.js (telas, sessão, roteador)
  jornada/pontos.js      ex-web/pontos.js (até a S10; depois só telas, regras em core/)
  core/                  módulos puros compartilhados com api/ (a partir da S10)
  dados/                 store.js + adaptadores (nuvem, local, artifact) + fila offline
  auth/                  telas de login, convite, primeiro acesso (S05)
  styles/                app.css (ex-<style> do index.html) + treino.css
public/                  modelos/body-model-v1.glb, icons/ (SVG + PNG, S03); manifest e sw gerados pelo vite-plugin-pwa
vercel.json              build, cache e cabeçalhos de segurança (CSP: §6)
api/                     funções da Vercel (S05, S11, S13, S15)
supabase/
  config.toml            projeto local (Supabase CLI)
  migrations/            NNNN_descricao.sql — schema + RLS + funções
  tests/                 *.test.sql (pgTAP) — testes de política
  seed.sql               dados de desenvolvimento (nunca produção)
scripts/                 seed da biblioteca, importação do Arthur, check-claude-md, build-artifact (até a S09)
tests/
  unit/                  vitest (core, dados)
  e2e/                   Playwright com asserts (S02: smoke, exercicios, jornada, calistenia, gamificacao; depois sessão offline, ranking)
  visual/                prints da skill 3D (ex, mini, mob) e conferência do dist-artifact/
  golden/                saídas de referência da pontuação v21
seed/                    JSON dos PDFs (fonte da biblioteca inicial)
data/                    cópia do histórico do Arthur (até a S08)
docs/wiki/               documentação normativa (sincroniza com a Wiki)
docs/claude/             detalhe de implementação para a IA (Exercicios-3D, Motor-3D, Build-e-Publicacao, Mapa-de-Regioes)
tools/, third_party/     geração do modelo (não vão para o app)
```

`dist/`, `dist-artifact/`, `test-results/`, `playwright-report/` e `tests/visual/out/` são saída de build e de teste (fora do git): **nunca ler, varrer nem editar**.

## 4. Ambientes

| Ambiente | Front | Banco | Quem usa |
|---|---|---|---|
| Local | `npm run dev` (Vite, porta 5173) | Supabase local (`supabase start` com Docker; fallback: Postgres 16 local com shim de `auth`) | Sessões do Claude Code, testes |
| Preview | Deploy de cada PR na Vercel | `gymapp-dev` | Arthur testa o PR no celular antes do merge |
| Produção | `main` na Vercel | `gymapp-prod` | Todos |

Dois projetos Supabase (o plano Free permite dois ativos): `gymapp-dev` para os previews, `gymapp-prod` com os dados reais (ADR-013). **As sessões do Claude Code testam contra o Supabase local e não recebem chave de produção.** O repositório é público: nenhum workflow imprime segredo, link de senha ou convite no log.

## 5. CI/CD

| Workflow | Quando | O que faz |
|---|---|---|
| `.github/workflows/ci.yml` (S03) | todo PR e push | job `guardrails` (teto do `CLAUDE.md`) e job `verificar`: Node 22 → `npm ci` → `npm run check` (`check:claude-md` + `test` + `build`) → `playwright install` → `test:e2e`; se falhar, anexa `playwright-report/` e `test-results/` (prints) como artefato. Na S04 entra `test:db` (`supabase start` + `supabase test db`) |
| `.github/workflows/db-deploy.yml` (S04) | push em `main` que toque `supabase/migrations/**` | `supabase db push` no `gymapp-dev` (automático) e depois no `gymapp-prod` (com aprovação no GitHub Environment `producao`) |
| `.github/workflows/importar-arthur.yml` (S08) | manual (`workflow_dispatch`) | importação do histórico do Arthur: `dry-run` ou `aplicar` (environment `producao`) |
| `.github/workflows/sync-wiki.yml` | push em `main` que toque `docs/wiki/**` | publica a Wiki |
| Vercel Git | todo PR / `main` | deploy de preview / produção (`vercel.json`: `npm run build`, saída `dist`). O CI do GitHub não faz deploy |

## 6. Segurança em camadas

1. **RLS em toda tabela.** Sem política, sem acesso. Cada tabela nova nasce com RLS + teste pgTAP (Modelo de Dados §3).
2. **Chave secreta (service role) só no servidor.** Nunca em `VITE_*` (essas variáveis vão para o navegador), nunca no repositório.
3. **Funções `/api` verificam o JWT** (`supabase.auth.getUser(token)`) e, quando é coisa de administrador, o papel em `perfis.papel`. Resposta 401/403 com o catálogo de erros da funcionalidade.
4. **Dados de outras pessoas sempre passam por `esc()`** antes de entrar no `innerHTML` (apelido no ranking!). CSP nos headers da Vercel (S03, abaixo; revisada na S16).
5. **Limite de frequência** nas rotas sensíveis (aceitar convite, recalcular pontos, redefinir senha).
6. **Pontos só são escritos pelo servidor**; o cliente mostra uma prévia (ADR-004).

**Cabeçalhos e CSP (S03, `vercel.json`)** — valem para todas as rotas; `/assets/*` e `/modelos/*` levam `Cache-Control: public, max-age=31536000, immutable` (arquivos com hash ou versão no nome); `/`, `/index.html`, `/sw.js` e `/manifest.webmanifest` levam `no-cache`. Além da CSP: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'sha256-whIvstMULVBDe2UpQLPtDNb6z/YVwMYRQ1BQ8LFAbfI=' 'sha256-9uI6Be7QV5gsq2cTk9Jo/8Bt72Q7L5Kj3NA9csuDMCU=';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self' blob: https://*.supabase.co;
  worker-src 'self'; manifest-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

- Os dois hashes são dos scripts inline do `index.html` (tema sem piscar e modo de teste `?test=1`). **Mexeu num deles? Atualize o hash**: `tests/unit/vercel-json.test.js` calcula e reprova se estiver errado. Sem `'unsafe-inline'` em scripts.
- `style-src 'unsafe-inline'` é necessário porque as telas montam `innerHTML` com `style="..."`; o risco de CSS é baixo e o `esc()` continua obrigatório. Reavaliar na S16.
- `connect-src blob:` é exigência do GLTFLoader (lê texturas embutidas no modelo por `fetch` de `blob:`); descoberto no e2e, que roda sob esta mesma CSP (o `vite preview` aplica os cabeçalhos do `vercel.json`). Sem ele o console enche de erros.
- `https://*.supabase.co` já fica liberado para a S04–S06 (o app ainda não fala com o Supabase). O `frame-ancestors 'none'` impede o app de abrir dentro de iframe.
- Conferência no preview da Vercel: abrir o link do PR com o console aberto; não pode haver "Refused to ..." (o e2e cobre o mesmo no build local).

## 7. Regras normativas (não negociáveis sem nova DEC)

- **Não reescrever** `src/3d/app3d.js` e **não trocar** o three r128. Exercício novo ou ajuste no 3D segue a skill `animacao-3d-exercicio`.
- **Sem framework de UI** (React, Vue, Svelte, Next) e sem TypeScript no app. JSDoc nos módulos de `core/` e `dados/` é bem-vindo.
- **Dependências permitidas**: `vite`, `three@0.128.0`, `@supabase/supabase-js@2`, `vite-plugin-pwa` (S03), `vitest`, `playwright` / `@playwright/test`, `supabase` (CLI, dev), `fake-indexeddb` (testes). Qualquer outra: **pergunte antes**.
- **Regra de pontos** só muda em `src/core/pontuacao.js`, com golden tests atualizados de propósito e `REGRA_VERSAO` incrementada (Pontuação §4).
- **Toda escrita de dados do usuário passa por `src/dados/store.js`.** Nada de `supabase.from(...).upsert` espalhado pelas telas; exceções: perfil (S05) e leituras da biblioteca e do ranking.
- **Nenhum script escreve em `gymapp-prod`** sem `--dry-run` antes e confirmação explícita do Arthur.
- **Celular primeiro**: toda tela testada em 390×844, claro e escuro, sem rolagem horizontal.

## 8. Custos e limites (planos gratuitos)

| Serviço | Limite que importa | Nossa escala |
|---|---|---|
| Vercel Hobby | Só uso **não comercial**; cron no máximo 1×/dia; banda mensal limitada | Início ≈ 0,2 MB (≈ 50 KB comprimidos de JS + CSS); o 3D (chunk ≈ 0,9 MB, ≈ 240 KB comprimidos, + modelo 4 MB) só baixa ao abrir a biblioteca ou uma sessão; depois fica em cache (cache imutável + service worker) |
| Supabase Free | 500 MB de banco; **pausa após 7 dias sem uso** (o cron diário evita); 2 projetos ativos | Uma sessão ≈ 3 KB → 10 pessoas × 3 treinos/semana ≈ 5 MB por ano |
| E-mail | Não usamos SMTP na v1 (ADR-005) | Esqueci a senha = link gerado pelo administrador |

Se o app virar algo comercial ou crescer muito: Vercel Pro e Supabase Pro (nova DEC).
