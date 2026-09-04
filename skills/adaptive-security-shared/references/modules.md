# Security and performance modules (shared)

Load a module only when application discovery found matching features. CORE is always evaluated for relevance; it is still possible for a static site to mark parts of CORE as Not Applicable (e.g. no authentication).

---

## CORE (almost always)

Evaluate:

```text
Authentication
Authorization
Session Management
API Security
Database / datastore Security
Input Validation
Business Logic
Secrets Management
File Handling
Data Exposure
Cryptography
Infrastructure
Dependencies
Logging
Rate Limiting
Concurrency
Administrative Controls
```

Ask:

```text
What assumptions did the developer make?
Can those assumptions be violated?
Can one role become another?
Can one user access another user's objects?
Can state be changed in an unexpected order?
Can requests be replayed?
Can validation be bypassed?
Can the frontend be bypassed?
Can API calls be manipulated directly?
Can hidden functionality be reached?
Can sensitive information escape?
```

---

## FINANCIAL (only if money, balances, ledgers, or payouts exist)

Focus:

- Payment authorization and capture
- Amount / currency / destination integrity
- Idempotency of deposits, withdrawals, purchases, refunds, payouts
- Double-spend / double-credit
- Rounding and precision
- Concurrent mutation of balances
- Impossible states (negative balance, over-withdrawal, unpaid item marked paid)

If the app is a **lending vault or credit protocol**, *and only then*, also consider:

- Capacity / cap enforcement
- Position ownership
- Approval vs self-approval
- Accrual / yield double-claim
- Operator or admin fund-movement paths

Do not load this module for a content-only ebook reader.

---

## BLOCKCHAIN (only if wallets, signatures, chains, or contracts exist)

Focus:

- Wallet ownership binding
- Key / seed / private-material exposure
- Signature validation and replay
- Network / asset / amount / destination checks
- Signing permission vs viewing permission
- Contract upgrade / admin keys if contracts exist
- Test-net / test-wallet only

Do not hunt for signing bugs on an app with no chain integration.

---

## CONTENT (only if files, books, media, or entitlements exist)

Focus:

- Unauthorized content access
- Subscription / paywall bypass
- Direct object / URL guessing for paid files
- Unpublished or draft exposure
- Author vs reader vs admin isolation
- Insecure downloads and signed-URL leakage

---

## MARKETPLACE (only if buyers, sellers, listings, or orders exist)

Focus:

- Buyer / seller isolation
- Listing and order IDOR
- Checkout and coupon / pricing manipulation
- Inventory races
- Seller-admin privilege confusion
- Payment-order binding

---

## AI (only if models, prompts, tools, or agents exist)

Focus:

- Prompt injection / untrusted content as instructions
- Tool-permission boundaries (what the agent is allowed to invoke)
- Secret and data exfiltration through model context
- Confused-deputy actions on behalf of another user
- Persistence of untrusted memory

---

## Persona catalogs

### Red Team specializations (combine as needed)

```text
Web Application Security Researcher
API Security Researcher
Authentication Specialist
Authorization / Access Control Specialist
Database Security Specialist
Cloud Security Specialist
Payments Security Specialist
Blockchain Security Researcher
Wallet Security Researcher
Smart Contract Security Researcher
File Upload Security Specialist
Business Logic Tester
Session Security Specialist
Cryptography Reviewer
Frontend Security Specialist
Mobile Security Specialist
Infrastructure Security Specialist
```

### Blue Team specializations (combine as needed)

```text
Secure Backend Engineer
Application Security Engineer
API Security Engineer
Database Security Engineer
Cloud Security Engineer
Wallet Security Engineer
Smart Contract Security Engineer
Frontend Security Engineer
Identity Security Engineer
```

### Performance specializations (combine as needed)

```text
WebGL / Rendering Performance Engineer
Web Delivery Performance Engineer
Frontend + API Performance Engineer
Transactional Systems Performance Engineer
Realtime / Streaming Performance Engineer
```

---

## Worked persona examples

Use these only as pattern illustrations after discovery matches.

### Wallet

> You are an application security researcher specializing in digital wallets, transaction authorization, cryptographic key handling, authentication, API security, and financial business logic.

Focus: unauthorized signing, wallet ownership, key exposure, seed protection, replay, transaction / destination manipulation, authn/authz, session attacks, transaction integrity.

Do not spend the assessment on ebook-style content controls unless they exist.

### Ebook platform

> You are a web application security researcher specializing in account security, subscription authorization, digital content access control, file delivery, API security, and administrative isolation.

Focus: unauthorized book access, subscription bypass, IDOR, account takeover, author/admin escalation, unpublished content, file URL leakage, insecure downloads, API authorization.

Do not spend significant effort on blockchain signing, vault insolvency, or financial replay unless those features exist.

### E-commerce

Specialties: payment security, business logic, checkout manipulation, coupon abuse, account security, order authorization, inventory logic, admin security.

### Social platform

Specialties: authorization, privacy, account takeover, content moderation, file uploads, messaging security, API enumeration, admin isolation.

### Three.js / WebGL product

Performance persona: WebGL / Rendering Performance Engineer. Focus: draw calls, geometry, textures, render loops, frame rate, GPU memory.

### Content / ebook delivery

Performance persona: Web Delivery Performance Engineer. Focus: document loading, image optimization, caching, pagination, search indexing.
