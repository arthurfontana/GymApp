# Treinos e Sessão (conjuntos, treinos, sessão ao vivo, resumo, histórico)

> **Estado**: ✅ Em produção no Artifact (v15–v21, um usuário) · 🔮 por usuário na nuvem com uso sem sinal (S06) · 🔮 Minha evolução (S17)
> **DECs relacionadas**: ADR-006, ADR-008, ADR-009
> **Última sessão que alterou esta página**: S00
> O detalhe de tela do v21 (rotas, folhas, rótulos, circuito, aquecimento guiado, ficha da semana, progressão) está hoje no `CLAUDE.md` §2a, §2b e §2c. **A S01 move esse detalhe para cá** (§8) e deixa só um ponteiro no índice.

## 1. O que é e para quem

É o dia a dia de quem treina. A pessoa organiza **conjuntos** (seus programas, ex.: "Treino na academia"), cada um com **treinos** (ex.: Treino A na terça, Treino B na quinta). Na academia, ela abre o próximo treino e registra cada série (carga, repetições, esforço). O app conta o descanso com bipe, sugere a progressão ("+2,5 kg", "+1 rep"), mostra a prévia 3D do exercício e, no fim, um resumo com comparação com a última vez e os pontos ganhos.

O que muda no app novo: **cada pessoa tem os próprios dados**, eles ficam **na nuvem** (qualquer aparelho) e **a sessão funciona sem sinal**. Séries feitas offline ficam guardadas no aparelho e sobem quando a conexão volta.

## 2. Histórias de usuário

### US-01 — Meus dados em qualquer aparelho
**Como** participante, **quero** ver meus conjuntos, treinos e histórico em qualquer aparelho em que eu entrar.

**Critérios de aceitação:**
- Depois do login, o app carrega conjuntos, treinos e sessões da conta (só os da pessoa) e guarda uma cópia local.
- Abrir o app de novo mostra a cópia local na hora e atualiza em segundo plano. Ao voltar para a aba (`visibilitychange`), busca o que mudou desde a última sincronização (`atualizado_em > último`).
- Indicador discreto no topo: "Sincronizado" · "Salvando…" · "Salvo no aparelho (sem internet)" · "Erro ao salvar — tentar de novo".

### US-02 — Treinar sem sinal
**Como** participante na academia, **quero** registrar séries sem internet **sem medo de perder**.

**Critérios de aceitação:**
- Toda escrita entra primeiro numa **fila persistente** no aparelho (IndexedDB). A tela atualiza na hora (otimista).
- Fechar o app, travar a tela ou ficar horas offline não perde nada: ao reabrir, a sessão em andamento aparece com todas as séries.
- Com a conexão de volta, a fila sobe em ordem, um documento por vez, juntando várias edições do mesmo documento numa só (comportamento de `flush` do v21).
- "Sair" com fila pendente avisa: "Há N alterações ainda não enviadas. Sair mesmo assim apaga essas alterações deste aparelho."

### US-03 — Dois aparelhos ao mesmo tempo
**Como** participante, **quero** que usar celular e tablet não apague séries.

**Critérios de aceitação:**
- Cada documento tem um contador de revisão (`rev`). Na gravação, se o servidor tiver uma revisão mais nova:
  - **sessão**: as séries são **mescladas por item e por instante** (`sets[].t`), sem perder nenhuma série dos dois lados; os outros campos ficam com a versão mais nova;
  - **treino/conjunto**: vale a versão mais nova (última gravação vence) e aparece o aviso "Este treino foi alterado em outro aparelho".
- Duas sessões "em andamento" na mesma conta: o Início mostra a mais recente e oferece "Encerrar a outra".

### US-04 — Comportamento atual preservado
**Como** participante, **quero** que tudo o que já funciona continue igual.

**Critérios de aceitação (resumo do v21, detalhe em §8 após a S01):**
- Conjuntos (lista, próximo treino alternando no conjunto, intervalo mínimo, dia por conjunto, editar e excluir), treinos (itens, séries, faixa, tipo reps/tempo, descanso, aumento de carga, por halter, dica, contagem por lado, formato circuito com rodadas, aquecimento guiado), sessão (descanso com anel, bipes, vibração, Wake Lock, pílula flutuante, prévia 3D "Como fazer", sugestão de progressão, pré-preenchimento, esforço Fácil/No ponto/Difícil), resumo (duração, séries, reps, kg, comparação, sugestão, pontos com confete) e histórico.
- Os testes e2e `jor`, `cal` e `gam` (convertidos em asserts na S02) passam sem mudança de comportamento.

### US-05 — Minha evolução (🔮 S17)
**Como** participante, **quero** ver minha evolução por exercício e meu peso **para** saber se estou progredindo.

**Critérios de aceitação:**
- Tela `#evolucao` com: escolha do exercício (só os já feitos), gráfico da melhor carga por sessão e do 1RM estimado (Epley) ou de reps/tempo para exercícios sem carga, volume semanal e peso corporal (se registrado).
- Período: 4 semanas, 3 meses, tudo. Pontos tocáveis com data e valor. Funciona com a cópia local (sem internet).

## 3. Cenários de teste (Gherkin)

### CT-01 — Sessão inteira sem internet (cobre US-02, INV-05)
```gherkin
Dado   a participante A logada, com a sessão do Treino A em andamento
  E    o aparelho sem internet
Quando A conclui 3 séries e fecha o app
  E    reabre o app ainda sem internet
Então  a sessão mostra as 3 séries
Quando a internet volta
Então  as 3 séries chegam ao banco
  E    o indicador mostra "Sincronizado"
```

### CT-02 — Mesclagem de séries entre aparelhos (cobre US-03, INV-05)
```gherkin
Dado   a sessão S com 2 séries no supino, sincronizada nos aparelhos X e Y
Quando X, offline, registra a 3ª série às 10:00
  E    Y, online, registra uma série extra às 10:01 e sincroniza
  E    X volta a ficar online
Então  S tem 4 séries no supino, em ordem de horário
  E    nenhuma série foi perdida
```

### CT-03 — Fila coalesce edições (cobre US-02)
```gherkin
Dado   o aparelho offline
Quando a participante edita o mesmo treino 5 vezes
  E    a conexão volta
Então  apenas a versão final é enviada (1 escrita)
```

### CT-04 — Recarregar no meio do envio (cobre US-02)
```gherkin
Dado   uma série na fila sendo enviada
Quando a página recarrega antes da resposta do servidor
Então  a série continua na fila e é reenviada
  E    o banco fica com a série uma única vez (upsert por (user_id, id))
```

## 4. Regras de negócio

- **RN-01**: A fila só remove um item depois da confirmação do servidor. Reenviar é seguro porque toda escrita é `upsert` idempotente por `(user_id, id)`.
- **RN-02**: Excluir é uma operação na fila como as outras (marcador de exclusão). Sessões apagadas pedem o recálculo dos pontos.
- **RN-03**: Uma sessão concluída (`status='concluida'`) só muda por ação explícita (editar série no resumo, apagar sessão). Mesclagem automática nunca reabre uma sessão concluída.
- **RN-04**: Toda conta em semana, dia e hora usa `America/Sao_Paulo` (`core/tempo.js`), não o fuso do aparelho (ADR-009).
- **RN-05**: A sessão guarda `pesoCorp` ao começar (peso do perfil naquele momento).

## 5. Especificação técnica

- **Store** (`src/dados/store.js`): mantém a interface usada pelas telas (`S.conjuntos`, `S.treinos`, `S.sessoes`, `put(col,id,data)`, `del(col,id)`, `schedule()`), escolhendo o adaptador por ambiente:
  - `nuvem` (padrão com Supabase configurado e usuário logado);
  - `local` (sem `VITE_SUPABASE_URL`, ou `?modo=local`; usado nos testes e2e e nos previews sem backend);
  - `artifact` (`window.claude.use('db')` existe; só até a S09).
- **Fila** (`src/dados/fila.js`): IndexedDB `mt3d-<userId>`, store `fila` (`{chave:'col/id', op:'set'|'del', dados, rev, tentativas}`) e store `cache` (cópia local por coleção). Fallback para localStorage se o IndexedDB falhar.
- **Gravação nuvem**: `upsert` em `conjuntos|treinos|sessoes` com `{user_id, id, dados, rev: rev+1, origem?, status?, inicio?, fim?}`. Condição de revisão via RPC `gravar_doc(col, id, dados, rev_esperada)` que devolve conflito (`409` + documento atual) para o cliente mesclar (§2 US-03). O desenho final da RPC é decidido na S06 e registrado como DEC.
- **Erros**: sem conexão → mantém na fila, tenta de novo com espera crescente (1 s, 2 s, 4 s … máx. 60 s) e em `online`; `401` → renova a sessão e tenta de novo; `403/400` → marca "Erro ao salvar" e mantém o item (nunca descarta dado do usuário em silêncio); cota → aviso como no v21.

## 6. Interface

Igual ao v21, mais o indicador de sincronização (US-01) na barra da sessão e no topo do Início. Detalhe das telas: §8 (após a S01).

## 7. Fora do escopo

Edição colaborativa em tempo real, histórico de versões de um treino, importar planilhas, timer de série por voz.

## 8. Detalhe de tela do v21

*(A S01 move para cá o conteúdo de `CLAUDE.md` §2a, §2b e §2c, reescrito como estado atual.)*
