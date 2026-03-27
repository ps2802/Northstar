export const taskStatuses = [
  "INBOX",
  "EVALUATING",
  "PLANNED",
  "IN_PROGRESS",
  "WAITING_FOR_APPROVAL",
  "DONE",
  "BLOCKED"
] as const;

export const taskTypes = [
  "SEO_AUDIT",
  "KEYWORD_CLUSTER",
  "META_REWRITE",
  "BLOG_BRIEF",
  "LINKEDIN_POST_SET",
  "X_POST_SET",
  "HOMEPAGE_COPY_SUGGESTION",
  "COMPETITOR_SCAN"
] as const;

export const taskSources = ["SYSTEM", "USER", "AGENT"] as const;
export const ownerTypes = ["AGENT", "USER", "SYSTEM"] as const;
export const artifactTypes = ["BLOG_BRIEF"] as const;
export const artifactStatuses = ["DRAFT", "WAITING_FOR_APPROVAL", "APPROVED", "REJECTED"] as const;
export const approvalStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;
export const sessionRoles = ["FOUNDER", "MEMBER"] as const;
export const sessionStatuses = ["ACTIVE", "REVOKED", "EXPIRED"] as const;
export const providerSetupStatuses = ["NOT_CONFIGURED", "CONFIGURED", "ERROR"] as const;
export const connectionStatuses = ["DISCONNECTED", "PENDING", "CONNECTED", "ERROR"] as const;
export const revisionStatuses = ["REQUESTED", "SUBMITTED", "APPROVED", "REJECTED"] as const;
export const executionJobStatuses = ["QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELED"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskType = (typeof taskTypes)[number];
export type TaskSource = (typeof taskSources)[number];
export type OwnerType = (typeof ownerTypes)[number];
export type ArtifactType = (typeof artifactTypes)[number];
export type ArtifactStatus = (typeof artifactStatuses)[number];
export type ApprovalStatus = (typeof approvalStatuses)[number];
export type SessionRole = (typeof sessionRoles)[number];
export type SessionStatus = (typeof sessionStatuses)[number];
export type ProviderSetupStatus = (typeof providerSetupStatuses)[number];
export type ConnectionStatus = (typeof connectionStatuses)[number];
export type RevisionStatus = (typeof revisionStatuses)[number];
export type ExecutionJobStatus = (typeof executionJobStatuses)[number];

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  website_url: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WebsitePage {
  url: string;
  title: string;
  excerpt: string;
}

export interface WebsiteSnapshot {
  id: string;
  project_id: string;
  website_url: string;
  homepage_title: string;
  crawled_pages: WebsitePage[];
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: string;
  project_id: string;
  company_summary: string;
  guessed_icp: string;
  key_pages: string[];
  opportunities: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskMovement {
  from: TaskStatus | null;
  to: TaskStatus;
  reason: string;
  at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: TaskType;
  source: TaskSource;
  status: TaskStatus;
  impact: number;
  effort: number;
  confidence: number;
  goal_fit: number;
  priority_score: number;
  context_boost?: number;
  rationale: string;
  dependencies: string[];
  owner_type: OwnerType;
  movement_history: TaskMovement[];
  artifact_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  project_id: string;
  type: ArtifactType;
  title: string;
  content: string;
  status: ArtifactStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  project_id: string;
  task_id?: string | null;
  run_type: string;
  status: string;
  summary: string;
  output?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  project_id: string;
  artifact_id: string;
  status: ApprovalStatus;
  requested_by: string;
  decision_note?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  task_id?: string | null;
  body: string;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface FounderIntake {
  id: string;
  project_id: string;
  founder_name?: string | null;
  founder_email?: string | null;
  business_description?: string | null;
  current_goals: string[];
  initiatives: string[];
  answers: Record<string, string>;
  planning_context?: string | null;
  last_submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSession {
  id: string;
  workspace_id: string;
  project_id?: string | null;
  founder_intake_id?: string | null;
  email: string;
  name: string;
  role: SessionRole;
  status: SessionStatus;
  last_seen_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionProviderConfig {
  id: string;
  workspace_id: string;
  provider_key: string;
  label: string;
  auth_type: string;
  status: ProviderSetupStatus;
  base_url?: string | null;
  default_model?: string | null;
  scopes: string[];
  config?: Record<string, unknown> | null;
  last_validated_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationConnection {
  id: string;
  workspace_id: string;
  project_id?: string | null;
  provider_key: string;
  label: string;
  auth_type: string;
  status: ConnectionStatus;
  external_account_id?: string | null;
  metadata?: Record<string, unknown> | null;
  sync_state?: Record<string, unknown> | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtifactRevision {
  id: string;
  project_id: string;
  artifact_id: string;
  approval_id?: string | null;
  requested_by: string;
  status: RevisionStatus;
  instruction: string;
  submitted_content?: string | null;
  change_summary?: string | null;
  submitted_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionJob {
  id: string;
  project_id: string;
  task_id?: string | null;
  artifact_id?: string | null;
  revision_id?: string | null;
  provider_config_id?: string | null;
  run_type: string;
  queue_name: string;
  status: ExecutionJobStatus;
  dedupe_key?: string | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error_message?: string | null;
  attempt_count: number;
  queued_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngestionResult {
  website_url: string;
  homepage_title: string;
  company_summary: string;
  guessed_icp: string;
  key_pages: string[];
  opportunities: string[];
  crawled_pages: WebsitePage[];
}

export interface TaskInput {
  title: string;
  description?: string;
  type: TaskType;
  source: TaskSource;
  impact: number;
  effort: number;
  confidence: number;
  goal_fit: number;
  rationale: string;
  dependencies?: string[];
  owner_type?: OwnerType;
}

export interface FounderDashboard {
  workspace: Workspace;
  project: Project;
  website_snapshot: WebsiteSnapshot;
  company_profile: CompanyProfile;
  tasks: Task[];
  artifacts: Artifact[];
  approvals: Approval[];
  comments: Comment[];
  agent_runs: AgentRun[];
}
