# Biblioteca (exercícios 3D, treinos e programas)

> **Estado**: ✅ Exercícios 3D em produção (22, no Artifact) · 🔮 treinos e programas compartilhados e conta nova vazia (S07) · edição pelo celular (S14)
> **DECs relacionadas**: ADR-003, ADR-007, ADR-014
> **Última sessão que alterou esta página**: S00

## 1. O que é e para quem

A biblioteca é **o que é de todos**. Ela tem três partes:

1. **Exercícios 3D**: cada um com boneco animado, vistas, músculos, erros comuns e pontuação (intensidade). Hoje são 22. O Arthur acrescenta exercícios por briefing, executado pelo Claude Code com a skill `animacao-3d-exercicio`. O catálogo fica **no código** e é publicado junto com o app (ADR-003).
2. **Programas**: modelos de conjunto prontos, com treinos, dias, orientações e fases. Exemplos: "Treino na academia — Full Body A/B" e "Calistenia em casa — 8 semanas".
3. **Treinos avulsos**: modelos de treino que podem entrar em qualquer conjunto (ex.: "A · Base de força").

Programas e treinos ficam **no banco** e só o administrador publica (S14).

**Conta nova começa vazia.** O Início mostra boas-vindas com dois caminhos: **"Escolher um programa"** (abre os programas da biblioteca) ou **"Montar meu treino"** (cria um conjunto vazio e abre "Adicionar treino").

**Usar um programa = copiar.** Ao tocar "Usar este programa", o app cria na conta da pessoa um conjunto e os treinos dele, como cópia (com a origem anotada). A partir daí, a pessoa edita o que quiser. Se o administrador mudar ou despublicar o modelo, a cópia de ninguém muda (ADR-007).

## 2. Histórias de usuário

### US-01 — Ver os exercícios 3D
**Como** participante, **quero** abrir qualquer exercício 3D **para** conferir a execução.

**Critérios de aceitação:**
- `#biblioteca` mostra os exercícios agrupados (Peito, Pernas, Costas, Ombros, Braços, Core), com filtro Todos / Sem / Com equipamento e selo de intensidade. Comportamento atual mantido.
- Abrir um exercício (`#<id>`) baixa o 3D sob demanda na primeira vez (indicador de carregamento). Depois disso, abre na hora.

### US-02 — Ver os programas e treinos da biblioteca
**Como** participante, **quero** ver os programas e treinos prontos **para** escolher um.

**Critérios de aceitação:**
- Abas da biblioteca: **Exercícios 3D** (`#biblioteca`) · **Programas** (`#biblioteca/programas`) · **Treinos** (`#biblioteca/treinos`).
- Card de programa: nome, descrição, frequência, duração, letras dos treinos, tag de equipamento ("Sem equipamento" ou "Máquina · Polia · Halteres"), selo "Você usa" se já houver um conjunto da pessoa com essa origem.
- Detalhe do programa (`#biblioteca/programa/<id>`): treinos com exercícios, séries × faixa, orientações, fases (se houver), chip 3D por exercício e o botão **"Usar este programa"**.
- Detalhe do treino (`#biblioteca/treino/<id>`): itens e o botão **"Adicionar a um conjunto meu"** (folha para escolher o conjunto ou "Novo conjunto").
- Participante vê só o que está publicado. O administrador também vê os rascunhos, marcados "Não publicado".

### US-03 — Conta nova começa vazia
**Como** pessoa nova, **quero** um começo claro **para** não me perder num app vazio.

**Critérios de aceitação:**
- Sem conjuntos, o Início mostra o card "Bem-vindo, <apelido>" com **Escolher um programa** e **Montar meu treino**, mais o card da Biblioteca 3D. Placar, histórico e "Próximo treino" ficam escondidos até existir a primeira sessão concluída (o placar mostra "Faça seu primeiro treino para entrar no ranking").
- A rotina `migrar()` do v21 (cria o conjunto "academia") **nunca** roda em conta nova: fica restrita à importação do Arthur e depois é removida (S09).

### US-04 — Usar um programa
**Como** participante, **quero** usar um programa da biblioteca **para** começar a treinar com ele.

**Critérios de aceitação:**
- "Usar este programa" cria um conjunto (novo id, `origem = <id do programa>`, `origem_versao`) e uma cópia de cada treino (novos ids, `origem = <id do treino>`), com os mesmos dias. Depois abre o conjunto.
- Se a pessoa já usa esse programa: folha "Você já usa este programa" com **Abrir o meu** ou **Criar outra cópia** (o nome da cópia ganha " (2)").
- A operação grava pelo store (fila offline). Sem conexão, ela acontece no aparelho e sobe depois.

### US-05 — Adicionar um treino da biblioteca a um conjunto
**Como** participante, **quero** pôr um treino pronto num conjunto meu.

**Critérios de aceitação:**
- Copia o treino (novo id, origem anotada) e acrescenta `{id, dia:''}` ao conjunto escolhido.
- A letra do treino copiado é a primeira letra livre **na conta da pessoa** (regra `proximaLetra`, agora por usuário).

### US-06 — Meus treinos salvos
**Como** participante, **quero** ver todos os meus treinos **para** reaproveitá-los em vários conjuntos.

**Critérios de aceitação:**
- A antiga aba "Treinos salvos" (`#biblioteca/treinos` no v21) vira **`#meus-treinos`**, acessível pelo Início. Ela lista os treinos da conta com os conjuntos em que aparecem. Comportamento de compartilhar entre conjuntos e "Criar cópia" mantido.

### US-07 — Aviso de versão nova do modelo (🔮 S14)
**Como** participante, **quero** saber quando o modelo que eu copiei mudou **para** decidir se atualizo.

**Critérios de aceitação:**
- Se `origem_versao < versao` do modelo publicado, o conjunto ou treino mostra "Há uma versão nova deste programa" com **Ver o que mudou** e **Atualizar minha cópia**. Atualizar troca os itens e mantém o histórico (sessões antigas continuam válidas por `mesmoEx`).

## 3. Cenários de teste (Gherkin)

### CT-01 — Cópia independente do modelo (cobre US-04, INV-06)
```gherkin
Dado   o programa "calistenia-em-casa" publicado, versão 1
  E    a participante A usou o programa
Quando o administrador altera o treino "cal-a" da biblioteca (versão 2)
Então  o treino copiado por A continua igual ao da versão 1
  E    as sessões de A continuam abrindo normalmente
```

### CT-02 — Despublicar não quebra quem usa (cobre US-04, INV-06)
```gherkin
Dado   A usa o programa "full-body-ab"
Quando o administrador despublica "full-body-ab"
Então  A não vê mais o programa na biblioteca
  E    o conjunto de A continua completo e utilizável
```

### CT-03 — Exercício fora do catálogo (cobre INV-07)
```gherkin
Dado   um treino da biblioteca com um item exId "exercicio-removido"
Quando A usa o treino e faz uma sessão
Então  o item aparece como exercício livre "sem 3D"
  E    a série pontua com a regra genérica
  E    nenhum erro de JavaScript acontece
```

### CT-04 — Conta nova (cobre US-03)
```gherkin
Dado   a participante N recém-criada, sem dados
Quando N abre o Início
Então  vê "Escolher um programa" e "Montar meu treino"
  E    nenhum conjunto "Treino na academia" é criado automaticamente
```

### CT-05 — Usar o mesmo programa duas vezes (cobre US-04)
```gherkin
Dado   A já usa "full-body-ab"
Quando A toca "Usar este programa" de novo
Então  vê "Você já usa este programa"
Quando escolhe "Criar outra cópia"
Então  um segundo conjunto "Treino na academia (2)" é criado com treinos novos
```

## 4. Regras de negócio

- **RN-01**: O catálogo de exercícios (nome, grupo, foco, equipamento, `passo`, `porHalter`, `semCarga`, `tipo`, `lado`) e a régua de pontos (`PX`: `r`/`s`, `ref`, `met`) ficam em `src/core/catalogo.js`. Exercício novo segue os 4 pontos de integração da skill `animacao-3d-exercicio`. O deploy é o mesmo para todos (ADR-003).
- **RN-02**: Só o administrador cria, edita, publica e despublica programas e treinos da biblioteca (RLS + S14).
- **RN-03**: Copiar gera ids novos na conta da pessoa (exceção: a importação do Arthur mantém `A`, `B`, `cal-a`, `cal-b`).
- **RN-04**: Um programa da biblioteca só referencia treinos da biblioteca. Publicar um programa exige que todos os treinos dele estejam publicados (S14).

## 5. Especificação técnica

- **Leitura**: `src/dados/biblioteca.js` → `listarProgramas()`, `listarTreinos()`, `programa(id)`, `treino(id)` via supabase-js (`select` com RLS), com cache em memória e em `localStorage` (`mt3d.bib`) para abrir sem internet.
- **Copiar**: `usarPrograma(prog)` e `adicionarTreino(treinoBib, conjuntoId)` em `src/jornada/` usam `put('treinos', …)` / `put('conjuntos', …)` do store. Não chamam o Supabase direto.
- **Seed inicial (S07)**: `scripts/seed-biblioteca.mjs` lê `seed/seed.json` e `seed/calistenia.json` e gera `supabase/migrations/<n>_seed_biblioteca.sql` (`insert … on conflict (id) do nothing`). Ids: `academia-a`, `academia-b`, `cal-a`, `cal-b`, `full-body-ab`, `calistenia-em-casa`.
- **Modelo de dados**: [Modelo de Dados](Modelo-de-Dados) §2 (`biblioteca_*`, `origem`, `origem_versao`).

## 6. Interface

- Abas no topo da biblioteca (mesmo estilo de chips do filtro de equipamento).
- Estado vazio do Início (US-03) com ilustração simples (ícone de halter), 2 botões grandes e o texto "Tudo o que você fizer fica só na sua conta. No ranking aparecem só apelido e pontos."
- Folhas (`openSheet`) para "Você já usa este programa" e "Adicionar a um conjunto meu".

## 7. Fora do escopo

Participante publicar ou sugerir treino; avaliações e comentários em programas; busca por texto livre nos programas (a lista é curta); exercício 3D criado pelo celular (continua por briefing → Claude Code).
