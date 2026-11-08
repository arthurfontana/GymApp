# Sessão 04 — Supabase: schema, RLS e testes de política

**Modelo:** `Opus 5.5` (`claude-opus-5-5`) · **Depende de:** S03 · **Marco:** M1

> **Por que Opus:** as regras de acesso são o que separa "meu histórico" de "histórico de todo mundo". Um furo de RLS **não dá erro**: só vaza dado de saúde em silêncio. Há também triggers que protegem papel e status, migrations que depois de publicadas não se reescrevem e um ambiente de teste local (Docker ou Postgres com shim) para montar.

## Antes de abrir a sessão (Arthur)

[Preparação de Contas](Preparacao-de-Contas) **P3** (dois projetos Supabase, cadastro público desligado) e **P5** (secrets do GitHub e environment `producao`).

## Prompt

> Você está implementando a **Sessão 04 do GymApp — schema do Supabase, RLS e testes de política**.
>
> **Leia antes de começar:** `docs/wiki/Modelo-de-Dados.md` (inteiro: §2 tabelas, §3 RLS, §5 invariantes); `docs/wiki/Decisoes.md` ADR-001, ADR-006, ADR-010, ADR-013; `docs/wiki/Funcionalidade-Contas-e-Perfil.md` §4 (RN-01 a RN-06); `docs/wiki/Funcionalidade-Biblioteca.md` §4; `docs/wiki/Arquitetura.md` §4–§6.
>
> ### Estado atual
> App em Vite na Vercel (S03), dados só no aparelho (modo `local`). Nenhum backend. Os projetos `gymapp-dev` e `gymapp-prod` existem e estão vazios; os secrets do GitHub estão configurados.
>
> ### Objetivo
> O banco do app existe (dev e, com aprovação, prod) com RLS em toda tabela, e uma suíte de testes **prova** que cada pessoa só vê e grava o que é dela, que a biblioteca é só leitura para participantes e que ninguém se promove a administrador.
>
> ### Escopo
> 1. **Supabase CLI no projeto**: `supabase init` (`supabase/config.toml`; Auth com signup desligado e confirmação de e-mail desligada no local). Scripts npm: `db:start`, `db:stop`, `db:reset`, `test:db` (`supabase test db`) e `test:db:local` (item 4).
> 2. **Migrations** em `supabase/migrations/` (uma por assunto, nome `AAAAMMDDHHMMSS_descricao.sql`): base (trigger `atualizado_em`); `perfis` + `perfis_privados` + `is_admin()` + trigger `proteger_perfil` (papel e ativo só para administrador ou `service_role`); `convites`; `biblioteca_treinos` + `biblioteca_programas`; `conjuntos`, `treinos`, `sessoes` (PK `(user_id,id)`, `rev`, `origem`, `origem_versao`; em `sessoes`, trigger que **deriva** `status`, `inicio` e `fim` de `dados` para manter uma fonte só). **Ainda não**: `pontos_eventos`, `placar`, `fn_ranking` (S11); RPC de gravação com revisão (S06).
> 3. **RLS** exatamente como a matriz de `Modelo-de-Dados.md` §3: `enable row level security` em tudo, `revoke all … from anon`, grants mínimos para `authenticated`, políticas `using`/`with check` com `auth.uid()`. Funções `security definer` com `set search_path = public`.
> 4. **Testes pgTAP** em `supabase/tests/`: helper próprio (sem dependência nova) que cria usuários em `auth.users` e simula a sessão (`set local role authenticated; set local request.jwt.claims = '{"sub":"…","role":"authenticated"}'`). Cobrir: dono lê/grava o próprio dado; **A não lê nem grava nada de B** (conjuntos, treinos, sessoes, perfis_privados) — CT-06 de Contas e INV-01/INV-02; `anon` não lê nada; participante não muda `papel`/`ativo` (CT-04 de Contas); participante lê só biblioteca publicada e não escreve; administrador lê rascunhos e escreve; convites só para administrador; trigger de `sessoes` deriva `status`/`fim`. **Ambiente local** (nesta ordem): (a) `dockerd &` e `npx supabase start`; (b) se as imagens não baixarem por causa da rede, Postgres 16 local (`/usr/lib/postgresql/16/bin`) com `supabase/tests/_shim/` (esquema `auth`, papéis `anon`/`authenticated`/`service_role`, `auth.uid()`, `auth.jwt()`) + pgTAP (`apt-get install postgresql-16-pgtap`, se disponível), pelo script `scripts/test-db-local.sh` (`npm run test:db:local`); (c) o CI é o juiz final.
> 5. **Workflows**: job `banco` no `ci.yml` (`supabase/setup-cli`, `supabase start`, `supabase test db`); `.github/workflows/db-deploy.yml` em push na `main` que toque `supabase/migrations/**`: job `dev` (`supabase link --project-ref $SUPABASE_PROJECT_REF_DEV` + `supabase db push`) e depois job `prod` no environment `producao` (aprovação). Também `workflow_dispatch`, para aplicar no dev a partir de uma branch. **Nunca** imprima segredo no log.
>
> ### Testes
> Os listados no item 4, um teste por linha da matriz de RLS, mais os casos de borda: `user_id` diferente no `with check` (insert e update), update que tenta trocar o `user_id` de uma linha, delete de linha alheia, `select` sem login.
>
> ### Critérios de aceite
> - `npm run test:db` (ou `test:db:local`) e o job `banco` do CI verdes.
> - Cada linha da matriz de `Modelo-de-Dados.md` §3 tem pelo menos um teste positivo e um negativo.
> - `db-deploy.yml` validado (rodar `dev` por `workflow_dispatch` na branch; prod só após o merge, com aprovação do Arthur).
> - App sem mudança visível (ainda não usa o banco).
>
> ### Fora do escopo
> Login e telas (S05), store na nuvem e RPC de gravação (S06), biblioteca semeada (S07), pontos e ranking (S11).
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Modelo-de-Dados.md` (nomes reais de funções/políticas e qualquer ajuste; estado "✅ schema base"), `docs/claude/Banco-e-RLS.md` (novo: como rodar o banco local, o shim, como escrever um teste de política, como criar migration), `CLAUDE.md` (1 linha no mapa + regra inviolável: "toda tabela nova nasce com RLS + teste pgTAP"), `Decisoes.md`, `Roadmap-e-Sessoes.md`. **Crie a skill de projeto** `.claude/skills/banco-e-rls/SKILL.md` (G4: description "Use SEMPRE que criar ou alterar tabela, coluna, política RLS, função SQL ou migration em `supabase/`…", com o checklist mecânico de migration + RLS + teste + deploy).
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. Nada é escrito no prod a partir da sessão. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(db): schema, RLS e testes de política (S04)`, push, PR. Resposta ao Arthur: o que ele precisa aprovar (job `prod` do `db-deploy` após o merge) e onde ver.
