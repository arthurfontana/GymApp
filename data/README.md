# Cópia dos dados (snapshot do banco do Artifact)

Fonte da verdade: o banco (`db`) do Artifact. Esta pasta é uma **cópia de segurança** em JSON: `treinos/`, `conjuntos/`, `sessoes/` (histórico de treinos) e `config/`.

- Atualizar: pedir ao Claude "atualize a pasta data/ com o banco" (usa `ArtifactData` com `action:"list"` e `out_dir`), depois commit.
- Restaurar: `ArtifactData` com `set`/`batch` e `file_path` apontando para cada JSON.
- Última cópia: 07/11/2026.
