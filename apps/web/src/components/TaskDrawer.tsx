import { useEffect, useState } from 'react';
import type { Approval, Artifact, Comment, ExecutionPreference, ExecutionProvider, Integration, Task } from '../lib/types';
import { formatDateTime, formatScore, parseRationale } from '../lib/format';
import { ArtifactViewer } from './ArtifactViewer';

interface TaskDrawerProps {
  approval?: Approval | null;
  approveLoading?: boolean;
  artifact?: Artifact | null;
  commentError?: string | null;
  commentLoading?: boolean;
  comments: Comment[];
  decisionError?: string | null;
  executionPreference: ExecutionPreference | null;
  executionProviders: ExecutionProvider[];
  executeLoading?: boolean;
  activeProviderId: string;
  integrations: Integration[];
  onAddComment: (taskId: string, body: string) => Promise<boolean>;
  onApprove: (taskId: string) => Promise<boolean>;
  onClose: () => void;
  onExecutionPreferenceChange: (next: Partial<ExecutionPreference>) => void;
  onExecute: (taskId: string) => Promise<boolean>;
  onOpenConnections: () => void;
  onReject: (taskId: string, note?: string) => Promise<boolean>;
  rejectLoading?: boolean;
  task: Task | null;
}

const humanize = (value: string) => value.replaceAll('_', ' ');
const executableTaskTypes = new Set(['blog_brief', 'x_post_set', 'linkedin_post_set', 'homepage_copy_suggestion', 'email_template']);

const getProviderOptions = (providers: ExecutionProvider[], activeProviderId: string) => {
  return providers.map((provider) => ({
    value: provider.id,
    label: `${provider.name}${provider.id === activeProviderId ? ' (active)' : ''}${provider.status === 'needs_key' ? ' (add key first)' : ''}`,
    connected: provider.status === 'connected' || provider.status === 'available',
  }));
};

const getModeOptions = (task: Task) => {
  if (task.channel === 'email' || task.channel === 'x' || task.channel === 'linkedin' || task.channel === 'instagram') {
    return [
      { value: 'founder_review', label: 'Founder review draft' },
      { value: 'send_ready', label: 'Send-ready handoff' },
    ] as const;
  }

  if (task.category === 'website' || task.category === 'content') {
    return [
      { value: 'founder_review', label: 'Founder review draft' },
      { value: 'implementation_handoff', label: 'Implementation handoff' },
    ] as const;
  }

  return [
    { value: 'founder_review', label: 'Founder review draft' },
  ] as const;
};

export function TaskDrawer({
  approval,
  approveLoading,
  artifact,
  commentError,
  commentLoading,
  comments,
  decisionError,
  executionPreference,
  executionProviders,
  executeLoading,
  activeProviderId,
  integrations,
  onAddComment,
  onApprove,
  onClose,
  onExecutionPreferenceChange,
  onExecute,
  onOpenConnections,
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
  const canExecute = executableTaskTypes.has(task.type) && (!artifact || artifact.status === 'rejected');
  const decisionBusy = Boolean(executeLoading || approveLoading || rejectLoading);
  const executionLabel = task.outputLabel ?? humanize(task.type);
  const channelLabel = task.channel ? humanize(task.channel) : 'internal';
  const providerOptions = getProviderOptions(executionProviders, activeProviderId);
  const selectedProvider = executionPreference?.provider ?? activeProviderId;
  const selectedProviderStatus = providerOptions.find((option) => option.value === selectedProvider)?.connected ?? true;
  const modeOptions = getModeOptions(task);
  const selectedMode = executionPreference?.mode ?? 'founder_review';
  const deliveryConnection = integrations.find((integration) => (
    (task.channel === 'email' && integration.name === 'Gmail')
    || (task.channel === 'x' && integration.name === 'X')
    || (task.channel === 'instagram' && integration.name === 'Instagram')
    || ((task.category === 'content' || task.category === 'website') && integration.name === 'Google Drive')
    || (task.category === 'seo' && integration.name === 'Search Console')
  ));
  let decisionTitle = `${executionLabel} in progress`;
  let decisionCopy = 'This task is part of the execution system, but it is not in a generated-asset state yet.';

  if (artifact) {
    if (approvalPending) {
      decisionTitle = artifact.deliveryStage === 'ready_to_send'
        ? `Ready to send on ${channelLabel}`
        : `${executionLabel} ready for founder review`;
      decisionCopy = artifact.deliveryStage === 'ready_to_send'
        ? `Review exactly what Northstar plans to send through ${channelLabel}, then approve it or reject it with clear guidance.`
        : `Review the ${channelLabel}-aware draft, then approve it or reject it with specific guidance so the next pass has useful founder feedback.`;
    } else if (artifact.status === 'rejected' && canExecute) {
      decisionTitle = `Revision requested for ${executionLabel}`;
      decisionCopy = 'The founder rejected the last draft. Adjust the provider or handoff mode if needed, then generate a tighter revision.';
    } else if (artifact.status === 'approved') {
      decisionTitle = `${executionLabel} approved`;
      decisionCopy = 'This output has already been approved and can remain attached to the completed task.';
    } else if (artifact.status === 'rejected') {
      decisionTitle = `${executionLabel} rejected`;
      decisionCopy = 'This output was rejected. Keep the draft visible for reference and use the note or comments to guide the next revision.';
    } else {
      decisionTitle = `${executionLabel} generated`;
      decisionCopy = 'The output exists, but no pending approval is attached to it right now.';
    }
  } else if (canExecute) {
    decisionTitle = `Generate ${executionLabel}`;
    decisionCopy = 'Running this will generate a founder-reviewable draft, create an approval item, and move the task into founder review.';
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Northstar task view</p>
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
              <p className="eyebrow">Decision surface</p>
              <h3>{decisionTitle}</h3>
              <p className="summary-copy">{decisionCopy}</p>
              {approval?.note ? <p className="summary-copy decision-note">Latest note: {approval.note}</p> : null}
              {decisionError ? <p className="inline-error">{decisionError}</p> : null}
            </div>

            <div className="decision-actions decision-actions-column">
              {artifact ? <span className={`status-chip ${artifact.status}`}>{humanize(artifact.status)}</span> : null}
              <div className="decision-config">
                <label>
                  Provider
                  <select
                    disabled={decisionBusy}
                    value={selectedProvider}
                    onChange={(event) => onExecutionPreferenceChange({ provider: event.target.value })}
                  >
                    {providerOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Output mode
                  <select
                    disabled={decisionBusy}
                    value={selectedMode}
                    onChange={(event) => onExecutionPreferenceChange({ mode: event.target.value as ExecutionPreference['mode'] })}
                  >
                    {modeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {!selectedProviderStatus ? (
                <div className="decision-provider-warning">
                  <p className="summary-copy">
                    The selected execution provider is not connected yet. Add the provider key or switch back to the active provider before generating the next pass.
                  </p>
                  <button className="ghost-button" type="button" onClick={onOpenConnections}>
                    Open connections
                  </button>
                </div>
              ) : null}
              {deliveryConnection && deliveryConnection.status !== 'connected' ? (
                <div className="decision-provider-warning">
                  <p className="summary-copy">
                    {deliveryConnection.name} is still disconnected. Northstar can generate the draft now, but the real delivery path stays blocked until that workflow connection is set up.
                  </p>
                  <button className="ghost-button" type="button" onClick={onOpenConnections}>
                    Connect {deliveryConnection.name}
                  </button>
                </div>
              ) : null}
              {canExecute ? (
                <button
                  className="primary-button secondary"
                  type="button"
                  disabled={decisionBusy}
                  onClick={async () => {
                    await onExecute(task.id);
                  }}
                >
                  {executeLoading ? 'Generating...' : artifact?.status === 'rejected' ? 'Generate revision' : `Generate ${executionLabel.toLowerCase()}`}
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
                      placeholder="Tell Northstar what is missing or off before you reject this draft."
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
            <div><span>Execution</span><strong>{humanize(task.executionStage ?? 'strategy')}</strong></div>
            <div><span>Priority</span><strong>{formatScore(task.priority_score)}</strong></div>
            <div><span>Operator</span><strong>{task.actor === 'northstar' ? 'Northstar' : 'Founder'}</strong></div>
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
              <p>{rationale.whyPriority || 'Priority comes from the current score and where this task sits in the board right now.'}</p>
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
                <p className="eyebrow">Founder comments</p>
                <h3>Persistent task context</h3>
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
