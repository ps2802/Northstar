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
    }))
  };
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
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
  getState: async () => persistAndReturn(loadState())
};

const createMutationError = (message: string) => new Error(message);

const getPendingApprovalForTask = (taskId: string) => {
  const approval = latestState.approvals.find((item) => item.taskId === taskId && item.status === "pending");
  if (!approval) {
    throw createMutationError("No pending approval was found for this task.");
  }

  return approval;
};

export interface FounderApi {
  getState: () => Promise<AppState>;
  analyzeWebsite: (websiteUrl: string) => Promise<AppState>;
  addTask: (input: NewTaskInput) => Promise<AppState>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<AppState>;
  executeTask: (taskId: string) => Promise<AppState>;
  approveArtifact: (taskId: string) => Promise<AppState>;
  rejectArtifact: (taskId: string, note?: string) => Promise<AppState>;
  addComment: (taskId: string, body: string) => Promise<AppState>;
}

export const createFounderApi = (): FounderApi => ({
  getState: async () => {
    try {
      const projectResponse = await fetchJson<{ projects: Array<{ id: string }> }>("/projects");
      if (projectResponse.projects.length === 0) {
        return persistAndReturn(loadState());
      }

      const dashboardResponse = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${projectResponse.projects[0].id}/dashboard`);
      return persistAndReturn(mapDashboard(dashboardResponse.dashboard));
    } catch {
      return fallbackApi.getState();
    }
  },
  analyzeWebsite: async (websiteUrl: string) => {
    const response = await fetchJson<{ dashboard: BackendDashboard }>("/projects/onboard", {
      method: "POST",
      body: JSON.stringify({ website_url: websiteUrl })
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  addTask: async (input: NewTaskInput) => {
    await fetchJson<{ task: { id: string } }>(`/projects/${latestState.project.id}/tasks`, {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        description: input.description ?? "",
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
  updateTaskStatus: async (taskId: string, status: TaskStatus) => {
    const response = await fetchJson<{ dashboard: BackendDashboard }>(`/projects/${latestState.project.id}/tasks/${taskId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: uiStatusToBackend[status] })
    });
    return persistAndReturn(mapDashboard(response.dashboard));
  },
  executeTask: async (taskId: string) => {
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
  }
});
