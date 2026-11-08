# Meu Treino 3D — app web com login e ranking

App de treino pelo celular. Cada exercício tem um boneco 3D que mostra a execução. O app registra as séries ao vivo, guarda o histórico e dá pontos com nível, liga, sequência e conquistas.

**Para onde vai:** o protótipo pessoal (um Artifact do claude.ai, com um único usuário) vira um **app web publicado na Vercel**, com:

- **login por convite**: o Arthur gera um link e manda para a pessoa;
- **perfil e histórico próprios** para cada pessoa;
- **biblioteca compartilhada** que fica disponível para todos: exercícios 3D e os treinos/programas que o Arthur publicar;
- **conta nova começa vazia**: a pessoa escolhe um programa da biblioteca ou monta o próprio;
- **ranking**: todos os logados veem a posição e a pontuação de todos.

> **Estado:** 🔮 Planejado. A S00 (análise e plano) está concluída. O protótipo v21 continua em uso no Artifact até a virada (S09).

## Navegação

| Página | Para que serve |
|---|---|
| [Visão e Escopo](Visao-e-Escopo) | O problema, o que o produto é e o que **não** é, e as restrições que comandam a arquitetura |
| [Arquitetura](Arquitetura) | Stack alvo, estrutura de pastas, ambientes, CI/CD, segurança e regras que não podem ser quebradas |
| [Modelo de Dados](Modelo-de-Dados) | Tabelas, regras de acesso (RLS), formato dos documentos e o que sempre precisa valer (invariantes) |
| [Contas e Perfil](Funcionalidade-Contas-e-Perfil) | Convite, login, perfil, papéis e privacidade |
| [Biblioteca](Funcionalidade-Biblioteca) | Exercícios 3D + treinos e programas compartilhados; conta nova começa vazia |
| [Treinos e Sessão](Funcionalidade-Treinos-e-Sessao) | Conjuntos, treinos, sessão ao vivo, resumo, histórico, uso sem sinal |
| [Pontuação](Funcionalidade-Pontuacao) | Regras de pontos (v21), cálculo no servidor, limites |
| [Ranking e Competição](Funcionalidade-Ranking-e-Competicao) | Liga de 28 dias, semana, geral, cartão do participante, competições |
| [Administração](Funcionalidade-Administracao) | Convites, usuários e edição da biblioteca pelo celular |
| [Decisões](Decisoes) | Por que cada escolha (ADRs) |
| [Roadmap e Sessões](Roadmap-e-Sessoes) | As 18 sessões, o modelo de IA de cada uma, os marcos |
| [Preparação de Contas](Preparacao-de-Contas) | O que o Arthur faz à mão: Supabase, Vercel, GitHub e o ambiente do Claude Code |
| [S00 — Análise e plano](S00-analise-e-plano) | Diagnóstico do protótipo (registro desta sessão) |

## Como executar uma sessão

1. Faça antes os passos de [Preparação de Contas](Preparacao-de-Contas) que a sessão pede.
2. Abra uma **conversa nova** no Claude Code com o repositório GymApp.
3. Escolha o modelo indicado na sessão (`/model`).
4. Cole o prompt inteiro do arquivo `Sessoes/S<NN>-….md`.
5. No fim: verificações verdes, documentação atualizada, commit e push. Você revisa e faz o merge do PR.
