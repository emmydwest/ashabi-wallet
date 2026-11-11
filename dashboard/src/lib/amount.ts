import { nearToYocto } from 'guardian-wallet-sdk';

/** What someone typed into an amount box, in yocto; null unless it's a positive decimal. */
export function parseNear(value: string): bigint | null {
  if (!/^\d+(\.\d{1,24})?$/.test(value.trim())) return null;
  const yocto = nearToYocto(value);
  return yocto > 0n ? yocto : null;
}
