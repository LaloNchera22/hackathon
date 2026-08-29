# SAMIZDAT — README (v2: free platform, auto-validation without money)

> Design change from v1: monetary escrow is eliminated as a
> release/validation mechanism. Uploading is free. Reading is free.
> The validity of an investigation is determined by the protocol itself, without
> anyone having to pay, neither the uploader nor the reader.

---

## 1. Thesis (updated)

Samizdat is a platform on Tor (`.onion`) to publish investigations
(documents, evidence, leaks) where:

- **Uploading is free.** There is no paywall, no fee, no monetary stake
  to enter.
- **Reading is free.** Without accounts, without login, without friction.
- **The protocol, not an editorial board nor a payment, decides what seems
  legitimate.** Validity is computed from objective and verifiable
  signals — independent corroboration, computational cost of
  sybil attacks, and cryptographic proofs — never from how much money was
  deposited.

The difference with v1 (escrow) is key for the pitch: there the market
decided *when* something is released by paying to see it. Here the protocol decides
*how reliable something seems*, for free, using cryptography and
network behavior instead of price. It is a shift from "paying for the
truth" to "making lying computationally expensive" — closer to the
spirit of proof-of-work than that of a betting market.

---

## 2. The design problem

Without money involved, how does the protocol prevent anyone from uploading spam,
disinformation, or a thousand copies of the same thing to inflate its "validity"? The
answer cannot be an admin curating content — that breaks the entire
thesis (centralized censorship once again). The answer must be
**expensive to fake without being expensive in money**.

### Mechanism: "Proof of Corroboration" (PoC)

Each uploaded document accumulates a **validity score** (publicly visible,
0 to 100) calculated from three signals, none of them monetary:

1. **Corroboration from independent sources (highest weight).**
   Different uploaders, from different Tor circuits and with cryptographic
   keys never seen before on the network, upload content that
   produces the same commitment hash (or a related commitment, e.g.
   the same document with different encryption). The protocol detects
   independence of origin (timing, network route, absence of previous
   link between the keys) and increases the score when 2+ *uncoordinated*
   sources corroborate the same thing.

2. **Computational cost of entry (sybil-resistance without money).**
   For a "source" to count as independent, it must solve a moderate
   proof-of-work (e.g. Hashcash-style hash puzzle) at the time of
   upload. This does not cost money, it costs CPU time — making it
   slow to fabricate hundreds of fake "corroborations" from a single person,
   not impossible but expensive in real time, just like mining email spam
   with Hashcash.

3. **ZK proof of credential, optional, without paying and without revealing identity.**
   An uploader can (optionally) prove with zero-knowledge that they possess
   a credential from a public list of known organizations
   (e.g. a media outlet, an NGO, a professional association) WITHOUT revealing which one
   or who they are. The protocol only learns "yes, it belongs to the list", never
   which exact entry. This increases the score without costing anything monetarily and
   without sacrificing anonymity.

The final score is simply a public and auditable function of these three
signals — never an admin, never a payment. Anyone can re-read the logic
and verify why a document has the score it has.

---

## 3. What replaces the Escrow.sol contract from v1

| v1 (monetary market) | v2 (free, without money) |
|---|---|
| `Escrow.sol` with `contribute()` in ETH | `Registry.sol` — only registers hashes, timestamps and proofs, without handling funds |
| Threshold of funds releases the key | No key to release — content is readable since it is uploaded (reading is always free) |
| Score = how much they paid to see it | Score = corroboration + proof-of-work + optional ZK credential |
| Reason to upload: someone pays to know it | Reason to upload: that it is known, period — without economic friction |

The contract is now much simpler: it only keeps a public registry of
`(hash, CID in IPFS, timestamp, proofOfWorkNonce, corroborationCount,
zkCredentialFlag)`. It does not custody a single cent.

---

## 4. Summarized architecture (updated)

```
Browser (React)
   │ 1. uploads file (optional encryption only if the author wants to anonymize
   │    content temporarily; reading remains free once published)
   ▼
IPFS (free pinning via web3.storage)
   │ 2. registers hash + solves proof-of-work
   ▼
Registry.sol (Base Sepolia) — only tracks score, without funds
   │ 3. emits Registered(hash, score) event
   ▼
Backend (Node/Express + SQLite)
   │ 4. listens to events, recalculates score if new corroborations arrive
   ▼
Tor Hidden Service (.onion)
   │ 5. serves the frontend + the public feed of documents with their score
   ▼
Reader (Tor Browser) — enters for free, reads for free, sees the score and why
```

---

## 5. Updated pitch phrase

> "We do not charge to upload. We do not charge to read. There is no editor deciding
> what is true. What the protocol does is make lying cost computation
> time and real coordination — not money, not permission. The truth is not
> bought here. It is corroborated."

---

## 6. Honest note for the jury (include it, do not hide it)

Proof of Corroboration in a one-day hackathon will be a simplified version
— probably without robust detection of truly independent Tor circuits
(that requires deeper network analysis than a day allows). Be transparent:
v1.0 of the hackathon can simulate independence detection with simple
heuristics (different IPs/circuits, uncorrelated timings), and the real
roadmap would use more rigorous network diversity analysis. A technical jury
values you acknowledging this gap much more than pretending it is already
resolved.

---

## 7. Impact on the rest of the system

- **Authenticity ZK (section 3.4 of the previous spec) remains the same** — it continues
  to be the "proof without revealing anything" piece, now additionally feeding the
  credential score.
- **Chaff Storm remains the same** — traffic cover by volume, cosmetic,
  without changes.
- **Deployment on Tor remains exactly the same** — the `tor/` package from the
  previous delivery does not change at all; only what runs behind it changes.
