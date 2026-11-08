# Sessão 01 — Guardrails de contexto (CLAUDE.md em camadas)

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S00 · **Marco:** M0

> **Por que Sonnet:** é uma reorganização sem mudança de comportamento, guiada por um playbook pronto (skill `guardrails-de-contexto`, Playbook B). O risco é perder informação ao mover, e isso se controla com a regra "mover, nunca apagar" e com o diff. Não há invariante de dados nem lógica nova.

## Antes de abrir a sessão (Arthur)

Nada. Se der, anexe também o repositório `arthurfontana/skills`, para a sessão usar a skill `guardrails-de-contexto` e copiar o guard pronto.

## Prompt

> Você está implementando a **Sessão 01 do GymApp (Meu Treino 3D) — guardrails de contexto**.
>
> **Leia antes de começar:** `docs/wiki/Roadmap-e-Sessoes.md` (regras transversais), `docs/wiki/Decisoes.md` ADR-012, `docs/wiki/Funcionalidade-Treinos-e-Sessao.md` §8 e `docs/wiki/Funcionalidade-Pontuacao.md` §8 (os destinos). Se a skill `guardrails-de-contexto` estiver disponível (repositório `arthurfontana/skills`, `plugins/guardrails-de-contexto-plugin/skills/guardrails-de-contexto/`), siga o **Playbook B** e o `references/template-claude-md.md` dela. Se não estiver, siga as regras deste prompt.
>
> ### Estado atual
> O `CLAUDE.md` tem cerca de 52 KB (≈ 13 mil tokens) e é carregado em toda sessão. Ele mistura o que toda sessão precisa (stack, comandos, regras) com detalhe de domínio: os 22 exercícios item a item (§2), a jornada (§2a–§2c), a gamificação (§2d), o histórico de decisões (§3), o rig e as máscaras (§4) e os padrões de conteúdo (§5). A S00 criou `docs/wiki/` (normativa). A skill de projeto `.claude/skills/animacao-3d-exercicio/SKILL.md` aponta para seções do `CLAUDE.md` (§2, §4).
>
> ### Objetivo
> `CLAUDE.md` vira um **índice enxuto** (meta ≤ 200 linhas, teto 450) com o mapa "Onde vive o quê", **sem perder nenhuma informação**, com um guard mecânico no CI e âncoras de região nos arquivos grandes.
>
> ### Escopo
> 1. **Mover o conteúdo** para o lar certo, reescrito como estado atual (sem "v15/v18" no corpo, exceto como referência histórica em Decisões):
>    - §2 (lista dos 22 exercícios com parâmetros, vistas, cores, tempo, erros) e §5 (padrões de conteúdo) → `docs/claude/Exercicios-3D.md` (uma seção por exercício, com o id e a const: `SUP`, `LPX`…);
>    - §4 (stack 3D, modelo e rig, coordenadas, ossos, músculos/máscaras, estrutura de um exercício, parâmetros da remada e do leg press, hooks de teste) → `docs/claude/Motor-3D.md`;
>    - §4 "Estrutura do repositório", fluxo de build, publicar no Artifact, testes → `docs/claude/Build-e-Publicacao.md`;
>    - §2a, §2b, §2c → `docs/wiki/Funcionalidade-Treinos-e-Sessao.md` §8 (normativa; mantenha os detalhes de tela e regra: rotas, folhas, circuito, aquecimento, ficha da semana, progressão, prévia `__mini`);
>    - §2d → `docs/wiki/Funcionalidade-Pontuacao.md` §8;
>    - formato dos dados de §2b → confira contra `docs/wiki/Modelo-de-Dados.md` §4 e complete lá o que faltar (não duplique);
>    - §3 (histórico de decisões do boneco/modelo) → `docs/wiki/Decisoes.md` como `ADR-000a`… "Decisões do protótipo" (formato curto);
>    - §6 (pendências) → `docs/wiki/Roadmap-e-Sessoes.md` (perguntas em aberto/backlog).
> 2. **Reescrever o `CLAUDE.md`** como índice: o que é o produto (3–5 linhas, mencionando a evolução para app web e onde está o roadmap); "Documentação em camadas — como usar"; comandos atuais (`cd web && python3 build.py`, `npm run serve`, testes de `web/tests/`, `npm run check:claude-md`); **regras invioláveis na íntegra** (§0 skill de animação para todo briefing; nunca editar `web/index.html` na mão; dados do Arthur ficam no db do Artifact, com cópia em `data/`; textos em pt-BR curtos); estrutura resumida; exclusões de varredura (`web/out/`, `web/index.html` e `web/test.html` são gerados, `node_modules/`, `third_party/**/models`); tabela "Onde vive o quê" (1 linha por domínio: Exercícios 3D, Motor 3D, Jornada, Pontuação, Dados, Build e publicação, Plano de evolução/sessões, Decisões); resumo das ADRs (1 linha cada). Mantenha o tom: "Idioma do usuário: pt-BR; respostas curtas; ele usa o app no celular".
> 3. **Atualizar os ponteiros da skill** `.claude/skills/animacao-3d-exercicio/SKILL.md`: onde ela diz "CLAUDE.md §4" → `docs/claude/Motor-3D.md`; "CLAUDE.md §2 item numerado" → `docs/claude/Exercicios-3D.md`; "Publicar" → `docs/claude/Build-e-Publicacao.md`. Não mude as regras da skill.
> 4. **Guard mecânico**: `scripts/check-claude-md.mjs` (copie `assets/check-claude-md.mjs` da skill; se não houver acesso, escreva o equivalente: conta as linhas, teto padrão 450 ou `CLAUDE_MD_MAX_LINES`, `exit 1` com mensagem de poda). Script `check:claude-md` em `web/package.json` (`node ../scripts/check-claude-md.mjs ../CLAUDE.md`). Crie `.github/workflows/ci.yml` com um job `guardrails` (Node 22) que roda esse script em todo PR e push. A S03 amplia esse workflow.
> 5. **Âncoras de região** (só linhas novas de comentário, zero mudança de código): `// #region: <slug>` no início de cada bloco de `web/app.js` (utilitários, renderer/cena, rig, cinemática, pesos, máscaras, carga do modelo, cada exercício `SUP`…`LNG`, `EXS`, `__mini`, `__enterExercise`, ganchos de teste), `web/treino.js` (utilitários, LIB, estado, armazenamento, migração, derivados, cada view `v*`, sessão, folhas, ações, roteador) e `web/pontos.js` (PX, regras, jogo, telas). Mapa em `docs/claude/Mapa-de-Regioes.md` (arquivo → slug → principais funções), com o comando `grep -n "#region:" web/*.js`.
>
> ### Testes
> - `cd web && python3 build.py` e `npm run serve`; rode `node tests/gam.mjs light`, `node tests/jor.mjs light`, `node tests/cal.mjs light` e `node tests/mob.mjs`: **zero erros de JS e largura 390**, igual a antes.
> - Guard testado **nos dois sentidos**: verde no tamanho atual; vermelho com teto artificial (`node scripts/check-claude-md.mjs CLAUDE.md 50` → exit 1). Registre os dois resultados no PR.
>
> ### Critérios de aceite
> - `CLAUDE.md` ≤ 450 linhas (meta ≤ 200) e o mapa cobre todos os domínios.
> - **Nenhuma informação sumiu**: o PR traz uma tabela "seção antiga → novo lar".
> - Diffs de `web/*.js` só com linhas `+` de comentário `#region`.
> - A skill aponta para os novos lares e continua dizendo exatamente as mesmas regras.
> - CI com o job `guardrails` verde.
>
> ### Fora do escopo
> Vite e mudança de estrutura de pastas (S02); qualquer mudança de comportamento; mudar o conteúdo das regras da skill.
>
> ### Atualização da documentação (obrigatório)
> As páginas de destino acima; `docs/wiki/Roadmap-e-Sessoes.md` (status da S01: ✅ + PR); `docs/wiki/Decisoes.md` (ADR-012 confirmada + ADR-000x do protótipo). A documentação descreve o sistema como ele fica **após** esta sessão.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md` §Regras transversais. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `docs: CLAUDE.md em camadas, guard e âncoras (S01)`, push na branch de trabalho, PR para `main`. Resposta ao Arthur em 3–5 linhas: tamanho antes/depois e onde ficou cada coisa.
