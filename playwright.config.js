// Testes e2e com assert (S02). Rodam contra o build de produção (npm run preview),
// no Chromium, em 390×844, nos temas claro e escuro. Sem comparação de pixel:
// os prints viram anexos do relatório. Rodar com: npm run test:e2e
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    trace: 'off',
    launchOptions: {
      // WebGL por software (sem GPU no contêiner/CI)
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    { name: 'claro', use: { browserName: 'chromium', colorScheme: 'light', tema: 'light' } },
    { name: 'escuro', use: { browserName: 'chromium', colorScheme: 'dark', tema: 'dark' } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
