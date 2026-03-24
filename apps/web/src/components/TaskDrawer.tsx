import type { Artifact, Comment, Task } from '../lib/types';
import { formatDateTime, formatScore, parseRationale } from '../lib/format';

interface TaskDrawerProps {
  task: Task | null;
  artifact?: Artifact | null;
  comments: Comment[];
  onClose: () => void;
  onApprove: (taskId: string) => void;
}

const humanize = (value: string) => value.replaceAll('_', ' ');

export function TaskDrawer({ task, artifact, comments, onClose, onApprove }: TaskDrawerProps) {
  if (!task) return null;

  const rationale = parseRationale(task.rationale);
  const boardTrail = [...task.movement_history].reverse();

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Task detail</p>
            <h2>{task.title}</h2>
          </div>
          <div className="drawer-header-actions">
            <span className={`pill subtle drawer-pill ${task.status}`}>{humanize(task.status)}</span>
            <button className="ghost-button" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <div className="drawer-body">
          <section className="decision-card">
            <div>
              <p className="eyebrow">Decision surface</p>
              <h3>{artifact ? 'Artifact ready for founder review' : 'Task ready for board review'}</h3>
              <p className="summary-copy">
                {artifact
                  ? 'This task already produced a draft artifact. Review the brief, check the rationale, and approve only if the language feels founder-usable.'
                  : 'Use this drawer to understand why the task exists, what outcome it supports, and whether it deserves attention on the board.'}
              </p>
            </div>
            {artifact ? (
              <div className="decision-actions">
                <span className={`pill subtle ${artifact.status}`}>{humanize(artifact.status)}</span>
                <button className="primary-button secondary" type="button" onClick={() => onApprove(task.id)}>
                  Approve brief
                </button>
              </div>
            ) : null}
          </section>

          <p className="summary-copy">{task.description}</p>

          <div className="drawer-grid">
            <div><span>Type</span><strong>{humanize(task.type)}</strong></div>
            <div><span>Source</span><strong>{task.source}</strong></div>
            <div><span>Status</span><strong>{humanize(task.status)}</strong></div>
            <div><span>Priority</span><strong>{formatScore(task.priority_score)}</strong></div>
          </div>

          <section className="score-card">
            <div className="drawer-grid muted-grid">
              <div><span>Impact</span><strong>{task.impact}</strong></div>
              <div><span>Effort</span><strong>{task.effort}</strong></div>
              <div><span>Confidence</span><strong>{task.confidence}</strong></div>
              <div><span>Goal fit</span><strong>{task.goal_fit}</strong></div>
            </div>
            <p className="score-formula">Priority score = impact x confidence x goal fit / effort</p>
          </section>

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
            <h3>Board trail</h3>
            <div className="history-list">
              {boardTrail.map((movement, index) => (
                <article key={`${movement.at}-${index}`} className="history-item">
                  <strong>{movement.from ? `${humanize(movement.from)} -> ${humanize(movement.to)}` : `Created in ${humanize(movement.to)}`}</strong>
                  <p>{movement.reason}</p>
                  <span>{formatDateTime(movement.at)}</span>
                </article>
              ))}
            </div>
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
