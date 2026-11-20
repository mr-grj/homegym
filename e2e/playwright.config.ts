import { defineConfig } from '@playwright/test'

const demo = 'http://localhost:4173/homegym/'

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { colorScheme: 'dark', viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure' },
  projects: [
    { name: 'demo', testIgnore: /self-hosted/, use: { baseURL: process.env.BASE_URL ?? demo } },
    { name: 'self-hosted', testMatch: /self-hosted/, use: { baseURL: process.env.SELF_HOSTED_URL } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build -- --base=/homegym/ && npm run preview -- --base=/homegym/ --port 4173 --strictPort',
        cwd: '../web',
        env: { VITE_DEMO: '1' },
        url: demo,
        reuseExistingServer: !process.env.CI,
      },
})
