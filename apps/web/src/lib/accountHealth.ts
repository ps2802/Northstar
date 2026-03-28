import type { ExecutionProvider, Integration } from './types';

export type AccountHealth = 'connected' | 'needs_reconnect' | 'not_connected';

export const accountHealthLabel: Record<AccountHealth, string> = {
  connected: 'Saved, unverified',
  needs_reconnect: 'Credential missing',
  not_connected: 'Not set up',
};

export const accountHealthClass: Record<AccountHealth, string> = {
  connected: 'connection-status-connected',
  needs_reconnect: 'connection-status-needs_key',
  not_connected: 'connection-status-planned',
};

export const getIntegrationHealth = (integration: Integration): AccountHealth => {
  if (integration.status === 'connected') {
    return 'connected';
  }

  if (integration.status === 'needs_key' && (integration.connectedAs || integration.maskedSecret || integration.connectedAt)) {
    return 'needs_reconnect';
  }

  return 'not_connected';
};

export const getProviderHealth = (provider: ExecutionProvider): AccountHealth => {
  if (provider.status === 'connected') {
    return 'connected';
  }

  if (provider.status === 'needs_key') {
    return 'needs_reconnect';
  }

  return 'not_connected';
};

export const summarizeHealth = (items: AccountHealth[]) => ({
  connected: items.filter((item) => item === 'connected').length,
  needsReconnect: items.filter((item) => item === 'needs_reconnect').length,
  notConnected: items.filter((item) => item === 'not_connected').length,
});
