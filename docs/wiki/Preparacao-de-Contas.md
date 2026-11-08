# Preparação de Contas (passos manuais do Arthur)

O que **só você** pode fazer, porque envolve criar contas, aceitar termos e guardar chaves. Tudo funciona pelo navegador do celular. Cada passo diz **antes de qual sessão** é preciso.

> **Regra de ouro das chaves**: a **chave secreta** (`service_role`/`secret`) do Supabase de **produção** só vai para a Vercel e para os secrets do GitHub. **Nunca** cole uma chave no chat do Claude. Quando uma sessão precisar de acesso, o Claude Code abre um formulário seguro. Use nele só as chaves do projeto **dev**.

## P1 — Wiki do GitHub (antes de fazer o merge deste PR)

1. github.com → repositório **GymApp** → **Settings** → **Features** → marque **Wikis**.
2. Abra a aba **Wiki** → **Create the first page** → salve com qualquer texto.
3. Pronto: todo merge em `main` que mexer em `docs/wiki/` publica a Wiki sozinho (workflow `sync-wiki.yml`). Sem este passo, o workflow falha no primeiro merge.

## P2 — Vercel (antes da S03)

1. vercel.com → **Sign up** com a conta do GitHub (plano **Hobby**, gratuito, uso não comercial).
2. **Add New → Project** → importe **GymApp** → *Framework Preset*: **Vite** → **Deploy** (o primeiro deploy pode falhar antes da S03; tudo bem).
3. **Settings → Git**: deixe ligados os *Preview Deployments* (cada PR ganha um link para testar no celular).
4. Anote o endereço (`https://<nome>.vercel.app`) e responda a pergunta P2 do roadmap.

## P3 — Supabase (antes da S04)

1. supabase.com → **Start your project** → entre com o GitHub (plano **Free**).
2. Crie **dois** projetos, região **South America (São Paulo)**:
   - `gymapp-dev`: testes, previews e sessões do Claude Code;
   - `gymapp-prod`: os dados reais.
   Guarde a **senha do banco** de cada um (gerenciador de senhas).
3. Em **cada** projeto: **Authentication → Sign In / Providers → Email**: deixe o e-mail ligado e **desligue "Allow new users to sign up"** (as contas só nascem pelo convite, via servidor). Desligue também **"Confirm email"** (o servidor já cria a conta confirmada).
4. Em **cada** projeto, **Project Settings → API / API Keys**: anote a **Project URL**, a chave **publishable/anon** (pública) e a chave **secret/service_role** (secreta).
5. **Account → Access Tokens** → gere um token pessoal (`SUPABASE_ACCESS_TOKEN`) para o GitHub Actions aplicar migrations.

## P4 — Variáveis na Vercel (antes da S05)

Vercel → projeto → **Settings → Environment Variables**:

| Variável | Production | Preview | Pública? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | URL do **prod** | URL do **dev** | sim (vai para o navegador) |
| `VITE_SUPABASE_ANON_KEY` | publishable/anon do **prod** | do **dev** | sim |
| `SUPABASE_URL` | URL do **prod** | URL do **dev** | não |
| `SUPABASE_SERVICE_ROLE_KEY` | secret do **prod** | secret do **dev** | **NÃO**, nunca com prefixo `VITE_` |
| `CRON_SECRET` | texto aleatório longo | outro texto aleatório | não |
| `APP_URL` | `https://<nome>.vercel.app` | (vazio) | não |
| `ADMIN_BOOTSTRAP_CODE` | texto aleatório longo (só você sabe) | outro texto | não |

Depois da S05: abra `https://<nome>.vercel.app/#convite/<ADMIN_BOOTSTRAP_CODE>` no celular e crie sua conta. Ela nasce como **administrador**. O código para de funcionar assim que existir um administrador.

## P5 — Secrets do GitHub (antes da S04)

GitHub → GymApp → **Settings → Secrets and variables → Actions**:

- `SUPABASE_ACCESS_TOKEN` (P3.5)
- `SUPABASE_PROJECT_REF_DEV` e `SUPABASE_DB_PASSWORD_DEV` (o *ref* é o código que aparece na URL `https://<ref>.supabase.co`)

E em **Settings → Environments → New environment** `producao` → **Required reviewers**: você. Dentro desse environment, crie os secrets:

- `SUPABASE_PROJECT_REF_PROD` e `SUPABASE_DB_PASSWORD_PROD` (migrations)
- `SUPABASE_URL_PROD` e `SUPABASE_SERVICE_ROLE_KEY_PROD` (importação do seu histórico na S08)

Assim, nada chega à produção sem o seu clique em **Approve** (dá para fazer pelo app do GitHub no celular). As migrations entram no **dev** automaticamente a cada merge e no **prod** depois da sua aprovação.

## P6 — Ambiente do Claude Code (só se a sessão pedir)

As sessões **não precisam** de chaves do Supabase: testam contra um Supabase **local**, nesta ordem:

1. Docker no contêiner (`dockerd &`, depois `npx supabase start`);
2. se as imagens não baixarem, Postgres 16 local com o *shim* de `auth` (`npm run test:db:local`);
3. o CI do GitHub (Supabase completo) é sempre o juiz final.

Se alguma sessão precisar olhar o **dev** de verdade, ela vai propor liberar o host `<ref-dev>.supabase.co` e abrir um formulário seguro para a chave. Cole ali só a chave do **dev**.

## P7 — Antes da S08 (importação)

- Continue treinando no Artifact normalmente até a S08.
- Crie sua conta de administrador na produção (P4, convite de inicialização) **antes** da S08.
- Na S08, o Claude atualiza a cópia `data/` a partir do Artifact e prepara o workflow **Importar histórico do Arthur**. Você roda o workflow no GitHub (aba **Actions**) primeiro em `dry-run`, confere o relatório e só então roda em `aplicar`, aprovando no environment `producao`.

## Custos

Tudo gratuito na escala de um grupo de amigos (Vercel Hobby + Supabase Free). Limites em [Arquitetura](Arquitetura) §8. Se um dia virar algo comercial, a Vercel exige o plano Pro.
