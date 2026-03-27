import { formatDateTime, parseRationale } from '../lib/format';
import type { Approval, Task, TaskStatus } from '../lib/types';

const laneOptions: Array<{ key: TaskStatus; label: string; disabled?: boolean }> = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'evaluating', label: 'Evaluating' },
  { key: 'planned', label: 'Planned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting_for_approval', label: 'Approval' },
  { key: 'waiting_on_founder', label: 'Founder wait (derived)', disabled: true },
  { key: 'done', label: 'Done' },
  { key: 'blocked', label: 'Blocked' },
];

type BoardRunSectionKey = 'now' | 'waiting' | 'queued' | 'shipped';

interface KanbanBoardProps {
  approvals: Approval[];
  pendingTaskId?: string | null;
  statusErrors: Record<string, string>;
  tasks: Task[];
  onTaskOpen: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<boolean>;
}

interface RunCard {
  task: Task;
  title: string;
  status: string;
  statusTone: TaskStatus;
  currentStep: string;
  nextStep: string;
  blocker: string | null;
  ownerOrChannel: string;
  updatedAt: string;
  impactNote?: string;
}

const humanize = (value: string) => value.replaceAll('_', ' ');

const getLatestApprovalMap = (approvals: Approval[]) => approvals.reduce((map, approval) => {
  const current = map.get(approval.taskId);
  if (!current || Date.parse(approval.requestedAt) >= Date.parse(current.requestedAt)) {
    map.set(approval.taskId, approval);
  }

  return map;
}, new Map<string, Approval>());

const formatOwnerOrChannel = (task: Task) => {
  const owner = task.actor === 'northstar' ? 'Northstar' : 'Founder';
  if (!task.channel || task.channel === 'internal') {
    return owner;
  }

  return `${owner} · ${humanize(task.channel)}`;
};

const getCurrentStep = (task: Task, approval?: Approval) => {
  if (approval?.status === 'rejected') {
    return 'Changes requested by founder';
  }

  if (approval?.status === 'approved' && task.status === 'done') {
    return 'Approved and completed';
  }

  if (task.status === 'waiting_for_approval') {
    return 'Draft is waiting for review';
  }

  if (task.status === 'waiting_on_founder') {
    return 'Waiting for founder input';
  }

  if (task.status === 'blocked') {
    return 'Blocked from moving forward';
  }

  if (task.status === 'done') {
    return 'Execution is complete';
  }

  if (task.executionStage) {
    return humanize(task.executionStage);
  }

  if (task.status === 'planned') {
    return 'Queued for execution';
  }

  if (task.status === 'evaluating') {
    return 'Being sized and routed';
  }

  if (task.status === 'inbox') {
    return 'Captured and waiting to be scored';
  }

  return humanize(task.status);
};

const getNextStep = (task: Task, approval?: Approval) => {
  if (approval?.status === 'rejected') {
    return 'Generate the next pass';
  }

  if (approval?.status === 'approved' && task.status === 'done') {
    return 'Review the approved output and queue follow-up';
  }

  if (task.status === 'waiting_for_approval') {
    return 'Approve or reject the draft';
  }

  if (task.status === 'waiting_on_founder') {
    return 'Answer the founder request';
  }

  if (task.status === 'blocked') {
    return task.dependencies.length
      ? `Unblock ${task.dependencies.length} prerequisite${task.dependencies.length === 1 ? '' : 's'}`
      : 'Resolve the blocker and requeue';
  }

  if (task.status === 'done') {
    return 'Review shipped output and queue follow-up';
  }

  if (task.status === 'in_progress') {
    return 'Finish the current execution block';
  }

  if (task.status === 'planned') {
    return 'Move into active execution';
  }

  if (task.status === 'evaluating') {
    return 'Promote into planned work';
  }

  return 'Score and route the task';
};

const getBlocker = (task: Task, approval?: Approval) => {
  if (approval?.status === 'rejected') {
    return approval.note || 'Founder requested changes';
  }

  if (task.status === 'waiting_for_approval') {
    return 'Founder review required';
  }

  if (task.status === 'waiting_on_founder' || task.needsFounderAction) {
    return 'Founder input required';
  }

  if (task.status === 'blocked' && task.dependencies.length) {
    return `Waiting on ${task.dependencies.length} earlier task${task.dependencies.length === 1 ? '' : 's'}`;
  }

  if (task.status === 'blocked') {
    return 'Execution is blocked';
  }

  return null;
};

const getStatusLabel = (task: Task, approval?: Approval) => {
  if (approval?.status === 'rejected') {
    return 'Changes requested';
  }

  if (approval?.status === 'approved' && task.status === 'done') {
    return 'Approved';
  }

  return humanize(task.status);
};

const getStatusTone = (task: Task, approval?: Approval): TaskStatus => {
  if (approval?.status === 'rejected') {
    return 'blocked';
  }

  if (approval?.status === 'approved' && task.status === 'done') {
    return 'done';
  }

  return task.status;
};

const toRunCard = (task: Task, approval?: Approval): RunCard => {
  const rationale = parseRationale(task.rationale);
  const impactNote = rationale.businessOutcome || rationale.whyPriority || undefined;

  return {
    task,
    title: task.title,
    status: getStatusLabel(task, approval),
    statusTone: getStatusTone(task, approval),
    currentStep: getCurrentStep(task, approval),
    nextStep: getNextStep(task, approval),
    blocker: getBlocker(task, approval),
    ownerOrChannel: formatOwnerOrChannel(task),
    updatedAt: formatDateTime(task.updated_at),
    impactNote,
  };
};

const comparePriority = (left: Task, right: Task) => right.priority_score - left.priority_score;
const compareUpdated = (left: Task, right: Task) => Date.parse(right.updated_at) - Date.parse(left.updated_at);

export function KanbanBoard({ approvals, pendingTaskId, statusErrors, tasks, onTaskOpen, onStatusChange }: KanbanBoardProps) {
  const approvalByTaskId = getLatestApprovalMap(approvals);
  const nowTasks = tasks.filter((task) => task.status === 'in_progress').sort(comparePriority);
  const fallbackNowTasks = tasks
    .filter((task) => task.actor === 'northstar' && (task.status === 'planned' || task.status === 'evaluating'))
    .sort(comparePriority);
  const waitingTasks = tasks
    .filter((task) => approvalByTaskId.get(task.id)?.status === 'pending' || task.status === 'waiting_on_founder' || task.needsFounderAction)
    .sort(comparePriority);
  const queuedTasks = tasks
    .filter((task) => task.status === 'planned'
      || task.status === 'evaluating'
      || task.status === 'inbox'
      || (task.status === 'blocked' && approvalByTaskId.get(task.id)?.status === 'rejected'))
    .sort(comparePriority);
  const shippedTasks = tasks
    .filter((task) => task.status === 'done' || approvalByTaskId.get(task.id)?.status === 'approved')
    .sort(compareUpdated);

  const sectionTasks: Record<BoardRunSectionKey, Task[]> = {
    now: (nowTasks.length ? nowTasks : fallbackNowTasks).slice(0, 4),
    waiting: waitingTasks.slice(0, 4),
    queued: queuedTasks.filter((task) => !nowTasks.some((current) => current.id === task.id)).slice(0, 4),
    shipped: shippedTasks.slice(0, 4),
  };

  const totals: Record<BoardRunSectionKey, number> = {
    now: nowTasks.length || fallbackNowTasks.length,
    waiting: waitingTasks.length,
    queued: queuedTasks.length,
    shipped: shippedTasks.length,
  };

  const sections: Array<{
    key: BoardRunSectionKey;
    title: string;
    emptyTitle: string;
    emptyCopy: string;
  }> = [
    {
      key: 'now',
      title: 'Now working on',
      emptyTitle: 'No active run is moving right now.',
      emptyCopy: 'The next highest-priority agent task will appear here as soon as execution starts.',
    },
    {
      key: 'waiting',
      title: 'Waiting on you',
      emptyTitle: 'No founder decisions are blocking work.',
      emptyCopy: 'Approvals and founder-input requests are clear right now.',
    },
    {
      key: 'queued',
      title: 'Queued next',
      emptyTitle: 'No queued work is visible.',
      emptyCopy: 'Add a task or finish onboarding to refill the execution queue.',
    },
    {
      key: 'shipped',
      title: 'Recently shipped',
      emptyTitle: 'No shipped work yet.',
      emptyCopy: 'Completed tasks will land here once execution starts closing the loop.',
    },
  ];

  return (
    <section className="board-run-deck" aria-label="Board run overview">
      {sections.map((section) => {
        const cards = sectionTasks[section.key].map((task) => toRunCard(task, approvalByTaskId.get(task.id)));

        return (
          <article key={section.key} className={`board-run-section board-run-section-${section.key}`}>
            <header className="board-run-section-head">
              <div>
                <p className="eyebrow">{section.title}</p>
                <h2>{totals[section.key]}</h2>
              </div>
              <span className="board-run-count">
                {cards.length === totals[section.key] ? `${cards.length}` : `${cards.length} of ${totals[section.key]}`}
              </span>
            </header>

            <div className="board-run-stack">
              {cards.length ? cards.map((card) => {
                const isPending = pendingTaskId === card.task.id;

                return (
                  <article key={card.task.id} className="run-card">
                    <div className="run-card-head">
                      <button className="task-open run-card-open" type="button" onClick={() => onTaskOpen(card.task)}>
                        <h3>{card.title}</h3>
                      </button>
                      <span className={`status-chip ${card.statusTone}`}>{card.status}</span>
                    </div>

                    <dl className="run-card-grid">
                      <div>
                        <dt>Current step</dt>
                        <dd>{card.currentStep}</dd>
                      </div>
                      <div>
                        <dt>Next step</dt>
                        <dd>{card.nextStep}</dd>
                      </div>
                      <div>
                        <dt>Owner / channel</dt>
                        <dd>{card.ownerOrChannel}</dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{card.updatedAt}</dd>
                      </div>
                    </dl>

                    {card.blocker ? (
                      <p className="run-card-blocker">
                        <strong>Blocker:</strong> {card.blocker}
                      </p>
                    ) : null}

                    {card.impactNote ? <p className="run-card-impact">{card.impactNote}</p> : null}

                    <div className="run-card-footer">
                      <label className="run-card-lane">
                        <span>Move to</span>
                        <select
                          className="task-lane-select"
                          disabled={isPending}
                          value={card.task.status}
                          onChange={async (event) => {
                            await onStatusChange(card.task.id, event.target.value as TaskStatus);
                          }}
                        >
                          {laneOptions.map((status) => (
                            <option key={status.key} value={status.key} disabled={status.disabled}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {isPending ? <span className="inline-hint">Updating...</span> : null}
                    </div>

                    {statusErrors[card.task.id] ? <p className="inline-error">{statusErrors[card.task.id]}</p> : null}
                  </article>
                );
              }) : (
                <article className="board-run-empty">
                  <strong>{section.emptyTitle}</strong>
                  <p>{section.emptyCopy}</p>
                </article>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
