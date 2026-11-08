# Sessão 00 — Análise do protótipo e plano de evolução

**Depende de:** — · **Marco:** preparação · **Status:** ✅ concluída (07/11/2026)

> Registro desta sessão (log). Retrato do protótipo **v21** no momento da análise. As páginas normativas descrevem o estado atual e desejado; esta página não é atualizada depois.

## Pedido

Transformar o protótipo (Artifact do claude.ai, um usuário) num app web para celular publicável na Vercel, com:

- logins criados pelo Arthur e acesso para outras pessoas;
- ranking e competição entre os logados;
- conta nova começando vazia, só com a biblioteca;
- biblioteca de exercícios e de treinos sempre disponível para todos;
- perfil e histórico de evolução próprios;
- todos vendo a posição e a pontuação de todos.

Skills usadas: `especificacao-e-sessoes` (fluxo, templates de página, roadmap e prompt de sessão, critério de modelo) e `guardrails-de-contexto` (diagnóstico do `CLAUDE.md`, plano de camadas), do repositório `arthurfontana/skills`.

## 1. Retrato do protótipo v21 (números)

| Peça | Tamanho | Papel |
|---|---|---|
| `web/app.js` | 4.827 linhas · 366 KB | 3D: renderer, rig de 27 ossos, máscaras musculares, 22 exercícios (`SUP`…`LNG`), câmera, prévia `__mini` |
| `web/treino.js` | 925 linhas · 89 KB | Jornada: `LIB`, store (db/localStorage), 12 telas, sessão ao vivo, folhas, roteador por hash |
| `web/pontos.js` | 355 linhas · 35 KB | Gamificação (`PX`, `jogo()`, ligas, desafios, 20 conquistas, calorias); colado **dentro** do `treino.js` pelo build |
| `web/treino.css` | 492 linhas · 39 KB | Estilos da jornada |
| `web/index.html` | 559 KB (gerado) | ≈ 68 KB de casca (CSS do 3D + menu HTML da biblioteca) + scripts; **sem `<!doctype>`/`<html>`/viewport** (o Artifact embrulha) |
| `web/body-model.wasm` | 4,15 MB | Modelo GLB (CharacterZone, CC BY 4.0) com outra extensão porque o Artifact não serve `.glb` |
| `web/tests/*.mjs` | 23 scripts | Playwright: geram prints e **imprimem** erros e largura; não falham sozinhos |
| `CLAUDE.md` | 52 KB (≈ 13 mil tokens) | Contexto completo, crescendo a cada exercício como changelog |
| Dados (`data/`) | 2 conjuntos, 4 treinos, 5 sessões | 4 sessões concluídas em 07/11/2026 (uma de 1 minuto, parecem testes) + 1 em andamento |

## 2. Pontos fortes (o que reaproveitar)

1. **Costura limpa entre 3D e jornada.** O `treino.js` não usa nenhum identificador do `app.js`; só `window.__EX_IDS`, `window.__mini`, `window.__enterExercise`. Dá para trocar a casca (build, login, dados) sem tocar em 4.800 linhas de 3D validadas.
2. **Armazenamento já isolado.** Tudo passa por `put/del` (fila por documento, escrita otimista, junta edições) e `initStore()` (snapshots). Já existem dois modos (db e local). Um backend novo é um **adaptador**, não uma reescrita.
3. **Pontuação "sem placar guardado".** `jogo()` recalcula tudo das sessões. É exatamente o que o servidor precisa para calcular o oficial, e já foi pensada para competição (carga relativa ao peso corporal, liga de 28 dias, escudos).
4. **Documentos JSON bem definidos** (conjunto, treino, sessão), com cópia em `data/` e seeds dos PDFs em `seed/`. A migração vira cópia direta para `jsonb`.
5. **Processo maduro para conteúdo 3D**: skill de projeto com 4 pontos de integração, régua de pontos, verificação por prints. Esse processo continua; muda só a publicação.
6. **Pronto para celular**: testes em 390×844, tema claro/escuro, Wake Lock, bipes, prévia 3D na sessão.

## 3. Dívidas e riscos para virar multiusuário

| # | Achado | Impacto | Onde se resolve |
|---|---|---|---|
| D1 | **Um dono só por construção**: db do Artifact com regra `read:admin, write:owner`; `config/programa` global; nenhum conceito de usuário | Impossível ter contas, perfis e ranking | S04–S06 (Supabase + RLS + adaptador) |
| D2 | **Build artesanal**: `build.py` concatena tudo num HTML de 559 KB; three r128 global por CDN; sem bundler | Sem variáveis de ambiente, sem divisão de código: login e ranking baixariam 4 MB de 3D | S02–S03 (Vite, import sob demanda) |
| D3 | **Pontuação presa ao estado global e ao fuso do aparelho** (`S`, `G`, `segundaDe` com `getDay()`, conquistas por `getHours()`) | No servidor (UTC), sessões de domingo à noite cairiam na semana seguinte; a sequência e os desafios mudariam | S10 (módulo puro, fuso explícito, golden) |
| D4 | **Pontos calculados no aparelho** | Em ranking, qualquer pessoa poderia forjar o placar | S11 (servidor grava, cliente só lê) |
| D5 | **Dados declarados** (reps e carga digitadas) | Erro de digitação ou exagero distorce o ranking | S11 (limites de plausibilidade, `REGRA_VERSAO 2`) + administrador pode ocultar |
| D6 | **Treinos do Arthur fazem papel de biblioteca**; não existe "modelo publicado" separado de "treino da pessoa" | Não dá para oferecer o programa sem levar os dados dele | S07 (`biblioteca_*`, cópia com origem) |
| D7 | `migrar()` cria o conjunto "academia" quando há treinos sem conjunto | Inofensivo em conta vazia, mas é lógica de um usuário só no caminho de todos | S07 (restringir), S09 (remover) |
| D8 | **Testes só de inspeção** (imprimem, não falham) | Sem CI confiável não há como migrar o build com segurança | S02 (asserts), S03 (CI) |
| D9 | **Offline implícito**: a fila de escrita fica em memória; a garantia depende do db do Artifact | No app novo, fechar o app sem sinal poderia perder séries | S06 (fila em IndexedDB, mesclagem por série) |
| D10 | `index.html` sem documento completo, manifest e ícones | Não instala como app; a Vercel serve uma página "quebrada" | S02–S03 |
| D11 | `CLAUDE.md` de 52 KB virou changelog (viola G1) | Custo fixo em toda sessão; regras críticas diluídas | S01 |
| D12 | **Dados de saúde** (peso, medidas, treinos) | Ao abrir para outras pessoas, entra a LGPD: consentimento, exclusão, exportação | S05, S15, S16 |
| D13 | **innerHTML com dados de outras pessoas** (apelido no ranking) | Risco de XSS que não existia com um usuário só | S12 (esc obrigatório), S16 (auditoria, CSP) |
| D14 | Licenças: modelo CC BY 4.0 (crédito já no rodapé); atlas CC BY-SA em `third_party/` não vai para o app | Manter crédito no app público | S03 (rodapé preservado) |

## 4. Alternativas avaliadas (resumo)

| Tema | Escolhido | Descartado (motivo) |
|---|---|---|
| Backend | Supabase (Auth + Postgres + RLS) | Firebase (agregação do ranking e escrita confiável exigem plano pago); Neon + Auth.js (login e regras à mão); servidor próprio (custo e manutenção) |
| Front | Vite + JS puro, 3D intocado | Next.js/React (reescrita de telas e risco no 3D, ganho baixo) |
| Login | Convite por link + e-mail/senha | Código ou link mágico por e-mail (precisa SMTP próprio; link mágico falha em PWA); Google (fica para depois) |
| Pontos | Módulo puro compartilhado, oficial no servidor | Placar enviado pelo cliente (forjável); regra em SQL (duplicação de cerca de 350 linhas) |
| Biblioteca | Exercícios no código, treinos e programas no banco, adoção por cópia | Tudo no banco (3D é código); referência ao vivo (edição do modelo mudaria o treino de todos) |

Detalhe em [Decisões](Decisoes).

## 5. Riscos do plano e mitigação

| Risco | Mitigação |
|---|---|
| Migrar o build quebra algo sutil no 3D | S02 em Opus; e2e com assert antes de mexer; prints comparados; Artifact ainda publicável até a S09 |
| Perda de séries na academia | ADR-008, S06 em Opus, CTs de offline e de dois aparelhos |
| Vazamento entre contas | RLS + pgTAP desde a S04; auditoria Fable na S16 antes de convidar |
| Pontos do Arthur mudam na migração | Golden de paridade na S10; a S11 mostra o efeito dos limites; P4 decide as sessões de teste |
| Supabase Free pausa sem uso | Cron diário da Vercel faz consulta todo dia |
| Sessões do Claude Code sem rede para o Supabase | Preparação P6 (hosts + credencial do dev por formulário); fallback: testes de banco no CI |
| Arthur sem terminal | Tudo de rotina vira tela (S13, S14); os passos manuais estão em [Preparação de Contas](Preparacao-de-Contas) |

## 6. Entregas desta sessão

- `docs/wiki/` com Home, Sidebar, Visão e Escopo, Arquitetura, Modelo de Dados, 6 páginas de funcionalidade, Decisões, Roadmap, Preparação de Contas e os prompts S01–S18.
- `.github/workflows/sync-wiki.yml` (exige o passo P1).
- 1 linha de ponteiro no `CLAUDE.md` (§6) para o roadmap.
