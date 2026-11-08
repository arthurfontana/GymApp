# Treinos e Sessão (conjuntos, treinos, sessão ao vivo, resumo, histórico)

> **Estado**: ✅ Em produção no Artifact (v15–v21, um usuário) · 🔮 por usuário na nuvem com uso sem sinal (S06) · 🔮 Minha evolução (S17)
> **DECs relacionadas**: ADR-006, ADR-008, ADR-009
> **Última sessão que alterou esta página**: S00
> O detalhe de tela e regra (rotas, folhas, rótulos, circuito, aquecimento guiado, ficha da semana, progressão, prévia 3D) está em §8. O `CLAUDE.md` só aponta para esta página.

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

**Critérios de aceitação (resumo do v21, detalhe em §8):**
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

Igual ao v21, mais o indicador de sincronização (US-01) na barra da sessão e no topo do Início. Detalhe das telas: §8.

## 7. Fora do escopo

Edição colaborativa em tempo real, histórico de versões de um treino, importar planilhas, timer de série por voz.

## 8. Detalhe de tela e regra (estado atual do protótipo)

Esta seção descreve as telas e regras do app como existem hoje (referência normativa para a migração). Notação: `LIB`, `PX` e funções como `vConjunto` são de `src/jornada/treino.js` e `src/jornada/pontos.js` (mapa de regiões em `docs/claude/Mapa-de-Regioes.md`).

### 8.1 Camadas, rotas e tema

- **Camadas:** lista de **conjuntos de treino** (tela inicial, §8.2) → conjunto → treino → sessão (§8.3), e a **biblioteca compartilhada** com duas abas: exercícios 3D (`#biblioteca` → `#<id-do-exercício>`) e treinos salvos (`#biblioteca/treinos`). Roteamento todo por `location.hash`, voltar do celular funciona.
- **Tema claro/escuro:** padrão **claro** mesmo com o celular no modo escuro. Botão redondo (lua/sol) no canto do Início, no topo do treino/resumo, da Biblioteca e do exercício 3D. A escolha fica salva no aparelho (`localStorage['mt3d.theme']`), aplicada por um `<script>` curto antes do conteúdo (sem piscar) em `document.documentElement.dataset.theme`; o 3D troca de cores pelo `MutationObserver` de `data-theme` em `app.js`.

### 8.2 Conjuntos de treino e biblioteca compartilhada

Origem: o A/B vira um **conjunto** ("Treino na academia"); ele pode criar outros conjuntos e escolher numa lista. A biblioteca (exercícios **e** treinos) é compartilhada por todos os conjuntos; um treino pode ser reutilizado em vários conjuntos. Cada exercício mostra se precisa de equipamento.
- **Hierarquia:** Meus treinos (lista de conjuntos) → conjunto → treino → sessão. Rotas: `#` lista · `#conjunto/<cid>` · `#conjunto/<cid>/treino/<tid>` (treino no contexto do conjunto) · `#treino/<tid>` (treino aberto pela biblioteca) · `#biblioteca` (aba Exercícios 3D, HTML fixo `#menuView`) · `#biblioteca/treinos` (aba Treinos, `#bibView`) · `#sessao` · `#resumo/<id>` · `#<exId>`.
- **Lista (`vInicio`)**: card "Treino em andamento" (se houver), cards de conjunto (nome, descrição, letras dos treinos, frequência, "Próximo: Treino B · último há 3 dias"), "+ Novo conjunto", "Últimos treinos" (todos os conjuntos), cards da biblioteca (Exercícios 3D · N sem equipamento; Treinos salvos).
- **Conjunto (`vConjunto`)**: o antigo Início — próximo treino alternando **dentro do conjunto**, aviso de intervalo (`intervaloH`, 48 h no da academia), treinos com dia, tag de equipamento e "também em …", "+ Adicionar treino" (folha: criar novo ou escolher da biblioteca), semana/histórico só do conjunto, orientações da ficha, lápis para editar (nome, descrição, frequência, duração, intervalo mínimo; excluir conjunto mantém treinos e histórico).
- **Treino compartilhado**: o conjunto guarda referências `treinos:[{id, dia}]` (o **dia** é por conjunto). Editar um treino muda em todos os conjuntos — a tela avisa "também está em …" e oferece **Criar cópia** (duplica e troca a referência só neste conjunto). Folha de edição do treino: nome, letra, dia neste conjunto, foco, chips dos conjuntos em que aparece, Duplicar, Excluir (remove de todos os conjuntos; histórico fica). No conjunto, "Remover deste conjunto" mantém o treino na biblioteca. Letra de treino novo = primeira letra livre na biblioteca inteira (evita dois "Treino A").
- **Equipamento**: `LIB[id].eq` (categorias `maquina|polia|barra|halteres|banco`, vazio = sem equipamento) e `eqTxt` (ex.: "Banco e halteres", "Polia alta e corda"). Tag verde "Sem equipamento" ou tag com halter + texto; resumo por treino (ex.: "Máquina · Polia · Halteres"). Filtro Todos/Sem/Com equipamento na aba Exercícios e na folha "Adicionar exercício". 9 exercícios sem equipamento (prancha + os 8 da v19).
- **Sessões** guardam `conjuntoId` e `conjuntoNome`; voltar da sessão/resumo leva ao conjunto. Treino iniciado pela biblioteca usa o conjunto se ele estiver em só um; senão fica sem conjunto.
- **Migração** (`migrar()` em `treino.js`): se não há conjuntos, há treinos e `config/programa` não tem `migrado`, cria `conjuntos/academia` a partir do `config/programa` (nome "Treino na academia", descrição "Full Body A/B · Recomposição corporal", treinos A Terça / B Quinta), marca as sessões e grava `migrado:true`. No db real isso já foi feito via ArtifactData (07/11).
- Cuidado com nomes de classe: `.tags` já existe na biblioteca 3D (rótulos sobre a cena); as tags de equipamento usam `.eqtags`/`.eq`.

### 8.3 Jornada de treino (telas, sessão, prévia 3D e progressão)

Origem: uma tela antes da biblioteca com os treinos; dentro do treino adicionar/remover exercícios da biblioteca, definir séries, repetições e carga; registrar cada série no dia a dia; contagem regressiva do descanso entre séries. Primeiro programa veio de um PDF do professor: **Full Body A/B — recomposição corporal**, 2×/semana (A terça, B quinta), 50–65 min, 48 h entre sessões, RIR 2–3, progressão "primeiro repetições, depois carga", 2 min de descanso nos principais.
**Telas (hash):**
- `#conjunto/<id>` **Conjunto** (o antigo Início; hoje `#` é a lista de conjuntos, §8.2) — cabeçalho do conjunto, card escuro "Próximo treino" (alterna A/B depois do último concluído; aviso se < 48 h) ou "Treino em andamento · Continuar"; lista de treinos (+ Novo treino); faixa "Esta semana" (S T Q Q S S D com letra do treino feito); Histórico (sessões concluídas → resumo); card da Biblioteca 3D; "Orientações da ficha" (details); nota de onde os dados estão salvos.
- `#treino/<id>` — lista numerada dos exercícios (séries × faixa · descanso · observação · "Última: 100×12 · …"), chip **3D** que abre o exercício na biblioteca (ou "sem 3D"); tocar no item abre a folha de edição (séries, tipo repetições/tempo, mín/máx, descanso em chips 0:45–3:00, aumento de carga, carga total/por halter, observação, subir/descer/remover); "+ Adicionar exercício" (folha com busca, agrupado, marca "no treino"; também aceita exercício livre sem 3D); editar nome/letra/dia/foco; excluir treino; botão fixo **Começar Treino X**.
- `#sessao` — barra fixa (voltar, tempo decorrido, x/y séries, Encerrar), barra segmentada por exercício, faixa de chips dos exercícios (pular para qualquer um). **Descanso:** anel SVG com contagem regressiva, −15 s / +15 s / Pular, bipes nos 3 últimos segundos, bipe + vibração no zero, card fica verde "Pode começar". O card do exercício atual não tem mais o botão "Ver execução". **No fim da página** há o card **Como fazer**: prévia 3D animada do exercício atual (em loop, sem guias, sem girar, legenda do frame no rodapé com bolinha da fase) e, embaixo, o botão **Mais detalhes** (abre o exercício completo; o voltar retorna à sessão). Durante o descanso a prévia já mostra o próximo exercício. Itens sem 3D mostram um aviso no lugar. Card do exercício atual: sugestão de progressão, tabela Série / Anterior / Hoje (editar série com lápis), steppers grandes de **carga** e **repetições** (um por linha no celular), cronômetro nos exercícios por tempo (prancha), esforço **Fácil / No ponto / Difícil** (RIR), botão grande **Concluir série N**, "Pular para o próximo" e "+ Série extra". Ao terminar tudo: card "Todas as séries feitas → Finalizar treino". Pílula flutuante com o descanso/progresso aparece se ele sair da sessão (ex.: para ver o 3D). Wake Lock mantém a tela acesa.
- `#resumo/<id>` — duração, séries, repetições, kg levantados; por exercício: séries feitas, comparação com a última vez (+kg / +reps / igual) e a sugestão para a próxima; anotações; apagar sessão.
- Exercício 3D aberto a partir da sessão/treino: o voltar vira "Voltar ao treino".
**Prévia 3D (`window.__mini(el, exId)` em `app.js`)**: usa o mesmo renderer/cena; move o `<canvas>` para o container `#miniStage` (`host` = container ativo; `resize()` e `viewPose()` usam `host`), desliga OrbitControls e `touch-action` vira `pan-y` (para rolar a página), salva/restaura guias, velocidade e loop. Renderiza só quando o container está visível (IntersectionObserver) e a aba ativa. `__mini(null)` ou `__enterExercise()` devolvem o canvas ao `#stage`. `treino.js` chama `mountMini()` a cada render da sessão (o innerHTML é refeito; o canvas é só reanexado, sem reiniciar a animação).
**Histórico por exercício**: `ultimaVez` casa itens pelo id da biblioteca **ou** pelo nome (`mesmoEx`), para que sessões antigas de um item que ainda não tinha 3D continuem valendo como "última vez".
**Regras de progressão (`sugestao`)**: sem histórico → "primeira vez, escolha uma carga com 2–3 reps sobrando"; todas as séries no máximo da faixa e nenhuma "difícil" → +passo kg e recomeçar no mínimo; alguma série abaixo do mínimo → manter ou reduzir; senão → mesma carga, +1 rep. Exercício por tempo: +5 s. Pré-preenchimento: série anterior desta sessão → sugestão → última vez → meio da faixa.

### 8.4 Conjunto "Calistenia em casa" e formato circuito

Pedido do Arthur (PDF de 27 páginas, 07/11): programa de calistenia **Full Body em casa**, 8 semanas, 10–15 min, 2×/semana + 1 opcional, sem equipamento, em circuito. Gravado no db via ArtifactData (fonte: `seed/calistenia.json`; também `conj_calistenia.json`, `treino_cal-a.json`, `treino_cal-b.json`).
- `conjuntos/calistenia` — "Calistenia em casa", "Full Body A/B · 8 semanas · sem equipamento", A Segunda / B Quinta, sem intervalo mínimo (o PDF não fixa), orientações do PDF (objetivos, semana, circuito, aquecimento, evolução, níveis da flexão, costas/sem remada, alimentação, ajustes, ponto de partida), aeróbico (caminhada 15→30 min), indicadores (peso 3×/sem, cintura 15 dias, fotos mensais, desempenho) e `programa` (fases e caminhada por semana, extra "Registrei meu peso e cintura").
- `treinos/cal-a` **A · Base de força**: agachamento livre 12 · flexão inclinada na parede 8–10 · ponte de glúteos 12 · dead bug 6 por lado. `treinos/cal-b` **B · Força e estabilidade**: afundo para trás 6 por perna · flexão com joelhos 6–8 · bom dia sem carga 12 · bird dog 8 por lado. Os dois: `formato:'circuito'`, 2 rodadas, pausa até 0:30 entre exercícios (PDF: 20–40 s quando necessário), 1:00 entre rodadas, aquecimento de 2 min (4 × 30 s). Cada item tem `nota` (músculos) e `dica` (texto do PDF). Letras A/B repetem as da academia de propósito (é como o PDF chama); os nomes diferem.
- **Formato circuito** (`treino.formato='circuito'`, `rodadas`, `descansoRodada`): `item.series` = rodadas (sincronizado ao salvar). Na sessão, `proxCircuito()` escolhe o exercício mais atrasado (dentro da rodada segue a ordem; rodada nova recomeça do 1º); depois de cada exercício a sessão já pula para o próximo e mostra **Pausa** (descanso do item; 0 = sem pausa) ou **Fim da rodada N** (descanso da rodada, com "Parar aqui com N rodadas" para as semanas 1–2). Rótulos: "Rodada r de R · exercício i de n", botão "Concluir e seguir" / "Concluir rodada N" / "Concluir último exercício"; sem "Série extra". `s.descansoTipo`: `serie|troca|rodada|aquec`.
- **Aquecimento guiado** (`treino.aquecimento:[{t,s}]`): card antes da 1ª série com "Iniciar aquecimento guiado" / "Já aqueci, pular"; usa o mesmo anel do descanso (laranja), destaca o movimento atual, bipe duplo na troca. Ligar/desligar na folha do treino (padrão `AQ_PADRAO`).
- **Contagem por lado** (`item.lado:'lado'|'perna'`, também em `LIB` para afundo/bird dog/dead bug): "6 reps por lado"; faixa com mín = máx mostra só "12 reps". Editável na folha do item ("Contagem das repetições"), junto com a **Dica de execução**.
- **Folha do treino**: Formato Séries/Circuito, Rodadas, Descanso entre rodadas, Aquecimento guiado Sem/2:00.
- **Ficha da semana** (conjuntos com `programa`): "semana N de 8" (conta a partir da segunda-feira da 1ª sessão concluída no conjunto), fase atual ("Semanas 1–2 · 1–2 rodadas · Aprender os movimentos"), checklist com os treinos (marcados sozinhos quando há sessão na semana), caminhadas da fase (3× 15 min nas semanas 1–2…) e extras; marcações em `conjunto.semana={ini:<segunda ms>, k:{cam1:true,…}}` (zera sozinho na semana seguinte; "Reiniciar semana").
- **Sugestão sem carga** (corrigida): 1ª vez "faça X com calma, priorizando a técnica"; todas no máximo e marcadas *fácil* → aumentar a dificuldade (mais reps ou variação); *difícil* → manter; senão → manter até ficar fácil.

### 8.5 Armazenamento e semeadura do protótipo

Os formatos de `conjuntos/`, `treinos/` e `sessoes/` estão em [Modelo de Dados §4](Modelo-de-Dados.md); a coleção `config/programa` serve só de origem da migração (`migrado:true`) e não é mais usada pelas telas.

- Gravação otimista com fila por documento (uma escrita por vez, coalescendo), 10 s de timeout no carregamento; sem `db` (arquivo local/preview) usa `localStorage` (`mt3d.*`).
- Semeado via ArtifactData a partir de `seed/seed.json` (Treino A: leg press 3×8–12, supino máquina, remada sentada, stiff, elevação lateral, tríceps polia, prancha 30–40 s; Treino B: 7 exercícios do PDF). Descanso: 2:00 nos principais, 1:00–1:30 nos acessórios (o PDF só fala dos principais). Supino na máquina e elevação pélvica ganharam 3D na v17 (a2 → `supino-maquina`, b5 → `elevacao-pelvica`). A foto da mesa flexora no PDF é de máquina sentada; foi ligada à flexora deitada da biblioteca.
