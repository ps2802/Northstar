import { accountHealthClass, accountHealthLabel, getIntegrationHealth, getProviderHealth, providerHealthLabel, summarizeHealth } from '../lib/accountHealth';
import type { CompanyProfile, ExecutionProvider, FounderIntake, Integration, Project } from '../lib/types';

interface SettingsPanelProps {
  activeProviderId: string;
  executionProviders: ExecutionProvider[];
  founderIntake: FounderIntake | null;
  integrations: Integration[];
  profile: CompanyProfile;
  project: Project;
  onOpenConnections: () => void;
}

export function SettingsPanel({
  activeProviderId,
  executionProviders,
  founderIntake,
  integrations,
  profile,
  project,
  onOpenConnections,
}: SettingsPanelProps) {
  const integrationHealth = integrations.map(getIntegrationHealth);
  const providerHealth = executionProviders.map(getProviderHealth);
  const integrationSummary = summarizeHealth(integrationHealth);
  const providerSummary = summarizeHealth(providerHealth);

  return (
    <div className="settings-stack">
      <section className="rail-card section-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Workspace context</h2>
          </div>
        </div>

        <div className="settings-grid">
          <article className="settings-card">
            <span>Website</span>
            <strong>{founderIntake?.websiteUrl ?? project.websiteUrl}</strong>
          </article>
          <article className="settings-card">
            <span>Audience</span>
            <strong>{founderIntake?.icp ?? profile.guessedIcp}</strong>
          </article>
          <article className="settings-card">
            <span>Main goal</span>
            <strong>{founderIntake?.mainGoal ?? 'Create a clearer growth plan'}</strong>
          </article>
          <article className="settings-card">
            <span>Priority channel</span>
            <strong>{founderIntake?.keyChannel ?? 'SEO and founder content'}</strong>
          </article>
        </div>
      </section>

      <section className="rail-card section-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Saved access</p>
            <h2>Saved access state</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onOpenConnections}>
            Open connections
          </button>
        </div>

        <div className="settings-connection-summary">
          <article className="settings-detail-card">
            <span>Workflow accounts</span>
            <div className="settings-chip-row">
              <span className="connection-status-connected">{integrationSummary.connected} saved, unverified</span>
              <span className="connection-status-needs_key">{integrationSummary.needsReconnect} credential missing</span>
              <span className="connection-status-planned">{integrationSummary.notConnected} not set up</span>
            </div>
          </article>
          <article className="settings-detail-card">
            <span>Execution engines</span>
            <div className="settings-chip-row">
              <span className="connection-status-connected">{providerSummary.connected} validated</span>
              <span className="connection-status-needs_key">{providerSummary.needsReconnect} needs reconnect</span>
              <span className="connection-status-planned">{providerSummary.notConnected} not set up</span>
            </div>
          </article>
        </div>

        <div className="settings-detail-grid">
          <article className="settings-detail-card settings-detail-card-lead">
            <span>Company summary</span>
            <strong>{profile.companyName}</strong>
            <p>{profile.summary}</p>
          </article>

          <article className="settings-detail-card">
            <span>Integrations</span>
            <div className="settings-status-list">
              {integrations.map((integration) => (
                <div key={integration.id} className="settings-status-row">
                  <strong>{integration.name}</strong>
                  <span className={accountHealthClass[getIntegrationHealth(integration)]}>{accountHealthLabel[getIntegrationHealth(integration)]}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="settings-detail-card">
            <span>Execution engines</span>
            <div className="settings-status-list">
              {executionProviders.map((provider) => (
                <div key={provider.id} className="settings-status-row">
                  <strong>{provider.name}{activeProviderId === provider.id ? ' (active)' : ''}</strong>
                  <span className={accountHealthClass[getProviderHealth(provider)]}>{providerHealthLabel[getProviderHealth(provider)]}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
