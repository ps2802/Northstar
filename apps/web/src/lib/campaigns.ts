import type {
  AgentRun,
  Approval,
  Artifact,
  Campaign,
  CampaignStatus,
  FounderIntake,
  Goal,
  Initiative,
  Task,
  TaskChannel,
} from './types';

interface BuildCampaignsInput {
  agentRuns: AgentRun[];
  approvals: Approval[];
  artifacts: Artifact[];
  founderIntake: FounderIntake | null;
  goals: Goal[];
  initiatives: Initiative[];
  tasks: Task[];
}

const humanize = (value: string) => value.replaceAll('_', ' ');

const getDominantChannel = (
  taskChannels: TaskChannel[],
  artifactChannels: TaskChannel[],
  founderIntake: FounderIntake | null,
  fallback: string,
) => {
  const values = [...taskChannels, ...artifactChannels].filter((value) => value && value !== 'internal');
  if (!values.length) {
    return founderIntake?.keyChannel || fallback;
  }

  const counts = values.reduce((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map<TaskChannel, number>());

  const [winner] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  return humanize(winner);
};

const getPrimaryMetric = (initiative: Initiative, goals: Goal[]) => {
  const joinedCategory = initiative.category.replaceAll('_', ' ');
  const matchingGoal = goals.find((goal) => {
    const searchable = `${goal.title} ${goal.summary} ${goal.metric}`.toLowerCase();
    if (initiative.category === 'website') {
      return searchable.includes('homepage') || searchable.includes('conversion');
    }

    return searchable.includes(joinedCategory);
  });

  return matchingGoal?.metric ?? goals[0]?.metric ?? 'Founder outcome';
};

const getCampaignStatus = (tasks: Task[], approvals: Approval[], runs: AgentRun[]): CampaignStatus => {
  if (approvals.some((approval) => approval.status === 'pending')) {
    return 'waiting';
  }

  if (approvals.some((approval) => approval.status === 'rejected') || tasks.some((task) => task.status === 'blocked')) {
    return 'blocked';
  }

  if (runs.some((run) => run.status === 'running') || tasks.some((task) => task.status === 'in_progress')) {
    return 'active';
  }

  if (tasks.length > 0 && tasks.every((task) => task.status === 'done')) {
    return 'done';
  }

  return 'planned';
};

const getUpdatedAt = (tasks: Task[], artifacts: Artifact[], approvals: Approval[], runs: AgentRun[]) => {
  const timestamps = [
    ...tasks.map((task) => task.updated_at),
    ...artifacts.map((artifact) => artifact.createdAt),
    ...approvals.map((approval) => approval.decidedAt ?? approval.requestedAt),
    ...runs.map((run) => run.finishedAt ?? run.startedAt),
  ]
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));

  if (!timestamps.length) {
    return new Date().toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
};

export const buildCampaigns = ({
  agentRuns,
  approvals,
  artifacts,
  founderIntake,
  goals,
  initiatives,
  tasks,
}: BuildCampaignsInput): Campaign[] => initiatives
  .map((initiative) => {
    const linkedTasks = tasks.filter((task) => initiative.linkedTaskIds.includes(task.id));
    if (!linkedTasks.length) {
      return null;
    }

    const linkedTaskIds = linkedTasks.map((task) => task.id);
    const linkedArtifacts = artifacts.filter((artifact) => linkedTaskIds.includes(artifact.taskId));
    const linkedApprovals = approvals.filter((approval) => linkedTaskIds.includes(approval.taskId));
    const linkedRuns = agentRuns.filter((run) => run.taskId && linkedTaskIds.includes(run.taskId));
    const fallbackChannel = initiative.category === 'social' ? 'social' : humanize(initiative.category);

    return {
      id: initiative.id,
      name: initiative.title,
      objective: initiative.summary || founderIntake?.mainGoal || 'Keep the current growth work moving.',
      channel: getDominantChannel(
        linkedTasks.flatMap((task) => task.channel ? [task.channel] : []),
        linkedArtifacts.flatMap((artifact) => artifact.channel ? [artifact.channel] : []),
        founderIntake,
        fallbackChannel,
      ),
      audience: founderIntake?.icp || 'Founder-defined audience',
      status: getCampaignStatus(linkedTasks, linkedApprovals, linkedRuns),
      linkedTaskIds,
      linkedRunIds: linkedRuns.map((run) => run.id),
      linkedOutputIds: linkedArtifacts.map((artifact) => artifact.id),
      linkedApprovalIds: linkedApprovals.map((approval) => approval.id),
      primaryMetric: getPrimaryMetric(initiative, goals),
      updated_at: getUpdatedAt(linkedTasks, linkedArtifacts, linkedApprovals, linkedRuns),
    } satisfies Campaign;
  })
  .filter((campaign): campaign is Campaign => campaign !== null)
  .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
