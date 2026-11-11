import { FACTORY_ID } from './config';
import { viewCall } from './near';

export type Template = {
  id: string;
  name: string;
  description: string;
  daily_limit: string;
  approval_threshold: string;
  approved_payees: string[];
};

export type VaultInfo = {
  vault_id: string;
  agent_id: string;
  owner_id: string;
  template_id: string;
  state: 'CREATING' | 'READY' | 'NO_AGENT';
  created_at: number;
};

export type FactoryConfig = {
  owner_id: string;
  vault_code_hash: string;
  hosted_agent_key: string;
  min_deposit: string;
  agent_funding: string;
  vault_count: number;
};

// Read-only calls to the factory; they work from the browser or the server.
export const factory = {
  config: () => viewCall<FactoryConfig>('get_config', {}, FACTORY_ID),
  templates: () => viewCall<Template[]>('get_templates', {}, FACTORY_ID),
  vault: (vaultId: string) => viewCall<VaultInfo | null>('get_vault', { vault_id: vaultId }, FACTORY_ID),
  vaultsOf: (ownerId: string) => viewCall<VaultInfo[]>('get_vaults_by_owner', { owner_id: ownerId }, FACTORY_ID),
  nameFree: (name: string) => viewCall<boolean>('is_name_available', { name }, FACTORY_ID),
};

export const vaultIdFor = (name: string) => `${name}.${FACTORY_ID}`;
export const vaultName = (vaultId: string) => vaultId.replace(`.${FACTORY_ID}`, '');

/** Mirrors the factory's rule, so the form can explain a bad name before the wallet does. */
export function nameProblem(name: string): string | null {
  if (name.length < 2 || name.length > 32) return 'Use 2 to 32 characters.';
  if (!/^[a-z\d_-]+$/.test(name)) return 'Use lowercase letters, digits, - or _.';
  if (/^[-_]|[-_]$|--|__/.test(name)) return 'No - or _ at the start, the end, or twice in a row.';
  if (name.endsWith('-agent')) return 'Names can’t end in -agent.';
  return null;
}
