import Link from 'next/link';
import { AgentArt, VendorArt } from '@/components/art/pieces';

// Factual framing: one agent sells data over HTTP 402, another buys through the vault.
// The MCP snippet is the local command that works today; the package is not on npm yet.
export function Economy() {
  return (
    <section className="min-w-0">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand/80">Agent economy</p>
      <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        The safe settlement layer for the agent economy.
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-zinc-300">
        A provider agent sells data and services. A buyer agent pays through an Ashabi vault. The vendor answers
        HTTP 402 with a price, a payee and a nonce; the buyer pays on-chain; the vendor checks the receipt and unlocks
        the data. The contract still enforces the owner’s rules.
      </p>
      <div className="mt-8 grid min-w-0 gap-4 md:grid-cols-2">
        <article className="glass min-w-0 rounded-card p-6">
          <AgentArt pose="paying" size={60} className="float-right -mt-1 ml-3" />
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-300/80">Buyer agent</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Pays only what the vault allows</h3>
          <p className="mt-2 wrap-ids text-sm leading-relaxed text-zinc-400">
            The live demo buyer is <span className="font-mono text-zinc-200">gw-emmy-agent.testnet</span>. Its key can
            only call <span className="font-mono">request_payment</span>. You can run the same path from your own agent
            with the SDK, or from an assistant with the local MCP server.
          </p>
        </article>
        <article className="glass min-w-0 rounded-card p-6">
          <VendorArt size={60} className="float-right -mt-1 ml-3" />
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-300/80">Provider agent</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Sells over HTTP 402</h3>
          <p className="mt-2 wrap-ids text-sm leading-relaxed text-zinc-400">
            The live vendor is <span className="font-mono text-zinc-200">api-vendor.gw-emmy.testnet</span>, the one
            approved payee on the demo vault. It sells weather, news and other testnet data; it does not unlock a
            payload until it sees a matching on-chain payment.
          </p>
        </article>
      </div>
      <div className="glass mt-4 min-w-0 overflow-hidden rounded-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-300/80">MCP drop-in</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Two lines, then an assistant can ask the vault</h3>
          </div>
          <Link href="/docs" className="text-sm text-emerald-300 hover:underline">
            Full setup in the docs
          </Link>
        </div>
        <pre className="mt-4 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-emerald-100">
          {`cd packages/mcp-server && npm install && npm run build
ASHABI_CONTRACT=guardian.gw-emmy.testnet AGENT_ACCOUNT=gw-emmy-agent.testnet node dist/index.js`}
        </pre>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          This server is not on npm yet. After it is published, the same process will start with{' '}
          <span className="font-mono text-zinc-300">npx -y ashabi-wallet-mcp</span>. Payment tools need a
          function-call key; status reads do not. The contract still decides whether money moves.
        </p>
      </div>
    </section>
  );
}
