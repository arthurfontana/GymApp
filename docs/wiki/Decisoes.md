# Decisões (ADRs)

As páginas de funcionalidade dizem **como o sistema é**. Esta página diz **por que ficou assim**. Decisão revertida ganha ADR nova com o campo "Substitui". Nada aqui se apaga.

---

## ADR-001: Supabase (Auth + Postgres com RLS) como backend, front na Vercel

**Decisão:** o backend é o Supabase (região São Paulo): Auth para login, Postgres para os dados e Row Level Security para separar os dados de cada pessoa. O front e as funções de servidor ficam na Vercel.

**Contexto:** o protótipo usa o db do Artifact, que é de um dono só. As alternativas eram **Firebase** (Firestore + Auth), **Vercel Postgres/Neon + Auth.js** e **servidor próprio**.

**Justificativa:**
- A RLS deixa "histórico privado, ranking público" explícito em SQL e testável (pgTAP), em vez de espalhado em código.
- O ranking por janela (28 dias, semana) é uma consulta SQL simples sobre eventos com data: sempre fresca, sem recalcular nada.
- Auth pronto com administração por API (criar conta, banir, trocar senha) sem servidor próprio.
- Plano Free suficiente (500 MB) e 2 projetos (dev e prod). Integra com a Vercel.
- O Firebase seria quase uma troca direta (o store do v21 já tem cara de Firestore), mas agregações para o ranking e escrita confiável de pontos exigiriam Cloud Functions, que pedem o plano pago (Blaze). O Neon + Auth.js exigiria escrever o login e as regras de acesso à mão.

**Trade-off aceito:** escrever um adaptador novo para o store (o v21 usa `onSnapshot`); depender de dois fornecedores (Vercel + Supabase); o projeto Free pausa após 7 dias sem uso (o cron diário evita).

---

## ADR-002: Front continua em JavaScript puro; só o build migra para Vite; 3D intocado

**Decisão:** o código atual (jornada com `innerHTML`, roteamento por hash, 3D com three r128) continua. Só o build artesanal (`build.py`) dá lugar ao Vite, com ES modules, três.js por npm (versão fixa 0.128.0) e o 3D carregado sob demanda.

**Contexto:** reescrever em React/Next.js daria componentes e ecossistema, mas exigiria refazer cerca de 1.300 linhas de telas e arriscaria 4.800 linhas de 3D validadas por prints.

**Justificativa:**
- A costura 3D ↔ jornada já é limpa (pontes `window.__*`), então dá para trocar a casca sem mexer no 3D.
- Reescrita big-bang contra testes visuais é risco alto por ganho perto de zero (guardrail G5).
- O Vite resolve o que falta: módulos, variáveis de ambiente, divisão de código (login e ranking sem baixar 4 MB de 3D), PWA.

**Trade-off aceito:** telas novas seguem o padrão `innerHTML` + `esc()` (exige disciplina de escape: Ranking RN-05); sem tipagem estática.

---

## ADR-003: Catálogo de exercícios no código; treinos e programas da biblioteca no banco

**Decisão:** `LIB` (metadados) e `PX` (régua de pontos) ficam em `src/core/catalogo.js`, publicados com o app. Treinos e programas da biblioteca ficam nas tabelas `biblioteca_*`.

**Justificativa:**
- Exercício 3D é **código** (animação, rig, máscaras). Metadado no banco sem a animação não serve para nada, e os dois precisam andar juntos.
- A pontuação precisa ser idêntica no aparelho e no servidor: os dois importam o mesmo `catalogo.js` da mesma versão.
- Treinos e programas são **dados** que o administrador quer editar pelo celular, sem deploy.

**Trade-off aceito:** exercício novo exige deploy (push + merge), o que já é o fluxo da skill.

---

## ADR-004: Pontos oficiais calculados no servidor com o mesmo módulo puro do aparelho

**Decisão:** `src/core/pontuacao.js` (puro, sem DOM, com fuso explícito) roda no aparelho (prévia ao vivo) e numa função da Vercel (oficial), que grava `pontos_eventos` + `placar`. O ranking lê só o oficial. Limites de plausibilidade na própria regra.

**Contexto:** se o aparelho mandasse o placar pronto, qualquer pessoa poderia forjá-lo. Portar a regra para SQL duplicaria cerca de 350 linhas de lógica (sequência, escudos, desafios, conquistas) em duas linguagens.

**Justificativa:** uma única implementação; o "nada guardado à parte" do v21 se mantém (o servidor recalcula tudo das sessões); eventos com data tornam liga, semana e competições simples consultas por período.

**Trade-off aceito:** os dados (reps, carga) continuam declarados pela pessoa. A proteção é limite de plausibilidade + administrador poder ocultar alguém, não anti-fraude forte (ranking entre amigos).

---

## ADR-005: Acesso por convite (link de uso único) + e-mail e senha, sem SMTP na v1

**Decisão:** cadastro público desligado. O administrador gera um link de convite; a pessoa cria o login com e-mail e senha; o servidor cria a conta já confirmada. "Esqueci a senha" = link de redefinição gerado pelo administrador.

**Contexto:** login por código ou link mágico enviado por e-mail é mais elegante, mas o SMTP padrão do Supabase é só para testes (limite baixo e restrições). Um SMTP próprio exige configuração extra (Gmail com senha de app, ou domínio verificado no Resend).

**Justificativa:** funciona no primeiro dia, sem e-mail e sem custo; o Arthur controla quem entra; link mágico tem problemas conhecidos em PWA no celular (abre em outro navegador).

**Trade-off aceito:** recuperar a senha depende do administrador. Quando houver SMTP próprio, uma ADR nova pode acrescentar a recuperação automática por e-mail.

---

## ADR-006: Documentos do app em `jsonb`, com colunas extraídas só para posse e consulta

**Decisão:** `conjuntos`, `treinos` e `sessoes` guardam o documento do v21 inteiro em `dados jsonb`. Colunas próprias só para `user_id`, `id`, `origem`, `status`, `inicio`, `fim`, `rev`.

**Justificativa:** o código das telas e da pontuação já trabalha com esses documentos; a migração do Artifact vira cópia direta; normalizar séries em tabelas não traz ganho na escala (as consultas são por usuário).

**Trade-off aceito:** relatórios por série exigem `jsonb_path_query` (ninguém precisa disso agora).

---

## ADR-007: Usar algo da biblioteca = copiar (com origem e versão)

**Decisão:** "Usar este programa" e "Adicionar treino" criam cópias na conta da pessoa, com `origem` e `origem_versao`. A biblioteca nunca é referenciada ao vivo.

**Justificativa:** editar ou despublicar a biblioteca nunca muda o treino nem o histórico de ninguém; a pessoa personaliza à vontade; funciona offline.

**Trade-off aceito:** melhorias no modelo não chegam sozinhas. Há o aviso de versão nova com "Atualizar minha cópia" (S14).

---

## ADR-008: Sessão offline-first com fila persistente no aparelho

**Decisão:** toda escrita vai primeiro para uma fila em IndexedDB e sobe quando há conexão. A sessão em andamento nunca depende da rede. Conflito entre aparelhos: séries mescladas por instante; o resto, última gravação vence.

**Justificativa:** academia tem sinal ruim; perder séries é o pior defeito possível para quem treina (perda de trabalho do usuário).

**Trade-off aceito:** mais complexidade no store (uma sessão inteira, tier Máximo).

---

## ADR-009: Fuso único do app: America/Sao_Paulo

**Decisão:** semanas (segunda 00:00), dias e horas para pontos, desafios, conquistas e ranking são calculados em `America/Sao_Paulo`, explicitamente, no aparelho, no servidor e no SQL.

**Contexto:** o v21 usa o fuso do aparelho (`new Date().getDay()`). No servidor (UTC), uma sessão de domingo à noite cairia na semana seguinte.

**Trade-off aceito:** quem estiver em outro fuso (Acre, Amazonas, viagem) vê a semana virar fora da meia-noite local. Fuso por pessoa fica para depois.

---

## ADR-010: Privacidade: histórico, peso e medidas são privados; ranking expõe só agregados

**Decisão:** só apelido, cor, nível, título, liga, pontos, sequência, treinos na semana e conquistas são visíveis para outros logados. Peso, cargas, sessões e treinos são só do dono. Termos de uso, consentimento, exportar meus dados e excluir conta (S15).

**Justificativa:** peso e treino são dados de saúde (LGPD, dado sensível). O ranking motiva sem expor.

---

## ADR-011: Artifact congelado após a virada; um único app em produção

**Decisão:** até a S08, o Arthur treina no Artifact (o build ainda gera a versão de arquivo único). Na S09, o Artifact recebe uma última versão com aviso do endereço novo, sem gravação, e deixa de ser atualizado. A skill `animacao-3d-exercicio` passa a publicar pelo push/merge na Vercel.

**Trade-off aceito:** perda do "abrir direto no claude.ai". Ganho: um só lugar com dados e regras.

---

## ADR-012: Guardrails de contexto no repositório

**Decisão:** `CLAUDE.md` vira um índice enxuto (teto de 450 linhas, guard `scripts/check-claude-md.mjs` no CI); a documentação normativa fica em `docs/wiki/` (sincronizada com a Wiki); o detalhe de implementação, em `docs/claude/` (`Exercicios-3D`, `Motor-3D`, `Build-e-Publicacao`, `Mapa-de-Regioes`); e há âncoras de região `// #region: <slug>` (sem par de fechamento, só `grep`) nos arquivos grandes (na S01 em `web/app.js`, `web/treino.js`, `web/pontos.js`; desde a S02 em `src/3d/app3d.js`, `src/jornada/treino.js`, `src/jornada/pontos.js`). Segue as skills `especificacao-e-sessoes` e `guardrails-de-contexto`.

**Contexto:** o `CLAUDE.md` tinha 52 KB (cerca de 13 mil tokens) e crescia a cada exercício, como um changelog.

**Status:** ✅ confirmada e aplicada na S01. Regra de manutenção: feature nova ganha no máximo 1 linha no mapa "Onde vive o quê"; estourou o teto, poda antes de escrever (nunca apagar: mover para o lar certo).

---

## ADR-013: Dois projetos Supabase (dev e prod) e preview por PR

**Decisão:** `gymapp-dev` (previews da Vercel) e `gymapp-prod` (dados reais). As sessões do Claude Code testam contra um Supabase **local** (CLI + Docker, ou Postgres local com shim) e o CI roda o Supabase completo. Migrations entram no dev automaticamente após o merge e no prod pelo workflow `db-deploy.yml`, com aprovação. A importação do Arthur também é um workflow com aprovação. Nenhuma sessão recebe a chave de produção, e nenhum log imprime segredo (o repositório é público).

---

## ADR-014: Login obrigatório para tudo, incluindo a biblioteca 3D

**Decisão:** sem login, só as telas Entrar e Convite. A biblioteca 3D também exige login.

**Contexto:** o pedido foi "biblioteca disponível para todo mundo" **que está logado**. Abrir a biblioteca 3D sem login seria possível (o catálogo é código), mas é uma decisão de produto.

**Trade-off aceito:** não dá para mostrar um exercício a quem ainda não tem convite. Pergunta em aberto P3 no [Roadmap](Roadmap-e-Sessoes): se o Arthur quiser, uma ADR nova abre `#biblioteca` e `#<exercício>` ao público.

---

## ADR-015: Build do Artifact pelo Vite e e2e com assert contra o build

**Decisão (S02):** o mesmo código de `src/` gera as duas saídas. `npm run build` → `dist/` (Vite, módulos com hash, modelo em `modelos/body-model-v1.glb`). `npm run build:artifact` → `dist-artifact/` (`vite build --mode artifact`: um bundle IIFE com o three empacotado, posto inline como `<script>` clássico no fim do `<body>` por `scripts/build-artifact.mjs`; o modelo copiado como `body-model.wasm`). O `app3d.js` escolhe a URL do modelo por `import.meta.env.MODE`. `dist/` e `dist-artifact/` **não vão para o git** (antes o `web/index.html` gerado era commitado): o que se publica é sempre reconstruível do commit. Os e2e (`@playwright/test`) rodam contra `npm run preview` (o build de produção) e reprovam em qualquer `pageerror`/`console.error` ou largura > 390.

**Detalhes que ficaram fixos aqui:** Vite 8 e Vitest 5 (dentro de Arquitetura §7); `@playwright/test` em versão exata igual à do Chromium do ambiente (1.63.0), para não baixar navegador; fontes do Google respondidas vazias nos testes (`page.route`), em vez de bloqueadas, para não gerar erro de console; modo de teste por `?test=1` (script inline antes do módulo), sem página `test.html` separada.

**Contexto:** o `build.py` concatenava três arquivos num `<script>` e os testes só imprimiam erros. A S03 traz Vercel, PWA e o 3D sob demanda em cima desta base.

**Trade-off aceito:** publicar no Artifact exige rodar o build antes (a skill 3D já manda); o HTML do Artifact passa de 0,56 MB para 1,07 MB porque o three (≈ 0,6 MB) vai dentro em vez de vir do jsDelivr.

---

## Decisões do protótipo (ADR-000a a ADR-000g)

Registradas na S01 a partir do histórico do `CLAUDE.md`. São anteriores ao plano de evolução; formato curto.

### ADR-000a: Visual de "estátua anatômica" (estilo Treino Mestre)
A primeira versão usava um manequim procedural (cápsulas). O Arthur quis o estilo do app Treino Mestre: figura branca/cinza musculosa, com o músculo-alvo em vermelho. Isso levou a trocar o manequim por um modelo anatômico.

### ADR-000b: Atlas anatômico fitmitwith descartado
Testado o atlas **fitmitwith-anatomy-atlas** (CC BY-SA 4.0, músculos separados). O Arthur achou "feio". O atlas fica em `third_party/` (manter `ATTRIBUTION` e `LICENSE`) e serviu de base para `tools/`.

### ADR-000c: Modelo "Male base muscular anatomy" (CharacterZone)
Escolhido o modelo do Sketchfab (CC BY 4.0), de pele contínua com relevo muscular esculpido. O Arthur baixou o `.glb` (≈ 3 MB, textura 1k). A textura de pele foi trocada por branco fosco, mantendo o normal map e o AO, o que dá o visual de estátua. **Aprovado.** O rodapé exige o crédito (ver [Exercicios-3D](../claude/Exercicios-3D.md)).

### ADR-000d: Um único modelo para todos os exercícios, e menu antes do 2º exercício
O mesmo boneco serve a todos ("usando o mesmo modelo de boneco"). O menu de exercícios foi criado antes de adicionar o segundo exercício, a pedido do Arthur.

### ADR-000e: Supino inclinado refeito pelo briefing novo
A primeira versão tinha uma sequência de sentar com os halteres nas coxas e deitar antes dos 7 frames de movimento. Foi refeita para 9 frames só do movimento, com pegada pronada e as vistas Lateral/Frontal/45°/Anatomia (parâmetros atuais em [Exercicios-3D](../claude/Exercicios-3D.md)).

### ADR-000f: Artifact único, tudo inline, GLB publicado como `.wasm`
O host do Artifact só serve tipos web padrão e scripts de CDNs permitidos: o HTML tem CSS e JS inline, o Three.js r128 vem do jsDelivr em versão fixa, e o binário GLB é publicado com o nome `body-model.wasm`. Substituída pelo plano de evolução (ADR-002/011) quando o app sair do Artifact. Desde a S02 (ADR-015) o three vai empacotado no arquivo único, sem CDN.

### ADR-000g: Tema claro como padrão
O tema padrão é **claro**, mesmo com o celular em modo escuro; a escolha fica no aparelho (`localStorage['mt3d.theme']`) e é aplicada antes do conteúdo, sem piscar.
