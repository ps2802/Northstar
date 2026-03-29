import { nanoid } from "nanoid";
import { MockFounderExecutor, ProviderBackedBlogBriefExecutor } from "@founder-os/agent-core";
import { ingestWebsite } from "@founder-os/site-ingestion";
import { createTaskFromInput, evaluateTaskForExecution, generateSeedTasks, sortTasksByPriority, transitionTask } from "@founder-os/task-engine";
import type { TaskInput, TaskStatus } from "@founder-os/types";
import { applyFounderContextToTask, buildPlanningContext, mergeFounderFeedback } from "../lib/founder-intake.js";
import { prisma } from "../lib/prisma.js";
import { serializeArtifact, serializeDashboard, serializeFounderIntake, serializeTask } from "../lib/serializers.js";
import { createFallbackIngestion } from "./fallback.js";

const executor = new MockFounderExecutor();
const liveBlogBriefExecutor = new ProviderBackedBlogBriefExecutor();
const DEFAULT_COMMENT_AUTHOR = "founder";
const WORKSPACE_CONFIGURATION_RUN_TYPE = "workspace_configuration";
const EXECUTABLE_TASK_STATUSES = new Set(["PLANNED", "IN_PROGRESS"]);
const EXECUTABLE_TASK_TYPES = new Set(["BLOG_BRIEF"]);
const MANUAL_LOCKED_TASK_STATUSES = new Set(["WAITING_FOR_APPROVAL", "DONE"]);

const createExecutionError = (message: string, status = 409) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
};

type FounderIntakePayload = {
  website_url: string;
  business_description?: string;
  icp?: string;
  main_goal?: string;
  key_channel?: string;
  what_tried?: string;
  priority_work?: string;
  competitors?: string;
  bottleneck?: "traffic" | "conversion" | "both";
  auth_method?: "google" | "email";
  email?: string;
};

type ExecutionProviderConfig = {
  key: string;
  name: string;
  auth_type: "api_key" | "cli";
  status: "connected" | "needs_key" | "available" | "error";
  description: string;
  model_hint: string;
  is_default: boolean;
  masked_secret?: string;
  connected_at?: string;
  last_error?: string;
};

type IntegrationConfig = {
  key: string;
  name: string;
  category: "social" | "analytics" | "support" | "productivity" | "crm";
  auth_type: "api_key" | "oauth";
  status: "connected" | "needs_key" | "planned";
  description: string;
  credential_label: string;
  connected_as?: string;
  masked_secret?: string;
  connected_at?: string;
  last_sync_at?: string;
};

type AgentToolVendorConfig = {
  key: string;
  name: string;
  tagline: string;
  url?: string;
};

type AgentToolWrapperConfig = {
  key:
    | "communication_identity"
    | "compute_execution"
    | "browser_web_actions"
    | "search_research"
    | "memory_knowledge"
    | "payments_transactions"
    | "saas_api_access"
    | "voice_layer";
  label: string;
  objective: string;
  selected_vendor_key?: string;
  updated_at: string;
  vendors: AgentToolVendorConfig[];
};

type WorkspaceConfiguration = {
  founder_intake?: FounderIntakePayload;
  execution_provider: {
    active_provider: string;
    providers: ExecutionProviderConfig[];
  };
  integrations: IntegrationConfig[];
  agent_stack: {
    wrappers: AgentToolWrapperConfig[];
  };
  updated_at: string;
};

const defaultExecutionProviders = (): WorkspaceConfiguration["execution_provider"] => ({
  active_provider: "northstar_cli",
  providers: [
    {
      key: "northstar_cli",
      name: "Northstar CLI",
      auth_type: "cli",
      status: "available",
      description: "Use Northstar against the founder's current local or hosted model setup.",
      model_hint: "Current local or CLI model",
      is_default: true
    },
    {
      key: "openrouter",
      name: "OpenRouter",
      auth_type: "api_key",
      status: "needs_key",
      description: "Generate assets through OpenRouter's OpenAI-compatible execution path.",
      model_hint: "openai/gpt-4.1-mini",
      is_default: false
    },
    {
      key: "openai",
      name: "OpenAI",
      auth_type: "api_key",
      status: "needs_key",
      description: "Generate assets through the direct OpenAI API.",
      model_hint: "gpt-4.1-mini",
      is_default: false
    },
    {
      key: "anthropic",
      name: "Anthropic",
      auth_type: "api_key",
      status: "needs_key",
      description: "Run Northstar generation through Claude models.",
      model_hint: "Claude 4.x",
      is_default: false
    },
    {
      key: "kimi",
      name: "Kimi",
      auth_type: "api_key",
      status: "needs_key",
      description: "Use Kimi when the founder prefers Moonshot's stack.",
      model_hint: "Kimi latest",
      is_default: false
    },
    {
      key: "minimax",
      name: "MiniMax",
      auth_type: "api_key",
      status: "needs_key",
      description: "Use MiniMax for teams standardizing there.",
      model_hint: "MiniMax latest",
      is_default: false
    }
  ]
});

const defaultIntegrations = (): IntegrationConfig[] => [
  {
    key: "google_workspace",
    name: "Google Workspace",
    category: "productivity",
    auth_type: "api_key",
    status: "planned",
    description: "Unlock Gmail, Drive, and shared founder workspace context.",
    credential_label: "Workspace key",
  },
  {
    key: "gmail",
    name: "Gmail",
    category: "productivity",
    auth_type: "api_key",
    status: "needs_key",
    description: "Route email drafts and founder follow-ups into Northstar.",
    credential_label: "Gmail token",
  },
  {
    key: "google_drive",
    name: "Google Drive",
    category: "productivity",
    auth_type: "api_key",
    status: "planned",
    description: "Store approved assets, briefs, and research outputs.",
    credential_label: "Drive token",
  },
  {
    key: "intercom",
    name: "Intercom",
    category: "support",
    auth_type: "api_key",
    status: "needs_key",
    description: "Pull customer language into CRM, research, and GTM work.",
    credential_label: "Intercom token",
  },
  {
    key: "x",
    name: "X",
    category: "social",
    auth_type: "api_key",
    status: "needs_key",
    description: "Prepare social post sets for later publishing and analytics.",
    credential_label: "X API key",
  },
  {
    key: "instagram",
    name: "Instagram",
    category: "social",
    auth_type: "api_key",
    status: "planned",
    description: "Support social asset prep and later creator publishing flows.",
    credential_label: "Instagram token",
  },
  {
    key: "threads",
    name: "Threads",
    category: "social",
    auth_type: "api_key",
    status: "planned",
    description: "Prepare founder-ready shortform variants for Threads.",
    credential_label: "Threads token",
  },
  {
    key: "image_generation",
    name: "Image generation",
    category: "social",
    auth_type: "api_key",
    status: "planned",
    description: "Turn illustration prompts into a usable visual workflow later.",
    credential_label: "Image API key",
  }
];

const defaultAgentToolWrappers = (): AgentToolWrapperConfig[] => [
  {
    key: "communication_identity",
    label: "Communication and identity",
    objective: "Give Northstar email, phone, and messaging rails so agents can operate like a real team.",
    selected_vendor_key: "agentmail",
    updated_at: new Date().toISOString(),
    vendors: [
      { key: "agentmail", name: "AgentMail", tagline: "Agent email accounts" },
      { key: "agentphone", name: "AgentPhone", tagline: "Agent phone numbers" },
      { key: "kapso", name: "Kapso", tagline: "WhatsApp numbers", url: "https://kapso.ai/" },
      { key: "lobstermail", name: "LobsterMail", tagline: "Agent inbox infrastructure", url: "https://lobstermail.ai/" },
      { key: "convos", name: "Convos", tagline: "Conversation rails", url: "https://convos.org/" },
      { key: "esim_dog", name: "eSIM for AI Agents", tagline: "eSIM access", url: "https://esim.dog/ai-agents" }
    ]
  },
  {
    key: "compute_execution",
    label: "Compute and execution",
    objective: "Give Northstar a machine or sandbox to run jobs outside the founder UI.",
    selected_vendor_key: "daytona",
    updated_at: new Date().toISOString(),
    vendors: [
      { key: "daytona", name: "Daytona", tagline: "Managed agent computers" },
      { key: "e2b", name: "E2B", tagline: "Cloud sandboxes" },
      { key: "gooseworks", name: "Gooseworks", tagline: "Agent runtime", url: "https://gooseworks.ai/" },
      { key: "run402", name: "Run402", tagline: "Remote execution runtime", url: "https://run402.com/" },
      { key: "pinchtab", name: "PinchTab", tagline: "Desktop control", url: "https://github.com/pinchtab/pinchtab" }
    ]
  },
  {
    key: "browser_web_actions",
    label: "Browser and web actions",
    objective: "Let Northstar browse, click, and crawl the web with a real action layer.",
    selected_vendor_key: "browserbase",
    updated_at: new Date().toISOString(),
    vendors: [
      { key: "browserbase", name: "Browserbase", tagline: "Hosted browser sessions" },
      { key: "browser_use", name: "Browser Use", tagline: "Browser control library", url: "https://github.com/browser-use/browser-use" },
      { key: "hyperbrowser", name: "Hyperbrowser", tagline: "Browser automation" },
      { key: "firecrawl", name: "Firecrawl", tagline: "Web crawl and scrape" },
      { key: "notte", name: "Notte", tagline: "Browser action workflows", url: "https://www.notte.cc/" }
    ]
  },
  {
    key: "search_research",
    label: "Search and research",
    objective: "Improve company, people, and market search beyond a static site crawl.",
    selected_vendor_key: "exa",
    updated_at: new Date().toISOString(),
    vendors: [
      { key: "exa", name: "Exa", tagline: "Agent-native web search" },
      { key: "sixtyfour", name: "Sixtyfour", tagline: "People and company search" },
      { key: "outstand", name: "Outstand", tagline: "Research workflows", url: "https://www.outstand.so/" },
      { key: "worldbook", name: "Worldbook", tagline: "Research corpus access", url: "https://worldbook.it.com/" }
    ]
  },
  {
    key: "memory_knowledge",
    label: "Memory and knowledge",
    objective: "Persist long-term context for campaigns, research, and founder intent.",
    selected_vendor_key: "mem0",
    updated_at: new Date().toISOString(),
    vendors: [
      { key: "mem0", name: "Mem0", tagline: "Agent memory" },
      { key: "mem9", name: "Mem9", tagline: "Long-term memory", url: "https://mem9.ai/" },
      { key: "supermemory", name: "Supermemory", tagline: "Context retrieval", url: "https://supermemory.ai/" },
      { key: "claude_mem", name: "Claude Mem", tagline: "Open memory layer", url: "https://github.com/thedotmack/claude-mem" },
      { key: "lightrag", name: "LightRAG", tagline: "RAG memory graph", url: "https://github.com/HKUDS/LightRAG" },
      { key: "context_hub", name: "Context Hub", tagline: "Shared context server", url: "https://github.com/andrewyng/context-hub" },
      { key: "airweave", name: "Airweave", tagline: "Context and memory fabric", url: "https://airweave.ai/" }
    ]
  },
  {
    key: "payments_transactions",
    label: "Payments and transactions",
    objective: "Prepare Northstar for trusted agent transactions without billing logic in the core product.",
    selected_vendor_key: "kite",
    updated_at: new Date().toISOString(),
    vendors: [
      { key: "kite", name: "Kite", tagline: "Payments for agents" },
      { key: "sponge", name: "Sponge", tagline: "Transaction rails", url: "https://www.paysponge.com/" }
    ]
  },
  {
    key: "saas_api_access",
    label: "SaaS and API access",
    objective: "Turn saved integrations into a stronger action layer across the founder stack.",
    selected_vendor_key: "composio",
    updated_at: new Date().toISOString(),
    vendors: [
      { key: "composio", name: "Composio", tagline: "SaaS tool access for agents" },
      { key: "orthogonal", name: "Orthogonal", tagline: "API access abstraction" },
      { key: "integuru", name: "Integuru", tagline: "Integration builder", url: "https://www.integuru.ai/" },
      { key: "anakin", name: "Anakin", tagline: "Workflow automation", url: "https://anakin.io/" },
      { key: "communa", name: "Communa", tagline: "API connectors", url: "https://communa.io/" },
      { key: "strata", name: "Strata", tagline: "Agent API platform", url: "https://getstrata.ai/" },
      { key: "overloop_cli", name: "Overloop CLI", tagline: "Outbound automation", url: "https://github.com/sortlist/overloop-cli/" },
      { key: "gstack", name: "GStack", tagline: "Open agent stack", url: "https://github.com/garrytan/gstack" }
    ]
  },
  {
    key: "voice_layer",
    label: "Voice layer",
    objective: "Give Northstar a voice surface for calls and spoken workflows when the product is ready.",
    selected_vendor_key: "elevenlabs",
    updated_at: new Date().toISOString(),
    vendors: [
      { key: "elevenlabs", name: "ElevenLabs", tagline: "Voice generation" },
      { key: "vapi", name: "Vapi", tagline: "Voice workflows" }
    ]
  }
];

const maskSecret = (value: string) => {
  const normalized = value.trim();
  if (normalized.length <= 8) {
    return normalized ? `${normalized.slice(0, 2)}***` : undefined;
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
};

const buildWorkspaceConfiguration = (_websiteUrl: string, intake?: FounderIntakePayload): WorkspaceConfiguration => {
  const now = new Date().toISOString();
  return {
    founder_intake: intake,
    execution_provider: defaultExecutionProviders(),
    integrations: defaultIntegrations(),
    agent_stack: {
      wrappers: defaultAgentToolWrappers()
    },
    updated_at: now
  };
};

const parseWorkspaceConfiguration = (value: string | null | undefined): WorkspaceConfiguration | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as WorkspaceConfiguration;
  } catch {
    return null;
  }
};

const toUiProviderStatus = (status: "NOT_CONFIGURED" | "CONFIGURED" | "ERROR", authType: "api_key" | "cli") => {
  if (authType === "cli") {
    return "available" as const;
  }

  if (status === "CONFIGURED") {
    return "connected" as const;
  }

  if (status === "ERROR") {
    return "error" as const;
  }

  return "needs_key" as const;
};

const withPersistedProviderTruth = async (projectId: string, config: WorkspaceConfiguration | null): Promise<WorkspaceConfiguration | null> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true }
  });

  if (!project) {
    return config;
  }

  const providerRecords = await prisma.executionProviderConfig.findMany({
    where: { workspaceId: project.workspaceId },
    orderBy: { updatedAt: "desc" }
  });

  if (!providerRecords.length) {
    return config;
  }

  const baseline = config ?? buildWorkspaceConfiguration("https://northstar.local");
  return {
    ...baseline,
    execution_provider: {
      ...baseline.execution_provider,
      providers: baseline.execution_provider.providers.map((provider) => {
        const record = providerRecords.find((item) => item.providerKey === provider.key);
        if (!record) {
          return provider;
        }

        const storedConfig = record.configJson ? JSON.parse(record.configJson) as { api_key?: string } : {};
        return {
          ...provider,
          name: record.label,
          auth_type: record.authType as "api_key" | "cli",
          status: toUiProviderStatus(record.status, record.authType as "api_key" | "cli"),
          model_hint: record.defaultModel ?? provider.model_hint,
          masked_secret: storedConfig.api_key ? maskSecret(storedConfig.api_key) : provider.masked_secret,
          connected_at: record.lastValidatedAt?.toISOString() ?? provider.connected_at,
          last_error: record.lastError ?? undefined,
          is_default: provider.key === baseline.execution_provider.active_provider
        };
      })
    }
  };
};

const getWorkspaceConfiguration = async (projectId: string): Promise<WorkspaceConfiguration | null> => {
  const latest = await prisma.agentRun.findFirst({
    where: {
      projectId,
      runType: WORKSPACE_CONFIGURATION_RUN_TYPE
    },
    orderBy: { createdAt: "desc" }
  });

  return withPersistedProviderTruth(projectId, parseWorkspaceConfiguration(latest?.outputJson));
};

const createWorkspaceConfigurationRun = async (projectId: string, config: WorkspaceConfiguration, summary: string) => {
  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      runType: WORKSPACE_CONFIGURATION_RUN_TYPE,
      status: "completed",
      summary,
      outputJson: JSON.stringify(config)
    }
  });
};

const normalizeWorkspaceConfiguration = (projectId: string, current: WorkspaceConfiguration | null, patch: Partial<WorkspaceConfiguration>): WorkspaceConfiguration => {
  const baseline = current ?? buildWorkspaceConfiguration("https://northstar.local");
  const providers = patch.execution_provider?.providers ?? baseline.execution_provider.providers;
  const activeProvider = patch.execution_provider?.active_provider ?? baseline.execution_provider.active_provider;

  return {
    founder_intake: patch.founder_intake ?? baseline.founder_intake,
    execution_provider: {
      active_provider: activeProvider,
      providers: providers.map((provider) => ({
        ...provider,
        is_default: provider.key === activeProvider
      }))
    },
    integrations: patch.integrations ?? baseline.integrations,
    agent_stack: patch.agent_stack ?? baseline.agent_stack,
    updated_at: new Date().toISOString()
  };
};

const buildExecutionCompanySummary = (summary: string, founderPlanningContext?: string | null) =>
  founderPlanningContext ? `${summary}\n\nFounder context:\n${founderPlanningContext}` : summary;

const hasOpenReviewState = async (artifactId: string) => {
  const [pendingApproval, openRevision] = await Promise.all([
    prisma.approval.findFirst({
      where: {
        artifactId,
        status: "PENDING"
      },
      select: { id: true }
    }),
    prisma.artifactRevision.findFirst({
      where: {
        artifactId,
        status: {
          in: ["REQUESTED", "SUBMITTED"]
        }
      },
      select: { id: true }
    })
  ]);

  return Boolean(pendingApproval || openRevision);
};

const loadDashboardRecord = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: true,
      websiteSnapshot: true,
      companyProfile: true,
      tasks: { orderBy: { priorityScore: "desc" } },
      artifacts: { orderBy: { updatedAt: "desc" } },
      approvals: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "asc" } },
      agentRuns: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!project || !project.websiteSnapshot || !project.companyProfile) {
    return null;
  }

  return serializeDashboard({
    workspace: project.workspace,
    project,
    websiteSnapshot: project.websiteSnapshot,
    companyProfile: project.companyProfile,
    tasks: project.tasks,
    artifacts: project.artifacts,
    approvals: project.approvals,
    comments: project.comments,
    agentRuns: project.agentRuns
  });
};

const refreshFounderContextOnTasks = async (projectId: string, founderIntakeId?: string | null) => {
  const intakeRecord = founderIntakeId
    ? await prisma.founderIntake.findUnique({ where: { id: founderIntakeId } })
    : await prisma.founderIntake.findUnique({ where: { projectId } });
  if (!intakeRecord) {
    return false;
  }

  const serializedIntake = serializeFounderIntake(intakeRecord);
  const tasks = await prisma.task.findMany({ where: { projectId } });
  for (const task of tasks) {
    await upsertTaskRecord(projectId, applyFounderContextToTask(serializeTask(task), serializedIntake));
  }

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      runType: "founder_feedback_refresh",
      status: "completed",
      summary: "Updated task priority context using the latest founder feedback.",
      outputJson: JSON.stringify({
        task_count: tasks.length,
        founder_intake_id: serializedIntake.id
      })
    }
  });

  return true;
};

export const recordFounderFeedback = async (projectId: string, feedback: string, source: "comment" | "approval_rejection" | "revision_request") => {
  const note = feedback.trim();
  if (note.length < 8) {
    return false;
  }

  const founderIntake = await prisma.founderIntake.findUnique({ where: { projectId } });
  if (!founderIntake) {
    return false;
  }

  const mergedInput = mergeFounderFeedback(serializeFounderIntake(founderIntake), note);
  const nextAnswersJson = JSON.stringify(mergedInput.answers);
  const nextPlanningContext = buildPlanningContext(mergedInput) || null;

  if (nextAnswersJson === founderIntake.answersJson && nextPlanningContext === founderIntake.planningContext) {
    return false;
  }

  const updatedIntake = await prisma.founderIntake.update({
    where: { id: founderIntake.id },
    data: {
      answersJson: nextAnswersJson,
      planningContext: nextPlanningContext,
      lastSubmittedAt: new Date()
    }
  });

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      runType: "founder_feedback",
      status: "completed",
      summary: `Captured founder feedback from ${source.replaceAll("_", " ")} and updated the learning context.`,
      outputJson: JSON.stringify({
        source,
        founder_intake_id: updatedIntake.id,
        latest_note: note
      })
    }
  });

  await refreshFounderContextOnTasks(projectId, updatedIntake.id);
  return true;
};

export const upsertTaskRecord = async (projectId: string, task: ReturnType<typeof serializeTask>) => {
  await prisma.task.upsert({
    where: { id: task.id },
    update: {
      title: task.title,
      description: task.description,
      type: task.type,
      source: task.source,
      status: task.status,
      impact: task.impact,
      effort: task.effort,
      confidence: task.confidence,
      goalFit: task.goal_fit,
      priorityScore: task.priority_score,
      priorityContextBoost: task.context_boost ?? 0,
      rationale: task.rationale,
      dependencies: JSON.stringify(task.dependencies),
      ownerType: task.owner_type,
      movementLogJson: JSON.stringify(task.movement_history),
      artifactId: task.artifact_id,
      updatedAt: new Date(task.updated_at)
    },
    create: {
      id: task.id,
      projectId,
      title: task.title,
      description: task.description,
      type: task.type,
      source: task.source,
      status: task.status,
      impact: task.impact,
      effort: task.effort,
      confidence: task.confidence,
      goalFit: task.goal_fit,
      priorityScore: task.priority_score,
      priorityContextBoost: task.context_boost ?? 0,
      rationale: task.rationale,
      dependencies: JSON.stringify(task.dependencies),
      ownerType: task.owner_type,
      movementLogJson: JSON.stringify(task.movement_history),
      artifactId: task.artifact_id,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at)
    }
  });
};

const createCommentRecord = async (projectId: string, taskId: string, body: string, author = DEFAULT_COMMENT_AUTHOR) => (
  prisma.comment.create({
    data: {
      id: nanoid(),
      projectId,
      taskId,
      body: body.trim(),
      author: author.trim() || DEFAULT_COMMENT_AUTHOR
    }
  })
);

export const onboardProject = async (input: FounderIntakePayload | string) => {
  // TODO(v2): Reuse or version project snapshots instead of creating a new workspace for every onboarding run.
  const intake = typeof input === "string" ? { website_url: input } : input;
  const enrichedWebsiteUrl = intake.website_url;
  const ingestion = await ingestWebsite(enrichedWebsiteUrl).catch(() => createFallbackIngestion(enrichedWebsiteUrl));
  const enrichedSummary = intake.business_description?.trim() || ingestion.company_summary;
  const enrichedIcp = intake.icp?.trim() || ingestion.guessed_icp;
  const enrichedOpportunities = [
    intake.main_goal?.trim() ? `Main goal: ${intake.main_goal.trim()}` : null,
    intake.priority_work?.trim() ? `Founder priority: ${intake.priority_work.trim()}` : null,
    intake.key_channel?.trim() ? `Primary channel: ${intake.key_channel.trim()}` : null,
    intake.what_tried?.trim() ? `Already tried: ${intake.what_tried.trim()}` : null,
    intake.competitors?.trim() ? `Competitors or alternatives: ${intake.competitors.trim()}` : null,
    intake.bottleneck ? `Current bottleneck: ${intake.bottleneck}` : null,
    ...ingestion.opportunities
  ].filter((item): item is string => Boolean(item));
  const enrichedIngestion = {
    ...ingestion,
    company_summary: enrichedSummary,
    guessed_icp: enrichedIcp,
    opportunities: enrichedOpportunities
  };
  const workspaceId = nanoid();
  const projectId = nanoid();
  const snapshotId = nanoid();
  const profileId = nanoid();
  const founderIntakeInput = {
    founder_name: intake.email?.trim() ? intake.email.trim().split("@")[0] : undefined,
    founder_email: intake.email?.trim() || undefined,
    business_description: intake.business_description?.trim() || undefined,
    goals: intake.main_goal?.trim() ? [intake.main_goal.trim()] : [],
    initiatives: [intake.priority_work?.trim(), intake.key_channel?.trim()].filter((value): value is string => Boolean(value)),
    answers: Object.fromEntries(
      [
        ["what_tried", intake.what_tried?.trim()],
        ["competitors", intake.competitors?.trim()],
        ["bottleneck", intake.bottleneck?.trim()],
        ["preferred_auth", intake.auth_method?.trim()]
      ].filter((entry): entry is [string, string] => Boolean(entry[1]))
    )
  };
  const founderPlanningContext = buildPlanningContext(founderIntakeInput) || null;

  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: `${new URL(ingestion.website_url).hostname} workspace`,
      description: intake.main_goal?.trim() || "Founder operating system demo workspace",
      projects: {
        create: {
          id: projectId,
          websiteUrl: ingestion.website_url,
          name: ingestion.homepage_title,
          websiteSnapshot: {
            create: {
              id: snapshotId,
              websiteUrl: ingestion.website_url,
              homepageTitle: ingestion.homepage_title,
              crawledPagesJson: JSON.stringify(ingestion.crawled_pages),
              summary: ingestion.company_summary
            }
          },
          companyProfile: {
            create: {
              id: profileId,
              companySummary: enrichedSummary,
              guessedICP: enrichedIcp,
              keyPagesJson: JSON.stringify(ingestion.key_pages),
              opportunitiesJson: JSON.stringify(enrichedOpportunities)
            }
          }
        }
      }
    }
  });

  const founderIntake = founderPlanningContext || founderIntakeInput.founder_email || founderIntakeInput.business_description
    ? await prisma.founderIntake.create({
        data: {
          id: nanoid(),
          projectId,
          founderName: founderIntakeInput.founder_name ?? null,
          founderEmail: founderIntakeInput.founder_email ?? null,
          businessDescription: founderIntakeInput.business_description ?? null,
          currentGoalsJson: JSON.stringify(founderIntakeInput.goals),
          initiativesJson: JSON.stringify(founderIntakeInput.initiatives),
          answersJson: JSON.stringify(founderIntakeInput.answers),
          planningContext: founderPlanningContext,
          lastSubmittedAt: new Date()
        }
      })
    : null;

  const seedTasks = generateSeedTasks(projectId, enrichedIngestion).map((task) =>
    founderIntake ? applyFounderContextToTask(task, serializeFounderIntake(founderIntake)) : task
  );
  for (const task of seedTasks) {
    await upsertTaskRecord(projectId, task);
  }

  await createWorkspaceConfigurationRun(
    projectId,
    buildWorkspaceConfiguration(ingestion.website_url, intake),
    "Captured founder setup, execution providers, and initial integrations."
  );

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      runType: "site_ingestion",
      status: "completed",
      summary: founderIntake
        ? "Crawled the site, saved founder intake, and generated the first backlog."
        : "Crawled the site, summarized the company, and generated the first backlog.",
      outputJson: JSON.stringify({
        key_pages: ingestion.key_pages,
        opportunities: ingestion.opportunities,
        founder_goals: founderIntakeInput.goals
      })
    }
  });

  return loadDashboardRecord(projectId);
};

export const getDashboard = async (projectId: string) => {
  return loadDashboardRecord(projectId);
};

export const listProjects = async (workspaceId: string) => {
  return prisma.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  });
};

export const updateWorkspaceConfiguration = async (projectId: string, patch: Partial<WorkspaceConfiguration>) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return null;
  }

  const current = await getWorkspaceConfiguration(projectId);
  const next = normalizeWorkspaceConfiguration(projectId, current, patch);
  await createWorkspaceConfigurationRun(projectId, next, "Updated founder setup, provider settings, or integration connections.");
  return loadDashboardRecord(projectId);
};

export const createManualTask = async (projectId: string, input: TaskInput) => {
  const founderIntake = await prisma.founderIntake.findUnique({ where: { projectId } });
  const task = createTaskFromInput(projectId, {
    ...input,
    description: input.description ?? "",
    rationale: input.rationale ?? "",
    source: "USER",
    owner_type: input.owner_type ?? "USER"
  });
  const founderAwareTask = founderIntake ? applyFounderContextToTask(task, serializeFounderIntake(founderIntake)) : task;
  const evaluation = evaluateTaskForExecution(founderAwareTask);
  const evaluatedTask = transitionTask(founderAwareTask, evaluation.recommended_status, `Founder-agent evaluation: ${evaluation.summary}`);
  await upsertTaskRecord(projectId, evaluatedTask);

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      taskId: evaluatedTask.id,
      runType: "task_evaluation",
      status: "completed",
      summary: `Evaluated manual task and assigned status ${evaluatedTask.status}.`,
      outputJson: JSON.stringify({ priority_score: evaluatedTask.priority_score, rationale: evaluatedTask.rationale })
    }
  });

  return serializeTask((await prisma.task.findUniqueOrThrow({ where: { id: evaluatedTask.id } })));
};

export const createTaskComment = async (projectId: string, taskId: string, body: string, author = DEFAULT_COMMENT_AUTHOR) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.projectId !== projectId) {
    return null;
  }

  await createCommentRecord(projectId, taskId, body, author);
  await recordFounderFeedback(projectId, body, "comment");

  return loadDashboardRecord(projectId);
};

export const reprioritizeProjectTasks = async (projectId: string) => {
  const founderIntake = await prisma.founderIntake.findUnique({ where: { projectId } });
  const records = await prisma.task.findMany({ where: { projectId } });
  const serialized = sortTasksByPriority(
    records.map((record) => founderIntake ? applyFounderContextToTask(serializeTask(record), serializeFounderIntake(founderIntake)) : serializeTask(record))
  );

  for (const [index, task] of serialized.entries()) {
    const nextStatus = index === 0 && task.status === "INBOX"
      ? transitionTask(task, "EVALUATING", "Promoted during reprioritization because it is the highest-leverage inbox task.")
      : task;
    await upsertTaskRecord(projectId, nextStatus);
  }

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      runType: "reprioritize",
      status: "completed",
      summary: "Re-ranked the task board based on updated priority scores.",
      outputJson: JSON.stringify({ task_count: serialized.length })
    }
  });

  return loadDashboardRecord(projectId);
};

export const updateTaskStatus = async (projectId: string, taskId: string, status: TaskStatus) => {
  const record = await prisma.task.findUnique({ where: { id: taskId } });
  if (!record || record.projectId !== projectId) {
    return null;
  }
  if (MANUAL_LOCKED_TASK_STATUSES.has(record.status) || MANUAL_LOCKED_TASK_STATUSES.has(status)) {
    return null;
  }
  if (record.artifactId && await hasOpenReviewState(record.artifactId)) {
    return null;
  }

  const nextTask = transitionTask(serializeTask(record), status, `Task moved to ${status.replaceAll("_", " ").toLowerCase()} from the command center.`);
  await upsertTaskRecord(projectId, nextTask);

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      taskId,
      runType: "status_transition",
      status: "completed",
      summary: `Moved task into ${status}.`,
      outputJson: JSON.stringify({ status })
    }
  });

  return loadDashboardRecord(projectId);
};

export const runTaskExecution = async (projectId: string, taskId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { companyProfile: true, founderIntake: true }
  });
  const taskRecord = await prisma.task.findUnique({ where: { id: taskId } });

  if (!project || !project.companyProfile || !taskRecord || taskRecord.projectId !== projectId) {
    return null;
  }
  if (!EXECUTABLE_TASK_STATUSES.has(taskRecord.status) || !EXECUTABLE_TASK_TYPES.has(taskRecord.type) || taskRecord.artifactId) {
    return null;
  }
  const configuration = await getWorkspaceConfiguration(projectId);
  const persistedProviders = await prisma.executionProviderConfig.findMany({
    where: { workspaceId: project.workspaceId },
    orderBy: { updatedAt: "desc" }
  });
  const activeProviderKey = configuration?.execution_provider.active_provider ?? "northstar_cli";
  const providerRecord = persistedProviders.find((provider) => provider.providerKey === activeProviderKey && provider.status === "CONFIGURED") ?? null;
  if (!providerRecord) {
    throw createExecutionError("No real execution provider is configured for this workspace. Save a provider key before running a blog brief.", 409);
  }
  if (!["openai", "openrouter"].includes(providerRecord.providerKey)) {
    throw createExecutionError(`${providerRecord.label} is not supported for live blog brief execution yet. Use OpenRouter or OpenAI.`, 409);
  }
  const providerConfig = providerRecord.configJson ? JSON.parse(providerRecord.configJson) as { api_key?: string } : {};
  if (!providerConfig.api_key?.trim()) {
    throw createExecutionError(`${providerRecord.label} is selected, but no API key is stored for this workspace.`, 409);
  }

  const activeProvider = {
    key: providerRecord.providerKey,
    name: providerRecord.label,
    is_default: providerRecord.providerKey === activeProviderKey
  };
  const executionJob = await prisma.executionJob.create({
    data: {
      id: nanoid(),
      projectId,
      taskId,
      runType: "task_execution",
      queueName: "default",
      providerConfigId: providerRecord.id,
      status: "QUEUED",
      inputJson: JSON.stringify({
        task_id: taskId,
        task_type: taskRecord.type,
        provider_key: activeProvider.key
      })
    }
  });
  await prisma.executionJob.update({
    where: { id: executionJob.id },
    data: {
      status: "RUNNING",
      attemptCount: { increment: 1 },
      startedAt: new Date()
    }
  });
  const latestFounderComment = await prisma.comment.findFirst({
    where: { projectId, taskId, author: DEFAULT_COMMENT_AUTHOR },
    orderBy: { createdAt: "desc" }
  });
  const latestRejectedApproval = taskRecord.artifactId
    ? await prisma.approval.findFirst({
      where: {
        projectId,
        artifactId: taskRecord.artifactId,
        status: "REJECTED"
      },
      orderBy: { updatedAt: "desc" }
    })
    : null;

  let execution;
  try {
    execution = await liveBlogBriefExecutor.run(
      serializeTask(taskRecord),
      buildExecutionCompanySummary(
        project.companyProfile.companySummary,
        [
          project.founderIntake?.planningContext,
          latestRejectedApproval?.decisionNote ?? latestFounderComment?.body
            ? `Revision note: ${latestRejectedApproval?.decisionNote ?? latestFounderComment?.body}`
            : null
        ].filter((value): value is string => Boolean(value)).join("\n")
      ),
      project.companyProfile.guessedICP,
      {
        providerKey: providerRecord.providerKey === "openrouter" ? "openrouter" : "openai",
        providerLabel: activeProvider.name,
        apiKey: providerConfig.api_key.trim(),
        model: providerRecord.defaultModel ?? (providerRecord.providerKey === "openrouter" ? "openai/gpt-4.1-mini" : "gpt-4.1-mini"),
        baseUrl: providerRecord.baseUrl ?? (providerRecord.providerKey === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1"),
        revisionNote: latestRejectedApproval?.decisionNote ?? latestFounderComment?.body ?? undefined,
      }
    );
  } catch (error) {
    await prisma.executionJob.update({
      where: { id: executionJob.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Execution failed",
        completedAt: new Date()
      }
    });
    throw createExecutionError(error instanceof Error ? error.message : "Execution failed", 502);
  }
  const artifact = execution.artifact?.type === "BLOG_BRIEF" ? execution.artifact : null;
  let approvalId: string | null = null;

  if (artifact) {
    await prisma.artifact.upsert({
      where: { id: artifact.id },
      update: {
        title: artifact.title,
        content: artifact.content,
        status: artifact.status,
        updatedAt: new Date(artifact.updated_at)
      },
      create: {
        id: artifact.id,
        projectId,
        type: artifact.type,
        title: artifact.title,
        content: artifact.content,
        status: artifact.status
      }
    });

    const approval = await prisma.approval.create({
      data: {
        id: nanoid(),
        projectId,
        artifactId: artifact.id,
        status: "PENDING",
        requestedBy: "founder-agent"
      }
    });
    approvalId = approval.id;
  }

  await upsertTaskRecord(
    projectId,
    project.founderIntake ? applyFounderContextToTask(execution.nextTask, serializeFounderIntake(project.founderIntake)) : execution.nextTask
  );
  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      taskId,
      runType: "execution",
      status: "completed",
      summary: artifact
        ? `Generated ${taskRecord.type.toLowerCase().replaceAll("_", " ")} through ${activeProvider.name} and routed it for approval.`
        : "Execution blocked because task type is not supported in v1.",
      outputJson: artifact ? JSON.stringify(serializeArtifact(await prisma.artifact.findUniqueOrThrow({ where: { id: artifact.id } }))) : null
    }
  });

  await prisma.executionJob.update({
    where: { id: executionJob.id },
    data: {
      status: "COMPLETED",
      artifactId: artifact?.id ?? null,
      outputJson: JSON.stringify({
        artifact_id: artifact?.id ?? null,
        approval_id: approvalId,
        next_status: execution.nextTask.status
      }),
      completedAt: new Date()
    }
  });

  return loadDashboardRecord(projectId);
};

export const decideApproval = async (approvalId: string, decision: "APPROVED" | "REJECTED", note?: string, decidedBy = DEFAULT_COMMENT_AUTHOR) => {
  const normalizedNote = note?.trim();
  const currentApproval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: {
      project: true,
      artifact: true,
      revision: true
    }
  });
  if (!currentApproval || currentApproval.status !== "PENDING") {
    return null;
  }

  const latestPendingApproval = await prisma.approval.findFirst({
    where: {
      artifactId: currentApproval.artifactId,
      status: "PENDING"
    },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  if (!latestPendingApproval || latestPendingApproval.id !== approvalId) {
    return null;
  }

  const approval = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: decision,
      decisionNote: normalizedNote,
      decidedBy,
      decidedAt: new Date(),
      artifact: {
        update: {
          status: decision === "APPROVED" ? "APPROVED" : "REJECTED"
        }
      }
    },
    include: {
      project: true,
      artifact: true,
      revision: true
    }
  });

  const linkedTask = await prisma.task.findFirst({ where: { artifactId: approval.artifactId } });
  if (linkedTask) {
    const nextTask = decision === "APPROVED"
      ? transitionTask(serializeTask(linkedTask), "DONE", "Founder approved the generated artifact.")
      : transitionTask(serializeTask(linkedTask), "BLOCKED", "Founder rejected the artifact and requested revisions.");
    await upsertTaskRecord(linkedTask.projectId, nextTask);

    if (decision === "REJECTED" && normalizedNote) {
      await createCommentRecord(linkedTask.projectId, linkedTask.id, normalizedNote);
      await recordFounderFeedback(linkedTask.projectId, normalizedNote, "approval_rejection");
    }
  }

  if (approval.revision) {
    await prisma.artifactRevision.update({
      where: { id: approval.revision.id },
      data: {
        status: decision === "APPROVED" ? "APPROVED" : "REJECTED",
        resolvedAt: new Date()
      }
    });
  } else if (decision === "REJECTED" && normalizedNote) {
    await prisma.artifactRevision.create({
      data: {
        id: nanoid(),
        projectId: approval.projectId,
        artifactId: approval.artifactId,
        requestedBy: decidedBy,
        status: "REQUESTED",
        instruction: normalizedNote
      }
    });
  }

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId: approval.projectId,
      taskId: linkedTask?.id,
      runType: "approval_decision",
      status: "completed",
      summary: `Artifact ${decision.toLowerCase()} by the founder.`,
      outputJson: JSON.stringify({ approval_id: approvalId, decision, note: normalizedNote })
    }
  });

  return loadDashboardRecord(approval.projectId);
};
