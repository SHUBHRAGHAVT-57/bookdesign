import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const systemChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromiumOptions = existsSync(systemChrome)
  ? { executablePath: systemChrome }
  : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: chromiumOptions } }],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
