import type { Approval, Artifact, Task } from '../lib/types';
import { formatDateTime } from '../lib/format';

interface ApprovalQueueProps {
  approvals: Approval[];
  artifacts: Artifact[];
  decisionErrorByTaskId: Record<string, string>;
  pendingApproveTaskId?: string | null;
  pendingExecuteTaskId?: string | null;
  pendingRejectTaskId?: string | null;
  tasks: Task[];
  onApprove: (taskId: string) => Promise<boolean>;
  onReject: (taskId: string, note?: string) => Promise<boolean>;
  onRequestRevision: (taskId: string) => Promise<boolean>;
  onTaskOpen: (task: Task) => void;
}

export function ApprovalQueue({
  approvals,
  artifacts,
  decisionErrorByTaskId,
  pendingApproveTaskId,
  pendingExecuteTaskId,
  pendingRejectTaskId,
  tasks,
  onApprove,
  onReject,
  onRequestRevision,
  onTaskOpen,
}: ApprovalQueueProps) {
  const pendingApprovals = approvals.filter((approval) => approval.status === 'pending');
  const approvalsWithTasks = pendingApprovals.map((approval) => ({
    approval,
    task: tasks.find((item) => item.id === approval.taskId),
    artifact: artifacts.find((item) => item.taskId === approval.taskId),
  }));

  const rejectedWithTasks = approvals
    .filter((approval) => approval.status === 'rejected')
    .map((approval) => ({
      approval,
      task: tasks.find((item) => item.id === approval.taskId),
      artifact: artifacts.find((item) => item.taskId === approval.taskId),
    }))
    .filter((item) => item.task && item.artifact?.status === 'rejected')
    .slice(0, 3);

  return (
    <section className="rail-card approval-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Founder approval lane</p>
          <h2>Review before anything moves</h2>
        </div>
        <span className="domain-badge">{pendingApprovals.length} pending</span>
      </div>

      <div className="approval-stack">
        {approvalsWithTasks.length ? approvalsWithTasks.map(({ approval, task, artifact }) => {
          const isApproving = pendingApproveTaskId === approval.taskId;
          const isRejecting = pendingRejectTaskId === approval.taskId;
          const isBusy = isApproving || isRejecting;

          return (
            <article key={approval.id} className="approval-card">
              <div className="approval-card-head">
                <div>
                  <strong>{task?.title ?? approval.taskId}</strong>
                  <p>{approval.note ?? 'Founder review is required before this artifact can move forward.'}</p>
                </div>
                <div className="approval-artifact-meta">
                  {artifact?.channel ? <span className="domain-badge">{artifact.channel}</span> : null}
                  {artifact ? <span className={`status-chip ${artifact.status}`}>{artifact.status.replace('_', ' ')}</span> : null}
                </div>
              </div>

              <span className="approval-timestamp">Requested {formatDateTime(approval.requestedAt)}</span>
              <p className="approval-helper-copy">
                {artifact
                  ? `${artifact.type.replaceAll('_', ' ')} is ${artifact.deliveryStage.replaceAll('_', ' ')}.`
                  : 'Open the task if the rejection needs a revision note.'}
              </p>

              {decisionErrorByTaskId[approval.taskId] ? <p className="inline-error">{decisionErrorByTaskId[approval.taskId]}</p> : null}

              <div className="approval-actions">
                {task ? (
                  <button className="ghost-button" type="button" onClick={() => onTaskOpen(task)}>
                    Open task
                  </button>
                ) : null}
                <button
                  className="primary-button secondary"
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    await onApprove(approval.taskId);
                  }}
                >
                  {isApproving ? 'Approving...' : artifact?.deliveryStage === 'ready_to_send' ? 'Approve send' : 'Approve asset'}
                </button>
                <button
                  className="ghost-button danger-button"
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    await onReject(approval.taskId);
                  }}
                >
                  {isRejecting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </article>
          );
        }) : <p className="empty-copy">No approval items are waiting right now.</p>}
      </div>

      {rejectedWithTasks.length ? (
        <div className="approval-revision-stack">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Revision loop</p>
              <h3>Rejected work waiting for a new pass</h3>
            </div>
          </div>

          {rejectedWithTasks.map(({ approval, task, artifact }) => {
            if (!task || !artifact) {
              return null;
            }

            return (
              <article key={approval.id} className="approval-card approval-card-muted">
                <div className="approval-card-head">
                  <div>
                    <strong>{task.title}</strong>
                    <p>{approval.note ?? 'Founder feedback is available on the rejected draft.'}</p>
                  </div>
                  <span className={`status-chip ${artifact.status}`}>{artifact.status.replace('_', ' ')}</span>
                </div>
                <span className="approval-timestamp">Rejected {approval.decidedAt ? formatDateTime(approval.decidedAt) : formatDateTime(approval.requestedAt)}</span>
                {decisionErrorByTaskId[task.id] ? <p className="inline-error">{decisionErrorByTaskId[task.id]}</p> : null}
                <div className="approval-actions">
                  <button className="ghost-button" type="button" onClick={() => onTaskOpen(task)}>
                    Open task
                  </button>
                  <button
                    className="primary-button secondary"
                    type="button"
                    disabled={pendingExecuteTaskId === task.id}
                    onClick={async () => {
                      await onRequestRevision(task.id);
                    }}
                  >
                    {pendingExecuteTaskId === task.id ? 'Generating...' : 'Generate revision'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
