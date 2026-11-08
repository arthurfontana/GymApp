# Sessão 05 — Login por convite e perfil

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S04 · **Marco:** M1

> **Por que Sonnet:** transcrição de um contrato fechado (US, catálogo de erros e endpoints de `Funcionalidade-Contas-e-Perfil.md`) usando o SDK do Supabase, que já resolve sessão, refresh e senha. A parte delicada (compensação no cadastro, código de inicialização) está especificada passo a passo. Na dúvida, a válvula de escape vale.

## Antes de abrir a sessão (Arthur)

[Preparação de Contas](Preparacao-de-Contas) **P4** (variáveis na Vercel, inclusive `ADMIN_BOOTSTRAP_CODE`). Resposta da pergunta **P1** (login por convite + senha) e **P3** (biblioteca sem login?).

## Prompt

> Você está implementando a **Sessão 05 do GymApp — login por convite e perfil**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Contas-e-Perfil.md` (inteira; esta sessão implementa US-01 a US-06 e US-08; a US-07 só no lado do cliente, porque o link é gerado na S13); `docs/wiki/Modelo-de-Dados.md` §2 (`perfis`, `perfis_privados`, `convites`); `docs/wiki/Decisoes.md` ADR-005, ADR-010, ADR-014; `docs/claude/Banco-e-RLS.md`; skill `banco-e-rls`.
>
> ### Estado atual
> Schema e RLS no Supabase (S04). O app (Vite/Vercel) ainda não tem login e guarda os dados no aparelho (modo `local`). O perfil do v21 (apelido, peso, meta) mora em `S.config.perfil` (`config/programa`), editado pela folha `sheetPerfil` em `src/jornada/pontos.js`.
>
> ### Objetivo
> Só entra quem tem convite: o Arthur cria a conta de administrador pelo código de inicialização, uma pessoa convidada cria a dela pelo link, as duas entram e saem, e o perfil (apelido, cor, peso, meta, ranking) fica salvo na nuvem.
>
> ### Escopo
> 1. **Cliente Supabase** `src/dados/supabase.js` (um só, opções de `Funcionalidade-Contas-e-Perfil.md` §5) e `src/dados/perfil.js` (`carregarPerfil()`, `salvarPerfil(parcial)` em `perfis` + `perfis_privados`). Sem `VITE_SUPABASE_URL`, o app continua no modo `local`, sem login (para testes e previews sem backend).
> 2. **Função `api/convites/aceitar.js`** (Node, Vercel) exatamente como o §5: valida o código (convite normal **ou** `ADMIN_BOOTSTRAP_CODE` enquanto não existe administrador → `papel='admin'`), cria o usuário confirmado, cria `perfis` + `perfis_privados` (`aceite_termos_em`), marca o convite e **compensa** em caso de falha (CT-03). Limite de tentativas. Erros do catálogo §5.4 (`{erro:'CODIGO', mensagem}`). `api/_lib/` com `supabaseAdmin()`, `usuarioDoToken(req)`, `requireAdmin(req)` (o `requireAdmin` já fica pronto para a S13).
> 3. **Telas** em `src/auth/`: Entrar, Convite (`#convite/<codigo>`), Primeiro acesso, Trocar senha (com `trocar_senha` obrigatório), Esqueci a senha (texto orientando a pedir ao administrador), Redefinir senha (`#senha/<codigo>`, que só funciona depois da S13: mostre "link inválido" com elegância até lá). **Guarda de rotas** (US-03) no roteador de `src/jornada/treino.js`: sem sessão → Entrar, voltando depois à rota pedida.
> 4. **Perfil** `#perfil` (US-05) no lugar da folha "Perfil" da página Minha jornada: apelido (único, `APELIDO_EXISTE`), cor (6 opções), peso, meta (chips 1–7), "Aparecer no ranking", Trocar senha, Sair. **A pontuação passa a ler o perfil novo**: adapte a função `perfil()` de `pontos.js` para ler do perfil carregado (com o mesmo padrão: 75 kg, meta 2). `config/programa` deixa de ser usado no modo nuvem.
> 5. **Papel e administração mínima**: entrada "Administração" visível só para `admin`. Rotas `#admin*` voltam ao Início para participantes. Nesta sessão, `#admin` tem **só** o botão "Gerar convite" (apelido sugerido opcional) → `POST /api/convites` (`requireAdmin`, código aleatório ≥ 16 caracteres, 7 dias) → mostra o link com **Compartilhar** (`navigator.share`) e **Copiar** (Administração US-01, parte de gerar). Lista, revogação e usuários ficam para a S13.
>
> ### Testes
> - **e2e contra o Supabase local** (o `supabase start` do CI; na sessão, Docker se disponível): gerar convite como administrador e como participante (403), CT-01 (convite de uso único), CT-02 (e-mail existente não consome convite), CT-04 (participante → 403 e trigger de papel), CT-05 (conta desativada não entra: desative pelo `service_role` no teste), código de inicialização (funciona com zero administradores e falha com um), sessão persiste ao recarregar, guarda de rotas.
> - **Unitários** (vitest) da função `aceitar` com o Supabase simulado: compensação (CT-03) e cada erro do catálogo.
> - e2e anteriores verdes no modo `local`.
>
> ### Critérios de aceite
> - No preview: o Arthur abre `#convite/<ADMIN_BOOTSTRAP_CODE>`, cria a conta e vira administrador; toca "Gerar convite", manda o link para um segundo aparelho e uma segunda conta entra por ele.
> - Fechar e abrir o app não pede login; Sair volta para Entrar.
> - Peso e meta salvos na nuvem e usados na pontuação; apelido único.
> - 390×844 claro e escuro, sem rolagem horizontal; `npm run check`, `test:e2e` e `test:db` verdes.
>
> ### Fora do escopo
> Treinos e sessões na nuvem (S06): nesta sessão, depois do login, os dados de treino **continuam no aparelho**. A tela mostra o aviso "Seus treinos ainda ficam neste aparelho". Lista e revogação de convites, usuários e links de senha (S13). Termos definitivos (S15): use um texto provisório com link.
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Contas-e-Perfil.md` (estado → ✅ US-01..06/08; ajustes reais nas telas e no catálogo), `Modelo-de-Dados.md` (se mudou), `docs/claude/` (novo `Auth-e-API.md`: como as funções `/api` validam token e papel, como testar), `CLAUDE.md` (1 linha), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. A chave `service_role` só existe em `api/` e nunca em `VITE_*`. Todo texto vindo de usuário passa por `esc()`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(auth): login por convite, primeiro acesso e perfil (S05)`, push, PR. Resposta ao Arthur: como criar a conta de administrador no preview e, depois do merge, na produção.
