import { useState } from 'react';
import type { Approval, Artifact, Task } from '../lib/types';
import { formatDateTime } from '../lib/format';

interface ApprovalQueueProps {
  approvals: Approval[];
  artifacts: Artifact[];
  decisionErrorByTaskId: Record<string, string>;
  pendingApproveTaskId?: string | null;
  pendingRejectTaskId?: string | null;
  tasks: Task[];
  onApprove: (taskId: string) => Promise<boolean>;
  onReject: (taskId: string, note?: string) => Promise<boolean>;
}

export function ApprovalQueue({
  approvals,
  artifacts,
  decisionErrorByTaskId,
  pendingApproveTaskId,
  pendingRejectTaskId,
  tasks,
  onApprove,
  onReject,
}: ApprovalQueueProps) {
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const pendingApprovals = approvals.filter((approval) => approval.status === 'pending');
  const approvalsWithTasks = pendingApprovals.map((approval) => ({
    approval,
    task: tasks.find((item) => item.id === approval.taskId),
    artifact: artifacts.find((item) => item.taskId === approval.taskId),
  }));

  return (
    <section className="panel approval-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Awaiting your decision</p>
          <h2>Briefs blocked on you</h2>
        </div>
        <span className="pill">{pendingApprovals.length} pending</span>
      </div>
      <div className="approval-stack">
        {approvalsWithTasks.length ? approvalsWithTasks.map(({ approval, task, artifact }) => {
          const isApproving = pendingApproveTaskId === approval.taskId;
          const isRejecting = pendingRejectTaskId === approval.taskId;
          const note = rejectNotes[approval.taskId] ?? '';
          const isBusy = isApproving || isRejecting;

          return (
            <article key={approval.id} className="approval-card approval-card-expanded">
              <div className="approval-content">
                <strong>{task?.title ?? approval.taskId}</strong>
                <p>{approval.note ?? 'Founder review required before this brief moves forward.'}</p>
                <span>{formatDateTime(approval.requestedAt)}</span>
                <label className="approval-note-field">
                  Rejection note <span className="field-optional">Optional</span>
                  <textarea
                    disabled={isBusy}
                    rows={3}
                    value={note}
                    onChange={(event) => setRejectNotes((current) => ({ ...current, [approval.taskId]: event.target.value }))}
                    placeholder="Tell the agent exactly what needs to change before this brief is useful."
                  />
                </label>
                {decisionErrorByTaskId[approval.taskId] ? <p className="inline-error">{decisionErrorByTaskId[approval.taskId]}</p> : null}
              </div>
              <div className="approval-actions approval-actions-column">
                {artifact ? <span className={`pill subtle ${artifact.status}`}>{artifact.status.replace('_', ' ')}</span> : null}
                <button
                  className="primary-button secondary"
                  type="button"
                  disabled={isBusy}
                  onClick={async () => { await onApprove(approval.taskId); }}
                >
                  {isApproving ? 'Approving...' : 'Approve & ship →'}
                </button>
                <button
                  className="ghost-button danger-button"
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    const rejected = await onReject(approval.taskId, note);
                    if (rejected) setRejectNotes((current) => ({ ...current, [approval.taskId]: '' }));
                  }}
                >
                  {isRejecting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </article>
          );
        }) : <p>Nothing blocked on you. The system is moving.</p>}
      </div>
    </section>
  );
}
