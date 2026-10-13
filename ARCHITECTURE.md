# Architecture note

The first implementation is a frontend-only proof of the evidence-linked work register. Seeded synthetic Outlook-style messages are deliberately used so the core workflow can be evaluated without mailbox credentials or customer data.

The stable future boundary is:

```text
Microsoft Graph connector → inbox queue → extraction adapter → reconciliation service → PostgreSQL repository → dashboard API
```

The extraction adapter is **local-model ready**: a customer-managed structured-JSON model can run inside the deployment boundary, with an internal AI service remaining a replaceable implementation. Email text is untrusted input and is never treated as executable instructions.

The current `src/domain/reconcile.ts` function is the reference contract for thread identity, update-vs-duplicate behavior, source evidence attachment, and audit events. It is idempotent for repeated provider delivery of the same message ID.
