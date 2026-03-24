import type { Artifact, Comment, Task } from '../lib/types';
import { formatDateTime, formatScore, parseRationale } from '../lib/format';

interface TaskDrawerProps {
  task: Task | null;
  artifact?: Artifact | null;
  comments: Comment[];
  onClose: () => void;
  onApprove: (taskId: string) => void;
}

export function TaskDrawer({ task, artifact, comments, onClose, onApprove }: TaskDrawerProps) {
  if (!task) return null;

  const rationale = parseRationale(task.rationale);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Task detail</p>
            <h2>{task.title}</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="drawer-body">
          <p className="summary-copy">{task.description}</p>
          <div className="drawer-grid">
            <div><span>Type</span><strong>{task.type.replaceAll('_', ' ')}</strong></div>
            <div><span>Status</span><strong>{task.status.replaceAll('_', ' ')}</strong></div>
            <div><span>Priority</span><strong>{formatScore(task.priority_score)}</strong></div>
            <div><span>Source</span><strong>{task.source}</strong></div>
          </div>
          <div className="drawer-grid muted-grid">
            <div><span>Impact</span><strong>{task.impact}</strong></div>
            <div><span>Effort</span><strong>{task.effort}</strong></div>
            <div><span>Confidence</span><strong>{task.confidence}</strong></div>
            <div><span>Goal fit</span><strong>{task.goal_fit}</strong></div>
          </div>
          <section>
            <h3>Why this exists</h3>
            <p>{rationale.whyExists || task.rationale}</p>
          </section>
          <section>
            <h3>Why this priority</h3>
            <p>{rationale.whyPriority || 'Priority was derived from the current score and board context.'}</p>
          </section>
          <section>
            <h3>Business outcome</h3>
            <p>{rationale.businessOutcome || 'This task should improve an acquisition, conversion, or positioning outcome for the company.'}</p>
          </section>
          <section>
            <h3>Dependencies</h3>
            <p>{task.dependencies.length ? task.dependencies.join(', ') : 'None'}</p>
          </section>
          <section>
            <h3>Timeline</h3>
            <p>Created {formatDateTime(task.created_at)}</p>
            <p>Updated {formatDateTime(task.updated_at)}</p>
          </section>
          {artifact ? (
            <section className="artifact-inline">
              <div className="section-heading">
                <h3>Generated artifact</h3>
                <button className="primary-button secondary" type="button" onClick={() => onApprove(task.id)}>
                  Approve brief
                </button>
              </div>
              <p className="artifact-status">{artifact.status.replace('_', ' ')}</p>
            </section>
          ) : null}
          <section>
            <h3>Comments</h3>
            <div className="comment-stack">
              {comments.length ? comments.map((comment) => (
                <article key={comment.id} className="comment-card">
                  <strong>{comment.author}</strong>
                  <p>{comment.body}</p>
                  <span>{formatDateTime(comment.createdAt)}</span>
                </article>
              )) : <p>No comments yet.</p>}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
