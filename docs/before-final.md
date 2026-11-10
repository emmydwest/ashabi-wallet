# Before the final demo

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

## Agent account

The agent process signs only with its function-call key
(`ed25519:uQGVJnq7rQY2ixMqVcFtePsVFKucFYnUKMLupfq5Z3Z`, receiver `guardian.gw-emmy.testnet`,
method `request_payment`, 0.5 NEAR gas allowance). The account also has a full-access key that
the agent code never loads. Deleting it as well makes the account itself unable to do anything
but request payments:

```sh
near account delete-keys gw-emmy-agent.testnet \
  public-keys ed25519:9gPaehWnVN4EjqnADpoxaa2fx3ozyNreZvsmcCDauSzM \
  network-config testnet sign-with-legacy-keychain send
```

Top up the function-call allowance first if needed (add a new key with a larger allowance), since
it cannot be raised once the full-access key is gone.
