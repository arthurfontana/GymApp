# Sessão 17 — Minha evolução (gráficos)

**Modelo:** `Sonnet 5.5` (`claude-sonnet-5-5`) · **Depende de:** S16 · **Marco:** M5 (opcional)

> **Por que Sonnet:** tela nova de leitura sobre dados que já existem no aparelho (sessões da própria pessoa) e cálculos simples já presentes no código (1RM de Epley, volume). Não grava nada e não mexe em regra de pontos.

## Antes de abrir a sessão (Arthur)

Nada.

## Prompt

> Você está implementando a **Sessão 17 do GymApp — Minha evolução**.
>
> **Leia antes de começar:** `docs/wiki/Funcionalidade-Treinos-e-Sessao.md` US-05; a skill **`dataviz`** (obrigatória antes de escrever o primeiro gráfico: paleta, marcas, tema claro/escuro, acessibilidade); em `src/core/`, as funções de marca/recorde (`marcaDe`, Epley) e `mesmoEx`.
>
> ### Estado atual
> O histórico mostra sessões e o resumo compara com a última vez. A página Minha jornada tem um gráfico de pontos por semana. Não há evolução por exercício nem de peso corporal.
>
> ### Objetivo
> A pessoa vê se está progredindo em cada exercício e no peso, no celular e sem internet.
>
> ### Escopo
> 1. **Tela `#evolucao`** (atalho no Início e na página Minha jornada): seletor de exercício (só os já feitos, agrupados como na biblioteca, juntando itens por `mesmoEx`) e período (4 semanas, 3 meses, tudo).
> 2. **Gráficos em SVG próprio** (sem biblioteca nova): com carga → melhor carga por sessão + 1RM estimado; sem carga → máximo de repetições por série; por tempo → maior tempo; volume semanal do exercício (barras). Pontos tocáveis (data e valor), linha de recorde, textos de leitura ("+7,5 kg em 6 semanas").
> 3. **Peso corporal**: série a partir de `pesoCorp` das sessões e das mudanças de peso no perfil (se quiser guardar histórico de peso, proponha **antes** como mudança de dados: pare e pergunte).
> 4. **Estados**: sem dados ("Faça este exercício duas vezes para ver a evolução"), offline (dados locais), tema claro/escuro.
>
> ### Testes
> e2e com sessões sintéticas: valores do gráfico conferem com os dados (atributos `data-*` nos pontos), toque mostra o detalhe, estado vazio, 390×844 claro/escuro sem rolagem horizontal.
>
> ### Critérios de aceite
> - Leitura correta e acessível (contraste, rótulos, sem depender só de cor), seguindo a skill `dataviz`.
> - `npm run check` e `test:e2e` verdes.
>
> ### Fora do escopo
> Comparar evolução com outras pessoas (privacidade), metas por exercício, exportar gráfico.
>
> ### Atualização da documentação (obrigatório)
> `docs/wiki/Funcionalidade-Treinos-e-Sessao.md` (US-05 → ✅, telas), `CLAUDE.md` (1 linha), `Decisoes.md`, `Roadmap-e-Sessoes.md`.
>
> ### Regras transversais
> Todas as de `docs/wiki/Roadmap-e-Sessoes.md`. **Se aparecer decisão de arquitetura não coberta pela documentação, pare e pergunte.**
>
> ### Encerramento
> Commit `feat(evolucao): gráficos por exercício e peso (S17)`, push, PR.
