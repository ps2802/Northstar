import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');
const localPlaywrightPath = path.join(rootDir, '.context/playwright-runner/node_modules/playwright');

const loadPlaywright = async () => {
  if (existsSync(localPlaywrightPath)) {
    return import(path.join(localPlaywrightPath, 'index.mjs'));
  }

  const require = createRequire(import.meta.url);
  return require('playwright');
};

const { chromium } = await loadPlaywright();

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173';
const runMutations = process.env.SMOKE_MUTATIONS === '1';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const fail = async (message) => {
  await browser.close();
  throw new Error(message);
};

const expectVisible = async (locator, message, timeout = 15000) => {
  try {
    await locator.waitFor({ state: 'visible', timeout });
  } catch {
    await fail(message);
  }
};

const openNav = async (label) => {
  await page.locator('.workspace-nav-item', { hasText: label }).first().click();
};

const closeDrawer = async () => {
  const drawer = page.locator('.drawer');
  if (await drawer.count()) {
    await page.getByRole('button', { name: 'Close' }).last().click();
    await drawer.waitFor({ state: 'hidden', timeout: 15000 });
  }
};

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText('Now working on', { exact: true }), 'Board did not load as the default route.');
  await expectVisible(page.getByText('Waiting on you', { exact: true }), 'Board waiting section did not render.');
  await expectVisible(page.getByText('Queued next', { exact: true }), 'Board queued section did not render.');
  await expectVisible(page.getByText('Recently shipped', { exact: true }), 'Board shipped section did not render.');

  const firstBoardCard = page.locator('.run-card .run-card-open').first();
  await expectVisible(firstBoardCard, 'Board did not render any task cards.');
  await firstBoardCard.click();
  await expectVisible(page.locator('.drawer'), 'Task drawer did not open from the board.');
  await closeDrawer();

  if (runMutations) {
    const smokeTitle = `Smoke Blog Brief ${Date.now()}`;
    await page.getByText('Queue manual work', { exact: true }).click();
    await expectVisible(page.getByLabel('Title'), 'Manual task form did not open.');
    await page.getByLabel('Title').fill(smokeTitle);
    await page.getByLabel('Type').selectOption('blog_brief');
    await page.getByRole('button', { name: 'Add to inbox' }).click();
    await page.getByLabel('Search').fill(smokeTitle);
    await expectVisible(page.getByRole('heading', { name: smokeTitle }), 'Smoke task did not appear on the board.');
    await page.getByRole('heading', { name: smokeTitle }).click();
    await expectVisible(page.getByRole('button', { name: /Generate blog brief/i }), 'Generate action was not available for the smoke task.');
    await page.getByRole('button', { name: /Generate blog brief/i }).click();
    await expectVisible(page.getByRole('button', { name: /Approve draft/i }), 'Approve action was not available after draft generation.');
    await page.getByRole('button', { name: /Approve draft/i }).click();
    await closeDrawer();
    await page.getByLabel('Search').fill(smokeTitle);
    await expectVisible(page.getByRole('heading', { name: smokeTitle }), 'Approved smoke task was not visible after approval.');
  }

  await openNav('Approvals');
  await expectVisible(page.getByRole('button', { name: /Waiting on me/i }), 'Approvals filter row did not render.');
  await expectVisible(page.getByRole('button', { name: /Approved/i }), 'Approved filter did not render.');
  await expectVisible(page.getByRole('button', { name: /Changes requested/i }), 'Changes requested filter did not render.');
  const approvalPreview = page.getByRole('button', { name: 'Preview' }).first();
  if (await approvalPreview.count()) {
    await approvalPreview.click();
    await expectVisible(page.locator('.drawer'), 'Approval preview drawer did not open.');
    await closeDrawer();
  }

  await openNav('Campaigns');
  await expectVisible(page.getByText('Grouped execution', { exact: true }), 'Campaigns list did not render.');
  await expectVisible(page.getByText('Campaign detail', { exact: true }), 'Campaign detail panel did not render.');

  await openNav('Analytics');
  await expectVisible(page.getByText('Active campaigns', { exact: true }), 'Analytics summary did not render active campaigns.');
  await expectVisible(page.getByText('Approval turnaround', { exact: true }), 'Analytics summary did not render approval turnaround.');

  await openNav('Settings');
  await expectVisible(page.getByText('Workspace context', { exact: true }), 'Settings context section did not render.');
  await expectVisible(page.getByText('Connected accounts', { exact: true }), 'Settings account health section did not render.');
  await expectVisible(page.locator('.workspace-connection-strip'), 'Top-bar connection summary did not render.');

  console.log(`Smoke UI checks passed against ${baseUrl}${runMutations ? ' with mutations' : ''}.`);
  await browser.close();
} catch (error) {
  await browser.close();
  throw error;
}
