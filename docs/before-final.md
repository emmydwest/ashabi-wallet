# Before the final demo

> **Done on 13 Nov 2026.** Both keys below were deleted with Emmy's go-ahead:
> the vault's `ed25519:Arhid3xj…` in
> [4sji6Jsj…](https://testnet.nearblocks.io/txns/4sji6Jsju1RB3Dua7LtBSeVp5p4cztPb1KzGM2shGpWa) and the
> agent's `ed25519:9gPaehWn…` in
> [4wv9ozaq…](https://testnet.nearblocks.io/txns/4wv9ozaqH47JqFxfbxTeJXAs8QXdZNJu8gMRZBE6yNYZ).
> `view_access_key_list` on `guardian.gw-emmy.testnet` now returns no keys, and
> `gw-emmy-agent.testnet` holds only its two `request_payment` function-call keys. Right after, a
> paid 402 purchase ([BXuf9w2b…](https://testnet.nearblocks.io/txns/BXuf9w2bTSHoDUgiiX83jgsQsFSNSWhgMx9eD3ezmyV2))
> settled and a hijack ([FU8MCuWZ…](https://testnet.nearblocks.io/txns/FU8MCuWZmUs734CL54McjmH7j75PCWqZZVAaBbHLnnGD))
> was refused. The steps are kept below as a record.

## Lock the contract account

`guardian.gw-emmy.testnet` still has one full-access key
(`ed25519:Arhid3xjVTxUvukA2jWhbJqQ7saR6fsATR42aFMyyrAV`). Whoever holds it could deploy different
code and move the funds, which would undercut the claim that only the contract decides. It stays
for now because the contract has no upgrade method and we may still redeploy during Days 3-4.

Once the final wasm is deployed:

```sh
# 1. confirm the deployed code is the final build
near account view-account-summary guardian.gw-emmy.testnet network-config testnet now

# 2. remove the last full-access key; after this nobody can redeploy or sign for the contract
near account delete-keys guardian.gw-emmy.testnet \
  public-keys ed25519:Arhid3xjVTxUvukA2jWhbJqQ7saR6fsATR42aFMyyrAV \
  network-config testnet sign-with-legacy-keychain send

# 3. verify: the key list must be empty
near account list-keys guardian.gw-emmy.testnet network-config testnet now
```

This is irreversible. The owner can still withdraw funds with `withdraw`, so nothing is stranded.
`migrate` is private to the contract account, so after this it can never run again either; do any
last upgrade first.

## Agent account

The agent process signs only with its function-call key
(`ed25519:HKUFAQxs88g2ENFMyVjqQXrj2gDWTKQWz4ApoJLEX8YX`, receiver `guardian.gw-emmy.testnet`,
method `request_payment`, about 3 NEAR gas allowance); the key scope badge on `/agent` shows which
key signed the latest request. An older key with the same scope
(`ed25519:uQGVJnq7rQY2ixMqVcFtePsVFKucFYnUKMLupfq5Z3Z`) is still on the account. The account also
has a full-access key that the agent code never loads. Deleting it as well makes the account itself unable to do anything
but request payments:

```sh
near account delete-keys gw-emmy-agent.testnet \
  public-keys ed25519:9gPaehWnVN4EjqnADpoxaa2fx3ozyNreZvsmcCDauSzM \
  network-config testnet sign-with-legacy-keychain send
```

Top up the function-call allowance first if needed (add a new key with a larger allowance), since
it cannot be raised once the full-access key is gone.

## Ownership

Ownership moved from `gw-emmy-owner.testnet` to Emmy's Meteor wallet `realfile1618.testnet`
([tx](https://testnet.nearblocks.io/txns/GS3WYYApFdR1HeqEd31HxRg1BQuFYdaokE3a9RC2hwbE)). The box no
longer holds an owner key, so `npm run demo` and `scripts/testnet-scenarios.sh` can no longer do
their owner steps (top up headroom, approve, unfreeze) on their own. Before re-running them, either
do those steps from `/approve`, or call `set_owner` from the Meteor wallet to hand ownership back to
`gw-emmy-owner.testnet` for the run.
