import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3101',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev -- --hostname 127.0.0.1 --port 3101',
        url: 'http://127.0.0.1:3101',
        env: {
          ...process.env,
          X402_PAY_TO: process.env.X402_PAY_TO || '0x1111111111111111111111111111111111111111',
          X402_DEV_BYPASS: process.env.X402_DEV_BYPASS || 'false',
          X402_DEV_PAID_TOKEN: process.env.X402_DEV_PAID_TOKEN || 'netnet-local-paid-token',
        },
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
