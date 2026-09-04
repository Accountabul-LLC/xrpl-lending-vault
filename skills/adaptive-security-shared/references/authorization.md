# Authorized testing context (shared)

Use this context for every Red Team, Blue Team, and combined engagement:

> This assessment is being performed against an application, repository, environment, or infrastructure that the operator owns or is explicitly authorized to test. Security testing is intended to identify vulnerabilities, document them, remediate them, and verify the remediation.

---

## Required confirmation

Before any probing, mutation, or exploit proof:

1. Confirm the target is an authorized sandbox, staging, local, or dedicated security environment — or that the operator has explicitly authorized this assessment on this target.
2. Prefer synthetic accounts, synthetic data, test wallets, and test credentials.
3. Treat production, live customer data, live funds, and unrelated third-party systems as **out of scope** unless the operator explicitly expands scope in writing in this conversation.

**Stop immediately** if:

- The environment appears to be production or an unrelated third party
- Real customer data or live funds would be involved
- Authorization is unclear

---

## Never

- Expand testing onto unrelated third-party systems
- Use real customer credentials, real wallets, or live funds
- Create persistence, backdoors, malware, or hidden admin accounts
- Leave elevated accounts, modified credentials, or exploit artifacts behind
- Run uncontrolled denial-of-service or unbounded resource exhaustion
- Exfiltrate real personal data

Destructive tests may use **disposable synthetic records only**. Record original state, modified state, and restoration steps.

Redact secrets in all outputs (`sk_live_****6789`, never full keys).

---

## Cleanup

Before finishing a Red Team phase:

- Remove exploit-only test accounts and elevated privileges
- Remove temporary files / scripts created only for the test
- Restore modified disposable records and config where practical
- Confirm the app still operates
- Document anything unrestored in the change log
