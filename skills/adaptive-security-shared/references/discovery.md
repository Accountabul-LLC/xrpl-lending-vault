# Application Discovery (shared)

Every adaptive security and performance skill **starts here**. Do not skip this phase. Do not assume the application is a lending vault, wallet, ebook, SaaS dashboard, or any other type until evidence from this repository (and, if available, its running behavior) says so.

```text
UNDERSTAND APPLICATION
        ↓
CLASSIFY APPLICATION
        ↓
IDENTIFY CRITICAL ASSETS
        ↓
MAP TRUST BOUNDARIES
        ↓
SELECT MODULES
        ↓
ASSIGN RISK TIER
        ↓
BUILD APPLICATION PROFILE
        ↓
SELECT PERSONA
```

Never start with a predetermined checklist and blindly apply every test.

---

## How to inspect

Do not rely on the repository or product name. Inspect how the system actually works:

- README, architecture, threat-model, and compliance docs
- Package manifests, lockfiles, IaC, Docker/K8s, CI
- Routes, pages, API handlers, GraphQL schema, RPC methods
- Auth configuration, session/token code, middleware, policies
- Data models, migrations, ORMs, ledgers, object stores
- Environment examples, secrets handling, third-party SDKs
- Admin panels, background jobs, websockets, file pipelines
- Live behavior in an **authorized** local / staging / sandbox environment when available

If evidence is missing, record it as an unknown in the profile. Do not invent architecture.

---

## 1. Application purpose

State, in one paragraph, what the application actually does and for whom.

Purpose examples (not exhaustive, not a required checklist):

```text
payment application
crypto wallet
social network
e-commerce application
SaaS platform
educational application
ebook / content reader
CMS
marketplace
banking / lending platform
internal business tool
AI / agent application
developer platform
file-sharing system
analytics dashboard
game
messaging platform
static brochure / docs site
```

An application may mix types (e.g. education + payments). Record the mix; do not collapse it into a single buzzword if that would hide an asset class.

---

## 2. Architecture inventory

Capture what exists. Leave blank / `not present` rather than guessing.

```text
Frontend framework
Backend / runtime
API style (REST, GraphQL, RPC, tRPC, etc.)
Database(s)
Authn system
Authz model
Storage
Caching
Queues / workers
Realtime (WebSockets, SSE)
External APIs
Cloud / hosting
Blockchain / wallet / contract integrations
Payment providers
Email / SMS providers
File storage
AI / model / tool integrations
Admin systems
Mobile / desktop clients
```

---

## 3. User model

List every role the system actually has. Typical examples (include only those that exist):

```text
Anonymous Visitor
Registered User
Subscriber
Administrator
Moderator
Merchant
Customer
Creator
Employee
Developer
API Client
Wallet Owner
```

For each role, document:

- What it is **supposed** to be able to do
- What it must **not** be able to do
- How it is distinguished technically (session, JWT claims, on-chain key, API key, etc.)

---

## 4. Data classification

Inventory information the application stores, transmits, or derives. Classify each class:

```text
Public
Internal
Private
Confidential
Security Sensitive
Financially Sensitive
Authentication Sensitive
```

The same field names mean different things in different apps. Classify by impact, not by vocabulary.

Illustrative contrast (do not treat these as default targets):

**Ebook / content app** — paid content, author uploads, subscriber entitlements, account credentials.

**Wallet app** — wallet ownership, private keys / seed material, signing permissions, balances, transactions, withdrawal destinations, authentication credentials.

Those two applications require different strategies.

---

## 5. Critical assets

Ask: *What would be most damaging if an attacker obtained, changed, deleted, forged, duplicated, or controlled it?*

Assign IDs:

```text
ASSET-001  User Sessions
ASSET-002  Administrator Access
ASSET-003  Payment Authorization
ASSET-004  Private Documents
```

Rank by importance. The Red Team prioritizes the top of this list. The Blue Team treats failures against these assets as highest severity unless the profile says otherwise.

---

## 6. Trust boundaries

Record where trust changes. These become primary Red Team targets.

Examples (include only those that exist):

```text
Browser → API
User → Administrator
Frontend → Backend
Backend → Database
Application → Payment Provider
Application → Blockchain
User → File Storage
API → Third-Party Service
Agent / model → Tool with side effects
```

---

## 7. Security properties

Weight which properties matter most **for this application**:

```text
Confidentiality
Integrity
Availability
Authentication
Authorization
Non-repudiation
Transaction correctness
Privacy
Content protection
Administrative isolation
```

A public docs site is not a wallet. A wallet is not an ebook store. Do not give every property equal weight.

---

## 8. Risk tiers

Assign one tier. Testing depth scales with the tier.

### Tier 1 — Low sensitivity

Public informational site, simple portfolio, static documentation.

### Tier 2 — Moderate

Accounts, private content, subscriptions, basic SaaS.

### Tier 3 — High

Payments, private business information, marketplaces, sensitive user records, administrative systems.

### Tier 4 — Critical

Financial assets, wallets, private keys, transaction signing, high-value payment infrastructure, critical infrastructure.

Do not treat a static brochure site like a cryptocurrency wallet.

---

## 9. Module selection

Treat security knowledge as modules. **Do not load every module.**

Always consider **CORE**. Enable others only when discovery finds matching features.

```text
CORE
├── Authentication
├── Authorization
├── Sessions
├── APIs
└── Input Validation

FINANCIAL
├── Payments
├── Transaction Integrity
├── Ledger Logic
└── Concurrency / idempotency

BLOCKCHAIN
├── Wallets
├── Signatures
├── Transactions
└── Smart Contracts

CONTENT
├── File Access
├── DRM / Entitlement
├── Subscription Access
└── Publishing

MARKETPLACE
├── Buyer / Seller Isolation
├── Listings
├── Orders
└── Payment Flows

AI
├── Prompt Boundaries
├── Tool Permissions
├── Data Exposure
└── Agent Authorization
```

If a module is considered and rejected, write `Not Applicable` plus a one-line reason in the test plan. That proves the domain was evaluated, not forgotten.

Lending vaults, XRPL primitives, borrowers, escrows, and MPT/issuance logic belong under FINANCIAL and/or BLOCKCHAIN **only if those features exist in this repo**.

---

## 10. Never assume

Do not assume:

```text
Every application handles money.
Every application uses blockchain.
Every application has borrowers.
Every application has wallets.
Every application uses SQL.
Every application has the same user roles.
Every vulnerability has the same severity.
Every application needs the same penetration tests.
Every application should be optimized the same way.
```

Discover first.

---

## 11. `APPLICATION_SECURITY_PROFILE.md` template

```text
Application Type:
Primary Function:
Highest Value Assets:
Primary Security Properties:
Risk Tier:
Most Important Attack Surfaces:
Loaded Modules:
Deferred / Not Applicable Modules:
Unknowns:
```

Example (only if discovery actually found a wallet):

```text
Application Type:
Cryptocurrency Wallet
Primary Function:
Self-custodial asset management
Highest Value Assets:
Private keys; transaction authorization; wallet ownership
Primary Security Properties:
Integrity; Confidentiality; Authentication; Authorization
Risk Tier:
4 — Critical
Most Important Attack Surfaces:
Signing; wallet import/export; authentication; API authorization; transaction creation; secret storage
Loaded Modules:
CORE, FINANCIAL, BLOCKCHAIN
Not Applicable:
CONTENT publishing DRM; MARKETPLACE listings
```

---

## 12. Persona generation format

After the profile exists, declare the persona **explicitly** in the report:

```text
SECURITY PERSONA
Application:
Online Marketplace
Primary Role:
Application Security Engineer
Specializations:
API Security
Authorization
Marketplace Business Logic
Reason:
The application contains multiple user roles, user-owned listings,
payments, and administrative functionality.
Priority:
Cross-user authorization and transaction integrity.
```

Do not use one permanent Red Team or Blue Team persona for every repository.
