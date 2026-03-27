import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFounderApi } from '../lib/api';
import { formatDateTime, formatDomain } from '../lib/format';
import { demoState } from '../lib/mockData';
import type {
  AppState,
  Approval,
  ExecutionPreference,
  DashboardSection,
  DashboardSurface,
  FounderIntake,
  OnboardingDraft,
  Task,
} from '../lib/types';
import type { NewTaskInput, TaskStatus } from '../lib/types';
import { AddTaskForm } from './AddTaskForm';
import { ApprovalQueue } from './ApprovalQueue';
import { CompanySummary } from './CompanySummary';
import { ConnectionsPanel } from './ConnectionsPanel';
import { KanbanBoard } from './KanbanBoard';
import { Onboarding } from './Onboarding';
import { OverviewPanels } from './OverviewPanels';
import { TaskDrawer } from './TaskDrawer';
import { WorkspaceNav } from './WorkspaceNav';

const api = createFounderApi();
const ONBOARDING_DRAFT_KEY = 'founder-os-onboarding-draft';
const FOUNDER_CONTEXT_KEY = 'founder-os-founder-context';
const WORKSPACE_VIEW_KEY = 'founder-os-workspace-view';
const EXECUTION_PREFS_KEY = 'founder-os-execution-prefs';
const SELECTED_PROJECT_KEY = 'founder-os-selected-project';

const defaultFounderIntake: FounderIntake = {
  websiteUrl: 'https://acme-studio.com',
  businessDescription: 'A boutique growth and design studio helping founder-led businesses improve conversion, visibility, and positioning.',
  icp: 'Founder-led SaaS and service businesses with lean teams and inconsistent growth systems.',
  mainGoal: 'Generate more qualified pipeline from content and website improvements.',
  keyChannel: 'SEO, homepage messaging, and founder-led social content',
  whatTried: 'A few blog posts, scattered LinkedIn posts, and ad hoc website updates.',
  priorityWork: 'Build the GTM plan first, then create the first SEO and content tasks.',
  competitors: 'Growth.design, Animalz, and boutique conversion agencies',
  bottleneck: 'conversion',
  authMethod: 'google',
};

const surfaceOptions: Array<{ key: DashboardSurface; label: string }> = [
  { key: 'kanban', label: 'Kanban' },
  { key: 'northstar', label: 'Northstar' },
  { key: 'founder', label: 'Founder' },
  { key: 'approvals', label: 'Approvals' },
];

const sectionMeta: Record<DashboardSection, { eyebrow: string; title: string; copy: string }> = {
  command_center: {
    eyebrow: 'Command Center',
    title: 'Northstar runs the operating system, not a chat stream.',
    copy: 'See the company readout, priority matrix, live board, and the split between agent execution and founder-required work.',
  },
  board: {
    eyebrow: 'Board',
    title: 'The board stays the main product surface.',
    copy: 'Tasks should scan like a project system first: active work, founder blockers, approvals, and why each move matters.',
  },
  gtm_plan: {
    eyebrow: 'GTM Plan',
    title: 'Goals, channel focus, and active initiatives.',
    copy: 'Northstar should connect planning to execution so the founder can see which strategic bets are actually moving.',
  },
  seo: {
    eyebrow: 'SEO',
    title: 'Search work should be explicit and operational.',
    copy: 'Keyword structure, page opportunity, and execution-ready tasks live here.',
  },
  content: {
    eyebrow: 'Content',
    title: 'Approval-ready content output, not vague ideas.',
    copy: 'Northstar should create briefs, drafts, and content tasks that are tied to goals and reviewable before publishing.',
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
    title: 'Workspace context shapes the whole operating system.',
    copy: 'Business description, ICP, goals, channel priorities, and connection preferences should stay accessible and editable.',
  },
};

const launchProfile = {
  positioning: 'Northstar is the operating system for non-technical founders to plan, generate, approve, and run marketing, campaigns, and early-user acquisition from one board.',
  icp: 'Non-technical founders and early-stage projects running marketing, campaigns, and early-user acquisition without a full growth team.',
  collaborationScope: 'Single-founder-first in v1, with lightweight shared access and comments later.',
  outputQualityBar: 'Productive: specific, editable, channel-aware, and ready to review or use immediately.',
  supportedProviders: ['OpenAI', 'Anthropic', 'Kimi', 'MiniMax', 'Northstar CLI'],
  integrationTargets: ['Google Workspace', 'Intercom', 'X', 'Instagram', 'Threads', 'Image generation'],
};

const executionBlueprints: Partial<Record<DashboardSection, Array<{ title: string; points: string[] }>>> = {
  social: [
    {
      title: 'Post generation',
      points: [
        'Generate posts and channel-specific variants',
        'Support campaign concepts and visual briefs',
        'Keep approvals in the same operating flow',
      ],
    },
    {
      title: 'Publishing path',
      points: [
        'Show what is draft, reviewable, or publish-ready',
        'Keep founder review before any real send or publish action',
        'Prepare for later channel integrations',
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
      title: 'Core assets',
      points: [
        'Blog briefs and deeper drafts',
        'Landing page copy and founder narrative assets',
        'Email templates when content work needs lifecycle support',
      ],
    },
    {
      title: 'Approval rhythm',
      points: [
        'Generated assets stay editable and reviewable',
        'Every draft should explain why it exists',
        'Nothing moves forward without a founder decision',
      ],
    },
  ],
  crm: [
    {
      title: 'Execution support',
      points: [
        'Lead and contact tracking stays visible',
        'Northstar drafts follow-ups and outreach sequences',
        'Send-ready states appear before any actual send step',
      ],
    },
    {
      title: 'Later workflow',
      points: [
        'Response tracking fits the same pipeline view later',
        'Founder tasks stay attached to contacts and stages',
        'Outreach should never feel spammy or uncontrolled',
      ],
    },
  ],
  research: [
    {
      title: 'Recruitment loop',
      points: [
        'User outreach drafts and interview requests',
        'Channel-aware recruiting copy',
        'Founder review before outreach leaves the system',
      ],
    },
    {
      title: 'Learning loop',
      points: [
        'Feedback synthesis becomes a reusable artifact',
        'Insights map into next tests and backlog changes',
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

const defaultExecutionModeForTask = (task: Task): ExecutionPreference['mode'] => {
  if (task.channel === 'email' || task.channel === 'x' || task.channel === 'linkedin' || task.channel === 'instagram') {
    return 'send_ready';
  }

  if (task.category === 'website' || task.category === 'content') {
    return 'implementation_handoff';
  }

  return 'founder_review';
};

const defaultExecutionPreferenceForTask = (task: Task, activeProviderId: string): ExecutionPreference => {
  return {
    provider: activeProviderId,
    mode: defaultExecutionModeForTask(task),
  };
};

const filterTasksBySurface = (tasks: Task[], surface: DashboardSurface) => {
  if (surface === 'northstar') {
    return tasks.filter((task) => task.actor === 'northstar');
  }

  if (surface === 'founder') {
    return tasks.filter((task) => task.needsFounderAction || task.actor === 'founder');
  }

  if (surface === 'approvals') {
    return tasks.filter((task) => task.status === 'waiting_for_approval');
  }

  return tasks;
};

export function CommandCenter() {
  const savedOnboardingDraft = loadStoredJson<OnboardingDraft>(ONBOARDING_DRAFT_KEY);
  const savedFounderContext = loadStoredJson<FounderIntake>(FOUNDER_CONTEXT_KEY);
  const savedView = loadStoredJson<{
    page: 'onboarding' | 'dashboard';
    activeSection: DashboardSection;
    activeSurface: DashboardSurface;
  }>(WORKSPACE_VIEW_KEY);
  const savedExecutionPreferences = loadStoredJson<Record<string, ExecutionPreference>>(EXECUTION_PREFS_KEY) ?? {};
  const savedProjectId = loadStoredJson<string>(SELECTED_PROJECT_KEY);
  const hasSavedView = Boolean(savedView);
  const [state, setState] = useState<AppState>(demoState);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string; websiteUrl: string }>>([
    { id: demoState.project.id, name: demoState.project.name, websiteUrl: demoState.project.websiteUrl },
  ]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(savedProjectId ?? null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [page, setPage] = useState<'onboarding' | 'dashboard'>(savedView?.page ?? 'onboarding');
  const [activeSection, setActiveSection] = useState<DashboardSection>(savedView?.activeSection ?? 'board');
  const [activeSurface, setActiveSurface] = useState<DashboardSurface>(savedView?.activeSurface ?? 'kanban');
  const [founderIntake, setFounderIntake] = useState<FounderIntake | null>(savedFounderContext ?? savedOnboardingDraft?.intake ?? defaultFounderIntake);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft | null>(savedOnboardingDraft);
  const [onboardingResetKey, setOnboardingResetKey] = useState(0);
  const [executionPreferences, setExecutionPreferences] = useState<Record<string, ExecutionPreference>>(savedExecutionPreferences);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
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
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});
  const [decisionErrors, setDecisionErrors] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [providerErrors, setProviderErrors] = useState<Record<string, string>>({});
  const [integrationErrors, setIntegrationErrors] = useState<Record<string, string>>({});
  const [boardQuery, setBoardQuery] = useState('');
  const [boardCategoryFilter, setBoardCategoryFilter] = useState<'all' | Task['category']>('all');
  const [boardOwnerFilter, setBoardOwnerFilter] = useState<'all' | 'northstar' | 'founder'>('all');
  const boardSearchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void Promise.all([
      api.listProjects(),
      api.getState(savedProjectId ?? undefined),
    ]).then(([projects, loaded]) => {
      const hasProjects = projects.length > 0;
      setAvailableProjects(projects.map((project) => ({
        id: project.id,
        name: project.name,
        websiteUrl: project.websiteUrl,
      })));
      setSelectedProjectId(loaded.project.id);
      setState(loaded);
      if (loaded.founderIntake) {
        setFounderIntake(loaded.founderIntake);
      }
      if (!hasSavedView) {
        setPage(hasProjects ? 'dashboard' : 'onboarding');
        setActiveSection(hasProjects ? 'board' : 'command_center');
        setActiveSurface('kanban');
      }
    }).finally(() => {
      setIsBootstrapping(false);
    });
  }, [savedProjectId]);

  useEffect(() => {
    persistStoredJson(WORKSPACE_VIEW_KEY, {
      page,
      activeSection,
      activeSurface,
    });
  }, [activeSection, activeSurface, page]);

  useEffect(() => {
    if (founderIntake) {
      persistStoredJson(FOUNDER_CONTEXT_KEY, founderIntake);
      return;
    }

    removeStoredJson(FOUNDER_CONTEXT_KEY);
  }, [founderIntake]);

  useEffect(() => {
    persistStoredJson(EXECUTION_PREFS_KEY, executionPreferences);
  }, [executionPreferences]);

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
        setActiveSurface('approvals');
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setActiveSection('command_center');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedTask]);

  const sortedTasks = useMemo(
    () => [...state.tasks].sort((left, right) => right.priority_score - left.priority_score),
    [state.tasks],
  );

  const selectedArtifact = useMemo(
    () => state.artifacts.find((artifact) => artifact.taskId === selectedTask?.id) ?? null,
    [selectedTask, state.artifacts],
  );

  const selectedApproval = useMemo<Approval | null>(() => {
    if (!selectedTask) {
      return null;
    }

    return (
      state.approvals.find((approval) => approval.taskId === selectedTask.id && approval.status === 'pending')
      ?? state.approvals.find((approval) => approval.taskId === selectedTask.id)
      ?? null
    );
  }, [selectedTask, state.approvals]);

  const comments = useMemo(
    () => state.comments.filter((comment) => comment.taskId === selectedTask?.id),
    [selectedTask, state.comments],
  );

  const taskCountByColumn = useMemo(() => {
    return state.tasks.reduce<Record<TaskStatus, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    }, {
      inbox: 0,
      evaluating: 0,
      planned: 0,
      in_progress: 0,
      waiting_for_approval: 0,
      waiting_on_founder: 0,
      done: 0,
      blocked: 0,
    });
  }, [state.tasks]);

  const boardSignals = useMemo(() => ({
    now: sortedTasks.find((task) => task.status === 'in_progress') ?? sortedTasks.find((task) => task.status === 'planned') ?? null,
    next: sortedTasks.find((task) => task.status === 'evaluating' || task.status === 'inbox') ?? null,
    founder: sortedTasks.find((task) => task.status === 'waiting_on_founder' || task.status === 'waiting_for_approval') ?? null,
  }), [sortedTasks]);

  const pendingApprovals = useMemo(
    () => state.approvals.filter((approval) => approval.status === 'pending'),
    [state.approvals],
  );
  const hasExistingWorkspace = availableProjects.length > 0 && selectedProjectId !== null;

  const latestRun = useMemo(
    () => [...state.agentRuns].sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))[0] ?? null,
    [state.agentRuns],
  );

  const filteredBoardTasks = useMemo(
    () => filterTasksBySurface(state.tasks, activeSurface),
    [activeSurface, state.tasks],
  );

  const boardVisibleTasks = useMemo(() => {
    const query = boardQuery.trim().toLowerCase();
    return filteredBoardTasks.filter((task) => {
      if (boardCategoryFilter !== 'all' && task.category !== boardCategoryFilter) {
        return false;
      }

      if (boardOwnerFilter !== 'all' && task.actor !== boardOwnerFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return `${task.title} ${task.description} ${task.rationale} ${task.outputLabel ?? ''}`.toLowerCase().includes(query);
    });
  }, [boardCategoryFilter, boardOwnerFilter, boardQuery, filteredBoardTasks]);

  const northstarTasks = useMemo(
    () => sortedTasks.filter((task) => task.actor === 'northstar' && !task.needsFounderAction),
    [sortedTasks],
  );

  const founderTasks = useMemo(
    () => sortedTasks.filter((task) => task.needsFounderAction || task.actor === 'founder'),
    [sortedTasks],
  );

  const connectedIntegrations = useMemo(
    () => state.integrations.filter((integration) => integration.status === 'connected').length,
    [state.integrations],
  );

  const queuedCount = taskCountByColumn.inbox + taskCountByColumn.evaluating + taskCountByColumn.planned;
  const liveCount = taskCountByColumn.in_progress + taskCountByColumn.waiting_for_approval + taskCountByColumn.waiting_on_founder;
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

  const boardEmptyState = useMemo(() => {
    if (boardQuery || boardCategoryFilter !== 'all' || boardOwnerFilter !== 'all') {
      return {
        title: 'No tasks match the current board filters.',
        copy: 'Adjust the search, owner, or category filters to widen the board again.',
        actionLabel: 'Reset filters',
        onAction: () => {
          setBoardQuery('');
          setBoardCategoryFilter('all');
          setBoardOwnerFilter('all');
        },
      };
    }

    if (activeSurface === 'northstar') {
      return {
        title: 'No Northstar-owned tasks match this view.',
        copy: 'Switch back to the full board or queue agent-owned work from the command center so Northstar has a clear execution stack.',
        actionLabel: 'Show all tasks',
        onAction: () => setActiveSurface('kanban'),
      };
    }

    if (activeSurface === 'founder') {
      return {
        title: 'No founder tasks are visible right now.',
        copy: 'That usually means the founder queue is clear. Switch surfaces or open approvals if you want to review draft decisions.',
        actionLabel: 'Open approvals',
        onAction: () => {
          setActiveSurface('approvals');
          setActiveSection('approvals');
        },
      };
    }

    if (activeSurface === 'approvals') {
      return {
        title: 'Nothing is waiting for approval.',
        copy: 'Generate a draft, request a revision, or return to the full board to keep Northstar moving.',
        actionLabel: 'Show all tasks',
        onAction: () => setActiveSurface('kanban'),
      };
    }

    return {
      title: 'No board work is visible yet.',
      copy: 'Use the task intake form or finish onboarding so Northstar has something to score and route.',
      actionLabel: 'Open command center',
      onAction: () => setActiveSection('command_center'),
    };
  }, [activeSection, activeSurface, boardCategoryFilter, boardOwnerFilter, boardQuery]);

  const getSectionEmptyState = (section: DashboardSection) => {
    if (activeSurface !== 'kanban') {
      return {
        title: `No ${surfaceOptions.find((option) => option.key === activeSurface)?.label.toLowerCase()} tasks match this section.`,
        copy: 'Surface filters stay active across the workspace. Reset the board view if you want the full section backlog again.',
        actionLabel: 'Show all tasks',
        onAction: () => setActiveSurface('kanban'),
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
      copy: 'Northstar will populate this area once related work is scored or connected workflows unlock more execution.',
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

  const updateExecutionPreference = useCallback((task: Task, next: Partial<ExecutionPreference>) => {
    setExecutionPreferences((current) => ({
      ...current,
      [task.id]: {
        ...defaultExecutionPreferenceForTask(task, state.activeProviderId),
        ...current[task.id],
        ...next,
      },
    }));
  }, [state.activeProviderId]);

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
      setActiveSurface('kanban');
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
      const task = state.tasks.find((item) => item.id === taskId);
      const preference = task ? (executionPreferences[taskId] ?? defaultExecutionPreferenceForTask(task, state.activeProviderId)) : undefined;
      const updated = await api.executeTask(taskId, preference);
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

  const renderBoardPanel = (title: string, copy: string, tasks: Task[]) => (
    <section className="board-canvas">
      <div className="board-canvas-head">
        <div>
          <p className="eyebrow">{title}</p>
          <h3>{copy}</h3>
          <p className="board-canvas-copy">
            Priority score = impact x confidence x goal fit / effort.
          </p>
        </div>
        <div className="board-canvas-meta">
          <span className="formula-chip">{state.profile.companyName}</span>
          <span className="formula-chip subtle-chip">{boardSignals.now?.title ?? 'Clear runway'}</span>
        </div>
      </div>

      <div className="board-filter-bar">
        <label className="board-filter-field board-filter-search">
          <span>Search</span>
          <input
            ref={boardSearchRef}
            value={boardQuery}
            onChange={(event) => setBoardQuery(event.target.value)}
            placeholder="Search tasks, rationale, or output"
          />
        </label>

        <label className="board-filter-field">
          <span>Category</span>
          <select value={boardCategoryFilter} onChange={(event) => setBoardCategoryFilter(event.target.value as typeof boardCategoryFilter)}>
            <option value="all">All categories</option>
            <option value="gtm">GTM</option>
            <option value="seo">SEO</option>
            <option value="content">Content</option>
            <option value="social">Social</option>
            <option value="website">Website</option>
            <option value="crm">CRM</option>
            <option value="research">Research</option>
            <option value="product_signal">Feature suggestions</option>
            <option value="integration">Integrations</option>
          </select>
        </label>

        <label className="board-filter-field">
          <span>Owner</span>
          <select value={boardOwnerFilter} onChange={(event) => setBoardOwnerFilter(event.target.value as typeof boardOwnerFilter)}>
            <option value="all">All owners</option>
            <option value="northstar">Northstar</option>
            <option value="founder">Founder</option>
          </select>
        </label>

        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            setBoardQuery('');
            setBoardCategoryFilter('all');
            setBoardOwnerFilter('all');
          }}
        >
          Reset filters
        </button>
      </div>

      {tasks.length ? (
        <KanbanBoard
          pendingTaskId={statusChangeTaskId}
          statusErrors={statusErrors}
          tasks={tasks}
          onTaskOpen={(task) => setSelectedTask(task)}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <article className="board-empty-state">
          <p className="eyebrow">Filtered view</p>
          <h3>{boardEmptyState.title}</h3>
          <p className="board-canvas-copy">{boardEmptyState.copy}</p>
          <button className="ghost-button" type="button" onClick={boardEmptyState.onAction}>
            {boardEmptyState.actionLabel}
          </button>
        </article>
      )}
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
    if (activeSection === 'command_center') {
      return (
        <div className="workspace-page">
          <OverviewPanels approvals={state.approvals} founderIntake={founderIntake} tasks={sortedTasks} />

          <div className="dashboard-shell">
            <div className="board-stage">
              {renderBoardPanel('Live board', 'Board-first execution across Northstar and founder lanes', boardVisibleTasks)}
            </div>

            <aside className="insight-rail">
              <ApprovalQueue
                approvals={state.approvals}
                artifacts={state.artifacts}
                decisionErrorByTaskId={decisionErrors}
                pendingExecuteTaskId={executeTaskId}
                pendingApproveTaskId={approveTaskId}
                pendingRejectTaskId={rejectTaskId}
                tasks={state.tasks}
                onApprove={handleApproveArtifact}
                onRequestRevision={handleExecuteTask}
                onReject={handleRejectArtifact}
                onTaskOpen={(task) => setSelectedTask(task)}
              />
              <ConnectionsPanel
                connectErrorById={integrationErrors}
                founderSession={state.founderSession}
                founderIntake={founderIntake}
                providerErrorById={providerErrors}
                executionProviders={state.executionProviders}
                activeProviderId={state.activeProviderId}
                integrations={state.integrations}
                pendingProviderConnectId={connectProviderId}
                pendingProviderActivateId={activateProviderId}
                pendingConnectId={connectIntegrationId}
                pendingDisconnectId={disconnectIntegrationId}
                pendingSyncId={syncIntegrationId}
                onProviderConnect={handleConnectProvider}
                onProviderActivate={handleActivateProvider}
                onConnect={handleConnectIntegration}
                onDisconnect={handleDisconnectIntegration}
                onSync={handleSyncIntegration}
              />
              <CompanySummary project={state.project} profile={state.profile} snapshot={state.snapshot} />
              <AddTaskForm error={addTaskError} loading={addTaskLoading} onAdd={handleAddTask} />
            </aside>
          </div>
        </div>
      );
    }

    if (activeSection === 'board') {
      return (
        <div className="dashboard-shell">
          <div className="board-stage">
            {renderBoardPanel('Project board', 'A Linear-style board for founder operations', boardVisibleTasks)}
          </div>

          <aside className="insight-rail">
            {renderTaskList('Northstar is doing', 'The next agent-owned execution stack', northstarTasks.slice(0, 4), {
              title: 'No agent-owned work is queued.',
              copy: 'Add a task or switch to the full board if you want Northstar to pick up another execution block.',
              actionLabel: 'Open command center',
              onAction: () => setActiveSection('command_center'),
            })}
            {renderTaskList('Founder needs to do', 'The next human decisions and blockers', founderTasks.slice(0, 4), {
              title: 'The founder queue is clear.',
              copy: 'No blocker or decision is active right now, so Northstar has runway to continue the next pass.',
              actionLabel: 'Open approvals',
              onAction: () => setActiveSection('approvals'),
            })}
            <AddTaskForm error={addTaskError} loading={addTaskLoading} onAdd={handleAddTask} />
          </aside>
        </div>
      );
    }

    if (activeSection === 'gtm_plan') {
      return (
        <div className="section-stack">
          <section className="rail-card section-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Goals</p>
                <h2>Current growth plan</h2>
              </div>
            </div>
            <div className="goal-grid">
              {state.goals.map((goal) => (
                <article key={goal.id} className="goal-card">
                  <span>{goal.horizon}</span>
                  <strong>{goal.title}</strong>
                  <p>{goal.summary}</p>
                  <div className="goal-meta">
                    <span>{goal.metric}</span>
                    <span>{goal.target}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rail-card section-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Initiatives</p>
                <h2>What Northstar is sequencing now</h2>
              </div>
            </div>
            <div className="section-list">
              {state.initiatives.map((initiative) => (
                <article key={initiative.id} className="section-list-static">
                  <div>
                    <strong>{initiative.title}</strong>
                    <p>{initiative.summary}</p>
                  </div>
                  <div className="section-list-meta">
                    <span className={`status-chip ${initiative.status === 'active' ? 'in_progress' : initiative.status === 'complete' ? 'done' : 'planned'}`}>
                      {initiative.status}
                    </span>
                    <span className="domain-badge">{initiative.category}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {renderTaskList('GTM tasks', 'Execution linked to the growth plan', sectionTasks, getSectionEmptyState('gtm_plan'))}
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
          {renderCapabilityPanels('content')}
          {renderTaskList('Content assets', 'Briefs, drafts, landing page copy, and founder narrative work', sectionTasks, getSectionEmptyState('content'))}
        </div>
      );
    }

    if (activeSection === 'social') {
      return (
        <div className="section-stack">
          {renderCapabilityPanels('social')}
          {renderTaskList('Social execution', 'Post generation, variants, campaign concepts, and visual support', sectionTasks, getSectionEmptyState('social'))}
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
            approvals={state.approvals}
            artifacts={state.artifacts}
            decisionErrorByTaskId={decisionErrors}
            pendingExecuteTaskId={executeTaskId}
            pendingApproveTaskId={approveTaskId}
            pendingRejectTaskId={rejectTaskId}
            tasks={state.tasks}
            onApprove={handleApproveArtifact}
            onRequestRevision={handleExecuteTask}
            onReject={handleRejectArtifact}
            onTaskOpen={(task) => setSelectedTask(task)}
          />
          {renderTaskList('Founder queue', 'Everything waiting on review, answers, or approval', founderTasks, getSectionEmptyState('approvals'))}
        </div>
      );
    }

    if (activeSection === 'connections') {
      return (
        <div className="section-stack">
          <ConnectionsPanel
            connectErrorById={integrationErrors}
            founderSession={state.founderSession}
            founderIntake={founderIntake}
            providerErrorById={providerErrors}
            executionProviders={state.executionProviders}
            activeProviderId={state.activeProviderId}
            integrations={state.integrations}
            pendingProviderConnectId={connectProviderId}
            pendingProviderActivateId={activateProviderId}
            pendingConnectId={connectIntegrationId}
            pendingDisconnectId={disconnectIntegrationId}
            pendingSyncId={syncIntegrationId}
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
                <p className="eyebrow">Founder context</p>
                <h2>Workspace preferences and operating assumptions</h2>
              </div>
            </div>
            <div className="settings-grid">
              <article className="settings-card">
                <span>Website</span>
                <strong>{founderIntake?.websiteUrl ?? state.project.websiteUrl}</strong>
              </article>
              <article className="settings-card">
                <span>ICP</span>
                <strong>{founderIntake?.icp ?? state.profile.guessedIcp}</strong>
              </article>
              <article className="settings-card">
                <span>Main goal</span>
                <strong>{founderIntake?.mainGoal ?? 'Create a clearer growth plan'}</strong>
              </article>
              <article className="settings-card">
                <span>Priority channel</span>
                <strong>{founderIntake?.keyChannel ?? 'SEO and founder content'}</strong>
              </article>
              <article className="settings-card">
                <span>Collaboration scope</span>
                <strong>{launchProfile.collaborationScope}</strong>
              </article>
              <article className="settings-card">
                <span>Output quality bar</span>
                <strong>{launchProfile.outputQualityBar}</strong>
              </article>
            </div>
          </section>
          <section className="rail-card section-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Launch profile</p>
                <h2>Product direction and pilot defaults</h2>
              </div>
            </div>
            <div className="settings-detail-grid">
              <article className="settings-detail-card settings-detail-card-lead">
                <span>Positioning</span>
                <strong>{launchProfile.positioning}</strong>
                <p>Northstar should plan work, generate the work, hold review, and keep the founder queue explicit in one system.</p>
              </article>
              <article className="settings-detail-card">
                <span>Launch ICP</span>
                <strong>{launchProfile.icp}</strong>
              </article>
              <article className="settings-detail-card">
                <span>Providers</span>
                <div className="settings-chip-row">
                  {launchProfile.supportedProviders.map((provider) => (
                    <span key={provider} className="issue-chip">{provider}</span>
                  ))}
                </div>
              </article>
              <article className="settings-detail-card">
                <span>Integration targets</span>
                <div className="settings-chip-row">
                  {launchProfile.integrationTargets.map((integration) => (
                    <span key={integration} className="issue-chip">{integration}</span>
                  ))}
                </div>
              </article>
            </div>
          </section>
          <CompanySummary project={state.project} profile={state.profile} snapshot={state.snapshot} />
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
                    setActiveSurface('kanban');
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
                  <p className="workspace-shortcuts">Shortcuts: `Shift+B` board, `Shift+A` approvals, `Shift+C` command center, `/` search, `Esc` close task.</p>
                </div>

                <div className="workspace-topbar-actions">
                  {availableProjects.length > 1 ? (
                    <label className="workspace-project-switcher">
                      <span>Workspace</span>
                      <select
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
                  ) : null}
                  <button className="ghost-button" type="button" onClick={() => setPage('onboarding')}>
                    Re-run onboarding
                  </button>
                  <button className="primary-button" type="button" onClick={() => setActiveSection('board')}>
                    Open board
                  </button>
                </div>
              </div>

              <div className="workspace-meta-bar">
                <div className="surface-switch">
                  {surfaceOptions.map((option) => (
                    <button
                      key={option.key}
                      className={`surface-pill ${activeSurface === option.key ? 'surface-pill-active' : ''}`}
                      type="button"
                      onClick={() => setActiveSurface(option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="workspace-meta-strip">
                  <span>{formatDomain(state.project.websiteUrl)}</span>
                  <span>{queuedCount} queued</span>
                  <span>{liveCount} live</span>
                  <span>{connectedIntegrations}/{state.integrations.length} connections</span>
                  {state.founderSession ? <span>{state.founderSession.displayName}</span> : null}
                  {latestRun ? <span>Last run {formatDateTime(latestRun.startedAt)}</span> : null}
                </div>
              </div>

              <div className="operator-strip">
                <article className="operator-card">
                  <span>Northstar is doing</span>
                  <strong>{northstarTasks[0]?.title ?? 'No active agent work right now.'}</strong>
                  <p>{northstarTasks[0]?.description ?? 'Open the board to queue the next execution block.'}</p>
                </article>

                <article className="operator-card operator-card-founder">
                  <span>Founder needs to do</span>
                  <strong>{founderTasks[0]?.title ?? 'No founder actions are waiting.'}</strong>
                  <p>{founderTasks[0]?.description ?? 'Northstar has a clear runway for the next pass.'}</p>
                </article>
              </div>

              <div className="workspace-context-grid">
                <article className="context-card">
                  <span>Current focus</span>
                  <strong>{boardSignals.now?.title ?? boardSignals.next?.title ?? 'Clear runway'}</strong>
                </article>
                <article className="context-card">
                  <span>Main goal</span>
                  <strong>{founderIntake?.mainGoal ?? 'Build a founder-usable growth system'}</strong>
                </article>
                <article className="context-card">
                  <span>Priority channel</span>
                  <strong>{founderIntake?.keyChannel ?? 'SEO and founder content'}</strong>
                </article>
                <article className="context-card">
                  <span>Founder bottleneck</span>
                  <strong>{humanize(founderIntake?.bottleneck ?? 'conversion')}</strong>
                </article>
              </div>
            </header>

            {renderSectionContent()}
          </div>
        </section>
      )}

      <TaskDrawer
        approval={selectedApproval}
        approveLoading={approveTaskId === selectedTask?.id}
        artifact={selectedArtifact}
        commentError={selectedTask ? commentErrors[selectedTask.id] ?? null : null}
        commentLoading={commentTaskId === selectedTask?.id}
        comments={comments}
        decisionError={selectedTask ? decisionErrors[selectedTask.id] ?? null : null}
        executionPreference={selectedTask ? executionPreferences[selectedTask.id] ?? defaultExecutionPreferenceForTask(selectedTask, state.activeProviderId) : null}
        executionProviders={state.executionProviders}
        executeLoading={executeTaskId === selectedTask?.id}
        activeProviderId={state.activeProviderId}
        integrations={state.integrations}
        onAddComment={handleAddComment}
        onApprove={handleApproveArtifact}
        onClose={() => setSelectedTask(null)}
        onExecutionPreferenceChange={(next) => {
          if (!selectedTask) {
            return;
          }

          updateExecutionPreference(selectedTask, next);
        }}
        onExecute={handleExecuteTask}
        onOpenConnections={() => setActiveSection('connections')}
        onReject={handleRejectArtifact}
        rejectLoading={rejectTaskId === selectedTask?.id}
        task={selectedTask}
      />
    </main>
  );
}
