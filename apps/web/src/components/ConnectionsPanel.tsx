import { useState } from 'react';
import type { ExecutionProvider, FounderIntake, FounderSession, Integration } from '../lib/types';

interface ConnectionsPanelProps {
  activeProviderId: string;
  connectErrorById: Record<string, string>;
  executionProviders: ExecutionProvider[];
  founderIntake: FounderIntake | null;
  founderSession: FounderSession | null;
  integrations: Integration[];
  pendingConnectId?: string | null;
  pendingDisconnectId?: string | null;
  pendingProviderActivateId?: string | null;
  pendingProviderConnectId?: string | null;
  pendingSyncId?: string | null;
  providerErrorById: Record<string, string>;
  onConnect: (integrationId: string, credential?: string) => Promise<boolean>;
  onDisconnect: (integrationId: string) => Promise<boolean>;
  onProviderActivate: (providerId: string) => Promise<boolean>;
  onProviderConnect: (providerId: string, credential?: string) => Promise<boolean>;
  onSync: (integrationId: string) => Promise<boolean>;
}

const integrationStatusLabel: Record<Integration['status'], string> = {
  connected: 'Connected',
  needs_key: 'Needs key',
  planned: 'Planned',
};

const providerStatusLabel: Record<ExecutionProvider['status'], string> = {
  connected: 'Connected',
  needs_key: 'Needs key',
  available: 'Available',
};

export function ConnectionsPanel({
  activeProviderId,
  connectErrorById,
  executionProviders,
  founderIntake,
  founderSession,
  integrations,
  pendingConnectId,
  pendingDisconnectId,
  pendingProviderActivateId,
  pendingProviderConnectId,
  pendingSyncId,
  providerErrorById,
  onConnect,
  onDisconnect,
  onProviderActivate,
  onProviderConnect,
  onSync,
}: ConnectionsPanelProps) {
  const [providerSecrets, setProviderSecrets] = useState<Record<string, string>>({});
  const [integrationSecrets, setIntegrationSecrets] = useState<Record<string, string>>({});

  return (
    <section className="rail-card connections-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Connections</p>
          <h2>Integrations and execution engines</h2>
        </div>
      </div>

      <p className="summary-copy">
        Northstar should connect to the tools the founder already uses, then turn those signals into GTM, SEO, outreach, CRM, and approval work.
      </p>

      <div className="connection-callout">
        <span>Workspace access</span>
        <strong>{founderSession?.displayName ?? founderIntake?.email ?? 'Founder session not configured'}</strong>
      </div>

      <div className="connection-callout connection-callout-secondary">
        <span>Priority channel</span>
        <strong>{founderIntake?.keyChannel ?? 'SEO and founder-led content'}</strong>
      </div>

      <section className="connection-section">
        <div className="connection-section-head">
          <div>
            <p className="eyebrow">Execution engines</p>
            <h3>Choose the provider Northstar should run through</h3>
          </div>
          <span className="domain-badge">{executionProviders.length} available</span>
        </div>

        <div className="connection-grid">
          {executionProviders.map((provider) => {
            const isConnecting = pendingProviderConnectId === provider.id;
            const isActivating = pendingProviderActivateId === provider.id;
            const providerSecret = providerSecrets[provider.id] ?? '';

            return (
              <article key={provider.id} className={`connection-card ${activeProviderId === provider.id ? 'connection-card-active' : ''}`}>
                <div className="connection-card-head">
                  <strong>{provider.name}</strong>
                  <span className="domain-badge">{providerStatusLabel[provider.status]}</span>
                </div>
                <p>{provider.description}</p>
                <p className="connection-card-caption">{provider.modelHint}</p>
                {provider.maskedSecret ? <p className="connection-card-caption">Saved credential: {provider.maskedSecret}</p> : null}
                {providerErrorById[provider.id] ? <p className="inline-error">{providerErrorById[provider.id]}</p> : null}

                {provider.authType === 'api_key' ? (
                  <label className="connection-field">
                    API key
                    <input
                      value={providerSecret}
                      onChange={(event) => setProviderSecrets((current) => ({ ...current, [provider.id]: event.target.value }))}
                      placeholder={`Paste ${provider.name} key`}
                    />
                  </label>
                ) : (
                  <p className="connection-card-caption">Use your current Northstar CLI setup and make it the active engine.</p>
                )}

                <div className="connection-card-meta">
                  <span>{provider.authType === 'api_key' ? 'API key' : 'CLI'}</span>
                  <div className="connection-card-actions">
                    {provider.authType === 'api_key' ? (
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={isConnecting}
                        onClick={async () => {
                          const connected = await onProviderConnect(provider.id, providerSecret);
                          if (connected) {
                            setProviderSecrets((current) => ({ ...current, [provider.id]: '' }));
                          }
                        }}
                      >
                        {isConnecting ? 'Saving...' : provider.status === 'connected' ? 'Update key' : 'Connect'}
                      </button>
                    ) : null}
                    <button
                      className="primary-button secondary"
                      type="button"
                      disabled={isActivating || (provider.authType === 'api_key' && provider.status !== 'connected')}
                      onClick={async () => {
                        await onProviderActivate(provider.id);
                      }}
                    >
                      {isActivating ? 'Activating...' : activeProviderId === provider.id ? 'Active provider' : 'Make active'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="connection-section">
        <div className="connection-section-head">
          <div>
            <p className="eyebrow">Workflow integrations</p>
            <h3>Connect the tools that unlock real execution</h3>
          </div>
          <span className="domain-badge">{integrations.filter((integration) => integration.status === 'connected').length} live</span>
        </div>

        <div className="connection-grid">
          {integrations.map((integration) => {
            const isConnecting = pendingConnectId === integration.id;
            const isDisconnecting = pendingDisconnectId === integration.id;
            const isSyncing = pendingSyncId === integration.id;
            const integrationSecret = integrationSecrets[integration.id] ?? '';

            return (
              <article key={integration.id} className={`connection-card ${integration.status === 'connected' ? 'connection-card-active' : ''}`}>
                <div className="connection-card-head">
                  <strong>{integration.name}</strong>
                  <span className="domain-badge">{integrationStatusLabel[integration.status]}</span>
                </div>
                <p>{integration.description}</p>
                <p className="connection-card-caption">{integration.connectedAs ?? integration.credentialLabel}</p>
                {integration.maskedSecret ? <p className="connection-card-caption">Saved credential: {integration.maskedSecret}</p> : null}
                {connectErrorById[integration.id] ? <p className="inline-error">{connectErrorById[integration.id]}</p> : null}

                <label className="connection-field">
                  {integration.credentialLabel}
                  <input
                    value={integrationSecret}
                    onChange={(event) => setIntegrationSecrets((current) => ({ ...current, [integration.id]: event.target.value }))}
                    placeholder={`Paste ${integration.credentialLabel.toLowerCase()}`}
                  />
                </label>

                <div className="connection-card-meta">
                  <span>{integration.authType === 'api_key' ? 'API key' : 'OAuth'}</span>
                  <div className="connection-card-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={isConnecting}
                      onClick={async () => {
                        const connected = await onConnect(integration.id, integrationSecret);
                        if (connected) {
                          setIntegrationSecrets((current) => ({ ...current, [integration.id]: '' }));
                        }
                      }}
                    >
                      {isConnecting ? 'Connecting...' : integration.status === 'connected' ? 'Update access' : 'Connect'}
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={integration.status !== 'connected' || isSyncing}
                      onClick={async () => {
                        await onSync(integration.id);
                      }}
                    >
                      {isSyncing ? 'Syncing...' : 'Sync now'}
                    </button>
                    <button
                      className="ghost-button danger-button"
                      type="button"
                      disabled={integration.status !== 'connected' || isDisconnecting}
                      onClick={async () => {
                        await onDisconnect(integration.id);
                      }}
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
