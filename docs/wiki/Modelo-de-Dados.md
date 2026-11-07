# Modelo de Dados

> **Estado**: 🔮 Planejado (schema criado na S04, pontos na S11, competições na S18)
> **DECs**: ADR-003, ADR-004, ADR-005, ADR-006, ADR-007, ADR-010
> Hoje (v21) os dados ficam no db do Artifact, nas coleções `conjuntos`, `treinos`, `sessoes` e `config`. A forma dos documentos (§4) **continua igual** dentro de colunas `jsonb` (ADR-006).

## 1. Visão geral

```
auth.users (Supabase)
   └─1:1─ perfis ──1:1── perfis_privados
            │
            ├─1:N─ conjuntos   (dados jsonb: o "conjunto" de hoje)
            ├─1:N─ treinos     (dados jsonb: o "treino" de hoje)
            ├─1:N─ sessoes     (dados jsonb: a "sessão" de hoje)
            ├─1:N─ pontos_eventos (S11, escrito só pelo servidor)
            └─1:1─ placar         (S11, escrito só pelo servidor)

biblioteca_programas ──referencia──▶ biblioteca_treinos   (curadoria do administrador)
convites ──usado_por──▶ perfis
catálogo de exercícios: NO CÓDIGO (src/core/catalogo.js), não no banco (ADR-003)
```

## 2. Tabelas

Convenções: `snake_case`; `timestamptz` para datas; `criado_em`/`atualizado_em` com `default now()`, e um trigger atualiza `atualizado_em`. Ids de documento são texto gerado pelo app (`uid('s')` etc.). A chave primária dos dados do usuário é `(user_id, id)`.

### perfis — dados públicos para os logados
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | = `auth.users.id`, `on delete cascade` |
| `apelido` | text not null | 2–20 caracteres; único sem diferenciar maiúsculas (`unique (lower(apelido))`) |
| `cor` | text | cor do avatar (token da paleta) |
| `papel` | text not null default `'membro'` | `check (papel in ('admin','membro'))`; **só administrador/servidor altera** (trigger) |
| `no_ranking` | boolean not null default `true` | a pessoa pode sair do ranking |
| `ativo` | boolean not null default `true` | `false` = acesso desativado; **só administrador/servidor altera** |
| `criado_em`, `atualizado_em` | timestamptz | |

### perfis_privados — só o dono
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK → `perfis.id` cascade | |
| `peso` | numeric(5,1) | 30–300 kg; usado em pontos e calorias |
| `meta_semanal` | smallint default 2 | 1–7 treinos por semana |
| `aceite_termos_em` | timestamptz | data do consentimento (LGPD) |
| `trocar_senha` | boolean default false | obriga a trocar a senha no próximo acesso (link de redefinição) |
| `preferencias` | jsonb default `'{}'` | reservado |

### convites
| Coluna | Tipo | Regra |
|---|---|---|
| `codigo` | text PK | ≥ 16 caracteres aleatórios (URL-safe), gerados no servidor |
| `tipo` | text default `'convite'` | `'convite'` ou `'senha'` (link de redefinição de senha, S13) |
| `criado_por` | uuid → perfis | |
| `para_user` | uuid null | só para `tipo='senha'` |
| `apelido_sugerido` | text null | pré-preenche o cadastro |
| `expira_em` | timestamptz not null | convite: 7 dias; senha: 24 h |
| `usado_por`, `usado_em` | uuid, timestamptz | preenchidos no uso (uso único) |
| `revogado` | boolean default false | |

### biblioteca_treinos / biblioteca_programas — curadoria
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | text PK | slug legível (`academia-a`, `cal-a`, `calistenia-em-casa`) |
| `dados` | jsonb not null | mesmo formato de `treino` / `conjunto` (§4); em programa, `dados.treinos = [{id: <biblioteca_treinos.id>, dia}]` |
| `publicado` | boolean default false | participantes só veem os publicados |
| `ordem` | int | ordem de exibição |
| `versao` | int default 1 | +1 a cada edição publicada (S14) |
| `criado_por`, `criado_em`, `atualizado_em` | | |

### conjuntos / treinos / sessoes — dados de cada pessoa
| Coluna | Tipo | Regra |
|---|---|---|
| `user_id` | uuid → perfis cascade | sempre `auth.uid()` |
| `id` | text | id gerado pelo app; PK `(user_id, id)` |
| `dados` | jsonb not null | documento completo (§4) |
| `origem` | text null | conjuntos/treinos: id do programa/treino da biblioteca de onde veio |
| `origem_versao` | int null | versão da biblioteca no momento da cópia |
| `status` | text | **só `sessoes`**: `check in ('andamento','concluida')`, extraído de `dados.status` |
| `inicio`, `fim` | timestamptz | **só `sessoes`**: extraídos de `dados` (índice `(user_id, fim desc)`) |
| `rev` | bigint not null default 0 | contador de revisão para detectar conflito entre aparelhos (S06) |
| `atualizado_em` | timestamptz | |

### pontos_eventos (S11) — escrito só pelo servidor
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | bigserial PK | |
| `user_id` | uuid → perfis cascade | |
| `t` | timestamptz not null | quando o ponto foi ganho (fim da sessão, marcação, desafio) |
| `p` | int not null | pontos |
| `tipo` | text | `treino`, `cam`, `extra`, `desafio`, `conquista` |
| `txt` | text | descrição ("Treino A", "Conquista: Primeiro treino") |
| `ref` | text null | id da sessão de origem |
| `regra_versao` | int not null | versão da regra que gerou |
Índices: `(t)`, `(user_id, t)`.

### placar (S11) — escrito só pelo servidor
`user_id` PK · `xp` · `nivel` · `titulo` · `seq` · `escudos` · `treinos_semana` · `kcal_semana` · `recordes` · `conquistas` (int) · `regra_versao` · `calculado_em`.

### Funções SQL
| Função | Tipo | Para quê |
|---|---|---|
| `is_admin()` | `security definer`, `stable` | `perfis.papel = 'admin' and ativo` para `auth.uid()` |
| `proteger_perfil()` | trigger `before update` em `perfis` | impede quem não é administrador de mudar `papel` e `ativo` |
| `substituir_pontos(uid, eventos jsonb, placar jsonb)` (S11) | `security definer`, execute só para `service_role` | apaga e regrava os eventos e o placar de um usuário numa transação |
| `fn_ranking(periodo text)` (S11) | `security definer`, execute para `authenticated` | devolve a tabela do ranking (§3) **sem** expor peso nem histórico |

## 3. Regras de acesso (RLS)

| Tabela | Ler | Inserir / alterar | Apagar |
|---|---|---|---|
| `perfis` | qualquer logado e ativo | dono (apelido, cor, no_ranking); `papel`/`ativo` só administrador | servidor (exclusão de conta) |
| `perfis_privados` | dono | dono | servidor |
| `convites` | administrador | administrador cria/revoga; o uso é pelo servidor | administrador |
| `biblioteca_*` | logado: `publicado = true`; administrador: todos | administrador | administrador |
| `conjuntos`, `treinos`, `sessoes` | dono | dono (`with check (user_id = auth.uid())`) | dono |
| `pontos_eventos` | dono | **ninguém pelo cliente** (servidor) | servidor |
| `placar` | dono | **ninguém pelo cliente** (servidor) | servidor |
| ranking | via `fn_ranking()` para logados | — | — |

O papel `anon` (não logado) não lê **nenhuma** tabela.

`fn_ranking(periodo)` (`'liga'`, `'semana'`, `'geral'`) devolve uma linha por perfil com `ativo and no_ranking`: `user_id, apelido, cor, pontos_periodo, xp, p28, semana, nivel, titulo, seq, treinos_semana, posicao`. A semana começa na segunda 00:00 em `America/Sao_Paulo` (`date_trunc('week', now() at time zone 'America/Sao_Paulo')`); a liga soma `t > now() - interval '28 days'`. Os limiares de liga **não** são duplicados no SQL: o cliente calcula a liga a partir de `p28` com `core/pontuacao.js`.

## 4. Formato dos documentos (`dados` jsonb)

Formato herdado do protótipo v21. Os campos de dono (`user_id`) **não** entram no documento.

- **conjunto** — `{nome, descricao, frequencia, duracao, intervalo, intervaloH, orientacoes:[{t,d}], inicio, aerobico, indicadores:[], treinos:[{id, dia}], ordem, criado, programa?:{semanas, fases:[{de,ate,t,d}], caminhada:[{de,ate,min,vezes}], extras:[]}, fichas?:{<segunda ms>:{cam1:<timestamp>,…}}, semana?:{ini,k}}` (`semana` é legado, lido por `fichasDe`)
- **treino** — `{nome, letra, foco, ordem?, formato?:'circuito', rodadas?, descansoRodada?, aquecimento?:[{t,s}], itens:[{uid, exId|null, nome, nota, dica?, lado?:'lado'|'perna', series, tipo:'reps'|'tempo', min, max, descanso(s), passo, porHalter, semCarga, cargaInicial?}]}`
- **sessão** — `{conjuntoId, conjuntoNome, treinoId, treinoNome, letra, inicio, fim, status, atual, descansoFim, descansoTotal, descansoTipo, formato?, rodadas?, descansoRodada?, aquecimento?, aqFeito?, aqGuiado?, pesoCorp, notas, itens:[…campos do item…, sets:[{carga, reps, esforco, t}]]}`
- **`config/programa`** (v21) **deixa de existir**: `perfil.apelido` → `perfis.apelido`; `perfil.peso`/`perfil.meta` → `perfis_privados`; o resto já foi migrado para `conjuntos/academia` (`migrado:true`).

## 5. Invariantes

| ID | Regra | Consequência da violação | Garantido por |
|---|---|---|---|
| INV-01 | Toda linha de dado pessoal tem `user_id = auth.uid()` de quem escreve | Dados gravados na conta de outra pessoa | RLS `with check` + pgTAP |
| INV-02 | Ninguém lê histórico, treinos, peso ou eventos de outra pessoa | Vazamento de dado de saúde (LGPD) | RLS + pgTAP + auditoria S16 |
| INV-03 | `pontos_eventos` e `placar` só são escritos pelo servidor | Ranking forjado | sem política de escrita para `authenticated` + pgTAP |
| INV-04 | Recalcular os pontos de alguém duas vezes dá o mesmo resultado | Pontos duplicados no ranking | `substituir_pontos` transacional + teste |
| INV-05 | Nenhuma série concluída se perde, nem sem internet nem com dois aparelhos | Perda do treino da pessoa | fila offline + mesclagem por série (S06) |
| INV-06 | Adotar da biblioteca **copia**; editar ou despublicar a biblioteca nunca muda nem quebra a cópia de ninguém | Treino ou histórico de alguém alterado sem pedir | ADR-007 + teste |
| INV-07 | `exId` desconhecido no catálogo vira exercício livre (sem 3D, pontuação genérica), nunca erro | App quebra quando um exercício sai do catálogo | `pxDe()`/`exIdDe()` + teste |
| INV-08 | Semana e hora sempre no fuso `America/Sao_Paulo` | Pontos e sequência diferentes entre aparelho e servidor | `core/tempo.js` + golden (S10) |

## 6. Migração do Artifact (S08)

| Origem (db do Artifact / `data/`) | Destino |
|---|---|
| `treinos/A`, `treinos/B`, `treinos/cal-a`, `treinos/cal-b` | `treinos` do Arthur (mesmos ids) com `origem` = id na biblioteca |
| `conjuntos/academia`, `conjuntos/calistenia` | `conjuntos` do Arthur com `origem` = `full-body-ab` / `calistenia-em-casa` |
| `sessoes/*` | `sessoes` do Arthur (status/inicio/fim extraídos) |
| `config/programa.perfil` | `perfis.apelido = 'Arthur'`, `perfis.papel = 'admin'`, `perfis_privados.peso = 78.5`, `meta_semanal = 2` |
| `seed/seed.json`, `seed/calistenia.json` | `biblioteca_treinos` (`academia-a`, `academia-b`, `cal-a`, `cal-b`) e `biblioteca_programas` (`full-body-ab`, `calistenia-em-casa`), todos publicados (S07) |

Antes da importação, a cópia `data/` é atualizada a partir do db do Artifact (`ArtifactData list`), porque o Arthur continua treinando lá até a virada.
