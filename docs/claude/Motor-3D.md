# Motor 3D — stack, modelo, rig, músculos e estrutura de um exercício

Referência técnica do que fica em `web/app.js` (e o contrato de cada exercício). Para criar/ajustar um exercício, use a skill `animacao-3d-exercicio`; os parâmetros de cada um estão em [Exercicios-3D](Exercicios-3D.md); a navegação por regiões, em [Mapa-de-Regioes](Mapa-de-Regioes.md).

## Stack

- **Three.js r128** via jsDelivr (UMD): `three.min.js`, `examples/js/controls/OrbitControls.js`, `examples/js/loaders/GLTFLoader.js`. Versão fixa (`three@0.128.0`).
- Tudo num único HTML (CSS + JS inline). Fontes Google: Barlow Condensed (títulos), IBM Plex Sans (texto), IBM Plex Mono (números/rótulos).
- Restrições do Artifact: scripts só de CDNs permitidos (cdnjs, jsdelivr, unpkg…); **`.glb` não é servido** → o binário GLB é publicado com o nome `body-model.wasm` e carregado com `fetch('body-model.wasm').then(r=>r.arrayBuffer())` + `new THREE.GLTFLoader().parse(buf,'',…)`.
- Cores: tokens CSS em `:root` com tema escuro (`prefers-color-scheme` e `[data-theme]`). Cores 3D convertidas para linear: `lin = h => new THREE.Color(h).convertSRGBToLinear()`, `renderer.outputEncoding = sRGBEncoding`.


## Hooks de teste (só com `window.__TEST__`)

`window.__READY__` (modelo carregado), `window.__go(t, vista, camPos?, camTarget?, erro?)` renderiza um instante, `window.__parts(bool)`, `window.__REST__=true` (pose T), `window.__J`/`__BM`/`__bi`/`__body`.

## Modelo e rig (gerado no navegador)

- Malha `body` + olhos; escalada para 1,75 m, pés em y=0. Coordenadas do modelo (T-pose): **+Y cima, +Z anterior, +X lado esquerdo anatômico**.
- Pontos anatômicos (`LM`, em metros): pelve P[0,.90,-.03], pescoço[0,1.47,-.04], ombro Sj[.195,1.36,-.04], cotovelo E[.54,1.35,-.02], pegada G[.84,1.31,.012], MCP[.862,1.352,.015], quadril Hip[.095,.90,-.03], joelho K[.173,.47,.01], tornozelo A[.228,.085,-.01] (espelhar x para o lado direito).
- **27 ossos planos** (SkinnedMesh, `matrixAutoUpdate=false`, boneInverses identidade): 0 tronco, 1 meio-pescoço, 2 cabeça; por lado 12: meio-ombro, braço, meio-cotovelo, antebraço, antebraço-giro, dedos, meio-quadril, coxa, meio-joelho, perna, meio-tornozelo, pé. `bi(nome, m)` dá o índice (m=+1 esquerdo do modelo, −1 direito).
- Matriz de osso: `M = T(ponto_mundo)·R(q)·T(−ponto_repouso)`. "Meio-ossos" = slerp dos vizinhos; pesos contínuos (1−s)², 2s(1−s), s² ao longo de cada cadeia (`weightsFor`).
- Dedos dobrados em volta da pegada (rotação 1,85 rad em torno do MCP).
- **Mundo:** pessoa com cabeça para −X e pés para +X; lado direito da pessoa = +Z (câmera lateral fica em +Z). `s=+1` lado direito no mundo, `m=-s` lado no modelo. Tronco: `torsoQ(u,n)` = base (−Z, u, n), u = direção cabeça, n = frente do peito.
- Funções genéricas: `torsoBones(bones,qT,P,inclinaçãoCabeça)` → `mapT`; `armBones(bones,qT,s,ombro,mão,poloCotovelo,normalDaPalma)` → {E,qFT}; `legBones(bones,qT,s,quadril,tornozelo,poloJoelho,qPé)` → K. IK de dois ossos com vetor polo.


## Utilidades do motor

  - **Lados alternados**: o exercício define `flipSide()` e `sideLabel()`; o motor troca o lado a cada volta do loop e mostra o chip "Lado: … ⇄" (`#tSide`) para trocar na hora.
  - **Utilidades novas no `app.js`** (antes do supino): `wristBend(BM,m,a)` (a>0 = extensão do punho; usado para mão espalmada no chão/parede), `mkMatBW` (colchonete), `mkArcBW/setArcBW` (arcos), `fkSag(A,al,th,sag)` (cinemática sagital canela/coxa), `errAmt(errMode,t,T_END)`. Flag `openHands` desliga a curvatura dos dedos.

## Músculos

- Regiões pintadas por **máscaras geométricas** na T-pose (`masks()`): faixas de altura/largura + direção da normal no tronco; nas pernas, posição ao longo do eixo coxa/perna + ângulo em volta do eixo (0° frente, +90° lateral, ±180° trás, −90° medial).
- IDs existentes: tronco/braço `bicLong, bicShort, gastroMed, gastroLat, fibular, aquiles, sartorio, gracil, popliteo, redondo, tricLong, tricLat, tricMed, anconeo, extAnte, deltLat, supra, flexAnte, latissimo, trapSup, trapMed, trapInf, romboides, eretor, deltPost, braquial, braquiorradial, pecClav, pecEst, deltAnt, triceps, biceps, reto, obliquos, serratil, trapezio, manguito, gluteos, gluteoMed`; pernas `retoFem, vastoInt, vastoLat, vastoMed, adutor, bicepsFem, semitend, semimemb, gastro, soleo`. Calculadas uma vez em `MASK[id]` (vértices + pesos + âncora para rótulo no lado direito).
- Cores: vermelho principais (`--red`), laranja secundários/sinergistas (`--orange`), amarelo estabilizadores (`--yellow`, mais suave). Intensidade varia com a fase (excêntrica/concêntrica/pausa). Tocar num músculo da legenda isola. Texto sempre diz que a cor é didática, **não EMG**.
- Limitação assumida: contornos aproximados (pele contínua, não músculos separados); vasto intermédio (profundo) pinta a mesma área do reto femoral.


## Estrutura de um exercício (objeto em `app.js`, registrado em `EXS`)

```
{ id, title, eyebrow, h1, specs(HTML),
  groups:{p,s,e,n?: {label, col}} (n = cinza, 'também trabalham'; b = azul-claro; d = azul), strongE? (amarelo mais forte), muscles:[{id,name,g,tag?}],
  keys:[9 × {t,title,d,ph?:'ecc'|'conc'}], T_END, loopStart, loopChip,
  grp (THREE.Group do equipamento), guides (grupo das guias),
  readouts:[{id,label}], views:{lateral,frontal,anatomia:{pos,tgt}}, portrait (zoom-out no celular),
  degTag (ou null), degAnchor, parts?:[{label,pos()}], guideTags?:[{label,text?(),pos(),views?}], muscleTarget?(m,fase) (intensidade por músculo), m.col? (cor própria do músculo, var CSS), themeChanged?(), defaultView?, postBones?(BM,J) (ajuste extra dos ossos, ex.: punho), errors?:{id:{name,fix}}, setErr/getErr,
  info(HTML antes da legenda), infoAfter(HTML depois),
  pose(t)→J {bones, side[], p, v, …}, phase(J)→{kind,label,cue},
  update(J,t,ph)→{readoutId:{v,s:'ok'|'warn'|''}}, viewChanged?(vista) }
```
Para adicionar um exercício: criar o objeto, registrar em `EXS` com o hash, incluir o hash em `IDS` do roteador (`EXS` fica logo depois dos objetos dos exercícios), adicionar o card no menu (`<a class="ex" href="#…">` no grupo muscular certo, numeração sequencial), criar máscaras novas em `masks()` se faltar músculo, rodar `build.py`, testar com screenshots (lateral/frontal/anatomia, celular claro/escuro) e publicar no **mesmo Artifact** (mesmo caminho de arquivo / mesma URL).


## Parâmetros da remada (referência)

Pelve em (0, .54, 0) sobre banco de 0,42 m, tronco 7° à frente → −2°; pés nos apoios inclinados 25°, a ±0,12 m, joelho 157°. Puxador no referencial do tronco: início (u .21, n .586) → fim (u .25, n .25), com leve arco. Polia baixa em (.99, .47, 0); torre x 1,30–1,72; pilha em x 1,53. Tempo: 0,4 s parado → 2 s puxada → 0,5 s pausa → 2,5 s retorno (T_END 5,4 s). Polo do cotovelo: para trás e para fora (cotovelos ≈ a 0,24 m do centro no fim).

## Parâmetros do leg press (referência)

Encosto 35° do chão, assento 25°, quadril em (0, .52, 0), trilho d=(cos45, sin45), plataforma inclinada −20° em relação ao trilho, pés a ±0,20 m do centro com pontas 15° para fora; distâncias quadril→tornozelo calculadas para joelho 167° (topo) e 92° (fundo). Tempo: 0,6 s parado → 2 s descida → 0,3 s pausa → 2 s subida → 0,5 s parado (T_END 5,4 s).

## Prévia na sessão (`window.__mini`)

O motor também desenha a prévia animada da tela de treino: ver a descrição completa em [Treinos e Sessão §8](../wiki/Funcionalidade-Treinos-e-Sessao.md) ("Prévia 3D"). Regiões: `mini` e `enter-exercise`.
