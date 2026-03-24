import { useEffect, useMemo, useState } from 'react';
import { createFounderApi } from '../lib/api';
import { demoState } from '../lib/mockData';
import type { AppState, Task } from '../lib/types';
import type { NewTaskInput, TaskStatus } from '../lib/types';
import { Onboarding } from './Onboarding';
import { CompanySummary } from './CompanySummary';
import { KanbanBoard } from './KanbanBoard';
import { TaskDrawer } from './TaskDrawer';
import { AddTaskForm } from './AddTaskForm';
import { ApprovalQueue } from './ApprovalQueue';
import { ArtifactViewer } from './ArtifactViewer';

const api = createFounderApi();

export function CommandCenter() {
  const [state, setState] = useState<AppState>(demoState);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<'onboarding' | 'dashboard'>('onboarding');

  useEffect(() => {
    void api.getState().then((loaded) => setState(loaded));
  }, []);

  const selectedArtifact = useMemo(
    () => state.artifacts.find((artifact) => artifact.taskId === selectedTask?.id) ?? null,
    [selectedTask, state.artifacts],
  );

  const comments = useMemo(
    () => state.comments.filter((comment) => comment.taskId === selectedTask?.id),
    [selectedTask, state.comments],
  );

  const taskCountByColumn = useMemo(() => {
    return state.tasks.reduce<Record<TaskStatus, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    }, {
      inbox: 0,
      evaluating: 0,
      planned: 0,
      in_progress: 0,
      waiting_for_approval: 0,
      done: 0,
      blocked: 0,
    });
  }, [state.tasks]);

  const boardSignals = useMemo(() => {
    const sorted = [...state.tasks].sort((a, b) => b.priority_score - a.priority_score);
    return {
      now: sorted.find((task) => task.status === 'in_progress') ?? sorted.find((task) => task.status === 'planned') ?? null,
      next: sorted.find((task) => task.status === 'evaluating' || task.status === 'inbox') ?? null,
      approval: sorted.find((task) => task.status === 'waiting_for_approval') ?? null,
    };
  }, [state.tasks]);

  const refreshState = async (nextState: Promise<AppState>) => {
    const updated = await nextState;
    setState(updated);
    if (selectedTask) {
      setSelectedTask(updated.tasks.find((task) => task.id === selectedTask.id) ?? updated.tasks[0] ?? null);
    }
  };

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div>
          <p className="eyebrow">Northstar command center</p>
          <h1>{state.profile.companyName}</h1>
        </div>
        <nav className="topbar-actions">
          <button className="ghost-button" type="button" onClick={() => setPage('onboarding')}>Re-run onboarding</button>
          <button className="primary-button" type="button" onClick={() => setPage('dashboard')}>Open board</button>
        </nav>
      </header>

      {page === 'onboarding' ? (
        <Onboarding
          loading={loading}
          onAnalyze={async (websiteUrl) => {
            setLoading(true);
            await refreshState(api.analyzeWebsite(websiteUrl));
            setLoading(false);
            setPage('dashboard');
          }}
        />
      ) : (
        <>
          <section className="metrics-strip">
            {Object.entries(taskCountByColumn).map(([status, count]) => (
              <article key={status} className="metric-card">
                <span>{status.replaceAll('_', ' ')}</span>
                <strong>{count}</strong>
              </article>
            ))}
          </section>

          <CompanySummary project={state.project} profile={state.profile} snapshot={state.snapshot} />

          <section className="workspace-grid">
            <div className="workspace-main">
              <section className="board-signals">
                <article className="signal-card">
                  <p className="eyebrow">Now</p>
                  <h3>{boardSignals.now?.title ?? 'No active task yet'}</h3>
                  <p>{boardSignals.now?.description ?? 'The board is ready for the next high-leverage move.'}</p>
                </article>
                <article className="signal-card">
                  <p className="eyebrow">Next up</p>
                  <h3>{boardSignals.next?.title ?? 'Inbox is clear'}</h3>
                  <p>{boardSignals.next?.description ?? 'No queued evaluation work right now.'}</p>
                </article>
                <article className="signal-card">
                  <p className="eyebrow">Needs founder review</p>
                  <h3>{boardSignals.approval?.title ?? 'Nothing waiting'}</h3>
                  <p>{boardSignals.approval?.description ?? 'Approval queue is currently empty.'}</p>
                </article>
              </section>

              <div className="section-heading">
                <div>
                  <p className="eyebrow">Operating board</p>
                  <h2>Kanban command center</h2>
                </div>
                <span className="pill">Priority score = impact x confidence x goal fit / effort</span>
              </div>
              <div className="board-frame">
                <KanbanBoard
                  tasks={state.tasks}
                  onTaskOpen={(task) => setSelectedTask(task)}
                  onStatusChange={async (taskId, status) => {
                    await refreshState(api.updateTaskStatus(taskId, status));
                  }}
                />
              </div>
            </div>

            <aside className="workspace-side">
              <AddTaskForm
                onAdd={async (input: NewTaskInput) => {
                  await refreshState(api.addTask(input));
                }}
              />
              <ApprovalQueue
                approvals={state.approvals}
                tasks={state.tasks}
                artifacts={state.artifacts}
                onApprove={async (taskId) => {
                  await refreshState(api.approveArtifact(taskId));
                }}
              />
              <ArtifactViewer artifact={selectedArtifact} />
            </aside>
          </section>
        </>
      )}

      <TaskDrawer
        task={selectedTask}
        artifact={selectedArtifact}
        comments={comments}
        onClose={() => setSelectedTask(null)}
        onApprove={async (taskId) => {
          await refreshState(api.approveArtifact(taskId));
        }}
      />
    </main>
  );
}
