import { useEffect, useState } from 'react';
import type { Approval, Artifact, Comment, Task } from '../lib/types';
import { formatDateTime, formatScore, parseRationale } from '../lib/format';

interface TaskDrawerProps {
  approval?: Approval | null;
  approveLoading?: boolean;
  artifact?: Artifact | null;
  commentError?: string | null;
  commentLoading?: boolean;
  comments: Comment[];
  decisionError?: string | null;
  executeLoading?: boolean;
  onAddComment: (taskId: string, body: string) => Promise<boolean>;
  onApprove: (taskId: string) => Promise<boolean>;
  onClose: () => void;
  onExecute: (taskId: string) => Promise<boolean>;
  onReject: (taskId: string, note?: string) => Promise<boolean>;
  rejectLoading?: boolean;
  task: Task | null;
}

const humanize = (value: string) => value.replaceAll('_', ' ');

export function TaskDrawer({
  approval,
  approveLoading,
  artifact,
  commentError,
  commentLoading,
  comments,
  decisionError,
  executeLoading,
  onAddComment,
  onApprove,
  onClose,
  onExecute,
  onReject,
  rejectLoading,
  task,
}: TaskDrawerProps) {
  const [commentBody, setCommentBody] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');

  useEffect(() => {
    setCommentBody('');
    setRejectionNote('');
  }, [task?.id]);

  if (!task) return null;

  const rationale = parseRationale(task.rationale);
  const boardTrail = [...task.movement_history].reverse();
  const approvalPending = approval?.status === 'pending';
  const canExecute = task.type === 'blog_brief' && !artifact;
  const decisionBusy = Boolean(executeLoading || approveLoading || rejectLoading);

  const decisionTitle = artifact
    ? approvalPending
      ? 'Brief ready for founder review'
      : artifact.status === 'approved'
        ? 'Brief approved'
        : artifact.status === 'rejected'
          ? 'Brief rejected'
          : 'Brief generated'
    : canExecute
      ? 'Blog brief ready to execute'
      : 'Task ready for founder review';

  const decisionCopy = artifact
    ? approvalPending
      ? 'Review the draft, then approve it or reject it with guidance so the next pass has concrete founder feedback.'
      : artifact.status === 'approved'
        ? 'This brief has already been approved and the task can stay marked as complete.'
        : artifact.status === 'rejected'
          ? 'This brief was rejected. Keep the artifact visible for reference, and use the note or comments to guide the next revision.'
          : 'The artifact exists, but there is no pending approval attached to it right now.'
    : canExecute
      ? 'This is the only executable task type in v1. Running it will generate a blog brief, create an approval item, and move the task into founder review.'
      : 'Only blog brief tasks are executable in v1. Other task types can still be prioritized, discussed, and moved across the board, but they are not runnable yet.';

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
              <h3>{decisionTitle}</h3>
              <p className="summary-copy">{decisionCopy}</p>
              {approval?.note ? <p className="summary-copy decision-note">Latest note: {approval.note}</p> : null}
              {decisionError ? <p className="inline-error">{decisionError}</p> : null}
            </div>
            <div className="decision-actions decision-actions-column">
              {artifact ? <span className={`pill subtle ${artifact.status}`}>{humanize(artifact.status)}</span> : null}
              {canExecute ? (
                <button
                  className="primary-button secondary"
                  type="button"
                  disabled={decisionBusy}
                  onClick={async () => {
                    await onExecute(task.id);
                  }}
                >
                  {executeLoading ? 'Executing...' : 'Execute brief'}
                </button>
              ) : null}
              {artifact && approvalPending ? (
                <>
                  <label className="approval-note-field">
                    Rejection note <span className="field-optional">Optional</span>
                    <textarea
                      disabled={decisionBusy}
                      rows={3}
                      value={rejectionNote}
                      onChange={(event) => setRejectionNote(event.target.value)}
                      placeholder="Tell the agent what is missing or off before you reject this brief."
                    />
                  </label>
                  <button
                    className="primary-button secondary"
                    type="button"
                    disabled={decisionBusy}
                    onClick={async () => {
                      await onApprove(task.id);
                    }}
                  >
                    {approveLoading ? 'Approving...' : 'Approve draft'}
                  </button>
                  <button
                    className="ghost-button danger-button"
                    type="button"
                    disabled={decisionBusy}
                    onClick={async () => {
                      const rejected = await onReject(task.id, rejectionNote);
                      if (rejected) {
                        setRejectionNote('');
                      }
                    }}
                  >
                    {rejectLoading ? 'Rejecting...' : 'Reject draft'}
                  </button>
                </>
              ) : null}
            </div>
          </section>

          <p className="summary-copy">{task.description || 'No manual description was added for this task.'}</p>

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
            <p>{rationale.whyPriority || 'Priority comes from the current score and where this task sits in the board right now.'}</p>
          </section>
          <section>
            <h3>Business outcome</h3>
            <p>{rationale.businessOutcome || 'This task should improve a concrete acquisition, conversion, or positioning outcome for the company.'}</p>
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
            <div className="section-heading comment-heading">
              <div>
                <h3>Comments</h3>
                <p className="summary-copy">Use comments for founder feedback that should persist with the task.</p>
              </div>
            </div>
            <form
              className="comment-composer"
              onSubmit={async (event) => {
                event.preventDefault();
                const nextBody = commentBody.trim();
                if (!nextBody) {
                  return;
                }

                const added = await onAddComment(task.id, nextBody);
                if (added) {
                  setCommentBody('');
                }
              }}
            >
              <textarea
                disabled={commentLoading}
                rows={3}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder="Add founder context, approval feedback, or execution guidance."
              />
              <div className="comment-composer-actions">
                {commentError ? <p className="inline-error">{commentError}</p> : null}
                <button className="primary-button" type="submit" disabled={commentLoading || !commentBody.trim()}>
                  {commentLoading ? 'Adding comment...' : 'Add comment'}
                </button>
              </div>
            </form>
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
