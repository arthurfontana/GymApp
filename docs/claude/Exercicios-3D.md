# Exercícios 3D — catálogo e parâmetros

Detalhe de cada exercício da biblioteca 3D (id do hash, const em `web/app.js`, grupo, parâmetros, vistas, cores, tempo e erros). Para **criar ou ajustar** um exercício, siga a skill `animacao-3d-exercicio`; o motor, o rig e a estrutura do objeto estão em [Motor-3D](Motor-3D.md). Para achar o bloco no código: `grep -n "#region: ex-" web/app.js` ([Mapa-de-Regioes](Mapa-de-Regioes.md)).

## Objetivo da biblioteca 3D

Cada exercício tem um boneco 3D que demonstra a execução correta, para ele conferir a forma na academia pelo celular:

- câmera girável (arrastar/pinça), vistas prontas **Lateral / Frontal / Anatomia**;
- play/pause, frame anterior/próximo, barra de tempo, velocidades 0,25× · 0,5× · 1× · 2×;
- mostra o equipamento (banco, halteres, máquina);
- músculos coloridos por função; 9 frames didáticos por exercício.

O Arthur manda um **briefing técnico por exercício** (texto longo, sempre no mesmo formato: objetivo, equipamento, posição inicial, execução excêntrica/concêntrica, 9 frames, músculos principais/secundários/estabilizadores com cores, 3 câmeras, erros comuns, duração, elementos didáticos, restrições de qualidade). Cada briefing vira um exercício novo na página.

**Estado:** 22 exercícios, 9 sem equipamento, testados em 390×844 (celular), temas claro e escuro, sem rolagem horizontal.

**Menu** (`index.html`, numeração sequencial por grupo): Peito (01 supino, 13 supino na máquina, 15 flexão com joelhos, 16 flexão na parede) · Pernas (02 leg press, 03 stiff, 08 goblet, 10 mesa flexora, 12 panturrilha, 14 elevação pélvica, 17 agachamento livre, 18 afundo, 19 bom dia, 20 ponte) · Costas (04 remada, 09 puxada alta) · Ombros (05 elevação lateral) · Braços (06 tríceps na polia, 11 rosca bíceps) · Core (07 prancha, 21 bird dog, 22 dead bug). 22 exercícios, 9 sem equipamento.

## Convenções comuns

- Cada exercício tem 9 frames didáticos, vistas Lateral/Frontal/Anatomia (mais 45°, Superior, Posterior ou Close quando o exercício declara `views.diagonal|superior|posterior|detalhe`), readouts, legenda de músculos por cor e card **Evite** ou **Erros comuns**.
- Os 8 exercícios sem equipamento (itens 15 a 22) usam `openHands:true` (mãos abertas), tag "Sem equipamento" (`eq:[]`) e `semCarga:true` no `LIB`; o código foi colado em `app.js` pelo antigo `ins.py` (blocos `/* @@ex_bw1.js@@ */`…`ex_bw4`).
- Lados alternados, utilidades (`wristBend`, `mkMatBW`, `mkArcBW`, `fkSag`, `errAmt`) e o objeto de exercício: ver [Motor-3D](Motor-3D.md).

## Padrões de conteúdo

- Textos em pt-BR, títulos curtos em maiúsculas (Barlow Condensed), descrições de frame em 1 frase.
- Cada exercício: cabeçalho (grupo · título · specs), cena 3D com HUD (frame, fase, dica), readouts, painel de controle, lista dos 9 frames, card de ajuste/posição, legenda de músculos, card Evite ou Erros comuns.
- Rodapé: aviso didático (confirmar com o professor) + crédito obrigatório: "Modelo 3D: Male base muscular anatomy, de CharacterZone, licenciado sob Creative Commons Attribution 4.0" com links e descrição das alterações.
- Restrições dos briefings: sem hiperextensão, sem travar articulações, sem objetos flutuando, sem arco exagerado, sem contração muscular exagerada.

## 1. Supino inclinado com halteres — `#supino-inclinado` · `SUP`

Supino inclinado com halteres (Peito, 01; `SUP`). Sem a parte de sentar/deitar; 9 frames só do movimento (T_END 4,8: 2 s descida, 0,4 s pausa, 1,6 s subida); pegada pronada; cotovelo 4° → 95°; braço × tronco ~58°; antebraço vertical; vistas Lateral, Frontal, 45° e Anatomia; cores do briefing (clavicular vermelho, esternocostal laranja, deltoide anterior amarelo, tríceps azul, serrátil verde, manguito roxo, trapézio médio/inferior azul-claro, romboides cinza-azulado, abdômen cinza); 9 erros (cotovelos a 90°, punhos dobrados, antebraços inclinados, halteres para o abdômen, halteres batendo, lombar arqueada/glúteos fora, ombros avançando, assimetria, hiperextensão).

## 2. Leg press 45° — `#leg-press-45` · `LPX`

Leg press 45° (Pernas). Máquina modelada: trilhos a 45°, carrinho deslizante, plataforma inclinada, suportes de anilhas com anilhas, assento e encosto acolchoados, pegadores laterais, travas (alavancas no carrinho + batentes nos trilhos). Chip "Peças da máquina" mostra rótulos 3D. Readouts: flexão do joelho (13° → ~88°) e quadril × tronco. Arco de ângulo no joelho, linha de trajetória da plataforma, indicador 45°. Vistas frontal/anatomia deixam carrinho e parte alta da estrutura translúcidos. Card **Erros comuns** com 6 demonstrações (1 repetição incorreta com selo vermelho "Incorreto" + 1 corrigida com selo verde): joelhos para dentro, perda do contato lombar, calcanhares saindo, travar joelhos, pés baixos demais, descida descontrolada.

## 3. Remada sentada na polia baixa — `#remada-sentada` · `ROW`

Remada sentada na polia baixa (Costas). Estação modelada: banco baixo, apoios dos pés inclinados, polia baixa com carenagem, cabo de aço passando por 4 roldanas, torre com 14 placas e hastes-guia, pino seletor (6ª placa de cima), puxador triangular e mosquetão alinhados ao cabo. O cabo fica sempre esticado e as placas acima do pino sobem exatamente o quanto o cabo é puxado. Escápulas: ombros avançam (protração) no início e recuam (retração) na puxada, com atraso no retorno; linha azul nas costas mostra isso. Readouts: flexão do cotovelo (≈14° → ≈109°), flexão do joelho (23°), tronco × vertical (+7° → −2°). Arcos no cotovelo e no joelho, trajetória do puxador com rótulos "Inicial"/"Final". Cores do briefing: vermelho latíssimo; laranja trapézio médio, romboides, deltoide posterior; amarelo bíceps, braquial, braquiorradial; grupo cinza (trapézio superior/inferior, eretor, manguito, reto, oblíquos). 8 erros comuns: balanço do tronco, arredondar a coluna, elevar ombros, cotovelos abertos, amplitude reduzida, movimento brusco, puxada excessiva para trás, joelhos travados. Vista frontal deixa a torre translúcida e esconde os cabos internos.

## 4. Stiff com halteres — `#stiff-halteres` · `STF`

Stiff com halteres (grupo Pernas, número 03 no menu; a remada virou 04). Sem máquina: dois halteres sextavados emborrachados com pegada metálica. Dobradiça do quadril: tronco 0° → 80° da vertical, quadril vai para trás (canela 4° → −4°, coxa −2° → −13°), joelhos com 8–10° de flexão quase constante; braços pendurados com as mãos puxadas para perto das pernas (halteres rentes, até o meio da canela), pegada neutra. Readouts: flexão do joelho, flexão do quadril (3° → 94°), tronco × vertical. Guias: linha vertical de referência sobre o meio do pé, trajetória do halter, setas do halter e do quadril, arcos no joelho, no quadril e de inclinação do tronco com rótulo dinâmico "Tronco N°". Cores: vermelho isquiotibiais (bíceps femoral, semitendíneo, semimembranáceo) e glúteo máximo; laranja adutor magno; amarelo eretor, glúteo médio, trapézio, flexores do antebraço. Posteriores fortes na descida; glúteo máximo ganha destaque na subida (`muscleTarget`). Tempo: 3 s descida, 0,5 s pausa, 2 s subida (T_END 6,0 s). 8 erros: arredondar coluna, joelhos flexionados demais, halteres afastados, descer além do controlável, hiperextensão na subida, flexionar cotovelos, movimento brusco, perder apoio dos pés.

## 5. Elevação lateral com halteres — `#elevacao-lateral` · `LAT`

Elevação lateral com halteres (Ombros, 05). Em pé, halteres sextavados menores. Braços sobem no plano escapular (25° à frente do plano frontal), ângulo ombro→mão de 8° a 77° (abdução do braço medida ≈ 11° → 86°), cotovelos fixos em 20° de flexão, palma para dentro embaixo e para baixo no topo. Rotação superior da escápula: ombro sobe ~2 cm e vai um pouco para fora; linhas azuis nas costas (vista Anatomia) giram θ/3. Abre na vista **Frontal** (`defaultView`). Guias: linha horizontal na altura dos ombros, plano escapular desenhado no chão (25°), trajetórias dos halteres, arco de abdução e do cotovelo, rótulo dinâmico "Abdução N°". Cores: vermelho deltoide lateral (pintado por último); laranja deltoide anterior, posterior, supraespinal; amarelo trapézio superior/inferior e serrátil; **azul-claro** (`--sky`, grupo `b`) manguito (infraespinal/redondo menor; subescapular só na legenda, não visível). Tempo: 2 s subida, 0,5 s topo, 3 s descida (T_END 6,0). 8 erros: encolher ombros, balanço do tronco, subir demais, rotação interna (polegar para baixo), cotovelos dobrados demais, punhos desalinhados (dobra antebraço distal + mão em volta do punho via `postBones`), descida descontrolada, assimetria.

## 6. Tríceps na polia alta com corda — `#triceps-polia` · `TRI`

Tríceps na polia alta com corda (Braços, 06). Estação de polia alta (braço superior com roldana acima da cabeça, torre de placas com pino), cabo esticado, mosquetão, corda com duas pontas e terminais emborrachados (o ponto central é calculado para cada pose a partir das mãos). Em pé, tronco 11° à frente, joelhos ~6°. Braço praticamente vertical no mundo (13° à frente do eixo do tronco, cotovelo junto às costelas, calculado por cinemática direta); no fim as mãos ficam à frente e ao lado das coxas (z ±0,215) para a corda não atravessar as pernas; cotovelo de 90° → 5° de flexão; mãos juntas em cima e afastando para os lados das coxas no fim. 4 vistas: Lateral, Frontal (torre translúcida), Anatomia (costas do braço) e **Close** (mãos/corda/cotovelos; botão aparece só se o exercício tiver `views.detalhe`). Cores do briefing: vermelho cabeça longa, laranja cabeça lateral, amarelo cabeça medial, azul-claro ancôneo, **azul** (`--blue`, grupo `d`, mais suave) deltoide e manguito, cinza antebraço/abdômen/eretor. Tríceps segue ativo no excêntrico (`muscleTarget`). Tempo: 0,4 s → 1,5 s extensão → 0,4 s contração → 2 s retorno (T_END 4,6). 8 erros: cotovelos para a frente, cotovelos abertos, ombros encolhidos, balanço do tronco, flexão excessiva do quadril, punhos dobrados, hiperextensão (−8°), retorno descontrolado.

## 7. Prancha abdominal frontal sobre antebraços — `#prancha` · `PLK`

Prancha abdominal frontal sobre antebraços (Core, 07). **Isométrico**: a linha do tempo não é uma repetição e sim entrada → sustentação → saída (T_END 11,4 s; sustentação de 3,8 a 8,6 s). Colchonete (`--mat`). Corpo de bruços, cabeça para +X, peito para baixo (n aponta para −Y). Poses-chave por parâmetros (altura dos ombros, inclinação do tronco, ângulo da coxa e da perna, pés com dorso no chão → dedos apoiados, cotovelo à frente do ombro): deitado → "esfinge" (cotovelos sob os ombros) → prancha com joelhos no chão → prancha (tronco 10,5°, ombros a 0,40 m sobre os cotovelos) → volta. Fase nova `iso` (selo verde cheio "Sustentação isométrica"), músculos constantes na sustentação. Readouts: cotovelo (~88°), alinhamento ombro–quadril–tornozelo ("alinhado"/"quadril alto"/"quadril baixo"/"joelhos dobrados") e tempo de sustentação. 4 vistas: Lateral, Frontal, **Superior** (botão novo, `views.superior`) e Anatomia (baixa, de lado). Cores por músculo (`m.col`): reto vermelho, transverso laranja, oblíquo externo amarelo, oblíquo interno amarelo-claro, multífidos azul-escuro, eretores azul, glúteo máximo roxo, quadríceps cinza-azulado, serrátil verde, deltoide azul-claro. Transverso, oblíquo interno e multífidos são profundos: ficam só na legenda (não são pintados na pele). 8 erros (aplicados só na sustentação): quadril afundado, quadril alto, cabeça caída, pescoço hiperestendido, cotovelos à frente, tórax afundado, joelhos flexionados, rotação do quadril.

## 8. Agachamento goblet com halter — `#agachamento-goblet` · `GOB`

Agachamento goblet com halter (Pernas, 08; card logo após o stiff). Um halter hexagonal grande, quase vertical (eixo 45% inclinado com o tronco), junto ao esterno; mãos por baixo da cabeça de cima, cotovelos para baixo. Pés a ±0,17 m com 15° para fora; joelhos seguem a direção dos pés (polo do joelho = direção do pé). Pelve por cinemática direta no plano sagital: canela 2° → 30° à frente (dorsiflexão), coxa 2° → 80° para trás, tronco 5° → 35°; fundo ≈ joelho 109°, quadril 114°, dorsiflexão 29°. 4 vistas: Lateral, Frontal, **45°** (botão novo, `views.diagonal`) e Anatomia (atrás/lado). Guias: vertical sobre o meio do pé, trajetória do quadril (só lateral), direção dos pés no chão, arcos de joelho, quadril e tornozelo. Cores por músculo conforme briefing (quadríceps vermelho, glúteo máx. laranja, adutor amarelo, glúteo médio/mínimo verde, isquiotibiais azul, eretores azul-escuro, reto/oblíquos roxo, panturrilha cinza-azulado, trapézio/latíssimo azul-claro). Tempo: 2,5 s descida, 0,5 s pausa, 2 s subida (T_END 5,6). 9 erros: joelhos para dentro, calcanhares levantando, tronco inclinado demais, lombar arredondando, halter longe do peito, cotovelos abertos, quadril subindo antes do tronco, hiperextensão no final, movimento brusco.

## 9. Puxada alta na polia pela frente — `#puxada-alta` · `PDN`

Puxada alta na polia pela frente (Costas, 09; card após a remada). Máquina com banco, apoio das coxas (dois rolos), polia superior (P1 em x 0,17, y 2,28), torre de placas, cabo, mosquetão e barra longa com pontas curvas (pegadores emborrachados). Sentado, joelhos ~85°, tronco 15° para trás, olhar à frente (cabeça −12°). Pegada pronada a ±0,33 m (≈1,5× biacromial), palmas para a frente. Barra no referencial do tronco: início (u 1,097, n 0,125: cotovelo ~13°, braço elevado ~158°) → fim nas clavículas (u 0,45, n 0,34: cotovelo ~107°), com arco à frente do rosto. Escápulas: elevadas no alto, depressão/rotação inferior na puxada (com atraso no retorno). Readouts: flexão do cotovelo, elevação do braço, tronco para trás. Vistas: Lateral, Frontal (torre translúcida), Anatomia (costas) e Close (mãos/barra). Cores por músculo do briefing; máscara nova `redondo` (redondo maior), recortada do latíssimo. Tempo: 1,5 s puxada, 0,4 s pausa, 2,2 s retorno (T_END 4,9). 9 erros: atrás da nuca, tronco inclinado demais, balanço, ombros encolhidos, cotovelos assimétricos, barra até o abdômen, punhos dobrados, retorno brusco, coxas saindo do apoio.

## 10. Mesa flexora deitada — `#mesa-flexora` · `FLX`

Mesa flexora deitada (Pernas, 10; card após o goblet). Máquina: banco horizontal acolchoado (pad de coxas/tronco + pad de peito mais baixo), eixo do braço mecânico alinhado ao joelho (KP), came no eixo, braço mecânico com rolete (raio fixo; o rolete acompanha a perna logo acima do tornozelo), regulagem (botão no braço), alças na frente, torre de pesos na cabeceira (x 1,62) com cabo pelo chão. De bruços, cabeça para +X (lado direito = +Z), pelve em (0, 0,87), coxas 5° para baixo; perna gira em volta do joelho: flexão 8° → 110°. Vistas: Lateral, **Posterior** (botão novo `views.posterior`, de cima/atrás), 45° (3/4) e Anatomia. Cores: isquiotibiais vermelho, gastrocnêmio laranja, sartório/grácil/poplíteo amarelo (máscaras novas `sartorio`, `gracil`, `popliteo`), glúteo/abdômen/lombar azul. Tempo: 1,5 s flexão, 0,4 s pausa, 2,5 s retorno (T_END 5,2). 9 erros: quadril subindo, hiperextensão lombar, impulso, joelho fora do eixo (o rolete escorrega na perna), rolete no meio da panturrilha, pés girando, travar joelhos, flexão além do confortável, puxar com os braços.

## 11. Rosca bíceps em pé com halteres — `#rosca-biceps` · `RSC`

Rosca bíceps em pé com halteres (Braços, 11). Em pé, braço por cinemática direta (quase vertical, 2° à frente, cotovelo junto ao tronco), polo do cotovelo = cotovelo FK (para o braço não se mexer); cotovelo 15° → 130°; pegada supinada (palma gira com o antebraço). Halteres seguem a mão pelo osso do antebraço/mão. Máscaras novas `bicLong`/`bicShort` (bíceps dividido pelo lado). Cores: bíceps vermelho, braquial laranja, braquiorradial e antebraço amarelo, deltoide/manguito/tronco azul. Tempo: 1,5 s subida, 0,4 pausa, 2,5 s descida (T_END 5,2). 10 erros: balanço, hiperextensão lombar, impulso das pernas, ombros elevados, punhos flexionados, cotovelos para a frente, cotovelos abertos, descida brusca, travar cotovelos, perder a supinação.

## 12. Panturrilha em pé na máquina — `#panturrilha-em-pe` · `CLF`

Panturrilha em pé na máquina (Pernas, 12). Plataforma (degrau 13 cm, borda em x 0), pé gira em volta da base dos dedos (0,14 m à frente do tornozelo): 20° de dorsiflexão → 35° de flexão plantar; corpo sobe junto (pernas quase retas). Máquina: torre à frente (x 0,72) com guia vertical, carro deslizante com braço e almofadas sobre os ombros, alças, regulagem, trava; placas sobem o mesmo que o corpo. Readouts: tornozelo (dorsiflexão/flexão plantar), calcanhar × plataforma em cm, joelhos. Vistas: Lateral, Posterior, 45° e Anatomia (panturrilha de trás). Máscaras novas `gastroMed`/`gastroLat`, `fibular`, `aquiles` (tendão em cor clara `--tendon`, grupo cinza, não é músculo). Profundos só na legenda (tibial posterior, flexores longos, plantar, músculos do pé). Tempo: 1,5 s subida, 0,5 pausa, 2,5 s descida (T_END 5,3). 8 erros: impulso com joelhos, balanço, quadril inclinado, só pontas dos dedos, quicar, amplitude exagerada, pés girados, um lado subindo mais.

## 13. Supino sentado na máquina — `#supino-maquina` · `CHP`

Supino sentado na máquina (Peito, 13; const `CHP`). Máquina: base, assento regulável (tubo externo + tubo interno com furos + pino vermelho), encosto inclinado 7° com apoio de cabeça, travessa superior com dois eixos (acima, atrás e por fora dos ombros), braços articulados independentes que giram em volta do eixo (`qArm`: rotação em torno de `W` por `TH·p`; trajetória = arco que avança e converge), pegadores verticais em "U" com articulação (ficam na vertical), cames + cabos até a torre de placas atrás do encosto. Pegadores calculados para cotovelo 92° no início (pegadores a ~100 cm) e 15° no fim (~25 cm), altura do meio do peito. Pegada neutra. Vistas: Lateral (braço/coluna do lado da câmera translúcidos), Frontal, 45°, Anatomia. Cores do briefing: peitoral (clavicular e esternocostal) vermelho, tríceps (3 cabeças) laranja, deltoide anterior amarelo, estabilizadores azul (grupo `d`). Tempo: 1,6 s empurrar, 0,4 pausa, 2,5 s retorno (T_END 5,2). 10 erros: tronco saindo do encosto, hiperextensão lombar, ombros elevados, cotovelos abertos, punhos dobrados, travar cotovelos, impulso das pernas, cabeça à frente, assento baixo demais (assento e corpo descem 10 cm, pegadores ficam no ombro), retorno sem controle.

## 14. Elevação pélvica com barra / hip thrust — `#elevacao-pelvica` · `HPT`

Elevação pélvica com barra / hip thrust (Pernas, 14; const `HPT`). Banco reto atravessado (borda arredondada em `EC`), barra olímpica com almofada, anilhas bumper 45 cm, presilhas. Cabeça para −X, peito para cima; as costas giram apoiadas na borda (ponto a `CU=.36` m acima da pelve, `CN=.13` atrás): tronco 50° → 9° acima da horizontal, pelve .22 → .50 m. Pés fixos (x .75), joelhos ~110° → 86°, canela vertical no topo. Barra na dobra do quadril (bissetriz da normal do tronco e da coxa), mãos a ±31 cm, pegada pronada. Cabeça com queixo recolhido no topo. Vistas: Lateral (anilha do lado da câmera translúcida), Posterior (baixa, dos pés: glúteos, joelhos e pés), 45°, Anatomia (baixa, de lado). Topo = fase `iso` ("Topo · contração dos glúteos"). Cores: glúteo máximo vermelho; glúteo médio/mínimo e adutor magno laranja; isquiotibiais amarelo; abdômen, eretores e estabilizadores azul (profundos só na legenda: `gluteoMin`, `quadLomb`, `estPelve`). Tempo: 1,5 s subida, 0,6 pausa, 2,2 s descida (T_END 5,0). 10 erros: hiperextensão lombar, cabeça para trás, calcanhares, joelhos para dentro, barra no abdômen, barra inclinada/pelve girando, costas deslizando no banco, pés longe demais, extensão incompleta, descida sem controle.

## 15. Flexão com joelhos apoiados — `#flexao-joelhos` · `KPU`

Flexão com joelhos apoiados (Peito; `KPU`). De bruços, cabeça +X; joelhos fixos no colchonete; o corpo é uma linha joelho-quadril-ombro que gira em volta dos joelhos; a cada instante o ângulo do corpo é achado por bisseção para o cotovelo bater o alvo (6° → 92°). Mãos espalmadas no chão (`wristBend`), cotovelos ~30° do tronco no fundo. Erros: V invertido, quadril caindo, cabeça à frente, cotovelos a 90°, ombros encolhidos, duas partes, queda rápida.

## 16. Flexão inclinada na parede — `#flexao-parede` · `WPU`

Flexão inclinada na parede (Peito; `WPU`). Em pé, corpo reto gira em volta dos tornozelos; parede em +X (fica translúcida nas vistas Frontal e Anatomia); mãos na parede na altura dos ombros, dedos para cima; pés a ~0,85 m da parede (com os braços estendidos o corpo fica quase vertical e inclina ao flexionar). Cotovelo 5° → 82°.

## 17. Agachamento livre — `#agachamento-livre` · `SQL`

Agachamento livre (Pernas; `SQL`). Igual ao goblet na mecânica (`fkSag`), braços estendidos à frente como contrapeso, joelhos até ~105°.

## 18. Afundo para trás — `#afundo-tras` · `LNG`

Afundo para trás (Pernas; `LNG`). Pé da frente fixo; o de trás sai, viaja num arco e pousa pelo antepé (calcanhar elevado); fundo com joelho da frente ~98° e o de trás ~90°, a poucos cm do chão (posição do pé de trás calculada na carga); mãos na cintura. **Alterna a perna** a cada repetição.

## 19. Bom dia sem carga — `#bom-dia` · `GMN`

Bom dia sem carga (Pernas; `GMN`). Dobradiça do quadril: canela 6° → −3°, coxa −9° → −23° (joelho 15° → 20°), tronco 3° → 55°, quadril recua ~16 cm; braços cruzados (mão no ombro oposto). Linhas-guia da coluna e da tíbia.

## 20. Ponte de glúteos — `#ponte-gluteos` · `BRG`

Ponte de glúteos (Pernas; `BRG`). De costas, cabeça −X; escápulas no chão como pivô (como no hip thrust, mas o apoio é o chão); tronco 0° → −24°, joelho 90° no topo; topo = fase `iso`.

## 21. Bird dog — `#bird-dog` · `BDG`

Bird dog (Core; `BDG`). Quatro apoios (tronco ~19° pela proporção braço/coxa), braço à frente e perna oposta para trás até a linha do tronco; linhas de nível de ombros e pelve na vista Posterior. **Alterna o lado.**

## 22. Dead bug — `#dead-bug` · `DBG`

Dead bug (Core; `DBG`). De costas, 90/90; braço até ~165° e perna oposta até quadril ~10° e joelho ~15°, calcanhar acima do chão. Vistas Lateral, Superior, 45°, Anatomia. **Alterna o lado.**
