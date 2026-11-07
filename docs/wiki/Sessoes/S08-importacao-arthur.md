# Sessão 08 — Importação do histórico do Arthur

**Modelo:** `Opus 5.5` (`claude-opus-5-5`) · **Depende de:** S07 · **Marco:** M2

> **Por que Opus:** migração de **dados reais, uma vez**, para a produção. Erros aqui (sessão duplicada, `pesoCorp` perdido, `conjuntoId` apontando para o lugar errado, fichas fora da semana certa) mudam o histórico e os pontos do Arthur em silêncio e são difíceis de desfazer depois que ele volta a treinar.

## Antes de abrir a sessão (Arthur)

1. [Preparação de Contas](Preparacao-de-Contas) **P5** (secrets `SUPABASE_URL_PROD` e `SUPABASE_SERVICE_ROLE_KEY_PROD` no environment `producao`) e **P7** (sua conta de administrador **já criada na produção** pelo convite de inicialização).
2. **Pare de treinar no Artifact** a partir do início desta sessão, até a virada (S09).
3. Tenha em mãos a resposta da pergunta **P4** (as 4 sessões de 07/11 eram testes?).

## Prompt

> Você está implementando a **Sessão 08 do GymApp — importação do histórico do Arthur para a produção**.
>
> **Leia antes de começar:** `docs/wiki/Modelo-de-Dados.md` §4 (formato dos documentos) e §6 (mapa da migração); `docs/wiki/Funcionalidade-Biblioteca.md` RN-03 (o Arthur mantém os ids `A`, `B`, `cal-a`, `cal-b`); `docs/wiki/Decisoes.md` ADR-011 e ADR-013; `data/README.md`; skills `persistencia-dados` e `banco-e-rls`.
>
> ### Estado atual
> App multiusuário completo no dev/preview (S04–S07), biblioteca semeada em dev e prod. O Arthur tem conta de administrador **vazia** na produção. O histórico real dele está no db do Artifact (`https://claude.ai/artifact/7rca7r3eRxTwX4kiZ4B7zK`, coleções `conjuntos`, `treinos`, `sessoes`, `config`), com uma cópia em `data/` de 07/11/2026 que pode estar desatualizada.
>
> ### Objetivo
> O Arthur entra na produção e encontra os conjuntos, treinos, sessões, recordes e **os mesmos pontos** que tinha no Artifact.
>
> ### Escopo
> 1. **Atualizar `data/`** com `ArtifactData` (`action:"list"` em cada coleção, com `out_dir`) na URL do Artifact. Commite a cópia nova (o repositório é público e o Arthur já aceitou isso). Se a ferramenta não estiver disponível nesta sessão, **pare e peça** ao Arthur.
> 2. **Pergunte ao Arthur (P4)** se as sessões de teste de 07/11/2026 ficam. Registre a resposta como DEC e aplique o filtro **na importação** (sem apagar nada de `data/`).
> 3. **Script** `scripts/importar-usuario.mjs --email <e-mail> --origem data/ [--aplicar]`: localiza o usuário pelo e-mail (Auth admin); monta as linhas (`conjuntos` com `origem` `full-body-ab`/`calistenia-em-casa`; `treinos` `A`→`academia-a`, `B`→`academia-b`, `cal-a`, `cal-b` como `origem`; `sessoes` com `status`/`inicio`/`fim` derivados pelo trigger; `fichas`/`semana` preservados); atualiza `perfis` (apelido "Arthur") e `perfis_privados` (peso 78,5, meta 2) a partir de `config/programa.perfil`. **Idempotente** (`upsert` por `(user_id,id)`; rodar duas vezes = mesmo resultado). Sem `--aplicar` é *dry-run*: imprime só **contagens e diferenças estruturais** (nunca e-mail completo, token ou URL com segredo).
> 4. **Verificação de paridade**: o script calcula `jogo()` (com o `pontos.js` atual, carregado num ambiente de teste com os documentos de `data/`) **antes** e lê os documentos importados **depois** (no dry-run, a partir das linhas montadas), e compara XP, nível, p28, sequência, recordes e conquistas. Diferença ≠ 0 → o script falha (exceto o efeito explícito do filtro do item 2, que é reportado).
> 5. **Workflow** `.github/workflows/importar-arthur.yml` (`workflow_dispatch`, inputs `email` e `modo: dry-run|aplicar`, environment `producao`, secrets do environment). Instruções ao Arthur no PR: rodar `dry-run`, ler o resumo, rodar `aplicar` e aprovar.
>
> ### Testes
> - Unitários do mapeamento (cada coleção, ids, origem, derivação de status, fichas, perfil).
> - Integração no Supabase local: importar `data/` para um usuário de teste → abrir o app logado nele (e2e) → Início com os 2 conjuntos, histórico com as sessões, resumo de uma sessão antiga abre, "Minha jornada" com o mesmo XP do v21 (calcule o valor esperado com o código v21 sobre `data/`).
> - Idempotência: importar duas vezes → mesmas contagens, sem duplicar.
>
> ### Critérios de aceite
> - *Dry-run* no CI (contra o Supabase local com um usuário fictício) verde e legível.
> - Depois que o Arthur rodar `aplicar`: ele entra no celular e confirma conjuntos, treinos, histórico e pontos. Peça essa confirmação e registre-a no PR.
> - Nenhum segredo nem dado além de contagens nos logs.
>
> ### Fora do escopo
> Congelar o Artifact e atualizar a skill (S09); recalcular pontos no servidor (S11). A sessão em andamento de `data/` entra como está (status `andamento`), e o Arthur decide no app se continua ou encerra.
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Modelo-de-Dados.md` §6 (como ficou, com a DEC das sessões de teste), `data/README.md` (data da cópia; a fonte da verdade passa a ser o Supabase de produção após a virada), `docs/claude/Dados-e-Sincronizacao.md` (como rodar a importação), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Nada é escrito na produção a partir desta sessão**: só pelo workflow, com aprovação. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat: importação do histórico do Arthur (S08)`, push, PR. Resposta ao Arthur: o passo a passo do workflow (dry-run → aplicar → aprovar) em até 5 linhas.
