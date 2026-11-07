# Sessão 11 — Pontuação oficial no servidor

**Modelo:** `Opus 5.5` (`claude-opus-5-5`) · **Depende de:** S10 e S08 · **Marco:** M3

> **Por que Opus:** o servidor passa a ser a fonte da verdade do ranking. Recalcular tem que ser **idempotente e atômico** (sem duplicar nem sumir pontos com chamadas simultâneas), as permissões de escrita têm que barrar o cliente, o cron tem que ser seguro e os limites de plausibilidade mudam a regra (versão 2) sobre dados reais. Erros aqui aparecem como ranking errado para todo mundo.

## Antes de abrir a sessão (Arthur)

Confirme que `CRON_SECRET` está na Vercel (P4).

## Prompt

> Você está implementando a **Sessão 11 do GymApp — pontuação oficial no servidor**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Pontuacao.md` (US-02, US-03, CT-03 a CT-06, RN-01 a RN-05, §5); `docs/wiki/Funcionalidade-Ranking-e-Competicao.md` §4 e §5 (o que `fn_ranking` precisa devolver); `docs/wiki/Modelo-de-Dados.md` §2 (`pontos_eventos`, `placar`, funções) e §3; `docs/wiki/Decisoes.md` ADR-004 e ADR-009; skills `pontuacao-golden`, `banco-e-rls` e `persistencia-dados`; `docs/claude/Auth-e-API.md`.
>
> ### Estado atual
> `src/core/pontuacao.js` é puro e idêntico ao v21 (S10). Os pontos só existem no aparelho. Os dados de todos estão na nuvem (S06) e o histórico do Arthur está em produção (S08).
>
> ### Objetivo
> Pontos oficiais gravados pelo servidor a cada treino e uma vez por dia, com limites de plausibilidade, prontos para o ranking.
>
> ### Escopo
> 1. **Migrations**: `pontos_eventos`, `placar` (RLS: o dono lê; **nenhuma** escrita para `authenticated`), `substituir_pontos(uid, eventos jsonb, placar jsonb)` (`security definer`, `execute` só para `service_role`; apaga e insere numa transação com `pg_advisory_xact_lock(hashtext(uid::text))`, para chamadas simultâneas não intercalarem), `fn_ranking(periodo)` (`'liga'|'semana'|'geral'`, `security definer`, `execute` para `authenticated`, revogado de `anon`; só perfis `ativo and no_ranking` com evento; semana em `America/Sao_Paulo`; devolve os campos de Modelo de Dados §3 + `posicao` com empate = mesma posição).
> 2. **`api/pontos/recalcular.js`**: `POST` com JWT; o próprio usuário, ou o administrador com `{userId}`/`{todos:true}` (em lotes). Lê com a chave secreta as sessões concluídas, os conjuntos e o perfil privado do usuário, roda `jogo()` com `agora = Date.now()` e grava pelos eventos de `G.ev` (`t`, `p`, `tipo`, `txt`, `ref`, `regra_versao`) + placar (`xp`, `nivel`, `titulo`, `seq`, `escudos`, `treinos_semana`, `kcal_semana`, `recordes`, `conquistas`). Limite: 1 cálculo a cada 10 s por usuário (pedidos no meio do intervalo são agrupados). Resposta como em Pontuação §5.
> 3. **`api/cron/placar.js`** + `vercel.json` `crons` (1×/dia, de madrugada em São Paulo): exige `Authorization: Bearer ${CRON_SECRET}`; recalcula todos os perfis ativos; registra só contagens no log.
> 4. **Limites de plausibilidade** em `core/pontuacao.js` como `REGRA_VERSAO = 2` (Pontuação US-03): reps ≤ 100, tempo ≤ 600 s, séries pontuadas ≤ `series + 5`, até 3 sessões pontuadas por dia (as de maior pontuação), `pesoCorp` limitado a 30–300. O resultado traz quais limites foram aplicados. Atualize os golden **de propósito** (skill `pontuacao-golden`) e liste no PR o efeito sobre o histórico do Arthur (`data/`).
> 5. **Cliente**: depois que a fila sincronizou, chame `recalcular` ao finalizar/apagar sessão, marcar/desmarcar ficha e salvar peso/meta (com *debounce*). O resumo mostra a prévia e, ao receber a resposta, "✓ Pontos confirmados" ou a diferença com o motivo (Pontuação US-01). O card do placar no Início usa o placar oficial quando existir (com a prévia como reserva offline).
>
> ### Testes
> - pgTAP: cliente não insere/altera/apaga `pontos_eventos` nem `placar` (CT-04); `fn_ranking` não expõe peso nem dados de sessão; `anon` não executa; `substituir_pontos` negado para `authenticated`.
> - Unitários: idempotência (CT-03: duas execuções → mesmos eventos), limites (CT-06), golden v2.
> - Integração (Supabase local): finalizar sessão → evento aparece; apagar sessão → pontos somem (CT-05); duas chamadas simultâneas → sem duplicação; cron com segredo errado → 401.
>
> ### Critérios de aceite
> - INV-03 e INV-04 provados.
> - Placar oficial do Arthur em produção (depois do merge e do primeiro cron ou recálculo) igual à prévia do app, salvo os limites reportados.
> - `npm run check`, `test:e2e` e `test:db` verdes.
>
> ### Fora do escopo
> Telas de ranking e cartão (S12); botão "Recalcular todos" na administração (S13); competições (S18).
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Pontuacao.md` (estado → ✅ servidor; §5 real; tabela de limites em §8), `Modelo-de-Dados.md` (tabelas e funções reais, nota de migração), `Funcionalidade-Ranking-e-Competicao.md` §5 (contrato real de `fn_ranking`), `docs/claude/Auth-e-API.md` (rotas novas, cron), `CLAUDE.md` (1 linha), `Decisoes.md` (REGRA_VERSAO 2 e o efeito no histórico), `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(pontos): cálculo oficial no servidor, cron e limites (S11)`, push, PR. Resposta ao Arthur: o que muda nos pontos dele (se mudar) e por quê, em 2–3 linhas.
