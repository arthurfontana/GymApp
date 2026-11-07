# Ranking e Competição

> **Estado**: 🔮 Planejado (S11 placar no servidor · S12 telas de ranking · S18 competições com período)
> **DECs relacionadas**: ADR-004, ADR-010
> **Última sessão que alterou esta página**: S00

## 1. O que é e para quem

Todos os participantes logados veem **a posição e a pontuação de todos**. O ranking usa os pontos oficiais (calculados no servidor) e tem três visões:

| Aba | Ordena por | Ideia |
|---|---|---|
| **Liga** (padrão) | pontos dos últimos 28 dias | Quem está treinando **agora**. Pontos antigos expiram, então quem para cai e quem volta sobe rápido |
| **Semana** | pontos desde segunda 00:00 | A disputa curta, que zera toda segunda |
| **Geral** | XP total (nunca expira) | O histórico de dedicação |

A regra é justa entre pessoas diferentes porque a carga conta **relativa ao peso corporal** e a intensidade de cada exercício está calibrada (tabela `PX`). Quem treina em casa sem equipamento também pontua (calistenia, circuitos, caminhada nas fichas).

O ranking mostra só o que é público: apelido, cor, nível e título, liga, pontos do período, sequência de semanas e treinos na semana. **Cargas, peso e histórico nunca aparecem** (ADR-010).

## 2. Histórias de usuário

### US-01 — Ver o ranking
**Como** participante, **quero** ver a posição e os pontos de todos **para** saber como estou em relação ao grupo.

**Critérios de aceitação:**
- Rota `#ranking`, acessível pelo Início (card do placar) e pela página Minha jornada. Substitui o card "Ranking com amigos — em breve".
- Abas Liga · Semana · Geral (chips). Cada linha: posição, avatar (inicial na cor), apelido, nível + título, ícone da liga, pontos do período, 🔥 sequência, treinos na semana.
- A linha da própria pessoa fica destacada. Se estiver fora da tela, aparece fixa no rodapé ("Você · 7º · 820 pts").
- Empate de pontos = mesma posição, ordem alfabética do apelido.
- Rodapé: "Atualizado às HH:MM · pontos dos últimos 28 dias" (ou da semana / total), com link "Como funcionam os pontos" (Regras).
- Com 1 participante só: "Convide alguém para começar a disputa" (o administrador vê o atalho para Convites).
- Funciona offline com o último ranking guardado no aparelho e o aviso "sem internet — ranking de HH:MM".

### US-02 — Cartão do participante
**Como** participante, **quero** tocar em alguém e ver o resumo público dele **para** comparar e me motivar.

**Critérios de aceitação:**
- Folha com: avatar, apelido, nível e título (barra de XP), liga atual, sequência e escudos, treinos nesta semana, conquistas ganhas (medalhas, sem datas) e "membro desde <mês/ano>".
- Nada de histórico, cargas, peso, nomes de treinos ou horários.

### US-03 — Minha posição no Início
**Como** participante, **quero** ver minha posição sem abrir o ranking.

**Critérios de aceitação:**
- O card do placar no Início ganha uma linha: "Liga Ouro · 3º de 8 · faltam 120 pts para o 2º" (ou "Você lidera a liga!"). Tocar abre `#ranking`.
- Depois de finalizar um treino, o resumo mostra a mudança de posição quando houver ("Você subiu para 2º na liga").

### US-04 — Sair do ranking
**Como** participante, **quero** poder treinar sem aparecer no ranking.

**Critérios de aceitação:**
- "Aparecer no ranking" no Perfil (padrão ligado). Desligado: a pessoa some do ranking dos outros. Na própria tela de ranking ela vê o aviso "Você não aparece no ranking" e a posição que teria, só para ela.

### US-05 — Competições com período (🔮 S18)
**Como** administrador, **quero** criar uma competição com começo e fim **para** fazer desafios de mês com o grupo.

**Critérios de aceitação:**
- Administração → Competições: nome, início, fim, participantes (todos os ativos ou uma lista), descrição.
- Aba extra no ranking enquanto houver competição ativa: pontos ganhos dentro do período, contagem regressiva e, ao encerrar, pódio com os 3 primeiros (fica visível por 7 dias).
- Pontuação da competição = soma de `pontos_eventos` com `t` no período (mesma regra, nada novo para calcular).

## 3. Cenários de teste (Gherkin)

### CT-01 — Privacidade no ranking (cobre US-01, US-02, INV-02)
```gherkin
Dado   os participantes A e B com treinos concluídos
Quando A abre o ranking e o cartão de B
Então  vê apelido, nível, liga, pontos, sequência e conquistas de B
  E    a resposta de fn_ranking não contém peso, cargas, sessões nem nomes de treino
```

### CT-02 — Virada da semana (cobre US-01, INV-08)
```gherkin
Dado   A com 200 pontos na semana, ganhos até domingo 23:50 em São Paulo
Quando passa da segunda 00:00 em São Paulo
Então  a aba Semana mostra A com 0
  E    a aba Liga continua com os 200 (até completar 28 dias)
```

### CT-03 — Expiração da liga sem treino novo (cobre US-01)
```gherkin
Dado   B com um treino de 150 pontos feito há 27 dias e nenhum depois
Quando o cron diário roda no dia seguinte ao 28º dia
Então  B perde esses 150 pontos na aba Liga
  E    o XP de B (aba Geral) não muda
```

### CT-04 — Participante desativado ou oculto (cobre US-04)
```gherkin
Dado   C com no_ranking = false e D desativado
Quando A abre o ranking
Então  nem C nem D aparecem
  E    C, ao abrir o ranking, vê "Você não aparece no ranking"
```

### CT-05 — Apelido com HTML (cobre segurança)
```gherkin
Dado   um participante com apelido "<img src=x onerror=alert(1)>"
Quando outro participante abre o ranking
Então  o apelido aparece como texto
  E    nenhum script é executado
```

## 4. Regras de negócio

- **RN-01**: Só logados e ativos veem o ranking. Entram nele os perfis `ativo and no_ranking` com pelo menos 1 evento de pontos.
- **RN-02**: Pontos do ranking = `pontos_eventos` gravados pelo servidor (nunca o cálculo do aparelho).
- **RN-03**: Liga = soma dos eventos com `t > agora − 28 dias`. Semana = eventos desde segunda 00:00 `America/Sao_Paulo`. Geral = soma de todos.
- **RN-04**: A liga (Bronze…Diamante) é derivada de `p28` no aparelho com `ligaDe()` de `core/pontuacao.js`. O SQL não repete os limiares.
- **RN-05**: Todo texto vindo de outro usuário (apelido) passa por `esc()` antes do `innerHTML`.

## 5. Especificação técnica

- **Leitura**: `src/dados/ranking.js` → `supabase.rpc('fn_ranking', {periodo})`, com cache em memória por 60 s e em `localStorage` (`mt3d.ranking.<periodo>`) para offline.
- **Função SQL** `fn_ranking(periodo text)` (S11): ver [Modelo de Dados](Modelo-de-Dados) §3. `security definer`, `set search_path = public`, `grant execute to authenticated`, `revoke from anon`.
- **Cartão**: `fn_cartao(user_id uuid)` (S12) devolve só campos públicos + `conquistas` (ids) do placar.
- **Tela**: `src/jornada/ranking.js` (view `vRanking`, `vCartao`), registrada no roteador (`#ranking`).
- **Competições (S18)**: tabelas `competicoes (id, nome, descricao, inicio, fim, todos boolean, criado_por)` e `competicao_participantes (competicao_id, user_id)`; `fn_ranking_competicao(id)`.

## 6. Interface

- Lista em cards finos (uma linha por pessoa, 56 px), pódio visual nos 3 primeiros (ouro/prata/bronze na posição), ícone da liga com as cores do v21 (`.liga-ic`).
- Abas fixas no topo ao rolar. Linha "Você" fixa no rodapé quando estiver fora da tela.
- 390×844 sem rolagem horizontal, claro/escuro. Apelidos longos com reticências.

## 7. Fora do escopo

Ranking por grupo muscular ou por exercício (expõe cargas), ranking público sem login, prêmios, notificações push de ultrapassagem (🔮 possível depois com Web Push).
