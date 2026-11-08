# Contas e Perfil

> **Estado**: 🔮 Planejado (S05 login e perfil · S13 convites e senhas pela tela de administração · S15 privacidade)
> **DECs relacionadas**: ADR-005, ADR-010
> **Última sessão que alterou esta página**: S00

## 1. O que é e para quem

Só entra quem foi convidado. O administrador (Arthur) gera um **link de convite** e manda, por exemplo, pelo WhatsApp. A pessoa abre o link, informa e-mail, senha e apelido e já entra no app. Depois disso, ela entra com e-mail e senha, e o aparelho lembra o login.

Cada pessoa tem um **perfil**. O **apelido** e a cor do avatar aparecem no ranking. O **peso** e a **meta semanal** são privados e servem para calcular pontos, calorias e sequência. Ninguém além da própria pessoa vê o peso, as cargas ou o histórico dela.

Na v1 não há envio automático de e-mail (sem SMTP). Se a pessoa esquecer a senha, pede ao administrador um **link de redefinição**, que funciona como o convite.

## 2. Histórias de usuário

### US-01 — Aceitar convite e criar o login
**Como** pessoa convidada, **quero** abrir o link e criar meu acesso **para** começar a usar o app.

**Critérios de aceitação:**
- O link tem o formato `https://<app>/#convite/<codigo>`. A tela mostra "Convite de <apelido do administrador>" e os campos e-mail, senha (mín. 8 caracteres, com botão de mostrar), apelido (pré-preenchido se o convite tiver sugestão) e a caixa "Li e aceito os termos e a política de privacidade" (link).
- Ao confirmar, o servidor valida o convite e cria a conta já confirmada. A pessoa entra direto na tela de primeiro acesso (US-04).
- Convite usado, expirado (7 dias) ou revogado mostra uma mensagem clara (catálogo §5.4) e o botão "Já tenho conta → Entrar".
- E-mail que já tem conta → "Este e-mail já tem conta. Entre com sua senha." O convite **não** é consumido.

### US-02 — Entrar e continuar logado
**Como** participante, **quero** entrar com e-mail e senha uma vez e continuar logado **para** não digitar a senha na academia.

**Critérios de aceitação:**
- Tela "Entrar" com e-mail e senha. Erro genérico: "E-mail ou senha incorretos" (não diz qual dos dois).
- A sessão persiste no aparelho (refresh token do Supabase) e se renova sozinha. Fechar e abrir o app não pede login.
- Sem conexão e já logado: o app abre com os dados do aparelho (Treinos e Sessão, US-02).
- "Sair" fica no Perfil. Sair apaga os dados locais do usuário daquele aparelho, depois de avisar se houver escrita ainda não enviada.
- Conta desativada: o login falha com "Seu acesso foi desativado. Fale com o administrador."

### US-03 — Rotas protegidas
**Como** sistema, **quero** que nenhuma tela de dados abra sem login **para** proteger os dados.

**Critérios de aceitação:**
- Sem sessão, qualquer `#rota` leva para "Entrar", exceto `#convite/*`, `#senha/*` e `#termos`. Depois de entrar, a pessoa volta à rota que tinha pedido.
- A biblioteca 3D também exige login (ADR-014; ver Pergunta em aberto P3 no roadmap).

### US-04 — Primeiro acesso
**Como** pessoa nova, **quero** informar meu peso e minha meta **para** que pontos e calorias fiquem certos.

**Critérios de aceitação:**
- Aparece uma vez, logo após criar a conta: peso (kg, 30–300, aceita vírgula), meta de treinos por semana (chips 1–7, padrão 2) e "Aparecer no ranking" (ligado por padrão), com explicação curta do que é público.
- "Pular" é permitido. Peso vazio usa 75 kg nos cálculos e o Perfil mostra o aviso "Informe seu peso para pontos mais justos".
- Depois disso, o Início mostra o estado vazio (Biblioteca, US-03).

### US-05 — Editar o perfil
**Como** participante, **quero** mudar apelido, cor, peso, meta e a visibilidade no ranking.

**Critérios de aceitação:**
- Tela `#perfil` (substitui a folha "Perfil" da página Minha jornada). Campos da US-04 + apelido + cor do avatar (6 opções) + "Trocar senha" + "Sair".
- Apelido único sem diferenciar maiúsculas. Se já existir: "Esse apelido já está em uso".
- Mudar o peso **não** muda os pontos de treinos passados: cada sessão guarda o `pesoCorp` do dia (RN-03).
- Salvar o peso ou a meta pede o recálculo dos pontos (Pontuação, US-02).

### US-06 — Trocar a senha
**Como** participante, **quero** trocar minha senha **para** manter a conta segura.

**Critérios de aceitação:**
- No Perfil: senha atual não é pedida (o Supabase não exige; a sessão já é a prova), nova senha + confirmação, mín. 8.
- Com `trocar_senha = true` (entrou por link de redefinição), a troca é obrigatória antes de qualquer outra tela.

### US-07 — Redefinir a senha por link (sem e-mail)
**Como** participante que esqueceu a senha, **quero** um link para criar uma nova **sem** depender de e-mail.

**Critérios de aceitação:**
- Em "Entrar", "Esqueci a senha" explica: "Peça ao administrador um link de redefinição".
- O link (`#senha/<codigo>`, uso único, 24 h) é gerado em Administração (S13). Ao abrir, a pessoa define a nova senha e já entra.

### US-08 — Papéis
**Como** administrador, **quero** ver o menu Administração, e o participante não.

**Critérios de aceitação:**
- `perfis.papel = 'admin'` mostra a entrada "Administração" no Início e no Perfil. Para o participante, a rota `#admin*` volta ao Início.
- O papel vale também no servidor: toda rota `/api/admin/*` e `/api/convites` responde 403 a quem não é administrador.

## 3. Cenários de teste (Gherkin)

### CT-01 — Convite de uso único (cobre US-01)
```gherkin
Dado   um convite válido "K1" gerado pelo administrador
Quando a pessoa A aceita "K1" com e-mail a@x.com
Então  a conta de A é criada, A entra no primeiro acesso
  E    "K1" fica com usado_por = A
Quando a pessoa B abre "#convite/K1"
Então  aparece "Este convite já foi usado"
  E    nenhuma conta é criada
```

### CT-02 — E-mail já cadastrado não consome o convite (cobre US-01)
```gherkin
Dado   a conta a@x.com existente e um convite válido "K2"
Quando alguém tenta aceitar "K2" com a@x.com
Então  aparece "Este e-mail já tem conta. Entre com sua senha."
  E    "K2" continua disponível
```

### CT-03 — Falha no meio do cadastro não deixa lixo (cobre US-01)
```gherkin
Dado   um convite válido "K3"
Quando a criação do perfil falha depois de o usuário ter sido criado no Auth
Então  o servidor apaga o usuário recém-criado (compensação)
  E    "K3" continua disponível
  E    a pessoa vê "Não deu para criar sua conta agora. Tente de novo."
```

### CT-04 — Participante não chega às rotas de administrador (cobre US-08)
```gherkin
Dado   o participante P logado
Quando P chama POST /api/convites com seu token
Então  a resposta é 403 "Só o administrador pode fazer isso"
Quando P tenta mudar o próprio perfis.papel para 'admin' pelo supabase-js
Então  o banco recusa (trigger proteger_perfil)
```

### CT-05 — Conta desativada (cobre US-02)
```gherkin
Dado   o participante P desativado pelo administrador
Quando P tenta entrar
Então  vê "Seu acesso foi desativado. Fale com o administrador."
  E    P não aparece no ranking
  E    os dados de P continuam guardados
```

### CT-06 — Peso privado (cobre US-05, RN-02)
```gherkin
Dado   os participantes A e B logados
Quando A consulta perfis_privados, sessoes ou treinos de B
Então  o resultado é vazio
Quando A consulta o ranking
Então  vê apelido, nível, pontos e sequência de B, e nunca o peso
```

## 4. Regras de negócio

- **RN-01**: Cadastro público desligado no Supabase. Conta só é criada pelo servidor ao aceitar um convite válido. Violação: qualquer pessoa entra no ranking.
- **RN-02**: Peso, meta, histórico, treinos e eventos de pontos são privados. Públicos (para logados) são só: apelido, cor, nível, título, liga, pontos, sequência, treinos na semana e conquistas ganhas.
- **RN-03**: Os pontos de uma sessão usam o `pesoCorp` gravado ao começar a sessão, nunca o peso atual.
- **RN-04**: Desativar um usuário bloqueia o login (ban no Auth), tira a pessoa do ranking e preserva os dados. Reativar desfaz tudo isso.
- **RN-05**: O primeiro administrador nasce pelo **convite de inicialização**: o código vem da variável secreta `ADMIN_BOOTSTRAP_CODE` (Vercel) e só funciona enquanto **não existe nenhum administrador**. O Arthur abre `#convite/<código>` no celular e a conta é criada com `papel='admin'`. Novos administradores só por SQL, de propósito. Nada de senha ou link em log de GitHub Actions (o repositório é público).
- **RN-06**: Convite expira em 7 dias e link de senha em 24 h. Os dois são de uso único e revogáveis.

## 5. Especificação técnica

- **Módulos**: `src/auth/` (telas Entrar, Convite, Primeiro acesso, Trocar senha), `src/dados/supabase.js` (cliente único), `src/dados/perfil.js` (ler/gravar `perfis` + `perfis_privados`), `api/convites/aceitar.js`, `api/convites/index.js` (`POST` na S05; lista e revogação na S13), `api/senha/*.js` (S13).
- **Cliente Supabase**: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:false}})`.
- **`POST /api/convites/aceitar`** `{codigo, email, senha, apelido, aceiteTermos:true}` → `201 {ok:true}`. Passos: valida o convite (não usado, não revogado, não expirado) → `auth.admin.createUser({email, password, email_confirm:true})` → insere `perfis` + `perfis_privados` (`aceite_termos_em = now()`) → marca o convite → em caso de falha, compensa (CT-03). O cliente então chama `signInWithPassword`.
- **Limite**: 10 tentativas por IP a cada 10 min nas rotas de convite/senha (memória da função + atraso; suficiente para a escala).

### 5.4 Catálogo de erros
| Código | HTTP | Mensagem (pt-BR) | Ação |
|---|---|---|---|
| `CONVITE_INVALIDO` | 404 | Este convite não existe. Confira o link. | — |
| `CONVITE_USADO` | 409 | Este convite já foi usado. | Entrar |
| `CONVITE_EXPIRADO` | 410 | Este convite venceu. Peça um novo ao administrador. | — |
| `EMAIL_EXISTE` | 409 | Este e-mail já tem conta. Entre com sua senha. | Entrar |
| `APELIDO_EXISTE` | 409 | Esse apelido já está em uso. | Editar |
| `SENHA_FRACA` | 400 | Use pelo menos 8 caracteres. | Editar |
| `NAO_AUTENTICADO` | 401 | Entre de novo para continuar. | Entrar |
| `SO_ADMIN` | 403 | Só o administrador pode fazer isso. | — |
| `MUITAS_TENTATIVAS` | 429 | Muitas tentativas. Espere alguns minutos. | — |
| `FALHA_CADASTRO` | 500 | Não deu para criar sua conta agora. Tente de novo. | Repetir |

## 6. Interface

- **Entrar**: logo/título "Meu Treino 3D", e-mail, senha, botão grande "Entrar", link "Esqueci a senha". Sem link de cadastro, com o texto "O acesso é por convite".
- **Convite**: como Entrar, + apelido + aceite dos termos. Botão "Criar meu acesso".
- **Primeiro acesso**: 3 blocos (peso, meta, ranking), "Começar" e "Pular".
- **Perfil (`#perfil`)**: avatar com a inicial na cor escolhida, campos, "Trocar senha", "Sair"; na S15, "Baixar meus dados" e "Excluir minha conta".
- Mesmo padrão visual da jornada (cards, `--accent`, Barlow Condensed nos títulos), tema claro/escuro, 390×844 sem rolagem horizontal.

## 7. Fora do escopo

Login com Google ou Apple, e-mail de recuperação automático (🔮 quando houver SMTP próprio: Gmail com senha de app ou domínio no Resend), autenticação em dois fatores, cadastro sem convite.
