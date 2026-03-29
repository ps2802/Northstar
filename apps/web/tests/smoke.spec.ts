import { expect, test, type Page } from '@playwright/test';
import { demoState } from '../src/lib/mockData';

const openNav = async (page: Page, label: string) => {
  await page.locator('.workspace-nav-item', { hasText: label }).first().click();
};

const closeDrawer = async (page: Page) => {
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.locator('.drawer')).toBeHidden();
};

const seedCachedWorkspace = async (page: Page) => {
  await page.addInitScript((state) => {
    const cachedState = {
      ...state,
      workspaceTruth: {
        ...state.workspaceTruth,
        source: 'cached',
        freshness: 'stale',
      },
    };
    window.localStorage.setItem('founder-os-state', JSON.stringify(cachedState));
    window.localStorage.setItem('founder-os-selected-project', JSON.stringify(cachedState.project.id));
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
  await expect(page.locator('.workspace-status-banner')).toContainText('Cached stale workspace');

  await page.locator('.run-card-open').first().click();
  await expect(page.locator('.drawer')).toBeVisible();
  await closeDrawer(page);

  await openNav(page, 'Approvals');
  await expect(page.getByRole('button', { name: /Waiting on me/ })).toBeVisible();
  await page.getByRole('button', { name: 'Preview' }).first().click();
  await expect(page.locator('.drawer')).toBeVisible();
  await closeDrawer(page);

  await openNav(page, 'Campaigns');
  await expect(page.locator('.campaign-shell')).toBeVisible();
  await expect(page.getByText('Campaign detail')).toBeVisible();

  await openNav(page, 'Analytics');
  await expect(page.getByText('Active campaigns')).toBeVisible();
  await expect(page.getByText('Approval turnaround')).toBeVisible();

  await openNav(page, 'Settings');
  await page.getByRole('button', { name: 'Open connections' }).click();
  await expect(page.getByRole('heading', { name: 'Preferred wrapper by capability' })).toBeVisible();
  await expect(page.getByText('Communication and identity')).toBeVisible();

  await openNav(page, 'Settings');
  await expect(page.getByRole('heading', { name: 'Workspace context' })).toBeVisible();
  await expect(page.getByText('Credential truth')).toBeVisible();
  await expect(page.getByText(/learned preferences/i)).toBeVisible();
});
