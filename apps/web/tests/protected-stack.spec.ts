import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const providerList = [
  { key: 'northstar_cli', name: 'Northstar CLI', auth_type: 'cli', status: 'available', description: 'Use Northstar against the founder\'s current local or hosted model setup.', model_hint: 'Current local or CLI model', is_default: false },
  { key: 'openrouter', name: 'OpenRouter', auth_type: 'api_key', status: 'connected', description: 'Generate assets through OpenRouter\'s OpenAI-compatible execution path.', model_hint: 'openai/gpt-4.1-mini', is_default: true },
  { key: 'openai', name: 'OpenAI', auth_type: 'api_key', status: 'needs_key', description: 'Generate assets through the direct OpenAI API.', model_hint: 'gpt-4.1-mini', is_default: false },
  { key: 'anthropic', name: 'Anthropic', auth_type: 'api_key', status: 'needs_key', description: 'Run Northstar generation through Claude models.', model_hint: 'Claude 4.x', is_default: false },
  { key: 'kimi', name: 'Kimi', auth_type: 'api_key', status: 'needs_key', description: 'Use Kimi when the founder prefers Moonshot\'s stack.', model_hint: 'Kimi latest', is_default: false },
  { key: 'minimax', name: 'MiniMax', auth_type: 'api_key', status: 'needs_key', description: 'Use MiniMax for teams standardizing there.', model_hint: 'MiniMax latest', is_default: false },
];

const openNav = async (page: Page, label: string) => {
  await page.locator('.workspace-nav-item', { hasText: label }).first().click();
  await page.waitForTimeout(300);
};

const waitForWorkspaceShell = async (page: Page) => {
  const loadingHeading = page.getByRole('heading', { name: 'Loading the founder workspace.' });
  if (await loadingHeading.isVisible().catch(() => false)) {
    await expect(loadingHeading).toBeHidden({ timeout: 20_000 });
  }
};

const getAppBaseUrl = () => test.info().project.use.baseURL ?? 'http://127.0.0.1:4173';

const getApiBaseUrl = () => {
  const override = process.env.PLAYWRIGHT_API_BASE_URL;
  if (override) {
    return override.replace(/\/$/, '');
  }

  const appBaseUrl = getAppBaseUrl();
  if (appBaseUrl === 'http://127.0.0.1:4173') {
    return 'http://127.0.0.1:4000';
  }

  return new URL('/api', appBaseUrl).toString().replace(/\/$/, '');
};

const normalizeStoredSession = (session: Record<string, unknown>) => ({
  id: String(session.id ?? ''),
  workspaceId: String(session.workspace_id ?? session.workspaceId ?? ''),
  projectId: session.project_id ?? session.projectId ?? null,
  email: String(session.email ?? ''),
  name: String(session.name ?? ''),
  role: session.role === 'MEMBER' ? 'member' : 'founder',
  status: session.status === 'EXPIRED' ? 'expired' : session.status === 'REVOKED' ? 'revoked' : 'active',
  lastSeenAt: typeof session.last_seen_at === 'string'
    ? session.last_seen_at
    : typeof session.lastSeenAt === 'string'
      ? session.lastSeenAt
      : null,
  expiresAt: typeof session.expires_at === 'string'
    ? session.expires_at
    : typeof session.expiresAt === 'string'
      ? session.expiresAt
      : null,
  createdAt: String(session.created_at ?? session.createdAt ?? ''),
  updatedAt: String(session.updated_at ?? session.updatedAt ?? ''),
});

const requestJson = async <T>(
  request: APIRequestContext,
  url: string,
  init?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    data?: unknown;
  }
) => {
  const response = await request.fetch(url, {
    method: init?.method ?? 'GET',
    headers: init?.headers,
    data: init?.data,
  });

  const body = await response.text();
  const payload = body ? JSON.parse(body) as T : null;
  if (!response.ok()) {
    throw new Error(`${response.status()} ${body}`);
  }

  return payload as T;
};

const onboardWorkspace = async (request: APIRequestContext) => {
  const now = Date.now();
  const email = `qa+${now}@northstar.local`;
  return requestJson<{
    dashboard: {
      workspace: { id: string };
      project: { id: string };
    };
    session: Record<string, unknown>;
    token: string;
  }>(request, `${getApiBaseUrl()}/projects/onboard`, {
    method: 'POST',
    data: {
      website_url: process.env.QA_WEBSITE_URL ?? 'https://northstar-api-rust.vercel.app',
      email,
    },
  });
};

const seedSession = async (page: Page, sessionBundle: { token: string; session: Record<string, unknown>; projectId: string }) => {
  await page.addInitScript((bundle) => {
    window.localStorage.setItem('founder-os-session', JSON.stringify({
      token: bundle.token,
      session: bundle.session,
    }));
    window.localStorage.setItem('founder-os-selected-project', JSON.stringify(bundle.projectId));
    window.localStorage.setItem('founder-os-workspace-view', JSON.stringify({
      page: 'dashboard',
      activeSection: 'board',
    }));
  }, sessionBundle);
};

test.describe('protected stack regression', () => {
  test.skip(!process.env.PLAYWRIGHT_PROTECTED, 'Protected-stack QA is opt-in and expects a real base URL.');

  test('board-first shell stays reachable on a protected stack', async ({ page, request }) => {
    const onboarded = await onboardWorkspace(request);
    await seedSession(page, {
      token: onboarded.token,
      session: normalizeStoredSession(onboarded.session),
      projectId: onboarded.dashboard.project.id,
    });

    await page.goto(getAppBaseUrl());
    await waitForWorkspaceShell(page);
    await expect(page.getByText('Now working on')).toBeVisible();
    await expect(page.getByText('Waiting on you')).toBeVisible();

    await openNav(page, 'Approvals');
    await waitForWorkspaceShell(page);
    await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible();

    await openNav(page, 'Campaigns');
    await waitForWorkspaceShell(page);
    await expect(page.getByRole('heading', { name: 'Grouped execution' })).toBeVisible();

    await openNav(page, 'Analytics');
    await waitForWorkspaceShell(page);
    await expect(page.getByText('Active campaigns')).toBeVisible();

    await openNav(page, 'Settings');
    await waitForWorkspaceShell(page);
    await expect(page.getByRole('heading', { name: 'Workspace context' })).toBeVisible();
  });

  test('live blog brief execution reaches board and approvals on a protected stack', async ({ page, request }) => {
    test.setTimeout(120_000);
    test.skip(!process.env.QA_OPENROUTER_KEY, 'QA_OPENROUTER_KEY is required for live provider execution.');

    const onboarded = await onboardWorkspace(request);
    const sessionHeaders = { 'x-northstar-session': onboarded.token };
    const workspaceId = onboarded.dashboard.workspace.id;
    const projectId = onboarded.dashboard.project.id;

    const providerResult = await requestJson<{
      provider: {
        status: 'NOT_CONFIGURED' | 'CONFIGURED' | 'ERROR';
        last_validated_at?: string | null;
        last_error?: string | null;
      };
    }>(request, `${getApiBaseUrl()}/workspaces/${workspaceId}/providers/openrouter`, {
      method: 'PUT',
      headers: sessionHeaders,
      data: {
        label: 'OpenRouter',
        auth_type: 'api_key',
        status: 'CONFIGURED',
        base_url: 'https://openrouter.ai/api/v1',
        default_model: 'openai/gpt-4.1-mini',
        api_key: process.env.QA_OPENROUTER_KEY,
      },
    });

    await requestJson(request, `${getApiBaseUrl()}/projects/${projectId}/configuration`, {
      method: 'POST',
      headers: sessionHeaders,
      data: {
        execution_provider: {
          active_provider: 'openrouter',
          providers: providerList.map((provider) => provider.key === 'openrouter'
            ? {
                ...provider,
                status: providerResult.provider.status === 'CONFIGURED' ? 'connected' : 'error',
                connected_at: providerResult.provider.last_validated_at ?? undefined,
                last_error: providerResult.provider.last_error ?? undefined,
              }
            : provider),
        },
      },
    });

    const taskResult = await requestJson<{ task: { id: string; title: string } }>(request, `${getApiBaseUrl()}/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: sessionHeaders,
      data: {
        title: 'Draft blog brief: protected stack regression',
        type: 'BLOG_BRIEF',
        impact: 5,
        effort: 2,
        confidence: 5,
        goal_fit: 5,
        rationale: 'Validate the protected-stack OpenRouter execution path.',
      },
    });

    await requestJson(request, `${getApiBaseUrl()}/projects/${projectId}/tasks/${taskResult.task.id}/status`, {
      method: 'POST',
      headers: sessionHeaders,
      data: { status: 'PLANNED' },
    });

    await requestJson(request, `${getApiBaseUrl()}/projects/${projectId}/tasks/${taskResult.task.id}/execute`, {
      method: 'POST',
      headers: sessionHeaders,
      data: {},
    });

    await seedSession(page, {
      token: onboarded.token,
      session: normalizeStoredSession(onboarded.session),
      projectId,
    });

    await page.goto(getAppBaseUrl());
    await waitForWorkspaceShell(page);
    await expect(page.getByText('Waiting on you')).toBeVisible();
    await expect(page.getByText('Draft blog brief: protected stack regression')).toBeVisible();

    await openNav(page, 'Approvals');
    await expect(page.getByText('Draft blog brief: protected stack regression')).toBeVisible();
  });
});
