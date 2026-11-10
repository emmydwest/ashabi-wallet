'use client';

import '@near-wallet-selector/modal-ui/styles.css';
import type { WalletSelector } from '@near-wallet-selector/core';
import type { WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import { actionCreators } from '@near-js/transactions';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CONTRACT_ID, NETWORK } from '@/lib/config';

type WalletState = {
  accountId: string | null;
  ready: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  callOwnerMethod: (method: string, args?: Record<string, unknown>) => Promise<string | undefined>;
};

const WalletContext = createContext<WalletState | null>(null);

const GAS = 50_000_000_000_000n;
const ONE_YOCTO = 1n;

// Meteor's in-app browser has no popups; it talks to dApps over postMessage instead.
function inMeteorApp() {
  const w = window as Window & { ReactNativeWebView?: unknown; __is_running_in_meteor_wallet_app__?: boolean };
  return Boolean(w.__is_running_in_meteor_wallet_app__ || w.ReactNativeWebView || window.top !== window);
}

async function createSelector() {
  const [core, modalUi, meteor, meteorApp, myNearWallet, intear] = await Promise.all([
    import('@near-wallet-selector/core'),
    import('@near-wallet-selector/modal-ui'),
    import('@near-wallet-selector/meteor-wallet'),
    import('@near-wallet-selector/meteor-wallet-app'),
    import('@near-wallet-selector/my-near-wallet'),
    import('@near-wallet-selector/intear-wallet'),
  ]);
  const modules = inMeteorApp()
    ? [meteorApp.setupMeteorWalletApp({ contractId: CONTRACT_ID })]
    : [meteor.setupMeteorWallet(), myNearWallet.setupMyNearWallet(), intear.setupIntearWallet()];
  const selector = await core.setupWalletSelector({ network: NETWORK, modules });
  const modal = modalUi.setupModal(selector, {
    theme: 'dark',
    contractId: CONTRACT_ID,
    description: 'Sign in as the Guardian Wallet owner.',
  });
  return { selector, modal };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    createSelector().then(({ selector, modal }) => {
      setSelector(selector);
      setModal(modal);
      setAccountId(selector.store.getState().accounts.find((a) => a.active)?.accountId ?? null);
      const subscription = selector.store.observable.subscribe((state) => {
        setAccountId(state.accounts.find((a) => a.active)?.accountId ?? null);
      });
      unsubscribe = () => subscription.unsubscribe();
    });
    return () => unsubscribe?.();
  }, []);

  const signOut = useCallback(async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
  }, [selector]);

  // Owner methods require exactly 1 yoctoNEAR, which forces a full wallet confirmation.
  // The modal hides instant-link wallets, so inside the Meteor app we sign in directly.
  const signIn = useCallback(async () => {
    if (!selector) return;
    if (!inMeteorApp()) {
      modal?.show();
      return;
    }
    const wallet = await selector.wallet('meteor-wallet-app');
    await wallet.signIn({ contractId: CONTRACT_ID, accounts: [] });
  }, [selector, modal]);

  const callOwnerMethod = useCallback(
    async (method: string, args: Record<string, unknown> = {}) => {
      if (!selector) throw new Error('Wallet is still loading');
      const wallet = await selector.wallet();
      const outcome = await wallet.signAndSendTransaction({
        receiverId: CONTRACT_ID,
        actions: [actionCreators.functionCall(method, args, GAS, ONE_YOCTO)],
      });
      return outcome?.transaction?.hash;
    },
    [selector],
  );

  return (
    <WalletContext.Provider value={{ accountId, ready: Boolean(selector), signIn, signOut, callOwnerMethod }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside WalletProvider');
  return context;
}
