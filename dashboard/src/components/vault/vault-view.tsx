'use client';

import { actionCreators } from '@near-js/transactions';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApproveView } from '@/components/approve/approve-view';
import { useWallet } from '@/components/approve/wallet';
import { PaymentFeed } from '@/components/dashboard/payment-feed';
import { ExplorerLink } from '@/components/explorer-link';
import { BudgetMeter } from '@/components/stats/budget-meter';
import { parseNear } from '@/lib/amount';
import { CONTRACT_ID, FAUCET_URL } from '@/lib/config';
import { factory, vaultName, type VaultInfo } from '@/lib/factory';
import { toNear } from '@/lib/near';
import type { GuardianSnapshot } from '@/lib/types';

type Props = { vaultId: string; initial: GuardianSnapshot };

export function VaultView({ vaultId, initial }: Props) {
  return (
    <ApproveView
      initial={initial}
      vaultId={vaultId}
      header={(snapshot) => <VaultSummary vaultId={vaultId} snapshot={snapshot} />}
      footer={(snapshot) => (
        <div className="mt-8">
          <PaymentFeed feed={snapshot.feed} />
        </div>
      )}
    />
  );
}

function VaultSummary({ vaultId, snapshot }: { vaultId: string; snapshot: GuardianSnapshot }) {
  const { status } = snapshot;
  const [info, setInfo] = useState<VaultInfo | null>(null);
  const demo = vaultId === CONTRACT_ID;

  useEffect(() => {
    if (!demo) factory.vault(vaultId).then(setInfo, () => setInfo(null));
  }, [vaultId, demo]);

  return (
    <section className="mb-5">
      <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">{demo ? 'Demo wallet' : 'Guarded wallet'}</div>
      <h1 className="mt-1 truncate font-display text-2xl font-semibold tracking-tight text-white">
        {demo ? vaultId : vaultName(vaultId)}
      </h1>
      <p className="truncate font-mono text-xs text-zinc-500">{vaultId}</p>

      <div className="glass mt-4 rounded-card p-5">
        <div className="text-sm text-zinc-400">Your AI can still spend</div>
        <div className="mt-1 font-display text-4xl font-semibold tracking-tight text-white tabular">
          {toNear(status.remaining_today)} <span className="text-base font-normal text-zinc-400">NEAR today</span>
        </div>
        <BudgetMeter status={status} className="mt-3" />
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Stat label="In the wallet" value={`${toNear(status.available_balance)} NEAR`} />
          <Stat label="Asks you over" value={`${toNear(status.approval_threshold)} NEAR`} />
        </dl>
        <div className="mt-4 text-xs text-zinc-400">
          Can pay: <span className="text-zinc-200">{status.approved_payees.join(', ') || 'nobody yet'}</span>
        </div>
        <div className="mt-1 truncate text-xs text-zinc-500">
          AI agent: <span className="font-mono">{status.agent_id}</span>
          {info?.state === 'NO_AGENT' && <span className="text-pending"> · agent account wasn’t created</span>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href={`/chat?vault=${encodeURIComponent(vaultId)}`}
          className="rounded-xl bg-brand py-3 text-center text-[15px] font-semibold text-on-brand hover:bg-brand-strong"
        >
          Ask my AI to buy
        </Link>
        <TopUp vaultId={vaultId} />
      </div>
    </section>
  );
}

function TopUp({ vaultId }: { vaultId: string }) {
  const { accountId, send, signIn, ready } = useWallet();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('1');
  const [state, setState] = useState<{ busy?: boolean; tx?: string; error?: string }>({});

  async function submit() {
    const yocto = parseNear(amount);
    if (!yocto) return setState({ error: 'Enter an amount like 1 or 0.5.' });
    setState({ busy: true });
    try {
      const outcome = await send(vaultId, [actionCreators.transfer(yocto)]);
      setState({ tx: outcome?.transaction?.hash });
    } catch (e) {
      setState({ error: (e as Error).message || 'The wallet did not send it.' });
    }
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-white/10 py-3 text-[15px] text-zinc-100 hover:bg-white/5"
      >
        Add funds
      </button>
    );

  return (
    <div className="glass col-span-2 rounded-card p-4">
      <label className="text-sm text-zinc-300" htmlFor="topup">
        Send testnet NEAR from your wallet
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="topup"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-base text-white outline-none focus:border-brand"
        />
        {accountId ? (
          <button
            type="button"
            onClick={submit}
            disabled={state.busy}
            className="rounded-xl bg-white px-4 text-sm font-medium text-ink disabled:opacity-50"
          >
            {state.busy ? 'Waiting…' : 'Send'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => signIn()}
            disabled={!ready}
            className="rounded-xl bg-white px-4 text-sm font-medium text-ink disabled:opacity-50"
          >
            Connect
          </button>
        )}
      </div>
      {state.tx && (
        <p className="mt-2 flex items-center gap-2 text-sm text-safe">
          Sent. <ExplorerLink txHash={state.tx} />
        </p>
      )}
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      <p className="mt-2 text-xs text-zinc-500">
        Out of testnet NEAR?{' '}
        <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="text-sky-300">
          Get some free
        </a>
        .
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/25 px-3 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-zinc-100 tabular">{value}</dd>
    </div>
  );
}

export function VaultMissing({ vaultId }: { vaultId: string }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-white">We couldn’t open this wallet</h1>
      <p className="mt-2 text-sm text-zinc-400">
        <span className="font-mono">{vaultId}</span> doesn’t exist yet, is still being created, or the network didn’t
        answer. Give it a few seconds and refresh.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/wallet" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-100">
          My wallets
        </Link>
        <Link href="/start" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand">
          Create one
        </Link>
      </div>
    </main>
  );
}
