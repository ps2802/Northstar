import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { requestOpenAiCompatibleText } from "@founder-os/agent-core";
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

const getProviderDefaults = (providerKey: string) => {
  switch (providerKey) {
    case "openrouter":
      return {
        baseUrl: "https://openrouter.ai/api/v1",
        model: "openai/gpt-4.1-mini"
      };
    case "openai":
      return {
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4.1-mini"
      };
    default:
      return {
        baseUrl: undefined,
        model: undefined
      };
  }
};

const getIntegrationDefaults = (providerKey: string) => {
  switch (providerKey) {
    case "intercom":
      return {
        authType: "api_key" as const,
        label: "Intercom"
      };
    case "x":
      return {
        authType: "api_key" as const,
        label: "X"
      };
    case "google_workspace":
      return {
        authType: "oauth" as const,
        label: "Google Workspace"
      };
    case "gmail":
      return {
        authType: "oauth" as const,
        label: "Gmail"
      };
    case "google_drive":
      return {
        authType: "oauth" as const,
        label: "Google Drive"
      };
    case "instagram":
      return {
        authType: "oauth" as const,
        label: "Instagram"
      };
    case "threads":
      return {
        authType: "oauth" as const,
        label: "Threads"
      };
    case "image_generation":
      return {
        authType: "api_key" as const,
        label: "Image generation"
      };
    default:
      return {
        authType: "api_key" as const,
        label: providerKey
      };
  }
};

const readJsonResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
};

const validateIntercomConnection = async (apiKey: string) => {
  const response = await fetch("https://api.intercom.io/me", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Intercom-Version": "2.11"
    }
  });
  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Intercom validation failed: ${response.status} ${JSON.stringify(payload)}`.slice(0, 400));
  }

  const maybeApp = payload && typeof payload.app === "object" && payload.app ? payload.app as Record<string, unknown> : null;
  const maybeType = typeof payload?.type === "string" ? payload.type : "intercom";
  return {
    externalAccountId: typeof maybeApp?.name === "string"
      ? maybeApp.name
      : typeof maybeApp?.id === "string"
        ? maybeApp.id
        : maybeType,
    syncState: {
      validated_provider: "intercom",
      validation_mode: "live_api"
    }
  };
};

const validateXConnection = async (apiKey: string) => {
  const response = await fetch("https://api.x.com/2/users/by/username/XDevelopers", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`
    }
  });
  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(`X validation failed: ${response.status} ${JSON.stringify(payload)}`.slice(0, 400));
  }

  const maybeData = payload && typeof payload.data === "object" && payload.data ? payload.data as Record<string, unknown> : null;
  return {
    externalAccountId: typeof maybeData?.username === "string" ? maybeData.username : "validated_token",
    syncState: {
      validated_provider: "x",
      validation_mode: "read_api"
    }
  };
};

const validateIntegrationConnection = async (input: {
  providerKey: string;
  authType: string;
  apiKey?: string;
  externalAccountId?: string;
}) => {
  const defaults = getIntegrationDefaults(input.providerKey);
  const authType = input.authType.trim() || defaults.authType;

  if (authType === "oauth") {
    return {
      status: "PENDING" as const,
      externalAccountId: input.externalAccountId?.trim() || null,
      lastError: `${defaults.label} requires a real OAuth handoff before it can be validated.`,
      lastSyncedAt: null,
      syncState: {
        validation_mode: "oauth_required"
      }
    };
  }

  if (!input.apiKey?.trim()) {
    return {
      status: "DISCONNECTED" as const,
      externalAccountId: null,
      lastError: "API key required",
      lastSyncedAt: null,
      syncState: {
        validation_mode: "missing_key"
      }
    };
  }

  try {
    const result = input.providerKey === "intercom"
      ? await validateIntercomConnection(input.apiKey.trim())
      : input.providerKey === "x"
        ? await validateXConnection(input.apiKey.trim())
        : null;

    if (!result) {
      return {
        status: "ERROR" as const,
        externalAccountId: input.externalAccountId?.trim() || null,
        lastError: `Live validation for ${defaults.label} is not implemented in this workspace yet.`,
        lastSyncedAt: null,
        syncState: {
          validation_mode: "unsupported"
        }
      };
    }

    return {
      status: "CONNECTED" as const,
      externalAccountId: result.externalAccountId,
      lastError: null,
      lastSyncedAt: new Date(),
      syncState: result.syncState
    };
  } catch (error) {
    return {
      status: "ERROR" as const,
      externalAccountId: input.externalAccountId?.trim() || null,
      lastError: error instanceof Error ? error.message : "Integration validation failed",
      lastSyncedAt: null,
      syncState: {
        validation_mode: "live_api"
      }
    };
  }
};

const validateProviderConnection = async (input: {
  providerKey: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
}) => {
  const providerKey = input.providerKey === "openrouter" ? "openrouter" : input.providerKey === "openai" ? "openai" : null;
  if (!providerKey) {
    return {
      status: "NOT_CONFIGURED" as const,
      lastError: null,
      validatedAt: null
    };
  }

  if (!input.apiKey?.trim()) {
    return {
      status: "NOT_CONFIGURED" as const,
      lastError: "API key required",
      validatedAt: null
    };
  }

  const defaults = getProviderDefaults(providerKey);

  try {
    await requestOpenAiCompatibleText({
      providerKey,
      apiKey: input.apiKey.trim(),
      baseUrl: input.baseUrl?.trim() || defaults.baseUrl,
      model: input.defaultModel?.trim() || defaults.model || "gpt-4.1-mini",
      systemPrompt: "Return the word ok.",
      userPrompt: "Reply with ok.",
      temperature: 0,
      maxTokens: 16
    });

    return {
      status: "CONFIGURED" as const,
      lastError: null,
      validatedAt: new Date()
    };
  } catch (error) {
    return {
      status: "ERROR" as const,
      lastError: error instanceof Error ? error.message : "Provider validation failed",
      validatedAt: null
    };
  }
};

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
  api_key?: string;
  scopes?: string[];
  last_error?: string;
}) => {
  const workspace = await ensureWorkspace(workspaceId);
  if (!workspace) {
    return null;
  }

  const nextStatus = input.status ?? "CONFIGURED";
  const existing = await prisma.executionProviderConfig.findUnique({
    where: {
      workspaceId_providerKey: {
        workspaceId,
        providerKey
      }
    }
  });
  const existingConfig = existing?.configJson ? JSON.parse(existing.configJson) as Record<string, unknown> : {};
  const nextConfig = input.api_key?.trim()
    ? { ...existingConfig, api_key: input.api_key.trim() }
    : existingConfig;
  const defaults = getProviderDefaults(providerKey);
  const nextBaseUrl = input.base_url?.trim() || existing?.baseUrl || defaults.baseUrl || null;
  const nextDefaultModel = input.default_model?.trim() || existing?.defaultModel || defaults.model || null;
  const nextApiKey = typeof nextConfig.api_key === "string" ? nextConfig.api_key : undefined;
  const validation = input.auth_type.trim() === "api_key"
    ? await validateProviderConnection({
        providerKey,
        apiKey: nextApiKey,
        baseUrl: nextBaseUrl ?? undefined,
        defaultModel: nextDefaultModel ?? undefined
      })
    : {
        status: nextStatus,
        lastError: null,
        validatedAt: nextStatus === "CONFIGURED" ? new Date() : null
      };
  const persistedStatus = input.auth_type.trim() === "api_key" ? validation.status : nextStatus;

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
      status: persistedStatus,
      baseUrl: nextBaseUrl,
      defaultModel: nextDefaultModel,
      scopesJson: JSON.stringify((input.scopes ?? []).map((scope) => scope.trim()).filter(Boolean)),
      configJson: Object.keys(nextConfig).length ? JSON.stringify(nextConfig) : null,
      lastValidatedAt: validation.validatedAt,
      lastError: validation.lastError ?? input.last_error?.trim() ?? null
    },
    create: {
      id: nanoid(),
      workspaceId,
      providerKey,
      label: input.label?.trim() || providerKey,
      authType: input.auth_type.trim(),
      status: persistedStatus,
      baseUrl: nextBaseUrl,
      defaultModel: nextDefaultModel,
      scopesJson: JSON.stringify((input.scopes ?? []).map((scope) => scope.trim()).filter(Boolean)),
      configJson: Object.keys(nextConfig).length ? JSON.stringify(nextConfig) : null,
      lastValidatedAt: validation.validatedAt,
      lastError: validation.lastError ?? input.last_error?.trim() ?? null
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
  api_key?: string;
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

  const defaults = getIntegrationDefaults(providerKey);
  const existing = await prisma.integrationConnection.findUnique({
    where: {
      workspaceId_providerKey: {
        workspaceId,
        providerKey
      }
    }
  });
  const existingMetadata = existing?.metadataJson ? JSON.parse(existing.metadataJson) as Record<string, unknown> : {};
  const nextMetadata = input.api_key?.trim()
    ? { ...existingMetadata, api_key: input.api_key.trim() }
    : existingMetadata;
  const validation = await validateIntegrationConnection({
    providerKey,
    authType: input.auth_type.trim() || defaults.authType,
    apiKey: typeof nextMetadata.api_key === "string" ? nextMetadata.api_key : undefined,
    externalAccountId: input.external_account_id
  });

  const connection = await prisma.integrationConnection.upsert({
    where: {
      workspaceId_providerKey: {
        workspaceId,
        providerKey
      }
    },
    update: {
      projectId: input.project_id ?? null,
      label: input.label?.trim() || defaults.label,
      authType: input.auth_type.trim() || defaults.authType,
      status: validation.status,
      externalAccountId: validation.externalAccountId,
      metadataJson: Object.keys(nextMetadata).length ? JSON.stringify(nextMetadata) : null,
      syncStateJson: JSON.stringify(validation.syncState),
      lastSyncedAt: validation.lastSyncedAt,
      lastError: validation.lastError ?? input.last_error?.trim() ?? null
    },
    create: {
      id: nanoid(),
      workspaceId,
      projectId: input.project_id ?? null,
      providerKey,
      label: input.label?.trim() || defaults.label,
      authType: input.auth_type.trim() || defaults.authType,
      status: validation.status,
      externalAccountId: validation.externalAccountId,
      metadataJson: Object.keys(nextMetadata).length ? JSON.stringify(nextMetadata) : null,
      syncStateJson: JSON.stringify(validation.syncState),
      lastSyncedAt: validation.lastSyncedAt,
      lastError: validation.lastError ?? input.last_error?.trim() ?? null
    }
  });

  return serializeIntegrationConnection(connection);
};

export const revalidateIntegrationConnection = async (workspaceId: string, connectionId: string) => {
  const connection = await prisma.integrationConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.workspaceId !== workspaceId) {
    return null;
  }

  const metadata = connection.metadataJson ? JSON.parse(connection.metadataJson) as Record<string, unknown> : {};
  const validation = await validateIntegrationConnection({
    providerKey: connection.providerKey,
    authType: connection.authType,
    apiKey: typeof metadata.api_key === "string" ? metadata.api_key : undefined,
    externalAccountId: connection.externalAccountId ?? undefined
  });

  const updated = await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status: validation.status,
      externalAccountId: validation.externalAccountId,
      syncStateJson: JSON.stringify(validation.syncState),
      lastSyncedAt: validation.lastSyncedAt,
      lastError: validation.lastError
    }
  });

  return serializeIntegrationConnection(updated);
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
      externalAccountId: null,
      metadataJson: null,
      lastError: null,
      lastSyncedAt: null,
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

  await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: "REJECTED",
      decisionNote: input.instruction.trim(),
      decidedBy: input.requested_by?.trim() || DEFAULT_REVISION_REQUESTED_BY,
      decidedAt: new Date(),
      artifact: {
        update: {
          status: "REJECTED"
        }
      }
    }
  });

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

  const openApproval = await prisma.approval.findFirst({
    where: {
      artifactId: revision.artifactId,
      status: "PENDING"
    },
    select: { id: true }
  });
  if (openApproval) {
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
