import { OnChainFeed } from '@/components/on-chain-feed';
import { cachedSnapshot } from '@/lib/server/cached-snapshot';

export async function HomeFeed() {
  return <OnChainFeed initial={await cachedSnapshot()} />;
}
