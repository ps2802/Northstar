import { useEffect, useMemo, useState } from 'react';
import { formatDateTime } from '../lib/format';
import type { FounderIntake, OnboardingDraft } from '../lib/types';

interface OnboardingProps {
  error?: string | null;
  initialDraft?: OnboardingDraft | null;
  initialIntake?: FounderIntake | null;
  onAnalyze: (intake: FounderIntake) => Promise<boolean>;
  onClearDraft?: () => void;
  onDraftChange?: (draft: OnboardingDraft) => void;
  loading?: boolean;
}

const defaultIntake: FounderIntake = {
  websiteUrl: 'https://acme-studio.com',
  businessDescription: 'A boutique growth and design studio helping founder-led businesses improve conversion, visibility, and positioning.',
  icp: 'Founder-led SaaS and service businesses with lean teams and inconsistent growth systems.',
  mainGoal: 'Generate more qualified pipeline from content and website improvements.',
  keyChannel: 'SEO, homepage messaging, and founder-led social content',
  whatTried: 'A few blog posts, scattered LinkedIn posts, and ad hoc website updates.',
  priorityWork: 'Build the GTM plan first, then create the first SEO and content tasks.',
  competitors: 'Growth.design, Animalz, and boutique conversion agencies',
  bottleneck: 'conversion',
  authMethod: 'email',
  email: 'founder@acme-studio.com',
};

const steps = [
  { key: 'company', label: 'Company signal' },
  { key: 'follow_up', label: 'Founder answers' },
  { key: 'auth', label: 'Sign in' },
] as const;

export function Onboarding({
  error,
  initialDraft,
  initialIntake,
  onAnalyze,
  onClearDraft,
  onDraftChange,
  loading,
}: OnboardingProps) {
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  const [intake, setIntake] = useState<FounderIntake>(initialDraft?.intake ?? initialIntake ?? defaultIntake);

  useEffect(() => {
    onDraftChange?.({
      step,
      intake,
      updatedAt: new Date().toISOString(),
    });
  }, [intake, step]);

  const stepValid = useMemo(() => {
    if (step === 0) {
      return intake.websiteUrl.trim() && intake.businessDescription.trim();
    }

    if (step === 1) {
      return intake.icp.trim() && intake.mainGoal.trim() && intake.priorityWork.trim();
    }

    if (step === 2) {
      return Boolean(intake.email?.trim());
    }

    return false;
  }, [intake, step]);

  const updateIntake = <Key extends keyof FounderIntake>(key: Key, value: FounderIntake[Key]) => {
    setIntake((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="launchpad">
      <div className="launchpad-story">
        <article className="launchpad-card">
          <p className="eyebrow">Founder operating system</p>
          <h2>Northstar starts with company truth, not random prompting.</h2>
          <p className="lede">
            Ingest the site, tighten the company profile with founder answers, then open a dashboard that separates Northstar execution from founder decisions.
          </p>
        </article>

        <div className="launchpad-proof-grid launchpad-proof-grid-tall">
          <article className="launchpad-proof">
            <span>01</span>
            <strong>Read the business</strong>
            <p>URL plus founder context creates a better brief than website signal alone.</p>
          </article>
          <article className="launchpad-proof">
            <span>02</span>
            <strong>Ask follow-up questions</strong>
            <p>Northstar calibrates ICP, goals, bottlenecks, channels, and work preferences before scoring tasks.</p>
          </article>
          <article className="launchpad-proof">
            <span>03</span>
            <strong>Open the founder dashboard</strong>
            <p>Command center, kanban, approvals, and integrations all live in one operating shell.</p>
          </article>
        </div>

        <article className="launchpad-note">
          <p className="eyebrow">Northstar rule</p>
          <p>
            The founder should understand what Northstar is doing, what the founder needs to do, and why each task matters without digging through clutter.
          </p>
        </article>
      </div>

      <form
        className="launchpad-form launchpad-form-staged"
        onSubmit={async (event) => {
          event.preventDefault();

          if (step < steps.length - 1) {
            setStep((current) => current + 1);
            return;
          }

          const created = await onAnalyze({
            ...intake,
            authMethod: 'email',
            email: intake.email?.trim(),
          });

          if (created) {
            onClearDraft?.();
          }
        }}
      >
        {initialDraft ? (
          <div className="draft-banner">
            <div>
              <p className="eyebrow">Recovered draft</p>
              <strong>Resume from Step {initialDraft.step + 1}</strong>
              <p className="summary-copy">
                Founder answers were saved locally on {formatDateTime(initialDraft.updatedAt)} so the onboarding flow can survive refreshes and re-entry.
              </p>
            </div>

            <button className="ghost-button" type="button" onClick={() => onClearDraft?.()} disabled={loading}>
              Start fresh
            </button>
          </div>
        ) : null}

        <div className="stepper">
          {steps.map((item, index) => (
            <button
              key={item.key}
              className={`step-pill ${index === step ? 'step-pill-active' : ''} ${index < step ? 'step-pill-complete' : ''}`}
              type="button"
              onClick={() => setStep(index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>

        {step === 0 ? (
          <div className="launchpad-section">
            <div>
              <p className="eyebrow">Step 1</p>
              <h2>Start with the business signal</h2>
              <p>Enter the website and describe the company in founder terms, not agency jargon.</p>
            </div>

            <label>
              Website URL
              <input
                value={intake.websiteUrl}
                onChange={(event) => updateIntake('websiteUrl', event.target.value)}
                placeholder="https://yourcompany.com"
                inputMode="url"
                autoComplete="url"
                required
                disabled={loading}
              />
            </label>

            <label>
              Business description
              <textarea
                value={intake.businessDescription}
                onChange={(event) => updateIntake('businessDescription', event.target.value)}
                rows={5}
                placeholder="What does the business do, for whom, and why does it win?"
                required
                disabled={loading}
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="launchpad-section">
            <div>
              <p className="eyebrow">Step 2</p>
              <h2>Answer the founder follow-ups</h2>
              <p>Northstar uses this to tune scoring, planning, and ownership on the board.</p>
            </div>

            <div className="form-grid">
              <label>
                Ideal customer profile
                <input
                  value={intake.icp}
                  onChange={(event) => updateIntake('icp', event.target.value)}
                  placeholder="Who are you actually trying to win?"
                  disabled={loading}
                  required
                />
              </label>

              <label>
                Main goal right now
                <input
                  value={intake.mainGoal}
                  onChange={(event) => updateIntake('mainGoal', event.target.value)}
                  placeholder="Pipeline, activation, signups, conversion, retention"
                  disabled={loading}
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Key channels
                <input
                  value={intake.keyChannel}
                  onChange={(event) => updateIntake('keyChannel', event.target.value)}
                  placeholder="SEO, X, LinkedIn, website, email"
                  disabled={loading}
                />
              </label>

              <label>
                What has already been tried
                <input
                  value={intake.whatTried}
                  onChange={(event) => updateIntake('whatTried', event.target.value)}
                  placeholder="Campaigns, channels, experiments, or constraints"
                  disabled={loading}
                />
              </label>
            </div>

            <label>
              What should Northstar prioritize first
              <textarea
                value={intake.priorityWork}
                onChange={(event) => updateIntake('priorityWork', event.target.value)}
                rows={4}
                placeholder="GTM plan, SEO, social, messaging, research, CRM, or founder tasks"
                disabled={loading}
                required
              />
            </label>

            <div className="form-grid">
              <label>
                Closest competitors or alternatives
                <input
                  value={intake.competitors}
                  onChange={(event) => updateIntake('competitors', event.target.value)}
                  placeholder="Who else the founder compares against"
                  disabled={loading}
                />
              </label>

              <label>
                Current bottleneck
                <select
                  value={intake.bottleneck}
                  onChange={(event) => updateIntake('bottleneck', event.target.value as FounderIntake['bottleneck'])}
                  disabled={loading}
                >
                  <option value="traffic">Traffic</option>
                  <option value="conversion">Conversion</option>
                  <option value="both">Both</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="launchpad-section">
            <div>
              <p className="eyebrow">Step 3</p>
              <h2>Sign in to create the dashboard</h2>
              <p>Auth is the handoff from intake into a persistent founder workspace.</p>
            </div>

            <div className="auth-grid">
              <button
                className="auth-card auth-card-active"
                type="button"
                onClick={() => updateIntake('authMethod', 'email')}
              >
                <span className="eyebrow">Founder access</span>
                <strong>Use founder work email</strong>
                <p>Northstar uses the founder email plus workspace website to create or restore the authenticated workspace session.</p>
              </button>
            </div>

            <label>
              Founder work email
              <input
                value={intake.email ?? ''}
                onChange={(event) => updateIntake('email', event.target.value)}
                autoComplete="email"
                placeholder="founder@company.com"
                disabled={loading}
                required
              />
            </label>

            <div className="launchpad-checklist">
              <div>
                <span>Company</span>
                <strong>{intake.websiteUrl}</strong>
              </div>
              <div>
                <span>Goal</span>
                <strong>{intake.mainGoal}</strong>
              </div>
              <div>
                <span>Priority</span>
                <strong>{intake.priorityWork}</strong>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <div className="launchpad-actions">
          {step > 0 ? (
            <button className="ghost-button" type="button" onClick={() => setStep((current) => current - 1)} disabled={loading}>
              Back
            </button>
          ) : (
            <div className="launchpad-footnote">
              <span className="hint">No dead setup. Every answer should change how the board behaves.</span>
              <span className="hint">
                {initialDraft ? `Last saved ${formatDateTime(initialDraft.updatedAt)}` : 'Answers save locally while you move through the flow.'}
              </span>
            </div>
          )}

          <button className="primary-button" type="submit" disabled={loading || !stepValid}>
            {step === steps.length - 1 ? (loading ? 'Opening workspace...' : 'Create or restore founder dashboard') : 'Continue'}
          </button>
        </div>
      </form>
    </section>
  );
}
