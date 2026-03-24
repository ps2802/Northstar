import { demoState } from "./mockData";
import type { AppState, Approval, Artifact, NewTaskInput, Task, TaskStatus, TaskType } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : "/api");
const STORAGE_KEY = "founder-os-state";
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
  agent_runs: Array<{
    id: string;
    project_id: string;
    task_id?: string | null;
    status: string;
    summary: string;
    created_at: string;
    updated_at: string;
  }>;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const loadState = (): AppState => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return clone(demoState);
  }

  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return clone(demoState);
  }
};

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

const uiStatusToBackend: Record<TaskStatus, BackendTaskStatus> = {
  inbox: "INBOX",
  evaluating: "EVALUATING",
  planned: "PLANNED",
  in_progress: "IN_PROGRESS",
  waiting_for_approval: "WAITING_FOR_APPROVAL",
  done: "DONE",
  blocked: "BLOCKED"
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

const uiTypeToBackend: Record<TaskType, BackendTaskType> = {
  seo_audit: "SEO_AUDIT",
  keyword_cluster: "KEYWORD_CLUSTER",
  meta_rewrite: "META_REWRITE",
  blog_brief: "BLOG_BRIEF",
  linkedin_post_set: "LINKEDIN_POST_SET",
  x_post_set: "X_POST_SET",
  homepage_copy_suggestion: "HOMEPAGE_COPY_SUGGESTION",
  competitor_scan: "COMPETITOR_SCAN"
};

const mapDashboard = (dashboard: BackendDashboard): AppState => {
  const taskByArtifact = new Map(
    dashboard.tasks
      .filter((task) => task.artifact_id)
      .map((task) => [task.artifact_id as string, task.id])
  );

  const artifacts: Artifact[] = dashboard.artifacts.map((artifact) => ({
    id: artifact.id,
    taskId: taskByArtifact.get(artifact.id) ?? artifact.id,
    type: "blog_brief",
    title: artifact.title,
    content: artifact.content,
    status:
      artifact.status === "APPROVED"
        ? "approved"
        : artifact.status === "REJECTED"
          ? "needs_review"
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

  return {
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
    tasks: dashboard.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      type: backendTypeToUi[task.type],
      source: task.source.toLowerCase() as Task["source"],
      status: backendStatusToUi[task.status],
      impact: task.impact,
      effort: task.effort,
      confidence: task.confidence,
      goal_fit: task.goal_fit,
      priority_score: task.priority_score,
      rationale: task.rationale,
      dependencies: task.dependencies,
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
    })),
    artifacts,
    approvals,
    comments: [],
    agentRuns: dashboard.agent_runs.map((run) => ({
      id: run.id,
      projectId: run.project_id,
      taskId: run.task_id ?? undefined,
      status: run.status === "completed" ? "completed" : run.status === "failed" ? "failed" : "running",
      summary: run.summary,
      startedAt: run.created_at,
      finishedAt: run.updated_at
    }))
  };
};

const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

let latestState: AppState = loadState();

const persistAndReturn = (state: AppState) => {
  latestState = state;
  saveState(state);
  return clone(state);
};

const fallbackApi = {
  getState: async () => persistAndReturn(loadState()),
  analyzeWebsite: async (websiteUrl: string) => {
    const next = clone(demoState);
    next.project.websiteUrl = websiteUrl;
    next.project.name = new URL(websiteUrl).hostname.replace(/^www\./, "");
    next.profile.companyName = next.project.name;
    next.profile.summary = `Demo mode analyzed ${websiteUrl} and seeded a founder-facing board locally because the API is not reachable.`;
    next.snapshot.pages = next.snapshot.pages.map((page, index) => ({
      ...page,
      url: index === 0 ? websiteUrl : `${websiteUrl.replace(/\/$/, "")}/${page.title.toLowerCase()}`
    }));
    return persistAndReturn(next);
  },
  addTask: async (input: NewTaskInput) => {
    const now = new Date().toISOString();
    const task: Task = {
      id: `task_${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      description: input.description,
      type: input.type,
      source: "user",
      status: "inbox",
      impact: input.impact,
      effort: input.effort,
      confidence: input.confidence,
      goal_fit: input.goal_fit,
      priority_score: Number(((input.impact * input.confidence * input.goal_fit) / input.effort).toFixed(2)),
      rationale: "User-added task accepted in fallback mode.",
      dependencies: [],
      owner_type: input.owner_type,
      movement_history: [
        {
          from: null,
          to: "inbox",
          reason: "Founder added this task while the command center was running in fallback mode.",
          at: now
        }
      ],
      created_at: now,
      updated_at: now
    };

    return persistAndReturn({
      ...latestState,
      tasks: [task, ...latestState.tasks]
    });
  },
  updateTaskStatus: async (taskId: string, status: TaskStatus) =>
    persistAndReturn({
      ...latestState,
      tasks: latestState.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const movedAt = new Date().toISOString();
        return {
          ...task,
          status,
          movement_history: [
            ...task.movement_history,
            {
              from: task.status,
              to: status,
              reason: `Task moved to ${status.replaceAll("_", " ")} in fallback mode.`,
              at: movedAt
            }
          ],
          updated_at: movedAt
        };
      })
    }),
  approveArtifact: async (taskId: string) =>
    persistAndReturn({
      ...latestState,
      tasks: latestState.tasks.map((task) => (task.id === taskId ? { ...task, status: "done", updated_at: new Date().toISOString() } : task)),
      approvals: latestState.approvals.map((approval) => (approval.taskId === taskId ? { ...approval, status: "approved", decidedAt: new Date().toISOString() } : approval)),
      artifacts: latestState.artifacts.map((artifact) => (artifact.taskId === taskId ? { ...artifact, status: "approved" } : artifact))
    })
};

const withBackendFallback = async <T,>(action: () => Promise<T>, fallback: () => Promise<T>) => {
  try {
    return await action();
  } catch {
    return fallback();
  }
};

export interface FounderApi {
  getState: () => Promise<AppState>;
  analyzeWebsite: (websiteUrl: string) => Promise<AppState>;
  addTask: (input: NewTaskInput) => Promise<AppState>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<AppState>;
  approveArtifact: (taskId: string) => Promise<AppState>;
}

export const createFounderApi = (): FounderApi => ({
  getState: async () =>
    withBackendFallback(
      async () => {
        const projectResponse = await fetchJson<{ projects: Array<{ id: string }> }>("/projects");
        if (projectResponse.projects.length === 0) {
          return persistAndReturn(loadState());
        }

        const dashboardResponse = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${projectResponse.projects[0].id}/dashboard`);
        return persistAndReturn(mapDashboard(dashboardResponse.dashboard));
      },
      fallbackApi.getState
    ),
  analyzeWebsite: async (websiteUrl: string) =>
    withBackendFallback(
      async () => {
        const response = await fetchJson<{ dashboard: BackendDashboard }>("/projects/onboard", {
          method: "POST",
          body: JSON.stringify({ website_url: websiteUrl })
        });
        return persistAndReturn(mapDashboard(response.dashboard));
      },
      async () => fallbackApi.analyzeWebsite(websiteUrl)
    ),
  addTask: async (input: NewTaskInput) =>
    withBackendFallback(
      async () => {
        await fetchJson<{ task: { id: string } }>(`/projects/${latestState.project.id}/tasks`, {
          method: "POST",
          body: JSON.stringify({
            title: input.title,
            description: input.description,
            type: uiTypeToBackend[input.type],
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
      async () => fallbackApi.addTask(input)
    ),
  updateTaskStatus: async (taskId: string, status: TaskStatus) =>
    withBackendFallback(
      async () => {
        const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/tasks/${taskId}/status`, {
          method: "POST",
          body: JSON.stringify({ status: uiStatusToBackend[status] })
        });
        return persistAndReturn(mapDashboard(response.dashboard));
      },
      async () => fallbackApi.updateTaskStatus(taskId, status)
    ),
  approveArtifact: async (taskId: string) =>
    withBackendFallback(
      async () => {
        const approval = latestState.approvals.find((item) => item.taskId === taskId && item.status === "pending");
        if (!approval) {
          return latestState;
        }

        const response = await fetchJson<{ dashboard: BackendDashboard }>(`/approvals/${approval.id}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision: "APPROVED" })
        });
        return persistAndReturn(mapDashboard(response.dashboard));
      },
      async () => fallbackApi.approveArtifact(taskId)
    )
});
