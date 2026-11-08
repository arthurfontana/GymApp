---
name: animacao-3d-exercicio
description: Cria ou altera a animação 3D de um exercício no Meu Treino 3D a partir do descritivo/briefing do Arthur. Use SEMPRE que ele enviar a descrição de uma animação, um briefing de exercício ou pedir um exercício novo ou ajuste na execução 3D.
---

# Animação 3D de exercício (Meu Treino 3D)

Cada briefing do Arthur vira **um exercício novo** na biblioteca, no mesmo padrão dos 22 existentes. Não invente outro formato: copie a estrutura de um exercício parecido e adapte.

## 0. Antes de começar
1. Leia `docs/claude/Motor-3D.md` (coordenadas do mundo, rig, músculos, "Estrutura de um exercício") e o exercício-modelo em `web/app.js`.
2. Escolha o modelo mais parecido:
   - **Sem equipamento, alterna lado:** `DBG` (dead bug), `BDG` (bird dog), `LNG` (afundo)
   - **Isométrico (sustentação):** `PLK` (prancha), `BRG` (ponte), `HPT` (hip thrust)
   - **Máquina com cabo e placas:** `ROW`, `PDN`, `TRI`, `CHP` · **Máquina articulada:** `LPX`, `FLX`, `CLF`
   - **Halteres em pé:** `STF`, `LAT`, `RSC`, `GOB` · **Banco:** `SUP`, `HPT`
3. Se o briefing for ambíguo ou contraditório em algo que muda a biomecânica (ângulos, lado, equipamento), pergunte **uma** vez antes de construir. Se for só detalhe, decida e avise no fim.

## 1. O que o briefing traz (extrair para um quadro antes de codar)
Objetivo · equipamento · posição inicial · execução (excêntrica/concêntrica) · **9 frames** · músculos principais (vermelho), secundários (laranja), estabilizadores (amarelo) e demais cores · 3 câmeras (+ extras: Superior, 45°, Posterior, Close) · erros comuns · duração · elementos didáticos (arcos, linhas, rótulos) · restrições de qualidade.

## 2. Padrões obrigatórios
- **Mesmo boneco** e mesmo rig para todos. Pessoa com cabeça para −X, pés para +X, lado direito = +Z. Usar `torsoQ/torsoBones/armBones/legBones`, `fkSag`, `wristBend`, `mkMatBW`, `mkArcBW/setArcBW`, `errAmt`.
- **Biomecânica real, sem atalhos:** ângulos articulares dentro do possível, **sem hiperextensão nem articulação travada**, pés/mãos plantados onde apoiam (sem deslizar), nada flutuando, sem arco exagerado, sem contração muscular exagerada. Equipamento coerente (cabo esticado, placas subindo o mesmo que o cabo, anilhas, pegadores acompanhando a mão).
- **9 frames** em `keys` com `t`, `title` (curto), `d` (1 frase) e `ph:'ecc'|'conc'` quando couber. `T_END` e `loopStart` definidos; isométrico usa fase `iso`.
- `phase(J)` devolve `{kind,label,cue}`; `update()` devolve os **readouts** (ângulos medidos de verdade, com `s:'ok'|'warn'`).
- **Vistas:** Lateral, Frontal e Anatomia sempre; Superior/45°/Posterior/Close só se o briefing pedir (`views.superior|diagonal|posterior|detalhe`). `portrait` para o celular. Equipamento que tapa o corpo fica translúcido nas vistas Frontal/Anatomia.
- **Músculos** por máscaras (`masks()`); criar máscara nova só se faltar. Profundos só na legenda. Cores por grupo (`groups`) e `m.col` quando o briefing definir. `muscleTarget` varia a intensidade por fase. Texto sempre deixa claro que a cor é didática, **não EMG**.
- **Erros comuns** (`ERR`, 6 a 10): cada um com `name` e `fix`; aplicar via `errAmt` (uma repetição errada em vermelho + uma corrigida em verde). Exercício que alterna lado define `flipSide()` e `sideLabel()`.
- **Textos em pt-BR**, títulos curtos, descrição de frame em 1 frase, sem jargão desnecessário. Sem equipamento: `openHands:true`.
- Não editar as classes CSS da biblioteca (`.badge`, `.tags`, `.card`, `.btn`, `.num`, `.ef`): usar as existentes.

## 3. Pontos de integração (esquecer um quebra o app)
| Onde | O que |
|---|---|
| `web/app.js` | objeto do exercício `const XYZ=(function(){…})();` antes de `const EXS=`; registrar `'id-do-exercicio':XYZ` em `EXS` (isso alimenta `__EX_IDS` e o roteador) |
| `web/index.html` (menu, `<main id="menuView">`) | card `<a class="ex" href="#id">` no grupo muscular certo, com número sequencial, nome, `badge` e 2 chips; renumerar se inserir no meio |
| `web/treino.js` → `LIB` | `{nome, grupo, foco, passo?, porHalter?, principal?, semCarga?, tipo?:'tempo', lado?, eq:[...], eqTxt}` |
| `web/pontos.js` → `PX` | `r`/`s`, `ref` e `met` decididos pela régua da **seção 3a** (obrigatório) |
| `docs/claude/Exercicios-3D.md` (seção numerada) | item numerado novo com parâmetros, vistas, cores, tempo (T_END) e erros; atualizar contagem (N exercícios, N sem equipamento) e o "Menu" |
| `web/tests/mini.mjs` | incluir o id para a prévia do cartão |

Depois de editar: `cd web && python3 build.py` (**nunca** editar o `<script>` de `index.html` na mão).

## 3a. Lógica de pontuação do exercício novo (decidir e gravar em `PX`, `web/pontos.js`)
Todo exercício entra na biblioteca **já com pontos**. Decida os três números abaixo com esta régua, para os novos ficarem justos em relação aos 22 atuais. Se o exercício ficar sem entrada em `PX`, o app usa um valor genérico (1,5 pt/rep) e ele deixa de ser comparável.

**`r` — pontos por repetição** (massa muscular envolvida + exigência do movimento):
| Perfil do exercício | `r` | Intensidade | Exemplos atuais |
|---|---|---|---|
| Composto de pernas/quadril, grande massa, com carga | 2,6 – 3,0 | 5 | leg press 3,0 · goblet 2,8 · stiff 2,6 · hip thrust 2,6 |
| Composto de tronco superior com carga | 2,0 – 2,2 | 4 | supino halteres 2,2 · supino máquina/remada/puxada 2,0 |
| Multiarticular com peso do corpo, ou perna isolada de média massa | 1,6 – 1,8 | 3 | afundo 1,8 · agachamento livre/flexão com joelhos/mesa flexora 1,6 |
| Monoarticular, pouca massa | 1,2 | 2 | panturrilha · elevação lateral · tríceps · rosca |
| Estabilidade, mobilidade ou peso do corpo muito leve | 0,7 – 1,0 | 1–2 | ponte 1,0 · flexão na parede/bom dia 0,8 · bird dog/dead bug 0,7 |

Ajuste fino: +0,2 se a amplitude for grande ou o equilíbrio exigir muito; −0,2 se o aparelho guiar todo o movimento. Intensidade (1–5) é calculada sozinha a partir de `r`. Exercícios **por lado/perna** têm `lado` no `LIB` (as repetições contam duas vezes), então **não** dobre `r`.

**`s` — pontos por segundo**, só para isométricos medidos em tempo (`tipo:'tempo'`): use `s:.5` (prancha) e **no lugar de `r`**. Sustentação mais fácil: `.4`.

**`ref` — carga de referência em fração do peso corporal** (só para exercícios com carga): a carga **total** (halteres somados) que um praticante intermediário usa em 8–12 repetições ÷ peso corporal. Com ela, carga igual à referência vale fator 1; o fator é √(carga ÷ (ref × peso)) limitado entre 0,5 e 2. Referências atuais: leg press 1,2 · hip thrust/panturrilha 1,0 · remada/puxada 0,7 · supino máquina 0,6 · stiff 0,5 · mesa flexora 0,45 · supino halteres 0,45 · goblet 0,3 · tríceps 0,3 · rosca 0,25 · elevação lateral 0,2. Exercício só com peso do corpo (`semCarga:true`): **sem `ref`**.

**`met` — gasto energético** (Compendium of Physical Activities 2024, base das calorias = MET × peso × tempo ativo): 5,0 agachamento/terra e composto grande de pernas (02052) · 3,5 musculação em geral (02054) · 3,8 calistenia moderada (02022) · 2,8 calistenia leve, isométrico e mobilidade (02024).

**Formato da entrada:** com carga `'id':{r:2.0,ref:.6,met:3.5}` · peso do corpo `'id':{r:1.6,met:3.8}` · tempo `'id':{s:.5,met:2.8}`.

**Conferência dos pontos:** abra o exercício na biblioteca (selo de intensidade no card), a tabela da página "Regras" em Minha jornada e "Adicionar exercício". Compare com um parecido: uma série de 10 reps com a carga de referência deve valer perto de `10 × r`. No fim, informe ao Arthur os três valores escolhidos e por quê, em uma linha.

## 4. Verificação (obrigatória antes de dizer que está pronto)
1. `cd web && npm run serve` em segundo plano; `node tests/ex.mjs '[{"name":"lat0","t":0,"v":"lateral"},{"name":"lat1","t":<meio>,"v":"lateral"},{"name":"fr","t":<meio>,"v":"frontal"},{"name":"an","t":<meio>,"v":"anatomia"},{"name":"err","t":<t>,"v":"lateral","err":"<id>"}]' <id> <prefixo>` e **olhar os prints** (`web/out/`): início, meio e fim de cada vista, e pelo menos um erro.
2. Conferir pelos readouts se os ângulos batem com o briefing; sem travar joelho/cotovelo; sem interpenetração; apoios fixos.
3. `node tests/mini.mjs` (prévia no cartão), `node tests/mob.mjs` (celular 390×844, claro e escuro, **overflow = 390**), `node tests/jor.mjs light` e `node tests/gam.mjs light` (regressão: erros JS = `[]`).
4. Conferir que o exercício aparece em "Adicionar exercício" e na tabela de intensidade das regras.

## 5. Entrega
- Atualizar `docs/claude/Exercicios-3D.md`, commitar (`feat: exercício <nome>`) e dar push.
- **Publicar no mesmo Artifact** (URL e passos em `docs/claude/Build-e-Publicacao.md`): `Artifact read` na URL, depois publicar `web/index.html` com `files={"body-model.wasm":"web/body-model.wasm"}`.
- Resposta final ao Arthur, em pt-BR curto: o que foi criado (nome, grupo, vistas, nº de erros), decisões tomadas onde o briefing era aberto, pontos/intensidade escolhidos. Sem relatório de passos.
