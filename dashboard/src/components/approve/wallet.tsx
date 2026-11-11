'use client';

import type { WalletSelector } from '@near-wallet-selector/core';
import { actionCreators } from '@near-js/transactions';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ConnectModal, type WalletOptionId } from '@/components/wallet/connect-modal';
import { CONTRACT_ID, NETWORK } from '@/lib/config';

type WalletState = {
  accountId: string | null;
  ready: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  callOwnerMethod: (method: string, args?: Record<string, unknown>, contractId?: string) => Promise<string | undefined>;
  /** Any call or transfer, confirmed in the wallet. Returns the final outcome. */
  send: (receiverId: string, actions: Action[]) => Promise<SendOutcome | undefined>;
};

type Action = ReturnType<typeof actionCreators.functionCall>;
export type SendOutcome = {
  transaction?: { hash: string };
  status?: { SuccessValue?: string; Failure?: unknown } | string;
};

const WalletContext = createContext<WalletState | null>(null);

const GAS = 50_000_000_000_000n;
const ONE_YOCTO = 1n;

// Meteor's in-app browser has no popups; it talks to dApps over postMessage instead.
function inMeteorApp() {
  const w = window as Window & { ReactNativeWebView?: unknown; __is_running_in_meteor_wallet_app__?: boolean };
  return Boolean(w.__is_running_in_meteor_wallet_app__ || w.ReactNativeWebView || window.top !== window);
}

function friendlyConnectError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (/user (reject|cancel|close)|cancelled|canceled|closed/i.test(message)) {
    return 'Connection cancelled.';
  }
  return message || 'Could not connect.';
}

async function createSelector() {
  const [core, meteor, meteorApp, myNearWallet, here, intear] = await Promise.all([
    import('@near-wallet-selector/core'),
    import('@near-wallet-selector/meteor-wallet'),
    import('@near-wallet-selector/meteor-wallet-app'),
    import('@near-wallet-selector/my-near-wallet'),
    import('@near-wallet-selector/here-wallet'),
    import('@near-wallet-selector/intear-wallet'),
  ]);
  const modules = inMeteorApp()
    ? [meteorApp.setupMeteorWalletApp({ contractId: CONTRACT_ID })]
    : [
        myNearWallet.setupMyNearWallet(),
        meteor.setupMeteorWallet(),
        here.setupHereWallet(),
        intear.setupIntearWallet(),
      ];
  return core.setupWalletSelector({ network: NETWORK, modules });
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    createSelector().then((next) => {
      if (cancelled) return;
      setSelector(next);
      const applyAccounts = (state: { accounts: { accountId: string; active?: boolean }[] }) => {
        const id = state.accounts.find((a) => a.active)?.accountId ?? null;
        setAccountId(id);
        if (id) {
          setModalOpen(false);
          setPendingId(null);
          setError(null);
        }
      };
      applyAccounts(next.store.getState());
      const subscription = next.store.observable.subscribe(applyAccounts);
      unsubscribe = () => subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
  }, [selector]);

  const signIn = useCallback(async () => {
    if (!selector) return;
    if (inMeteorApp()) {
      const wallet = await selector.wallet('meteor-wallet-app');
      await wallet.signIn({ contractId: CONTRACT_ID, accounts: [] });
      return;
    }
    setError(null);
    setPendingId(null);
    setModalOpen(true);
  }, [selector]);

  const connectWith = useCallback(
    async (walletId: WalletOptionId) => {
      if (!selector) return;
      setError(null);
      setPendingId(walletId);
      try {
        const wallet = await selector.wallet(walletId);
        await wallet.signIn({ contractId: CONTRACT_ID, accounts: [] });
      } catch (err) {
        setError(friendlyConnectError(err));
        setPendingId(null);
      }
    },
    [selector],
  );

  const closeModal = useCallback(() => {
    if (pendingId) return;
    setModalOpen(false);
    setError(null);
  }, [pendingId]);

  const send = useCallback(
    async (receiverId: string, actions: Action[]) => {
      if (!selector) throw new Error('Wallet is still loading');
      const wallet = await selector.wallet();
      return (await wallet.signAndSendTransaction({ receiverId, actions })) as SendOutcome | undefined;
    },
    [selector],
  );

  const callOwnerMethod = useCallback(
    async (method: string, args: Record<string, unknown> = {}, contractId = CONTRACT_ID) => {
      const outcome = await send(contractId, [actionCreators.functionCall(method, args, GAS, ONE_YOCTO)]);
      return outcome?.transaction?.hash;
    },
    [send],
  );

  return (
    <WalletContext.Provider value={{ accountId, ready: Boolean(selector), signIn, signOut, callOwnerMethod, send }}>
      {children}
      <ConnectModal
        open={modalOpen}
        pendingId={pendingId}
        error={error}
        onClose={closeModal}
        onPick={(id) => void connectWith(id)}
      />
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside WalletProvider');
  return context;
}
