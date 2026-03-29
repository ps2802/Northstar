import { useEffect, useState } from 'react';
import type { Approval, Artifact, Comment, FounderIntake, Integration, Task, WorkspaceTruth } from '../lib/types';
import { formatDateTime, formatScore, parseRationale } from '../lib/format';
import { executableTaskTypes } from '../lib/taskConfig';
import { ArtifactViewer } from './ArtifactViewer';

interface TaskDrawerProps {
  approval?: Approval | null;
  approvalView?: boolean;
  approveLoading?: boolean;
  artifact?: Artifact | null;
  commentError?: string | null;
  commentLoading?: boolean;
  comments: Comment[];
  decisionError?: string | null;
  disabledReason?: string | null;
  executeLoading?: boolean;
  founderIntake?: FounderIntake | null;
  integrations: Integration[];
  mutationsAllowed?: boolean;
  onAddComment: (taskId: string, body: string) => Promise<boolean>;
  onApprove: (taskId: string) => Promise<boolean>;
  onClose: () => void;
  onExecute: (taskId: string) => Promise<boolean>;
  onOpenConnections: () => void;
  onReject: (taskId: string, note?: string) => Promise<boolean>;
  rejectLoading?: boolean;
  task: Task | null;
  workspaceTruth: WorkspaceTruth;
}

const humanize = (value: string) => value.replaceAll('_', ' ');

const getConnectionNote = (task: Task, integrations: Integration[]) => {
  const deliveryConnection = integrations.find((integration) => (
    (task.channel === 'email' && integration.name === 'Gmail')
    || (task.channel === 'x' && integration.name === 'X')
    || (task.channel === 'instagram' && integration.name === 'Instagram')
    || ((task.category === 'content' || task.category === 'website') && integration.name === 'Google Drive')
    || (task.category === 'seo' && integration.name === 'Search Console')
  ));

  if (!deliveryConnection) {
    return null;
  }

  if (deliveryConnection.status === 'connected') {
    return `${deliveryConnection.name} access is saved but still unverified. Anything outside the board should be treated as manual until validation exists.`;
  }

  if (deliveryConnection.status === 'needs_key') {
    return `${deliveryConnection.name} credentials are still missing. External delivery or sync stays blocked.`;
  }

  return `${deliveryConnection.name} is not set up yet. External delivery or sync stays blocked.`;
};

const getWorkspaceReadOnlyCopy = (workspaceTruth: WorkspaceTruth, disabledReason?: string | null) => {
  if (disabledReason) {
    return disabledReason;
  }

  if (workspaceTruth.source === 'cached') {
    return 'This drawer is showing cached stale state. Live changes are disabled until a valid founder session is restored.';
  }

  if (workspaceTruth.source === 'sample') {
    return 'This drawer is showing sample state only. Live changes are disabled.';
  }

  if (workspaceTruth.understanding === 'fallback') {
    return 'This workspace is still using fallback company understanding. Live changes are disabled until founder context is captured.';
  }

  return 'This workspace is not live yet. Live changes are disabled until a valid founder session exists.';
};

export function TaskDrawer({
  approval,
  approvalView = false,
  approveLoading,
  artifact,
  commentError,
  commentLoading,
  comments,
  decisionError,
  disabledReason,
  executeLoading,
  founderIntake,
  integrations,
  mutationsAllowed = true,
  onAddComment,
  onApprove,
  onClose,
  onExecute,
  onOpenConnections,
  onReject,
  rejectLoading,
  task,
  workspaceTruth,
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
  const canExecute = executableTaskTypes.has(task.type) && (!artifact || artifact.status === 'rejected');
  const decisionBusy = Boolean(executeLoading || approveLoading || rejectLoading);
  const decisionLocked = decisionBusy || !mutationsAllowed;
  const commentLocked = Boolean(commentLoading) || !mutationsAllowed;
  const executionLabel = task.outputLabel ?? humanize(task.type);
  const channelLabel = task.channel ? humanize(task.channel) : 'internal';
  const connectionNote = getConnectionNote(task, integrations);
  const readOnlyCopy = getWorkspaceReadOnlyCopy(workspaceTruth, disabledReason);

  let decisionTitle = 'Planning-only task';
  let decisionCopy = 'This task can be prioritized and discussed here, but it does not generate a live draft in the current founder UI.';

  if (artifact) {
    if (approvalPending) {
      decisionTitle = `${executionLabel} waiting for founder review`;
      decisionCopy = 'Review the draft, approve it, or request changes with explicit feedback.';
    } else if (artifact.status === 'rejected' && canExecute) {
      decisionTitle = `Revision requested for ${executionLabel}`;
      decisionCopy = mutationsAllowed
        ? 'The previous draft was rejected. Generate a tighter revision when you are ready.'
        : readOnlyCopy;
    } else if (artifact.status === 'approved') {
      decisionTitle = `${executionLabel} approved`;
      decisionCopy = 'This draft has already been approved and remains attached to the completed task.';
    } else if (artifact.status === 'rejected') {
      decisionTitle = `${executionLabel} rejected`;
      decisionCopy = 'The rejected draft stays visible here for reference until a later revision is requested.';
    } else {
      decisionTitle = `${executionLabel} saved`;
      decisionCopy = 'A draft exists for this task, but it is not currently waiting on a founder decision.';
    }
  } else if (canExecute) {
    decisionTitle = mutationsAllowed ? 'Generate blog brief draft' : 'Blog brief generation unavailable';
    decisionCopy = mutationsAllowed
      ? 'This is the only live generation path exposed in the founder UI. Running it creates a founder-review draft and approval item.'
      : readOnlyCopy;
  }

  if (approvalView) {
    const approvalGoal = rationale.businessOutcome || founderIntake?.mainGoal || 'Keep the draft aligned to the current company goal.';
    const approvalAudience = founderIntake?.icp || 'Audience is inferred from the current workspace context.';
    const approvalChannel = artifact?.channel ? humanize(artifact.channel) : channelLabel;
    const approvalStatusLabel = approval?.status === 'rejected'
      ? 'Changes requested'
      : approval?.status === 'approved'
        ? 'Approved'
        : approval?.status === 'pending'
          ? 'Waiting on me'
          : humanize(task.status);

    return (
      <div className="drawer-backdrop" onClick={onClose}>
        <aside className="drawer approval-drawer" onClick={(event) => event.stopPropagation()}>
          <header className="drawer-header">
            <div>
              <p className="eyebrow">Approval detail</p>
              <h2>{task.title}</h2>
            </div>
            <div className="drawer-header-actions">
              <span className={`status-chip ${approval?.status === 'rejected' ? 'blocked' : approval?.status === 'approved' ? 'done' : task.status}`}>{approvalStatusLabel}</span>
              <button className="ghost-button" type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </header>

          <div className="drawer-body approval-drawer-body">
            {!mutationsAllowed ? <div className="drawer-truth-banner">{readOnlyCopy}</div> : null}
            <ArtifactViewer artifact={artifact ?? null} embedded />

            <section className="approval-detail-grid">
              <article className="detail-card">
                <p className="eyebrow">Goal</p>
                <p>{approvalGoal}</p>
              </article>
              <article className="detail-card">
                <p className="eyebrow">Audience</p>
                <p>{approvalAudience}</p>
              </article>
              <article className="detail-card">
                <p className="eyebrow">Channel</p>
                <p>{approvalChannel}</p>
              </article>
              <article className="detail-card">
                <p className="eyebrow">Notes</p>
                <p>{approval?.note ?? 'No review note has been added yet.'}</p>
              </article>
            </section>

            {decisionError ? <p className="inline-error">{decisionError}</p> : null}

            {approval?.status === 'pending' ? (
              <section className="detail-card approval-decision-card">
                <label className="approval-note-field">
                  Request changes note <span className="field-optional">Optional</span>
                  <textarea
                    disabled={decisionLocked}
                    rows={3}
                    value={rejectionNote}
                    onChange={(event) => setRejectionNote(event.target.value)}
                    placeholder="Explain what needs to change before the next pass."
                  />
                </label>
                <div className="approval-detail-actions">
                  <button
                    className="primary-button secondary"
                    type="button"
                    disabled={decisionLocked}
                    onClick={async () => {
                      await onApprove(task.id);
                    }}
                  >
                    {approveLoading ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    className="ghost-button danger-button"
                    type="button"
                    disabled={decisionLocked}
                    onClick={async () => {
                      const rejected = await onReject(task.id, rejectionNote);
                      if (rejected) {
                        setRejectionNote('');
                      }
                    }}
                  >
                    {rejectLoading ? 'Requesting...' : 'Request changes'}
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Task detail</p>
            <h2>{task.title}</h2>
          </div>
          <div className="drawer-header-actions">
            <span className={`status-chip ${task.status}`}>{humanize(task.status)}</span>
            <button className="ghost-button" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <div className="drawer-body">
          <section className="decision-card">
            <div>
              <p className="eyebrow">Current truth</p>
              <h3>{decisionTitle}</h3>
              <p className="summary-copy">{decisionCopy}</p>
              {approval?.note ? <p className="summary-copy decision-note">Latest note: {approval.note}</p> : null}
              {decisionError ? <p className="inline-error">{decisionError}</p> : null}
            </div>

            <div className="decision-actions decision-actions-column">
              {artifact ? <span className={`status-chip ${artifact.status}`}>{humanize(artifact.status)}</span> : null}
              {!canExecute ? <div className="drawer-truth-banner">Planning-only task. This type does not generate a live artifact in the current founder UI.</div> : null}
              {!mutationsAllowed ? <div className="drawer-truth-banner">{readOnlyCopy}</div> : null}
              {workspaceTruth.understanding !== 'verified' ? (
                <div className="drawer-truth-banner">
                  {workspaceTruth.understanding === 'fallback'
                    ? 'Company understanding is still fallback-only. Treat generated copy and prioritization as provisional.'
                    : 'Founder context is incomplete. Generated copy and prioritization may still miss important business constraints.'}
                </div>
              ) : null}
              {connectionNote ? (
                <div className="decision-provider-warning">
                  <p className="summary-copy">{connectionNote}</p>
                  <button className="ghost-button" type="button" onClick={onOpenConnections}>
                    Open connections
                  </button>
                </div>
              ) : null}
              {canExecute ? (
                <button
                  className="primary-button secondary"
                  type="button"
                  disabled={decisionLocked}
                  onClick={async () => {
                    await onExecute(task.id);
                  }}
                >
                  {executeLoading ? 'Generating...' : artifact?.status === 'rejected' ? 'Generate revision' : 'Generate blog brief draft'}
                </button>
              ) : null}
              {artifact && approvalPending ? (
                <>
                  <label className="approval-note-field">
                    Rejection note <span className="field-optional">Optional</span>
                    <textarea
                      disabled={decisionLocked}
                      rows={3}
                      value={rejectionNote}
                      onChange={(event) => setRejectionNote(event.target.value)}
                      placeholder="Explain what is missing or off before rejecting this draft."
                    />
                  </label>
                  <button
                    className="primary-button secondary"
                    type="button"
                    disabled={decisionLocked}
                    onClick={async () => {
                      await onApprove(task.id);
                    }}
                  >
                    {approveLoading ? 'Approving...' : 'Approve draft'}
                  </button>
                  <button
                    className="ghost-button danger-button"
                    type="button"
                    disabled={decisionLocked}
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

          <section className="detail-card detail-card-lead">
            <p className="eyebrow">Task summary</p>
            <p>{task.description || 'No manual description was added for this task.'}</p>
          </section>

          <div className="drawer-grid">
            <div><span>Type</span><strong>{humanize(task.type)}</strong></div>
            <div><span>Category</span><strong>{humanize(task.category)}</strong></div>
            <div><span>Channel</span><strong>{channelLabel}</strong></div>
            <div><span>Output</span><strong>{executionLabel}</strong></div>
            <div><span>Source</span><strong>{task.source}</strong></div>
            <div><span>Status</span><strong>{humanize(task.status)}</strong></div>
            <div><span>Execution path</span><strong>{canExecute || artifact ? 'Live blog brief flow' : 'Planning only'}</strong></div>
            <div><span>Priority</span><strong>{formatScore(task.priority_score)}</strong></div>
            <div><span>Handled by</span><strong>{task.actor === 'northstar' ? 'Workspace' : 'Founder'}</strong></div>
            <div><span>Needs founder</span><strong>{task.needsFounderAction ? 'Yes' : 'No'}</strong></div>
          </div>

          <div className="drawer-grid muted-grid">
            <div><span>Impact</span><strong>{task.impact}</strong></div>
            <div><span>Effort</span><strong>{task.effort}</strong></div>
            <div><span>Confidence</span><strong>{task.confidence}</strong></div>
            <div><span>Goal fit</span><strong>{task.goal_fit}</strong></div>
          </div>

          <p className="score-formula">Priority score = impact x confidence x goal fit / effort</p>

          <div className="detail-story-grid">
            <section className="detail-card">
              <p className="eyebrow">Why this exists</p>
              <p>{rationale.whyExists || task.rationale}</p>
            </section>
            <section className="detail-card">
              <p className="eyebrow">Why this priority</p>
              <p>{rationale.whyPriority || 'Priority comes from the current score and where this task sits on the board right now.'}</p>
            </section>
            <section className="detail-card">
              <p className="eyebrow">Business outcome</p>
              <p>{rationale.businessOutcome || 'This task should improve a concrete acquisition, conversion, or positioning outcome for the company.'}</p>
            </section>
          </div>

          <ArtifactViewer artifact={artifact ?? null} embedded />

          <section className="detail-card">
            <div className="detail-card-head">
              <div>
                <p className="eyebrow">Board trail</p>
                <h3>How this task moved</h3>
              </div>
            </div>
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

          <div className="detail-story-grid">
            <section className="detail-card">
              <p className="eyebrow">Dependencies</p>
              <p>{task.dependencies.length ? task.dependencies.join(', ') : 'None'}</p>
            </section>
            <section className="detail-card">
              <p className="eyebrow">Timeline</p>
              <p>Created {formatDateTime(task.created_at)}</p>
              <p>Updated {formatDateTime(task.updated_at)}</p>
            </section>
          </div>

          <section className="detail-card">
            <div className="detail-card-head">
              <div>
                <p className="eyebrow">Founder notes</p>
                <h3>Persistent task context</h3>
              </div>
            </div>
            {!mutationsAllowed ? <div className="drawer-truth-banner">Comments are read-only until the workspace is live again.</div> : null}
            <form
              className="comment-composer"
              onSubmit={async (event) => {
                event.preventDefault();
                const nextBody = commentBody.trim();
                if (!nextBody || !mutationsAllowed) {
                  return;
                }

                const added = await onAddComment(task.id, nextBody);
                if (added) {
                  setCommentBody('');
                }
              }}
            >
              <textarea
                disabled={commentLocked}
                rows={3}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder="Add founder context, approval feedback, or execution guidance."
              />
              <p className="summary-copy">Founder notes here help Northstar sharpen future prioritization and the next revision pass.</p>
              <div className="comment-composer-actions">
                {commentError ? <p className="inline-error">{commentError}</p> : null}
                <button className="primary-button" type="submit" disabled={commentLocked || !commentBody.trim()}>
                  {commentLoading ? 'Adding note...' : 'Add note'}
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
              )) : <p>No notes yet.</p>}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
