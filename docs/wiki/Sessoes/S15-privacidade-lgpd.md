# Sessão 15 — Privacidade (LGPD)

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S13 · **Marco:** M4

> **Por que Sonnet:** funcionalidades bem delimitadas (texto dos termos, exportar JSON, excluir conta com cascata já definida no schema) sobre contratos existentes. A exclusão usa `on delete cascade` da S04 e o Auth admin. O teste confirma que nada sobra.

## Antes de abrir a sessão (Arthur)

Revise o texto dos termos que a sessão vai propor (ela pergunta antes de publicar).

## Prompt

> Você está implementando a **Sessão 15 do GymApp — privacidade (LGPD)**.
>
> **Leia antes de começar:** `docs/wiki/Decisoes.md` ADR-010; `docs/wiki/Funcionalidade-Contas-e-Perfil.md` (RN-02, US-01 aceite, US-05 perfil, §6); `docs/wiki/Modelo-de-Dados.md` §2 (cascatas) e §5 (INV-02); `docs/claude/Auth-e-API.md`.
>
> ### Estado atual
> O cadastro já grava `aceite_termos_em` com um texto provisório (S05). Não há como baixar os próprios dados nem excluir a conta. A opção "Aparecer no ranking" existe (S05/S12).
>
> ### Objetivo
> A pessoa sabe o que é coletado e quem vê o quê, baixa todos os seus dados e consegue excluir a conta de vez.
>
> ### Escopo
> 1. **Termos e privacidade** (`#termos`, sem login; linkados no cadastro e no Perfil): texto curto e claro em pt-BR. O que é coletado (e-mail, apelido, peso, meta, treinos, séries, marcações); para quê (registrar treinos, calcular pontos, calorias e ranking); **o que os outros veem** (só apelido, cor, nível, liga, pontos, sequência, treinos na semana e conquistas); onde fica (Supabase, região São Paulo; Vercel); por quanto tempo (até excluir a conta); direitos (baixar, corrigir no Perfil, excluir); contato (o administrador). **Mostre o texto ao Arthur e espere a aprovação antes do commit final.** Versão dos termos (`TERMOS_VERSAO`): se mudar, o app pede novo aceite.
> 2. **Baixar meus dados** (Perfil): gera no aparelho um `meu-treino-3d-<data>.json` com perfil, perfil privado, conjuntos, treinos, sessões e eventos de pontos da pessoa (tudo via RLS, com o token dela). Funciona com a cópia local se estiver offline, avisando que pode estar incompleto.
> 3. **Excluir minha conta** (Perfil): folha com consequências claras, digitar "EXCLUIR" para confirmar → `POST /api/conta/excluir` (JWT) → `auth.admin.deleteUser` (cascata apaga perfis, dados e pontos) → limpa IndexedDB/localStorage do usuário → tela "Conta excluída". O administrador não pode se excluir se for o único (mensagem).
> 4. **Revisão de exposição**: confira que logs das funções `/api` não registram e-mail, peso nem conteúdo de sessão, só ids e contagens.
>
> ### Testes
> - e2e (Supabase local): exportar contém só dados da pessoa (crie dados de outro usuário e confirme que não aparecem); excluir → login falha → linhas da pessoa somem de todas as tabelas (consulta com `service_role` no teste) → ranking sem ela; único administrador não se exclui; termos acessíveis sem login; mudança de `TERMOS_VERSAO` pede novo aceite.
>
> ### Critérios de aceite
> - Texto dos termos aprovado pelo Arthur.
> - Exclusão sem sobras (provado por teste).
> - `npm run check`, `test:e2e` e `test:db` verdes.
>
> ### Fora do escopo
> DPO formal, cookies de terceiros (não usamos), anonimização estatística, exportação em outros formatos.
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Contas-e-Perfil.md` (US novas: termos, exportar, excluir; com CTs), `Visao-e-Escopo.md` R5 (se mudou), `Modelo-de-Dados.md` (`TERMOS_VERSAO` se virar coluna), `CLAUDE.md` (1 linha), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(privacidade): termos, exportar dados e excluir conta (S15)`, push, PR. Resposta ao Arthur: o resumo do que os participantes veem e podem fazer.
