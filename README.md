# GymApp (Meu Treino 3D)

Página de treino pessoal com boneco 3D (22 exercícios), jornada de treino (conjuntos → treinos → sessão ao vivo → resumo) e gamificação (pontos, nível, liga de 28 dias, sequência, desafios, conquistas, calorias).

**App no ar (Vercel):** https://gym-app-pied-five.vercel.app/ — instalável no celular (Chrome Android: "Instalar app"; iPhone: Safari → Compartilhar → "Adicionar à Tela de Início"). Cada PR ganha um link de preview; `main` vai para produção. Por enquanto sem login: os dados ficam só no aparelho.

Também roda como Artifact do claude.ai (uso do dia a dia até a S09): https://claude.ai/artifact/7rca7r3eRxTwX4kiZ4B7zK

```bash
npm install
npm run dev             # http://localhost:5173 (com ?test=1 liga os ganchos de teste)
npm run check           # guard do CLAUDE.md + testes unitários + build (dist/)
npm run test:e2e        # testes de ponta a ponta com assert (Playwright, claro e escuro)
npm run build:artifact  # dist-artifact/: arquivo único para o Artifact + body-model.wasm
```

O 3D (three + modelo de 4 MB) só carrega ao abrir a biblioteca, um exercício ou a prévia da sessão; o Início abre sem ele.

O contexto completo para continuar a evolução (regras, decisões, estrutura) está em [CLAUDE.md](CLAUDE.md). A documentação normativa (arquitetura, funcionalidades, decisões, roadmap) fica na [Wiki](https://github.com/arthurfontana/GymApp/wiki), espelhada em `docs/wiki/`.

Modelo 3D: "Male base muscular anatomy", de CharacterZone, licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ([original no Sketchfab](https://sketchfab.com/3d-models/male-base-muscular-anatomy-0954aa04666d45aab9633009318f7b66)). O crédito completo aparece no app (rodapé das telas 3D e da biblioteca).

Modelo anatômico: Z-Anatomy / BodyParts3D, CC BY-SA 4.0 (ver `third_party/fitmitwith-anatomy-atlas-master/ATTRIBUTION.txt`).
