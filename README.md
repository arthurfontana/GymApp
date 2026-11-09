# GymApp (Meu Treino 3D)

Página de treino pessoal com boneco 3D (22 exercícios), jornada de treino (conjuntos → treinos → sessão ao vivo → resumo) e gamificação (pontos, nível, liga de 28 dias, sequência, desafios, conquistas, calorias).

Roda como Artifact do claude.ai: https://claude.ai/artifact/7rca7r3eRxTwX4kiZ4B7zK

```bash
npm install
npm run dev             # http://localhost:5173 (com ?test=1 liga os ganchos de teste)
npm run check           # guard do CLAUDE.md + testes unitários + build (dist/)
npm run test:e2e        # testes de ponta a ponta com assert (Playwright, claro e escuro)
npm run build:artifact  # dist-artifact/: arquivo único para o Artifact + body-model.wasm
```

O contexto completo para continuar a evolução (regras, decisões, estrutura) está em [CLAUDE.md](CLAUDE.md).

Modelo anatômico: Z-Anatomy / BodyParts3D, CC BY-SA 4.0 (ver `third_party/fitmitwith-anatomy-atlas-master/ATTRIBUTION.txt`).
