import type { Task, TaskStatus } from '../lib/types';
import { formatScore, parseRationale } from '../lib/format';

const columns: { key: TaskStatus; label: string }[] = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'evaluating', label: 'Evaluating' },
  { key: 'planned', label: 'Planned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting_for_approval', label: 'Waiting for Approval' },
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
          <article key={column.key} className="kanban-column">
            <header>
              <div>
                <h3>{column.label}</h3>
                <span>{columnTasks.length} tasks</span>
              </div>
            </header>
            <div className="kanban-stack">
              {columnTasks.map((task, index) => {
                const rationale = parseRationale(task.rationale);
                const isPending = pendingTaskId === task.id;

                return (
                  <article key={task.id} className="task-card">
                    <div className="task-card-top">
                      <span className={`type-tag type-${task.type}`}>{task.type.replaceAll('_', ' ')}</span>
                      <strong>{formatScore(task.priority_score)}</strong>
                    </div>
                    {index === 0 ? <span className="signal-badge">Top in lane</span> : null}
                    <button className="task-open" type="button" onClick={() => onTaskOpen(task)}>
                      <h4>{task.title}</h4>
                    </button>
                    <p>{task.description}</p>
                    <p className="task-outcome">{rationale.businessOutcome || rationale.whyExists}</p>
                    <div className="task-meta">
                      <span>Impact {task.impact}</span>
                      <span>Effort {task.effort}</span>
                      <span>Confidence {task.confidence}</span>
                    </div>
                    <div className="task-actions">
                      <select
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
                    {isPending ? <span className="inline-hint">Updating status...</span> : null}
                    {statusErrors[task.id] ? <p className="inline-error">{statusErrors[task.id]}</p> : null}
                  </article>
                );
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}
