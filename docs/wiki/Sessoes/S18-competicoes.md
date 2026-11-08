# Sessão 18 — Competições com período

**Modelo:** `Opus 5.5` (`claude-opus-5-5`) · **Depende de:** S16 · **Marco:** M5 (opcional)

> **Por que Opus:** tabelas e regras de acesso novas (quem participa vê a competição; quem não participa não vê a lista de participantes de uma competição fechada), funções `security definer` com período e fuso, e o encerramento com pódio. É de novo o perfil "RLS em que um furo vaza em silêncio" mais a matemática de borda de período.

## Antes de abrir a sessão (Arthur)

Pense numa primeira competição para testar (ex.: "Desafio de dezembro", 01/12 a 31/12, todos).

## Prompt

> Você está implementando a **Sessão 18 do GymApp — competições com período**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Ranking-e-Competicao.md` (US-05 e §5 Competições); `docs/wiki/Modelo-de-Dados.md` §3 e §5; `docs/wiki/Decisoes.md` ADR-004, ADR-009, ADR-010; skill `banco-e-rls`; `docs/wiki/Sessoes/S16-relatorio.md` (padrões de segurança adotados).
>
> ### Estado atual
> O ranking tem Liga, Semana e Geral sobre `pontos_eventos` (S11/S12). O administrador tem a área `#admin` (S13/S14).
>
> ### Objetivo
> O Arthur cria uma competição com começo, fim e participantes. Durante o período, todos os participantes acompanham um ranking só daquele período. No fim, aparece o pódio.
>
> ### Escopo
> 1. **Migrations**: `competicoes (id, nome, descricao, inicio date, fim date, todos boolean, criado_por, criado_em)`, `competicao_participantes (competicao_id, user_id)`; RLS: o administrador escreve; logados leem as competições em que participam (ou `todos`); `fn_ranking_competicao(id)` (`security definer`): soma de `pontos_eventos` com `t` entre `inicio 00:00` e `fim 23:59:59.999` em `America/Sao_Paulo`, só participantes ativos e `no_ranking`, campos públicos, empate = mesma posição.
> 2. **Administração** `#admin/competicoes`: criar/editar (antes de começar), encerrar antes da hora, participantes (todos ou lista de ativos).
> 3. **Ranking**: aba extra com o nome da competição enquanto estiver ativa (contagem regressiva, "faltam N dias"); depois do fim, pódio dos 3 primeiros por 7 dias e histórico de competições passadas no cartão do participante ("🥇 Desafio de dezembro").
> 4. **Início**: card "Desafio de dezembro · você é 2º · faltam 5 dias" para os participantes.
>
> ### Testes
> - pgTAP: quem não participa de uma competição fechada não a vê nem vê os participantes; participante não escreve; período respeita o fuso (evento 31/12 23:50 em São Paulo conta; 01/01 00:10 não).
> - e2e: criar, ver a aba, pódio após o fim (datas controladas), card no Início.
>
> ### Critérios de aceite
> - Ranking da competição = soma dos eventos no período (conferido em teste).
> - `npm run check`, `test:e2e` e `test:db` verdes.
>
> ### Fora do escopo
> Competição em equipes, inscrição pelos participantes, prêmios.
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Ranking-e-Competicao.md` (US-05 → ✅, contratos reais), `Funcionalidade-Administracao.md` (competições), `Modelo-de-Dados.md` (tabelas, RLS, função), `CLAUDE.md` (1 linha), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(ranking): competições com período e pódio (S18)`, push, PR. Resposta ao Arthur: como criar a primeira competição.
