import type { DashboardSection } from '../lib/types';

interface WorkspaceNavProps {
  activeSection: DashboardSection;
  founderQueueCount: number;
  onChange: (section: DashboardSection) => void;
  pendingApprovals: number;
}

const navGroups: Array<{
  title: string;
  blurb: string;
  items: Array<{ key: DashboardSection; label: string; detail?: string }>;
}> = [
  {
    title: 'Core',
    blurb: 'The core surfaces that move work forward.',
    items: [
      { key: 'command_center', label: 'Dashboard', detail: 'Build progress, live board, and founder queue' },
      { key: 'board', label: 'Board', detail: 'Project system for every agent and founder move' },
    ],
  },
  {
    title: 'Founder Ops',
    blurb: 'Demand, research, and execution stay in one loop.',
    items: [
      { key: 'gtm_plan', label: 'GTM Plan', detail: 'Bets, priorities, and launch posture' },
      { key: 'seo', label: 'SEO', detail: 'Search demand, page opportunities, and briefs' },
      { key: 'content', label: 'Content', detail: 'Approval-ready narratives and lifecycle assets' },
      { key: 'social', label: 'Social', detail: 'Founder-led signal and launch rhythm' },
      { key: 'website', label: 'Website', detail: 'Conversion clarity, objections, and product-story updates' },
      { key: 'research', label: 'Research', detail: 'Signals, feature suggestions, and pilot evidence' },
      { key: 'crm', label: 'CRM', detail: 'Pipeline follow-up, outreach, and native founder ops' },
    ],
  },
  {
    title: 'Ops',
    blurb: 'Review, integrations, and workspace defaults.',
    items: [
      { key: 'approvals', label: 'Approvals', detail: 'Pilot-ready work waiting on founder review' },
      { key: 'connections', label: 'Connections', detail: 'Tools that unlock execution and sync' },
      { key: 'settings', label: 'Settings', detail: 'ICP, goals, and operating context' },
    ],
  },
];

export function WorkspaceNav({ activeSection, founderQueueCount, onChange, pendingApprovals }: WorkspaceNavProps) {
  return (
    <aside className="workspace-sidebar">
      <div className="workspace-sidebar-head">
        <div className="brand-lockup">
          <div className="northstar-mark" aria-hidden="true">
            <span className="northstar-arm northstar-arm-vertical" />
            <span className="northstar-arm northstar-arm-horizontal" />
            <span className="northstar-arm northstar-arm-left" />
            <span className="northstar-arm northstar-arm-right" />
            <span className="northstar-core" />
          </div>
          <div>
            <p className="brand-name">Northstar</p>
            <p className="brand-tagline">Founder operating system</p>
          </div>
        </div>

        <div className="workspace-sidebar-status">
          <article>
            <span>Founder queue</span>
            <strong>{founderQueueCount}</strong>
          </article>
          <article>
            <span>Approvals</span>
            <strong>{pendingApprovals}</strong>
          </article>
        </div>

        <div className="workspace-sidebar-focus">
          <p className="workspace-nav-title">Wave focus</p>
          <div className="workspace-focus-list">
            <article className="workspace-focus-item">
              <span>Signals</span>
              <strong>Research should produce product suggestions</strong>
              <p>Keep feature cues, objections, and launch evidence visible instead of burying them in notes.</p>
            </article>
            <article className="workspace-focus-item">
              <span>Pilot readiness</span>
              <strong>{pendingApprovals ? `${pendingApprovals} review step${pendingApprovals === 1 ? '' : 's'} open` : 'Review path is clear'}</strong>
              <p>Launch assumptions should be explicit, reviewable, and attached to the board before anything ships.</p>
            </article>
            <article className="workspace-focus-item">
              <span>Founder ops</span>
              <strong>{founderQueueCount ? `${founderQueueCount} founder action${founderQueueCount === 1 ? '' : 's'} tracked` : 'Founder queue is clear'}</strong>
              <p>CRM follow-up and research loops should feel native to the workspace, not bolted on.</p>
            </article>
          </div>
        </div>
      </div>

      <nav className="workspace-nav" aria-label="Workspace sections">
        {navGroups.map((group) => (
          <div key={group.title} className="workspace-nav-group">
            <p className="workspace-nav-title">{group.title}</p>
            <p className="workspace-nav-blurb">{group.blurb}</p>
            <div className="workspace-nav-list">
              {group.items.map((item) => {
                const badge =
                  item.key === 'approvals'
                    ? pendingApprovals
                    : item.key === 'command_center'
                      ? founderQueueCount
                      : null;

                return (
                  <button
                    key={item.key}
                    className={`workspace-nav-item ${activeSection === item.key ? 'workspace-nav-item-active' : ''}`}
                    type="button"
                    onClick={() => onChange(item.key)}
                  >
                    <span className="workspace-nav-item-copy">
                      <strong>{item.label}</strong>
                      {item.detail ? <small>{item.detail}</small> : null}
                    </span>
                    {badge ? <strong>{badge}</strong> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
