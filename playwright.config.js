// Cross-browser and device compatibility checks. Run with: npm test
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  // Test the built output, served as plain static files like GitHub Pages.
  webServer: {
    command: `npm run build && node tests/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    // Desktop browsers
    { name: 'Chrome desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'Firefox desktop', use: { ...devices['Desktop Firefox'] } },
    { name: 'Safari desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'Chrome 1920', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },

    // Phones
    { name: 'iPhone SE', use: { ...devices['iPhone SE'] } },                  // 320px, WebKit
    { name: 'iPhone 17 Pro', use: { ...devices['iPhone 17 Pro'] } },          // WebKit
    { name: 'Galaxy S9+', use: { ...devices['Galaxy S9+'] } },                // 320px, Chromium
    { name: 'Galaxy S24', use: { ...devices['Galaxy S24'] } },
    { name: 'Pixel 9', use: { ...devices['Pixel 9'] } },
    { name: 'Firefox phone width', use: { ...devices['Desktop Firefox'], viewport: { width: 375, height: 667 } } },

    // Tablets
    { name: 'iPad Mini', use: { ...devices['iPad Mini'] } },
    { name: 'iPad Pro 11', use: { ...devices['iPad Pro 11'] } },
    { name: 'Galaxy Tab S9', use: { ...devices['Galaxy Tab S9'] } },
  ],
});
