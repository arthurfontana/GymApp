# Sessão 03 — Vercel, PWA e CI

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S02 · **Marco:** M0

> **Por que Sonnet:** integrações ponto a ponto com ferramentas bem documentadas (Vercel, `vite-plugin-pwa`, GitHub Actions) e um carregamento sob demanda sobre pontes que já existem (`window.__mini`, `window.__enterExercise`). Os contratos estão fechados em `Arquitetura.md`.

## Antes de abrir a sessão (Arthur)

[Preparação de Contas](Preparacao-de-Contas) **P1** (Wiki) e **P2** (projeto importado na Vercel). Responda a pergunta **P2** do roadmap (nome do app).

## Prompt

> Você está implementando a **Sessão 03 do GymApp — Vercel, PWA e CI**.
>
> **Leia antes de começar:** `docs/wiki/Arquitetura.md` §2 (linhas Front, 3D, Modelo, Agendamento), §5, §6 e §8; `docs/claude/Build-e-Publicacao.md`; `docs/wiki/Roadmap-e-Sessoes.md` (regras transversais).
>
> ### Estado atual
> Depois da S02, o app é construído por Vite (`npm run build` → `dist/`). O 3D (`src/3d/app3d.js` + three) e o modelo de 4 MB carregam logo na abertura, junto com a jornada. Existe `.github/workflows/ci.yml` só com o job `guardrails` (S01) e `sync-wiki.yml`. O projeto já está importado na Vercel (preset Vite).
>
> ### Objetivo
> O app atual no ar em `https://<nome>.vercel.app`, **instalável no celular**, abrindo rápido (3D só quando precisa), com preview por PR e CI completo.
>
> ### Escopo
> 1. **`vercel.json`**: `buildCommand`, `outputDirectory: dist`, headers: `/assets/*` e `/modelos/*` com `Cache-Control: public, max-age=31536000, immutable` (o modelo tem a versão no nome); `index.html` e o service worker com `no-cache`; segurança: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (`camera=()` etc.) e uma **CSP** que funcione com o tema inline (hash do script), Google Fonts e `connect-src 'self' https://*.supabase.co`. Teste no preview e registre a CSP final em `Arquitetura.md` §6.
> 2. **PWA** com `vite-plugin-pwa` (`generateSW`): manifest (nome "Meu Treino 3D", `short_name` "Meu Treino", `display: standalone`, `start_url: /`, cores dos tokens, ícones 192/512/maskable gerados de um SVG simples em `public/icons/`), `apple-touch-icon` e metas do iOS; precache do shell; cache em tempo de execução: fontes (StaleWhileRevalidate), `/modelos/*` (CacheFirst), **nunca** `/api/*`. Aviso "Nova versão disponível — Atualizar" (toast no padrão do app).
> 3. **3D sob demanda**: a jornada carrega primeiro; o `app3d` (e o three) só por `import()` quando a rota for `#biblioteca`, `#<exercício>` ou quando a jornada pedir uma prévia `__mini`. Crie `src/3d/carregar.js` com `window.__mini` e `window.__enterExercise` provisórios, que carregam o módulo e repassam a chamada (mantendo o contrato atual, inclusive `__mini(null)`), e um indicador de carregamento na cena. `__EX_IDS` precisa existir antes do 3D: derive dos ids de `LIB` e acrescente um teste que garanta `LIB` == `EXS`.
> 4. **CI** (`.github/workflows/ci.yml`): job `verificar` (Node 22, `npm ci`, `npm run check`, `npx playwright install --with-deps chromium`, `npm run test:e2e`), anexando os prints como artefato quando falhar; mantenha `guardrails`.
> 5. **Rodapé e README**: crédito CC BY 4.0 do modelo preservado no app público; `README.md` com a URL, os comandos e o link para a Wiki.
>
> ### Testes
> - e2e novo `carregamento`: abrir o Início **não** baixa `app3d`, `three` nem `body-model` (verifique as requisições do Playwright); abrir `#biblioteca` baixa; a prévia da sessão aparece.
> - e2e existentes verdes. Build do Artifact (`npm run build:artifact`) continua funcionando: lá o 3D pode carregar junto.
>
> ### Critérios de aceite
> - Preview automático em cada PR e produção em `main` funcionando no celular (o Arthur confere pelo link do PR).
> - App instalável (Chrome Android "Instalar app"; iOS "Adicionar à Tela de Início"), abre em tela cheia com ícone.
> - Início sem 3D na primeira carga; o 3D aparece ao abrir a biblioteca ou uma sessão.
> - CI verde; a CSP não bloqueia nada no preview (console limpo).
>
> ### Fora do escopo
> Supabase, login e dados na nuvem (S04–S06). Ainda sem login, o app na Vercel usa o modo `local` (dados no aparelho) e mostra o aviso "Versão de teste — seus dados ficam só neste aparelho".
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Arquitetura.md` (§6 com a CSP real, §8 se algo mudou), `docs/claude/Build-e-Publicacao.md` (deploy pela Vercel, preview por PR), `CLAUDE.md` (1 linha: URL de produção), `Decisoes.md` (decisões desta sessão), `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat: deploy na Vercel, PWA, CI e 3D sob demanda (S03)`, push, PR. Resposta ao Arthur: o link do preview, como instalar no celular e o que conferir.
