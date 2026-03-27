import type { TaskType } from './types';

export const supportedManualTaskTypes: Array<{ value: TaskType; label: string }> = [
  { value: 'seo_audit', label: 'SEO audit' },
  { value: 'keyword_cluster', label: 'Keyword cluster' },
  { value: 'meta_rewrite', label: 'Meta rewrite' },
  { value: 'blog_brief', label: 'Blog brief' },
  { value: 'linkedin_post_set', label: 'LinkedIn post set' },
  { value: 'x_post_set', label: 'X post set' },
  { value: 'homepage_copy_suggestion', label: 'Homepage copy suggestion' },
  { value: 'competitor_scan', label: 'Competitor scan' },
];

export const executableTaskTypes = new Set<TaskType>(['blog_brief']);
