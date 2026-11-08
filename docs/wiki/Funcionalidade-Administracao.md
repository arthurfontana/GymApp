# Administração (convites, usuários e biblioteca)

> **Estado**: 🔮 Planejado (S05 gerar convite · S13 lista de convites e usuários · S14 editor da biblioteca · S18 competições)
> **DECs relacionadas**: ADR-005, ADR-007
> **Última sessão que alterou esta página**: S00

## 1. O que é e para quem

Área só do administrador (Arthur), feita para o celular, em `#admin`. Ali ele:

1. **Convida pessoas**: gera um link de convite e compartilha pelo WhatsApp (botão de compartilhar do celular).
2. **Cuida dos acessos**: vê quem entrou, desativa e reativa, tira do ranking e gera um link de redefinição de senha para quem esqueceu.
3. **Cuida da biblioteca**: publica um treino ou um conjunto **seu** como modelo da biblioteca, edita o que já está publicado (gera versão nova), despublica e ordena.
4. **Recalcula o ranking** quando a regra de pontos mudar.

Exercício 3D novo **não** é feito aqui: continua pelo briefing executado no Claude Code (skill `animacao-3d-exercicio`). Ao fazer o merge, a Vercel publica.

## 2. Histórias de usuário

### US-01 — Gerar convite
**Como** administrador, **quero** gerar um link de convite **para** dar acesso a alguém.

**Critérios de aceitação:**
- `#admin/convites`: botão "Novo convite", com apelido sugerido opcional → `POST /api/convites` → mostra o link, os botões **Compartilhar** (`navigator.share`, com texto pronto: "Te convidei para o Meu Treino 3D: <link> — vale por 7 dias") e **Copiar**.
- Lista de convites: pendente (vence em N dias), usado (por quem, quando), vencido, revogado. Pendentes podem ser **revogados**.

### US-02 — Ver e cuidar dos usuários
**Como** administrador, **quero** ver quem tem acesso e agir **para** manter o grupo saudável.

**Critérios de aceitação:**
- `#admin/usuarios`: apelido, e-mail, papel, ativo, no ranking, membro desde, último treino, XP. Busca por apelido.
- Ações por usuário (com confirmação): **Desativar/Reativar** (ban no Auth + `perfis.ativo`), **Tirar do ranking/Voltar ao ranking**, **Link de redefinição de senha** (`#senha/<codigo>`, 24 h, compartilhável) e **Recalcular pontos**.
- O administrador não consegue desativar a si mesmo nem tirar o próprio papel.

### US-03 — Publicar um treino ou conjunto meu na biblioteca
**Como** administrador, **quero** transformar um treino ou conjunto que montei em modelo da biblioteca **para** evoluir a biblioteca pelo celular.

**Critérios de aceitação:**
- No treino e no conjunto da conta do administrador aparece "Publicar na biblioteca". Uma folha pede o id legível (sugerido a partir do nome), a descrição e "Publicar agora" ou "Salvar como rascunho".
- Publicar um conjunto publica junto os treinos dele que ainda não estão na biblioteca (vira `biblioteca_programas` + `biblioteca_treinos`).
- Copia os documentos, limpando campos pessoais (`fichas`, `semana`, `cargaInicial`).

### US-04 — Editar, despublicar e ordenar
**Como** administrador, **quero** manter os modelos atualizados.

**Critérios de aceitação:**
- `#admin/biblioteca`: lista de programas e treinos (publicados e rascunhos) com **Editar** (abre o mesmo editor de treino/conjunto do app, sobre o modelo), **Publicar/Despublicar** e **subir/descer** (ordem).
- Salvar um modelo publicado incrementa `versao`. Quem usa recebe o aviso de versão nova (Biblioteca, US-07). As cópias nunca mudam sozinhas.
- Despublicar um treino que faz parte de um programa publicado é bloqueado: "Este treino está no programa X. Despublique o programa antes."

### US-05 — Recalcular o ranking
**Como** administrador, **quero** recalcular os pontos de todos **depois** de uma mudança de regra.

**Critérios de aceitação:**
- Botão "Recalcular pontos de todos" → `POST /api/pontos/recalcular {todos:true}` → progresso "N de M" → resumo do que mudou (quantas pessoas tiveram XP diferente).

## 3. Cenários de teste (Gherkin)

### CT-01 — Revogar convite (cobre US-01)
```gherkin
Dado   o convite pendente "K9"
Quando o administrador revoga "K9"
  E    alguém abre "#convite/K9"
Então  aparece "Este convite não vale mais"
```

### CT-02 — Desativar e reativar (cobre US-02)
```gherkin
Dado   o participante P ativo, com 3 sessões
Quando o administrador desativa P
Então  P não consegue entrar e some do ranking
Quando o administrador reativa P
Então  P entra de novo e encontra as 3 sessões
```

### CT-03 — Publicar limpa campos pessoais (cobre US-03)
```gherkin
Dado   o conjunto do administrador com fichas marcadas na semana
Quando ele publica o conjunto na biblioteca
Então  o programa publicado não contém "fichas" nem "semana"
  E    o conjunto do administrador continua com as fichas dele
```

### CT-04 — Participante sem acesso à área (cobre US-01..US-05)
```gherkin
Dado   o participante P
Quando P abre "#admin"
Então  volta para o Início
Quando P chama qualquer /api/admin/* ou /api/convites
Então  recebe 403
```

## 4. Regras de negócio

- **RN-01**: Toda ação da área exige `papel = 'admin'` no servidor (função `/api`) **e** no banco (RLS de `convites` e `biblioteca_*`). Esconder o botão não é proteção.
- **RN-02**: O administrador não pode se desativar nem rebaixar o próprio papel (evita ficar sem administrador).
- **RN-03**: Despublicar não apaga: o modelo vira rascunho. Apagar de vez só é permitido para rascunho que nunca foi publicado.
- **RN-04**: E-mails dos participantes só aparecem para o administrador (`api/admin/usuarios` lê `auth.users` com a chave secreta). Nunca vão para o ranking.

## 5. Especificação técnica

- **Funções**: `api/convites/index.js` (`GET` lista, `POST` cria, `DELETE ?codigo=` revoga), `api/admin/usuarios.js` (`GET` lista; `POST {acao:'desativar'|'reativar'|'ocultar'|'mostrar'|'link-senha', userId}`), `api/senha/redefinir.js` (`POST {codigo, novaSenha}`), `api/pontos/recalcular.js` (S11). Todas usam `requireAdmin(req)` de `api/_lib/auth.js` (verifica o JWT e `perfis.papel`).
- **Biblioteca**: escrita direta pelo supabase-js com o token do administrador (RLS permite), pelo módulo `src/dados/biblioteca.js` (`publicar`, `salvarModelo`, `despublicar`, `reordenar`).
- **Telas**: `src/admin/` (views `vAdmin`, `vConvites`, `vUsuarios`, `vBibliotecaAdmin`), rotas `#admin`, `#admin/convites`, `#admin/usuarios`, `#admin/biblioteca`.

## 6. Interface

Início do administrador: card "Administração" (convites pendentes, total de participantes). Telas em lista de cards com ações num menu "⋯" por item e confirmações em folha (`confirmSheet`). Ações perigosas em vermelho.

## 7. Fora do escopo

Vários administradores com permissões diferentes, auditoria detalhada (log de ações), envio de convite por e-mail pelo sistema, edição dos exercícios 3D pelo celular.
