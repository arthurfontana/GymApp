# Visão e Escopo

> **Estado**: 🔮 Planejado · **DECs**: ADR-001 a ADR-014 ([Decisões](Decisoes))

## 1. O problema

O Meu Treino 3D nasceu como página pessoal do Arthur, publicada como Artifact do claude.ai. Funciona bem para uma pessoa. Não serve para um grupo:

- **Só um dono.** Os dados ficam no banco do Artifact, com a regra "só o dono lê e grava". Quem recebe o link não vê nada. Não existe a ideia de "usuário".
- **O treino do Arthur é a biblioteca.** Os treinos e conjuntos (A/B da academia, Calistenia em casa) estão misturados com o histórico dele. Não dá para oferecer esses treinos a outra pessoa sem levar junto os dados dele.
- **Não dá para ter ranking.** O ranking ficou "em breve" porque exige dados separados por pessoa, um placar comum e uma regra de pontos que ninguém consiga alterar no próprio aparelho.
- **Não dá para convidar ninguém.** Não há login, perfil nem controle de acesso.

## 2. O que o produto passa a ser

Um **app web instalável no celular (PWA)**, publicado na Vercel, em que:

1. **Entra só quem foi convidado.** O Arthur (administrador) gera um link de convite. A pessoa cria o login com e-mail e senha. Sem convite válido, não há cadastro.
2. **Cada pessoa tem perfil e histórico próprios.** Conjuntos, treinos, sessões, recordes, pontos e evolução são de cada um. Trocar de aparelho não perde nada.
3. **A biblioteca é de todos e está sempre disponível.**
   - **Exercícios 3D**: os 22 de hoje e os próximos briefings do Arthur.
   - **Treinos e programas publicados**: "Treino na academia (Full Body A/B)", "Calistenia em casa" e os que o Arthur publicar depois.
4. **Conta nova começa vazia.** Sem treinos, só com a biblioteca. A pessoa escolhe um programa da biblioteca (o app copia para a conta dela) ou monta o próprio.
5. **Ranking entre os logados.** Todos veem a posição e a pontuação de todos: liga dos últimos 28 dias, pontos da semana e total geral (XP). A regra de pontos é a mesma para todos e é calculada no servidor.
6. **O Arthur administra pelo celular**: convida pessoas, desativa acessos, publica treinos na biblioteca. Exercício 3D novo continua vindo de briefing executado pelo Claude Code (skill `animacao-3d-exercicio`). A publicação passa a ser um push no GitHub, que a Vercel publica sozinha.

## 3. O que o produto NÃO é (fora do escopo deste épico)

| Fora do escopo | Por quê |
|---|---|
| Cadastro aberto ao público, loja, assinatura ou pagamento | Grupo fechado de amigos; Vercel Hobby é só para uso não comercial (ADR-001) |
| Feed social, chat, comentários, curtidas | O ranking e o cartão do participante bastam para a competição |
| Participante publicar treino na biblioteca | Só o administrador publica. A biblioteca é curada (ADR-007) |
| Ver o histórico, as cargas ou o peso de outra pessoa | Privacidade: só apelido, nível e pontos são públicos (ADR-010) |
| App nativo nas lojas (Android/iOS) | O PWA instalável cobre o uso na academia |
| Anti-fraude forte | Os dados são declarados pela própria pessoa. A proteção é regra no servidor + limites de plausibilidade + o administrador poder ocultar alguém (ADR-004) |
| Prescrição automática de treino, IA, integração com relógio | Possíveis épicos futuros |
| Vários idiomas | Só pt-BR |

## 4. Restrições que comandam a arquitetura

| # | Restrição | Consequência |
|---|---|---|
| R1 | **Custo zero** na escala de um grupo de amigos | Vercel Hobby + Supabase Free; nada de servidor próprio (ADR-001) |
| R2 | **Celular primeiro, na academia, com sinal ruim** | A sessão em andamento funciona sem internet e **nunca perde uma série** (ADR-008) |
| R3 | **Não reescrever o 3D** (4.800 linhas, 22 exercícios validados um a um com prints) | Muda só a casca: build, dados, login e telas novas. O rig e os exercícios ficam intocados (ADR-002) |
| R4 | **Regra de pontos igual para todos, calculada no servidor** | O mesmo código de pontuação roda no aparelho (prévia) e no servidor (oficial) (ADR-004) |
| R5 | **Privacidade de dados de saúde (LGPD)** | Histórico, peso e medidas são privados; consentimento, exportação e exclusão de conta (ADR-010) |
| R6 | **O Arthur opera pelo celular** | Convidar, publicar treino e acompanhar o ranking são telas do app, sem terminal |
| R7 | **Continuidade do histórico do Arthur** | As sessões e os pontos atuais migram sem perda (S08) |
| R8 | **Biblioteca 3D sempre igual para todos** | O catálogo de exercícios mora no código e é publicado junto com o app (ADR-003) |

## 5. Quem usa

| Papel | O que faz |
|---|---|
| **Administrador** (Arthur) | Treina como qualquer pessoa. Também convida, desativa, publica treinos e programas na biblioteca e manda briefings de exercícios 3D |
| **Participante** | Recebe o convite, cria o login, escolhe ou monta os treinos, treina, acompanha a evolução e o ranking |

## 6. Glossário

| Termo | Significado |
|---|---|
| **Biblioteca** | O que é de todos: exercícios 3D (no código) + treinos e programas publicados (no banco) |
| **Programa da biblioteca** | Modelo de conjunto publicado pelo administrador (ex.: "Calistenia em casa"), com seus treinos, dias, orientações e fases |
| **Conjunto** | Programa **da pessoa** (cópia de um programa da biblioteca ou criado por ela), com seus treinos e dias |
| **Treino** | Lista de exercícios com séries, repetições, descanso e carga (ex.: "Treino A") |
| **Sessão** | Uma execução de um treino, com as séries registradas ao vivo |
| **Liga** | Faixa pelos pontos dos últimos 28 dias: Bronze, Prata, Ouro, Platina, Diamante |
| **XP / Nível** | Soma de todos os pontos já ganhos (nunca expira) e o nível que ela dá |
| **Convite** | Link de uso único, com validade, que permite criar um login |
