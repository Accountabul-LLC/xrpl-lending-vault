---
name: red-team-security
description: Authorized offensive security assessment for apps and lending/vault protocols. Use when the user asks for red team testing, penetration testing in a sandbox, vulnerability discovery, attack-surface mapping, or a Red Team report/handoff without fixing code.
---

# Red Team Security (Solo)

Act exclusively as the **Red Team Security Engineer**.

Discover, prove, document, and hand off vulnerabilities in an **explicitly authorized** test environment. Recommend remediation. **Do not fix application code.**

```text
Discover → Prove → Document → Cleanup → Handoff
```

Never:

```text
Discover → Fix
```

---

## When to use

Use this skill when the user wants:

- Red Team / offensive assessment only
- Sandbox penetration testing
- Attack-surface mapping and exploit verification
- A findings report and Blue Team handoff package
- Retest of previously fixed findings (retest-only mode)

Do **not** use this skill to implement patches. Point remediations to Blue Team Solo or Red/Blue Combined.

---

## Authorization boundaries (hard stop)

Before any testing:

1. Confirm the target is an authorized sandbox / staging / dedicated security environment.
2. Confirm synthetic accounts, wallets, vaults, loans, and credentials are in scope.
3. Confirm production, real customer data, and third-party systems are **out of scope**.

**Stop immediately** if:

- The environment appears to be production or an unrelated third party
- Real customer data or live funds are involved
- Authorization is unclear

Never:

- Target production unless explicitly authorized for this assessment
- Use real credentials or real wallets
- Access real customer records
- Create persistence, backdoors, or malware
- Leave elevated accounts, modified credentials, or test artifacts behind
- Run uncontrolled denial-of-service or unbounded resource exhaustion

Destructive tests may use **disposable synthetic records only**. Record original state, modified state, and restoration steps.

Redact secrets in all outputs (`sk_live_****6789`, never full keys).

---

## Inputs

Accept or determine:

| Input | Notes |
| --- | --- |
| Target application | URL, repo, or local stack |
| Authorized environment | Must be sandbox / test |
| Architecture | Web, API, DB, auth, wallets |
| Test credentials / roles | Guest → Security Admin |
| Allowed scope | Endpoints, features, networks |
| Prohibited actions | Explicit denylist |
| Prior reports | Optional, for retest mode |

Example roles to exercise:

Guest · Authenticated User · Depositor · Borrower · Broker / Originator · Vault Administrator · Platform Administrator · Security Administrator

---

## Workflow

### Phase 1 — Confirm scope

Verify authorization and environment identity.

Refuse to continue on unauthorized targets.

Document:

- Assessment date
- Environment name / URL
- App version / commit
- Tester identity
- In-scope systems
- Out-of-scope systems

### Phase 2 — Baseline

Map normal behavior before attacking:

- Authentication / registration / password reset / wallet auth
- Authorization and role model
- Vault create / deposit / withdraw
- Loan request / approve / fund / repay
- Admin surfaces
- File uploads, profiles, sessions, logging
- External services and (if present) smart-contract flows

Record expected happy-path outcomes for later comparison.

### Phase 3 — Attack surface map

Produce a concise map of:

- Routes and API endpoints
- User-controlled inputs
- Authn / authz boundaries
- Role transitions
- Database interactions
- Sensitive and financial state transitions
- Wallet / signature operations

### Phase 4 — Controlled testing

Prioritize **authorization** and **financial logic**. Cover:

**Identity & authentication**

Login, registration, reset, MFA, session expiry/logout, token validation, wallet signatures, API auth bypass attempts.

**Authorization (highest priority)**

With User A / User B (and depositor / borrower / admin variants), test whether A can:

- View or edit B’s profile, wallet, loan, vault, or documents
- Withdraw from another vault / position
- Hit admin endpoints
- Modify permissions
- Self-approve a loan

Cover horizontal and vertical privilege escalation and insecure direct object references (IDOR).

**Database / input**

Injection, unsafe queries, mass assignment, improper filtering, enumeration, error leakage, unauthorized reads/writes.

**API**

Auth requirements, object-level authz, rate limits, unexpected methods, over-sharing, pagination abuse, ID enumeration, hidden/debug/admin endpoints.

**Financial business logic**

Negative / zero / excessive amounts; duplicate deposit, withdraw, fund, repay; over-withdrawal; borrow beyond limits; repayment / interest manipulation; payment or tx replay; unauthorized or self-approval; vault inconsistencies; rounding; concurrent withdraw/loan races.

Impossible states to hunt:

```text
vault balance < 0
withdrawal > authorized position
loan funded twice
loan marked repaid without sufficient payment
depositor yield credited twice
user A controls user B's financial position
```

**Wallet / chain (if present)**

Ownership verification, signature validation, replay protection, network / amount / destination / token checks, wallet-to-user binding. Test wallets only.

**Information disclosure**

API payloads, errors, JS bundles, source maps, configs, logs, headers, metadata. Redact any secrets found.

**Logging / monitoring probe**

Generate controlled events (failed logins, unauthorized API calls, escalation attempts). Note whether they were logged with correct actor/source and without leaking secrets.

### Phase 5 — Cleanup

Before finishing:

- Remove exploit-only test accounts and elevated privileges
- Remove temp files / scripts
- Restore modified disposable records and config where practical
- Confirm the app still operates
- Document anything unrestored in the change log

### Phase 6 — Report and handoff

Write deliverables. Stop. Do not patch code.

---

## Severity model

| Severity | Examples |
| --- | --- |
| CRITICAL | Unauth DB access, private key leak, admin takeover, unauthorized fund movement, system-wide cross-user access |
| HIGH | Privilege escalation, cross-account modification, sensitive financial disclosure, major authz failure |
| MEDIUM | Limited leakage, missing rate limits, weak config |
| LOW | Verbose errors, minor disclosure, hardening gaps |
| INFORMATIONAL | Defense-in-depth notes, non-exploitable observations |

---

## Finding format

Every issue gets a unique ID: `RT-001`, `RT-002`, …

Required fields:

- ID, title, severity, status
- Affected component / endpoint / roles
- Description, security impact
- Test conditions and evidence
- Reproduction steps
- Data accessed / modified
- System state before and after
- Cleanup performed
- Recommended remediation
- Recommended Blue Team priority
- Retest requirements

---

## Required outputs

Create these files in the working tree (or paths the user specifies):

### 1. `RED_TEAM_REPORT.md`

Include:

1. Executive summary (counts by severity; plain-English top risk)
2. Attack surface summary
3. Vulnerability findings (`RT-###`)
4. Scope / environment metadata
5. Residual risks and recommended next tests

### 2. `RED_TEAM_CHANGE_LOG.md`

Every intentional mutation during testing:

```text
Change ID: CHANGE-004
Associated Finding: RT-007
Original State: …
Modified State: …
Method: …
Impact: …
Cleanup: …
Verified: Yes/No
```

Separates **discovered vulnerabilities** from **tester-induced state changes**.

### 3. `RED_TEAM_TO_BLUE_TEAM_HANDOFF.md`

Start with:

```markdown
# SECURITY REMEDIATION HANDOFF

Red Team Assessment Date:
Environment:
Application Version:
Database Version:
Commit / Build Tested:
Red Team Tester:
Blue Team Owner:
```

Then a priority remediation queue (Critical → High → Medium → Low → Informational), favoring issues that enable unauthorized financial transactions, DB compromise, privilege escalation, cross-user exposure, wallet compromise, or auth bypass.

For each finding, include enough for another engineer to understand root issue, impact, repro, and suggested fix direction — without implementing the fix.

### 4. Optional `security-findings.json`

Machine-readable list suitable for dashboards:

```json
{
  "assessment": {
    "environment": "security-sandbox",
    "status": "completed",
    "role": "red-team"
  },
  "findings": [
    {
      "id": "RT-001",
      "severity": "high",
      "title": "Broken object authorization",
      "red_team_status": "confirmed",
      "blue_team_status": "pending",
      "retest_status": "not_tested"
    }
  ]
}
```

---

## Retest-only mode

When asked to retest after Blue Team work:

1. Load original `RT-###` finding and claimed fix notes (`READY_FOR_RETEST.md` if present).
2. Reproduce the **original attack conditions** against the updated build.
3. Do not “pass” by code review alone.
4. Record `PASS` | `FAIL` | `PARTIAL` | `NOT TESTED`.
5. On FAIL / PARTIAL, return the issue to Blue Team with fresh evidence.
6. Only mark CLOSED after behavioral retest PASS (or documented risk acceptance by the owner).

---

## Stop conditions

Stop when:

- Authorized scope is covered (or blocked with documented reason)
- Findings are fully documented
- Cleanup is done (or unrestored items logged)
- `RED_TEAM_REPORT.md`, `RED_TEAM_CHANGE_LOG.md`, and `RED_TEAM_TO_BLUE_TEAM_HANDOFF.md` exist

**Do not** modify application code to resolve vulnerabilities.

**Do not** silently mark issues fixed.

---

## Separation of duties

| This skill does | This skill does not |
| --- | --- |
| Offensive discovery and proof | Broad production monitoring |
| Evidence and severity | Implement patches |
| Change/breakage logging | Close findings after code change alone |
| Blue Team handoff | Rewrite architecture “while testing” |
