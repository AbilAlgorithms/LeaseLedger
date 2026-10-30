import { test, expect } from '@playwright/test';
import http from 'http';
import app from '../../server/src/app.js';
import { seed } from '../../server/src/seed/seed.js';

let server;
let seedData;
const PORT = 5050;

test.beforeAll(async () => {
  seedData = await seed();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
});

test.afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('LeaseLedger End-to-End Demonstration Walkthrough', async ({ page }) => {
  test.setTimeout(120000);
  const baseUrl = `http://localhost:${PORT}`;
  const tenancyAId = seedData.tenancyA._id.toString();

  // Act 1: Landing & Login
  await page.goto(`${baseUrl}/`);
  await page.waitForTimeout(1500);

  await page.goto(`${baseUrl}/login`);
  await page.fill('input[type="email"]', 'asha@leaseledger.test');
  await page.fill('input[type="password"]', 'Asha@1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Act 2: Landlord Dashboard & Properties
  await page.goto(`${baseUrl}/dashboard`);
  await page.waitForTimeout(1500);

  await page.goto(`${baseUrl}/properties`);
  await page.waitForTimeout(1500);

  // Act 3: Tenancy Lifecycle & Inspection
  await page.goto(`${baseUrl}/tenancies/${tenancyAId}`);
  await page.waitForTimeout(2000);

  await page.goto(`${baseUrl}/tenancies/${tenancyAId}/inspections/MOVE_IN/review`);
  await page.waitForTimeout(2500);

  // Act 4: Mid-tenancy issues
  await page.goto(`${baseUrl}/tenancies/${tenancyAId}/issues`);
  await page.waitForTimeout(2000);

  // Act 5: Comparison Engine & Certified Report
  await page.goto(`${baseUrl}/tenancies/${tenancyAId}/comparison`);
  await page.waitForTimeout(2500);

  await page.goto(`${baseUrl}/tenancies/${tenancyAId}/report`);
  await page.waitForTimeout(2500);

  // Public Report View
  const shareToken = seedData.shareA.shareToken;
  await page.goto(`${baseUrl}/shared/reports/${shareToken}`);
  await page.waitForTimeout(2500);

  // Act 6: Admin Governance Console
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[type="email"]', 'admin@leaseledger.test');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  await page.goto(`${baseUrl}/admin`);
  await page.waitForTimeout(2000);

  await page.goto(`${baseUrl}/admin/audit`);
  await page.waitForTimeout(2000);
});
