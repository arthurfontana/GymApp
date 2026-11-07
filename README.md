# GymApp (Meu Treino 3D)

Página de treino pessoal com boneco 3D (22 exercícios), jornada de treino (conjuntos → treinos → sessão ao vivo → resumo) e gamificação (pontos, nível, liga de 28 dias, sequência, desafios, conquistas, calorias).

Roda como Artifact do claude.ai: https://claude.ai/artifact/7rca7r3eRxTwX4kiZ4B7zK

```bash
cd web
npm install
python3 build.py        # monta index.html e test.html
npm run serve           # http://localhost:8765/test.html
```

O contexto completo para continuar a evolução (regras, decisões, estrutura) está em [CLAUDE.md](CLAUDE.md).

Modelo anatômico: Z-Anatomy / BodyParts3D, CC BY-SA 4.0 (ver `third_party/fitmitwith-anatomy-atlas-master/ATTRIBUTION.txt`).
