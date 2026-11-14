import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/mobile',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:18008',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // A separate port keeps the user's LAN development server available.
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 18008 --strictPort',
    url: 'http://127.0.0.1:18008',
    reuseExistingServer: false,
  },
})
