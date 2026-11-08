# Build e publicação

Como o protótipo (Artifact) é montado, testado e publicado. A S02 troca o build por Vite; até lá vale o que está aqui.

## Estrutura do repositório

```
CLAUDE.md             índice enxuto, carregado em toda sessão
web/app.js            biblioteca 3D: rig, exercícios, câmera (fonte principal)
web/treino.js         jornada: store db/localStorage, telas, sessão, roteador (IIFE)
web/pontos.js         pontuação/gamificação; o build cola no lugar de /*@@PONTOS@@*/ em treino.js
web/treino.css        estilos da jornada (entram no <style> do index.html no build)
web/index.html        casca + saída do build (COMMITADO: é exatamente o que vai para o Artifact)
web/build.py          monta index.html e web/test.html (three local, window.__TEST__=1). Idempotente
web/body-model.wasm   modelo GLB (o Artifact não serve .glb, por isso a extensão .wasm)
web/tests/*.mjs       testes Playwright de ponta a ponta (rodar de dentro de web/)
seed/*.json           dados dos PDFs (academia A/B, calistenia) para semear o db
tools/                load.py e build_cz.js (geração do modelo a partir do atlas)
third_party/          atlas anatômico (CC BY-SA 4.0): manter ATTRIBUTION e LICENSE
data/                 cópia (snapshot manual) dos dados do Arthur; ver data/README.md
docs/wiki/            documentação normativa (sincroniza com a Wiki do GitHub)
docs/claude/          detalhe de implementação para a IA (este diretório)
scripts/              check-claude-md.mjs (guard do teto do CLAUDE.md)
.github/workflows/    ci.yml (job guardrails) e sync-wiki.yml
.claude/skills/       skill de projeto animacao-3d-exercicio
```

## Fluxo

- **Fluxo:** editar `web/app.js` / `treino.js` / `pontos.js` / `treino.css` → `cd web && python3 build.py` → testar → commit → publicar.
- **Nunca editar `web/index.html` na mão** (o build sobrescreve o `<script>` e o trecho de CSS "Jornada de treino").
- **Dev local:** `cd web && npm install && npm run serve` (porta 8765). Testes: `npm run test:gam|test:cal|test:jor` (usam `test.html`, geram prints em `web/out/`). Playwright usa o Chromium dele; para usar outro Chrome: `CHROME=/caminho/chrome`.
- **Publicar:** a ferramenta Artifact com `file_path=web/index.html`, `url=https://claude.ai/artifact/7rca7r3eRxTwX4kiZ4B7zK` e `files={"body-model.wasm":"web/body-model.wasm"}`. Antes, `action:"read"` na URL (exigido para atualizar um artifact de outra conversa). A capability `db` (`{rules:[{path:"",read:"admin",write:"owner"}]}`) é mantida se `capabilities` for omitido.

## Onde ficam os dados

- **Dados do Arthur ficam no db do Artifact, não no git** (coleções `treinos`, `conjuntos`, `sessoes`, `config`). Leia/escreva com `ArtifactData` passando a URL do artifact. `seed/` só reconstrói o ponto de partida. Há uma **cópia dos dados em `data/`** (snapshot manual; ver `data/README.md`): ao fim de uma sessão em que ele treinou, atualizar e commitar.
- **Repositório público:** o Arthur sabe e aceitou que `seed/`, `data/` e o peso dele ficam visíveis.
- Semeado a partir de `seed/seed.json` (e `seed/calistenia.json`) via ArtifactData; detalhes dos treinos semeados em [Treinos e Sessão §8](../wiki/Funcionalidade-Treinos-e-Sessao.md).

## Testes

- **Guard do CLAUDE.md:** `cd web && npm run check:claude-md` (teto de 450 linhas, ou `CLAUDE_MD_MAX_LINES`); roda no CI (`ci.yml`, job `guardrails`).
- **Testes (`web/tests/, `node tests/<nome>.mjs light|dark` de dentro de `web/`, com o servidor ligado):** `gam` (6 semanas sintéticas → placar → jornada → regras → perfil → resumo → sessão com recorde → biblioteca), `cal` (conjunto Calistenia: ficha da semana, circuito, aquecimento guiado, contagem por lado), `jor` (jornada completa no celular: conjuntos, migração, sessão, resumo, novo conjunto), `mob`/`menu`/`chk` (celular, overflow, regressão visual), `mini` (prévias dos exercícios), `lp`/`sup`/`row`/… (prints de cada exercício 3D; genérico: `ex.mjs`). Todos imprimem erros JS e largura da página (deve ser 390).

## Artifact publicado

- **Publicado como Artifact (claude.ai):** https://claude.ai/artifact/7rca7r3eRxTwX4kiZ4B7zK — título "Meu Treino 3D". Arquivos publicados: a página (HTML único com CSS + JS inline) e `body-model.wasm` (o modelo GLB, ver §4). Capability **`db`** declarada com a regra `{path:"", read:"admin", write:"owner"}` (só o Arthur lê e grava; quem receber o link não vê os dados).

- Restrições do Artifact e do host: ver Stack em [Motor-3D](Motor-3D.md) (scripts só de CDNs permitidos; `.glb` publicado como `body-model.wasm`).

- Se o ambiente de ferramentas mudar, o HTML publicado também contém todo o código (`Artifact read`).
