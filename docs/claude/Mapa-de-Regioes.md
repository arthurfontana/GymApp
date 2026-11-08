# Mapa de regiões

Os arquivos grandes de `web/` têm âncoras `// #region: <slug>` no início de cada bloco lógico (sem par de fechamento; só comentário, nenhuma mudança de código). **A fonte da verdade é o grep**; este mapa só orienta por arquivo + slug (não lista números de linha, que se deslocam).

```bash
grep -n "#region:" web/*.js              # todas as âncoras, com arquivo e linha atual
grep -n "#region: ex-" web/app.js        # só os exercícios
```

Padrão do slug: kebab-case; `ex-<const>` para cada exercício (a const em minúsculas, igual às de [Exercicios-3D](Exercicios-3D.md)). Ao criar um bloco novo, ponha a âncora no início e uma linha aqui.

## `web/app.js` — biblioteca 3D (motor + exercícios)

| Slug | O que tem (principais nomes) |
|---|---|
| `utilitarios` | início do IIFE: `stage`, `host`, `V`, `DEG`, `css`, `reduce`, `lin`, `sstep`, `ease`, `$` |
| `renderer-cena` | `renderer`, `scene`, `camera`, `controls`, luzes, `mats` (materiais), `meshIn`, `railIn`, `ik`, `lineIn` |
| `rig-esqueleto` | `LM` (pontos anatômicos), `L()`, `LEN`, `BI`, `bi()`, `NB` (27 ossos) |
| `cinematica` | `torsoQ`, `torsoBones`, `armBones`, `legBones`, `kneeAngle`, `hingeQ`, `slerpQ`, `curlQ` |
| `pesos-deformacao` | `weightsFor`, `segInfo` (pesos contínuos ao longo das cadeias) |
| `mascaras` | `masks()` e `MASK` (regiões musculares por máscara geométrica; `band`, `arcBand`) |
| `carga-modelo` | `buildBody` (malha, olhos, skin e rig) |
| `utils-peso-do-corpo` | `wristBend`, `mkMatBW`, `mkArcBW`/`setArcBW`, `fkSag`, `errAmt` (cabeçalho do exercício 1 vem antes deles) |
| `ex-sup` … `ex-lng` | um por exercício, na ordem do arquivo: `ex-sup` (SUP, começa em `const SUP`), `ex-lpx`, `ex-row`, `ex-stf`, `ex-lat`, `ex-tri`, `ex-plk`, `ex-gob`, `ex-pdn`, `ex-flx`, `ex-rsc`, `ex-clf`, `ex-chp`, `ex-hpt`, `ex-sql`, `ex-gmn`, `ex-kpu`, `ex-wpu`, `ex-brg`, `ex-dbg`, `ex-bdg`, `ex-lng` |
| `exs-registro` | `EXS` (hash → exercício), `EXC`, `window.__EX_IDS` |
| `tema` | `applyTheme` (observa `data-theme`) |
| `cameras` | `viewPose`, `setView` |
| `reproducao` | estado de reprodução, `mountExercise`, `setPlaying`, `scrub`, `buildTicks`, `syncToggles`, `resize` |
| `cores-musculares` | `paintMuscles` |
| `loop` | `frame`, `boneMatrix`, `declutter`, `BM`; leitura de readouts e HUD |
| `mini` | `mini`, `miniOff`, `window.__mini` (prévia na sessão), `loop()` |
| `enter-exercise` | `window.__enterExercise` |
| `carga-modelo-fetch` | `loadFail` e o `fetch('body-model.wasm')` + `GLTFLoader.parse` |
| `ganchos-teste` | `window.__go`, `__parts`, `__EXC` (só com `__TEST__`) |

## `web/treino.js` — jornada (IIFE; `pontos.js` entra no marcador `/*@@PONTOS@@*/`, entre `progressao` e `render`)

| Slug | O que tem |
|---|---|
| `utilitarios` | `esc`, `fmtKg`, `mmss`, `hhmm`, `uid`, `clone`, `dataCurta`, `haQuanto` |
| `lib-catalogo` | `LIB` (exercícios com 3D: `eq`, `eqTxt`, `lado`, `semCarga`), `GRUPOS`, `EQ` |
| `estado` | `S` (dados), `ui` (tela), `LS` (localStorage) |
| `armazenamento` | `put`, `del`, `flush`, `initStore`, `saveLocal` (db do Artifact ou localStorage; fila por documento) |
| `migracao` | `migrar` (config/programa → `conjuntos/academia`) |
| `derivados` | `treinosOrd`, `sessoesFeitas`, `sessaoAtiva`, `ultimaVez`, `conjuntosOrd`, `proximoTreino`, `proximaLetra`, tags de equipamento, `estimaMin`, `volumeSessao`, `faixa`/`rotFaixa` |
| `progressao` | `sugestao`, `prefill` |
| `render` | `schedule`, `render` |
| `tema` | botão e troca de tema claro/escuro |
| `biblioteca-menu` | `enfeitaBiblioteca` (tags e filtro no menu fixo de exercícios) |
| `icones` | `icon` (SVGs) |
| `componentes-home` | `vAquecLista`, `vStatus`, `heroAtivo`, `histRow`, `footNote`, `libCard` |
| `v-inicio` | `vInicio` (lista de conjuntos) |
| `v-conjunto` | `vConjunto` |
| `ficha-semana` | `segundaDe`, `semanaPrograma`, `vFicha` |
| `v-bib` | `vBib` (aba Treinos) |
| `v-treino` | `vTreino` |
| `sessao-viva` | `exAtual`, `proxPendente`, `proxCircuito`, `aqPasso` |
| `v-sessao` | `vSessao` (descanso, aquecimento, exercício atual) |
| `v-como-fazer` | `vComoFazer`, `mountMini`, `stepper` |
| `v-resumo` | `vResumo` |
| `pilula` | `livePill` |
| `relogio` | `beep`, `tick`, `keepAwake` |
| `folhas` | `openSheet`, `closeSheet`, `confirmSheet` |
| `folhas-edicao` | `sheetItem`, `sheetAdd`, `sheetTreino`, `novoTreino`, `duplicarTreino`, `excluirTreino`, `sheetConjunto`, `sheetAddTreino` |
| `acoes-sessao` | `iniciar`, `mutS`, `lerDraft`, `concluirSerie` |
| `eventos` | delegação de cliques, `finalizar`, `sheetSet` |
| `roteador` | `VIEWS`, `route` (hash) |

## `web/pontos.js` — pontuação (colado no `treino.js` pelo build)

| Slug | O que tem |
|---|---|
| `px` | tabela `PX` (pts/rep `r`, `s`, `ref`, `met`) e seu comentário |
| `regras-constantes` | `MET_*`, `P_*`, `LIGAS`, `TITULOS`, `xpNivel`, `nivelDe`, `ligaDe` |
| `regras-pontuacao` | `perfil`, `pxDe`, `fCarga`, `ptsSerie`, `marcaDe`, `tempos`, `pontuar` |
| `semanas-fichas` | `proxSeg`, `segAntes`, `fichasDe`, `semanaN`, `camDa` |
| `desafios-conquistas` | `DESAFIOS`, `desafiosDa`, `CONQ` |
| `jogo` | `stVazia`, `jogo()` (recalcula tudo das sessões; `G` zera no `render`) |
| `estimativas` | `pontosAoVivo`, `estimaPts` |
| `formatacao` | `fmtN`, `fmtTon`, `comparacao` |
| `icones` | `gic`, `gIcon`, `ligaIc` |
| `telas-placar` | `vPlacarCard` |
| `telas-jornada` | `vJornada`, `vRegras` (`#pontos`) |
| `intensidade-tag` | `intensTag` |
| `telas-resumo` | `vPontosResumo` |
| `animacoes` | `animaResumo`, `confete`, `voaPontos` |
| `perfil` | `sheetPerfil` |
