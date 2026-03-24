export type TaskStatus =
  | 'inbox'
  | 'evaluating'
  | 'planned'
  | 'in_progress'
  | 'waiting_for_approval'
  | 'done'
  | 'blocked';

export type TaskType =
  | 'seo_audit'
  | 'keyword_cluster'
  | 'meta_rewrite'
  | 'blog_brief'
  | 'linkedin_post_set'
  | 'x_post_set'
  | 'homepage_copy_suggestion'
  | 'competitor_scan';

export type TaskSource = 'system' | 'user' | 'agent';
export type OwnerType = 'agent' | 'user' | 'human';

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
  source: TaskSource;
  status: TaskStatus;
  impact: number;
  effort: number;
  confidence: number;
  goal_fit: number;
  priority_score: number;
  rationale: string;
  dependencies: string[];
  owner_type: OwnerType;
  movement_history: TaskMovement[];
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  taskId: string;
  type: 'blog_brief';
  title: string;
  content: string;
  status: 'draft' | 'needs_review' | 'approved';
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

export interface AppState {
  workspace: Workspace;
  project: Project;
  snapshot: WebsiteSnapshot;
  profile: CompanyProfile;
  tasks: Task[];
  artifacts: Artifact[];
  approvals: Approval[];
  comments: Comment[];
  agentRuns: AgentRun[];
}

export interface NewTaskInput {
  title: string;
  description: string;
  type: TaskType;
  impact: number;
  effort: number;
  confidence: number;
  goal_fit: number;
  owner_type: OwnerType;
}
