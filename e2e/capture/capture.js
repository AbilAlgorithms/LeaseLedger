import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import http from 'http';
import { chromium } from '@playwright/test';
import app from '../../server/src/app.js';
import { seed } from '../../server/src/seed/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, '../../docs/screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function run() {
  console.log('--- STARTING AUTOMATED SCREENSHOT CAPTURE (28 required) ---');

  // 1. Run seed
  const seedData = await seed();
  const tenancyAId = seedData.tenancyA._id.toString();
  const tenancyBId = seedData.tenancyB._id.toString();
  const propertyAId = seedData.tenancyA.property._id.toString();
  const shareToken = seedData.shareA.shareToken;
  const inviteToken = seedData.rawInviteToken;

  // 2. Start Express server on port 5050
  const PORT = 5050;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;
  console.log(`[Capture] Server listening at ${baseUrl}`);

  // 3. Launch Chrome Headless
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Hi-DPI crisp rendering
  });
  const page = await context.newPage();

  async function takeScreenshot(name) {
    const filePath = path.join(screenshotsDir, name);
    await page.waitForTimeout(800); // Allow render & animations
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[Screenshot Captured] ${name}`);
  }

  async function loginAs(email, password) {
    await page.goto(`${baseUrl}/login`);
    await page.waitForSelector('input[name="email"], input[type="email"]');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
  }

  // 01-landing.png
  await page.goto(`${baseUrl}/`);
  await page.waitForTimeout(800);
  await takeScreenshot('01-landing.png');

  // 02-login.png
  await page.goto(`${baseUrl}/login`);
  await page.waitForSelector('input[type="email"]');
  await takeScreenshot('02-login.png');

  // 03-register.png
  await page.goto(`${baseUrl}/register`);
  await page.waitForSelector('input[name="name"]');
  await takeScreenshot('03-register.png');

  // Log in as Landlord Asha
  await loginAs('asha@leaseledger.test', 'Asha@1234');

  // 04-dashboard-landlord.png
  await page.goto(`${baseUrl}/dashboard`);
  await page.waitForTimeout(1000);
  await takeScreenshot('04-dashboard-landlord.png');

  // 06-properties-list.png
  await page.goto(`${baseUrl}/properties`);
  await page.waitForTimeout(1000);
  await takeScreenshot('06-properties-list.png');

  // 07-property-detail.png
  await page.goto(`${baseUrl}/properties/${propertyAId}`);
  await page.waitForTimeout(1000);
  await takeScreenshot('07-property-detail.png');

  // 08-room-management.png
  await page.evaluate(() => window.scrollTo(0, 350));
  await page.waitForTimeout(500);
  await takeScreenshot('08-room-management.png');

  // 09-inventory-item-create.png
  await page.evaluate(() => window.scrollTo(0, 750));
  await page.waitForTimeout(500);
  await takeScreenshot('09-inventory-item-create.png');

  // 10-create-tenancy.png
  await page.goto(`${baseUrl}/tenancies/new`);
  await page.waitForTimeout(1000);
  await takeScreenshot('10-create-tenancy.png');

  // 11-tenancy-detail-landlord.png
  await page.goto(`${baseUrl}/tenancies/${tenancyAId}`);
  await page.waitForTimeout(1000);
  await takeScreenshot('11-tenancy-detail-landlord.png');

  // 12-invite-tenant-modal.png (on tenancy B)
  await page.goto(`${baseUrl}/tenancies/${tenancyBId}`);
  await page.waitForTimeout(1000);
  const inviteBtn = await page.$('button:has-text("Invite Tenant")');
  if (inviteBtn) {
    await inviteBtn.click();
    await page.waitForTimeout(500);
  }
  await takeScreenshot('12-invite-tenant-modal.png');

  // 13-join-tenancy-public.png (Logged out context)
  const loggedOutContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const pagePublic = await loggedOutContext.newPage();
  await pagePublic.goto(`${baseUrl}/join/${inviteToken}`);
  await pagePublic.waitForTimeout(1000);
  const path13 = path.join(screenshotsDir, '13-join-tenancy-public.png');
  await pagePublic.screenshot({ path: path13 });
  console.log('[Screenshot Captured] 13-join-tenancy-public.png');

  // 14-inspection-wizard-step1.png (on Tenancy B draft inspection)
  await page.goto(`${baseUrl}/tenancies/${tenancyBId}/inspections/MOVE_IN`);
  await page.waitForTimeout(1200);
  await takeScreenshot('14-inspection-wizard-step1.png');

  // 15-inspection-wizard-photo-upload.png
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(500);
  await takeScreenshot('15-inspection-wizard-photo-upload.png');

  // 16-inspection-meter-reading.png
  await page.evaluate(() => window.scrollTo(0, 650));
  await page.waitForTimeout(500);
  await takeScreenshot('16-inspection-meter-reading.png');

  // 17-inspection-review-dual-sign.png (on Tenancy B review)
  await page.goto(`${baseUrl}/tenancies/${tenancyBId}/inspections/MOVE_IN/review`);
  await page.waitForTimeout(1200);
  await takeScreenshot('17-inspection-review-dual-sign.png');

  // 18-inspection-locked-view.png (on Tenancy A locked inspection)
  await page.goto(`${baseUrl}/tenancies/${tenancyAId}/inspections/MOVE_IN/review`);
  await page.waitForTimeout(1200);
  await takeScreenshot('18-inspection-locked-view.png');

  // 19-amendment-request-modal.png
  const amendBtn = await page.$('button:has-text("Amend")');
  if (amendBtn) {
    await amendBtn.click();
    await page.waitForTimeout(400);
  }
  await takeScreenshot('19-amendment-request-modal.png');

  // 20-issues-list.png
  await page.goto(`${baseUrl}/tenancies/${tenancyAId}/issues`);
  await page.waitForTimeout(1000);
  await takeScreenshot('20-issues-list.png');

  // 21-report-issue-modal.png
  const reportIssueBtn = await page.$('button:has-text("Report New Incident")');
  if (reportIssueBtn) {
    await reportIssueBtn.click();
    await page.waitForTimeout(400);
  }
  await takeScreenshot('21-report-issue-modal.png');

  // 22-comparison-page.png
  await page.goto(`${baseUrl}/tenancies/${tenancyAId}/comparison`);
  await page.waitForTimeout(1200);
  await takeScreenshot('22-comparison-page.png');

  // 23-comparison-preexisting-badge.png
  await page.evaluate(() => window.scrollTo(0, 450));
  await page.waitForTimeout(500);
  await takeScreenshot('23-comparison-preexisting-badge.png');

  // 24-report-page.png
  await page.goto(`${baseUrl}/tenancies/${tenancyAId}/report`);
  await page.waitForTimeout(1200);
  await takeScreenshot('24-report-page.png');

  // 25-report-share-link.png
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(500);
  await takeScreenshot('25-report-share-link.png');

  // 26-shared-report-public.png
  await pagePublic.goto(`${baseUrl}/shared/reports/${shareToken}`);
  await pagePublic.waitForTimeout(1200);
  const path26 = path.join(screenshotsDir, '26-shared-report-public.png');
  await pagePublic.screenshot({ path: path26 });
  console.log('[Screenshot Captured] 26-shared-report-public.png');

  // 27-notifications-center.png
  await page.goto(`${baseUrl}/notifications`);
  await page.waitForTimeout(1000);
  await takeScreenshot('27-notifications-center.png');

  // Log in as Tenant Ravi for 05-dashboard-tenant.png
  await loginAs('ravi@leaseledger.test', 'Ravi@1234');
  await page.goto(`${baseUrl}/dashboard`);
  await page.waitForTimeout(1000);
  await takeScreenshot('05-dashboard-tenant.png');

  // Log in as Admin for 28-admin-console.png
  await loginAs('admin@leaseledger.test', 'Admin@123');
  await page.goto(`${baseUrl}/admin`);
  await page.waitForTimeout(1000);
  await takeScreenshot('28-admin-console.png');

  // Cleanup
  await browser.close();
  await loggedOutContext.close();
  await new Promise((resolve) => server.close(resolve));

  console.log('\n--- ALL 28 SCREENSHOTS CAPTURED SUCCESSFULLY IN docs/screenshots/ ---');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Screenshot capture failed:', err);
    process.exit(1);
  });
