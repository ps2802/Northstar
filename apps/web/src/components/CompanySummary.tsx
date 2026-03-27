import type { CompanyProfile, FounderIntake, Project, WebsiteSnapshot } from '../lib/types';
import { formatDateTime, formatDomain } from '../lib/format';

interface CompanySummaryProps {
  founderIntake?: FounderIntake | null;
  project: Project;
  profile: CompanyProfile;
  snapshot: WebsiteSnapshot;
}

export function CompanySummary({ founderIntake, project, profile, snapshot }: CompanySummaryProps) {
  const topOpportunities = profile.opportunities.slice(0, 2);
  const remainingOpportunities = profile.opportunities.slice(2);

  return (
    <section className="rail-card summary-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Northstar readout</p>
          <h2>{profile.companyName}</h2>
        </div>
        <span className="domain-badge">{formatDomain(project.websiteUrl)}</span>
      </div>

      <p className="summary-copy">{profile.summary}</p>

      <div className="readout-grid">
        <article className="readout-item">
          <span>Guessed ICP</span>
          <strong>{profile.guessedIcp}</strong>
        </article>
        <article className="readout-item">
          <span>Last analysis</span>
          <strong>{formatDateTime(snapshot.capturedAt)}</strong>
        </article>
      </div>

      {founderIntake ? (
        <div className="readout-grid">
          <article className="readout-item">
            <span>Founder goal</span>
            <strong>{founderIntake.mainGoal}</strong>
          </article>
          <article className="readout-item">
            <span>Closest alternatives</span>
            <strong>{founderIntake.competitors || 'Not set yet'}</strong>
          </article>
        </div>
      ) : null}

      <div className="summary-section">
        <p className="eyebrow">Highest-signal opportunities</p>
        <ul className="signal-list compact-signal-list">
          {topOpportunities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <details className="rail-details">
        <summary className="rail-details-summary">
          <div>
            <p className="eyebrow">Open full analysis</p>
            <span className="summary-toggle-copy">Pages used, additional opportunities, and supporting notes</span>
          </div>
        </summary>

        <div className="summary-detail-stack">
          {remainingOpportunities.length ? (
            <div className="summary-section">
              <p className="eyebrow">Additional opportunities</p>
              <ul className="signal-list">
                {remainingOpportunities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="summary-section">
            <p className="eyebrow">Pages used in the readout</p>
            <ul className="page-list">
              {snapshot.pages.map((page) => (
                <li key={page.url}>
                  <strong>{page.title}</strong>
                  <span>{page.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
}
