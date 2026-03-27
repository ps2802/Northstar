import type { BuildPhase } from '../lib/types';

interface BuildDashboardProps {
  phases: BuildPhase[];
}

const phaseLabel: Record<BuildPhase['status'], string> = {
  active: 'Active now',
  up_next: 'Up next',
  queued: 'Queued',
  done: 'Done',
};

const taskLabel: Record<BuildPhase['tasks'][number]['status'], string> = {
  in_progress: 'In progress',
  next: 'Next',
  planned: 'Planned',
  blocked: 'Blocked',
  done: 'Done',
};

export function BuildDashboard({ phases }: BuildDashboardProps) {
  const tasks = phases.flatMap((phase) => phase.tasks);
  const summary = {
    total: tasks.length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    next: tasks.filter((task) => task.status === 'next').length,
    blocked: tasks.filter((task) => task.status === 'blocked').length,
  };

  return (
    <section className="build-dashboard" aria-label="Build progress dashboard">
      <header className="build-dashboard-hero">
        <div>
          <p className="eyebrow">Build dashboard</p>
          <h2>Wave plan and current shell pass</h2>
          <p className="summary-copy">
            Dashboard is secondary in Wave 1. The board remains the default operating surface while this view tracks what is shipping next.
          </p>
        </div>
        <div className="build-dashboard-metrics">
          <article>
            <span>Tasks tracked</span>
            <strong>{summary.total}</strong>
          </article>
          <article>
            <span>In progress</span>
            <strong>{summary.inProgress}</strong>
          </article>
          <article>
            <span>Up next</span>
            <strong>{summary.next}</strong>
          </article>
          <article>
            <span>Blocked</span>
            <strong>{summary.blocked}</strong>
          </article>
        </div>
      </header>

      <div className="build-phase-grid">
        {phases.map((phase) => (
          <article key={phase.id} className="build-phase-card">
            <div className="build-phase-head">
              <div>
                <p className="eyebrow">{phaseLabel[phase.status]}</p>
                <h3>{phase.title}</h3>
              </div>
              <span className={`phase-pill phase-pill-${phase.status}`}>{phaseLabel[phase.status]}</span>
            </div>
            <p className="summary-copy">{phase.goal}</p>
            <div className="build-task-list">
              {phase.tasks.map((task) => (
                <article key={task.id} className="build-task-item">
                  <div className="build-task-head">
                    <strong>{task.title}</strong>
                    <span className={`status-chip build-task-status build-task-status-${task.status}`}>{taskLabel[task.status]}</span>
                  </div>
                  <p>{task.summary}</p>
                  <div className="build-task-meta">
                    <span>{task.owner === 'codex' ? 'Owned by Codex' : 'Needs founder input'}</span>
                    <strong>{task.nextStep}</strong>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
