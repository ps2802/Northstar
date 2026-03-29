export type TaskStatus =
  | 'inbox'
  | 'evaluating'
  | 'planned'
  | 'in_progress'
  | 'waiting_for_approval'
  | 'waiting_on_founder'
  | 'done'
  | 'blocked';

export type DashboardSection =
  | 'command_center'
  | 'board'
  | 'gtm_plan'
  | 'seo'
  | 'content'
  | 'social'
  | 'feature_suggestions'
  | 'website'
  | 'research'
  | 'crm'
  | 'approvals'
  | 'connections'
  | 'settings';

export type BuildTaskStatus = 'in_progress' | 'next' | 'planned' | 'blocked' | 'done';

export type DashboardSurface = 'kanban' | 'northstar' | 'founder' | 'approvals';

export type TaskType =
  | 'seo_audit'
  | 'keyword_cluster'
  | 'meta_rewrite'
  | 'blog_brief'
  | 'linkedin_post_set'
  | 'x_post_set'
  | 'email_template'
  | 'outreach_sequence'
  | 'illustration_brief'
  | 'research_summary'
  | 'user_research_outreach'
  | 'homepage_copy_suggestion'
  | 'competitor_scan'
  | 'integration_setup'
  | 'founder_input';

export type TaskCategory =
  | 'gtm'
  | 'seo'
  | 'content'
  | 'social'
  | 'website'
  | 'research'
  | 'crm'
  | 'product_signal'
  | 'integration';

export type TaskSource = 'system' | 'user' | 'agent';
export type OwnerType = 'agent' | 'user' | 'human';
export type TaskActor = 'northstar' | 'founder';
export type IntegrationCategory = 'social' | 'analytics' | 'support' | 'productivity' | 'crm';
export type AgentToolCategory =
  | 'communication_identity'
  | 'compute_execution'
  | 'browser_web_actions'
  | 'search_research'
  | 'memory_knowledge'
  | 'payments_transactions'
  | 'saas_api_access'
  | 'voice_layer';
export type TaskChannel = 'x' | 'linkedin' | 'instagram' | 'email' | 'whatsapp' | 'telegram' | 'web' | 'drive' | 'intercom' | 'internal';
export type ExecutionStage =
  | 'strategy'
  | 'generated'
  | 'ready_for_review'
  | 'ready_to_send'
  | 'sent'
  | 'published'
  | 'waiting_on_founder';

export interface FounderIntake {
  websiteUrl: string;
  businessDescription: string;
  icp: string;
  mainGoal: string;
  keyChannel: string;
  whatTried: string;
  priorityWork: string;
  competitors: string;
  bottleneck: 'traffic' | 'conversion' | 'both';
  authMethod: 'google' | 'email';
  email?: string;
}

export interface FounderSession {
  authMethod: 'google' | 'email';
  email?: string;
  status: 'connected' | 'pending';
  displayName: string;
}

export type WorkspaceSessionState = 'active' | 'missing' | 'expired' | 'revoked' | 'invalid';
export type WorkspaceTruthSource = 'live' | 'cached' | 'sample' | 'unauthenticated';
export type WorkspaceUnderstanding = 'verified' | 'fallback' | 'incomplete';

export interface WorkspaceAccessSession {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  email: string;
  name: string;
  role: 'founder' | 'member';
  status: 'active' | 'expired' | 'revoked';
  lastSeenAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTruth {
  source: WorkspaceTruthSource;
  freshness: 'fresh' | 'stale';
  sessionState: WorkspaceSessionState;
  understanding: WorkspaceUnderstanding;
  riskyMutationsAllowed: boolean;
  tokenPresent: boolean;
  loadedAt: string;
  session?: WorkspaceAccessSession | null;
}

export interface AgentToolVendor {
  id: string;
  name: string;
  tagline: string;
  url?: string;
}

export interface AgentToolWrapper {
  id: AgentToolCategory;
  label: string;
  objective: string;
  selectedVendorId?: string;
  vendors: AgentToolVendor[];
  updatedAt: string;
}

export interface WorkspaceLearningSignal {
  id: string;
  source: 'comment' | 'approval_rejection';
  note: string;
  capturedAt: string;
}

export interface WorkspaceLearning {
  preferences: string[];
  recentFeedback: WorkspaceLearningSignal[];
  lastRefinedAt: string;
}

export interface ExecutionProvider {
  id: string;
  name: string;
  authType: 'api_key' | 'cli';
  status: 'connected' | 'needs_key' | 'available' | 'error';
  description: string;
  modelHint: string;
  isDefault: boolean;
  maskedSecret?: string;
  connectedAt?: string;
  lastError?: string;
}

export interface OnboardingDraft {
  step: number;
  intake: FounderIntake;
  updatedAt: string;
}

export interface ExecutionPreference {
  provider: string;
  mode: 'founder_review' | 'send_ready' | 'implementation_handoff';
}

export interface TaskMovement {
  from: TaskStatus | null;
  to: TaskStatus;
  reason: string;
  at: string;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  websiteUrl: string;
  createdAt: string;
}

export interface WebsitePage {
  url: string;
  title: string;
  summary: string;
}

export interface WebsiteSnapshot {
  id: string;
  projectId: string;
  capturedAt: string;
  homepageTitle: string;
  homepageSummary: string;
  pages: WebsitePage[];
}

export interface CompanyProfile {
  id: string;
  projectId: string;
  companyName: string;
  summary: string;
  guessedIcp: string;
  keyPages: string[];
  opportunities: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  category: TaskCategory;
  channel?: TaskChannel;
  outputLabel?: string;
  executionStage?: ExecutionStage;
  source: TaskSource;
  status: TaskStatus;
  impact: number;
  effort: number;
  confidence: number;
  goal_fit: number;
  priority_score: number;
  rationale: string;
  dependencies: string[];
  actor: TaskActor;
  needsFounderAction: boolean;
  owner_type: OwnerType;
  movement_history: TaskMovement[];
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  taskId: string;
  type:
    | 'blog_brief'
    | 'social_post_set'
    | 'email_template'
    | 'outreach_sequence'
    | 'website_copy'
    | 'research_summary'
    | 'illustration_brief';
  title: string;
  content: string;
  channel?: TaskChannel;
  deliveryStage: ExecutionStage;
  status: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'ready_to_send' | 'sent' | 'published';
  summary?: string;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  projectId: string;
  taskId?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  summary: string;
  startedAt: string;
  finishedAt?: string;
}

export interface Approval {
  id: string;
  taskId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  decidedAt?: string;
  note?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  metric: string;
  target: string;
  horizon: string;
  summary: string;
}

export interface Initiative {
  id: string;
  title: string;
  category: TaskCategory;
  status: 'active' | 'planned' | 'complete';
  summary: string;
  linkedTaskIds: string[];
}

export type CampaignStatus = 'active' | 'waiting' | 'blocked' | 'planned' | 'done';

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  channel: string;
  audience: string;
  status: CampaignStatus;
  linkedTaskIds: string[];
  linkedRunIds: string[];
  linkedOutputIds: string[];
  linkedApprovalIds: string[];
  primaryMetric: string;
  updated_at: string;
}

export interface BuildTask {
  id: string;
  title: string;
  status: BuildTaskStatus;
  owner: 'codex' | 'founder';
  summary: string;
  nextStep: string;
}

export interface BuildPhase {
  id: string;
  title: string;
  status: 'active' | 'up_next' | 'queued' | 'done';
  goal: string;
  tasks: BuildTask[];
}

export interface Integration {
  id: string;
  key: string;
  name: string;
  category: IntegrationCategory;
  authType: 'api_key' | 'oauth';
  status: 'connected' | 'needs_key' | 'planned';
  description: string;
  credentialLabel: string;
  connectedAs?: string;
  maskedSecret?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

export interface CRMContact {
  id: string;
  name: string;
  company: string;
  stage: 'to_contact' | 'warm' | 'interviewing' | 'pilot' | 'customer';
  nextAction: string;
  owner: string;
  linkedTaskIds?: string[];
}

export interface ResearchNote {
  id: string;
  title: string;
  summary: string;
  type: 'interview' | 'competitor' | 'market';
  createdAt: string;
  linkedTaskIds?: string[];
  linkedInitiativeIds?: string[];
}

export interface AppState {
  workspace: Workspace;
  project: Project;
  snapshot: WebsiteSnapshot;
  profile: CompanyProfile;
  founderIntake: FounderIntake | null;
  founderSession: FounderSession | null;
  tasks: Task[];
  artifacts: Artifact[];
  approvals: Approval[];
  comments: Comment[];
  agentRuns: AgentRun[];
  goals: Goal[];
  initiatives: Initiative[];
  executionProviders: ExecutionProvider[];
  activeProviderId: string;
  integrations: Integration[];
  agentToolWrappers: AgentToolWrapper[];
  workspaceLearning: WorkspaceLearning;
  crmContacts: CRMContact[];
  researchNotes: ResearchNote[];
  workspaceTruth?: WorkspaceTruth;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  type: TaskType;
  impact: number;
  effort: number;
  confidence: number;
  goal_fit: number;
  owner_type: OwnerType;
}
