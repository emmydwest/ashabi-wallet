// In the live demo the owner acts from a phone; these are the same calls.
import { call, ownerAccount, view, nearToYoctoStr, yoctoToNearStr } from './near.ts';
import { CFG } from './config.ts';

const ONE_YOCTO = 1n;

type Status = {
  frozen: boolean;
  daily_limit: string;
  approval_threshold: string;
  spent_today: string;
  reserved: string;
  remaining_today: string;
  approved_payees: string[];
};

export const approve = (recordId: number) =>
  call(ownerAccount(), 'approve_payment', { record_id: recordId }, ONE_YOCTO);
export const reject = (recordId: number) => call(ownerAccount(), 'reject_payment', { record_id: recordId }, ONE_YOCTO);
export const freeze = () => call(ownerAccount(), 'freeze', {}, ONE_YOCTO);
export const unfreeze = () => call(ownerAccount(), 'unfreeze', {}, ONE_YOCTO);
export const status = () => view<Status>('get_wallet_status');

// Testnet re-runs on the same UTC day would otherwise hit the 5 NEAR daily limit.
export async function ensureHeadroom(near = 5) {
  const s = await status();
  if (BigInt(s.remaining_today) >= BigInt(nearToYoctoStr(near))) return null;
  const limit = BigInt(s.spent_today) + BigInt(s.reserved) + BigInt(nearToYoctoStr(near));
  return call(ownerAccount(), 'set_daily_limit', { daily_limit: limit.toString() }, ONE_YOCTO);
}

export const setDailyLimit = (near: number) =>
  call(ownerAccount(), 'set_daily_limit', { daily_limit: nearToYoctoStr(near) }, ONE_YOCTO);

export async function ensureVendorApproved() {
  const s = await status();
  if (s.approved_payees.includes(CFG.vendor)) return null;
  return call(ownerAccount(), 'add_payee', { account_id: CFG.vendor }, ONE_YOCTO);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  const actions: Record<string, () => Promise<unknown>> = {
    approve: () => approve(Number(arg)),
    reject: () => reject(Number(arg)),
    freeze,
    unfreeze,
    headroom: () => ensureHeadroom(),
    pending: () => view('get_pending'),
    status: async () => {
      const s = await status();
      return {
        ...s,
        daily_limit: yoctoToNearStr(s.daily_limit),
        approval_threshold: yoctoToNearStr(s.approval_threshold),
        spent_today: yoctoToNearStr(s.spent_today),
        remaining_today: yoctoToNearStr(s.remaining_today),
      };
    },
  };
  if (!actions[cmd]) {
    console.error(`usage: node src/owner.ts <${Object.keys(actions).join('|')}> [record_id]`);
    process.exit(1);
  }
  console.log(JSON.stringify(await actions[cmd](), null, 2));
}
