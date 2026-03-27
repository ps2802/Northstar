import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { createManualTask, createTaskComment, decideApproval, getDashboard, listProjects, onboardProject, reprioritizeProjectTasks, runTaskExecution, updateTaskStatus, updateWorkspaceConfiguration } from "../services/dashboard.js";
import { createWorkspaceSession, disconnectIntegrationConnection, getCurrentWorkspaceSession, getFounderIntake, listArtifactRevisions, listExecutionJobs, listIntegrationConnections, listProviderConfigs, requestArtifactRevision, revokeWorkspaceSession, submitArtifactRevision, upsertFounderIntake, upsertIntegrationConnection, upsertProviderConfig } from "../services/platform.js";

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
  email: z.string().trim().email().optional()
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

const sessionSchema = z.object({
  workspace_id: z.string().trim().min(1).optional(),
  project_id: z.string().trim().min(1).optional(),
  email: z.string().trim().email(),
  name: z.string().trim().min(1),
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
  config: z.record(z.string(), z.unknown()).optional(),
  last_error: z.string().trim().min(1).optional()
});

const connectionSchema = z.object({
  project_id: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
  auth_type: z.string().trim().min(1),
  status: z.enum(["DISCONNECTED", "PENDING", "CONNECTED", "ERROR"]).optional(),
  external_account_id: z.string().trim().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sync_state: z.record(z.string(), z.unknown()).optional(),
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
  founder_session: z.object({
    auth_method: z.enum(["google", "email"]),
    email: z.string().trim().email().optional(),
    status: z.enum(["connected", "pending"]),
    display_name: z.string().trim().min(1)
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
  })).optional()
});

export const registerRoutes = async (app: FastifyInstance) => {
  app.get("/health", async () => ({ ok: true }));

  app.get("/projects", async () => ({ projects: await listProjects() }));

  app.post("/projects/onboard", async (request, reply) => {
    const parsed = onboardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const dashboard = await onboardProject(parsed.data);
    return { dashboard };
  });

  app.get("/projects/:projectId/dashboard", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const dashboard = await getDashboard(projectId);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return { dashboard };
  });

  app.post("/projects/:projectId/tasks", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
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
    const { projectId } = request.params as { projectId: string };
    const intake = await getFounderIntake(projectId);
    if (!intake) {
      return reply.status(404).send({ error: "Founder intake not found" });
    }
    return { intake };
  });

  app.put("/projects/:projectId/intake", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
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
    const { projectId } = request.params as { projectId: string };
    const dashboard = await reprioritizeProjectTasks(projectId);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return { dashboard };
  });

  app.post("/projects/:projectId/configuration", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
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

  app.get("/projects/:projectId/jobs", async (request) => {
    const { projectId } = request.params as { projectId: string };
    return { jobs: await listExecutionJobs(projectId) };
  });

  app.get("/projects/:projectId/revisions", async (request) => {
    const { projectId } = request.params as { projectId: string };
    const artifactId = typeof request.query === "object" && request.query && "artifact_id" in request.query
      ? String((request.query as Record<string, unknown>).artifact_id)
      : undefined;
    return { revisions: await listArtifactRevisions(projectId, artifactId) };
  });

  app.post("/projects/:projectId/tasks/:taskId/execute", async (request, reply) => {
    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    const dashboard = await runTaskExecution(projectId, taskId);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project or task not found" });
    }
    return { dashboard };
  });

  app.post("/projects/:projectId/tasks/:taskId/status", async (request, reply) => {
    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const dashboard = await updateTaskStatus(projectId, taskId, parsed.data.status);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project or task not found" });
    }
    return { dashboard };
  });

  app.post("/projects/:projectId/tasks/:taskId/comments", async (request, reply) => {
    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    const parsed = commentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const dashboard = await createTaskComment(projectId, taskId, parsed.data.body, parsed.data.author);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project or task not found" });
    }
    return { dashboard };
  });

  app.post("/approvals/:approvalId/decision", async (request, reply) => {
    const { approvalId } = request.params as { approvalId: string };
    const parsed = approvalSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const dashboard = await decideApproval(approvalId, parsed.data.decision, parsed.data.note, parsed.data.decided_by);
    if (!dashboard) {
      return reply.status(404).send({ error: "Approval not found" });
    }
    return { dashboard };
  });

  app.post("/approvals/:approvalId/revisions", async (request, reply) => {
    const { approvalId } = request.params as { approvalId: string };
    const parsed = revisionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const result = await requestArtifactRevision(approvalId, parsed.data);
    if (!result) {
      return reply.status(404).send({ error: "Approval not found" });
    }
    return result;
  });

  app.post("/revisions/:revisionId/submit", async (request, reply) => {
    const { revisionId } = request.params as { revisionId: string };
    const parsed = revisionSubmitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const result = await submitArtifactRevision(revisionId, parsed.data);
    if (!result) {
      return reply.status(404).send({ error: "Revision not found" });
    }
    return result;
  });

  app.post("/auth/sessions", async (request, reply) => {
    const parsed = sessionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const result = await createWorkspaceSession(parsed.data);
    if (!result) {
      return reply.status(404).send({ error: "Workspace or project not found" });
    }
    return result;
  });

  app.get("/auth/session", async (request, reply) => {
    const tokenHeader = request.headers["x-northstar-session"];
    const token = typeof tokenHeader === "string" ? tokenHeader : Array.isArray(tokenHeader) ? tokenHeader[0] : undefined;
    if (!token) {
      return reply.status(400).send({ error: "Missing x-northstar-session header" });
    }

    const session = await getCurrentWorkspaceSession(token);
    if (!session) {
      return reply.status(404).send({ error: "Session not found" });
    }
    return { session };
  });

  app.delete("/auth/session", async (request, reply) => {
    const tokenHeader = request.headers["x-northstar-session"];
    const token = typeof tokenHeader === "string" ? tokenHeader : Array.isArray(tokenHeader) ? tokenHeader[0] : undefined;
    if (!token) {
      return reply.status(400).send({ error: "Missing x-northstar-session header" });
    }

    const session = await revokeWorkspaceSession(token);
    if (!session) {
      return reply.status(404).send({ error: "Session not found" });
    }
    return { session };
  });

  app.get("/workspaces/:workspaceId/providers", async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
    return { providers: await listProviderConfigs(workspaceId) };
  });

  app.put("/workspaces/:workspaceId/providers/:providerKey", async (request, reply) => {
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

  app.get("/workspaces/:workspaceId/connections", async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const projectId = typeof request.query === "object" && request.query && "project_id" in request.query
      ? String((request.query as Record<string, unknown>).project_id)
      : undefined;
    return { connections: await listIntegrationConnections(workspaceId, projectId) };
  });

  app.put("/workspaces/:workspaceId/connections/:providerKey", async (request, reply) => {
    const { workspaceId, providerKey } = request.params as { workspaceId: string; providerKey: string };
    const parsed = connectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const connection = await upsertIntegrationConnection(workspaceId, providerKey, parsed.data);
    if (!connection) {
      return reply.status(404).send({ error: "Workspace or project not found" });
    }
    return { connection };
  });

  app.delete("/workspaces/:workspaceId/connections/:connectionId", async (request, reply) => {
    const { workspaceId, connectionId } = request.params as { workspaceId: string; connectionId: string };
    const connection = await disconnectIntegrationConnection(workspaceId, connectionId);
    if (!connection) {
      return reply.status(404).send({ error: "Connection not found" });
    }
    return { connection };
  });
};
