# Sessão 07 — Biblioteca compartilhada e conta nova vazia

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S06 · **Marco:** M1

> **Por que Sonnet:** composição de telas sobre padrões consolidados (abas, cards, folhas da jornada) e um contrato fechado de cópia (US-04/US-05 de `Funcionalidade-Biblioteca.md`) que grava pelo store da S06. O seed é transcrição dos JSON de `seed/` para SQL. A invariante crítica (cópia independente) está escrita como CT.

## Antes de abrir a sessão (Arthur)

Nada.

## Prompt

> Você está implementando a **Sessão 07 do GymApp — biblioteca compartilhada e conta nova vazia**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Biblioteca.md` (inteira: US-02 a US-06, CT-01 a CT-05, RN-01 a RN-04, §5); `docs/wiki/Modelo-de-Dados.md` §2 (`biblioteca_*`, `origem`, `origem_versao`) e §6 (ids da biblioteca); `docs/wiki/Decisoes.md` ADR-003 e ADR-007; skills `persistencia-dados` e `banco-e-rls`.
>
> ### Estado atual
> Cada pessoa tem seus dados na nuvem com fila offline (S06). As tabelas `biblioteca_treinos` e `biblioteca_programas` existem (S04), mas estão vazias. A aba "Treinos" da biblioteca (`#biblioteca/treinos`, `vBib`) lista os **treinos da própria conta**. Conta nova abre um Início vazio e confuso. Os programas do Arthur estão em `seed/seed.json` (academia A/B) e `seed/calistenia.json` (Calistenia em casa).
>
> ### Objetivo
> Conta nova começa vazia e é guiada até a biblioteca; todos veem os programas e treinos publicados; "Usar este programa" copia para a conta e a pessoa já pode treinar.
>
> ### Escopo
> 1. **Seed da biblioteca**: `scripts/seed-biblioteca.mjs` lê `seed/*.json` e gera a migration `…_seed_biblioteca.sql` (`insert … on conflict (id) do nothing`) com `academia-a`, `academia-b`, `cal-a`, `cal-b` (treinos) e `full-body-ab`, `calistenia-em-casa` (programas, com orientações, aeróbico, indicadores, `programa` com fases e caminhada), todos `publicado=true`, `versao=1`. Sem dados pessoais (`fichas`, `semana`). Confira o resultado contra `data/conjuntos/*.json` e `data/treinos/*.json` (devem bater, exceto ids e campos pessoais).
> 2. **Leitura** `src/dados/biblioteca.js` (§5 da página): `listarProgramas()`, `listarTreinos()`, `programa(id)`, `treino(id)`, com cache em memória e em `localStorage` (`mt3d.bib`) para abrir offline.
> 3. **Telas**: abas da biblioteca **Exercícios 3D** (`#biblioteca`, o menu atual) · **Programas** (`#biblioteca/programas`) · **Treinos** (`#biblioteca/treinos`, agora os da biblioteca); detalhe `#biblioteca/programa/<id>` e `#biblioteca/treino/<id>` (US-02), com chip 3D por exercício e tag de equipamento (reaproveite `eqResumoTag`, `eqTag`). A lista de treinos da conta (antigo `vBib`) passa para **`#meus-treinos`** (US-06), acessível pelo Início.
> 4. **Copiar** (US-04, US-05): `usarPrograma(prog)` e `adicionarTreino(treinoBib, conjuntoId)` com ids novos (`uid`), `origem`/`origem_versao`, dias do programa, letra livre **por conta** (`proximaLetra` sobre os treinos do usuário); folha "Você já usa este programa" (Abrir o meu / Criar outra cópia " (2)"). Tudo por `put()` do store (funciona offline). Para guardar `origem`/`origem_versao`, o store envia as colunas extras junto com o documento (ajuste o adaptador `nuvem` se preciso, sem mudar a interface das telas).
> 5. **Conta nova vazia** (US-03): sem conjuntos, o Início mostra o card de boas-vindas (Escolher um programa / Montar meu treino), o card da Biblioteca 3D e o texto de privacidade. Placar, histórico e "Próximo treino" ficam escondidos até a primeira sessão concluída. O placar mostra "Faça seu primeiro treino para entrar no ranking". "Montar meu treino" cria um conjunto vazio e abre "Adicionar treino".
>
> ### Testes
> - e2e (Supabase local, migration de seed aplicada): CT-04 (conta nova: nenhum conjunto automático, boas-vindas visíveis); conta nova → Programas → "Calistenia em casa" → Usar → conjunto com A/B e dias → começar sessão do A → concluir 1 série; CT-05 (usar duas vezes); CT-01 e CT-02 (administrador altera e despublica o modelo no banco pelo `service_role` no teste → a cópia continua igual e utilizável); CT-03 (item com `exId` inexistente vira exercício livre, sem erro de JS).
> - pgTAP: participante lê só `publicado`; não escreve.
> - e2e anteriores verdes.
>
> ### Critérios de aceite
> - No preview: conta nova vê só a biblioteca, escolhe um programa e treina em menos de 1 minuto de toques.
> - A biblioteca abre sem internet depois da primeira visita.
> - `npm run check`, `test:e2e` e `test:db` verdes; 390×844 claro/escuro sem rolagem horizontal.
>
> ### Fora do escopo
> Importar o histórico do Arthur (S08); editar, publicar ou despublicar pela interface e aviso de versão nova (S14); a biblioteca 3D sem login (ADR-014).
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Biblioteca.md` (estado → ✅ US-02..06; rotas reais), `Funcionalidade-Treinos-e-Sessao.md` §8 (Início vazio, `#meus-treinos`), `Modelo-de-Dados.md` (seed), `CLAUDE.md` (1 linha), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(biblioteca): programas e treinos compartilhados, conta nova vazia (S07)`, push, PR. Resposta ao Arthur: como testar com uma conta nova no preview.
