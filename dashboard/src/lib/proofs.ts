import { EXPLORER } from './config';

// Real testnet transactions from the live demo. Keep in sync with the README proof table.
export type Proof = {
  title: string;
  status: string;
  tx: string;
  group: 'paid' | 'blocked' | 'owner' | 'factory';
};

export const PROOFS: Proof[] = [
  {
    group: 'paid',
    title: 'Agent buys a 0.3 NEAR forecast from the approved vendor',
    status: 'APPROVED, settled',
    tx: 'EUnUDq8NLvfdenULi2X2Q6XFc99ruA8xrDbEmSnmHMvN',
  },
  {
    group: 'paid',
    title: 'Agent hits a 402, pays 0.05 NEAR with the vendor’s nonce, retries with the receipt, gets the data',
    status: 'APPROVED, receipt verified',
    tx: '9mJuqaKETPvgvc5ZdUagJPmp2jopZx7YAQCtAZZ1d491',
  },
  {
    group: 'blocked',
    title: 'Naive agent follows a hidden display:none instruction; memo carries its intent hash',
    status: 'BLOCKED_RECIPIENT',
    tx: 'F3ycvuJCmQomwbM6AiiLhBrcb2CzvBJ7MpCEG6WA7N54',
  },
  {
    group: 'blocked',
    title: 'Hijacked agent sends 2 NEAR to the attacker',
    status: 'BLOCKED_RECIPIENT',
    tx: 'AVTza2m9fpq6KWvUkUpu7Y2dAfoWqRYys4VA64aaLftb',
  },
  {
    group: 'blocked',
    title: 'Poisoned docs trick the model into paying a look-alike vendor',
    status: 'BLOCKED_RECIPIENT',
    tx: 'GMHSVLSGh8wEGAs7pmeMNWh4HLjpmd8QCLRJobVKXkcR',
  },
  {
    group: 'blocked',
    title: 'Agent splits a 1.5 NEAR purchase into small pieces',
    status: 'BLOCKED_VELOCITY',
    tx: 'E1WH3RiMuBSb8tGR6ZbSa5My4to3ap38yCp66jJ2mocm',
  },
  {
    group: 'blocked',
    title: 'Third attack in a row trips the circuit breaker',
    status: 'breaker_tripped',
    tx: 'ERmLh6KnkYfGKnKjiwNQ3v4srU7RfhzQh8KCz8wcZoDY',
  },
  {
    group: 'blocked',
    title: 'Next request while the breaker is on',
    status: 'FROZEN',
    tx: 'DoNJY3xxvwr3FRZCeq4ngiWZ7jda6wBzpa3SLuRB7xkZ',
  },
  {
    group: 'owner',
    title: '1.5 NEAR upgrade waits for the owner',
    status: 'PENDING_APPROVAL',
    tx: '8D6HW9p6eGudHSzNQnThAo7p2D2V3aqmh6KxVvUf46Ye',
  },
  {
    group: 'owner',
    title: 'Owner approves on a phone (Meteor wallet)',
    status: 'approve_payment',
    tx: '5Egz99BbvHEe7hBkek1JCd6pxZRwGTQch2h9H7ac1iTz',
  },
  {
    group: 'factory',
    title: 'Vault code published once as a global contract (hash 3Rh6iyiZ…)',
    status: 'deploy-as-global',
    tx: 'AMofamyGtE7c72ZM6jFzHvMWkhsy8H599owDRXAixYpR',
  },
  {
    group: 'factory',
    title: 'Factory creates boxtest.factory.gw-emmy.testnet and its agent from the API-buyer template',
    status: 'vault_created, agent_ready: true',
    tx: '2oWi2LgtMzKd8iuHhibr3bweqk3GA2MGpWre6aBaFWP1',
  },
  {
    group: 'paid',
    title: '/chat buys a 0.05 NEAR report over 402 from that wallet with the hosted agent key',
    status: 'APPROVED, receipt verified',
    tx: '4ZJRLZiAnLy6FLjBwxmRqdZ3UFbNKWnMRjPW2Ad59w4q',
  },
  {
    group: 'owner',
    title: 'Its owner approves a 1.5 NEAR plan renewal that waited for them',
    status: 'approve_payment, then COMPLETED',
    tx: '8yeSMFezUch7WYpWkKGog2hix2qWhNW2tfiTC5S26gQG',
  },
  {
    group: 'paid',
    title: 'MCP server buys a 0.05 NEAR report over 402 from the same factory wallet',
    status: 'APPROVED, receipt verified',
    tx: '7NBA3Vfw6bUpX8LydZtByArJJSnJYzDTVjNQDgRNbPE2',
  },
];

export const proofUrl = (tx: string) => `${EXPLORER}/txns/${tx}`;

export const PROOF_GROUPS: { id: Proof['group']; label: string }[] = [
  { id: 'paid', label: 'Paid for real' },
  { id: 'blocked', label: 'Attacks that were blocked' },
  { id: 'owner', label: 'Owner approval' },
  { id: 'factory', label: 'Factory and global code' },
];
