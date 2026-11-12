'use client';

import { actionCreators } from '@near-js/transactions';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWallet } from '@/components/approve/wallet';
import { ConnectWalletButton } from '@/components/wallet/connect-control';
import { readWalletReturn } from '@/components/approve/wallet-link';
import { ExplorerLink } from '@/components/explorer-link';
import { Mascot } from '@/components/mascot/mascot';
import { parseNear } from '@/lib/amount';
import { FACTORY_ID, FAUCET_URL } from '@/lib/config';
import { factory, nameProblem, vaultIdFor, type Template, type VaultInfo } from '@/lib/factory';
import { toNear } from '@/lib/near';

const GAS = 300_000_000_000_000n;
// What the factory keeps back: 0.25 NEAR of gas money for the agent, 0.01 for its registry entry.
const SETUP_COST = 260_000_000_000_000_000_000_000n;
const MIN_DEPOSIT = 500_000_000_000_000_000_000_000n;
// Survives the MyNearWallet redirect, so we know which wallet to wait for when the page reloads.
const PENDING_KEY = 'gw:creating';

type Creating = { vaultId: string; tx?: string };

export function StartFlow() {
  const { accountId, send } = useWallet();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [templateId, setTemplateId] = useState('api-buyer');
  const [typed, setTyped] = useState<string | null>(null);
  const [amount, setAmount] = useState('2');
  const [check, setCheck] = useState<{ name: string; taken: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<Creating | null>(null);
  const [vault, setVault] = useState<VaultInfo | null>(null);

  useEffect(() => {
    factory.templates().then(setTemplates, () => setError('Couldn’t reach NEAR testnet to load the templates.'));
    const saved = localStorage.getItem(PENDING_KEY);
    const result = readWalletReturn(window.location.search);
    if (saved) {
      // Browser-only state, so it can only be read after hydration.
      if (result && 'error' in result) {
        localStorage.removeItem(PENDING_KEY);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError(`The wallet didn’t create it: ${result.error}`);
      } else setCreating({ vaultId: saved, tx: result?.txHash });
    }
    if (result) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Until they type, suggest a name from the connected account.
  const name = typed ?? (accountId ? suggestName(accountId) : '');
  const problem = name ? nameProblem(name) : null;
  const taken = check?.name === name ? check.taken : null;
  useEffect(() => {
    if (!name || problem) return;
    const timer = setTimeout(
      () =>
        factory.nameFree(name).then(
          (free) => setCheck({ name, taken: !free }),
          () => {},
        ),
      350,
    );
    return () => clearTimeout(timer);
  }, [name, problem]);

  // Wait for the factory to finish: the wallet, then its agent account.
  useEffect(() => {
    if (!creating) return;
    let stop = false;
    let tries = 0;
    const tick = async () => {
      const info = await factory.vault(creating.vaultId).catch(() => undefined);
      if (stop) return;
      tries += 1;
      if (info && info.state !== 'CREATING') {
        localStorage.removeItem(PENDING_KEY);
        setVault(info);
        return;
      }
      if (info === null && tries > 8) {
        localStorage.removeItem(PENDING_KEY);
        setCreating(null);
        setError('The wallet wasn’t created, and the factory refunded your deposit. Try another name.');
        return;
      }
      setTimeout(tick, 2500);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [creating]);

  const deposit = parseNear(amount);
  const template = templates?.find((t) => t.id === templateId);
  const canCreate = Boolean(
    accountId && template && name && !problem && taken === false && deposit && deposit >= MIN_DEPOSIT,
  );

  async function create() {
    if (!deposit || !canCreate) return;
    setError(null);
    const vaultId = vaultIdFor(name);
    localStorage.setItem(PENDING_KEY, vaultId);
    try {
      const outcome = await send(FACTORY_ID, [
        actionCreators.functionCall('create_vault', { name, template_id: templateId }, GAS, deposit),
      ]);
      setCreating({ vaultId, tx: outcome?.transaction?.hash });
    } catch (e) {
      localStorage.removeItem(PENDING_KEY);
      setError((e as Error).message || 'The wallet didn’t send it.');
    }
  }

  if (vault) return <Ready vault={vault} tx={creating?.tx} />;
  if (creating)
    return (
      <Panel>
        <Mascot mood="thinking" size={120} decorative className="mx-auto" />
        <h2 className="mt-5 text-center font-display text-xl font-semibold text-white">Setting up your wallet</h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Creating <span className="font-mono text-zinc-200">{creating.vaultId}</span> and its agent account. This takes
          a few seconds.
        </p>
        {creating.tx && (
          <div className="mt-4 flex justify-center">
            <ExplorerLink txHash={creating.tx} />
          </div>
        )}
      </Panel>
    );

  return (
    <div className="space-y-4">
      <Step n={1} title="Connect your NEAR testnet wallet" done={Boolean(accountId)}>
        {accountId ? (
          <p className="text-sm text-zinc-300">
            Connected as <span className="font-mono text-white">{accountId}</span>. You’ll be the owner.
          </p>
        ) : (
          <>
            <ConnectWalletButton variant="primary" className="w-full" />
            <p className="mt-2 text-xs text-zinc-500">
              No testnet account yet? Create one in a testnet wallet (MyNearWallet is the simplest in the browser), then{' '}
              <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="text-sky-300">
                get free testnet NEAR
              </a>
              . Nothing here uses real money.
            </p>
          </>
        )}
      </Step>

      <Step n={2} title="Pick a starting budget" done={Boolean(template)}>
        {!templates && !error && <div className="h-36 animate-pulse rounded-xl bg-white/[0.04]" />}
        <div className="grid gap-2">
          {templates?.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              aria-pressed={t.id === templateId}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                t.id === templateId ? 'border-brand bg-brand-soft' : 'border-white/10 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-white">{t.name}</span>
                <span className="shrink-0 font-mono text-xs text-zinc-400">{toNear(t.daily_limit)} / day</span>
              </div>
              <p className="mt-0.5 text-sm text-zinc-400">{t.description}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Asks you over {toNear(t.approval_threshold)} NEAR · pays {t.approved_payees.join(', ')}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">You can change every rule later from your phone.</p>
      </Step>

      <Step n={3} title="Name it and fund it" done={canCreate}>
        <label htmlFor="vault-name" className="text-sm text-zinc-300">
          Wallet name
        </label>
        <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-black/30 focus-within:border-brand">
          <input
            id="vault-name"
            value={name}
            onChange={(e) => setTyped(e.target.value.toLowerCase().trim())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="emmy"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-base text-white outline-none"
          />
          <span className="truncate pr-3 font-mono text-xs text-zinc-500">.{FACTORY_ID}</span>
        </div>
        <p className="mt-1 h-4 text-xs">
          {problem ? (
            <span className="text-danger">{problem}</span>
          ) : taken === true ? (
            <span className="text-danger">That name is taken.</span>
          ) : taken === false ? (
            <span className="text-safe">Available</span>
          ) : null}
        </p>

        <label htmlFor="vault-amount" className="mt-3 block text-sm text-zinc-300">
          Testnet NEAR to put in
        </label>
        <input
          id="vault-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-base text-white outline-none focus:border-brand"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {deposit && deposit >= MIN_DEPOSIT
            ? `About ${toNear((deposit - SETUP_COST).toString())} NEAR lands in the wallet; 0.25 pays your agent’s gas and 0.01 registers it.`
            : 'At least 0.5 NEAR.'}
        </p>
      </Step>

      {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={create}
        disabled={!canCreate}
        className="w-full rounded-xl btn-brand py-4 text-base font-semibold text-on-brand transition disabled:opacity-40"
      >
        Create my Ashabi wallet
      </button>
      <p className="text-center text-xs text-zinc-500">One transaction in your wallet. Testnet only.</p>
    </div>
  );
}

const suggestName = (accountId: string) =>
  accountId
    .split('.')[0]
    .replace(/[^a-z\d]/g, '')
    .slice(0, 20);

function Ready({ vault, tx }: { vault: VaultInfo; tx?: string }) {
  return (
    <Panel>
      <Mascot mood="approved" size={128} className="mx-auto" />
      <h2 className="mt-4 text-center font-display text-2xl font-semibold text-white">Your agent is ready</h2>
      <p className="mt-2 text-center text-sm text-zinc-400">
        {vault.state === 'READY'
          ? 'It can ask your wallet for payments and nothing else. Anything over your limit waits for you.'
          : 'Your wallet is live, but the agent account wasn’t created. You can still fund it and set rules.'}
      </p>
      <dl className="mt-5 space-y-2 text-sm">
        <Row label="Wallet" value={vault.vault_id} />
        <Row label="Agent" value={vault.agent_id} />
        <Row label="Owner" value={vault.owner_id} />
      </dl>
      {tx && (
        <div className="mt-3 flex justify-center">
          <ExplorerLink txHash={tx} />
        </div>
      )}
      <div className="mt-6 grid gap-3">
        <Link
          href={`/chat?vault=${vault.vault_id}`}
          className="rounded-xl btn-brand py-3.5 text-center text-[15px] font-semibold text-on-brand"
        >
          Ask it to buy something
        </Link>
        <Link
          href={`/vault/${vault.vault_id}`}
          className="rounded-xl border border-white/10 py-3.5 text-center text-[15px] text-zinc-100 hover:bg-white/5"
        >
          Open my wallet
        </Link>
      </div>
    </Panel>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="glass rounded-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
            done ? 'bg-brand text-on-brand' : 'bg-white/[0.08] text-zinc-300'
          }`}
        >
          {done ? '✓' : n}
        </span>
        <h2 className="font-medium text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded-card px-5 py-8">{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-xl bg-black/25 px-3 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 truncate font-mono text-xs text-zinc-200">{value}</dd>
    </div>
  );
}
