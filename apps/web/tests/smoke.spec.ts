import { expect, test, type Page } from '@playwright/test';
import { demoState } from '../src/lib/mockData';

const seedCachedWorkspace = async (page: Page) => {
  await page.addInitScript((state) => {
    window.localStorage.setItem('founder-os-state', JSON.stringify(state));
    window.localStorage.setItem('founder-os-selected-project', JSON.stringify(state.project.id));
    window.localStorage.setItem('founder-os-workspace-view', JSON.stringify({
      page: 'dashboard',
      activeSection: 'board',
    }));
  }, demoState);
};

test('board-first shell renders from cached state and keeps core routes reachable', async ({ page }) => {
  await seedCachedWorkspace(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'The board stays the main product surface.' })).toBeVisible();
  await expect(page.getByText('Now working on')).toBeVisible();
  await expect(page.locator('.workspace-status-banner')).toContainText('Showing cached state');

  await page.locator('.run-card-open').first().click();
  await expect(page.getByText('Northstar task view')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: /Approvals/ }).click();
  await expect(page.getByRole('button', { name: /Waiting on me/ })).toBeVisible();
  await page.getByRole('button', { name: 'Preview' }).first().click();
  await expect(page.getByText('Approval detail')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: /Campaigns/ }).click();
  await expect(page.getByRole('heading', { name: 'Grouped execution' })).toBeVisible();
  await expect(page.getByText('Campaign detail')).toBeVisible();

  await page.getByRole('button', { name: /Analytics/ }).click();
  await expect(page.getByText('Active campaigns')).toBeVisible();
  await expect(page.getByText('Approval turnaround')).toBeVisible();

  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByRole('heading', { name: 'Workspace context' })).toBeVisible();
  await expect(page.getByText('Connected accounts')).toBeVisible();
});
