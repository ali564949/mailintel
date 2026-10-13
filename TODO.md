# Mail Intel MVP — Outcome Checklist

## 1. Evidence-linked work register

- [x] The dashboard turns new email activity into a continuously updated register of tasks and decisions.
- [x] Each item includes a short description, owner when clear, due date when mentioned, current status, and item type.
- [x] Every extracted fact is linked to a source message with message ID/thread/date and a link to the original email.
- [x] The MVP starts with synthetic or de-identified test data and clearly labels that source context.

## 2. Reconciliation and delay semantics

- [x] When a later message changes a task due date or confirms completion, the existing item is updated instead of creating a duplicate.
- [x] The dashboard distinguishes confirmed delay from inferred risk.
- [x] An item is not labeled overdue merely because its due date is near when no execution status is stated.
- [x] A visible change history shows what changed, when it changed, and whether the change came from the system or a reviewer.

## 3. Human review workflow

- [x] The dashboard exposes open tasks, confirmed overdue items, at-risk items, and decisions needing review.
- [x] A reviewer can inspect the supporting evidence chain for a selected item.
- [x] A reviewer can confirm a finding, edit/correct it, or mark an inferred risk as not a risk.
- [x] Review actions append auditable reviewer events without deleting the original evidence.

## 4. Replaceable integration boundary

- [x] Typed domain contracts separate email messages, evidence, work items, and reconciliation events from the UI.
- [x] A deterministic incoming-message reconciliation function demonstrates the future connector behavior.
- [x] The MVP does not require live mailbox credentials, attachments, automatic email sending, or multi-provider support.
- [x] The architecture documents Microsoft 365/Outlook and a customer-managed local structured-JSON extraction adapter as the next production step.

## 5. Usable responsive dashboard

- [x] The dashboard has a persistent intelligence rail, main work register, and evidence/context panel.
- [x] The interface is responsive for desktop and mobile widths.
- [x] The visual system uses calm prioritization: Signal Mint for verified progress, amber for inferred risk, and coral-red only for confirmed delays.
- [x] The dashboard includes a simulated inbound email action that visibly updates existing work without duplication.
