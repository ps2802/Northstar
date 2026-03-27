import type { Task, TaskStatus } from '../lib/types';
import { formatScore, parseRationale } from '../lib/format';

const columns: { key: TaskStatus; label: string }[] = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'evaluating', label: 'Evaluating' },
  { key: 'planned', label: 'Planned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting_for_approval', label: 'Approval' },
  { key: 'waiting_on_founder', label: 'Founder' },
  { key: 'done', label: 'Done' },
  { key: 'blocked', label: 'Blocked' },
];

interface KanbanBoardProps {
  pendingTaskId?: string | null;
  statusErrors: Record<string, string>;
  tasks: Task[];
  onTaskOpen: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<boolean>;
}

export function KanbanBoard({ pendingTaskId, statusErrors, tasks, onTaskOpen, onStatusChange }: KanbanBoardProps) {
  return (
    <section className="kanban-shell">
      {columns.map((column) => {
        const columnTasks = tasks
          .filter((task) => task.status === column.key)
          .sort((a, b) => b.priority_score - a.priority_score);

        return (
          <article key={column.key} className={`kanban-column lane-${column.key}`}>
            <header className="kanban-column-head">
              <div className="kanban-column-title">
                <span className="kanban-column-dot" aria-hidden="true" />
                <h3>{column.label}</h3>
              </div>
              <span className="kanban-column-count">{columnTasks.length}</span>
            </header>

            <div className="kanban-stack">
              {columnTasks.length ? columnTasks.map((task, index) => {
                const rationale = parseRationale(task.rationale);
                const isPending = pendingTaskId === task.id;
                const taskSummary = rationale.whyPriority || rationale.businessOutcome || rationale.whyExists || task.description;
                const issueId = task.id.toUpperCase().replaceAll('_', '-');
                const ownerLabel = task.actor === 'northstar' ? 'Northstar' : 'Founder';

                return (
                  <article key={task.id} className="task-card">
                    <div className="task-card-head">
                      <span className={`issue-chip ${index === 0 ? 'issue-chip-focus' : ''}`}>
                        {index === 0 ? 'Top priority' : issueId}
                      </span>
                      <div className="task-head-meta">
                        <span className={`owner-chip owner-chip-${task.actor}`}>{ownerLabel}</span>
                        <strong className="task-score">P{formatScore(task.priority_score)}</strong>
                      </div>
                    </div>

                    <button className="task-open" type="button" onClick={() => onTaskOpen(task)}>
                      <h4>{task.title}</h4>
                    </button>

                    <p className="task-summary">{taskSummary || 'Open the task to review the rationale and move it forward.'}</p>

                    <div className="task-execution-row">
                      {task.outputLabel ? <span className="domain-badge">{task.outputLabel}</span> : null}
                      {task.channel ? <span className="domain-badge">{task.channel}</span> : null}
                      {task.executionStage ? <span className="status-chip draft">{task.executionStage.replaceAll('_', ' ')}</span> : null}
                    </div>

                    <div className="task-card-meta">
                      <span className={`type-tag type-${task.type}`}>{task.category}</span>
                      <span className="task-metrics">I{task.impact} · C{task.confidence} · G{task.goal_fit} · E{task.effort}</span>
                    </div>

                    <div className="task-card-footer">
                      <span className="task-id">{issueId}</span>
                      <select
                        className="task-lane-select"
                        disabled={isPending}
                        value={task.status}
                        onChange={async (event) => {
                          await onStatusChange(task.id, event.target.value as TaskStatus);
                        }}
                      >
                        {columns.map((status) => (
                          <option key={status.key} value={status.key}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isPending ? <span className="inline-hint">Updating lane...</span> : null}
                    {statusErrors[task.id] ? <p className="inline-error">{statusErrors[task.id]}</p> : null}
                  </article>
                );
              }) : (
                <div className="kanban-empty-state">
                  <span>No tasks in this lane yet.</span>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
