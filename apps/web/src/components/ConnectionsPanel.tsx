import { useEffect, useState } from 'react';
import type { AgentToolCategory, AgentToolWrapper, ExecutionProvider, FounderIntake, Integration, WorkspaceTruth } from '../lib/types';

interface ConnectionsPanelProps {
  activeProviderId: string;
  agentToolWrappers: AgentToolWrapper[];
  agentWrapperErrorById: Record<string, string>;
  connectErrorById: Record<string, string>;
  executionProviders: ExecutionProvider[];
  founderIntake: FounderIntake | null;
  integrations: Integration[];
  pendingAgentWrapperId?: string | null;
  pendingConnectId?: string | null;
  pendingDisconnectId?: string | null;
  pendingProviderActivateId?: string | null;
  pendingProviderConnectId?: string | null;
  pendingSyncId?: string | null;
  providerErrorById: Record<string, string>;
  workspaceTruth: WorkspaceTruth;
  onSelectAgentToolVendor: (wrapperId: AgentToolCategory, vendorId: string) => Promise<boolean>;
  onConnect: (integrationId: string, credential?: string) => Promise<boolean>;
  onDisconnect: (integrationId: string) => Promise<boolean>;
  onProviderActivate: (providerId: string) => Promise<boolean>;
  onProviderConnect: (providerId: string, credential?: string) => Promise<boolean>;
  onSync: (integrationId: string) => Promise<boolean>;
}

const integrationStatusLabel: Record<Integration['status'], string> = {
  connected: 'Saved, unverified',
  needs_key: 'Credential required',
  planned: 'Not set up',
};

const providerStatusLabel: Record<ExecutionProvider['status'], string> = {
  connected: 'Validated',
  needs_key: 'Key required',
  available: 'Local only',
  error: 'Validation failed',
};

const getReadOnlyNotice = (workspaceTruth: WorkspaceTruth) => {
  if (workspaceTruth.source === 'cached') {
    return 'Cached stale workspace. Credential changes are disabled until a live founder session is restored.';
  }

  if (workspaceTruth.source === 'sample') {
    return 'Sample workspace only. Credential changes are disabled here.';
  }

  if (workspaceTruth.understanding === 'fallback') {
    return 'Fallback company understanding is still active. Credential changes stay read-only until founder context grounds this workspace.';
  }

  if (workspaceTruth.source === 'unauthenticated' || workspaceTruth.sessionState !== 'active') {
    return 'No live founder session is active. Credential changes stay read-only until that is fixed.';
  }

  return null;
};

export function ConnectionsPanel({
  activeProviderId,
  agentToolWrappers,
  agentWrapperErrorById,
  connectErrorById,
  executionProviders,
  founderIntake,
  integrations,
  pendingAgentWrapperId,
  pendingConnectId,
  pendingDisconnectId,
  pendingProviderActivateId,
  pendingProviderConnectId,
  pendingSyncId,
  providerErrorById,
  workspaceTruth,
  onSelectAgentToolVendor,
  onConnect,
  onDisconnect,
  onProviderActivate,
  onProviderConnect,
  onSync,
}: ConnectionsPanelProps) {
  const [providerSecrets, setProviderSecrets] = useState<Record<string, string>>({});
  const [integrationSecrets, setIntegrationSecrets] = useState<Record<string, string>>({});
  const [wrapperSelections, setWrapperSelections] = useState<Record<string, string>>({});
  const mutationsLocked = !workspaceTruth.riskyMutationsAllowed;
  const readOnlyNotice = getReadOnlyNotice(workspaceTruth);
  const savedProviderCount = executionProviders.filter((provider) => provider.status === 'connected').length;
  const savedIntegrationCount = integrations.filter((integration) => integration.status === 'connected').length;
  const configuredWrapperCount = agentToolWrappers.filter((wrapper) => wrapper.selectedVendorId).length;
  const sessionLabel = workspaceTruth.sessionState === 'active'
    ? workspaceTruth.session?.email ?? workspaceTruth.session?.name ?? 'Live founder session'
    : 'Not live';

  useEffect(() => {
    setWrapperSelections(
      Object.fromEntries(agentToolWrappers.map((wrapper) => [wrapper.id, wrapper.selectedVendorId ?? wrapper.vendors[0]?.id ?? '']))
    );
  }, [agentToolWrappers]);

  return (
    <section className="rail-card connections-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Connections</p>
          <h2>Saved credentials and execution preferences</h2>
        </div>
      </div>

      <p className="summary-copy">
        This surface only shows what has been saved in the workspace. Saved credentials do not mean the underlying tool has been validated.
      </p>

      {readOnlyNotice ? <div className="connection-honesty-banner">{readOnlyNotice}</div> : null}

      <div className="connection-callout">
        <span>Founder session</span>
        <strong>{sessionLabel}</strong>
      </div>

      <div className="connection-callout connection-callout-secondary">
        <span>Priority channel</span>
        <strong>{founderIntake?.keyChannel ?? 'Not provided yet'}</strong>
      </div>

      <section className="connection-section">
        <div className="connection-section-head">
          <div>
            <p className="eyebrow">Agent stack</p>
            <h3>Preferred wrapper by capability</h3>
          </div>
          <span className="domain-badge">{configuredWrapperCount} chosen</span>
        </div>

        <div className="connection-grid">
          {agentToolWrappers.map((wrapper) => {
            const selectedVendorId = wrapperSelections[wrapper.id] ?? wrapper.selectedVendorId ?? wrapper.vendors[0]?.id ?? '';
            const selectedVendor = wrapper.vendors.find((vendor) => vendor.id === selectedVendorId);
            const wrapperLocked = mutationsLocked || pendingAgentWrapperId === wrapper.id;

            return (
              <article key={wrapper.id} className={`connection-card ${wrapper.selectedVendorId ? 'connection-card-active' : ''}`}>
                <div className="connection-card-head">
                  <strong>{wrapper.label}</strong>
                  <span className="domain-badge">{selectedVendor?.name ?? 'Not chosen'}</span>
                </div>
                <p>{wrapper.objective}</p>
                {selectedVendor ? <p className="connection-card-caption">{selectedVendor.tagline}</p> : null}
                <p className="connection-card-caption">
                  Last updated {new Date(wrapper.updatedAt).toLocaleString()}
                </p>
                {agentWrapperErrorById[wrapper.id] ? <p className="inline-error">{agentWrapperErrorById[wrapper.id]}</p> : null}

                <label className="connection-field">
                  Preferred vendor
                  <select
                    disabled={wrapperLocked}
                    value={selectedVendorId}
                    onChange={(event) => {
                      const nextVendorId = event.target.value;
                      setWrapperSelections((current) => ({ ...current, [wrapper.id]: nextVendorId }));
                    }}
                  >
                    {wrapper.vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="connection-card-meta">
                  <span>{wrapper.vendors.length} vendor options</span>
                  <div className="connection-card-actions">
                    <button
                      className="primary-button secondary"
                      type="button"
                      disabled={wrapperLocked || !selectedVendorId || selectedVendorId === wrapper.selectedVendorId}
                      onClick={async () => {
                        await onSelectAgentToolVendor(wrapper.id, selectedVendorId);
                      }}
                    >
                      {pendingAgentWrapperId === wrapper.id ? 'Saving...' : wrapper.selectedVendorId ? 'Update preferred vendor' : 'Save preferred vendor'}
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
            <p className="eyebrow">Execution providers</p>
          <h3>Choose the validated provider this workspace should prefer</h3>
          </div>
          <span className="domain-badge">{savedProviderCount} saved</span>
        </div>

        <div className="connection-grid">
          {executionProviders.map((provider) => {
            const isConnecting = pendingProviderConnectId === provider.id;
            const isActivating = pendingProviderActivateId === provider.id;
            const providerSecret = providerSecrets[provider.id] ?? '';
            const providerLocked = mutationsLocked || isConnecting;
            const activationLocked = mutationsLocked || isActivating || (provider.authType === 'api_key' && provider.status !== 'connected');

            return (
              <article key={provider.id} className={`connection-card ${activeProviderId === provider.id ? 'connection-card-active' : ''}`}>
                <div className="connection-card-head">
                  <strong>{provider.name}</strong>
                  <span className="domain-badge">{providerStatusLabel[provider.status]}</span>
                </div>
                <p>{provider.description}</p>
                <p className="connection-card-caption">{provider.modelHint}</p>
                {provider.maskedSecret ? <p className="connection-card-caption">Saved credential: {provider.maskedSecret}</p> : null}
                {provider.status === 'connected' ? (
                  <p className="connection-card-caption">Last validated {provider.connectedAt ? new Date(provider.connectedAt).toLocaleString() : 'recently'}.</p>
                ) : null}
                {provider.status === 'error' && provider.lastError ? <p className="inline-error">{provider.lastError}</p> : null}
                {providerErrorById[provider.id] ? <p className="inline-error">{providerErrorById[provider.id]}</p> : null}

                {provider.authType === 'api_key' ? (
                  <label className="connection-field">
                    API key
                    <input
                      disabled={providerLocked}
                      value={providerSecret}
                      onChange={(event) => setProviderSecrets((current) => ({ ...current, [provider.id]: event.target.value }))}
                      placeholder={`Paste ${provider.name} key`}
                    />
                  </label>
                ) : (
                  <p className="connection-card-caption">This local provider can be selected, but validation is still outside this founder UI.</p>
                )}

                <div className="connection-card-meta">
                  <span>{provider.authType === 'api_key' ? 'API key' : 'Local provider'}</span>
                  <div className="connection-card-actions">
                    {provider.authType === 'api_key' ? (
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={providerLocked}
                        onClick={async () => {
                          const connected = await onProviderConnect(provider.id, providerSecret);
                          if (connected) {
                            setProviderSecrets((current) => ({ ...current, [provider.id]: '' }));
                          }
                        }}
                      >
                        {isConnecting ? 'Validating...' : provider.status === 'connected' ? 'Revalidate key' : 'Validate key'}
                      </button>
                    ) : null}
                    <button
                      className="primary-button secondary"
                      type="button"
                      disabled={activationLocked}
                      onClick={async () => {
                        await onProviderActivate(provider.id);
                      }}
                    >
                      {isActivating ? 'Saving...' : activeProviderId === provider.id ? 'Preferred provider' : 'Use as preferred'}
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
            <p className="eyebrow">Workflow tools</p>
            <h3>Saved access only until validation exists</h3>
          </div>
          <span className="domain-badge">{savedIntegrationCount} saved</span>
        </div>

        <div className="connection-grid">
          {integrations.map((integration) => {
            const isConnecting = pendingConnectId === integration.id;
            const isDisconnecting = pendingDisconnectId === integration.id;
            const isSyncing = pendingSyncId === integration.id;
            const integrationSecret = integrationSecrets[integration.id] ?? '';
            const connectionLocked = mutationsLocked || isConnecting;
            const disconnectLocked = mutationsLocked || integration.status !== 'connected' || isDisconnecting;
            const validationUnavailable = integration.status === 'connected'
              ? `Validation for ${integration.name} is not available in this founder UI yet.`
              : `Save ${integration.name} first before validation can exist.`;
            const oauthCopy = integration.authType === 'oauth'
              ? `${integration.name} needs a real OAuth handoff. This founder UI cannot mark it connected directly.`
              : null;

            return (
              <article key={integration.id} className={`connection-card ${integration.status === 'connected' ? 'connection-card-active' : ''}`}>
                <div className="connection-card-head">
                  <strong>{integration.name}</strong>
                  <span className="domain-badge">{integrationStatusLabel[integration.status]}</span>
                </div>
                <p>{integration.description}</p>
                <p className="connection-card-caption">
                  {integration.maskedSecret ? 'Credential saved locally.' : integration.credentialLabel}
                </p>
                {integration.maskedSecret ? <p className="connection-card-caption">Saved credential: {integration.maskedSecret}</p> : null}
                {integration.status === 'connected' ? <p className="connection-card-caption">{validationUnavailable}</p> : null}
                {oauthCopy ? <p className="connection-card-caption">{oauthCopy}</p> : null}
                {connectErrorById[integration.id] ? <p className="inline-error">{connectErrorById[integration.id]}</p> : null}

                <label className="connection-field">
                  {integration.credentialLabel}
                  <input
                    disabled={connectionLocked || integration.authType === 'oauth'}
                    value={integrationSecret}
                    onChange={(event) => setIntegrationSecrets((current) => ({ ...current, [integration.id]: event.target.value }))}
                    placeholder={integration.authType === 'oauth' ? 'OAuth flow required' : `Paste ${integration.credentialLabel.toLowerCase()}`}
                  />
                </label>

                <div className="connection-card-meta">
                  <span>{integration.authType === 'api_key' ? 'API key' : 'OAuth'}</span>
                  <div className="connection-card-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={connectionLocked || integration.authType === 'oauth'}
                      onClick={async () => {
                        const connected = await onConnect(integration.id, integrationSecret);
                        if (connected) {
                          setIntegrationSecrets((current) => ({ ...current, [integration.id]: '' }));
                        }
                      }}
                    >
                      {integration.authType === 'oauth'
                        ? 'OAuth required'
                        : isConnecting
                          ? 'Saving...'
                          : integration.status === 'connected'
                            ? 'Update saved access'
                            : 'Save access'}
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled
                      title={validationUnavailable}
                      onClick={async () => {
                        await onSync(integration.id);
                      }}
                    >
                      {isSyncing ? 'Checking...' : 'Validation unavailable'}
                    </button>
                    <button
                      className="ghost-button danger-button"
                      type="button"
                      disabled={disconnectLocked}
                      onClick={async () => {
                        await onDisconnect(integration.id);
                      }}
                    >
                      {isDisconnecting ? 'Removing...' : 'Remove saved access'}
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
