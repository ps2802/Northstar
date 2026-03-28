import type { TaskType } from './types';

export type TaskExecutionAvailability = 'live' | 'planning_only';

export const supportedManualTaskTypes: Array<{ value: TaskType; label: string; availability: TaskExecutionAvailability }> = [
  { value: 'blog_brief', label: 'Blog brief', availability: 'live' },
  { value: 'seo_audit', label: 'SEO audit', availability: 'planning_only' },
  { value: 'keyword_cluster', label: 'Keyword cluster', availability: 'planning_only' },
  { value: 'meta_rewrite', label: 'Meta rewrite', availability: 'planning_only' },
  { value: 'linkedin_post_set', label: 'LinkedIn post set', availability: 'planning_only' },
  { value: 'x_post_set', label: 'X post set', availability: 'planning_only' },
  { value: 'homepage_copy_suggestion', label: 'Homepage copy suggestion', availability: 'planning_only' },
  { value: 'competitor_scan', label: 'Competitor scan', availability: 'planning_only' },
];

export const executableTaskTypes = new Set<TaskType>(['blog_brief']);

export const getTaskExecutionAvailability = (type: TaskType): TaskExecutionAvailability =>
  executableTaskTypes.has(type) ? 'live' : 'planning_only';
