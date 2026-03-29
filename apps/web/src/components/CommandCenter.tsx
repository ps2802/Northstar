import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFounderApi, LIVE_SESSION_REQUIRED_MESSAGE } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { demoState } from '../lib/mockData';
import { executableTaskTypes } from '../lib/taskConfig';
import type {
  AgentToolCategory,
  AppState,
  Approval,
  DashboardSection,
  FounderIntake,
  OnboardingDraft,
  Task,
  WorkspaceTruth,
} from '../lib/types';
import type { NewTaskInput, TaskStatus } from '../lib/types';
import { AddTaskForm } from './AddTaskForm';
import { AnalyticsSummaryPanel } from './AnalyticsSummaryPanel';
import { ApprovalQueue } from './ApprovalQueue';
import { CampaignsPanel } from './CampaignsPanel';
import { ConnectionsPanel } from './ConnectionsPanel';
import { KanbanBoard } from './KanbanBoard';
import { Onboarding } from './Onboarding';
import { TaskDrawer } from './TaskDrawer';
import { WorkspaceNav } from './WorkspaceNav';

const api = createFounderApi();
const ONBOARDING_DRAFT_KEY = 'founder-os-onboarding-draft';
const FOUNDER_CONTEXT_KEY = 'founder-os-founder-context';
const WORKSPACE_VIEW_KEY = 'founder-os-workspace-view';
const SELECTED_PROJECT_KEY = 'founder-os-selected-project';

const defaultFounderIntake: FounderIntake = {
  websiteUrl: 'https://acme-studio.com',
  businessDescription: 'A boutique growth and design studio helping founder-led businesses improve conversion, visibility, and positioning.',
  icp: 'Founder-led SaaS and service businesses with lean teams and inconsistent growth systems.',
  mainGoal: 'Generate more qualified pipeline from content and website improvements.',
  keyChannel: 'SEO, homepage messaging, and founder-led social content',
  whatTried: 'A few blog posts, scattered LinkedIn posts, and ad hoc website updates.',
  priorityWork: 'Clarify the GTM priorities first, then create the first SEO and content tasks.',
  competitors: 'Growth.design, Animalz, and boutique conversion agencies',
  bottleneck: 'conversion',
  authMethod: 'email',
  email: 'founder@acme-studio.com',
};

const sectionMeta: Record<DashboardSection, { eyebrow: string; title: string; copy: string }> = {
  command_center: {
    eyebrow: 'Board',
    title: 'The board stays the main founder surface.',
    copy: 'Use the board to review current work, founder blockers, and the few actions that are actually live.',
  },
  board: {
    eyebrow: 'Board',
    title: 'The board stays the main product surface.',
    copy: 'Tasks should scan like a project system first: active work, founder blockers, approvals, and why each move matters.',
  },
  gtm_plan: {
    eyebrow: 'Analytics',
    title: 'A light operating summary, not a reporting suite.',
    copy: 'Use this view to scan campaign movement, review speed, and channel signal without leaving the board-first workflow.',
  },
  seo: {
    eyebrow: 'SEO',
    title: 'Search work should be explicit and operational.',
    copy: 'Keyword structure, page opportunity, and execution-ready tasks live here.',
  },
  content: {
    eyebrow: 'Campaigns',
    title: 'Campaigns group the board into coherent execution arcs.',
    copy: 'Use Campaigns to see grouped runs, outputs, and approvals without creating a second operating system.',
  },
  social: {
    eyebrow: 'Social',
    title: 'Founder-led signal with a real operating loop.',
    copy: 'Use the board to prioritize social work that supports positioning, launch rhythm, and demand capture.',
  },
  feature_suggestions: {
    eyebrow: 'Feature Suggestions',
    title: 'Product ideas should stay grounded in founder leverage.',
    copy: 'Use this surface for concrete feature opportunities that sharpen positioning, remove workflow friction, or strengthen the dogfood story.',
  },
  website: {
    eyebrow: 'Website',
    title: 'Messaging clarity and conversion work in one place.',
    copy: 'Homepage, landing page, CTA, and product-signal improvements should stay connected to the current backlog.',
  },
  research: {
    eyebrow: 'Research',
    title: 'Customer and market understanding should feed the board.',
    copy: 'Research notes, competitor scans, and synthesis should shape GTM, content, CRM, and product direction.',
  },
  crm: {
    eyebrow: 'CRM',
    title: 'Keep founder follow-up and lightweight pipeline visible.',
    copy: 'Northstar should help the founder move conversations, track next steps, and connect CRM work back to growth priorities.',
  },
  approvals: {
    eyebrow: 'Approvals',
    title: 'Founder review is built into the operating model.',
    copy: 'Anything ready for publishing, handoff, or execution should reach a clear approval surface before it moves.',
  },
  connections: {
    eyebrow: 'Connections',
    title: 'Integrations should unlock real workflows.',
    copy: 'API-key and OAuth connections should make Northstar more useful across social, CRM, support, SEO, and founder ops.',
  },
  settings: {
    eyebrow: 'Settings',
    title: 'Workspace defaults and account state in one calm place.',
    copy: 'Keep founder context, saved access, and execution defaults visible without turning settings into a second product.',
  },
};

const executionBlueprints: Partial<Record<DashboardSection, Array<{ title: string; points: string[] }>>> = {
  social: [
    {
      title: 'Current limit',
      points: [
        'Social tasks stay planning-only in this founder UI',
        'Use the board to capture angles, post directions, and visual ideas',
        'Manual drafting and publishing still happen outside this product',
      ],
    },
    {
      title: 'What is still manual',
      points: [
        'Publishing and channel validation are not live here yet',
        'Saved social credentials should be treated as unverified',
        'Founder review still happens before any real publishing work',
      ],
    },
  ],
  feature_suggestions: [
    {
      title: 'Signal intake',
      points: [
        'Convert repeated founder objections into product-facing suggestions',
        'Tie feature ideas to GTM leverage, activation, and execution friction',
        'Keep product ideas visible on the same board as marketing and research work',
      ],
    },
    {
      title: 'Decision quality',
      points: [
        'Feature suggestions should explain the user problem first',
        'Northstar should show why a suggestion matters now instead of becoming backlog noise',
        'Research and CRM loops should feed product signal directly',
      ],
    },
  ],
  content: [
    {
      title: 'Live path',
      points: [
        'Blog brief generation is the only live draft path exposed here',
        'Every generated brief should explain why it exists before review',
        'Founder approval still happens before anything moves forward',
      ],
    },
    {
      title: 'Planning-only work',
      points: [
        'Landing page copy, deeper drafts, and email assets stay manual for now',
        'Use these tasks to prioritize and discuss work, not to imply live generation',
        'Anything beyond the brief should be treated as a handoff, not an automated path',
      ],
    },
  ],
  crm: [
    {
      title: 'Current limit',
      points: [
        'Lead and contact tracking stays visible',
        'Follow-ups and outreach copy are planning-only in this pass',
        'Anything that reaches a customer still needs manual founder follow-through',
      ],
    },
    {
      title: 'What to use this for',
      points: [
        'Keep contact context tied to board priorities',
        'Track manual next steps without implying a live send path',
        'Outreach should stay deliberate and founder-controlled',
      ],
    },
  ],
  research: [
    {
      title: 'Current limit',
      points: [
        'Research tasks stay manual or planning-only in this founder UI',
        'Use the board to track interview ideas, notes, and next questions',
        'Any outreach or recruiting still needs manual handling',
      ],
    },
    {
      title: 'Learning loop',
      points: [
        'Research notes should explain what is known versus inferred',
        'Insights should map into next tests and backlog changes',
        'Research should shape GTM, product, and messaging',
      ],
    },
  ],
};

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

const clearTaskError = (errors: Record<string, string>, taskId: string) => {
  if (!(taskId in errors)) {
    return errors;
  }

  const next = { ...errors };
  delete next[taskId];
  return next;
};

const humanize = (value: string) => value.replaceAll('_', ' ');

const loadStoredJson = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const persistStoredJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const removeStoredJson = (key: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
};

const fallbackWorkspaceTruth: WorkspaceTruth = {
  source: 'sample',
  freshness: 'stale',
  sessionState: 'missing',
  understanding: 'fallback',
  riskyMutationsAllowed: false,
  tokenPresent: false,
  loadedAt: new Date(0).toISOString(),
  session: null,
};

const getWorkspaceTrustFlags = (workspaceTruth: WorkspaceTruth) => {
  const flags: string[] = [];

  if (workspaceTruth.source === 'sample') {
    flags.push('Sample workspace');
  }

  if (workspaceTruth.source === 'cached') {
    flags.push('Cached stale');
  }

  if (workspaceTruth.source === 'unauthenticated' || workspaceTruth.sessionState !== 'active') {
    flags.push('Not live');
  }

  if (workspaceTruth.understanding === 'fallback') {
    flags.push('Fallback understanding');
  }

  if (workspaceTruth.understanding === 'incomplete') {
    flags.push('Incomplete context');
  }

  return flags;
};

const getWorkspaceTruthNotice = (workspaceTruth: WorkspaceTruth) => {
  if (workspaceTruth.source === 'sample') {
    return 'Sample workspace only. This founder view is not tied to a live session, so task changes, approvals, and connection updates stay read-only.';
  }

  if (workspaceTruth.source === 'cached') {
    const reason = workspaceTruth.sessionState === 'expired'
      ? 'the saved founder session expired'
      : workspaceTruth.sessionState === 'invalid' || workspaceTruth.sessionState === 'revoked'
        ? 'the saved founder session is no longer valid'
        : 'the live API could not be confirmed';
    return `Cached stale workspace. Live changes are disabled because ${reason}.`;
  }

  if (workspaceTruth.source === 'unauthenticated') {
    return 'Workspace data is visible, but this founder view is not live yet. A valid founder session is missing, so risky actions stay disabled.';
  }

  if (workspaceTruth.understanding === 'fallback') {
    return 'Company understanding is still using fallback inference. Live changes are disabled until founder context is captured and the workspace is grounded.';
  }

  if (workspaceTruth.understanding === 'incomplete') {
    return 'Founder context is incomplete. Priorities and recommendations may be directionally useful, but they are not fully grounded yet.';
  }

  return null;
};

export function CommandCenter() {
  const savedOnboardingDraft = loadStoredJson<OnboardingDraft>(ONBOARDING_DRAFT_KEY);
  const savedFounderContext = loadStoredJson<FounderIntake>(FOUNDER_CONTEXT_KEY);
  const savedView = loadStoredJson<{
    page: 'onboarding' | 'dashboard';
    activeSection: DashboardSection;
  }>(WORKSPACE_VIEW_KEY);
  const savedProjectId = loadStoredJson<string>(SELECTED_PROJECT_KEY);
  const hasSavedView = Boolean(savedView);
  const initialSection = savedView?.activeSection === 'command_center' ? 'board' : savedView?.activeSection ?? 'board';
  const [state, setState] = useState<AppState>(demoState);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string; websiteUrl: string }>>([
    { id: demoState.project.id, name: demoState.project.name, websiteUrl: demoState.project.websiteUrl },
  ]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(savedProjectId ?? null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [page, setPage] = useState<'onboarding' | 'dashboard'>(savedView?.page ?? 'onboarding');
  const [activeSection, setActiveSection] = useState<DashboardSection>(initialSection);
  const [founderIntake, setFounderIntake] = useState<FounderIntake | null>(savedFounderContext ?? savedOnboardingDraft?.intake ?? defaultFounderIntake);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft | null>(savedOnboardingDraft);
  const [onboardingResetKey, setOnboardingResetKey] = useState(0);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapNotice, setBootstrapNotice] = useState<string | null>(null);
  const [bootstrapRetryKey, setBootstrapRetryKey] = useState(0);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [addTaskLoading, setAddTaskLoading] = useState(false);
  const [statusChangeTaskId, setStatusChangeTaskId] = useState<string | null>(null);
  const [executeTaskId, setExecuteTaskId] = useState<string | null>(null);
  const [approveTaskId, setApproveTaskId] = useState<string | null>(null);
  const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);
  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [connectProviderId, setConnectProviderId] = useState<string | null>(null);
  const [activateProviderId, setActivateProviderId] = useState<string | null>(null);
  const [connectIntegrationId, setConnectIntegrationId] = useState<string | null>(null);
  const [disconnectIntegrationId, setDisconnectIntegrationId] = useState<string | null>(null);
  const [syncIntegrationId, setSyncIntegrationId] = useState<string | null>(null);
  const [selectAgentWrapperId, setSelectAgentWrapperId] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});
  const [decisionErrors, setDecisionErrors] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [providerErrors, setProviderErrors] = useState<Record<string, string>>({});
  const [integrationErrors, setIntegrationErrors] = useState<Record<string, string>>({});
  const [agentWrapperErrors, setAgentWrapperErrors] = useState<Record<string, string>>({});
  const [boardQuery, setBoardQuery] = useState('');
  const boardSearchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      setBootstrapError(null);
      setBootstrapNotice(null);

      try {
        const projects = await api.listProjects();
        if (cancelled) {
          return;
        }

        if (!projects.length) {
          setAvailableProjects([]);
          setSelectedProjectId(null);
          if (!hasSavedView) {
            setPage('onboarding');
            setActiveSection('board');
          }
          return;
        }

        const available = projects.map((project) => ({
          id: project.id,
          name: project.name,
          websiteUrl: project.websiteUrl,
        }));
        const selectedId = savedProjectId && projects.some((project) => project.id === savedProjectId)
          ? savedProjectId
          : projects[0].id;
        const loaded = await api.getState(selectedId);
        if (cancelled) {
          return;
        }

        setAvailableProjects(available);
        setSelectedProjectId(loaded.project.id);
        setState(loaded);
        if (loaded.founderIntake) {
          setFounderIntake(loaded.founderIntake);
        }
        if (!hasSavedView) {
          setPage('dashboard');
          setActiveSection('board');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const cachedProjects = api.listCachedProjects();
        const cachedState = api.getCachedState();
        if (cachedState && cachedProjects.length) {
          setAvailableProjects(cachedProjects.map((project) => ({
            id: project.id,
            name: project.name,
            websiteUrl: project.websiteUrl,
          })));
          setSelectedProjectId(cachedState.project.id);
          setState(cachedState);
          setPage('dashboard');
          setActiveSection(savedView?.activeSection === 'command_center' ? 'board' : savedView?.activeSection ?? 'board');
          if (cachedState.founderIntake) {
            setFounderIntake(cachedState.founderIntake);
          }
          setBootstrapNotice(null);
        } else {
          if (error instanceof Error && error.message === LIVE_SESSION_REQUIRED_MESSAGE) {
            setAvailableProjects([]);
            setSelectedProjectId(null);
            setPage('onboarding');
            setActiveSection('board');
            return;
          }
          setAvailableProjects([]);
          setSelectedProjectId(null);
          setBootstrapError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [bootstrapRetryKey, hasSavedView, savedProjectId, savedView?.activeSection]);

  useEffect(() => {
    persistStoredJson(WORKSPACE_VIEW_KEY, {
      page,
      activeSection,
    });
  }, [activeSection, page]);

  useEffect(() => {
    if (founderIntake) {
      persistStoredJson(FOUNDER_CONTEXT_KEY, founderIntake);
      return;
    }

    removeStoredJson(FOUNDER_CONTEXT_KEY);
  }, [founderIntake]);

  useEffect(() => {
    if (selectedProjectId) {
      persistStoredJson(SELECTED_PROJECT_KEY, selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (event.key === 'Escape' && selectedTask) {
        setSelectedTask(null);
        return;
      }

      if (isTyping) {
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        boardSearchRef.current?.focus();
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setActiveSection('board');
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setActiveSection('approvals');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedTask]);

  const sortedTasks = useMemo(
    () => [...state.tasks].sort((left, right) => right.priority_score - left.priority_score),
    [state.tasks],
  );

  const liveTaskIds = useMemo(
    () => new Set(state.tasks.filter((task) => executableTaskTypes.has(task.type)).map((task) => task.id)),
    [state.tasks],
  );

  const liveTasks = useMemo(
    () => state.tasks.filter((task) => liveTaskIds.has(task.id)),
    [liveTaskIds, state.tasks],
  );

  const liveArtifacts = useMemo(
    () => state.artifacts.filter((artifact) => liveTaskIds.has(artifact.taskId)),
    [liveTaskIds, state.artifacts],
  );

  const liveApprovals = useMemo(
    () => state.approvals.filter((approval) => liveTaskIds.has(approval.taskId)),
    [liveTaskIds, state.approvals],
  );

  const selectedArtifact = useMemo(
    () => liveArtifacts.find((artifact) => artifact.taskId === selectedTask?.id) ?? null,
    [liveArtifacts, selectedTask],
  );

  const selectedApproval = useMemo<Approval | null>(() => {
    if (!selectedTask || !executableTaskTypes.has(selectedTask.type)) {
      return null;
    }

    return (
      liveApprovals.find((approval) => approval.taskId === selectedTask.id && approval.status === 'pending')
      ?? liveApprovals.find((approval) => approval.taskId === selectedTask.id)
      ?? null
    );
  }, [liveApprovals, selectedTask]);

  const comments = useMemo(
    () => state.comments.filter((comment) => comment.taskId === selectedTask?.id),
    [selectedTask, state.comments],
  );

  const pendingApprovals = useMemo(
    () => liveApprovals.filter((approval) => approval.status === 'pending'),
    [liveApprovals],
  );
  const hasExistingWorkspace = availableProjects.length > 0 && selectedProjectId !== null;
  const workspaceTruth = state.workspaceTruth ?? fallbackWorkspaceTruth;
  const workspaceTruthNotice = getWorkspaceTruthNotice(workspaceTruth);
  const workspaceTrustFlags = getWorkspaceTrustFlags(workspaceTruth);
  const lastLiveLoadLabel = workspaceTruth.loadedAt === fallbackWorkspaceTruth.loadedAt
    ? 'Last live load unavailable'
    : `Last live load ${formatDateTime(workspaceTruth.loadedAt)}`;
  const riskyMutationDisabledMessage = workspaceTruth.source === 'cached'
    ? 'This workspace is showing cached stale data. Live changes are disabled until the founder session is restored.'
    : workspaceTruth.source === 'sample'
      ? 'This founder view is sample data only. Live changes are disabled.'
      : workspaceTruth.understanding === 'fallback'
        ? 'This workspace is still using fallback company understanding. Live changes are disabled until founder context is captured.'
        : 'This workspace is not live yet. Founder changes stay disabled until a valid session is available.';

  const boardVisibleTasks = useMemo(() => {
    const query = boardQuery.trim().toLowerCase();
    return state.tasks.filter((task) => {
      if (!query) {
        return true;
      }

      return `${task.title} ${task.description} ${task.rationale} ${task.outputLabel ?? ''}`.toLowerCase().includes(query);
    });
  }, [boardQuery, state.tasks]);

  const founderTasks = useMemo(
    () => sortedTasks.filter((task) => task.needsFounderAction || task.actor === 'founder'),
    [sortedTasks],
  );

  const accountSummary = useMemo(() => ({
    saved_unverified: state.integrations.filter((integration) => integration.status === 'connected').length,
    needs_key: state.integrations.filter((integration) => integration.status === 'needs_key').length,
    planned: state.integrations.filter((integration) => integration.status === 'planned').length,
  }), [state.integrations]);

  const providerSummary = useMemo(() => ({
    saved_unverified: state.executionProviders.filter((provider) => provider.status === 'connected').length,
    needs_key: state.executionProviders.filter((provider) => provider.status === 'needs_key').length,
    local_only: state.executionProviders.filter((provider) => provider.status === 'available').length,
  }), [state.executionProviders]);
  const agentStackSummary = useMemo(() => ({
    selected: state.agentToolWrappers.filter((wrapper) => wrapper.selectedVendorId).length,
    unselected: state.agentToolWrappers.filter((wrapper) => !wrapper.selectedVendorId).length,
  }), [state.agentToolWrappers]);
  const workspaceLearningSummary = useMemo(() => ({
    preferences: state.workspaceLearning.preferences.length,
    recentFeedback: state.workspaceLearning.recentFeedback.length,
  }), [state.workspaceLearning]);
  const sectionTasks = boardVisibleTasks.filter((task) => {
    switch (activeSection) {
      case 'seo':
        return task.category === 'seo';
      case 'content':
        return task.category === 'content';
      case 'social':
        return task.category === 'social';
      case 'feature_suggestions':
        return task.category === 'product_signal';
      case 'website':
        return task.category === 'website';
      case 'research':
        return task.category === 'research';
      case 'crm':
        return task.category === 'crm';
      case 'gtm_plan':
        return task.category === 'gtm';
      case 'connections':
        return task.category === 'integration';
      default:
        return true;
    }
  });

  const getSectionEmptyState = (section: DashboardSection) => {
    if (boardQuery) {
      return {
        title: 'No tasks match the current search in this section.',
        copy: 'Clear the search to bring the full section backlog back.',
        actionLabel: 'Clear search',
        onAction: () => setBoardQuery(''),
      };
    }

    if (section === 'connections') {
      return {
        title: 'No connection follow-up is queued yet.',
        copy: 'Set up Gmail, Search Console, Drive, or channel providers to unlock integration-backed work here.',
        actionLabel: 'Open connections',
        onAction: () => setActiveSection('connections'),
      };
    }

    if (section === 'approvals') {
      return {
        title: 'Founder review is clear.',
        copy: 'Northstar has nothing waiting in approval or founder-response lanes right now.',
        actionLabel: 'Open board',
        onAction: () => setActiveSection('board'),
      };
    }

    if (section === 'feature_suggestions') {
      return {
        title: 'No product suggestions are queued yet.',
        copy: 'Research, CRM objections, and founder friction should turn into explicit feature wedges here.',
        actionLabel: 'Open research',
        onAction: () => setActiveSection('research'),
      };
    }

    return {
      title: 'Nothing is queued in this section yet.',
      copy: 'This area populates once related work is scored or saved tool access creates follow-up work.',
      actionLabel: 'Open board',
      onAction: () => setActiveSection('board'),
    };
  };

  const applyState = (updated: AppState) => {
    setState(updated);
    setSelectedProjectId(updated.project.id);
    if (updated.founderIntake) {
      setFounderIntake(updated.founderIntake);
    }
    setSelectedTask((current) => current ? updated.tasks.find((task) => task.id === current.id) ?? null : null);
  };

  const handleOnboardingDraftChange = useCallback((draft: OnboardingDraft) => {
    setOnboardingDraft(draft);
    persistStoredJson(ONBOARDING_DRAFT_KEY, draft);
  }, []);

  const clearOnboardingDraft = useCallback(() => {
    setOnboardingDraft(null);
    removeStoredJson(ONBOARDING_DRAFT_KEY);
    setOnboardingError(null);
    setOnboardingResetKey((current) => current + 1);
  }, []);

  const handleAnalyze = async (intake: FounderIntake) => {
    setOnboardingError(null);
    setOnboardingLoading(true);

    try {
      const updated = await api.analyzeWebsite(intake);
      setFounderIntake(intake);
      applyState(updated);
      setAvailableProjects((current) => {
        const next = [{ id: updated.project.id, name: updated.project.name, websiteUrl: updated.project.websiteUrl }, ...current.filter((project) => project.id !== updated.project.id)];
        return next;
      });
      setActiveSection('board');
      setPage('dashboard');
      clearOnboardingDraft();
      return true;
    } catch (error) {
      setOnboardingError(getErrorMessage(error));
      return false;
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleAddTask = async (input: NewTaskInput) => {
    setAddTaskError(null);
    setAddTaskLoading(true);

    try {
      const updated = await api.addTask(input);
      applyState(updated);
      return true;
    } catch (error) {
      setAddTaskError(getErrorMessage(error));
      return false;
    } finally {
      setAddTaskLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    setStatusErrors((current) => clearTaskError(current, taskId));
    setStatusChangeTaskId(taskId);

    try {
      const updated = await api.updateTaskStatus(taskId, status);
      applyState(updated);
      return true;
    } catch (error) {
      setStatusErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setStatusChangeTaskId((current) => current === taskId ? null : current);
    }
  };

  const handleExecuteTask = async (taskId: string) => {
    setDecisionErrors((current) => clearTaskError(current, taskId));
    setExecuteTaskId(taskId);

    try {
      const updated = await api.executeTask(taskId);
      applyState(updated);
      return true;
    } catch (error) {
      setDecisionErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setExecuteTaskId((current) => current === taskId ? null : current);
    }
  };

  const handleApproveArtifact = async (taskId: string) => {
    setDecisionErrors((current) => clearTaskError(current, taskId));
    setApproveTaskId(taskId);

    try {
      const updated = await api.approveArtifact(taskId);
      applyState(updated);
      return true;
    } catch (error) {
      setDecisionErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setApproveTaskId((current) => current === taskId ? null : current);
    }
  };

  const handleRejectArtifact = async (taskId: string, note?: string) => {
    setDecisionErrors((current) => clearTaskError(current, taskId));
    setRejectTaskId(taskId);

    try {
      const updated = await api.rejectArtifact(taskId, note);
      applyState(updated);
      return true;
    } catch (error) {
      setDecisionErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setRejectTaskId((current) => current === taskId ? null : current);
    }
  };

  const handleAddComment = async (taskId: string, body: string) => {
    setCommentErrors((current) => clearTaskError(current, taskId));
    setCommentTaskId(taskId);

    try {
      const updated = await api.addComment(taskId, body);
      applyState(updated);
      return true;
    } catch (error) {
      setCommentErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setCommentTaskId((current) => current === taskId ? null : current);
    }
  };

  const handleConnectProvider = async (providerId: string, credential?: string) => {
    setProviderErrors((current) => clearTaskError(current, providerId));
    setConnectProviderId(providerId);

    try {
      const updated = await api.connectProvider(providerId, credential);
      applyState(updated);
      return true;
    } catch (error) {
      setProviderErrors((current) => ({ ...clearTaskError(current, providerId), [providerId]: getErrorMessage(error) }));
      return false;
    } finally {
      setConnectProviderId((current) => current === providerId ? null : current);
    }
  };

  const handleActivateProvider = async (providerId: string) => {
    setProviderErrors((current) => clearTaskError(current, providerId));
    setActivateProviderId(providerId);

    try {
      const updated = await api.activateProvider(providerId);
      applyState(updated);
      return true;
    } catch (error) {
      setProviderErrors((current) => ({ ...clearTaskError(current, providerId), [providerId]: getErrorMessage(error) }));
      return false;
    } finally {
      setActivateProviderId((current) => current === providerId ? null : current);
    }
  };

  const handleConnectIntegration = async (integrationId: string, credential?: string) => {
    setIntegrationErrors((current) => clearTaskError(current, integrationId));
    setConnectIntegrationId(integrationId);

    try {
      const updated = await api.connectIntegration(integrationId, credential);
      applyState(updated);
      return true;
    } catch (error) {
      setIntegrationErrors((current) => ({ ...clearTaskError(current, integrationId), [integrationId]: getErrorMessage(error) }));
      return false;
    } finally {
      setConnectIntegrationId((current) => current === integrationId ? null : current);
    }
  };

  const handleDisconnectIntegration = async (integrationId: string) => {
    setIntegrationErrors((current) => clearTaskError(current, integrationId));
    setDisconnectIntegrationId(integrationId);

    try {
      const updated = await api.disconnectIntegration(integrationId);
      applyState(updated);
      return true;
    } catch (error) {
      setIntegrationErrors((current) => ({ ...clearTaskError(current, integrationId), [integrationId]: getErrorMessage(error) }));
      return false;
    } finally {
      setDisconnectIntegrationId((current) => current === integrationId ? null : current);
    }
  };

  const handleSyncIntegration = async (integrationId: string) => {
    setIntegrationErrors((current) => clearTaskError(current, integrationId));
    setSyncIntegrationId(integrationId);

    try {
      const updated = await api.syncIntegration(integrationId);
      applyState(updated);
      return true;
    } catch (error) {
      setIntegrationErrors((current) => ({ ...clearTaskError(current, integrationId), [integrationId]: getErrorMessage(error) }));
      return false;
    } finally {
      setSyncIntegrationId((current) => current === integrationId ? null : current);
    }
  };

  const handleSelectAgentToolVendor = async (wrapperId: AgentToolCategory, vendorId: string) => {
    setAgentWrapperErrors((current) => clearTaskError(current, wrapperId));
    setSelectAgentWrapperId(wrapperId);

    try {
      const updated = await api.selectAgentToolVendor(wrapperId, vendorId);
      applyState(updated);
      return true;
    } catch (error) {
      setAgentWrapperErrors((current) => ({ ...clearTaskError(current, wrapperId), [wrapperId]: getErrorMessage(error) }));
      return false;
    } finally {
      setSelectAgentWrapperId((current) => current === wrapperId ? null : current);
    }
  };

  const handleReadOnlyStatusChange = async (taskId: string) => {
    setStatusErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: riskyMutationDisabledMessage }));
    return false;
  };

  const handleReadOnlyApproveArtifact = async (taskId: string) => {
    setDecisionErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: riskyMutationDisabledMessage }));
    return false;
  };

  const handleReadOnlyRejectArtifact = async (taskId: string) => {
    setDecisionErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: riskyMutationDisabledMessage }));
    return false;
  };

  const statusChangeHandler = workspaceTruth.riskyMutationsAllowed ? handleStatusChange : handleReadOnlyStatusChange;
  const approveHandler = workspaceTruth.riskyMutationsAllowed ? handleApproveArtifact : handleReadOnlyApproveArtifact;
  const rejectHandler = workspaceTruth.riskyMutationsAllowed ? handleRejectArtifact : handleReadOnlyRejectArtifact;

  const renderTaskList = (
    title: string,
    copy: string,
    tasks: Task[],
    emptyState = getSectionEmptyState(activeSection),
  ) => (
    <section className="rail-card section-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{copy}</h2>
        </div>
      </div>

      <div className="section-list">
        {tasks.length ? tasks.map((task) => (
          <button key={task.id} className="section-list-item" type="button" onClick={() => setSelectedTask(task)}>
            <div>
              <strong>{task.title}</strong>
              <p>{task.description}</p>
              <div className="section-task-chips">
                {task.outputLabel ? <span className="domain-badge">{task.outputLabel}</span> : null}
                {task.channel ? <span className="domain-badge">{task.channel}</span> : null}
              </div>
            </div>
            <div className="section-list-meta">
              {task.executionStage ? <span>{humanize(task.executionStage)}</span> : null}
              <span className={`status-chip ${task.status}`}>{humanize(task.status)}</span>
              <span className="domain-badge">{task.category}</span>
            </div>
          </button>
        )) : (
          <article className="section-empty-state">
            <strong>{emptyState.title}</strong>
            <p>{emptyState.copy}</p>
            <button className="ghost-button" type="button" onClick={emptyState.onAction}>
              {emptyState.actionLabel}
            </button>
          </article>
        )}
      </div>
    </section>
  );

  const renderCapabilityPanels = (section: DashboardSection) => {
    const items = executionBlueprints[section];
    if (!items?.length) {
      return null;
    }

    return (
      <section className="section-grid">
        {items.map((item) => (
          <article key={item.title} className="section-panel">
            <p className="eyebrow">{item.title}</p>
            <ul className="capability-list">
              {item.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    );
  };

  const renderSectionContent = () => {
    if (activeSection === 'command_center' || activeSection === 'board') {
      return (
        <div className="section-stack">
          <div className={workspaceTruth.riskyMutationsAllowed ? undefined : 'workspace-readonly-surface'}>
            <KanbanBoard
              approvals={liveApprovals}
              pendingTaskId={statusChangeTaskId}
              statusErrors={statusErrors}
              tasks={boardVisibleTasks}
              onTaskOpen={(task) => setSelectedTask(task)}
              onStatusChange={statusChangeHandler}
            />
          </div>
          <section className="rail-card section-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Add task</p>
                <h2>Queue planning work for the board</h2>
              </div>
            </div>
            <AddTaskForm
              error={addTaskError}
              loading={addTaskLoading}
              mutationsAllowed={workspaceTruth.riskyMutationsAllowed}
              disabledReason={riskyMutationDisabledMessage}
              onAdd={handleAddTask}
            />
          </section>
        </div>
      );
    }

    if (activeSection === 'gtm_plan') {
      return (
        <div className="section-stack">
          <section className="rail-card section-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Analytics</p>
                <h2>Operating summary</h2>
              </div>
            </div>
            <AnalyticsSummaryPanel
              agentRuns={state.agentRuns}
              approvals={liveApprovals}
              artifacts={liveArtifacts}
              founderIntake={founderIntake}
              goals={state.goals}
              initiatives={state.initiatives}
              tasks={state.tasks}
            />
          </section>
        </div>
      );
    }

    if (activeSection === 'research') {
      return (
        <div className="section-stack">
          {renderCapabilityPanels('research')}
          <section className="rail-card section-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Research notes</p>
                <h2>What Northstar has learned so far</h2>
              </div>
            </div>
            <div className="section-list">
              {state.researchNotes.map((note) => (
                <article key={note.id} className="section-list-static">
                  <div>
                    <strong>{note.title}</strong>
                    <p>{note.summary}</p>
                    {note.linkedTaskIds?.length ? <p className="section-linked-copy">Linked tasks: {note.linkedTaskIds.join(', ')}</p> : null}
                  </div>
                  <div className="section-list-meta">
                    <span className="domain-badge">{note.type}</span>
                    <span className="section-timestamp">{formatDateTime(note.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {renderTaskList('Research tasks', 'Active market, user, and competitor work', sectionTasks, getSectionEmptyState('research'))}
        </div>
      );
    }

    if (activeSection === 'crm') {
      return (
        <div className="section-stack">
          {renderCapabilityPanels('crm')}
          <section className="rail-card section-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CRM</p>
                <h2>Founder follow-up and pipeline context</h2>
              </div>
            </div>
            <div className="section-list">
              {state.crmContacts.map((contact) => (
                <article key={contact.id} className="section-list-static">
                  <div>
                    <strong>{contact.name}</strong>
                    <p>{contact.company}</p>
                    <p>{contact.nextAction}</p>
                    {contact.linkedTaskIds?.length ? <p className="section-linked-copy">Linked tasks: {contact.linkedTaskIds.join(', ')}</p> : null}
                  </div>
                  <div className="section-list-meta">
                    <span className="domain-badge">{humanize(contact.stage)}</span>
                    <span className="section-timestamp">{contact.owner}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {renderTaskList('Founder pipeline work', 'CRM-adjacent work currently on the board', sectionTasks, getSectionEmptyState('crm'))}
        </div>
      );
    }

    if (activeSection === 'content') {
      return (
        <div className="section-stack">
          <CampaignsPanel
            agentRuns={state.agentRuns}
            approvals={liveApprovals}
            artifacts={liveArtifacts}
            founderIntake={founderIntake}
            goals={state.goals}
            initiatives={state.initiatives}
            tasks={state.tasks}
            onTaskOpen={(task) => setSelectedTask(task)}
          />
        </div>
      );
    }

    if (activeSection === 'social') {
      return (
        <div className="section-stack">
          {renderCapabilityPanels('social')}
          {renderTaskList('Social planning', 'Social ideas, post directions, and visual concepts tracked for manual follow-through', sectionTasks, getSectionEmptyState('social'))}
        </div>
      );
    }

    if (activeSection === 'feature_suggestions') {
      return (
        <div className="section-stack">
          {renderCapabilityPanels('feature_suggestions')}
          {renderTaskList('Product suggestions', 'Feature wedges tied to founder friction, activation, and execution leverage', sectionTasks, getSectionEmptyState('feature_suggestions'))}
        </div>
      );
    }

    if (activeSection === 'approvals') {
      return (
        <div className="section-stack">
          <ApprovalQueue
            approvals={liveApprovals}
            artifacts={liveArtifacts}
            decisionErrorByTaskId={decisionErrors}
            disabledReason={riskyMutationDisabledMessage}
            mutationsAllowed={workspaceTruth.riskyMutationsAllowed}
            pendingApproveTaskId={approveTaskId}
            pendingRejectTaskId={rejectTaskId}
            tasks={liveTasks}
            onApprove={approveHandler}
            onReject={rejectHandler}
            onTaskOpen={(task) => setSelectedTask(task)}
          />
        </div>
      );
    }

    if (activeSection === 'connections') {
      return (
        <div className="section-stack">
          <ConnectionsPanel
            agentToolWrappers={state.agentToolWrappers}
            agentWrapperErrorById={agentWrapperErrors}
            connectErrorById={integrationErrors}
            founderIntake={founderIntake}
            providerErrorById={providerErrors}
            workspaceTruth={workspaceTruth}
            executionProviders={state.executionProviders}
            activeProviderId={state.activeProviderId}
            integrations={state.integrations}
            pendingAgentWrapperId={selectAgentWrapperId}
            pendingProviderConnectId={connectProviderId}
            pendingProviderActivateId={activateProviderId}
            pendingConnectId={connectIntegrationId}
            pendingDisconnectId={disconnectIntegrationId}
            pendingSyncId={syncIntegrationId}
            onSelectAgentToolVendor={handleSelectAgentToolVendor}
            onProviderConnect={handleConnectProvider}
            onProviderActivate={handleActivateProvider}
            onConnect={handleConnectIntegration}
            onDisconnect={handleDisconnectIntegration}
            onSync={handleSyncIntegration}
          />
          {renderTaskList('Integration follow-up', 'Board items created from connection setup and tool access', sectionTasks, getSectionEmptyState('connections'))}
        </div>
      );
    }

    if (activeSection === 'settings') {
      return (
        <div className="section-stack">
          <section className="rail-card section-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Settings</p>
                <h2>Workspace context</h2>
              </div>
            </div>

            <div className="settings-grid">
              <article className="settings-card">
                <span>Website</span>
                <strong>{founderIntake?.websiteUrl ?? state.project.websiteUrl}</strong>
              </article>
              <article className="settings-card">
                <span>Audience</span>
                <strong>{founderIntake?.icp || state.profile.guessedIcp || 'Fallback understanding only'}</strong>
              </article>
              <article className="settings-card">
                <span>Main goal</span>
                <strong>{founderIntake?.mainGoal || 'Incomplete founder context'}</strong>
              </article>
              <article className="settings-card">
                <span>Priority channel</span>
                <strong>{founderIntake?.keyChannel || 'Not set yet'}</strong>
              </article>
            </div>
          </section>

          <section className="rail-card section-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Saved access</p>
                <h2>Credential truth</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setActiveSection('connections')}>
                Open connections
              </button>
            </div>

            <div className="settings-connection-summary">
              <article className="settings-detail-card">
                <span>Workflow tools</span>
                <div className="settings-chip-row">
                  <span className="connection-status-connected">{accountSummary.saved_unverified} saved, unverified</span>
                  <span className="connection-status-needs_key">{accountSummary.needs_key} credentials missing</span>
                  <span className="connection-status-planned">{accountSummary.planned} not set up</span>
                </div>
              </article>
              <article className="settings-detail-card">
                <span>Execution providers</span>
                <div className="settings-chip-row">
                  <span className="connection-status-connected">{providerSummary.saved_unverified} saved, unverified</span>
                  <span className="connection-status-needs_key">{providerSummary.needs_key} key required</span>
                  <span className="connection-status-planned">{providerSummary.local_only} local only</span>
                </div>
              </article>
              <article className="settings-detail-card">
                <span>Agent stack wrappers</span>
                <div className="settings-chip-row">
                  <span className="connection-status-connected">{agentStackSummary.selected} preferred vendors set</span>
                  <span className="connection-status-planned">{agentStackSummary.unselected} not chosen</span>
                </div>
              </article>
              <article className="settings-detail-card">
                <span>Northstar learning</span>
                <div className="settings-chip-row">
                  <span className="connection-status-connected">{workspaceLearningSummary.preferences} learned preferences</span>
                  <span className="connection-status-planned">{workspaceLearningSummary.recentFeedback} recent founder signals</span>
                </div>
              </article>
            </div>

            <div className="settings-detail-grid">
              <article className="settings-detail-card settings-detail-card-lead">
                <span>Company summary</span>
                <strong>{state.profile.companyName}</strong>
                <p>{state.profile.summary}</p>
              </article>

              <article className="settings-detail-card">
                <span>Workflow tools</span>
                <div className="settings-status-list">
                  {state.integrations.map((integration) => (
                    <div key={integration.id} className="settings-status-row">
                      <strong>{integration.name}</strong>
                      <span>
                        {integration.status === 'connected'
                          ? 'Saved, unverified'
                          : integration.status === 'needs_key'
                            ? 'Credential required'
                            : 'Not set up'}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="settings-detail-card">
                <span>Execution providers</span>
                <div className="settings-status-list">
                  {state.executionProviders.map((provider) => (
                    <div key={provider.id} className="settings-status-row">
                      <strong>{provider.name}{state.activeProviderId === provider.id ? ' (preferred)' : ''}</strong>
                      <span>
                        {provider.status === 'connected'
                          ? 'Saved, unverified'
                          : provider.status === 'needs_key'
                            ? 'Key required'
                            : 'Local only'}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="settings-detail-card">
                <span>Agent stack wrappers</span>
                <div className="settings-status-list">
                  {state.agentToolWrappers.map((wrapper) => (
                    <div key={wrapper.id} className="settings-status-row">
                      <strong>{wrapper.label}</strong>
                      <span>{wrapper.vendors.find((vendor) => vendor.id === wrapper.selectedVendorId)?.name ?? 'Not chosen'}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="settings-detail-card">
                <span>Northstar learning</span>
                <div className="settings-status-list">
                  {state.workspaceLearning.preferences.length ? state.workspaceLearning.preferences.map((preference) => (
                    <div key={preference} className="settings-status-row">
                      <strong>Preference</strong>
                      <span>{preference}</span>
                    </div>
                  )) : (
                    <div className="settings-status-row">
                      <strong>No learned preferences yet</strong>
                      <span>Founder comments and change requests will sharpen future prioritization here.</span>
                    </div>
                  )}
                </div>
                {state.workspaceLearning.recentFeedback.length ? (
                  <div className="settings-status-list">
                    {state.workspaceLearning.recentFeedback.slice(0, 3).map((signal) => (
                      <div key={signal.id} className="settings-status-row">
                        <strong>{signal.source === 'approval_rejection' ? 'Change request' : 'Founder comment'}</strong>
                        <span>{signal.note}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="section-stack">
        {renderTaskList(sectionMeta[activeSection].eyebrow, sectionMeta[activeSection].title, sectionTasks, getSectionEmptyState(activeSection))}
      </div>
    );
  };

  if (isBootstrapping) {
    return (
      <main className="app-shell">
        <div className="sky-orbit sky-orbit-one" />
        <div className="sky-orbit sky-orbit-two" />
        <section className="workspace-loading">
          <p className="eyebrow">Northstar</p>
          <h1>Loading the founder workspace.</h1>
          <p className="workspace-topbar-copy">Pulling the latest board, approvals, and founder context before the operating system opens.</p>
        </section>
      </main>
    );
  }

  if (bootstrapError) {
    return (
      <main className="app-shell">
        <div className="sky-orbit sky-orbit-one" />
        <div className="sky-orbit sky-orbit-two" />
        <section className="workspace-error-state">
          <p className="eyebrow">Northstar</p>
          <h1>Workspace data could not be loaded.</h1>
          <p className="workspace-topbar-copy">{bootstrapError}</p>
          <div className="bridge-actions bridge-actions-end">
            <button className="primary-button" type="button" onClick={() => setBootstrapRetryKey((current) => current + 1)}>
              Retry load
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="sky-orbit sky-orbit-one" />
      <div className="sky-orbit sky-orbit-two" />

      {page === 'onboarding' ? (
        <>
          <header className="bridge bridge-onboarding">
            <div className="brand-lockup">
              <div className="northstar-mark" aria-hidden="true">
                <span className="northstar-arm northstar-arm-vertical" />
                <span className="northstar-arm northstar-arm-horizontal" />
                <span className="northstar-arm northstar-arm-left" />
                <span className="northstar-arm northstar-arm-right" />
                <span className="northstar-core" />
              </div>
              <div>
                <p className="brand-name">Northstar</p>
                <p className="brand-tagline">Kanban-first founder operating system</p>
              </div>
            </div>

            <div className="bridge-copy bridge-copy-slim">
              <p className="eyebrow">The board is the product</p>
              <h1>Start with the company, then open the operating system.</h1>
            </div>

            {hasExistingWorkspace ? (
              <div className="bridge-actions bridge-actions-end">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setPage('dashboard');
                    setActiveSection('board');
                  }}
                >
                  Open latest workspace
                </button>
              </div>
            ) : null}
          </header>

          <Onboarding
            key={onboardingResetKey}
            error={onboardingError}
            initialDraft={onboardingDraft}
            initialIntake={founderIntake}
            loading={onboardingLoading}
            onAnalyze={handleAnalyze}
            onClearDraft={clearOnboardingDraft}
            onDraftChange={handleOnboardingDraftChange}
          />
        </>
      ) : (
        <section className="workspace-shell">
          <WorkspaceNav
            activeSection={activeSection}
            founderQueueCount={founderTasks.length}
            onChange={setActiveSection}
            pendingApprovals={pendingApprovals.length}
          />

          <div className="workspace-main">
            <header className="workspace-topbar">
              <div className="workspace-topbar-head">
                <div>
                  <p className="eyebrow">{sectionMeta[activeSection].eyebrow}</p>
                  <h1>{sectionMeta[activeSection].title}</h1>
                  <p className="workspace-topbar-copy">{sectionMeta[activeSection].copy}</p>
                </div>

                <div className="workspace-topbar-actions">
                  <label className="workspace-project-switcher">
                    <span>Workspace</span>
                    <select
                      disabled={workspaceTruth.source !== 'live' || workspaceTruth.sessionState !== 'active'}
                      value={selectedProjectId ?? state.project.id}
                      onChange={async (event) => {
                        const nextProjectId = event.target.value;
                        setSelectedProjectId(nextProjectId);
                        const updated = await api.getState(nextProjectId);
                        applyState(updated);
                        setSelectedTask(null);
                      }}
                    >
                      {availableProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="workspace-search-field">
                    <span>Search</span>
                    <input
                      ref={boardSearchRef}
                      value={boardQuery}
                      onChange={(event) => setBoardQuery(event.target.value)}
                      placeholder="Search tasks, rationale, or output"
                    />
                  </label>
                  <div className="workspace-connection-strip" aria-label="Connection truth">
                    <span className="workspace-connection-chip connection-status-connected">
                      {accountSummary.saved_unverified} saved, unverified
                    </span>
                    <span className="workspace-connection-chip connection-status-needs_key">
                      {accountSummary.needs_key} credentials missing
                    </span>
                    <span className="workspace-connection-chip connection-status-planned">
                      {accountSummary.planned} not set up
                    </span>
                  </div>
                  <button className="primary-button" type="button" disabled={activeSection === 'board'} onClick={() => setActiveSection('board')}>
                    Open board
                  </button>
                </div>
              </div>

              <div className="workspace-trust-strip" aria-label="Workspace trust state">
                {workspaceTrustFlags.map((flag) => (
                  <span key={flag} className="workspace-trust-chip">
                    {flag}
                  </span>
                ))}
                <span className="workspace-trust-chip workspace-trust-chip-muted">
                  {lastLiveLoadLabel}
                </span>
              </div>
            </header>

            {bootstrapNotice ? <div className="workspace-status-banner">{bootstrapNotice}</div> : null}
            {workspaceTruthNotice ? <div className="workspace-status-banner workspace-status-banner-alert">{workspaceTruthNotice}</div> : null}

            {renderSectionContent()}
          </div>
        </section>
      )}

      <TaskDrawer
        approval={selectedApproval}
        approvalView={activeSection === 'approvals'}
        approveLoading={approveTaskId === selectedTask?.id}
        artifact={selectedArtifact}
        commentError={selectedTask ? commentErrors[selectedTask.id] ?? null : null}
        commentLoading={commentTaskId === selectedTask?.id}
        comments={comments}
        decisionError={selectedTask ? decisionErrors[selectedTask.id] ?? null : null}
        executeLoading={executeTaskId === selectedTask?.id}
        founderIntake={founderIntake}
        integrations={state.integrations}
        workspaceTruth={workspaceTruth}
        mutationsAllowed={workspaceTruth.riskyMutationsAllowed}
        disabledReason={riskyMutationDisabledMessage}
        onAddComment={handleAddComment}
        onApprove={approveHandler}
        onClose={() => setSelectedTask(null)}
        onExecute={handleExecuteTask}
        onOpenConnections={() => setActiveSection('connections')}
        onReject={rejectHandler}
        rejectLoading={rejectTaskId === selectedTask?.id}
        task={selectedTask}
      />
    </main>
  );
}
