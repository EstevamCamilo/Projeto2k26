import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve.mjs --port 4173',
    url: 'http://127.0.0.1:4173/Biblioteca/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
