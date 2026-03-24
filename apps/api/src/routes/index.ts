import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { createManualTask, decideApproval, getDashboard, listProjects, onboardProject, reprioritizeProjectTasks, runTaskExecution, updateTaskStatus } from "../services/dashboard.js";

const onboardSchema = z.object({
  website_url: z.string().min(3)
});

const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
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
  note: z.string().optional()
});

const statusSchema = z.object({
  status: z.enum(["INBOX", "EVALUATING", "PLANNED", "IN_PROGRESS", "WAITING_FOR_APPROVAL", "DONE", "BLOCKED"])
});

export const registerRoutes = async (app: FastifyInstance) => {
  app.get("/health", async () => ({ ok: true }));

  app.get("/projects", async () => ({ projects: await listProjects() }));

  app.post("/projects/onboard", async (request, reply) => {
    const parsed = onboardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const dashboard = await onboardProject(parsed.data.website_url);
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

    const task = await createManualTask(projectId, { ...parsed.data, rationale: parsed.data.rationale ?? "", source: "USER" });
    return { task };
  });

  app.post("/projects/:projectId/reprioritize", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const dashboard = await reprioritizeProjectTasks(projectId);
    if (!dashboard) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return { dashboard };
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

  app.post("/approvals/:approvalId/decision", async (request, reply) => {
    const { approvalId } = request.params as { approvalId: string };
    const parsed = approvalSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const dashboard = await decideApproval(approvalId, parsed.data.decision, parsed.data.note);
    if (!dashboard) {
      return reply.status(404).send({ error: "Approval not found" });
    }
    return { dashboard };
  });
};
