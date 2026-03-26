import type { CompanyProfile, Project, WebsiteSnapshot } from '../lib/types';
import { formatDateTime, formatDomain } from '../lib/format';

interface CompanySummaryProps {
  project: Project;
  profile: CompanyProfile;
  snapshot: WebsiteSnapshot;
}

export function CompanySummary({ project, profile, snapshot }: CompanySummaryProps) {
  return (
    <section className="summary-grid">
      <article className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Intelligence brief</p>
            <h2>{profile.companyName}</h2>
          </div>
          <span className="pill">{formatDomain(project.websiteUrl)}</span>
        </div>
        <p className="summary-copy">{profile.summary}</p>
        <div className="stat-row">
          <div>
            <span>Target buyer</span>
            <strong>{profile.guessedIcp}</strong>
          </div>
          <div>
            <span>Scanned</span>
            <strong>{formatDateTime(snapshot.capturedAt)}</strong>
          </div>
        </div>
      </article>

      <article className="panel">
        <p className="eyebrow">Pages scanned</p>
        <ul className="list-stack">
          {snapshot.pages.map((page) => (
            <li key={page.url}>
              <strong>{page.title}</strong>
              <span>{page.summary}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="panel">
        <p className="eyebrow">Revenue gaps detected</p>
        <ul className="bullet-list">
          {profile.opportunities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
