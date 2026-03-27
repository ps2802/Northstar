import { demoState } from "./mockData";
import { supportedManualTaskTypes } from "./taskConfig";
import type {
  AppState,
  Approval,
  Artifact,
  ExecutionProvider,
  ExecutionPreference,
  FounderIntake,
  FounderSession,
  Integration,
  NewTaskInput,
  Task,
  TaskStatus,
  TaskType
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : "/api");
const STORAGE_KEY = "founder-os-state";
const INTEGRATION_OVERRIDES_KEY = "founder-os-integrations";
// TODO(v2): Route this through adapter-aware transport so WhatsApp, Telegram, and bot channels can reuse the same command center state.

type BackendTaskStatus = "INBOX" | "EVALUATING" | "PLANNED" | "IN_PROGRESS" | "WAITING_FOR_APPROVAL" | "DONE" | "BLOCKED";
type BackendTaskType = "SEO_AUDIT" | "KEYWORD_CLUSTER" | "META_REWRITE" | "BLOG_BRIEF" | "LINKEDIN_POST_SET" | "X_POST_SET" | "HOMEPAGE_COPY_SUGGESTION" | "COMPETITOR_SCAN";

interface BackendDashboard {
  workspace: {
    id: string;
    name: string;
    created_at: string;
  };
  project: {
    id: string;
    workspace_id: string;
    name: string;
    website_url: string;
    created_at: string;
  };
  website_snapshot: {
    id: string;
    project_id: string;
    homepage_title: string;
    summary: string;
    created_at: string;
    crawled_pages: Array<{ url: string; title: string; excerpt: string }>;
  };
  company_profile: {
    id: string;
    project_id: string;
    company_summary: string;
    guessed_icp: string;
    key_pages: string[];
    opportunities: string[];
  };
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    type: BackendTaskType;
    source: "SYSTEM" | "USER" | "AGENT";
    status: BackendTaskStatus;
    impact: number;
    effort: number;
    confidence: number;
    goal_fit: number;
    priority_score: number;
    rationale: string;
    dependencies: string[];
    owner_type: "AGENT" | "USER" | "SYSTEM";
    movement_history: Array<{
      from: BackendTaskStatus | null;
      to: BackendTaskStatus;
      reason: string;
      at: string;
    }>;
    artifact_id?: string | null;
    created_at: string;
    updated_at: string;
  }>;
  artifacts: Array<{
    id: string;
    type: "BLOG_BRIEF";
    title: string;
    content: string;
    status: "DRAFT" | "WAITING_FOR_APPROVAL" | "APPROVED" | "REJECTED";
    created_at: string;
  }>;
  approvals: Array<{
    id: string;
    artifact_id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    created_at: string;
    updated_at: string;
    decision_note?: string | null;
  }>;
  comments?: Array<{
    id: string;
    task_id: string;
    body: string;
    author: string;
    created_at: string;
    updated_at: string;
  }>;
  agent_runs: Array<{
    id: string;
    project_id: string;
    task_id?: string | null;
    run_type: string;
    status: string;
    summary: string;
    output?: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  }>;
}

interface BackendWorkspaceConfiguration {
  founder_intake?: {
    website_url: string;
    business_description?: string;
    icp?: string;
    main_goal?: string;
    key_channel?: string;
    what_tried?: string;
    priority_work?: string;
    competitors?: string;
    bottleneck?: FounderIntake["bottleneck"];
    auth_method?: FounderIntake["authMethod"];
    email?: string;
  };
  founder_session?: {
    auth_method: FounderSession["authMethod"];
    email?: string;
    status: FounderSession["status"];
    display_name: string;
  };
  execution_provider?: {
    active_provider: string;
    providers: Array<{
      key: string;
      name: string;
      auth_type: ExecutionProvider["authType"];
      status: ExecutionProvider["status"];
      description: string;
      model_hint: string;
      is_default: boolean;
      masked_secret?: string;
      connected_at?: string;
    }>;
  };
  integrations?: Array<{
    key: string;
    name: string;
    category: Integration["category"];
    auth_type: Integration["authType"];
    status: Integration["status"];
    description: string;
    credential_label: string;
    connected_as?: string;
    masked_secret?: string;
    connected_at?: string;
    last_sync_at?: string;
  }>;
}

interface IntegrationOverride {
  status?: Integration["status"];
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  connectedAs?: string | null;
  maskedSecret?: string | null;
}

interface BackendProjectSummary {
  id: string;
  workspaceId?: string;
  name: string;
  websiteUrl: string;
  createdAt?: string;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const supportedManualTaskTypeSet = new Set(supportedManualTaskTypes.map((task) => task.value));
const maskSecret = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}***`;
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
};
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const parseWorkspaceConfiguration = (value: unknown): BackendWorkspaceConfiguration | null => {
  if (!isRecord(value)) {
    return null;
  }

  return value as BackendWorkspaceConfiguration;
};

const getLatestWorkspaceConfiguration = (runs: BackendDashboard["agent_runs"]): BackendWorkspaceConfiguration | null => {
  const configurationRun = runs.find((run) => run.run_type === "workspace_configuration" && run.output);

  return configurationRun ? parseWorkspaceConfiguration(configurationRun.output) : null;
};

const deriveGoals = (founderIntake: FounderIntake | null, tasks: Task[]) => {
  if (!founderIntake) {
    return demoState.goals;
  }

  const waitingCount = tasks.filter((task) => task.needsFounderAction).length;
  return [
    {
      id: "goal_active_pipeline",
      title: founderIntake.mainGoal || "Build a founder-usable growth system",
      metric: "Primary founder outcome",
      target: founderIntake.keyChannel || "Multi-channel execution",
      horizon: "Current wave",
      summary: founderIntake.priorityWork || "Northstar should sequence the next useful work across planning and execution.",
    },
    {
      id: "goal_founder_queue",
      title: "Keep the founder queue tight",
      metric: "Open founder actions",
      target: `${waitingCount} visible decisions`,
      horizon: "This week",
      summary: "Approvals, answers, and blockers should stay small enough that a non-technical founder can keep moving without losing the board.",
    },
  ];
};

const deriveInitiatives = (founderIntake: FounderIntake | null, tasks: Task[]) => {
  if (!founderIntake) {
    return demoState.initiatives;
  }

  const categories: Array<Task["category"]> = ["gtm", "content", "crm", "research", "product_signal"];
  return categories
    .map((category) => {
      const categoryTasks = tasks.filter((task) => task.category === category);
      if (!categoryTasks.length) {
        return null;
      }

      const activeCount = categoryTasks.filter((task) => ["in_progress", "waiting_for_approval", "waiting_on_founder"].includes(task.status)).length;
      return {
        id: `initiative_${category}`,
        title: category === "product_signal" ? "Feature suggestions" : `${category.replaceAll("_", " ")} loop`,
        category,
        status: activeCount > 0 ? "active" as const : "planned" as const,
        summary: category === "gtm"
          ? founderIntake.priorityWork || "Translate founder context into the next GTM moves."
          : `Northstar is keeping ${category.replaceAll("_", " ")} work tied to the board instead of letting it drift into separate tools.`,
        linkedTaskIds: categoryTasks.slice(0, 4).map((task) => task.id),
      };
    })
    .filter((initiative): initiative is NonNullable<typeof initiative> => initiative !== null);
};

const getTaskCategory = (type: TaskType): Task["category"] => {
  switch (type) {
    case "seo_audit":
    case "keyword_cluster":
    case "meta_rewrite":
      return "seo";
    case "blog_brief":
      return "content";
    case "email_template":
    case "outreach_sequence":
      return "crm";
    case "illustration_brief":
      return "social";
    case "research_summary":
    case "user_research_outreach":
      return "research";
    case "linkedin_post_set":
    case "x_post_set":
      return "social";
    case "homepage_copy_suggestion":
      return "website";
    case "competitor_scan":
      return "research";
    case "integration_setup":
      return "integration";
    case "founder_input":
      return "gtm";
  }
};

const getTaskChannel = (type: TaskType): Task["channel"] => {
  switch (type) {
    case "x_post_set":
      return "x";
    case "linkedin_post_set":
      return "linkedin";
    case "illustration_brief":
      return "instagram";
    case "email_template":
    case "outreach_sequence":
    case "user_research_outreach":
      return "email";
    case "homepage_copy_suggestion":
    case "meta_rewrite":
    case "keyword_cluster":
    case "seo_audit":
    case "blog_brief":
      return "web";
    case "research_summary":
    case "competitor_scan":
    case "integration_setup":
    case "founder_input":
      return "internal";
  }
};

const getTaskActor = (task: Pick<Task, "owner_type" | "status" | "type">): Task["actor"] => {
  if (task.status === "waiting_for_approval" || task.status === "waiting_on_founder" || task.type === "founder_input") {
    return "founder";
  }

  return task.owner_type === "agent" ? "northstar" : "founder";
};

const getNeedsFounderAction = (task: Pick<Task, "status" | "actor">): boolean =>
  task.status === "waiting_for_approval" || task.status === "waiting_on_founder" || task.actor === "founder";

const normalizeTask = (task: Task): Task => {
  const actor = task.actor ?? getTaskActor(task);
  return {
    ...task,
    category: task.category ?? getTaskCategory(task.type),
    channel: task.channel ?? getTaskChannel(task.type),
    outputLabel: task.outputLabel ?? (
      task.type === "blog_brief" ? "Blog brief"
        : task.type === "x_post_set" || task.type === "linkedin_post_set" ? "Social post set"
          : task.type === "email_template" ? "Email draft"
            : task.type === "outreach_sequence" || task.type === "user_research_outreach" ? "Outreach draft"
              : task.type === "illustration_brief" ? "Visual brief"
                : task.type === "research_summary" ? "Research summary"
                  : task.type === "homepage_copy_suggestion" ? "Website copy"
                    : undefined
    ),
    executionStage: task.executionStage ?? (
      task.status === "waiting_for_approval" ? "ready_for_review"
        : task.status === "waiting_on_founder" ? "waiting_on_founder"
          : task.status === "done" ? "published"
            : task.status === "in_progress" ? "generated"
              : "strategy"
    ),
    actor,
    needsFounderAction: typeof task.needsFounderAction === "boolean"
      ? task.needsFounderAction
      : getNeedsFounderAction({ status: task.status, actor }),
  };
};

const getDefaultExecutionProviders = (): ExecutionProvider[] => clone(demoState.executionProviders).map((provider) => ({
  ...provider,
  status: provider.authType === "cli" ? "available" : "needs_key",
  maskedSecret: undefined,
  connectedAt: undefined,
  isDefault: provider.id === demoState.activeProviderId,
}));

const getDefaultIntegrations = (): Integration[] => clone(demoState.integrations).map((integration) => ({
  ...integration,
  status: integration.authType === "api_key" ? "needs_key" : "planned",
  connectedAs: undefined,
  maskedSecret: undefined,
  connectedAt: undefined,
  lastSyncAt: undefined,
}));

const createCachedFallbackState = (): AppState => ({
  ...clone(demoState),
  founderIntake: null,
  founderSession: null,
  tasks: [],
  artifacts: [],
  approvals: [],
  comments: [],
  agentRuns: [],
  goals: [],
  initiatives: [],
  executionProviders: getDefaultExecutionProviders(),
  activeProviderId: demoState.activeProviderId,
  integrations: getDefaultIntegrations(),
  crmContacts: [],
  researchNotes: [],
});

const loadIntegrationOverrides = (): Record<string, IntegrationOverride> => {
  const raw = window.localStorage.getItem(INTEGRATION_OVERRIDES_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, IntegrationOverride>;
  } catch {
    return {};
  }
};

const mergeIntegrationOverrides = (integrations: Integration[]): Integration[] => {
  const overrides = loadIntegrationOverrides();
  return integrations.map((integration) => {
    const override = overrides[integration.id];
    if (!override) {
      return integration;
    }

    return {
      ...integration,
      ...(override.status ? { status: override.status } : {}),
      ...(override.connectedAt !== undefined ? { connectedAt: override.connectedAt ?? undefined } : {}),
      ...(override.lastSyncAt !== undefined ? { lastSyncAt: override.lastSyncAt ?? undefined } : {}),
      ...(override.connectedAs !== undefined ? { connectedAs: override.connectedAs ?? undefined } : {}),
      ...(override.maskedSecret !== undefined ? { maskedSecret: override.maskedSecret ?? undefined } : {}),
    };
  });
};

const hydrateState = (state: AppState): AppState => {
  const base = createCachedFallbackState();
  const integrations = mergeIntegrationOverrides(state.integrations ?? base.integrations);
  const tasks = (state.tasks?.length ? state.tasks : base.tasks).map(normalizeTask);
  const founderIntake = state.founderIntake ?? base.founderIntake;
  return {
    ...base,
    ...state,
    founderIntake,
    founderSession: state.founderSession ?? base.founderSession,
    tasks,
    artifacts: state.artifacts ?? base.artifacts,
    approvals: state.approvals ?? base.approvals,
    comments: state.comments ?? base.comments,
    agentRuns: state.agentRuns ?? base.agentRuns,
    goals: state.goals ?? deriveGoals(founderIntake, tasks),
    initiatives: state.initiatives ?? deriveInitiatives(founderIntake, tasks),
    executionProviders: state.executionProviders ?? base.executionProviders,
    activeProviderId: state.activeProviderId ?? base.activeProviderId,
    integrations,
    crmContacts: state.crmContacts ?? base.crmContacts,
    researchNotes: state.researchNotes ?? base.researchNotes,
  };
};

const readStoredState = (): AppState | null => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return hydrateState(JSON.parse(raw) as AppState);
  } catch {
    return null;
  }
};

const loadState = (): AppState => readStoredState() ?? hydrateState(createCachedFallbackState());

const saveState = (state: AppState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const backendStatusToUi: Record<BackendTaskStatus, TaskStatus> = {
  INBOX: "inbox",
  EVALUATING: "evaluating",
  PLANNED: "planned",
  IN_PROGRESS: "in_progress",
  WAITING_FOR_APPROVAL: "waiting_for_approval",
  DONE: "done",
  BLOCKED: "blocked"
};

const uiStatusToBackend = (status: TaskStatus): BackendTaskStatus => {
  switch (status) {
    case "inbox":
      return "INBOX";
    case "evaluating":
      return "EVALUATING";
    case "planned":
      return "PLANNED";
    case "in_progress":
      return "IN_PROGRESS";
    case "waiting_for_approval":
      return "WAITING_FOR_APPROVAL";
    case "waiting_on_founder":
      return "BLOCKED";
    case "done":
      return "DONE";
    case "blocked":
      return "BLOCKED";
  }
};

const backendTypeToUi: Record<BackendTaskType, TaskType> = {
  SEO_AUDIT: "seo_audit",
  KEYWORD_CLUSTER: "keyword_cluster",
  META_REWRITE: "meta_rewrite",
  BLOG_BRIEF: "blog_brief",
  LINKEDIN_POST_SET: "linkedin_post_set",
  X_POST_SET: "x_post_set",
  HOMEPAGE_COPY_SUGGESTION: "homepage_copy_suggestion",
  COMPETITOR_SCAN: "competitor_scan"
};

const inferArtifactUiType = (taskType: TaskType | undefined): Artifact["type"] => {
  switch (taskType) {
    case "x_post_set":
    case "linkedin_post_set":
      return "social_post_set";
    case "homepage_copy_suggestion":
      return "website_copy";
    case "email_template":
      return "email_template";
    case "research_summary":
    case "user_research_outreach":
      return "research_summary";
    case "illustration_brief":
      return "illustration_brief";
    case "outreach_sequence":
      return "outreach_sequence";
    default:
      return "blog_brief";
  }
};

const uiTypeToBackend = (type: TaskType): BackendTaskType => {
  switch (type) {
    case "seo_audit":
      return "SEO_AUDIT";
    case "keyword_cluster":
      return "KEYWORD_CLUSTER";
    case "meta_rewrite":
      return "META_REWRITE";
    case "blog_brief":
      return "BLOG_BRIEF";
    case "email_template":
    case "outreach_sequence":
    case "illustration_brief":
    case "research_summary":
    case "user_research_outreach":
      return "COMPETITOR_SCAN";
    case "linkedin_post_set":
      return "LINKEDIN_POST_SET";
    case "x_post_set":
      return "X_POST_SET";
    case "homepage_copy_suggestion":
      return "HOMEPAGE_COPY_SUGGESTION";
    case "competitor_scan":
    case "integration_setup":
    case "founder_input":
      return "COMPETITOR_SCAN";
  }
};

const mapDashboard = (dashboard: BackendDashboard): AppState => {
  const configuration = getLatestWorkspaceConfiguration(dashboard.agent_runs);
  const taskTypeByArtifact = new Map(
    dashboard.tasks
      .filter((task) => task.artifact_id)
      .map((task) => [task.artifact_id as string, backendTypeToUi[task.type]])
  );

  const taskByArtifact = new Map(
    dashboard.tasks
      .filter((task) => task.artifact_id)
      .map((task) => [task.artifact_id as string, task.id])
  );

  const artifacts: Artifact[] = dashboard.artifacts.map((artifact) => ({
    id: artifact.id,
    taskId: taskByArtifact.get(artifact.id) ?? artifact.id,
    type: inferArtifactUiType(taskTypeByArtifact.get(artifact.id)),
    title: artifact.title,
    content: artifact.content,
    channel: getTaskChannel(taskTypeByArtifact.get(artifact.id) ?? "blog_brief"),
    deliveryStage:
      artifact.status === "APPROVED"
        ? "published"
        : artifact.status === "REJECTED"
          ? "waiting_on_founder"
          : artifact.status === "WAITING_FOR_APPROVAL"
            ? "ready_for_review"
            : "generated",
    status:
      artifact.status === "APPROVED"
        ? "approved"
        : artifact.status === "REJECTED"
          ? "rejected"
          : artifact.status === "WAITING_FOR_APPROVAL"
            ? "needs_review"
            : "draft",
    createdAt: artifact.created_at
  }));

  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

  const approvals: Approval[] = dashboard.approvals.map((approval) => ({
    id: approval.id,
    taskId: artifactById.get(approval.artifact_id)?.taskId ?? approval.artifact_id,
    status: approval.status.toLowerCase() as Approval["status"],
    requestedAt: approval.created_at,
    decidedAt: approval.status === "PENDING" ? undefined : approval.updated_at,
    note: approval.decision_note ?? undefined
  }));

  const founderIntake: FounderIntake | null = configuration?.founder_intake
    ? {
      websiteUrl: configuration.founder_intake.website_url,
      businessDescription: configuration.founder_intake.business_description ?? dashboard.company_profile.company_summary,
      icp: configuration.founder_intake.icp ?? dashboard.company_profile.guessed_icp,
      mainGoal: configuration.founder_intake.main_goal ?? "",
      keyChannel: configuration.founder_intake.key_channel ?? "",
      whatTried: configuration.founder_intake.what_tried ?? "",
      priorityWork: configuration.founder_intake.priority_work ?? "",
      competitors: configuration.founder_intake.competitors ?? "",
      bottleneck: configuration.founder_intake.bottleneck ?? "conversion",
      authMethod: configuration.founder_intake.auth_method ?? configuration.founder_session?.auth_method ?? "google",
      email: configuration.founder_intake.email ?? configuration.founder_session?.email,
    }
    : null;

  const founderSession: FounderSession | null = configuration?.founder_session
    ? {
      authMethod: configuration.founder_session.auth_method,
      email: configuration.founder_session.email,
      status: configuration.founder_session.status,
      displayName: configuration.founder_session.display_name,
    }
    : null;

  const executionProviders: ExecutionProvider[] = configuration?.execution_provider?.providers?.length
    ? configuration.execution_provider.providers.map((provider) => ({
      id: provider.key,
      name: provider.name,
      authType: provider.auth_type,
      status: provider.status,
      description: provider.description,
      modelHint: provider.model_hint,
      isDefault: provider.key === configuration.execution_provider?.active_provider || provider.is_default,
      maskedSecret: provider.masked_secret,
      connectedAt: provider.connected_at,
    }))
    : getDefaultExecutionProviders();

  const integrations: Integration[] = configuration?.integrations?.length
    ? configuration.integrations.map((integration) => ({
      id: integration.key,
      key: integration.key,
      name: integration.name,
      category: integration.category,
      authType: integration.auth_type,
      status: integration.status,
      description: integration.description,
      credentialLabel: integration.credential_label,
      connectedAs: integration.connected_as,
      maskedSecret: integration.masked_secret,
      connectedAt: integration.connected_at,
      lastSyncAt: integration.last_sync_at,
    }))
    : getDefaultIntegrations();

  const tasks: Task[] = dashboard.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    type: backendTypeToUi[task.type],
    category: getTaskCategory(backendTypeToUi[task.type]),
    source: task.source.toLowerCase() as Task["source"],
    status: backendStatusToUi[task.status],
    impact: task.impact,
    effort: task.effort,
    confidence: task.confidence,
    goal_fit: task.goal_fit,
    priority_score: task.priority_score,
    rationale: task.rationale,
    dependencies: task.dependencies,
    actor: getTaskActor({
      owner_type: task.owner_type === "AGENT" ? "agent" : task.owner_type === "USER" ? "user" : "human",
      status: backendStatusToUi[task.status],
      type: backendTypeToUi[task.type],
    }),
    needsFounderAction: backendStatusToUi[task.status] === "waiting_for_approval",
    owner_type:
      task.owner_type === "AGENT" ? "agent" : task.owner_type === "USER" ? "user" : "human",
    movement_history: task.movement_history.map((movement) => ({
      from: movement.from ? backendStatusToUi[movement.from] : null,
      to: backendStatusToUi[movement.to],
      reason: movement.reason,
      at: movement.at
    })),
    created_at: task.created_at,
    updated_at: task.updated_at
  }));

  return hydrateState({
    workspace: {
      id: dashboard.workspace.id,
      name: dashboard.workspace.name,
      createdAt: dashboard.workspace.created_at
    },
    project: {
      id: dashboard.project.id,
      workspaceId: dashboard.project.workspace_id,
      name: dashboard.project.name,
      websiteUrl: dashboard.project.website_url,
      createdAt: dashboard.project.created_at
    },
    snapshot: {
      id: dashboard.website_snapshot.id,
      projectId: dashboard.website_snapshot.project_id,
      capturedAt: dashboard.website_snapshot.created_at,
      homepageTitle: dashboard.website_snapshot.homepage_title,
      homepageSummary: dashboard.website_snapshot.summary,
      pages: dashboard.website_snapshot.crawled_pages.map((page) => ({
        url: page.url,
        title: page.title,
        summary: page.excerpt
      }))
    },
    profile: {
      id: dashboard.company_profile.id,
      projectId: dashboard.company_profile.project_id,
      companyName: dashboard.project.name,
      summary: dashboard.company_profile.company_summary,
      guessedIcp: dashboard.company_profile.guessed_icp,
      keyPages: dashboard.company_profile.key_pages,
      opportunities: dashboard.company_profile.opportunities
    },
    founderIntake,
    founderSession,
    tasks,
    artifacts,
    approvals,
    comments: (dashboard.comments ?? []).map((comment) => ({
      id: comment.id,
      taskId: comment.task_id,
      author: comment.author,
      body: comment.body,
      createdAt: comment.created_at
    })),
    agentRuns: dashboard.agent_runs.map((run) => ({
      id: run.id,
      projectId: run.project_id,
      taskId: run.task_id ?? undefined,
      status: run.status === "completed" ? "completed" : run.status === "failed" ? "failed" : "running",
      summary: run.summary,
      startedAt: run.created_at,
      finishedAt: run.updated_at
    })),
    goals: deriveGoals(founderIntake, tasks),
    initiatives: deriveInitiatives(founderIntake, tasks),
    executionProviders,
    activeProviderId: configuration?.execution_provider?.active_provider ?? demoState.activeProviderId,
    integrations,
    crmContacts: [],
    researchNotes: [],
  });
};

const getResponseErrorMessage = async (response: Response) => {
  const fallbackMessage = `Request failed: ${response.status}`;

  try {
    const payload = await response.json() as { error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> } };
    if (typeof payload.error === "string") {
      return payload.error;
    }

    if (payload.error && typeof payload.error === "object") {
      const formErrors = payload.error.formErrors ?? [];
      if (formErrors.length) {
        return formErrors.join(", ");
      }

      const fieldErrors = Object.values(payload.error.fieldErrors ?? {}).flat().filter(Boolean);
      if (fieldErrors.length) {
        return fieldErrors.join(", ");
      }
    }
  } catch {
    // Ignore JSON parsing errors and fall through to a generic message.
  }

  return fallbackMessage;
};

const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...init
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  return (await response.json()) as T;
};

let latestState: AppState = loadState();

const persistAndReturn = (state: AppState) => {
  const next = hydrateState(state);
  latestState = next;
  saveState(next);
  return clone(next);
};

const createMutationError = (message: string) => new Error(message);

const getPendingApprovalForTask = (taskId: string) => {
  const approval = latestState.approvals.find((item) => item.taskId === taskId && item.status === "pending");
  if (!approval) {
    throw createMutationError("No pending approval was found for this task.");
  }

  return approval;
};

const buildWorkspaceConfigurationPayload = (overrides?: {
  founderIntake?: FounderIntake | null;
  founderSession?: FounderSession | null;
  executionProviders?: ExecutionProvider[];
  activeProviderId?: string;
  integrations?: Integration[];
}) => ({
  founder_intake: (() => {
    const founderIntake = overrides?.founderIntake ?? latestState.founderIntake;
    if (!founderIntake) {
      return undefined;
    }

    return {
      website_url: founderIntake.websiteUrl,
      business_description: founderIntake.businessDescription,
      icp: founderIntake.icp,
      main_goal: founderIntake.mainGoal,
      key_channel: founderIntake.keyChannel,
      what_tried: founderIntake.whatTried,
      priority_work: founderIntake.priorityWork,
      competitors: founderIntake.competitors,
      bottleneck: founderIntake.bottleneck,
      auth_method: founderIntake.authMethod,
      email: founderIntake.email,
    };
  })(),
  founder_session: (() => {
    const founderSession = overrides?.founderSession ?? latestState.founderSession;
    if (!founderSession) {
      return undefined;
    }

    return {
      auth_method: founderSession.authMethod,
      email: founderSession.email,
      status: founderSession.status,
      display_name: founderSession.displayName,
    };
  })(),
  execution_provider: {
    active_provider: overrides?.activeProviderId ?? latestState.activeProviderId,
    providers: (overrides?.executionProviders ?? latestState.executionProviders).map((provider) => ({
      key: provider.id,
      name: provider.name,
      auth_type: provider.authType,
      status: provider.status,
      description: provider.description,
      model_hint: provider.modelHint,
      is_default: provider.id === (overrides?.activeProviderId ?? latestState.activeProviderId),
      masked_secret: provider.maskedSecret,
      connected_at: provider.connectedAt,
    })),
  },
  integrations: (overrides?.integrations ?? latestState.integrations).map((integration) => ({
    key: integration.key,
    name: integration.name,
    category: integration.category,
    auth_type: integration.authType,
    status: integration.status,
    description: integration.description,
    credential_label: integration.credentialLabel,
    connected_as: integration.connectedAs,
    masked_secret: integration.maskedSecret,
    connected_at: integration.connectedAt,
    last_sync_at: integration.lastSyncAt,
  })),
});

export interface FounderApi {
  getState: (projectId?: string) => Promise<AppState>;
  listProjects: () => Promise<BackendProjectSummary[]>;
  getCachedState: () => AppState | null;
  listCachedProjects: () => BackendProjectSummary[];
  analyzeWebsite: (intake: FounderIntake) => Promise<AppState>;
  addTask: (input: NewTaskInput) => Promise<AppState>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<AppState>;
  executeTask: (taskId: string, preference?: ExecutionPreference) => Promise<AppState>;
  approveArtifact: (taskId: string) => Promise<AppState>;
  rejectArtifact: (taskId: string, note?: string) => Promise<AppState>;
  addComment: (taskId: string, body: string) => Promise<AppState>;
  connectProvider: (providerId: string, credential?: string) => Promise<AppState>;
  activateProvider: (providerId: string) => Promise<AppState>;
  connectIntegration: (integrationId: string, credential?: string) => Promise<AppState>;
  disconnectIntegration: (integrationId: string) => Promise<AppState>;
  syncIntegration: (integrationId: string) => Promise<AppState>;
}

export const createFounderApi = (): FounderApi => ({
  getState: async (projectId?: string) => {
    if (!projectId) {
      const projectResponse = await fetchJson<{ projects: Array<{ id: string }> }>("/projects");
      if (projectResponse.projects.length === 0) {
        throw new Error("No projects found yet.");
      }

      projectId = projectResponse.projects[0].id;
    }

    const dashboardResponse = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${projectId}/dashboard`);
    return persistAndReturn(mapDashboard(dashboardResponse.dashboard));
  },
  listProjects: async () => {
    const projectResponse = await fetchJson<{ projects: Array<{ id: string; workspaceId?: string; workspace_id?: string; name: string; websiteUrl?: string; website_url?: string; createdAt?: string; created_at?: string }> }>("/projects");
    return projectResponse.projects.map((project) => ({
      id: project.id,
      workspaceId: project.workspaceId ?? project.workspace_id,
      name: project.name,
      websiteUrl: project.websiteUrl ?? project.website_url ?? "",
      createdAt: project.createdAt ?? project.created_at,
    }));
  },
  getCachedState: () => {
    const cached = readStoredState();
    return cached ? clone(cached) : null;
  },
  listCachedProjects: () => {
    const cached = readStoredState();
    if (!cached) {
      return [];
    }

    return [{
      id: cached.project.id,
      workspaceId: cached.project.workspaceId,
      name: cached.project.name,
      websiteUrl: cached.project.websiteUrl,
      createdAt: cached.project.createdAt,
    }];
  },
  analyzeWebsite: async (intake: FounderIntake) => {
    const response = await fetchJson<{ dashboard: BackendDashboard }>("/projects/onboard", {
      method: "POST",
      body: JSON.stringify({
        website_url: intake.websiteUrl,
        business_description: intake.businessDescription,
        icp: intake.icp,
        main_goal: intake.mainGoal,
        key_channel: intake.keyChannel,
        what_tried: intake.whatTried,
        priority_work: intake.priorityWork,
        competitors: intake.competitors,
        bottleneck: intake.bottleneck,
        auth_method: intake.authMethod,
        email: intake.email,
      })
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  addTask: async (input: NewTaskInput) => {
    if (!supportedManualTaskTypeSet.has(input.type)) {
      throw createMutationError(`${input.type.replaceAll("_", " ")} is not supported in this build yet.`);
    }

    await fetchJson<{ task: { id: string } }>(`/projects/${latestState.project.id}/tasks`, {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        description: input.description ?? "",
        type: uiTypeToBackend(input.type),
        impact: input.impact,
        effort: input.effort,
        confidence: input.confidence,
        goal_fit: input.goal_fit,
        dependencies: []
      })
    });
    const dashboardResponse = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/dashboard`);
    return persistAndReturn(mapDashboard(dashboardResponse.dashboard));
  },
  updateTaskStatus: async (taskId: string, status: TaskStatus) => {
    if (status === "waiting_on_founder") {
      throw createMutationError("Move founder-dependent work through approvals or keep it blocked in this build.");
    }

    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/tasks/${taskId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: uiStatusToBackend(status) })
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  executeTask: async (taskId: string, _preference?: ExecutionPreference) => {
    const task = latestState.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw createMutationError("Task not found.");
    }

    if (task.type !== "blog_brief") {
      throw createMutationError("Only blog brief execution is supported in this build.");
    }

    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/tasks/${taskId}/execute`, {
      method: "POST"
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  approveArtifact: async (taskId: string) => {
    const approval = getPendingApprovalForTask(taskId);
    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/approvals/${approval.id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "APPROVED" })
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  rejectArtifact: async (taskId: string, note?: string) => {
    const approval = getPendingApprovalForTask(taskId);
    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/approvals/${approval.id}/decision`, {
      method: "POST",
      body: JSON.stringify({
        decision: "REJECTED",
        note: note?.trim() ? note.trim() : undefined
      })
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  addComment: async (taskId: string, body: string) => {
    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({
        body,
        author: "founder"
      })
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  connectProvider: async (providerId: string, credential?: string) => {
    const provider = latestState.executionProviders.find((item) => item.id === providerId);
    if (!provider) {
      throw createMutationError("Execution provider not found.");
    }

    if (provider.authType === "api_key" && !credential?.trim()) {
      throw createMutationError(`Add an API key before connecting ${provider.name}.`);
    }

    const connectedAt = new Date().toISOString();
    const executionProviders = latestState.executionProviders.map((item) => item.id === providerId
      ? {
        ...item,
        status: "connected" as const,
        maskedSecret: provider.authType === "api_key" ? maskSecret(credential ?? "") : item.maskedSecret,
        connectedAt,
      }
      : item);

    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/configuration`, {
      method: "POST",
      body: JSON.stringify(buildWorkspaceConfigurationPayload({ executionProviders }))
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  activateProvider: async (providerId: string) => {
    const provider = latestState.executionProviders.find((item) => item.id === providerId);
    if (!provider) {
      throw createMutationError("Execution provider not found.");
    }

    if (provider.authType === "api_key" && provider.status !== "connected") {
      throw createMutationError(`Connect ${provider.name} before making it the active provider.`);
    }

    const executionProviders = latestState.executionProviders.map((item) => ({
      ...item,
      isDefault: item.id === providerId,
    }));

    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/configuration`, {
      method: "POST",
      body: JSON.stringify(buildWorkspaceConfigurationPayload({
        executionProviders,
        activeProviderId: providerId,
      }))
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  connectIntegration: async (integrationId: string, credential?: string) => {
    const integration = latestState.integrations.find((item) => item.id === integrationId);
    if (!integration) {
      throw createMutationError("Integration not found.");
    }

    if (integration.authType === "api_key" && !credential?.trim()) {
      throw createMutationError(`Add an API key before connecting ${integration.name}.`);
    }

    const connectedAt = new Date().toISOString();
    const integrations: Integration[] = latestState.integrations.map((current): Integration => current.id === integrationId ? ({
      ...current,
      status: "connected",
      connectedAs: current.authType === "oauth"
        ? latestState.founderSession?.displayName ?? "Founder workspace"
        : `${current.name} workspace`,
      maskedSecret: current.authType === "api_key" ? maskSecret(credential ?? "") : current.maskedSecret,
      connectedAt,
      lastSyncAt: connectedAt,
    }) : current);

    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/configuration`, {
      method: "POST",
      body: JSON.stringify(buildWorkspaceConfigurationPayload({ integrations }))
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  disconnectIntegration: async (integrationId: string) => {
    const integration = latestState.integrations.find((item) => item.id === integrationId);
    if (!integration) {
      throw createMutationError("Integration not found.");
    }

    const integrations: Integration[] = latestState.integrations.map((current): Integration => current.id === integrationId ? ({
      ...current,
      status: (current.authType === "api_key" ? "needs_key" : "planned") as Integration["status"],
      connectedAs: undefined,
      maskedSecret: undefined,
      connectedAt: undefined,
      lastSyncAt: undefined,
    }) : current);

    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/configuration`, {
      method: "POST",
      body: JSON.stringify(buildWorkspaceConfigurationPayload({ integrations }))
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  syncIntegration: async (integrationId: string) => {
    const integration = latestState.integrations.find((item) => item.id === integrationId);
    if (!integration) {
      throw createMutationError("Integration not found.");
    }

    if (integration.status !== "connected") {
      throw createMutationError(`Connect ${integration.name} before running a sync.`);
    }

    const lastSyncAt = new Date().toISOString();
    const integrations = latestState.integrations.map((current) => current.id === integrationId ? ({
      ...current,
      lastSyncAt,
    }) : current);

    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/configuration`, {
      method: "POST",
      body: JSON.stringify(buildWorkspaceConfigurationPayload({ integrations }))
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  }
});
