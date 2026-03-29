import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { transitionTask } from "@founder-os/task-engine";
import type { ConnectionStatus, ProviderSetupStatus, SessionRole } from "@founder-os/types";
import { buildPlanningContext, normalizeFounderIntakeInput, type FounderIntakeInput, applyFounderContextToTask } from "../lib/founder-intake.js";
import { prisma } from "../lib/prisma.js";
import { serializeApproval, serializeArtifactRevision, serializeExecutionJob, serializeExecutionProviderConfig, serializeFounderIntake, serializeIntegrationConnection, serializeTask, serializeWorkspaceSession } from "../lib/serializers.js";
import { getDashboard, recordFounderFeedback, reprioritizeProjectTasks, upsertTaskRecord } from "./dashboard.js";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const DEFAULT_REVISION_REQUESTED_BY = "founder";
const normalizeWebsiteHost = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized.startsWith("http") ? normalized : `https://${normalized}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

const ensureProject = async (projectId: string) =>
  prisma.project.findUnique({
    where: { id: projectId },
    include: { founderIntake: true }
  });

const ensureWorkspace = async (workspaceId: string) =>
  prisma.workspace.findUnique({
    where: { id: workspaceId }
  });

const createTaskComment = async (projectId: string, taskId: string, body: string, author = DEFAULT_REVISION_REQUESTED_BY) =>
  prisma.comment.create({
    data: {
      id: nanoid(),
      projectId,
      taskId,
      body,
      author
    }
  });

export const getFounderIntake = async (projectId: string) => {
  const intake = await prisma.founderIntake.findUnique({ where: { projectId } });
  return intake ? serializeFounderIntake(intake) : null;
};

export const upsertFounderIntake = async (projectId: string, input: FounderIntakeInput) => {
  const project = await ensureProject(projectId);
  if (!project) {
    return null;
  }

  const normalized = normalizeFounderIntakeInput(input);
  const planningContext = buildPlanningContext(normalized) || null;
  const intake = await prisma.founderIntake.upsert({
    where: { projectId },
    update: {
      founderName: normalized.founder_name ?? null,
      founderEmail: normalized.founder_email ?? null,
      businessDescription: normalized.business_description ?? null,
      currentGoalsJson: JSON.stringify(normalized.goals),
      initiativesJson: JSON.stringify(normalized.initiatives),
      answersJson: JSON.stringify(normalized.answers),
      planningContext,
      lastSubmittedAt: new Date()
    },
    create: {
      id: nanoid(),
      projectId,
      founderName: normalized.founder_name ?? null,
      founderEmail: normalized.founder_email ?? null,
      businessDescription: normalized.business_description ?? null,
      currentGoalsJson: JSON.stringify(normalized.goals),
      initiativesJson: JSON.stringify(normalized.initiatives),
      answersJson: JSON.stringify(normalized.answers),
      planningContext,
      lastSubmittedAt: new Date()
    }
  });

  const serializedIntake = serializeFounderIntake(intake);
  const tasks = await prisma.task.findMany({ where: { projectId } });
  for (const task of tasks) {
    await upsertTaskRecord(projectId, applyFounderContextToTask(serializeTask(task), serializedIntake));
  }

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      runType: "founder_intake",
      status: "completed",
      summary: "Saved founder intake and applied it to board prioritization context.",
      outputJson: JSON.stringify({
        founder_name: serializedIntake.founder_name,
        goals: serializedIntake.current_goals,
        initiatives: serializedIntake.initiatives
      })
    }
  });

  const dashboard = await reprioritizeProjectTasks(projectId);
  return {
    intake: serializedIntake,
    dashboard
  };
};

export const createWorkspaceSession = async (input: {
  workspace_id?: string;
  project_id?: string;
  email: string;
  name: string;
  role?: SessionRole;
  ttl_hours?: number;
}) => {
  const requestedWorkspaceId = input.workspace_id?.trim() || undefined;
  let workspaceId = requestedWorkspaceId;
  let founderIntakeId: string | null = null;

  if (input.project_id) {
    const project = await ensureProject(input.project_id);
    if (!project) {
      return null;
    }
    if (requestedWorkspaceId && project.workspaceId !== requestedWorkspaceId) {
      return null;
    }
    workspaceId = project.workspaceId;
    founderIntakeId = project.founderIntake?.id ?? null;
  }

  if (!workspaceId) {
    return null;
  }

  const workspace = await ensureWorkspace(workspaceId);
  if (!workspace) {
    return null;
  }

  const token = randomBytes(24).toString("hex");
  const ttlHours = Math.max(1, input.ttl_hours ?? 24 * 14);
  const session = await prisma.workspaceSession.create({
    data: {
      id: nanoid(),
      workspaceId,
      projectId: input.project_id ?? null,
      founderIntakeId,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role ?? "FOUNDER",
      status: "ACTIVE",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000)
    }
  });

  return {
    session: serializeWorkspaceSession(session),
    token
  };
};

export const createWorkspaceSessionFromAccess = async (input: {
  website_url: string;
  email: string;
  name?: string;
  role?: SessionRole;
  ttl_hours?: number;
}) => {
  const requestedHost = normalizeWebsiteHost(input.website_url);
  const email = input.email.trim().toLowerCase();
  if (!requestedHost || !email) {
    return null;
  }

  const matches = await prisma.founderIntake.findMany({
    where: {
      founderEmail: email
    },
    include: {
      project: {
        include: {
          workspace: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const intake = matches.find((record) => normalizeWebsiteHost(record.project.websiteUrl) === requestedHost);
  if (!intake) {
    return null;
  }

  const result = await createWorkspaceSession({
    workspace_id: intake.project.workspaceId,
    project_id: intake.projectId,
    email,
    name: input.name?.trim() || intake.founderName?.trim() || intake.project.name,
    role: input.role,
    ttl_hours: input.ttl_hours
  });

  if (!result) {
    return null;
  }

  return {
    ...result,
    dashboard: await getDashboard(intake.projectId)
  };
};

export const getCurrentWorkspaceSession = async (token: string) => {
  const tokenHash = hashToken(token);
  const record = await prisma.workspaceSession.findUnique({ where: { tokenHash } });
  if (!record) {
    return null;
  }

  if (record.status !== "ACTIVE") {
    return serializeWorkspaceSession(record);
  }

  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
    const expired = await prisma.workspaceSession.update({
      where: { id: record.id },
      data: { status: "EXPIRED" }
    });
    return serializeWorkspaceSession(expired);
  }

  const updated = await prisma.workspaceSession.update({
    where: { id: record.id },
    data: { lastSeenAt: new Date() }
  });
  return serializeWorkspaceSession(updated);
};

export const revokeWorkspaceSession = async (token: string) => {
  const tokenHash = hashToken(token);
  const record = await prisma.workspaceSession.findUnique({ where: { tokenHash } });
  if (!record) {
    return null;
  }

  const updated = await prisma.workspaceSession.update({
    where: { id: record.id },
    data: { status: "REVOKED" }
  });
  return serializeWorkspaceSession(updated);
};

export const listProviderConfigs = async (workspaceId: string) =>
  (await prisma.executionProviderConfig.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" }
  })).map(serializeExecutionProviderConfig);

export const upsertProviderConfig = async (workspaceId: string, providerKey: string, input: {
  label?: string;
  auth_type: string;
  status?: ProviderSetupStatus;
  base_url?: string;
  default_model?: string;
  scopes?: string[];
  last_error?: string;
}) => {
  const workspace = await ensureWorkspace(workspaceId);
  if (!workspace) {
    return null;
  }

  const nextStatus = input.status ?? "CONFIGURED";

  const provider = await prisma.executionProviderConfig.upsert({
    where: {
      workspaceId_providerKey: {
        workspaceId,
        providerKey
      }
    },
    update: {
      label: input.label?.trim() || providerKey,
      authType: input.auth_type.trim(),
      status: nextStatus,
      baseUrl: input.base_url?.trim() || null,
      defaultModel: input.default_model?.trim() || null,
      scopesJson: JSON.stringify((input.scopes ?? []).map((scope) => scope.trim()).filter(Boolean)),
      lastValidatedAt: nextStatus === "CONFIGURED" ? new Date() : null,
      lastError: input.last_error?.trim() || null
    },
    create: {
      id: nanoid(),
      workspaceId,
      providerKey,
      label: input.label?.trim() || providerKey,
      authType: input.auth_type.trim(),
      status: nextStatus,
      baseUrl: input.base_url?.trim() || null,
      defaultModel: input.default_model?.trim() || null,
      scopesJson: JSON.stringify((input.scopes ?? []).map((scope) => scope.trim()).filter(Boolean)),
      lastValidatedAt: nextStatus === "CONFIGURED" ? new Date() : null,
      lastError: input.last_error?.trim() || null
    }
  });

  return serializeExecutionProviderConfig(provider);
};

export const listIntegrationConnections = async (workspaceId: string, projectId?: string) =>
  (await prisma.integrationConnection.findMany({
    where: {
      workspaceId,
      ...(projectId ? { projectId } : {})
    },
    orderBy: { updatedAt: "desc" }
  })).map(serializeIntegrationConnection);

export const upsertIntegrationConnection = async (workspaceId: string, providerKey: string, input: {
  project_id?: string;
  label?: string;
  auth_type: string;
  status?: ConnectionStatus;
  external_account_id?: string;
  last_error?: string;
}) => {
  const workspace = await ensureWorkspace(workspaceId);
  if (!workspace) {
    return null;
  }

  if (input.project_id) {
    const project = await ensureProject(input.project_id);
    if (!project || project.workspaceId !== workspaceId) {
      return null;
    }
  }

  const nextStatus = input.status ?? "CONNECTED";

  const connection = await prisma.integrationConnection.upsert({
    where: {
      workspaceId_providerKey: {
        workspaceId,
        providerKey
      }
    },
    update: {
      projectId: input.project_id ?? null,
      label: input.label?.trim() || providerKey,
      authType: input.auth_type.trim(),
      status: nextStatus,
      externalAccountId: input.external_account_id?.trim() || null,
      lastSyncedAt: nextStatus === "CONNECTED" ? new Date() : null,
      lastError: input.last_error?.trim() || null
    },
    create: {
      id: nanoid(),
      workspaceId,
      projectId: input.project_id ?? null,
      providerKey,
      label: input.label?.trim() || providerKey,
      authType: input.auth_type.trim(),
      status: nextStatus,
      externalAccountId: input.external_account_id?.trim() || null,
      lastSyncedAt: nextStatus === "CONNECTED" ? new Date() : null,
      lastError: input.last_error?.trim() || null
    }
  });

  return serializeIntegrationConnection(connection);
};

export const disconnectIntegrationConnection = async (workspaceId: string, connectionId: string) => {
  const connection = await prisma.integrationConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.workspaceId !== workspaceId) {
    return null;
  }

  const updated = await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status: "DISCONNECTED",
      lastError: null,
      syncStateJson: JSON.stringify({ disconnected_at: new Date().toISOString() })
    }
  });

  return serializeIntegrationConnection(updated);
};

export const listExecutionJobs = async (projectId: string) =>
  (await prisma.executionJob.findMany({
    where: { projectId },
    orderBy: [{ queuedAt: "desc" }, { createdAt: "desc" }]
  })).map(serializeExecutionJob);

export const listArtifactRevisions = async (projectId: string, artifactId?: string) =>
  (await prisma.artifactRevision.findMany({
    where: {
      projectId,
      ...(artifactId ? { artifactId } : {})
    },
    orderBy: { createdAt: "desc" }
  })).map(serializeArtifactRevision);

export const requestArtifactRevision = async (approvalId: string, input: {
  instruction: string;
  requested_by?: string;
}) => {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: { artifact: true }
  });
  if (!approval || approval.status !== "PENDING") {
    return null;
  }

  const linkedTask = await prisma.task.findFirst({ where: { artifactId: approval.artifactId } });
  const revision = await prisma.artifactRevision.create({
    data: {
      id: nanoid(),
      projectId: approval.projectId,
      artifactId: approval.artifactId,
      requestedBy: input.requested_by?.trim() || DEFAULT_REVISION_REQUESTED_BY,
      status: "REQUESTED",
      instruction: input.instruction.trim()
    }
  });

  if (linkedTask) {
    const nextTask = transitionTask(serializeTask(linkedTask), "BLOCKED", "Founder requested a revision before approval.");
    await upsertTaskRecord(linkedTask.projectId, nextTask);
    await createTaskComment(linkedTask.projectId, linkedTask.id, input.instruction.trim(), input.requested_by?.trim() || DEFAULT_REVISION_REQUESTED_BY);
  }
  await recordFounderFeedback(approval.projectId, input.instruction.trim(), "revision_request");

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId: approval.projectId,
      taskId: linkedTask?.id,
      runType: "revision_request",
      status: "completed",
      summary: "Logged a founder revision request for an approval item.",
      outputJson: JSON.stringify({ approval_id: approvalId, revision_id: revision.id })
    }
  });

  return {
    revision: serializeArtifactRevision(revision),
    dashboard: await getDashboard(approval.projectId)
  };
};

export const submitArtifactRevision = async (revisionId: string, input: {
  content: string;
  change_summary?: string;
  requested_by?: string;
}) => {
  const revision = await prisma.artifactRevision.findUnique({
    where: { id: revisionId },
    include: {
      artifact: true
    }
  });
  if (!revision || revision.status !== "REQUESTED" || revision.approvalId) {
    return null;
  }

  const linkedTask = await prisma.task.findFirst({ where: { artifactId: revision.artifactId } });
  const actor = input.requested_by?.trim() || revision.requestedBy;

  const result = await prisma.$transaction(async (tx) => {
    const approval = await tx.approval.create({
      data: {
        id: nanoid(),
        projectId: revision.projectId,
        artifactId: revision.artifactId,
        status: "PENDING",
        requestedBy: actor
      }
    });

    await tx.artifact.update({
      where: { id: revision.artifactId },
      data: {
        content: input.content.trim(),
        status: "WAITING_FOR_APPROVAL"
      }
    });

    const updatedRevision = await tx.artifactRevision.update({
      where: { id: revisionId },
      data: {
        approvalId: approval.id,
        status: "SUBMITTED",
        submittedContent: input.content.trim(),
        changeSummary: input.change_summary?.trim() || null,
        submittedAt: new Date(),
        resolvedAt: null
      }
    });

    return { approval, revision: updatedRevision };
  });

  if (linkedTask) {
    const nextTask = transitionTask(serializeTask(linkedTask), "WAITING_FOR_APPROVAL", "Submitted a revision for another founder review.");
    await upsertTaskRecord(linkedTask.projectId, nextTask);

    if (input.change_summary?.trim()) {
      await createTaskComment(linkedTask.projectId, linkedTask.id, input.change_summary.trim(), actor);
    }
  }

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId: revision.projectId,
      taskId: linkedTask?.id,
      runType: "revision_submission",
      status: "completed",
      summary: "Submitted a revised artifact back into the approval queue.",
      outputJson: JSON.stringify({ revision_id: revisionId, approval_id: result.approval.id })
    }
  });

  return {
    revision: serializeArtifactRevision(result.revision),
    approval: serializeApproval(result.approval),
    dashboard: await getDashboard(revision.projectId)
  };
};
