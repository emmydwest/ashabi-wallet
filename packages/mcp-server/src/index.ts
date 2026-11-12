import { accountSigner, GuardianAgent, nearToYocto, TESTNET_RPCS } from 'guardian-wallet-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Account, JsonRpcProvider } from 'near-api-js';
import { z } from 'zod';

// A small stdio MCP server around the Guardian Wallet SDK. Configure it with env vars;
// never log the key. Reads work without one; payment tools need AGENT_PRIVATE_KEY.

const NETWORK = (process.env.GUARDIAN_NETWORK ?? process.env.NEAR_NETWORK ?? 'testnet').trim();
const MAINNET_RPCS = ['https://rpc.mainnet.near.org', 'https://rpc.fastnear.com'];
const rpcUrls = process.env.GUARDIAN_RPC
  ? [process.env.GUARDIAN_RPC.trim()]
  : NETWORK === 'mainnet'
    ? MAINNET_RPCS
    : TESTNET_RPCS;

const contractId = required('GUARDIAN_CONTRACT');
const agentId = required('AGENT_ACCOUNT');
const privateKey = process.env.AGENT_PRIVATE_KEY?.trim();

const agent = new GuardianAgent({
  contractId,
  agentId,
  rpcUrls,
  signer: privateKey
    ? accountSigner(new Account(agentId, new JsonRpcProvider({ url: rpcUrls[0] }), privateKey as never))
    : undefined,
});

const server = new McpServer(
  { name: 'guardian-wallet', version: '0.1.0' },
  { instructions: `Pay through the Guardian Wallet contract ${contractId} as ${agentId} on NEAR ${NETWORK}. The contract, not this server, decides whether money moves.` },
);

server.registerTool(
  'guardian_wallet_status',
  {
    title: 'Wallet status',
    description:
      'Read the live Guardian Wallet status from NEAR RPC: budget left, payee list, velocity window, kill-switch, pending rules. No key needed.',
    inputSchema: {},
  },
  async () => text(await agent.getStatus()),
);

server.registerTool(
  'guardian_get_payment',
  {
    title: 'Get a payment record',
    description: 'Read one payment record from the contract by id. No key needed.',
    inputSchema: { record_id: z.number().int().nonnegative() },
  },
  async ({ record_id }) => {
    const record = await agent.getPayment(record_id);
    if (!record) return text({ record_id, record: null, error: 'no payment with that id' });
    return text(record);
  },
);

server.registerTool(
  'guardian_payee_report',
  {
    title: 'Check a payee against the blocklist',
    description:
      'Read whether an account is on the vault\'s blocklist of reported payees, with the reason, the reporter and any evidence transaction. The contract refuses payments to listed accounts. No key needed.',
    inputSchema: { account_id: z.string().min(2) },
  },
  async ({ account_id }) => {
    const report = await agent.getPayeeReport(account_id);
    return text({ account_id, reported: Boolean(report), report });
  },
);

server.registerTool(
  'guardian_request_payment',
  {
    title: 'Request a payment',
    description:
      'Ask the Guardian Wallet contract to pay amount_near NEAR to receiver_id, with an optional memo. The contract may approve, hold it for the owner, or refuse. Needs AGENT_PRIVATE_KEY.',
    inputSchema: {
      receiver_id: z.string().min(2),
      amount_near: z.string().regex(/^\d+(\.\d+)?$/, 'amount_near must be a decimal NEAR amount, e.g. "0.05"'),
      memo: z.string().max(256).optional(),
    },
  },
  async ({ receiver_id, amount_near, memo }) => {
    needKey();
    return text(await agent.requestPayment({ receiverId: receiver_id, amount: nearToYocto(amount_near), memo }));
  },
);

server.registerTool(
  'guardian_fetch_402',
  {
    title: 'Fetch a 402-paid URL',
    description:
      'GET a URL. If it answers 402 with a Guardian challenge, pay it through the contract and retry with the receipt. Needs AGENT_PRIVATE_KEY.',
    inputSchema: {
      url: z.string().url(),
      max_price_near: z.string().regex(/^\d+(\.\d+)?$/).optional(),
      allowed_payees: z.array(z.string()).optional(),
    },
  },
  async ({ url, max_price_near, allowed_payees }) => {
    needKey();
    const result = await agent.pay402(url, {
      maxPrice: max_price_near ? nearToYocto(max_price_near) : undefined,
      allowedPayees: allowed_payees,
    });
    if (result.kind === 'free') {
      return text({ kind: 'free', status: result.response.status, body: await readBody(result.response) });
    }
    if (result.kind === 'refused') {
      return text({ kind: 'refused', reason: result.reason, challenge: result.challenge });
    }
    const body = 'response' in result ? await readBody(result.response) : undefined;
    return text({
      kind: result.kind,
      challenge: result.challenge,
      payment: result.payment,
      record: result.record,
      body,
    });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`guardian-mcp: set ${name}`);
    process.exit(1);
  }
  return value;
}

function needKey() {
  if (!agent.canSign) throw new Error('Set AGENT_PRIVATE_KEY to a function-call key that can call request_payment.');
}

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2) }] };
}

async function readBody(res: Response) {
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return res.json();
  return res.text();
}
