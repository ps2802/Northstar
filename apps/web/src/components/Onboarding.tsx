import { useState } from 'react';

interface OnboardingProps {
  onAnalyze: (websiteUrl: string) => void;
  loading?: boolean;
}

export function Onboarding({ onAnalyze, loading }: OnboardingProps) {
  const [websiteUrl, setWebsiteUrl] = useState('https://acme-studio.com');

  return (
    <section className="hero-shell">
      <div className="hero-copy">
        <p className="eyebrow">Founder OS</p>
        <h1>The operating system for non-technical founders.</h1>
        <p className="lede">
          Drop in a website URL and the system will build a prioritized marketing and SEO backlog,
          then keep the work moving in a Kanban board you can actually run the business from.
        </p>
        <div className="feature-grid">
          <div>
            <strong>Website analysis</strong>
            <span>Crawl the homepage and key internal pages.</span>
          </div>
          <div>
            <strong>Prioritized backlog</strong>
            <span>See why every task exists and why it ranks where it does.</span>
          </div>
          <div>
            <strong>Approval-first artifacts</strong>
            <span>Generate a blog brief before anything is published.</span>
          </div>
        </div>
      </div>

      <form
        className="panel onboarding-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onAnalyze(websiteUrl);
        }}
      >
        <div>
          <h2>Start with your website</h2>
          <p>We will analyze what the company does, then seed the first task board.</p>
        </div>
        <label>
          Website URL
          <input
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://yourcompany.com"
            inputMode="url"
            autoComplete="url"
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Build my founder OS'}
        </button>
        <p className="hint">No publishing. No complex auth. Just a fast demo-ready command center.</p>
      </form>
    </section>
  );
}
