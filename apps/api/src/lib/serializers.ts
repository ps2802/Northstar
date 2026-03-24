import type { Approval, Artifact, Comment, CompanyProfile, FounderDashboard, Project, Task, WebsiteSnapshot, Workspace, AgentRun } from "@founder-os/types";
import type { Approval as PrismaApproval, AgentRun as PrismaAgentRun, Artifact as PrismaArtifact, Comment as PrismaComment, CompanyProfile as PrismaCompanyProfile, Project as PrismaProject, Task as PrismaTask, WebsiteSnapshot as PrismaWebsiteSnapshot, Workspace as PrismaWorkspace } from "@prisma/client";

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  return JSON.parse(value) as T;
};

const toIso = (value: Date) => value.toISOString();

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
  agentRuns: PrismaAgentRun[];
}): FounderDashboard => ({
  workspace: serializeWorkspace(payload.workspace),
  project: serializeProject(payload.project),
  website_snapshot: serializeWebsiteSnapshot(payload.websiteSnapshot),
  company_profile: serializeCompanyProfile(payload.companyProfile),
  tasks: payload.tasks.map(serializeTask),
  artifacts: payload.artifacts.map(serializeArtifact),
  approvals: payload.approvals.map(serializeApproval),
  agent_runs: payload.agentRuns.map(serializeAgentRun)
});
