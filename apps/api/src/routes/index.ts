import { z } from "zod";
import type { WorkspaceSession } from "@founder-os/types";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";
import { createManualTask, createTaskComment, decideApproval, getDashboard, listProjects, onboardProject, reprioritizeProjectTasks, runTaskExecution, updateTaskStatus, updateWorkspaceConfiguration } from "../services/dashboard.js";
import { createWorkspaceSession, createWorkspaceSessionFromAccess, disconnectIntegrationConnection, getCurrentWorkspaceSession, getFounderIntake, listArtifactRevisions, listExecutionJobs, listIntegrationConnections, listProviderConfigs, requestArtifactRevision, revokeWorkspaceSession, submitArtifactRevision, upsertFounderIntake, upsertIntegrationConnection, upsertProviderConfig } from "../services/platform.js";

const onboardSchema = z.object({
  website_url: z.string().min(3),
  business_description: z.string().trim().optional(),
  icp: z.string().trim().optional(),
  main_goal: z.string().trim().optional(),
  key_channel: z.string().trim().optional(),
  what_tried: z.string().trim().optional(),
  priority_work: z.string().trim().optional(),
  competitors: z.string().trim().optional(),
  bottleneck: z.enum(["traffic", "conversion", "both"]).optional(),
  auth_method: z.enum(["google", "email"]).optional(),
  email: z.string().trim().email()
});

const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().trim().optional(),
  type: z.enum(["SEO_AUDIT", "KEYWORD_CLUSTER", "META_REWRITE", "BLOG_BRIEF", "LINKEDIN_POST_SET", "X_POST_SET", "HOMEPAGE_COPY_SUGGESTION", "COMPETITOR_SCAN"]),
  impact: z.number().min(1).max(10),
  effort: z.number().min(1).max(10),
  confidence: z.number().min(1).max(10),
  goal_fit: z.number().min(1).max(10),
  rationale: z.string().optional(),
  dependencies: z.array(z.string()).optional()
});

const approvalSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
  decided_by: z.string().trim().min(1).optional()
});

const statusSchema = z.object({
  status: z.enum(["INBOX", "EVALUATING", "PLANNED", "IN_PROGRESS", "WAITING_FOR_APPROVAL", "DONE", "BLOCKED"])
});

const commentSchema = z.object({
  body: z.string().trim().min(1),
  author: z.string().trim().min(1).optional()
});

const founderIntakeSchema = z.object({
  founder_name: z.string().trim().min(1).optional(),
  founder_email: z.string().trim().email().optional(),
  business_description: z.string().trim().min(1).optional(),
  goals: z.array(z.string().trim().min(1)).optional(),
  initiatives: z.array(z.string().trim().min(1)).optional(),
  answers: z.record(z.string().trim().min(1), z.string().trim().min(1)).optional()
});

const accessSchema = z.object({
  website_url: z.string().trim().min(3),
  email: z.string().trim().email(),
  name: z.string().trim().min(1).optional(),
  role: z.enum(["FOUNDER", "MEMBER"]).optional(),
  ttl_hours: z.number().int().min(1).max(24 * 90).optional()
});

const providerSchema = z.object({
  label: z.string().trim().min(1).optional(),
  auth_type: z.string().trim().min(1),
  status: z.enum(["NOT_CONFIGURED", "CONFIGURED", "ERROR"]).optional(),
  base_url: z.string().trim().url().optional(),
  default_model: z.string().trim().min(1).optional(),
  scopes: z.array(z.string().trim().min(1)).optional(),
  last_error: z.string().trim().min(1).optional()
});

const connectionSchema = z.object({
  project_id: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
  auth_type: z.string().trim().min(1),
  status: z.enum(["DISCONNECTED", "PENDING", "CONNECTED", "ERROR"]).optional(),
  external_account_id: z.string().trim().min(1).optional(),
  last_error: z.string().trim().min(1).optional()
});

const revisionRequestSchema = z.object({
  instruction: z.string().trim().min(1),
  requested_by: z.string().trim().min(1).optional()
});

const revisionSubmitSchema = z.object({
  content: z.string().trim().min(1),
  change_summary: z.string().trim().min(1).optional(),
  requested_by: z.string().trim().min(1).optional()
});

const configurationSchema = z.object({
  founder_intake: z.object({
    website_url: z.string().min(3),
    business_description: z.string().trim().optional(),
    icp: z.string().trim().optional(),
    main_goal: z.string().trim().optional(),
    key_channel: z.string().trim().optional(),
    what_tried: z.string().trim().optional(),
    priority_work: z.string().trim().optional(),
    competitors: z.string().trim().optional(),
    bottleneck: z.enum(["traffic", "conversion", "both"]).optional(),
    auth_method: z.enum(["google", "email"]).optional(),
    email: z.string().trim().email().optional()
  }).optional(),
  execution_provider: z.object({
    active_provider: z.string().trim().min(1),
    providers: z.array(z.object({
      key: z.string().trim().min(1),
      name: z.string().trim().min(1),
      auth_type: z.enum(["api_key", "cli"]),
      status: z.enum(["connected", "needs_key", "available"]),
      description: z.string().trim().min(1),
      model_hint: z.string().trim().min(1),
      is_default: z.boolean(),
      masked_secret: z.string().trim().optional(),
      connected_at: z.string().trim().optional()
    })).min(1)
  }).optional(),
  integrations: z.array(z.object({
    key: z.string().trim().min(1),
    name: z.string().trim().min(1),
    category: z.enum(["social", "analytics", "support", "productivity", "crm"]),
    auth_type: z.enum(["api_key", "oauth"]),
    status: z.enum(["connected", "needs_key", "planned"]),
    description: z.string().trim().min(1),
    credential_label: z.string().trim().min(1),
    connected_as: z.string().trim().optional(),
    masked_secret: z.string().trim().optional(),
    connected_at: z.string().trim().optional(),
    last_sync_at: z.string().trim().optional()
  })).optional(),
  agent_stack: z.object({
    wrappers: z.array(z.object({
      key: z.enum([
        "communication_identity",
        "compute_execution",
        "browser_web_actions",
        "search_research",
        "memory_knowledge",
        "payments_transactions",
        "saas_api_access",
        "voice_layer"
      ]),
      label: z.string().trim().min(1),
      objective: z.string().trim().min(1),
      selected_vendor_key: z.string().trim().min(1).optional(),
      updated_at: z.string().trim().min(1),
      vendors: z.array(z.object({
        key: z.string().trim().min(1),
        name: z.string().trim().min(1),
        tagline: z.string().trim().min(1),
        url: z.string().trim().url().optional()
      })).min(1)
    })).min(1)
  }).optional()
});

declare module "fastify" {
  interface FastifyRequest {
    workspaceSession?: WorkspaceSession;
  }
}

const PUBLIC_PRODUCT_ROUTES = new Set([
  "/health",
  "/projects/onboard"
]);

const EXECUTABLE_TASK_STATUSES = new Set(["PLANNED", "IN_PROGRESS"]);
const EXECUTABLE_TASK_TYPES = new Set(["BLOG_BRIEF"]);
const MANUAL_LOCKED_TASK_STATUSES = new Set(["WAITING_FOR_APPROVAL", "DONE"]);

const getSessionToken = (request: FastifyRequest) => {
  const tokenHeader = request.headers["x-northstar-session"];
  return typeof tokenHeader === "string" ? tokenHeader : Array.isArray(tokenHeader) ? tokenHeader[0] : undefined;
};

const getWorkspaceSession = (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.workspaceSession) {
    reply.status(401).send({ error: "Authenticated session required" });
    return null;
  }

  return request.workspaceSession;
};

const requireProjectScope = async (projectId: string, workspaceId: string, reply: FastifyReply) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true }
  });

  if (!project) {
    reply.status(404).send({ error: "Project not found" });
    return null;
  }

  if (project.workspaceId !== workspaceId) {
    reply.status(403).send({ error: "Cross-workspace project access denied" });
    return null;
  }

  return project;
};

const requireTaskScope = async (taskId: string, projectId: string, reply: FastifyReply) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      status: true,
      type: true,
      artifactId: true
    }
  });

  if (!task || task.projectId !== projectId) {
    reply.status(404).send({ error: "Project or task not found" });
    return null;
  }

  return task;
};

const requireApprovalScope = async (approvalId: string, workspaceId: string, reply: FastifyReply) => {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    select: {
      id: true,
      status: true,
      project: {
        select: {
          workspaceId: true
        }
      }
    }
  });

  if (!approval) {
    reply.status(404).send({ error: "Approval not found" });
    return null;
  }

  if (approval.project.workspaceId !== workspaceId) {
    reply.status(403).send({ error: "Cross-workspace approval access denied" });
    return null;
  }

  return approval;
};

const requireRevisionScope = async (revisionId: string, workspaceId: string, reply: FastifyReply) => {
  const revision = await prisma.artifactRevision.findUnique({
    where: { id: revisionId },
    select: {
      id: true,
      status: true,
      approvalId: true,
      project: {
        select: {
          workspaceId: true
        }
      }
    }
  });

  if (!revision) {
    reply.status(404).send({ error: "Revision not found" });
    return null;
  }

  if (revision.project.workspaceId !== workspaceId) {
    reply.status(403).send({ error: "Cross-workspace revision access denied" });
    return null;
  }

  return revision;
};

const hasOpenArtifactReview = async (artifactId: string) => {
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

export const registerRoutes = async (app: FastifyInstance) => {
  app.addHook("preHandler", async (request, reply) => {
    if (request.method === "OPTIONS") {
      return;
    }

    const routeUrl = String(request.routeOptions.url ?? "");
    if (PUBLIC_PRODUCT_ROUTES.has(routeUrl)) {
      return;
    }

    const token = getSessionToken(request);
    if (!token) {
      return reply.status(401).send({ error: "Missing x-northstar-session header" });
    }

    const session = await getCurrentWorkspaceSession(token);
    if (!session) {
      return reply.status(401).send({ error: "Session not found" });
    }
    if (session.status !== "ACTIVE") {
      return reply.status(401).send({ error: `Session is ${session.status.toLowerCase()}` });
    }

    request.workspaceSession = session;

    const params = typeof request.params === "object" && request.params ? request.params as Record<string, unknown> : null;
    const workspaceId = params && typeof params.workspaceId === "string" ? params.workspaceId : null;
    if (workspaceId && workspaceId !== session.workspace_id) {
      return reply.status(403).send({ error: "Cross-workspace access denied" });
    }
  });

  app.get("/health", async () => ({ ok: true }));

  app.get("/projects", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    return { projects: await listProjects(session.workspace_id) };
  });

  app.post("/projects/onboard", async (request, reply) => {
    const parsed = onboardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const dashboard = await onboardProject(parsed.data);
    const email = parsed.data.email?.trim().toLowerCase();
    if (!dashboard || !email) {
      return { dashboard };
    }

    const sessionResult = await createWorkspaceSession({
      workspace_id: dashboard.workspace.id,
      project_id: dashboard.project.id,
      email,
      name: email.split("@")[0] || dashboard.project.name
    });

    if (!sessionResult) {
      return { dashboard };
    }

    return {
      dashboard,
      session: sessionResult.session,
      token: sessionResult.token
    };
  });

  app.get("/projects/:projectId/dashboard", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId } = request.params as { projectId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const dashboard = await getDashboard(projectId);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return { dashboard };
  });

  app.post("/projects/:projectId/tasks", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId } = request.params as { projectId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const parsed = taskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const task = await createManualTask(projectId, {
      ...parsed.data,
      description: parsed.data.description ?? "",
      rationale: parsed.data.rationale ?? "",
      source: "USER"
    });
    return { task };
  });

  app.get("/projects/:projectId/intake", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId } = request.params as { projectId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const intake = await getFounderIntake(projectId);
    if (!intake) {
      return reply.status(404).send({ error: "Founder intake not found" });
    }
    return { intake };
  });

  app.put("/projects/:projectId/intake", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId } = request.params as { projectId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const parsed = founderIntakeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const result = await upsertFounderIntake(projectId, parsed.data);
    if (!result) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return result;
  });

  app.post("/projects/:projectId/reprioritize", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId } = request.params as { projectId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const dashboard = await reprioritizeProjectTasks(projectId);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return { dashboard };
  });

  app.post("/projects/:projectId/configuration", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId } = request.params as { projectId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const parsed = configurationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const dashboard = await updateWorkspaceConfiguration(projectId, parsed.data);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return { dashboard };
  });

  app.get("/projects/:projectId/jobs", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId } = request.params as { projectId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    return { jobs: await listExecutionJobs(projectId) };
  });

  app.get("/projects/:projectId/revisions", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId } = request.params as { projectId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const artifactId = typeof request.query === "object" && request.query && "artifact_id" in request.query
      ? String((request.query as Record<string, unknown>).artifact_id)
      : undefined;
    return { revisions: await listArtifactRevisions(projectId, artifactId) };
  });

  app.post("/projects/:projectId/tasks/:taskId/execute", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const task = await requireTaskScope(taskId, projectId, reply);
    if (!task) {
      return;
    }
    if (!EXECUTABLE_TASK_STATUSES.has(task.status)) {
      return reply.status(409).send({ error: "Task execution is only allowed from planned or in-progress state" });
    }
    if (!EXECUTABLE_TASK_TYPES.has(task.type)) {
      return reply.status(409).send({ error: "Task type is not executable in the current flow" });
    }
    if (task.artifactId) {
      return reply.status(409).send({ error: "Task already has an execution artifact; use the approval or revision flow instead" });
    }

    const dashboard = await runTaskExecution(projectId, taskId);
    if (!dashboard) {
      return reply.status(409).send({ error: "Task execution is not allowed in the current state" });
    }
    return { dashboard };
  });

  app.post("/projects/:projectId/tasks/:taskId/status", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const task = await requireTaskScope(taskId, projectId, reply);
    if (!task) {
      return;
    }
    if (MANUAL_LOCKED_TASK_STATUSES.has(task.status)) {
      return reply.status(409).send({ error: "Manual status updates are locked while the task is waiting for approval or already done" });
    }
    if (MANUAL_LOCKED_TASK_STATUSES.has(parsed.data.status)) {
      return reply.status(409).send({ error: "Manual status updates cannot move a task directly into waiting-for-approval or done" });
    }
    if (task.artifactId && await hasOpenArtifactReview(task.artifactId)) {
      return reply.status(409).send({ error: "Manual status updates are locked while artifact review is still open" });
    }

    const dashboard = await updateTaskStatus(projectId, taskId, parsed.data.status);
    if (!dashboard) {
      return reply.status(409).send({ error: "Task status update is not allowed in the current state" });
    }
    return { dashboard };
  });

  app.post("/projects/:projectId/tasks/:taskId/comments", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    if (!await requireProjectScope(projectId, session.workspace_id, reply)) {
      return;
    }

    const parsed = commentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (!await requireTaskScope(taskId, projectId, reply)) {
      return;
    }

    const dashboard = await createTaskComment(projectId, taskId, parsed.data.body, parsed.data.author);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project or task not found" });
    }
    return { dashboard };
  });

  app.post("/approvals/:approvalId/decision", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { approvalId } = request.params as { approvalId: string };
    const approval = await requireApprovalScope(approvalId, session.workspace_id, reply);
    if (!approval) {
      return;
    }

    const parsed = approvalSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    if (approval.status !== "PENDING") {
      return reply.status(409).send({ error: "Only pending approvals can be decided" });
    }

    const dashboard = await decideApproval(approvalId, parsed.data.decision, parsed.data.note, parsed.data.decided_by);
    if (!dashboard) {
      return reply.status(409).send({ error: "Approval decision is not allowed in the current state" });
    }
    return { dashboard };
  });

  app.post("/approvals/:approvalId/revisions", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { approvalId } = request.params as { approvalId: string };
    const approval = await requireApprovalScope(approvalId, session.workspace_id, reply);
    if (!approval) {
      return;
    }

    const parsed = revisionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    if (approval.status !== "PENDING") {
      return reply.status(409).send({ error: "Revision requests can only be created from pending approvals" });
    }

    const result = await requestArtifactRevision(approvalId, parsed.data);
    if (!result) {
      return reply.status(409).send({ error: "Revision request is not allowed in the current state" });
    }
    return result;
  });

  app.post("/revisions/:revisionId/submit", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { revisionId } = request.params as { revisionId: string };
    const revision = await requireRevisionScope(revisionId, session.workspace_id, reply);
    if (!revision) {
      return;
    }

    const parsed = revisionSubmitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    if (revision.status !== "REQUESTED" || revision.approvalId) {
      return reply.status(409).send({ error: "Only requested revisions without an approval can be submitted" });
    }

    const result = await submitArtifactRevision(revisionId, parsed.data);
    if (!result) {
      return reply.status(409).send({ error: "Revision submission is not allowed in the current state" });
    }
    return result;
  });

  app.post("/auth/access", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const parsed = accessSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const result = await createWorkspaceSessionFromAccess(parsed.data);
    if (!result) {
      return reply.status(404).send({ error: "Workspace access was not found for that website and founder email" });
    }
    return result;
  });

  app.get("/auth/session", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }
    return { session };
  });

  app.delete("/auth/session", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const token = getSessionToken(request);
    if (!token) {
      return reply.status(401).send({ error: "Missing x-northstar-session header" });
    }

    const revoked = await revokeWorkspaceSession(token);
    if (!revoked) {
      return reply.status(404).send({ error: "Session not found" });
    }
    return { session: revoked };
  });

  app.get("/workspaces/:workspaceId/providers", async (request, reply) => {
    if (!getWorkspaceSession(request, reply)) {
      return;
    }

    const { workspaceId } = request.params as { workspaceId: string };
    return { providers: await listProviderConfigs(workspaceId) };
  });

  app.put("/workspaces/:workspaceId/providers/:providerKey", async (request, reply) => {
    if (!getWorkspaceSession(request, reply)) {
      return;
    }

    const { workspaceId, providerKey } = request.params as { workspaceId: string; providerKey: string };
    const parsed = providerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const provider = await upsertProviderConfig(workspaceId, providerKey, parsed.data);
    if (!provider) {
      return reply.status(404).send({ error: "Workspace not found" });
    }
    return { provider };
  });

  app.get("/workspaces/:workspaceId/connections", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { workspaceId } = request.params as { workspaceId: string };
    const projectId = typeof request.query === "object" && request.query && "project_id" in request.query
      ? String((request.query as Record<string, unknown>).project_id)
      : undefined;
    if (projectId) {
      return reply.status(400).send({ error: "Project-scoped connections are not supported yet." });
    }
    return { connections: await listIntegrationConnections(workspaceId, projectId) };
  });

  app.put("/workspaces/:workspaceId/connections/:providerKey", async (request, reply) => {
    const session = getWorkspaceSession(request, reply);
    if (!session) {
      return;
    }

    const { workspaceId, providerKey } = request.params as { workspaceId: string; providerKey: string };
    const parsed = connectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    if (parsed.data.project_id) {
      return reply.status(400).send({ error: "Project-scoped connections are not supported yet." });
    }

    const connection = await upsertIntegrationConnection(workspaceId, providerKey, parsed.data);
    if (!connection) {
      return reply.status(404).send({ error: "Workspace or project not found" });
    }
    return { connection };
  });

  app.delete("/workspaces/:workspaceId/connections/:connectionId", async (request, reply) => {
    if (!getWorkspaceSession(request, reply)) {
      return;
    }

    const { workspaceId, connectionId } = request.params as { workspaceId: string; connectionId: string };
    const connection = await disconnectIntegrationConnection(workspaceId, connectionId);
    if (!connection) {
      return reply.status(404).send({ error: "Connection not found" });
    }
    return { connection };
  });
};
