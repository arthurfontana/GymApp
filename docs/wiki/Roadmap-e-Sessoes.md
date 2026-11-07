# Roadmap e Sessões

18 sessões incrementais, mais a S00 (análise e plano, concluída). Cada sessão termina com o app funcionando, testes verdes, commit, push e PR. **Uma sessão = um PR.** O Arthur revisa (de preferência no preview da Vercel, no celular) e faz o merge.

## Quadro geral

| # | Sessão | Modelo | Entrega verificável | Depende de | Status |
|---|---|---|---|---|---|
| 00 | [Análise e plano](S00-analise-e-plano) | — | Esta documentação | — | ✅ |
| 01 | [Guardrails de contexto](S01-guardrails-de-contexto) | Sonnet 5.5 | `CLAUDE.md` ≤ 450 linhas com mapa "onde vive o quê"; guard no CI; âncoras; nada perdido | 00 | ⬜ |
| 02 | [Build com Vite e testes com assert](S02-build-vite-e-testes) | Opus 5.5 | `npm run dev` abre o app idêntico; e2e falham sozinhos em erro; Artifact ainda publicável | 01 | ⬜ |
| 03 | [Vercel, PWA e CI](S03-vercel-pwa-ci) | Sonnet 5.5 | App atual no ar em `*.vercel.app`, instalável no celular; CI verde em todo PR; 3D sob demanda | 02 | ⬜ |
| 04 | [Supabase: schema, RLS e testes](S04-supabase-schema-rls) | Opus 5.5 | Migrations aplicadas no dev; pgTAP prova "cada um vê só o seu"; deploy de migrations em prod com aprovação | 03 | ⬜ |
| 05 | [Login por convite e perfil](S05-login-convite-perfil) | Sonnet 5.5 | Arthur (admin) entra; pessoa convidada cria login pelo link; perfil salvo na nuvem | 04 | ⬜ |
| 06 | [Dados na nuvem e fila offline](S06-dados-nuvem-offline) | Opus 5.5 | Treinos e sessões de cada um na nuvem; sessão inteira sem internet sem perder série | 05 | ⬜ |
| 07 | [Biblioteca compartilhada e conta vazia](S07-biblioteca-compartilhada) | Sonnet 5.5 | Conta nova vazia → escolhe programa da biblioteca → treina | 06 | ⬜ |
| 08 | [Importação do histórico do Arthur](S08-importacao-arthur) | Opus 5.5 | Arthur entra na produção e encontra treinos, conjuntos, sessões e mesmos pontos | 07 | ⬜ |
| 09 | [Virada: Artifact congelado e skill atualizada](S09-virada-artifact) | Sonnet 5.5 | Artifact mostra o endereço novo; exercício novo publica via push/Vercel | 08 | ⬜ |
| 10 | [Motor de pontuação puro (fuso explícito)](S10-motor-pontuacao-puro) | Opus 5.5 | `core/pontuacao.js` idêntico ao v21 (golden) e independente do fuso | 06 | ⬜ |
| 11 | [Pontuação no servidor](S11-pontuacao-servidor) | Opus 5.5 | Pontos oficiais gravados pelo servidor; cron diário; limites de plausibilidade | 10, 08 | ⬜ |
| 12 | [Telas de ranking](S12-telas-ranking) | Sonnet 5.5 | Todos veem posição e pontos de todos (Liga, Semana, Geral) e o cartão do participante | 11 | ⬜ |
| 13 | [Administração: convites e usuários](S13-admin-convites-usuarios) | Sonnet 5.5 | Arthur convida, desativa e redefine senha pelo celular | 12 | ⬜ |
| 14 | [Editor da biblioteca](S14-editor-biblioteca) | Sonnet 5.5 | Arthur publica treino/programa a partir dos dele; aviso de versão nova | 13 | ⬜ |
| 15 | [Privacidade (LGPD)](S15-privacidade-lgpd) | Sonnet 5.5 | Termos, baixar meus dados, excluir conta | 13 | ⬜ |
| 16 | [Auditoria de segurança antes de convidar](S16-auditoria-seguranca) | **Fable 5.1** | Relatório + correções; nenhum vazamento entre contas; pronto para convidar | 14, 15 | ⬜ |
| 17 | [Minha evolução](S17-minha-evolucao) | Sonnet 5.5 | Gráficos por exercício e de peso corporal | 16 | ⬜ |
| 18 | [Competições com período](S18-competicoes) | Opus 5.5 | Arthur cria "Desafio de dezembro"; ranking do período e pódio | 16 | ⬜ |

## Por que cada modelo

Mapeamento dos tiers da skill `especificacao-e-sessoes` para a família vigente (Claude 5, 11/2026). Preço por milhão de tokens (entrada/saída) na API: **Fable 5.1** US$ 10/50 · **Opus 5.5** US$ 4/20 · **Sonnet 5.5** US$ 2/10 · **Haiku 5.5** US$ 0,10/0,50. No plano do app, modelos maiores gastam o limite de uso mais rápido.

| Tier | Modelo | Id | Sessões |
|---|---|---|---|
| Máximo+ (topo vigente) | **Claude Fable 5.1** | `claude-fable-5-1` | 16 |
| Máximo | **Claude Opus 5.5** | `claude-opus-5-5` | 02, 04, 06, 08, 10, 11, 18 |
| Intermediário | **Claude Sonnet 5.5** | `claude-sonnet-5-5` | 01, 03, 05, 07, 09, 12, 13, 14, 15, 17 |
| Econômico | **Claude Haiku 5.5** | `claude-haiku-5-5` | tarefas avulsas fora do plano (atualizar `data/`, corrigir texto, renomear) |

**Opus 5.5 (02, 04, 06, 08, 10, 11, 18)**: são as sessões em que um erro **não aparece na hora** e custa caro. A 02 tem acoplamentos implícitos entre scripts concatenados num só (variáveis globais, pontos.js colado dentro do treino.js). A 04 e a 18 tratam de regras de acesso: um furo vaza dado de saúde em silêncio. A 06 lida com fila offline e conflito entre aparelhos, onde o modo de falha é perder séries do usuário. A 08 migra dados reais uma única vez. A 10 e a 11 exigem paridade numérica, fuso e idempotência: um erro muda os pontos de todos.

**Fable 5.1 (16)**: a auditoria antes de abrir para outras pessoas é revisão adversarial transversal (RLS, funções, XSS, segredos, limites). Um furo deixado ali expõe todos os participantes. É a única sessão em que vale pagar cerca de 2,5× o Opus.

**Sonnet 5.5 (01, 03, 05, 07, 09, 12–15, 17)**: transcrição de contrato já fechado nestas páginas, composição de telas sobre padrões consolidados e integrações ponto a ponto (Vercel, PWA, Auth do Supabase com SDK pronto). Todo prompt Sonnet tem a válvula: **se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**

**Haiku 5.5**: nenhuma sessão do plano. Use para tarefas mecânicas avulsas.

> Na dúvida entre dois tiers, suba. Re-executar uma sessão corrompida custa mais que a economia.

## Marcos utilizáveis

| Marco | Após | O que já dá para fazer de verdade |
|---|---|---|
| **M0 — No ar** | S03 | O app atual abre no celular em `https://<projeto>.vercel.app`, instalável, ainda sem login (dados no aparelho). O Artifact continua sendo o app do dia a dia |
| **M1 — Contas** | S07 | Pessoas convidadas entram, encontram a biblioteca, escolhem um programa, treinam (inclusive sem sinal) e o histórico fica na conta delas (ambiente dev/preview) |
| **M2 — Virada** | S09 | O Arthur treina só no app novo, em produção, com todo o histórico. Exercício 3D novo é publicado via push |
| **M3 — Ranking** | S12 | Todos veem a posição e a pontuação de todos, com pontos calculados no servidor |
| **M4 — Aberto aos amigos** | S16 | O Arthur convida e administra pelo celular, publica treinos na biblioteca; privacidade e segurança auditadas |
| **M5 — Evolução e competições** | S18 | Gráficos de evolução e desafios com período |

## Regras transversais (valem para TODAS as sessões)

1. **Verificações verdes no fim**: `npm run check` (= `check:claude-md` + `test` + `build`) e `npm run test:e2e`; a partir da S04, também `npm run test:db`. Antes da S02 (estrutura `web/`): `cd web && python3 build.py` e os testes de `web/tests/` sem erro de JS e com largura 390.
2. **Escopo é escopo**: não implementar sessão futura "já que está aqui". O que ficou de fora vai para "Fora do escopo" nomeando a sessão.
3. **Dependências**: só as da lista de [Arquitetura](Arquitetura) §7. Outra qualquer: pergunte antes.
4. **Documentação viva no mesmo PR**: páginas `Funcionalidade-*` afetadas (estado, US, CT, RN), `Modelo-de-Dados.md`, `Decisoes.md` (decisões tomadas na sessão) e a linha da sessão nesta página. O `CLAUDE.md` ganha no máximo 1 linha por feature (G1).
5. **3D**: qualquer mudança em exercício ou animação segue a skill `animacao-3d-exercicio`. Não reescrever `app3d.js`.
6. **Segredos**: nunca no código, nunca em `VITE_*`, nunca em log (o repositório é público). A chave secreta do Supabase só existe nas funções `/api` (Vercel) e nos secrets do GitHub. Sessões do Claude Code testam contra o **Supabase local** (Docker com `supabase start`; fallback `npm run test:db:local`). O CI é o juiz final.
7. **Dados reais**: nada escreve em produção a partir da sessão. Migrations e importação vão por workflow do GitHub com `dry-run` antes e aprovação do Arthur no environment `producao`.
8. **Celular primeiro**: toda tela nova é testada em 390×844, claro e escuro, sem rolagem horizontal e sem erro de JS (e2e com assert).
9. **Textos** em pt-BR, curtos, sem jargão (o Arthur e os amigos leem no celular).
10. **Válvula de escape**: decisão de arquitetura não coberta pela documentação → **pare e pergunte**.
11. **Encerramento**: commit descritivo na branch de trabalho, push e PR para `main` (template do repositório, se houver). Resposta final curta ao Arthur: o que mudou, como testar no preview e o que ele precisa fazer à mão.

## Ordem e dependências

- **01 antes de tudo**: o `CLAUDE.md` de 52 KB é carregado em toda sessão. Reorganizar em camadas antes barateia as 17 sessões seguintes e cria o mapa que os prompts usam.
- **02 → 03**: sem bundler não há variáveis de ambiente, divisão de código nem PWA. Fazer o deploy cedo (M0) dá ao Arthur um preview no celular em todo PR dali em diante.
- **04 → 05 → 06 → 07** não é negociável: login precisa do schema; os dados na nuvem precisam do usuário; a biblioteca compartilhada precisa do store novo para copiar programas.
- **08 só depois da 07**: a importação usa a biblioteca já semeada (origem dos treinos do Arthur). **Antes da 08, atualize `data/`** a partir do Artifact, porque o Arthur continua treinando lá.
- **10 pode rodar em paralelo à 07–09** (só depende da 06). A **11 espera a 08**, para validar os pontos com o histórico real.
- **16 antes de convidar qualquer pessoa de fora**. Até lá, só contas de teste e o Arthur.
- **17 e 18 são opcionais** e independentes entre si.

## Perguntas em aberto (para o Arthur)

| # | Pergunta | Recomendação | Afeta |
|---|---|---|---|
| P1 | Login por **link de convite + e-mail e senha** (sem e-mail automático) está bom? Alternativa: código por e-mail (exige configurar um SMTP, ex.: Gmail com senha de app) | Convite + senha (ADR-005) | S05 |
| P2 | Nome e endereço do app na Vercel (ex.: `meutreino3d.vercel.app`)? Domínio próprio? | Começar com `*.vercel.app` | S03 |
| P3 | A biblioteca 3D deve abrir **sem login** (para mostrar exercícios a quem não tem convite)? | Não, por enquanto (ADR-014) | S05 |
| P4 | As 4 sessões de 07/11/2026 (uma de 1 minuto) eram testes? Ficam no histórico e nos pontos? | Perguntar na S08 | S08, S11 |
| P5 | Quantas pessoas no início? (dimensiona o teste de carga da S16) | Até 20 | S16 |
| P6 | Ficou pendente desde antes: o briefing da puxada alta veio duplicado. Foi engano ou a barra deve parar mais alto? | — | skill 3D |
