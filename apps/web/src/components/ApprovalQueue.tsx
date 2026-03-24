import type { Approval, Artifact, Task } from '../lib/types';
import { formatDateTime } from '../lib/format';

interface ApprovalQueueProps {
  approvals: Approval[];
  tasks: Task[];
  artifacts: Artifact[];
  onApprove: (taskId: string) => void;
}

export function ApprovalQueue({ approvals, tasks, artifacts, onApprove }: ApprovalQueueProps) {
  const approvalsWithTasks = approvals.map((approval) => ({
    approval,
    task: tasks.find((item) => item.id === approval.taskId),
    artifact: artifacts.find((item) => item.taskId === approval.taskId),
  }));

  return (
    <section className="panel approval-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Approval queue</p>
          <h2>Blog briefs waiting on founder review</h2>
        </div>
        <span className="pill">{approvals.filter((item) => item.status === 'pending').length} pending</span>
      </div>
      <div className="approval-stack">
        {approvalsWithTasks.length ? approvalsWithTasks.map(({ approval, task, artifact }) => (
          <article key={approval.id} className="approval-card">
            <div>
              <strong>{task?.title ?? approval.taskId}</strong>
              <p>{approval.note}</p>
              <span>{formatDateTime(approval.requestedAt)}</span>
            </div>
            <div className="approval-actions">
              {artifact ? <span className={`pill subtle ${artifact.status}`}>{artifact.status}</span> : null}
              <button className="primary-button secondary" type="button" onClick={() => onApprove(approval.taskId)}>
                Approve
              </button>
            </div>
          </article>
        )) : <p>No approval items are waiting right now.</p>}
      </div>
    </section>
  );
}
