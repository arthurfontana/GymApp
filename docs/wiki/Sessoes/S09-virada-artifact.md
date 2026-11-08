# Sessão 09 — Virada: Artifact congelado e skill no fluxo novo

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S08 · **Marco:** M2

> **Por que Sonnet:** é mais sincronização documental e remoção de código legado do que lógica nova: atualizar a skill de animação, o `CLAUDE.md` e os docs de build, remover o adaptador do Artifact e o `build:artifact`, publicar uma última versão do Artifact com aviso. O risco é esquecer um ponto de integração, e isso se controla com checklist.

## Antes de abrir a sessão (Arthur)

Importação confirmada (S08) e treino feito no app novo pelo menos uma vez.

## Prompt

> Você está implementando a **Sessão 09 do GymApp — virada do Artifact para o app na Vercel**.
>
> **Leia antes de começar:** `docs/wiki/Decisoes.md` ADR-011; `docs/claude/Build-e-Publicacao.md`; a skill `.claude/skills/animacao-3d-exercicio/SKILL.md` (inteira); `docs/claude/Dados-e-Sincronizacao.md` (adaptadores).
>
> ### Estado atual
> O Arthur já usa o app em produção com o histórico importado (S08). O código ainda mantém o adaptador `artifact`, a rotina `migrar()` e o `npm run build:artifact`. A skill de animação ainda manda publicar no Artifact.
>
> ### Objetivo
> Um único app em produção. Exercício 3D novo é publicado por PR + merge (Vercel). O Artifact mostra o endereço novo e não grava mais.
>
> ### Escopo
> 1. **Última versão do Artifact**: gere com `npm run build:artifact` uma versão **com um banner fixo** "O Meu Treino 3D mudou de endereço → <APP_URL>" e **sem gravação** (o adaptador `artifact` em modo só leitura: `S.readOnly=true`, botões de gravar desabilitados). Publique: `Artifact` `action:"read"` na URL `https://claude.ai/artifact/7rca7r3eRxTwX4kiZ4B7zK` e depois publish de `dist-artifact/index.html` com `files={"body-model.wasm":"dist-artifact/body-model.wasm"}`. Se a ferramenta Artifact não estiver disponível nesta sessão, deixe o arquivo pronto e instrua o Arthur.
> 2. **Remover o legado** (depois de publicar o item 1): adaptador `artifact`, `migrar()` e o caminho `config/programa` no modo nuvem, `build:artifact` e `scripts/build-artifact.mjs`. Os testes e2e do modo `local` continuam (o adaptador `local` fica).
> 3. **Skill `animacao-3d-exercicio`** no fluxo novo, sem mudar as regras de biomecânica: pontos de integração com os caminhos atuais (`src/3d/app3d.js`; menu em `index.html`; `LIB` e `PX` onde estiverem: em `src/jornada/` até a S10, depois em `src/core/catalogo.js`; deixe a instrução genérica "onde estiverem `LIB`/`PX`, ver `CLAUDE.md` › Onde vive o quê"); verificação com `tests/visual/` e `npm run test:e2e`; **entrega** = commit + push + PR, e o Arthur confere no **preview da Vercel** no celular e faz o merge (produção). Remova o passo "publicar no mesmo Artifact".
> 4. **`CLAUDE.md`**: comandos, estrutura e o novo "Publicar" (merge na `main` = produção). Remova as referências ao Artifact como app ativo e mantenha a URL como "congelado (v21)".
>
> ### Testes
> - `npm run check` e `test:e2e` verdes depois da remoção.
> - Teste de disparo da skill (G4): 3 pedidos que devem carregá-la ("briefing de exercício novo: …", "ajusta o cotovelo no supino", "novo exercício: remada curvada") e 2 que não devem ("muda a cor do ranking", "corrige o login"). Confira se a description cobre o vocabulário.
> - Abra o Artifact publicado (ou o arquivo) e confira o banner e o bloqueio de gravação.
>
> ### Critérios de aceite
> - O Artifact mostra o aviso com o link e não grava.
> - Nenhuma referência a publicar no Artifact na skill, no `CLAUDE.md` nem em `docs/claude/`.
> - Build e testes verdes sem o código legado.
>
> ### Fora do escopo
> Mover `LIB`/`PX` para `core/` (S10); qualquer mudança no 3D.
>
> ### Atualização da documentação (obrigatório)
> Skill, `CLAUDE.md`, `docs/claude/Build-e-Publicacao.md`, `docs/claude/Dados-e-Sincronizacao.md`, `docs/wiki/Arquitetura.md` §1 (o protótipo vira histórico, com ponteiro para a S00), `Home.md` (estado: 🚧 em produção na Vercel), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `chore: virada para a Vercel, Artifact congelado e skill atualizada (S09)`, push, PR. Resposta ao Arthur: como fica o fluxo de exercício novo (mandar o briefing → abrir o preview do PR → merge).
