import { useEffect, useMemo, useState } from 'react';
import { buildCampaigns } from '../lib/campaigns';
import { formatDateTime } from '../lib/format';
import type {
  AgentRun,
  Approval,
  Artifact,
  CampaignStatus,
  FounderIntake,
  Goal,
  Initiative,
  Task,
} from '../lib/types';

interface CampaignsPanelProps {
  agentRuns: AgentRun[];
  approvals: Approval[];
  artifacts: Artifact[];
  founderIntake: FounderIntake | null;
  goals: Goal[];
  initiatives: Initiative[];
  tasks: Task[];
  onTaskOpen: (task: Task) => void;
}

const humanize = (value: string) => value.replaceAll('_', ' ');

const compactText = (value: string, maxLength = 140) => {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
};

const campaignTone: Record<CampaignStatus, string> = {
  active: 'in_progress',
  waiting: 'waiting_for_approval',
  blocked: 'blocked',
  planned: 'planned',
  done: 'done',
};

export function CampaignsPanel({
  agentRuns,
  approvals,
  artifacts,
  founderIntake,
  goals,
  initiatives,
  tasks,
  onTaskOpen,
}: CampaignsPanelProps) {
  const campaigns = useMemo(
    () => buildCampaigns({ agentRuns, approvals, artifacts, founderIntake, goals, initiatives, tasks }),
    [agentRuns, approvals, artifacts, founderIntake, goals, initiatives, tasks],
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    if (!campaigns.length) {
      setSelectedCampaignId(null);
      return;
    }

    setSelectedCampaignId((current) => campaigns.some((campaign) => campaign.id === current) ? current : campaigns[0].id);
  }, [campaigns]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const selectedTasks = selectedCampaign ? tasks.filter((task) => selectedCampaign.linkedTaskIds.includes(task.id)) : [];
  const selectedArtifacts = selectedCampaign ? artifacts.filter((artifact) => selectedCampaign.linkedOutputIds.includes(artifact.id)) : [];
  const selectedApprovals = selectedCampaign ? approvals.filter((approval) => selectedCampaign.linkedApprovalIds.includes(approval.id)) : [];
  const selectedRuns = selectedCampaign ? agentRuns.filter((run) => selectedCampaign.linkedRunIds.includes(run.id)) : [];

  return (
    <section className="campaign-shell">
      <section className="rail-card section-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Campaigns</p>
            <h2>Grouped execution</h2>
          </div>
        </div>

        <div className="campaign-list">
          {campaigns.length ? campaigns.map((campaign) => (
            <button
              key={campaign.id}
              className={`campaign-card ${selectedCampaignId === campaign.id ? 'campaign-card-active' : ''}`}
              type="button"
              onClick={() => setSelectedCampaignId(campaign.id)}
            >
              <div className="campaign-card-head">
                <div>
                  <h3>{campaign.name}</h3>
                  <p>{compactText(campaign.objective, 120)}</p>
                </div>
                <span className={`status-chip ${campaignTone[campaign.status]}`}>{humanize(campaign.status)}</span>
              </div>

              <dl className="campaign-card-grid">
                <div>
                  <dt>Channel</dt>
                  <dd>{campaign.channel}</dd>
                </div>
                <div>
                  <dt>Audience</dt>
                  <dd>{compactText(campaign.audience, 84)}</dd>
                </div>
                <div>
                  <dt>Primary metric</dt>
                  <dd>{campaign.primaryMetric}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDateTime(campaign.updated_at)}</dd>
                </div>
              </dl>

              <div className="campaign-card-counters">
                <span>{campaign.linkedRunIds.length} runs</span>
                <span>{campaign.linkedOutputIds.length} outputs</span>
                <span>{campaign.linkedApprovalIds.length} approvals</span>
              </div>
            </button>
          )) : (
            <article className="campaign-empty-state">
              <strong>No campaigns are grouped yet.</strong>
              <p>The campaigns surface will populate as soon as initiatives link to real board work.</p>
            </article>
          )}
        </div>
      </section>

      <section className="rail-card section-card campaign-detail">
        {selectedCampaign ? (
          <>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Campaign detail</p>
                <h2>{selectedCampaign.name}</h2>
              </div>
              <span className={`status-chip ${campaignTone[selectedCampaign.status]}`}>{humanize(selectedCampaign.status)}</span>
            </div>

            <section className="campaign-summary-grid">
              <article className="detail-card">
                <p className="eyebrow">Objective</p>
                <p>{selectedCampaign.objective}</p>
              </article>
              <article className="detail-card">
                <p className="eyebrow">Audience</p>
                <p>{selectedCampaign.audience}</p>
              </article>
              <article className="detail-card">
                <p className="eyebrow">Channel</p>
                <p>{selectedCampaign.channel}</p>
              </article>
              <article className="detail-card">
                <p className="eyebrow">Primary metric</p>
                <p>{selectedCampaign.primaryMetric}</p>
              </article>
            </section>

            <div className="campaign-summary-strip">
              <span>{selectedTasks.length} tasks</span>
              <span>{selectedRuns.length} runs</span>
              <span>{selectedArtifacts.length} outputs</span>
              <span>{selectedApprovals.length} approvals</span>
              <span>Updated {formatDateTime(selectedCampaign.updated_at)}</span>
            </div>

            <section className="campaign-detail-grid">
              <article className="detail-card campaign-detail-span">
                <div className="detail-card-head">
                  <div>
                    <p className="eyebrow">Board work</p>
                    <h3>Linked tasks</h3>
                  </div>
                </div>
                <div className="campaign-linked-list">
                  {selectedTasks.length ? selectedTasks.map((task) => (
                    <button key={task.id} className="campaign-linked-item task-open" type="button" onClick={() => onTaskOpen(task)}>
                      <div>
                        <strong>{task.title}</strong>
                        <p>{compactText(task.description || task.rationale, 96)}</p>
                      </div>
                      <span className={`status-chip ${task.status}`}>{humanize(task.status)}</span>
                    </button>
                  )) : <p className="empty-copy">No linked tasks yet.</p>}
                </div>
              </article>

              <article className="detail-card">
                <div className="detail-card-head">
                  <div>
                    <p className="eyebrow">Outputs</p>
                    <h3>Generated assets</h3>
                  </div>
                </div>
                <div className="campaign-linked-list">
                  {selectedArtifacts.length ? selectedArtifacts.map((artifact) => (
                    <article key={artifact.id} className="campaign-linked-item-static">
                      <div>
                        <strong>{artifact.title}</strong>
                        <p>{humanize(artifact.type)}</p>
                      </div>
                      <span className={`status-chip ${artifact.status === 'rejected' ? 'blocked' : artifact.status === 'approved' || artifact.status === 'published' || artifact.status === 'sent' ? 'done' : artifact.status === 'ready_to_send' ? 'waiting_for_approval' : 'planned'}`}>
                        {humanize(artifact.status)}
                      </span>
                    </article>
                  )) : <p className="empty-copy">No outputs linked yet.</p>}
                </div>
              </article>

              <article className="detail-card">
                <div className="detail-card-head">
                  <div>
                    <p className="eyebrow">Approvals</p>
                    <h3>Review state</h3>
                  </div>
                </div>
                <div className="campaign-linked-list">
                  {selectedApprovals.length ? selectedApprovals.map((approval) => (
                    <article key={approval.id} className="campaign-linked-item-static">
                      <div>
                        <strong>{approval.status === 'rejected' ? 'Changes requested' : humanize(approval.status)}</strong>
                        <p>{compactText(approval.note || `Requested ${formatDateTime(approval.requestedAt)}`, 96)}</p>
                      </div>
                      <span className={`status-chip ${approval.status === 'rejected' ? 'blocked' : approval.status === 'approved' ? 'done' : 'waiting_for_approval'}`}>
                        {approval.status === 'rejected' ? 'Changes requested' : humanize(approval.status)}
                      </span>
                    </article>
                  )) : <p className="empty-copy">No approvals linked yet.</p>}
                </div>
              </article>

              <article className="detail-card">
                <div className="detail-card-head">
                  <div>
                    <p className="eyebrow">Runs</p>
                    <h3>Execution trace</h3>
                  </div>
                </div>
                <div className="campaign-linked-list">
                  {selectedRuns.length ? selectedRuns.map((run) => (
                    <article key={run.id} className="campaign-linked-item-static">
                      <div>
                        <strong>{compactText(run.summary, 72)}</strong>
                        <p>{formatDateTime(run.finishedAt ?? run.startedAt)}</p>
                      </div>
                      <span className={`status-chip ${run.status === 'running' ? 'in_progress' : run.status === 'completed' ? 'done' : run.status === 'failed' ? 'blocked' : 'planned'}`}>
                        {humanize(run.status)}
                      </span>
                    </article>
                  )) : <p className="empty-copy">No runs linked yet.</p>}
                </div>
              </article>
            </section>
          </>
        ) : (
          <article className="campaign-empty-state">
            <strong>No campaign selected.</strong>
            <p>Select a campaign to inspect its work, outputs, approvals, and runs.</p>
          </article>
        )}
      </section>
    </section>
  );
}
