# Ashabi Wallet testnet scenarios (run 1794330544, 2026-11-10T17:09:04Z)
Contract: `guardian.gw-emmy.testnet` · owner `gw-emmy-owner.testnet` · agent `gw-emmy-agent.testnet` · payee `api-vendor.gw-emmy.testnet` · attacker `attacker.gw-emmy.testnet`

| Scenario | Expected | Got | Result | Tx |
|---|---|---|---|---|
| 0. Setup: daily_limit = used today + 5 NEAR (re-run headroom) | - | - | - | [8q3PeEwnkm…](https://testnet.nearblocks.io/txns/8q3PeEwnkmisxDbzcunjgJLeXMJfJDwoSyqWLBGFo2eh) |
| 1. Normal payment 0.5 NEAR -> api-vendor | APPROVED | APPROVED | PASS | [Htgi2hcKrx…](https://testnet.nearblocks.io/txns/Htgi2hcKrxcdRdHPv2XEv9nSGvCF2VyjGL1GZFCk1YrX) |
| 1b. Transfer callback settles | COMPLETED | COMPLETED | PASS | - |
| 2. Injection: 5 NEAR -> attacker | BLOCKED_RECIPIENT | BLOCKED_RECIPIENT | PASS | [AQYetjKsCR…](https://testnet.nearblocks.io/txns/AQYetjKsCRBVXTrXPk9TYUYoyTK4Gse88hYBztbMuek2) |
| 3. Over budget: 4.8 NEAR -> api-vendor | BLOCKED_BUDGET | BLOCKED_BUDGET | PASS | [GGET3TvVBD…](https://testnet.nearblocks.io/txns/GGET3TvVBDMeoDkFkgopCkwatZQhUEazG4VWMdkZfNut) |
| 4. 1.5 NEAR (> 1 NEAR threshold) | PENDING_APPROVAL | PENDING_APPROVAL | PASS | [76L1remLxd…](https://testnet.nearblocks.io/txns/76L1remLxd75B7vpfaGDrt2pWsSJK1eQLQ6vdzYh57Wj) |
| 4b. Owner approve_payment(9) | ok | ok | PASS | [HPUvGMmYTJ…](https://testnet.nearblocks.io/txns/HPUvGMmYTJ4kbt3gE24a43zFJomQqP9d2UktFiLnMeqb) |
| 4c. Approved transfer settles | COMPLETED | COMPLETED | PASS | - |
| 5. Owner freeze() | ok | ok | PASS | [27nYmGyqQ4…](https://testnet.nearblocks.io/txns/27nYmGyqQ4cfocM81o6rGwAQfxP6msmHM9CaEfPdJZAk) |
| 5b. Frozen: 0.1 NEAR -> api-vendor | FROZEN | FROZEN | PASS | [9Rq4au3sKU…](https://testnet.nearblocks.io/txns/9Rq4au3sKUksJbmkSfH2vM2MsNNpqgYpcSQbysZKP17P) |
| 5c. Frozen: 0.1 NEAR -> attacker | FROZEN | FROZEN | PASS | [FdwMhSLTs1…](https://testnet.nearblocks.io/txns/FdwMhSLTs1F3aLg5dT4aR17fLgAWfTQUSDWexXgri8uk) |
| 5d. Owner unfreeze() | ok | ok | PASS | [5EqCYx3uru…](https://testnet.nearblocks.io/txns/5EqCYx3uruXw9kzQiFr953X7yyT979FAsNLde3diXqwV) |
| 6. request_id first use 0.1 NEAR | APPROVED | APPROVED | PASS | [HCuyaAa6SD…](https://testnet.nearblocks.io/txns/HCuyaAa6SD54pRbCgExenrTPWfkiVwAMy1iqF3Hs1ZLq) |
| 6b. Same request_id replayed | DUPLICATE | DUPLICATE | PASS | [9ZW5PcNGer…](https://testnet.nearblocks.io/txns/9ZW5PcNGerCSe56v85Xi8UeBiKNQKwegQWA73hAPfSw1) |
| 7. Attacker calls request_payment directly | Unauthorized | Unauthorized | PASS | [ESp55RBsWa…](https://testnet.nearblocks.io/txns/ESp55RBsWaJAXDryF1SP2tyqzbF3oTiUHj82Ftf134jf) |
| 8. Agent calls add_payee(attacker) | Unauthorized | Unauthorized | PASS | [22RNknY99J…](https://testnet.nearblocks.io/txns/22RNknY99JL8qx9X2aCCGCCmvtNz9ouWpEvxniUXzh2Q) |

**15 passed, 0 failed**

```json
{
  "agent_id": "gw-emmy-agent.testnet",
  "approval_threshold": "1000000000000000000000000",
  "approved_payees": [
    "api-vendor.gw-emmy.testnet"
  ],
  "available_balance": "5295151442379576700000019",
  "balance": "7598241442379576700000019",
  "blocked_count": 21,
  "current_day": 20767,
  "daily_limit": "5000000000000000000000000",
  "frozen": false,
  "owner_id": "gw-emmy-owner.testnet",
  "payment_count": 11,
  "pending_count": 0,
  "remaining_today": "0",
  "reserved": "0",
  "spent_today": "6900000000000000000000000"
}
```
