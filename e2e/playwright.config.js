import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './capture',
  timeout: 90000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:5050',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 900 },
    video: 'off',
    trace: 'on',
    screenshot: 'on',
  },
  outputDir: '../docs/demo/recordings',
});
