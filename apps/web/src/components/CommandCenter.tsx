import { useEffect, useMemo, useState } from 'react';
import { createFounderApi } from '../lib/api';
import { demoState } from '../lib/mockData';
import type { AppState, Approval, Task } from '../lib/types';
import type { NewTaskInput, TaskStatus } from '../lib/types';
import { Onboarding } from './Onboarding';
import { CompanySummary } from './CompanySummary';
import { KanbanBoard } from './KanbanBoard';
import { TaskDrawer } from './TaskDrawer';
import { AddTaskForm } from './AddTaskForm';
import { ApprovalQueue } from './ApprovalQueue';
import { ArtifactViewer } from './ArtifactViewer';

const api = createFounderApi();

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

const clearTaskError = (errors: Record<string, string>, taskId: string) => {
  if (!(taskId in errors)) {
    return errors;
  }

  const next = { ...errors };
  delete next[taskId];
  return next;
};

export function CommandCenter() {
  const [state, setState] = useState<AppState>(demoState);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [page, setPage] = useState<'onboarding' | 'dashboard'>('onboarding');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [addTaskLoading, setAddTaskLoading] = useState(false);
  const [statusChangeTaskId, setStatusChangeTaskId] = useState<string | null>(null);
  const [executeTaskId, setExecuteTaskId] = useState<string | null>(null);
  const [approveTaskId, setApproveTaskId] = useState<string | null>(null);
  const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);
  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});
  const [decisionErrors, setDecisionErrors] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void api.getState().then((loaded) => setState(loaded));
  }, []);

  const selectedArtifact = useMemo(
    () => state.artifacts.find((artifact) => artifact.taskId === selectedTask?.id) ?? null,
    [selectedTask, state.artifacts],
  );

  const selectedApproval = useMemo<Approval | null>(() => {
    if (!selectedTask) {
      return null;
    }

    return (
      state.approvals.find((approval) => approval.taskId === selectedTask.id && approval.status === 'pending')
      ?? state.approvals.find((approval) => approval.taskId === selectedTask.id)
      ?? null
    );
  }, [selectedTask, state.approvals]);

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

  const applyState = (updated: AppState) => {
    setState(updated);
    setSelectedTask((current) => current ? updated.tasks.find((task) => task.id === current.id) ?? null : null);
  };

  const handleAnalyze = async (websiteUrl: string) => {
    setOnboardingError(null);
    setOnboardingLoading(true);

    try {
      const updated = await api.analyzeWebsite(websiteUrl);
      applyState(updated);
      setPage('dashboard');
      return true;
    } catch (error) {
      setOnboardingError(getErrorMessage(error));
      return false;
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleAddTask = async (input: NewTaskInput) => {
    setAddTaskError(null);
    setAddTaskLoading(true);

    try {
      const updated = await api.addTask(input);
      applyState(updated);
      return true;
    } catch (error) {
      setAddTaskError(getErrorMessage(error));
      return false;
    } finally {
      setAddTaskLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    setStatusErrors((current) => clearTaskError(current, taskId));
    setStatusChangeTaskId(taskId);

    try {
      const updated = await api.updateTaskStatus(taskId, status);
      applyState(updated);
      return true;
    } catch (error) {
      setStatusErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setStatusChangeTaskId((current) => current === taskId ? null : current);
    }
  };

  const handleExecuteTask = async (taskId: string) => {
    setDecisionErrors((current) => clearTaskError(current, taskId));
    setExecuteTaskId(taskId);

    try {
      const updated = await api.executeTask(taskId);
      applyState(updated);
      return true;
    } catch (error) {
      setDecisionErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setExecuteTaskId((current) => current === taskId ? null : current);
    }
  };

  const handleApproveArtifact = async (taskId: string) => {
    setDecisionErrors((current) => clearTaskError(current, taskId));
    setApproveTaskId(taskId);

    try {
      const updated = await api.approveArtifact(taskId);
      applyState(updated);
      return true;
    } catch (error) {
      setDecisionErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setApproveTaskId((current) => current === taskId ? null : current);
    }
  };

  const handleRejectArtifact = async (taskId: string, note?: string) => {
    setDecisionErrors((current) => clearTaskError(current, taskId));
    setRejectTaskId(taskId);

    try {
      const updated = await api.rejectArtifact(taskId, note);
      applyState(updated);
      return true;
    } catch (error) {
      setDecisionErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setRejectTaskId((current) => current === taskId ? null : current);
    }
  };

  const handleAddComment = async (taskId: string, body: string) => {
    setCommentErrors((current) => clearTaskError(current, taskId));
    setCommentTaskId(taskId);

    try {
      const updated = await api.addComment(taskId, body);
      applyState(updated);
      return true;
    } catch (error) {
      setCommentErrors((current) => ({ ...clearTaskError(current, taskId), [taskId]: getErrorMessage(error) }));
      return false;
    } finally {
      setCommentTaskId((current) => current === taskId ? null : current);
    }
  };

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div>
          <p className="eyebrow">Northstar // Intelligence Layer</p>
          <h1>{state.profile.companyName}</h1>
        </div>
        <nav className="topbar-actions">
          <button className="ghost-button" type="button" onClick={() => setPage('onboarding')}>← Re-scan</button>
          <button className="primary-button" type="button" onClick={() => setPage('dashboard')}>Execution board →</button>
        </nav>
      </header>

      {page === 'onboarding' ? (
        <Onboarding
          error={onboardingError}
          loading={onboardingLoading}
          onAnalyze={handleAnalyze}
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
                  <p className="eyebrow">In motion</p>
                  <h3>{boardSignals.now?.title ?? 'No active task yet'}</h3>
                  <p>{boardSignals.now?.description ?? 'The board is loaded. Pick the highest-leverage move and execute.'}</p>
                </article>
                <article className="signal-card">
                  <p className="eyebrow">Queued</p>
                  <h3>{boardSignals.next?.title ?? 'Inbox clear'}</h3>
                  <p>{boardSignals.next?.description ?? 'Nothing queued. Every hour idle is compounding cost.'}</p>
                </article>
                <article className="signal-card">
                  <p className="eyebrow">Blocking your pipeline</p>
                  <h3>{boardSignals.approval?.title ?? 'Queue empty'}</h3>
                  <p>{boardSignals.approval?.description ?? 'Nothing waiting on you right now. Keep the system moving.'}</p>
                </article>
              </section>

              <div className="section-heading">
                <div>
                  <p className="eyebrow">Execution layer</p>
                  <h2>Operating board</h2>
                </div>
                <span className="pill">score = impact × confidence × goal_fit / effort</span>
              </div>
              <div className="board-frame">
                <KanbanBoard
                  pendingTaskId={statusChangeTaskId}
                  statusErrors={statusErrors}
                  tasks={state.tasks}
                  onTaskOpen={(task) => setSelectedTask(task)}
                  onStatusChange={handleStatusChange}
                />
              </div>
            </div>

            <aside className="workspace-side">
              <AddTaskForm
                error={addTaskError}
                loading={addTaskLoading}
                onAdd={handleAddTask}
              />
              <ApprovalQueue
                approvals={state.approvals}
                artifacts={state.artifacts}
                decisionErrorByTaskId={decisionErrors}
                pendingApproveTaskId={approveTaskId}
                pendingRejectTaskId={rejectTaskId}
                tasks={state.tasks}
                onApprove={handleApproveArtifact}
                onReject={handleRejectArtifact}
              />
              <ArtifactViewer artifact={selectedArtifact} />
            </aside>
          </section>
        </>
      )}

      <TaskDrawer
        approval={selectedApproval}
        approveLoading={approveTaskId === selectedTask?.id}
        artifact={selectedArtifact}
        commentError={selectedTask ? commentErrors[selectedTask.id] ?? null : null}
        commentLoading={commentTaskId === selectedTask?.id}
        comments={comments}
        decisionError={selectedTask ? decisionErrors[selectedTask.id] ?? null : null}
        executeLoading={executeTaskId === selectedTask?.id}
        onAddComment={handleAddComment}
        onApprove={handleApproveArtifact}
        onClose={() => setSelectedTask(null)}
        onExecute={handleExecuteTask}
        onReject={handleRejectArtifact}
        rejectLoading={rejectTaskId === selectedTask?.id}
        task={selectedTask}
      />
    </main>
  );
}
