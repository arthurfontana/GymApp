# Pontuação (pontos, nível, liga, sequência, desafios, conquistas, calorias)

> **Estado**: ✅ Em produção no Artifact (v21, calculada no aparelho) · 🔮 módulo puro com fuso explícito (S10) · 🔮 cálculo oficial no servidor (S11)
> **DECs relacionadas**: ADR-004, ADR-009
> **Última sessão que alterou esta página**: S00
> O detalhe das regras (pontos, bônus, XP, ligas, desafios, conquistas, calorias e telas) está em §8, e o código em `web/pontos.js` (mapa de regiões em `docs/claude/Mapa-de-Regioes.md`). A tabela `PX` fica no código (`catalogo.js`) e a régua para exercício novo, na skill `animacao-3d-exercicio` §3a.

## 1. O que é e para quem

Os pontos premiam **constância e esforço**: crescem com repetições, carga relativa ao peso corporal e intensidade do exercício, e somam bônus (recorde, exercício novo, treino completo, aquecimento guiado), sequência de semanas na meta, desafios e conquistas. Pontos dos últimos 28 dias definem a **liga**. A soma de tudo é o **XP**, que dá o **nível**.

**Nada é guardado à parte**: tudo é recalculado a partir das sessões concluídas e das marcações das fichas. Mudou a regra, o histórico acompanha. No app novo isso continua valendo, mas o cálculo **oficial** (o que vale para o ranking) roda **no servidor**, com o **mesmo código** que o aparelho usa para mostrar a prévia ao vivo.

## 2. Histórias de usuário

### US-01 — Ver meus pontos ao vivo e no resumo
**Como** participante, **quero** ver os pontos subindo durante o treino e o cálculo no resumo.

**Critérios de aceitação:**
- Comportamento v21 mantido: pontos ao vivo na barra, "+N" a cada série, aviso de recorde, card "Pontos do treino" no resumo, página "Minha jornada" (`#pontos`) com nível, liga, sequência, calorias, desafios, gráfico semanal, recordes, conquistas, extrato e regras.
- O resumo mostra a prévia na hora. Quando o placar oficial chega (segundos depois), aparece "✓ Pontos confirmados". Se houver diferença (ex.: limite de plausibilidade), mostra o valor oficial e o motivo.

### US-02 — Pontos oficiais calculados no servidor
**Como** participante, **quero** que meus pontos no ranking sejam calculados pela mesma regra para todos.

**Critérios de aceitação:**
- Ao finalizar ou apagar uma sessão, marcar ou desmarcar caminhada/registro na ficha, ou mudar peso ou meta, o app chama `POST /api/pontos/recalcular` (depois que a fila sincronizou esses documentos).
- O servidor lê **do banco** as sessões concluídas, os conjuntos (fichas) e o perfil privado da pessoa, roda `jogo()` de `src/core/pontuacao.js` e substitui atomicamente os eventos e o placar dela.
- Um cron diário (Vercel) recalcula todos os ativos: pontos que saem da janela de 28 dias e sequências quebradas aparecem no ranking mesmo sem treino novo.

### US-03 — Limites de plausibilidade
**Como** grupo, **queremos** que um erro de digitação ("500 reps") não destrua o ranking.

**Critérios de aceitação:**
- Aplicados **dentro** de `core/pontuacao.js` (aparelho e servidor iguais), só ao **pontuar**. O dado registrado nunca é alterado:
  - repetições por série consideradas até 100; tempo por série até 600 s;
  - séries pontuadas por item até `series + 5`;
  - no máximo 3 sessões pontuadas por dia (as de maior pontuação);
  - `pesoCorp` considerado entre 30 e 300 kg;
  - fator de carga já limitado entre 0,5 e 2 (v21) e o ritmo plausível (v21) continuam.
- O resumo e o extrato mostram "Limite aplicado: …" quando algum limite cortou pontos.
- Os limites entram como **`REGRA_VERSAO = 2`** na S11. A S10 garante paridade exata com o v21 (versão 1). A S11 atualiza os golden de propósito e o PR lista o efeito no histórico real do Arthur. Hoje esse histórico tem 4 sessões concluídas no mesmo dia (07/11/2026, uma de 1 minuto), que parecem testes: a S08 pergunta ao Arthur se elas ficam.

## 3. Cenários de teste (Gherkin)

### CT-01 — Paridade com o v21 (cobre US-01, US-02)
```gherkin
Dado   o histórico real do Arthur (data/) e as 6 semanas sintéticas do teste gam
Quando o módulo core/pontuacao.js calcula jogo() com agora fixo
Então  XP, nível, p28, liga, sequência, escudos, desafios, conquistas, extrato e kcal
       são idênticos aos da saída de referência gerada com o código v21
```

### CT-02 — Semana no fuso certo (cobre RN-02, INV-08)
```gherkin
Dado   uma sessão concluída domingo às 23:30 em São Paulo (segunda 02:30 UTC)
Quando o servidor (em UTC) e o aparelho (em qualquer fuso) calculam a semana
Então  os dois contam a sessão na semana que terminou nesse domingo
```

### CT-03 — Recálculo idempotente (cobre US-02, INV-04)
```gherkin
Dado   a participante A com 5 sessões
Quando /api/pontos/recalcular roda duas vezes seguidas para A
Então  pontos_eventos de A tem o mesmo conteúdo depois de cada execução
  E    o placar de A não muda
```

### CT-04 — Cliente não grava pontos (cobre INV-03)
```gherkin
Dado   a participante A logada
Quando A tenta inserir em pontos_eventos ou alterar placar pelo supabase-js
Então  o banco recusa
```

### CT-05 — Apagar sessão tira os pontos (cobre US-02)
```gherkin
Dado   A com 300 pontos na liga vindos de 2 sessões
Quando A apaga uma sessão de 140 pontos
Então  depois da sincronização e do recálculo, A tem 160 pontos na liga
```

### CT-06 — Limite de repetições (cobre US-03)
```gherkin
Dado   uma série digitada com 500 repetições no agachamento livre
Quando a sessão é pontuada
Então  a série conta como 100 repetições
  E    o resumo mostra "Limite aplicado: 100 repetições por série"
  E    o dado gravado continua 500
```

## 4. Regras de negócio

- **RN-01 (regra versionada)**: `REGRA_VERSAO` (inteiro em `core/pontuacao.js`) vai para cada evento. Mudou a regra → incrementa a versão, atualiza os golden tests de propósito (com a explicação no PR) e o cron recalcula todo mundo.
- **RN-02 (fuso)**: semanas começam na segunda 00:00 e horas ("treino antes das 7 h", "depois das 21 h") são medidas em `America/Sao_Paulo` (ADR-009).
- **RN-03 (peso)**: a carga relativa usa o `pesoCorp` da sessão; sem ele, o peso do perfil; sem peso no perfil, 75 kg.
- **RN-04 (fichas)**: caminhada (+10) e registro de peso/cintura (+5) contam só em conjuntos com `programa`, no máximo o número de caminhadas da fase vigente por semana.
- **RN-05 (oficial × prévia)**: o ranking usa só o placar do servidor. O aparelho mostra a prévia com o mesmo módulo, e as diferenças só podem vir de dados ainda não sincronizados.

## 5. Especificação técnica

- **`src/core/tempo.js`**: `segundaDe(ms)`, `proxSeg(w)`, `segAntes(w,i)`, `horaLocal(ms)`, todos em `America/Sao_Paulo` via `Intl.DateTimeFormat` (sem depender do fuso do processo).
- **`src/core/catalogo.js`**: `LIB` + `PX` + `GRUPOS`, `EQ` (um único lugar para nomes, equipamento e régua).
- **`src/core/pontuacao.js`**: `jogo({sessoes, conjuntos, perfil:{peso, meta}, agora}) → G` (mesma forma do `G` v21), `pontuar(sessao, best, vistos, mult, peso)`, `nivelDe`, `ligaDe`, `desafiosDa`, `CONQ`, `LIGAS`, `TITULOS`, `REGRA_VERSAO`, `LIMITES`. Sem `S`, sem DOM, sem `Date` implícito (o `agora` vem de fora).
- **`api/pontos/recalcular.js`** (S11): `POST`, `Authorization: Bearer <jwt>`. Administrador pode passar `{userId}` ou `{todos:true}`. Lê com a chave secreta, chama `jogo()` e grava com `substituir_pontos()`. Limite de 1 chamada a cada 10 s por usuário (as extras são agrupadas). Resposta `{xp, p28, semana, nivel, liga, seq, eventos:N}`.
- **`api/cron/placar.js`** (S11): `GET` com `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron), recalcula todos os perfis ativos em lotes.
- **Golden** (`tests/golden/`): saídas JSON do v21 geradas uma vez pela S10, a partir do código original, com `agora` fixo.

## 6. Interface

Telas v21 mantidas. Novos elementos: selo "✓ Pontos confirmados" no resumo, linha "Limite aplicado" no extrato e na seção Regras (com a tabela de limites), e a posição no ranking no card do placar (Ranking, US-03).

## 7. Fora do escopo

Pontos por foto ou vídeo, validação por terceiros (o professor confirmar), pontos por passos do celular, recompensas fora do app.

## 8. Detalhe das regras (estado atual do protótipo)

Origem: pontos que crescem com repetições, carga e intensidade do exercício; visão gamificada; pontos que expiram se parar de treinar; calorias; pensar numa competição futura entre amigos. Código em **`pontos.js`** (incluído por `build.py` no lugar do marcador `/*@@PONTOS@@*/` do `treino.js`); estilos no fim do `treino.css`.
- **Nada é guardado à parte**: `jogo()` recalcula tudo das sessões concluídas + marcações das fichas, a cada render (`G` zera no `render()`). Mudou a regra, o histórico acompanha. Peso do perfil fica em `config/programa.perfil` `{apelido, peso, meta}` (Arthur: 78,5 kg do PDF, meta 2); a sessão guarda `pesoCorp` ao começar.
- **Pontos da série** = reps (×2 se `lado`) × `PX[id].r` (pts/rep) × fator de carga; prancha 0,5/s. Fator de carga = √(carga total ÷ (`ref` × peso corporal)), entre 0,5 e 2; sem carga registrada = 0,5. Tabela `PX` (reavaliação da biblioteca): leg press 3,0 · goblet 2,8 · stiff/hip thrust 2,6 · supino halteres 2,2 · supino máquina/remada/puxada 2,0 · afundo 1,8 · mesa flexora/agachamento livre/flexão joelhos 1,6 · panturrilha/elev. lateral/tríceps/rosca 1,2 · ponte 1,0 · flexão parede/bom dia 0,8 · bird dog/dead bug 0,7. Intensidade 1–5 aparece na biblioteca (`intensTag`), na folha de adicionar e na tabela das regras.
- **Bônus do treino**: recorde pessoal +15 por exercício (maior carga, maior 1RM Epley, mais reps sem carga, mais tempo) · exercício novo +10 · completo +20 · aquecimento guiado +5 (`s.aqGuiado`). **Sequência**: +5% por semana seguida na meta (até +25%). **Ritmo**: se o tempo ativo < mínimo plausível (2 s/rep + 15 s entre séries), o treino vale proporcionalmente menos (≥ 0,9 conta inteiro).
- **Fora do treino**: caminhada marcada +10, peso/cintura +5 (marcações agora em `conjunto.fichas[<segunda ms>] = {cam1: timestamp}`; o antigo `semana` é lido por `fichasDe`), desafios +20/+30, conquistas +15 a +200.
- **XP** (nunca expira) → nível: XP do nível n = 150·(n−1)^1,9; títulos Iniciante (1), Em ritmo (5), Constante (10), Dedicado (15), Atleta (20), Fera (30), Lenda (40). **Liga** = pontos dos últimos 28 dias: Bronze 0 · Prata 800 · Ouro 2.000 · Platina 3.500 · Diamante 5.500; mostra quanto vence nos próximos 7 dias. **Sequência** quebra em semana abaixo da meta, salvo **escudo** (1 a cada 4 semanas seguidas, máx. 2).
- **Desafios da semana** (`desafiosDa`): fixo "Faça N treinos" (+30) + 2 do conjunto (recorde, 20 séries, 200 reps, 2 completos, exercício novo, 400 kcal, 2 aquecimentos, 3 caminhadas), escolhidos pelo número da semana. **20 conquistas** (`CONQ`) em categorias de cor (frequência, sequência, força, casa, especiais).
- **Calorias**: MET (Compendium of Physical Activities 2024) × peso × tempo ativo (intervalo antes de cada série, máx. 5 min). MET por exercício em `PX.met` (5,0 agachamento/terra; 3,5 musculação; 3,8 calistenia moderada; 2,8 leve/prancha); circuito no mínimo 5,0 (02035); caminhada 3,8 (17190).
- **Telas**: card do placar no Início (nível, XP, liga, sequência, kcal da semana) → `#pontos` "Minha jornada" (nível, liga, sequência/escudos, calorias, total levantado com comparação divertida, desafios, gráfico de pontos por semana, recordes, conquistas, extrato com validade, card "Ranking com amigos — em breve", regras completas com tabela). Sessão: pontos ao vivo na barra, "+N" subindo a cada série e aviso de recorde com som. Resumo: card "Pontos do treino" com contagem animada, linhas do cálculo, recordes, nível antes/depois e confete (respeita reduzir movimento). Treino e card "Próximo treino" mostram ~pts estimados. Perfil (nome no placar, peso, meta semanal) pela página da jornada.
- Cuidado: `.badge` já existe na biblioteca 3D; as conquistas usam `.medalha`/`.medalhas`.
- Ranking com amigos (próximo passo): exige dados por pessoa (`data/users/<id>/…` ou regras `{self}`) e um placar compartilhado; a regra de pontos já é relativa ao peso corporal para ser justa.
