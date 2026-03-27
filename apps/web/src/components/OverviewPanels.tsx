import type { Approval, FounderIntake, Task } from '../lib/types';
import { formatScore } from '../lib/format';

interface OverviewPanelsProps {
  approvals: Approval[];
  founderIntake: FounderIntake | null;
  tasks: Task[];
}

const quadrantCopy = {
  quick_wins: 'High impact / low effort',
  strategic: 'High impact / higher effort',
  delegate: 'Lower impact / low effort',
  defer: 'Lower signal / higher effort',
} as const;

export function OverviewPanels({ approvals, founderIntake, tasks }: OverviewPanelsProps) {
  const sortedTasks = [...tasks].sort((left, right) => right.priority_score - left.priority_score);
  const topPriorities = sortedTasks.slice(0, 3);
  const northstarNow = sortedTasks.filter((task) => task.actor === 'northstar' && ['in_progress', 'planned', 'evaluating'].includes(task.status)).slice(0, 4);
  const founderNeeds = sortedTasks
    .filter((task, index, source) =>
      (task.needsFounderAction || task.actor === 'founder' || task.status === 'blocked')
      && source.findIndex((item) => item.id === task.id) === index)
    .slice(0, 4);
  const pendingApprovals = approvals.filter((approval) => approval.status === 'pending').length;
  const productSignals = sortedTasks.filter((task) =>
    task.category === 'product_signal'
    || task.category === 'research'
    || task.type === 'competitor_scan'
    || task.type === 'research_summary'
    || task.type === 'user_research_outreach');
  const featureSuggestionTasks = productSignals.slice(0, 3);
  const launchTracks = sortedTasks.filter((task) =>
    task.category === 'website'
    || task.category === 'content'
    || task.category === 'social'
    || task.category === 'crm'
    || task.category === 'product_signal'
    || task.type === 'homepage_copy_suggestion'
    || task.type === 'email_template'
    || task.type === 'outreach_sequence');
  const readyToLaunch = launchTracks.filter((task) =>
    task.executionStage === 'ready_for_review'
    || task.executionStage === 'ready_to_send'
    || task.executionStage === 'sent'
    || task.executionStage === 'published');
  const pilotReadinessTasks = launchTracks.slice(0, 3);
  const crmTasks = sortedTasks.filter((task) =>
    task.category === 'crm'
    || task.type === 'outreach_sequence'
    || task.type === 'email_template');
  const researchTasks = sortedTasks.filter((task) =>
    task.category === 'research'
    || task.type === 'research_summary'
    || task.type === 'user_research_outreach'
    || task.type === 'competitor_scan');
  const founderOpsTasks = sortedTasks.filter((task) =>
    task.category === 'crm'
    || task.category === 'research'
    || task.actor === 'founder'
    || task.needsFounderAction);

  const launchAssumptions: Array<{ label: string; state: 'ready' | 'waiting' | 'missing'; detail: string }> = [
    {
      label: 'ICP is named',
      state: founderIntake?.icp ? 'ready' : 'missing',
      detail: founderIntake?.icp ?? 'Set the pilot audience in onboarding so launch work has a clear destination.',
    },
    {
      label: 'Primary channel is fixed',
      state: founderIntake?.keyChannel ? 'ready' : 'missing',
      detail: founderIntake?.keyChannel ?? 'Pick the first distribution loop before new launch tasks stack up.',
    },
    {
      label: 'Review path is active',
      state: pendingApprovals ? 'waiting' : readyToLaunch.length ? 'ready' : 'missing',
      detail: pendingApprovals
        ? `${pendingApprovals} item${pendingApprovals === 1 ? '' : 's'} waiting on founder review before launch.`
        : readyToLaunch.length
          ? `${readyToLaunch.length} execution block${readyToLaunch.length === 1 ? '' : 's'} already staged for review or send-ready work.`
          : 'No launch-ready work is staged yet.',
    },
    {
      label: 'Founder queue is explicit',
      state: founderNeeds.length ? 'waiting' : 'ready',
      detail: founderNeeds.length
        ? `${founderNeeds.length} founder action${founderNeeds.length === 1 ? '' : 's'} or blocker${founderNeeds.length === 1 ? '' : 's'} are currently visible.`
        : 'No hidden founder dependencies are showing right now.',
    },
  ];

  const matrix = sortedTasks.reduce<Record<keyof typeof quadrantCopy, Task[]>>((acc, task) => {
    if (task.impact >= 4 && task.effort <= 2) {
      acc.quick_wins.push(task);
    } else if (task.impact >= 4) {
      acc.strategic.push(task);
    } else if (task.effort <= 2) {
      acc.delegate.push(task);
    } else {
      acc.defer.push(task);
    }

    return acc;
  }, {
    quick_wins: [],
    strategic: [],
    delegate: [],
    defer: [],
  });

  return (
    <section className="overview-stack">
      <div className="overview-grid">
        <article className="overview-card overview-card-lead">
          <p className="eyebrow">Current mission</p>
          <h3>{founderIntake?.mainGoal ?? 'Create a clear growth plan and keep execution reviewable.'}</h3>
          <p className="summary-copy">{founderIntake?.priorityWork ?? 'Northstar should score the work, explain why it matters, and make founder action obvious.'}</p>
          <div className="overview-card-footnote">
            <span>ICP</span>
            <strong>{founderIntake?.icp ?? 'Founder-led companies with small teams and uneven growth systems'}</strong>
          </div>
        </article>

        <article className="overview-card">
          <p className="eyebrow">Operating context</p>
          <div className="overview-stat-list">
            <div>
              <span>Bottleneck</span>
              <strong>{founderIntake?.bottleneck ?? 'conversion'}</strong>
            </div>
            <div>
              <span>Key channels</span>
              <strong>{founderIntake?.keyChannel ?? 'SEO, content, website'}</strong>
            </div>
            <div>
              <span>Pending approvals</span>
              <strong>{pendingApprovals}</strong>
            </div>
          </div>
        </article>
      </div>

      <section className="overview-wave-grid">
        <article className="overview-card wave-card wave-card-signal">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Wave 3</p>
              <h2>Feature suggestions and product signals</h2>
            </div>
          </div>
          <p className="summary-copy">Research should produce a usable product-signal loop: what prospects ask for, what pilots need before launch, and which features deserve follow-up.</p>
          <div className="wave-card-metrics">
            <article className="wave-metric">
              <span>Signal tasks</span>
              <strong>{productSignals.length}</strong>
            </article>
            <article className="wave-metric">
              <span>Research-backed</span>
              <strong>{researchTasks.length}</strong>
            </article>
          </div>
          <div className="overview-list">
            {featureSuggestionTasks.length ? featureSuggestionTasks.map((task) => (
              <article key={task.id} className="overview-list-item">
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                </div>
                <div className="wave-task-meta">
                  <span className="domain-badge">{task.category}</span>
                  <span className={`status-chip ${task.status}`}>{task.status.replaceAll('_', ' ')}</span>
                </div>
              </article>
            )) : <p className="empty-copy">No product-signal tasks are visible yet. Research, competitor, and feedback work should surface here.</p>}
          </div>
        </article>

        <article className="overview-card wave-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Wave 4</p>
              <h2>Pilot readiness and launch assumptions</h2>
            </div>
          </div>
          <p className="summary-copy">Pilot work is only useful when the assumptions are named, the founder review path is real, and send-ready assets are visible before launch.</p>
          <div className="assumption-list">
            {launchAssumptions.map((assumption) => (
              <article key={assumption.label} className="assumption-item">
                <span className={`assumption-pill assumption-pill-${assumption.state}`}>{assumption.state}</span>
                <div>
                  <strong>{assumption.label}</strong>
                  <p>{assumption.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="wave-inline-list">
            {pilotReadinessTasks.length ? pilotReadinessTasks.map((task) => (
              <span key={task.id} className="wave-inline-chip">{task.title}</span>
            )) : <p className="empty-copy">Launch-facing tasks will appear here once website, content, CRM, or signal work is queued.</p>}
          </div>
        </article>

        <article className="overview-card wave-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Wave 5</p>
              <h2>CRM, research, and native founder ops</h2>
            </div>
          </div>
          <p className="summary-copy">Founder ops should stay native to the board: research creates the signal, CRM captures the follow-up, and the queue makes the human handoff obvious.</p>
          <div className="wave-card-metrics">
            <article className="wave-metric">
              <span>CRM tasks</span>
              <strong>{crmTasks.length}</strong>
            </article>
            <article className="wave-metric">
              <span>Founder-op tasks</span>
              <strong>{founderOpsTasks.length}</strong>
            </article>
          </div>
          <div className="founder-ops-grid">
            <article className="founder-ops-lane">
              <span>CRM loop</span>
              <strong>{crmTasks[0]?.title ?? 'No CRM loop is staged yet.'}</strong>
              <p>{crmTasks[0]?.description ?? 'Follow-up, pipeline movement, and send-ready outreach should become first-class work here.'}</p>
            </article>
            <article className="founder-ops-lane">
              <span>Research loop</span>
              <strong>{researchTasks[0]?.title ?? 'No research loop is staged yet.'}</strong>
              <p>{researchTasks[0]?.description ?? 'Interview recruiting, synthesis, and competitor learning should keep feeding product and GTM choices.'}</p>
            </article>
          </div>
          <div className="overview-list">
            {founderOpsTasks.slice(0, 3).length ? founderOpsTasks.slice(0, 3).map((task) => (
              <article key={task.id} className="overview-list-item">
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                </div>
                <div className="wave-task-meta">
                  <span className="domain-badge">{task.category}</span>
                  <span className={`status-chip ${task.status}`}>{task.status.replaceAll('_', ' ')}</span>
                </div>
              </article>
            )) : <p className="empty-copy">Founder ops will feel native once CRM and research tasks start moving through the same board as the rest of the work.</p>}
          </div>
        </article>
      </section>

      <section className="matrix-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Basic matrix</p>
            <h2>Where the next work should land</h2>
          </div>
        </div>

        <div className="matrix-grid">
          {(Object.keys(quadrantCopy) as Array<keyof typeof quadrantCopy>).map((key) => (
            <article key={key} className="matrix-quadrant">
              <span>{quadrantCopy[key]}</span>
              <strong>{matrix[key].length}</strong>
              <p>{matrix[key][0]?.title ?? 'No tasks here yet.'}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="overview-grid overview-grid-split">
        <section className="rail-card operating-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Northstar is doing</p>
              <h2>Agent-owned execution</h2>
            </div>
          </div>
          <div className="overview-list">
            {northstarNow.length ? northstarNow.map((task) => (
              <article key={task.id} className="overview-list-item">
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                </div>
                <span className="domain-badge">P{formatScore(task.priority_score)}</span>
              </article>
            )) : <p className="empty-copy">No agent-owned work is active yet. Queue work from the board or task intake to give Northstar a fresh stack.</p>}
          </div>
        </section>

        <section className="rail-card operating-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Founder needs to do</p>
              <h2>Human decisions and blockers</h2>
            </div>
          </div>
          <div className="overview-list">
            {founderNeeds.length ? founderNeeds.map((task) => (
              <article key={task.id} className="overview-list-item">
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                </div>
                <span className={`status-chip ${task.status}`}>{task.status.replaceAll('_', ' ')}</span>
              </article>
            )) : (
              <p className="empty-copy">No founder actions are waiting right now.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rail-card priorities-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Top priorities</p>
            <h2>The first stack Northstar should move</h2>
          </div>
        </div>
        <div className="priority-row">
          {topPriorities.length ? topPriorities.map((task) => (
            <article key={task.id} className="priority-card">
              <span className="issue-chip">{task.id.toUpperCase()}</span>
              <strong>{task.title}</strong>
              <p>{task.description}</p>
              <span className="task-metrics">P{formatScore(task.priority_score)} · {task.category}</span>
            </article>
          )) : <p className="empty-copy">Top priorities will appear here once Northstar scores the current backlog.</p>}
        </div>
      </section>
    </section>
  );
}
