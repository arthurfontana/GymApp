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

**Decisão:** `CLAUDE.md` vira um índice enxuto (teto de 450 linhas, guard no CI); a documentação normativa fica em `docs/wiki/` (sincronizada com a Wiki); o detalhe de implementação, em `docs/claude/`; e há âncoras de região nos arquivos grandes (`app3d.js`, `treino.js`). Segue as skills `especificacao-e-sessoes` e `guardrails-de-contexto`.

**Contexto:** o `CLAUDE.md` tem 52 KB (cerca de 13 mil tokens) e cresce a cada exercício, como um changelog.

---

## ADR-013: Dois projetos Supabase (dev e prod) e preview por PR

**Decisão:** `gymapp-dev` (previews da Vercel) e `gymapp-prod` (dados reais). As sessões do Claude Code testam contra um Supabase **local** (CLI + Docker, ou Postgres local com shim) e o CI roda o Supabase completo. Migrations entram no dev automaticamente após o merge e no prod pelo workflow `db-deploy.yml`, com aprovação. A importação do Arthur também é um workflow com aprovação. Nenhuma sessão recebe a chave de produção, e nenhum log imprime segredo (o repositório é público).

---

## ADR-014: Login obrigatório para tudo, incluindo a biblioteca 3D

**Decisão:** sem login, só as telas Entrar e Convite. A biblioteca 3D também exige login.

**Contexto:** o pedido foi "biblioteca disponível para todo mundo" **que está logado**. Abrir a biblioteca 3D sem login seria possível (o catálogo é código), mas é uma decisão de produto.

**Trade-off aceito:** não dá para mostrar um exercício a quem ainda não tem convite. Pergunta em aberto P3 no [Roadmap](Roadmap-e-Sessoes): se o Arthur quiser, uma ADR nova abre `#biblioteca` e `#<exercício>` ao público.
