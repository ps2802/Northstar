import type { DashboardSection } from '../lib/types';

interface WorkspaceNavProps {
  activeSection: DashboardSection;
  founderQueueCount: number;
  onChange: (section: DashboardSection) => void;
  pendingApprovals: number;
}

const navItems: Array<{ key: DashboardSection; label: string }> = [
  { key: 'command_center', label: 'Dashboard' },
  { key: 'board', label: 'Board' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'content', label: 'Campaigns' },
  { key: 'gtm_plan', label: 'Analytics' },
  { key: 'settings', label: 'Settings' },
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
            <p className="brand-tagline">Board-first founder workspace</p>
          </div>
        </div>

        <p className="workspace-sidebar-intro">Visible agent work, founder approvals, and shipped output stay anchored to the board.</p>
      </div>

      <nav className="workspace-nav" aria-label="Workspace sections">
        <div className="workspace-nav-list">
          {navItems.map((item) => {
            const badge =
              item.key === 'approvals'
                ? pendingApprovals
                : item.key === 'board'
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
                </span>
                {badge ? <strong>{badge}</strong> : null}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
