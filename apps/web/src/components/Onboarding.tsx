import { useState } from 'react';

interface OnboardingProps {
  error?: string | null;
  onAnalyze: (websiteUrl: string) => Promise<boolean>;
  loading?: boolean;
}

export function Onboarding({ error, onAnalyze, loading }: OnboardingProps) {
  const [websiteUrl, setWebsiteUrl] = useState('https://acme-studio.com');

  return (
    <section className="hero-shell">
      <div className="hero-copy">
        <p className="eyebrow">Northstar // Operator Intelligence</p>
        <h1>Your competitors are already compounding.</h1>
        <p className="lede">
          Every week without a growth system is revenue walking out the door.
          Drop in your URL — Northstar surfaces exactly where you're bleeding
          and hands you a ranked execution plan in 30 seconds.
        </p>
        <div className="feature-grid">
          <div>
            <strong>Signal extraction</strong>
            <span>We surface the revenue gaps your gut already suspects but can't quantify.</span>
          </div>
          <div>
            <strong>Zero-ambiguity backlog</strong>
            <span>Every task scored, justified, and ranked. No more guessing what to do next.</span>
          </div>
          <div>
            <strong>Gated execution</strong>
            <span>Nothing ships without your sign-off. You stay in control. The system does the work.</span>
          </div>
        </div>
      </div>

      <form
        className="panel onboarding-panel"
        onSubmit={async (event) => {
          event.preventDefault();
          await onAnalyze(websiteUrl);
        }}
      >
        <div>
          <h2>See what you're leaving on the table</h2>
          <p>Paste your URL. We'll show you the gaps costing you the most — and what to do about them.</p>
        </div>
        <label>
          Your website URL
          <input
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://yourcompany.com"
            inputMode="url"
            autoComplete="url"
            required
            disabled={loading}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Scanning for gaps...' : 'Reveal my growth gaps →'}
        </button>
        <p className="hint">// Most founders surface 4–6 high-leverage wins they'd completely missed.</p>
      </form>
    </section>
  );
}
