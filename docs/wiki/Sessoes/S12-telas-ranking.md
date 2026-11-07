# Sessão 12 — Telas de ranking

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S11 · **Marco:** M3

> **Por que Sonnet:** composição de telas sobre um contrato pronto (`fn_ranking`, que já devolve tudo calculado e já filtra a privacidade) e sobre os padrões visuais da jornada (cards, chips, folhas, ícones de liga do v21). O cuidado novo (escapar o texto de outros usuários) está explícito como regra e CT.

## Antes de abrir a sessão (Arthur)

Ter pelo menos 2 contas com treinos no preview (a sua de teste + uma convidada) para ver a lista.

## Prompt

> Você está implementando a **Sessão 12 do GymApp — telas de ranking**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Ranking-e-Competicao.md` (US-01 a US-04, CT-01 a CT-05, RN-01 a RN-05, §5 e §6); `docs/wiki/Funcionalidade-Pontuacao.md` US-01 (selo "Pontos confirmados"); `docs/wiki/Decisoes.md` ADR-010; em `src/jornada/pontos.js`, `vPlacarCard`, `vJornada` (card "Ranking com amigos — em breve") e os ícones `gic`/`ligaIc`.
>
> ### Estado atual
> O servidor grava os pontos oficiais e `fn_ranking(periodo)` devolve o ranking (S11). O app só mostra os pontos da própria pessoa; o card "Ranking com amigos" diz "em breve".
>
> ### Objetivo
> Todos os logados veem a posição e a pontuação de todos (Liga, Semana, Geral), tocam num participante para ver o resumo público e veem a própria posição no Início.
>
> ### Escopo
> 1. **Dados**: `src/dados/ranking.js` → `ranking(periodo)` (`rpc('fn_ranking')`, cache de 60 s em memória e cópia em `localStorage` para offline) e `cartao(userId)` → migration `fn_cartao(uid)` (`security definer`; só campos públicos + ids das conquistas + "membro desde"; teste pgTAP de privacidade).
> 2. **Tela `#ranking`** (`src/jornada/ranking.js`, registrada no roteador): abas Liga · Semana · Geral; linhas com posição, avatar (inicial na cor), apelido, nível e título, ícone da liga (`ligaDe(p28)` de `core/pontuacao.js`), pontos do período, 🔥 sequência, treinos na semana; "Você" destacado e fixo no rodapé quando estiver fora da tela; pódio visual no top 3; empate; rodapé "Atualizado às…"; estado de 1 participante; aviso de quem saiu do ranking (US-04, com a posição que teria, só para a pessoa); modo offline com o último ranking.
> 3. **Cartão do participante** (folha, US-02): avatar, apelido, nível com barra de XP, liga, sequência e escudos, treinos na semana, medalhas das conquistas (reaproveite `.medalha`/`.medalhas` e `CONQ`), membro desde. Nada de histórico, cargas ou peso.
> 4. **Integrações**: card do placar no Início com "Liga Ouro · 3º de 8 · faltam N pts para o 2º" (US-03), tocando para abrir `#ranking`; resumo do treino mostra a mudança de posição quando houver; na página Minha jornada, o card "em breve" vira atalho para o ranking.
> 5. **Segurança de exibição**: todo campo vindo de outro usuário passa por `esc()` (RN-05). Adicione o teste do CT-05.
>
> ### Testes
> - e2e (Supabase local, 3 usuários com sessões sintéticas e pontos recalculados): ordem e posições nas 3 abas; empate; "Você" fixo; cartão sem campos privados (CT-01; confira também a resposta de rede); usuário desativado e oculto não aparecem (CT-04); apelido com HTML não executa (CT-05); offline mostra o último ranking.
> - CT-02 e CT-03 (virada da semana e expiração) como teste de integração da função, com eventos em datas controladas.
> - 390×844 claro/escuro, sem rolagem horizontal, apelidos longos com reticências.
>
> ### Critérios de aceite
> - No preview, com 2+ contas: cada uma vê as outras no ranking com pontos e posição; tocar abre o cartão.
> - Nenhum dado privado na resposta de `fn_ranking`/`fn_cartao` (provado por teste).
> - `npm run check`, `test:e2e` e `test:db` verdes.
>
> ### Fora do escopo
> Competições com período (S18); notificações de ultrapassagem; ranking por exercício (fora do escopo do produto).
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Ranking-e-Competicao.md` (estado → ✅ US-01..04; telas reais), `Funcionalidade-Pontuacao.md` (card do placar), `Modelo-de-Dados.md` (`fn_cartao`), `CLAUDE.md` (1 linha), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(ranking): liga, semana, geral e cartão do participante (S12)`, push, PR. Resposta ao Arthur: onde fica o ranking e o que cada aba significa, em 3 linhas.
