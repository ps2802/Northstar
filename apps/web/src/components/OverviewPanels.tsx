import { formatScore } from '../lib/format';
import type { Approval, FounderIntake, Task } from '../lib/types';

interface OverviewPanelsProps {
  approvals: Approval[];
  founderIntake: FounderIntake | null;
  tasks: Task[];
}

export function OverviewPanels({ approvals, founderIntake, tasks }: OverviewPanelsProps) {
  const sortedTasks = [...tasks].sort((left, right) => right.priority_score - left.priority_score);
  const topPriorities = sortedTasks.slice(0, 3);
  const currentFocus = sortedTasks.find((task) => task.actor === 'northstar' && ['in_progress', 'planned', 'evaluating'].includes(task.status)) ?? topPriorities[0] ?? null;
  const founderNeeds = sortedTasks.filter((task) => task.needsFounderAction || task.actor === 'founder' || task.status === 'blocked');
  const founderFocus = founderNeeds[0] ?? null;
  const pendingApprovals = approvals.filter((approval) => approval.status === 'pending').length;
  const doneTasks = sortedTasks.filter((task) => task.status === 'done').length;

  return (
    <section className="overview-stack">
      <div className="overview-grid">
        <article className="overview-card overview-card-lead">
          <p className="eyebrow">Workspace</p>
          <h3>{founderIntake?.mainGoal ?? 'Keep the board readable, reviewable, and useful.'}</h3>
          <p className="summary-copy">{founderIntake?.priorityWork ?? 'Northstar should explain why work exists, what moves next, and where the founder is needed.'}</p>
          <div className="overview-card-footnote">
            <span>ICP</span>
            <strong>{founderIntake?.icp ?? 'Founder-led companies with lean teams and uneven growth systems'}</strong>
          </div>
        </article>

        <article className="overview-card">
          <p className="eyebrow">Current state</p>
          <div className="overview-stat-list">
            <div>
              <span>Founder queue</span>
              <strong>{founderNeeds.length}</strong>
            </div>
            <div>
              <span>Pending approvals</span>
              <strong>{pendingApprovals}</strong>
            </div>
            <div>
              <span>Shipped tasks</span>
              <strong>{doneTasks}</strong>
            </div>
          </div>
        </article>
      </div>

      <div className="overview-grid">
        <article className="overview-card">
          <p className="eyebrow">Now working on</p>
          <h2>{currentFocus?.title ?? 'No active agent work right now.'}</h2>
          <p className="summary-copy">{currentFocus?.description ?? 'The board is clear. Add a task or return to Board to queue the next move.'}</p>
          {currentFocus ? <span className={`status-chip ${currentFocus.status}`}>{currentFocus.status.replaceAll('_', ' ')}</span> : null}
        </article>

        <article className="overview-card">
          <p className="eyebrow">Waiting on you</p>
          <h2>{founderFocus?.title ?? 'No founder blockers are open.'}</h2>
          <p className="summary-copy">{founderFocus?.description ?? 'Approvals and founder follow-up are clear right now.'}</p>
          {founderFocus ? <span className={`status-chip ${founderFocus.status}`}>{founderFocus.status.replaceAll('_', ' ')}</span> : null}
        </article>
      </div>

      <article className="overview-card">
        <p className="eyebrow">Top board priorities</p>
        <div className="overview-list">
          {topPriorities.length ? topPriorities.map((task) => (
            <article key={task.id} className="overview-list-item">
              <div>
                <strong>{task.title}</strong>
                <p>{task.description}</p>
              </div>
              <div className="section-list-meta">
                <span className={`status-chip ${task.status}`}>{task.status.replaceAll('_', ' ')}</span>
                <strong>Score {formatScore(task.priority_score)}</strong>
              </div>
            </article>
          )) : <p className="empty-copy">No priority work is visible yet.</p>}
        </div>
      </article>
    </section>
  );
}
