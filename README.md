# Blockchain Contract Adapters

A self-contained example, extracted from a production multichain **Name Service** (an ENS-style
decentralized domain/identity product), showing how a single frontend talks to smart contracts
deployed across fundamentally different blockchain ecosystems — **EVM chains**, **Movement**, and
**Aptos** — without leaking any chain-specific details into the application/UI layer.

The repository is curated code sample of the contract-iteration layer of a larger app. 
It shows the **design** that keeps this multichain architecture manageable: a clean stack of 
*Factory*, *Adapter* and *Template Method* patterns built on top of TS interfaces and 
dependency inversion principals.

---

## The problem it solves

The same user actions — *register a domain, renew it, set records, transfer it, etc.* — must work 
on three classes of chains that have:

- **Different SDKs and primitives** — `viem`/`wagmi` and Solidity ABIs on EVM vs. the Aptos
  `@aptos-labs/ts-sdk` and Move entry/view functions.
- **Different topologies** — the registry's *canonical* home is the Move ("original") network.
  Other chains act as **proxies** that forward operations cross-chain via **LayerZero**, while still
  reading authoritative state (availability, pricing) from the canonical contract.
- **Different capabilities** — e.g. wallet-linking exists only on EVM proxy chains; cross-chain fee
  estimation only matters for proxy adapters; sale functionality available only on original contract.

The application code should never branch on any of this. It asks a factory for an adapter and calls
a method.

---

## Architecture at a glance

```
                       IContractsAdaptersFactory          ← the only thing the app depends on
                                  ▲
        ┌─────────────────────────┼───────────────────────────┐
 EvmContractsFactory      MoveContractsFactory       MoveProxyContractsFactory
 (EVM proxy chains)       (canonical Move chain)     (Move proxy chains)
        │                         │                           │
        ▼                         ▼                           ▼
  each factory builds the same family of controller adapters, all behind interfaces:

    IRegistryControllerAdapter   ─ register / renew / records / primary name / avatar
    ISaleControllerAdapter       ─ secondary-market sale flows
    ITransferControllerAdapter   ─ domain transfers
    IWalletLinkingAdapter | null ─ link an EVM wallet to the canonical Move account
```

### Patterns used

| Pattern | Where | Why |
|---|---|---|
| **Abstract Factory** | `factories/` — `IContractsAdaptersFactory` + three concrete factories | Pick the right *family* of adapters once, by chain namespace; the rest of the app stays chain-agnostic. |
| **Adapter** | `registryController/`, `saleController/`, `transferController/`, `walletLinking/` | Each controller exposes one interface (`IRegistryControllerAdapter`, …) with `…Evm`, `…Move`, and `…MoveProxy` implementations. |
| **Template Method / shared base** | `common/BaseEvmContractAdapter`, `BaseMoveContractAdapter`, `BaseMoveProxyContractAdapter` | Centralize repetitive concerns — building Move entry/view payloads, LayerZero fee quoting, nonce fetching — so concrete adapters stay focused on business logic. |
| **Dependency inversion** | `IWallet` (`features/wallet/types.ts`) | Adapters depend on a wallet *interface*, not on `wagmi` or the Aptos wallet adapter, so signing/estimation/execution is uniform across ecosystems. |
| **Composition for cross-chain** | proxy factories receive an `originalContractsFactory` | Proxy adapters delegate authoritative reads (e.g. `checkAvailability`) to the canonical-chain adapter while writing through their own chain. |

### Cross-chain mechanics

- **`PayloadEncoder`** (`common/PayloadEncoder/`) ABI-encodes each operation with a 4-byte function
  selector into the wire format the canonical contract expects, so a proxy chain can express a
  "register domain" / "set records" / "link wallet" intent that LayerZero relays cross-chain.
- Proxy base classes resolve the LayerZero destination endpoint and **quote the messaging fee**
  (`lz_quote` on Move, `quoteFee` on EVM), applying a tolerance multiplier so transactions don't
  underpay.
- A **Pyth**-style price oracle feeds USD pricing and price-update fees into purchase/renew flows.

---

## Tech stack

TypeScript · `viem` / `wagmi` (EVM) · `@aptos-labs/ts-sdk` (Move/Aptos) · LayerZero cross-chain
messaging · Pyth-style price feeds · `bignumber.js` · Vite. TypeScript experimental decorators are
used for the wallet-guard decorator.

---

## What this sample is meant to demonstrate

- Designing a **chain-agnostic abstraction** over genuinely different blockchain runtimes.
- Applying GoF patterns deliberately and only where they earn their place
- Programming to interfaces, with composition over inheritance for the cross-chain/proxy cases.
- Real-world web3 concerns: cross-chain messaging fees, payload encoding, nonce handling, price
  oracles, and wallet/signature differences across ecosystems.

> Note: this is an illustrative extract, not a runnable app — it has no entry point or environment
> configuration, and external services are stubbed at the interface boundary.
