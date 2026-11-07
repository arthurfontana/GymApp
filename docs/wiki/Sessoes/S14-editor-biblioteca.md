# Sessão 14 — Editor da biblioteca pelo celular

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S13 · **Marco:** M4

> **Por que Sonnet:** reaproveita os editores de treino e de conjunto que já existem e grava nas tabelas `biblioteca_*`, que a RLS já limita ao administrador. As regras (limpar campos pessoais, versão, bloqueio de despublicar treino de programa publicado) estão escritas como RN e CT.

## Antes de abrir a sessão (Arthur)

Nada.

## Prompt

> Você está implementando a **Sessão 14 do GymApp — editor da biblioteca**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Administracao.md` (US-03, US-04, CT-03, RN-03); `docs/wiki/Funcionalidade-Biblioteca.md` (US-07, RN-02, RN-04, §5); `docs/wiki/Decisoes.md` ADR-007; skills `persistencia-dados` e `banco-e-rls`; em `src/jornada/treino.js`, `sheetTreino`, `sheetItem`, `sheetAdd` e `sheetConjunto`.
>
> ### Estado atual
> A biblioteca tem os 2 programas e 4 treinos do seed (S07), só editáveis por SQL. Os participantes copiam com `origem`/`origem_versao`. O administrador tem a área `#admin` (S13).
>
> ### Objetivo
> O Arthur evolui a biblioteca pelo celular: publica um treino ou conjunto dele como modelo, edita o que está publicado (versão nova), despublica e ordena. Quem usa um modelo fica sabendo quando há versão nova.
>
> ### Escopo
> 1. **Publicar a partir do meu** (Administração US-03): "Publicar na biblioteca" no treino e no conjunto do administrador → folha (id sugerido em slug, descrição, Publicar agora/Rascunho) → copia o documento limpando `fichas`, `semana` e `cargaInicial`; conjunto publica junto os treinos que ainda não estão na biblioteca e grava `dados.treinos` com os ids da biblioteca.
> 2. **`#admin/biblioteca`** (US-04): lista de programas e treinos (publicados e rascunhos), Editar (reaproveite os editores existentes trabalhando sobre o modelo; **não duplique** as folhas: parametrize o destino da gravação), Publicar/Despublicar, subir/descer (`ordem`), Apagar (só rascunho nunca publicado). Salvar um publicado → `versao + 1`. Despublicar treino de programa publicado → bloqueado com a mensagem do RN.
> 3. **`src/dados/biblioteca.js`**: `publicar`, `salvarModelo`, `despublicar`, `reordenar`, `apagarRascunho` (supabase-js com o token do administrador; a RLS garante). O cache da biblioteca (`mt3d.bib`) é invalidado ao salvar.
> 4. **Aviso de versão nova** (Biblioteca US-07): em conjuntos e treinos com `origem_versao < versao`, mostrar "Há uma versão nova…" com **Ver o que mudou** (diferença simples: exercícios adicionados, removidos, séries/faixa alteradas) e **Atualizar minha cópia** (troca os itens e mantém id, histórico e dias; atualiza `origem_versao`). "Agora não" esconde até a próxima versão.
>
> ### Testes
> - e2e (Supabase local): CT-03 (publicar limpa campos pessoais); publicar conjunto cria programa + treinos; editar publicado → `versao` 2 → participante vê o aviso → Atualizar → itens novos e sessões antigas intactas (`mesmoEx`); despublicar treino de programa publicado bloqueado; participante não vê rascunho e não escreve (pgTAP já cobre; repita um caso pela UI/API).
>
> ### Critérios de aceite
> - No preview, o Arthur monta um treino novo na conta dele, publica e uma conta de teste já encontra o treino na biblioteca.
> - Atualizar a cópia nunca perde histórico nem dias.
> - `npm run check`, `test:e2e` e `test:db` verdes.
>
> ### Fora do escopo
> Exercício 3D pelo celular (continua por briefing → Claude Code); participante sugerir treino.
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Administracao.md` (estado → ✅ US-03, US-04), `Funcionalidade-Biblioteca.md` (US-07 → ✅), `Modelo-de-Dados.md` (se mudou), `CLAUDE.md` (1 linha), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(admin): editor da biblioteca e aviso de versão nova (S14)`, push, PR. Resposta ao Arthur: como publicar um treino novo pelo celular, em 3 passos.
