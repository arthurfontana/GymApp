# Sessão 10 — Motor de pontuação puro (fuso explícito)

**Modelo:** `Opus 5.5` (`claude-opus-5-5`) · **Depende de:** S06 (pode rodar em paralelo com S07–S09) · **Marco:** M3

> **Por que Opus:** é paridade numérica. O módulo novo tem que dar **exatamente** os mesmos pontos, sequências, escudos, desafios e conquistas do v21, agora sem estado global e sem depender do fuso do aparelho. Diferenças de um dia na virada da semana ou de uma hora numa conquista não aparecem em teste casual e mudam o ranking de todos.

## Antes de abrir a sessão (Arthur)

Nada.

## Prompt

> Você está implementando a **Sessão 10 do GymApp — motor de pontuação puro e compartilhado**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Pontuacao.md` (inteira, em especial §5 e §8); `docs/wiki/Decisoes.md` ADR-003, ADR-004, ADR-009; `docs/wiki/Modelo-de-Dados.md` §5 (INV-07, INV-08); em `src/jornada/pontos.js`, as regiões de regras e `jogo` (`grep -n "#region:" src/jornada/pontos.js`); em `src/jornada/treino.js`, `LIB`, `segundaDe`, `ultimaVez`, `sessoesFeitas`, `sessoesDe`.
>
> ### Estado atual
> `pontos.js` é colado dentro do fechamento do `treino.js` (plugin do Vite) e lê o estado global `S` (sessões, conjuntos, perfil), `LIB`, `esc`, `fmtKg`, `icon` e `G` (cache). `segundaDe` usa `new Date().getDay()` (fuso do aparelho) e as conquistas "cedo"/"noite" usam `getHours()`. `PX` mora em `pontos.js` e `LIB` em `treino.js`.
>
> ### Objetivo
> `src/core/` com a regra de pontos **pura** (entradas explícitas, fuso `America/Sao_Paulo`), importável pelo aparelho e pelas funções `/api`, provadamente idêntica ao v21.
>
> ### Escopo
> 1. **Golden primeiro (antes de mexer em qualquer coisa)**: script `tests/golden/gerar.mjs` que roda o código **v21 atual** num navegador do Playwright com `TZ=America/Sao_Paulo`, injeta os documentos e um `agora` fixo e salva o `G` serializado (sem funções) em `tests/golden/*.json` para: (a) `data/` (histórico real); (b) as 6 semanas sintéticas do e2e de gamificação; (c) casos de borda: sessão domingo 23:30 e segunda 00:10 em São Paulo, sessão antes das 7 h e depois das 21 h, semana sem treino com escudo, fichas com caminhada, exercício livre sem 3D, item `lado`, prancha por tempo, circuito. Commite os golden **antes** da refatoração.
> 2. **`src/core/tempo.js`**: `segundaDe`, `proxSeg`, `segAntes`, `horaDe`, `diaDe` em `America/Sao_Paulo` via `Intl.DateTimeFormat` (sem depender do `TZ` do processo nem do aparelho). Brasil sem horário de verão hoje, mas o código não pode presumir isso.
> 3. **`src/core/catalogo.js`**: `LIB`, `PX`, `GRUPOS`, `EQ`, `EQ_ORD` (movidos literalmente). `treino.js` e `pontos.js` passam a importar daqui. Teste: ids de `LIB` == ids de `PX` (salvo os exercícios livres) == ids de `EXS` no 3D.
> 4. **`src/core/pontuacao.js`**: `jogo({sessoes, conjuntos, perfil, agora}) → G` (mesma forma), `pontuar`, `tempos`, `nivelDe`, `ligaDe`, `desafiosDa`, `DESAFIOS`, `CONQ`, `LIGAS`, `TITULOS`, `xpNivel`, `REGRA_VERSAO = 1`, `estimaPts`. Sem DOM, sem `S`, sem `Date.now()` implícito. As funções de texto da regra (`txtMarca` etc.) vão junto, com `fmtKg` vindo de um `core/formato.js` puro. Ícones e HTML ficam nas telas. `ultimaVez`/`mesmoEx`/`exChave` necessários à regra passam para `core/` (puros).
> 5. **Telas**: `src/jornada/pontos.js` vira só telas (`vPlacarCard`, `vJornada`, `vRegras`, `vPontosResumo`, `sheetPerfil` etc.) e chama `jogo({...S, perfil, agora: Date.now()})` com cache por render (o mesmo `G` de antes). O marcador `/*@@PONTOS@@*/` e o plugin do Vite deixam de ser necessários se a jornada importar o módulo de telas. Faça isso **só** se não mudar o comportamento.
>
> ### Testes
> - `tests/unit/pontuacao.test.js`: para cada golden, `jogo()` do módulo novo == golden (comparação profunda; números exatos), rodando com `TZ=UTC`, `TZ=America/Sao_Paulo` e `TZ=Asia/Tokyo` (prova da independência de fuso: CT-01 e CT-02 de Pontuação).
> - e2e `gamificacao`, `jornada` e `calistenia` verdes sem mudança.
>
> ### Critérios de aceite
> - Golden idênticos nos 3 fusos.
> - Nenhuma referência a `S`, `document` ou `window` em `src/core/` (teste que importa `core/` em Node puro).
> - Telas com o mesmo resultado visual (prints da jornada e do resumo antes/depois).
>
> ### Fora do escopo
> Limites de plausibilidade e `REGRA_VERSAO 2` (S11); servidor, eventos e placar (S11); qualquer mudança de regra.
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Pontuacao.md` (estado → ✅ módulo puro; §5 com as assinaturas reais), `Arquitetura.md` §3 (`core/`), `CLAUDE.md` (mapa: Pontuação → `src/core/pontuacao.js`; regra inviolável: "regra de pontos só muda em `core/pontuacao.js` com golden atualizado de propósito e `REGRA_VERSAO` incrementada"), skill `animacao-3d-exercicio` (`LIB`/`PX` agora em `src/core/catalogo.js`), **skill de projeto** `.claude/skills/pontuacao-golden/SKILL.md` (G4: "Use SEMPRE que mexer em `src/core/pontuacao.js`, `PX`, regras de pontos, ligas, desafios ou conquistas…", checklist: rodar golden, nunca regenerar golden para "o teste passar" sem justificar a mudança de regra, incrementar `REGRA_VERSAO`), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. Movimentação **literal** de código (G5.2): zero mudança de lógica, exceto trocar o fuso implícito pelo explícito. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `refactor(core): pontuação pura com fuso explícito e golden (S10)`, push, PR. Resposta ao Arthur: "nada muda na tela; os pontos agora podem ser calculados no servidor".
