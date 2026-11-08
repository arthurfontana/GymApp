# Sessão 16 — Auditoria de segurança e privacidade antes de convidar

**Modelo:** `Fable 5.1` (`claude-fable-5-1`) · **Depende de:** S14 e S15 · **Marco:** M4

> **Por que Fable 5.1 (topo vigente):** é uma revisão **adversarial e transversal**. Ela cruza RLS, funções `security definer`, rotas `/api`, tokens, headers, renderização por `innerHTML`, service worker, logs e workflows, procurando o caminho que ninguém testou. Um furo aqui expõe dado de saúde de **todos** os participantes logo quando o app abre para fora. É a única sessão do plano em que vale pagar cerca de 2,5× o preço do Opus 5.5. Sem acesso ao Fable 5.1, use Opus 5.5 com raciocínio no máximo.

## Antes de abrir a sessão (Arthur)

Responda a pergunta **P5** do roadmap (quantas pessoas no início). Não convide ninguém de fora antes desta sessão terminar.

## Prompt

> Você está executando a **Sessão 16 do GymApp — auditoria de segurança e privacidade antes de abrir para outras pessoas**.
>
> **Leia antes de começar:** `docs/wiki/Arquitetura.md` §6 e §7; `docs/wiki/Modelo-de-Dados.md` §3 e §5; `docs/wiki/Decisoes.md` ADR-004, ADR-005, ADR-010, ADR-013; `docs/claude/Auth-e-API.md` e `docs/claude/Banco-e-RLS.md`; as skills `banco-e-rls` e `persistencia-dados`. Depois, leia o código **pela superfície de ataque**: `supabase/migrations/`, `api/`, `src/dados/`, `src/auth/`, `vercel.json`, a configuração do PWA, `.github/workflows/`.
>
> ### Estado atual
> App completo (S01–S15): login por convite, dados por usuário com fila offline, biblioteca compartilhada, pontos no servidor, ranking, administração, privacidade. Só o Arthur e contas de teste usam.
>
> ### Objetivo
> Um relatório com cada risco encontrado (gravidade, prova, correção), as correções pequenas aplicadas com teste e o "pronto para convidar" assinado, ou a lista do que impede.
>
> ### Escopo (checklist mínimo; vá além do que estiver aqui)
> 1. **Banco**: toda tabela com RLS e sem política permissiva demais (`using (true)`); funções `security definer` com `search_path` fixo, sem SQL dinâmico injetável e com `grant execute` mínimo; `fn_ranking`/`fn_cartao` não vazam campos privados nem perfis inativos; triggers de `perfis` sem desvio; `anon` sem acesso; `service_role` só no servidor; visões ou funções novas desde a S04 cobertas por pgTAP.
> 2. **API**: toda rota valida o JWT do jeito certo (`getUser`, não só decodificar); `requireAdmin` em todas as de administrador; entrada validada (tamanhos, tipos, códigos); limite de frequência em aceitar convite, redefinir senha e recalcular; o código de inicialização de administrador para de funcionar de fato depois do primeiro administrador; cron só com `CRON_SECRET`; mensagens de erro sem detalhes internos; condições de corrida (convite aceito duas vezes ao mesmo tempo).
> 3. **Cliente**: todo dado de outro usuário escapado (`esc`) em toda tela (procure `innerHTML` com interpolação); CSP efetiva sem `unsafe-eval`; nenhuma chave secreta no bundle (`grep` no `dist/`); service worker não guarda resposta de `/api` nem dado de outro usuário; ao Sair, os dados locais são apagados; troca de usuário no mesmo aparelho não mistura IndexedDB.
> 4. **Segredos e repositório público**: varrer o histórico do git por chaves (`git log -p | grep -iE 'service_role|secret|eyJhbGci'`), logs dos workflows sem segredos, convites ou links; `.env*` no `.gitignore`.
> 5. **Carga leve**: script `scripts/carga.mjs` (contra o Supabase local) simulando o número de pessoas de P5 × 3 treinos/semana × 12 semanas → tempo do `recalcular`, do `fn_ranking` e do cron dentro de limites razoáveis (ex.: `recalcular` < 2 s, ranking < 300 ms); índices que faltarem.
> 6. **Correções**: aplique as **pequenas**, cada uma com teste. Riscos que pedem trabalho maior viram sessões novas no fim do roadmap (S19+), com prompt no padrão.
>
> ### Testes
> Cada correção tem teste (pgTAP, unitário ou e2e) que falha antes e passa depois. Toda a suíte verde no fim.
>
> ### Critérios de aceite
> - `docs/wiki/Sessoes/S16-relatorio.md`: tabela risco → gravidade (alta/média/baixa) → evidência → status (corrigido com PR/teste, aceito com justificativa, nova sessão).
> - Nenhum risco **alto** em aberto.
> - `npm run check`, `test:e2e` e `test:db` verdes.
>
> ### Fora do escopo
> Pentest externo, WAF, auditoria formal LGPD por advogado.
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Arquitetura.md` §6 (o que mudou), `Modelo-de-Dados.md` (índices e políticas novas), `Decisoes.md` (riscos aceitos como ADR), `Roadmap-e-Sessoes.md` (status + sessões novas, se houver), relatório da sessão.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. Não teste contra a produção. **Se encontrar algo que exija decisão de produto ou de arquitetura, pare e pergunte.**
>
> ### Encerramento
> Commit `security: auditoria antes de convidar (S16)`, push, PR. Resposta ao Arthur: "pode convidar" ou "ainda não, por causa de X", em até 5 linhas.
