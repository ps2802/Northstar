import { buildCampaigns } from '../lib/campaigns';
import { formatDateTime } from '../lib/format';
import type { AgentRun, Approval, Artifact, FounderIntake, Goal, Initiative, Task } from '../lib/types';

interface AnalyticsSummaryPanelProps {
  agentRuns: AgentRun[];
  approvals: Approval[];
  artifacts: Artifact[];
  founderIntake: FounderIntake | null;
  goals: Goal[];
  initiatives: Initiative[];
  tasks: Task[];
}

const humanize = (value: string) => value.replaceAll('_', ' ');

const getApprovalTurnaround = (approvals: Approval[]) => {
  const decided = approvals.filter((approval) => approval.decidedAt);
  if (!decided.length) {
    return 'No completed reviews yet';
  }

  const averageHours = decided.reduce((total, approval) => {
    const requested = Date.parse(approval.requestedAt);
    const decidedAt = Date.parse(approval.decidedAt as string);
    return total + ((decidedAt - requested) / 3_600_000);
  }, 0) / decided.length;

  if (averageHours < 1) {
    return `${Math.max(1, Math.round(averageHours * 60))} min avg`;
  }

  return `${averageHours.toFixed(1)} hr avg`;
};

const getBestChannel = (tasks: Task[], artifacts: Artifact[], founderIntake: FounderIntake | null) => {
  const counters = new Map<string, number>();

  artifacts.forEach((artifact) => {
    if (!artifact.channel) {
      return;
    }

    if (artifact.status === 'approved' || artifact.status === 'sent' || artifact.status === 'published') {
      counters.set(artifact.channel, (counters.get(artifact.channel) ?? 0) + 2);
    }
  });

  tasks.forEach((task) => {
    if (!task.channel) {
      return;
    }

    if (task.status === 'done' || task.status === 'waiting_for_approval') {
      counters.set(task.channel, (counters.get(task.channel) ?? 0) + 1);
    }
  });

  if (!counters.size) {
    return founderIntake?.keyChannel ?? 'No signal yet';
  }

  const [winner] = [...counters.entries()].sort((left, right) => right[1] - left[1])[0];
  return humanize(winner);
};

export function AnalyticsSummaryPanel({
  agentRuns,
  approvals,
  artifacts,
  founderIntake,
  goals,
  initiatives,
  tasks,
}: AnalyticsSummaryPanelProps) {
  const campaigns = buildCampaigns({
    agentRuns,
    approvals,
    artifacts,
    founderIntake,
    goals,
    initiatives,
    tasks,
  });
  const activeCampaigns = campaigns.filter((campaign) => campaign.status !== 'planned' && campaign.status !== 'done').length;

  const approvalTurnaround = getApprovalTurnaround(approvals);
  const bestChannel = getBestChannel(tasks, artifacts, founderIntake);
  const shippedTasks = tasks.filter((task) => task.status === 'done');
  const shippedImpact = shippedTasks.reduce((total, task) => total + task.priority_score, 0);
  const lastMovement = shippedTasks
    .map((task) => task.updated_at)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];

  return (
    <div className="analytics-summary-grid">
      <article className="analytics-summary-card analytics-summary-card-lead">
        <span>Active campaigns</span>
        <strong>{activeCampaigns}</strong>
        <p>{activeCampaigns ? 'Campaigns with live execution moving now.' : 'No campaigns are actively moving right now.'}</p>
      </article>

      <article className="analytics-summary-card">
        <span>Approval turnaround</span>
        <strong>{approvalTurnaround}</strong>
        <p>{approvals.filter((approval) => approval.status === 'pending').length} approvals still waiting on founder review.</p>
      </article>

      <article className="analytics-summary-card">
        <span>Best channel</span>
        <strong>{bestChannel}</strong>
        <p>{goals[0]?.metric ?? 'Founder outcome'} is currently best supported by this channel mix.</p>
      </article>

      <article className="analytics-summary-card">
        <span>Movement</span>
        <strong>{shippedTasks.length} shipped tasks</strong>
        <p>
          {shippedTasks.length
            ? `Priority score moved: ${Math.round(shippedImpact)}${lastMovement ? ` · last shipped ${formatDateTime(lastMovement)}` : ''}`
            : 'No shipped work yet.'}
        </p>
      </article>
    </div>
  );
}
