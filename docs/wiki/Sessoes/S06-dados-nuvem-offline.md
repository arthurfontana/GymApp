# Sessão 06 — Dados na nuvem e fila offline

**Modelo:** `Opus 5.5` (`claude-opus-5-5`) · **Depende de:** S05 · **Marco:** M1

> **Por que Opus:** o modo de falha desta sessão é **perder o treino do usuário**: série que some quando o app fecha sem sinal, gravação de um aparelho que apaga a do outro, fila que descarta um item depois de um 403. É persistência, concorrência e mesclagem com casos de borda que não aparecem em teste manual. É o perfil "perda de trabalho do usuário" do critério de modelos.

## Antes de abrir a sessão (Arthur)

Nada (as migrations novas entram no dev pelo `db-deploy` após o merge; o prod pede a sua aprovação).

## Prompt

> Você está implementando a **Sessão 06 do GymApp — dados na nuvem com fila offline**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Treinos-e-Sessao.md` §2–§5 (US-01 a US-03, CT-01 a CT-04, RN-01 a RN-05); `docs/wiki/Modelo-de-Dados.md` §2 (`conjuntos`, `treinos`, `sessoes`, `rev`) e §5 (INV-01, INV-05); `docs/wiki/Decisoes.md` ADR-006 e ADR-008; `docs/claude/Banco-e-RLS.md` e a skill `banco-e-rls`; em `src/jornada/treino.js`, as regiões `armazenamento` e `estado` (`grep -n "#region:" src/jornada/treino.js`).
>
> ### Estado atual
> Login e perfil na nuvem (S05). Os dados de treino ainda passam pelo store do v21 em `src/jornada/treino.js`: `put(col,id,data)`/`del(col,id)` com fila **em memória** por documento (`wq`, `flush`), `initStore()` com o modo `db` (Artifact, snapshots `onSnapshot`) ou `local` (localStorage `mt3d.*`). As telas leem `S.conjuntos`, `S.treinos`, `S.sessoes`.
>
> ### Objetivo
> Conjuntos, treinos e sessões de cada pessoa ficam na nuvem, em qualquer aparelho. A sessão funciona inteira sem internet e **nenhuma série se perde**, nem offline nem com dois aparelhos.
>
> ### Escopo
> 1. **Extrair o store** para `src/dados/store.js`, mantendo **a mesma interface** para as telas (`S`, `put`, `del`, `schedule`, `S.mode`, `S.saveErr`, `S.note`) e escolhendo o adaptador: `nuvem` (Supabase + usuário logado), `local` (sem Supabase ou `?modo=local`; usado pelos e2e antigos) e `artifact` (`window.claude.use('db')`; manter até a S09, porque o build do Artifact usa). `treino.js` passa a importar do store, sem lógica de armazenamento própria.
> 2. **Fila persistente** `src/dados/fila.js` (IndexedDB `mt3d-<userId>`, stores `fila` e `cache`; fallback localStorage): item `{chave:'col/id', op:'set'|'del', dados, rev, tentativas}`; junta edições do mesmo documento; envia um documento por vez, em ordem; **só remove depois da confirmação**; espera crescente (1 s → 60 s) e reação a `online`/`visibilitychange`; `401` → renova a sessão e tenta de novo; `400/403` → marca erro, **mantém o item** e mostra "Erro ao salvar — tentar de novo". Nunca descarte dado em silêncio.
> 3. **Gravação com revisão**: migration com a RPC `gravar_doc(col text, id text, dados jsonb, rev_esperada bigint)` (`security invoker`, respeita a RLS) que grava se `rev` bater e devolve conflito com o documento atual se não bater. Mesclagem no cliente (US-03): **sessão** = união das séries por item (`uid`) e por instante (`sets[].t`), sem duplicar, os demais campos da versão mais nova, e sessão concluída nunca reabre (RN-03); **treino/conjunto** = a mais nova vence + aviso. Decida os detalhes (inclusive exclusão × edição concorrente) e registre como DEC.
> 4. **Carga e sincronização**: abrir o app = cache local na hora + busca em segundo plano (`select … where atualizado_em > ultimo`); ao voltar à aba, busca de novo. Indicador de sincronização (Treinos e Sessão US-01) na barra da sessão e no topo do Início. Sair com a fila pendente avisa (US-02).
> 5. **Contas novas**: a rotina `migrar()` **não roda** no modo `nuvem` (só no `artifact`/`local`, para não criar o conjunto "academia" para ninguém). `pesoCorp` da sessão vem do perfil da S05.
>
> ### Testes
> - **Unitários** (vitest + `fake-indexeddb`): fila coalesce (CT-03); recarregar no meio do envio reenvia uma vez só (CT-04); `403` mantém o item; espera crescente; mesclagem de sessão (CT-02, incluindo séries com o mesmo `t`, item removido num lado e sessão concluída num lado e editada no outro).
> - **e2e** (Supabase local): login → criar treino → começar sessão → `context.setOffline(true)` → concluir 3 séries → recarregar offline (as séries continuam) → online → conferir no banco (CT-01). Dois contextos do mesmo usuário gravando a mesma sessão (CT-02). A RLS continua barrando outro usuário (repita um caso da S04 pela API).
> - e2e antigos (modo `local`) verdes.
>
> ### Critérios de aceite
> - INV-05 provado pelos testes acima; nenhum caminho de código remove item da fila sem confirmação.
> - No preview: o Arthur cria um treino no celular, abre no computador e vê o mesmo; treina com o modo avião ligado e, ao desligar, tudo sincroniza.
> - `npm run check`, `test:e2e` e `test:db` verdes; o build do Artifact continua funcionando (adaptador `artifact`).
>
> ### Fora do escopo
> Biblioteca compartilhada, conta vazia e adotar programa (S07); importação do Arthur (S08); pontos no servidor (S11).
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Treinos-e-Sessao.md` (estado → ✅ US-01..03; §5 com o desenho real da fila e da RPC), `Modelo-de-Dados.md` (RPC `gravar_doc`, nota de migração), `docs/claude/Dados-e-Sincronizacao.md` (novo: interface do store, adaptadores, fila, mesclagem, como testar offline), **skill de projeto** `.claude/skills/persistencia-dados/SKILL.md` (G4: "Use SEMPRE que criar ou alterar estado salvo do usuário, `put`/`del`, `src/dados/store.js`, `fila.js` ou campos de conjunto/treino/sessão…", com o checklist: passa pelo store, entra na mesclagem, tem teste offline), `CLAUDE.md` (regra inviolável: "toda escrita de dados do usuário passa por `src/dados/store.js`; nenhuma série pode se perder"), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(dados): store na nuvem com fila offline e mesclagem (S06)`, push, PR. Resposta ao Arthur: como testar no celular (modo avião) e o que ele deve ver no indicador.
