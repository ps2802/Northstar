import { useMemo, useState } from 'react';
import { formatDateTime, parseRationale } from '../lib/format';
import type { Approval, Artifact, Task } from '../lib/types';

type ApprovalFilter = 'pending' | 'approved' | 'rejected';
type ApprovalRecord = { approval: Approval; task: Task; artifact?: Artifact };

interface ApprovalQueueProps {
  approvals: Approval[];
  artifacts: Artifact[];
  decisionErrorByTaskId: Record<string, string>;
  disabledReason?: string | null;
  mutationsAllowed?: boolean;
  pendingApproveTaskId?: string | null;
  pendingRejectTaskId?: string | null;
  tasks: Task[];
  onApprove: (taskId: string) => Promise<boolean>;
  onReject: (taskId: string, note?: string) => Promise<boolean>;
  onTaskOpen: (task: Task) => void;
}

const humanize = (value: string) => value.replaceAll('_', ' ');

const compactText = (value: string, maxLength = 120) => {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
};

const getPreview = (artifact?: Artifact) => {
  if (!artifact) {
    return 'Preview not available yet.';
  }

  if (artifact.summary?.trim()) {
    return compactText(artifact.summary, 160);
  }

  const excerpt = artifact.content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  return compactText(excerpt ?? 'Open the approval to inspect the full draft.', 160);
};

const getRequestedBy = (task: Task) => (task.actor === 'northstar' ? 'Northstar' : 'Founder');

const getDueLabel = (approval: Approval) => {
  if (approval.status !== 'pending') {
    return null;
  }

  const hoursOpen = (Date.now() - Date.parse(approval.requestedAt)) / 3_600_000;
  if (hoursOpen >= 24) {
    return 'Overdue';
  }

  if (hoursOpen >= 4) {
    return 'Review today';
  }

  return null;
};

export function ApprovalQueue({
  approvals,
  artifacts,
  decisionErrorByTaskId,
  disabledReason,
  mutationsAllowed = true,
  pendingApproveTaskId,
  pendingRejectTaskId,
  tasks,
  onApprove,
  onReject,
  onTaskOpen,
}: ApprovalQueueProps) {
  const [activeFilter, setActiveFilter] = useState<ApprovalFilter>('pending');

  const records = useMemo(() => approvals.reduce<ApprovalRecord[]>((all, approval) => {
    const task = tasks.find((item) => item.id === approval.taskId);
    if (!task) {
      return all;
    }

    all.push({
      approval,
      task,
      artifact: artifacts.find((artifact) => artifact.taskId === approval.taskId),
    });
    return all;
  }, []).sort((left, right) => Date.parse(right.approval.requestedAt) - Date.parse(left.approval.requestedAt)), [approvals, artifacts, tasks]);

  const counts = useMemo(() => ({
    pending: records.filter((record) => record.approval.status === 'pending').length,
    approved: records.filter((record) => record.approval.status === 'approved').length,
    rejected: records.filter((record) => record.approval.status === 'rejected').length,
  }), [records]);

  const filteredRecords = records.filter((record) => record.approval.status === activeFilter);

  const filterOptions: Array<{ key: ApprovalFilter; label: string; count: number }> = [
    { key: 'pending', label: 'Waiting on me', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Changes requested', count: counts.rejected },
  ];

  return (
    <section className="rail-card approval-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Approvals</p>
          <h2>Review queue</h2>
        </div>
        <div className="approval-filter-row" role="tablist" aria-label="Approval states">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              className={`approval-filter-pill ${activeFilter === option.key ? 'approval-filter-pill-active' : ''}`}
              type="button"
              onClick={() => setActiveFilter(option.key)}
            >
              <span>{option.label}</span>
              <strong>{option.count}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="approval-list">
        {!mutationsAllowed && disabledReason ? <div className="drawer-truth-banner">{disabledReason}</div> : null}
        {filteredRecords.length ? filteredRecords.map(({ approval, artifact, task }) => {
          const rationale = parseRationale(task.rationale);
          const whyItMatters = compactText(
            rationale.businessOutcome || rationale.whyPriority || task.description || 'Founder review is required before this work can move.',
            120,
          );
          const isApproving = pendingApproveTaskId === task.id;
          const isRejecting = pendingRejectTaskId === task.id;
          const isBusy = isApproving || isRejecting;
          const dueLabel = getDueLabel(approval);
          const statusLabel = approval.status === 'rejected' ? 'Changes requested' : approval.status === 'approved' ? 'Approved' : 'Waiting on me';

          return (
            <article key={approval.id} className="approval-review-card">
              <div className="approval-review-head">
                <div>
                  <h3>{task.title}</h3>
                  <p className="approval-review-why">{whyItMatters}</p>
                </div>
                <span className={`status-chip ${approval.status === 'rejected' ? 'blocked' : approval.status === 'approved' ? 'done' : 'waiting_for_approval'}`}>
                  {statusLabel}
                </span>
              </div>

              <div className="approval-review-meta">
                <span>{humanize(artifact?.type ?? task.type)}</span>
                <span>Requested by {getRequestedBy(task)}</span>
                <span>{formatDateTime(approval.requestedAt)}</span>
                {dueLabel ? <span>{dueLabel}</span> : null}
              </div>

              <p className="approval-review-preview">{getPreview(artifact)}</p>

              {decisionErrorByTaskId[task.id] ? <p className="inline-error">{decisionErrorByTaskId[task.id]}</p> : null}

              <div className="approval-review-actions">
                <button className="ghost-button" type="button" onClick={() => onTaskOpen(task)}>
                  Preview
                </button>
                {approval.status === 'pending' ? (
                  <>
                    <button
                      className="primary-button secondary"
                      type="button"
                      disabled={isBusy || !mutationsAllowed}
                      onClick={async () => {
                        await onApprove(task.id);
                      }}
                    >
                      {isApproving ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      className="ghost-button danger-button"
                      type="button"
                      disabled={isBusy || !mutationsAllowed}
                      onClick={async () => {
                        await onReject(task.id);
                      }}
                    >
                      {isRejecting ? 'Requesting...' : 'Request changes'}
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        }) : (
          <article className="approval-empty-state">
            <strong>No items in this review state.</strong>
            <p>New approvals will show up here as soon as Northstar creates or routes them.</p>
          </article>
        )}
      </div>
    </section>
  );
}
