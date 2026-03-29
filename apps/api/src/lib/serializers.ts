import type { AgentRun, Approval, Artifact, ArtifactRevision, Comment, CompanyProfile, ExecutionJob, ExecutionProviderConfig, FounderDashboard, FounderIntake, IntegrationConnection, Project, Task, WebsiteSnapshot, Workspace, WorkspaceSession } from "@founder-os/types";
import type { AgentRun as PrismaAgentRun, Approval as PrismaApproval, Artifact as PrismaArtifact, ArtifactRevision as PrismaArtifactRevision, Comment as PrismaComment, CompanyProfile as PrismaCompanyProfile, ExecutionJob as PrismaExecutionJob, ExecutionProviderConfig as PrismaExecutionProviderConfig, FounderIntake as PrismaFounderIntake, IntegrationConnection as PrismaIntegrationConnection, Project as PrismaProject, Task as PrismaTask, WebsiteSnapshot as PrismaWebsiteSnapshot, Workspace as PrismaWorkspace, WorkspaceSession as PrismaWorkspaceSession } from "@prisma/client";

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  return JSON.parse(value) as T;
};

const toIso = (value: Date) => value.toISOString();

const maskDisplayValue = (value: string | null | undefined) => {
  if (!value) {
    return value ?? null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("@")) {
    const [localPart, domainPart] = normalized.split("@", 2);
    return `${localPart.slice(0, 2)}***@${domainPart}`;
  }

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}***`;
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
};

const summarizeStoredPayload = (value: string | null | undefined): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return {
        has_stored_data: parsed.length > 0,
        entry_count: parsed.length
      };
    }

    if (parsed && typeof parsed === "object") {
      return {
        has_stored_data: Object.keys(parsed as Record<string, unknown>).length > 0,
        stored_fields: Object.keys(parsed as Record<string, unknown>).sort()
      };
    }

    return {
      has_stored_data: true,
      value_type: typeof parsed
    };
  } catch {
    return {
      has_stored_data: true,
      value_type: "invalid_json"
    };
  }
};

export const serializeWorkspace = (workspace: PrismaWorkspace): Workspace => ({
  id: workspace.id,
  name: workspace.name,
  description: workspace.description ?? undefined,
  created_at: toIso(workspace.createdAt),
  updated_at: toIso(workspace.updatedAt)
});

export const serializeProject = (project: PrismaProject): Project => ({
  id: project.id,
  workspace_id: project.workspaceId,
  website_url: project.websiteUrl,
  name: project.name,
  created_at: toIso(project.createdAt),
  updated_at: toIso(project.updatedAt)
});

export const serializeWebsiteSnapshot = (snapshot: PrismaWebsiteSnapshot): WebsiteSnapshot => ({
  id: snapshot.id,
  project_id: snapshot.projectId,
  website_url: snapshot.websiteUrl,
  homepage_title: snapshot.homepageTitle,
  crawled_pages: parseJson(snapshot.crawledPagesJson, []),
  summary: snapshot.summary,
  created_at: toIso(snapshot.createdAt),
  updated_at: toIso(snapshot.updatedAt)
});

export const serializeCompanyProfile = (profile: PrismaCompanyProfile): CompanyProfile => ({
  id: profile.id,
  project_id: profile.projectId,
  company_summary: profile.companySummary,
  guessed_icp: profile.guessedICP,
  key_pages: parseJson(profile.keyPagesJson, []),
  opportunities: parseJson(profile.opportunitiesJson, []),
  created_at: toIso(profile.createdAt),
  updated_at: toIso(profile.updatedAt)
});

export const serializeTask = (task: PrismaTask): Task => ({
  id: task.id,
  project_id: task.projectId,
  title: task.title,
  description: task.description,
  type: task.type,
  source: task.source,
  status: task.status,
  impact: task.impact,
  effort: task.effort,
  confidence: task.confidence,
  goal_fit: task.goalFit,
  priority_score: task.priorityScore,
  context_boost: task.priorityContextBoost,
  rationale: task.rationale,
  dependencies: parseJson(task.dependencies, []),
  owner_type: task.ownerType,
  movement_history: parseJson(task.movementLogJson, []),
  artifact_id: task.artifactId,
  created_at: toIso(task.createdAt),
  updated_at: toIso(task.updatedAt)
});

export const serializeArtifact = (artifact: PrismaArtifact): Artifact => ({
  id: artifact.id,
  project_id: artifact.projectId,
  type: artifact.type,
  title: artifact.title,
  content: artifact.content,
  status: artifact.status,
  created_at: toIso(artifact.createdAt),
  updated_at: toIso(artifact.updatedAt)
});

export const serializeApproval = (approval: PrismaApproval): Approval => ({
  id: approval.id,
  project_id: approval.projectId,
  artifact_id: approval.artifactId,
  status: approval.status,
  requested_by: approval.requestedBy,
  decision_note: approval.decisionNote,
  decided_by: approval.decidedBy,
  decided_at: approval.decidedAt ? toIso(approval.decidedAt) : null,
  created_at: toIso(approval.createdAt),
  updated_at: toIso(approval.updatedAt)
});

export const serializeComment = (comment: PrismaComment): Comment => ({
  id: comment.id,
  project_id: comment.projectId,
  task_id: comment.taskId,
  body: comment.body,
  author: comment.author,
  created_at: toIso(comment.createdAt),
  updated_at: toIso(comment.updatedAt)
});

export const serializeFounderIntake = (intake: PrismaFounderIntake): FounderIntake => ({
  id: intake.id,
  project_id: intake.projectId,
  founder_name: intake.founderName,
  founder_email: intake.founderEmail,
  business_description: intake.businessDescription,
  current_goals: parseJson(intake.currentGoalsJson, []),
  initiatives: parseJson(intake.initiativesJson, []),
  answers: parseJson(intake.answersJson, {}),
  planning_context: intake.planningContext,
  last_submitted_at: intake.lastSubmittedAt ? toIso(intake.lastSubmittedAt) : null,
  created_at: toIso(intake.createdAt),
  updated_at: toIso(intake.updatedAt)
});

export const serializeWorkspaceSession = (session: PrismaWorkspaceSession): WorkspaceSession => ({
  id: session.id,
  workspace_id: session.workspaceId,
  project_id: session.projectId,
  founder_intake_id: session.founderIntakeId,
  email: session.email,
  name: session.name,
  role: session.role,
  status: session.status,
  last_seen_at: session.lastSeenAt ? toIso(session.lastSeenAt) : null,
  expires_at: session.expiresAt ? toIso(session.expiresAt) : null,
  created_at: toIso(session.createdAt),
  updated_at: toIso(session.updatedAt)
});

export const serializeExecutionProviderConfig = (config: PrismaExecutionProviderConfig): ExecutionProviderConfig => ({
  id: config.id,
  workspace_id: config.workspaceId,
  provider_key: config.providerKey,
  label: config.label,
  auth_type: config.authType,
  status: config.status,
  base_url: config.baseUrl,
  default_model: config.defaultModel,
  scopes: parseJson(config.scopesJson, []),
  config: summarizeStoredPayload(config.configJson),
  last_validated_at: config.lastValidatedAt ? toIso(config.lastValidatedAt) : null,
  last_error: config.lastError,
  created_at: toIso(config.createdAt),
  updated_at: toIso(config.updatedAt)
});

export const serializeIntegrationConnection = (connection: PrismaIntegrationConnection): IntegrationConnection => ({
  id: connection.id,
  workspace_id: connection.workspaceId,
  project_id: connection.projectId,
  provider_key: connection.providerKey,
  label: connection.label,
  auth_type: connection.authType,
  status: connection.status,
  external_account_id: maskDisplayValue(connection.externalAccountId),
  metadata: summarizeStoredPayload(connection.metadataJson),
  sync_state: summarizeStoredPayload(connection.syncStateJson),
  last_synced_at: connection.lastSyncedAt ? toIso(connection.lastSyncedAt) : null,
  last_error: connection.lastError,
  created_at: toIso(connection.createdAt),
  updated_at: toIso(connection.updatedAt)
});

export const serializeArtifactRevision = (revision: PrismaArtifactRevision): ArtifactRevision => ({
  id: revision.id,
  project_id: revision.projectId,
  artifact_id: revision.artifactId,
  approval_id: revision.approvalId,
  requested_by: revision.requestedBy,
  status: revision.status,
  instruction: revision.instruction,
  submitted_content: revision.submittedContent,
  change_summary: revision.changeSummary,
  submitted_at: revision.submittedAt ? toIso(revision.submittedAt) : null,
  resolved_at: revision.resolvedAt ? toIso(revision.resolvedAt) : null,
  created_at: toIso(revision.createdAt),
  updated_at: toIso(revision.updatedAt)
});

export const serializeExecutionJob = (job: PrismaExecutionJob): ExecutionJob => ({
  id: job.id,
  project_id: job.projectId,
  task_id: job.taskId,
  artifact_id: job.artifactId,
  revision_id: job.revisionId,
  provider_config_id: job.providerConfigId,
  run_type: job.runType,
  queue_name: job.queueName,
  status: job.status,
  dedupe_key: job.dedupeKey,
  input: parseJson(job.inputJson, null),
  output: parseJson(job.outputJson, null),
  error_message: job.errorMessage,
  attempt_count: job.attemptCount,
  queued_at: toIso(job.queuedAt),
  started_at: job.startedAt ? toIso(job.startedAt) : null,
  completed_at: job.completedAt ? toIso(job.completedAt) : null,
  created_at: toIso(job.createdAt),
  updated_at: toIso(job.updatedAt)
});

export const serializeAgentRun = (run: PrismaAgentRun): AgentRun => ({
  id: run.id,
  project_id: run.projectId,
  task_id: run.taskId,
  run_type: run.runType,
  status: run.status,
  summary: run.summary,
  output: parseJson(run.outputJson, null),
  created_at: toIso(run.createdAt),
  updated_at: toIso(run.updatedAt)
});

export const serializeDashboard = (payload: {
  workspace: PrismaWorkspace;
  project: PrismaProject;
  websiteSnapshot: PrismaWebsiteSnapshot;
  companyProfile: PrismaCompanyProfile;
  tasks: PrismaTask[];
  artifacts: PrismaArtifact[];
  approvals: PrismaApproval[];
  comments: PrismaComment[];
  agentRuns: PrismaAgentRun[];
}): FounderDashboard => ({
  workspace: serializeWorkspace(payload.workspace),
  project: serializeProject(payload.project),
  website_snapshot: serializeWebsiteSnapshot(payload.websiteSnapshot),
  company_profile: serializeCompanyProfile(payload.companyProfile),
  tasks: payload.tasks.map(serializeTask),
  artifacts: payload.artifacts.map(serializeArtifact),
  approvals: payload.approvals.map(serializeApproval),
  comments: payload.comments.map(serializeComment),
  agent_runs: payload.agentRuns.map(serializeAgentRun)
});
