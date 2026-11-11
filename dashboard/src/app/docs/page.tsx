import { ArrowUpRight, Ban, Clock, Gauge, KeyRound, ShieldCheck, Smartphone, UserCheck, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Mascot } from '@/components/mascot/mascot';
import { accountUrl, AGENT_ID, CONTRACT_ID, FACTORY_ID, REPO_URL, VENDOR_ID } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'How Guardian Wallet works, the rules it enforces, and how to call it from your own agent.',
};

const RULES = [
  {
    icon: UserCheck,
    title: 'Approved payees only',
    body: 'Any other receiver is BLOCKED_RECIPIENT: stored, not paid.',
  },
  {
    icon: Gauge,
    title: 'Hard daily budget',
    body: 'Spent plus reserved plus the new amount can never pass the limit.',
  },
  {
    icon: Smartphone,
    title: 'Big payments wait',
    body: 'Above the threshold the request holds until the owner signs.',
  },
  {
    icon: Clock,
    title: 'No salami slicing',
    body: 'Automatic payments in any 10 minutes can’t add up past the threshold, or number more than 3.',
  },
  {
    icon: Zap,
    title: 'Automatic kill-switch',
    body: '3 payments to unknown accounts in a row pause everything for the cooldown the owner set (default 10 minutes), or until the owner resets it.',
  },
  {
    icon: KeyRound,
    title: 'The agent can only ask',
    body: 'Its key is a function-call key for request_payment and nothing else. Rule changes need the owner.',
  },
];

const ACCOUNTS = [
  ['Demo guardian contract', CONTRACT_ID],
  ['Factory, one wallet per user', FACTORY_ID],
  ['Demo AI agent', AGENT_ID],
  ['Approved demo vendor', VENDOR_ID],
];

const SDK = `import { accountSigner, GuardianAgent, nearToYocto } from '@guardian-wallet/sdk';

const agent = new GuardianAgent({
  contractId: '${CONTRACT_ID}',
  agentId: '${AGENT_ID}',
  // A function-call key that can only call request_payment. Server-side only.
  signer: accountSigner(account),
});

const result = await agent.requestPayment({
  receiverId: '${VENDOR_ID}',
  amount: nearToYocto('0.05'),
  memo: 'sku:weather-now',
});
// result.status is the contract's own answer: APPROVED, PENDING_APPROVAL, BLOCKED_RECIPIENT, ...`;

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Docs</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            How Guardian Wallet works
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">
            The money sits in a NEAR smart contract with your rules. Your AI holds a key that can only ask that contract
            for a payment. The contract checks every rule and pays, holds it for you, or says no.
          </p>
        </div>
        <Mascot size={128} decorative className="hidden shrink-0 sm:block" />
      </div>

      <Section title="The rules" hint="Enforced on-chain on every request, whatever the model was told.">
        <div className="grid gap-3 sm:grid-cols-2">
          {RULES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="glass flex gap-4 rounded-card p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Try it">
        <ol className="space-y-3">
          <Step n="1" href="/agent?try=hijack" label="Hijack the agent">
            A web page tells the agent to send money to an attacker. The contract blocks it and stores the attempt.
          </Step>
          <Step n="2" href="/chat" label="Ask the live agent to buy something">
            Weather, news, a translation, an icon pack, a market report, or a 1.5 NEAR annual plan that waits for you.
            Each one pays the demo vendor over HTTP 402.
          </Step>
          <Step n="3" href="/start" label="Create your own guarded wallet">
            One transaction through the factory. You become the owner; the AI gets its own limited key.
          </Step>
          <Step n="4" href="/verify" label="Verify it live on NEAR">
            Five checks run in your browser against a public RPC, plus every proof transaction with a NearBlocks link.
          </Step>
        </ol>
      </Section>

      <Section
        title="Use it from your agent"
        hint="@guardian-wallet/sdk: no dependencies, reads go straight to NEAR RPC."
      >
        <pre className="glass overflow-x-auto rounded-card p-5 font-mono text-[13px] leading-relaxed text-zinc-200">
          <code>{SDK}</code>
        </pre>
        <p className="mt-3 text-sm text-zinc-400">
          <code className="font-mono text-zinc-300">pay402(url)</code> does the whole HTTP 402 dance: fetch, pay the
          challenge through the guardian, and retry with the receipt.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          There is also a local MCP server in <code className="font-mono text-zinc-300">packages/mcp-server</code> that
          wraps the same SDK, so Claude Code or any MCP client can call{' '}
          <code className="font-mono text-zinc-300">guardian_request_payment</code> and{' '}
          <code className="font-mono text-zinc-300">guardian_fetch_402</code>. It is not published to npm; build it from
          this repo. Setup is in the README.
        </p>
      </Section>

      <Section title="Accounts on NEAR testnet">
        <ul className="glass divide-y divide-white/[0.06] rounded-card">
          {ACCOUNTS.map(([label, id]) => (
            <li key={id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-zinc-400">{label}</span>
              <a
                href={accountUrl(id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all font-mono text-sm text-emerald-300 hover:text-emerald-200"
              >
                {id}
                <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Honest limits">
        <ul className="space-y-2 text-zinc-300">
          <Limit icon={<Ban className="size-4" />}>
            It controls where money goes and how much. It can’t make a vendor deliver what it was paid for.
          </Limit>
          <Limit icon={<ShieldCheck className="size-4" />}>
            Testnet only. Payments are native NEAR transfers; NEAR Intents has no testnet.
          </Limit>
        </ul>
        <p className="mt-6 text-sm text-zinc-400">
          The full write-up, the threat model and a table mapping every claim to its code and test are in the{' '}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-emerald-300 hover:text-emerald-200">
            README
          </a>
          .
        </p>
      </Section>
    </main>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-white">{title}</h2>
      {hint && <p className="mt-1 text-zinc-400">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Step({ n, href, label, children }: { n: string; href: string; label: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="glass group flex items-start gap-4 rounded-card p-5 transition hover:border-emerald-400/30"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-400/[0.1] font-mono text-sm text-emerald-300">
          {n}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 font-semibold text-white">
            {label}
            <ArrowUpRight className="size-4 text-zinc-500 transition group-hover:text-emerald-300" aria-hidden />
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-zinc-400">{children}</span>
        </span>
      </Link>
    </li>
  );
}

function Limit({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 text-zinc-500" aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
