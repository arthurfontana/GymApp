# Sessão 13 — Administração: convites e usuários

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S12 · **Marco:** M4

> **Por que Sonnet:** CRUD de administração sobre contratos fechados (US e CTs de `Funcionalidade-Administracao.md`) com o SDK de administração do Supabase (`auth.admin.*`) e o `requireAdmin` pronto desde a S05. A segurança das rotas tem CT próprio, e a S16 audita tudo depois.

## Antes de abrir a sessão (Arthur)

Nada.

## Prompt

> Você está implementando a **Sessão 13 do GymApp — administração de convites e usuários**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Administracao.md` (US-01, US-02, US-05; CT-01, CT-02, CT-04; RN-01, RN-02, RN-04; §5); `docs/wiki/Funcionalidade-Contas-e-Perfil.md` US-07 e RN-04/RN-06 e o catálogo §5.4; `docs/wiki/Modelo-de-Dados.md` (`convites` com `tipo`); `docs/claude/Auth-e-API.md`; skill `banco-e-rls`.
>
> ### Estado atual
> O administrador já gera um convite em `#admin` (S05). Não há lista de convites, gestão de usuários nem link de redefinição de senha. A tela `#senha/<codigo>` existe, mas sempre diz "link inválido" (S05).
>
> ### Objetivo
> O Arthur cuida dos acessos pelo celular: vê e revoga convites, vê os participantes, desativa e reativa, tira do ranking, gera link de redefinição de senha e recalcula os pontos.
>
> ### Escopo
> 1. **`api/convites/index.js`**: `GET` (lista com status: pendente/usado/vencido/revogado), `POST` (já existe, mantenha), `DELETE ?codigo=` (revoga). `requireAdmin`.
> 2. **`api/admin/usuarios.js`**: `GET` (apelido, e-mail via `auth.admin.listUsers`, papel, ativo, no_ranking, membro desde, último treino, XP do placar), `POST {acao, userId}` com `desativar` (ban no Auth + `perfis.ativo=false` + recálculo), `reativar`, `ocultar`/`mostrar` (`no_ranking`), `link-senha` (cria `convites` com `tipo='senha'`, `para_user`, 24 h, e devolve o link), `recalcular`. RN-02: não pode agir sobre si mesmo para desativar ou rebaixar.
> 3. **`api/senha/redefinir.js`**: `POST {codigo, novaSenha}` → valida o link (`tipo='senha'`, não usado, não vencido) → `auth.admin.updateUserById(para_user, {password})` → marca usado → `trocar_senha=false`. A tela `#senha/<codigo>` passa a funcionar e entra direto em seguida (US-07 de Contas).
> 4. **Telas** `src/admin/`: `#admin` (painel: convites pendentes, total de participantes, atalhos), `#admin/convites` (lista + Novo + Compartilhar/Copiar + Revogar), `#admin/usuarios` (busca, cards, menu "⋯" com as ações e `confirmSheet`, ações perigosas em vermelho), botão "Recalcular pontos de todos" com progresso (US-05). E-mails só aqui (RN-04).
>
> ### Testes
> - e2e (Supabase local): CT-01 (revogar), CT-02 (desativar → não entra e some do ranking → reativar → dados intactos), CT-04 (participante → 403 em todas as rotas e `#admin` volta ao Início), link de senha de ponta a ponta (gera → abre → nova senha → entra; link reutilizado → erro; vencido → erro), administrador não se desativa.
> - Unitários das funções (Supabase simulado): cada erro do catálogo.
>
> ### Critérios de aceite
> - No preview, o Arthur convida, revoga, desativa, reativa e redefine a senha de uma conta de teste, tudo pelo celular.
> - Nenhuma rota de administrador responde a participante (403) nem a anônimo (401).
> - `npm run check`, `test:e2e` e `test:db` verdes.
>
> ### Fora do escopo
> Editor da biblioteca (S14); excluir conta e exportar dados (S15); competições (S18).
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Administracao.md` (estado → ✅ US-01, US-02, US-05), `Funcionalidade-Contas-e-Perfil.md` (US-07 → ✅), `Modelo-de-Dados.md` (se mudou), `docs/claude/Auth-e-API.md`, `CLAUDE.md` (1 linha), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. Links de convite e de senha **nunca** em log. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(admin): convites, usuários e redefinição de senha (S13)`, push, PR. Resposta ao Arthur: o que ele consegue fazer agora na Administração.
