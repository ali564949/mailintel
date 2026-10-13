# Mail Intel — MVP Implementation Plan

## Product scope

Build a **testable Email Intelligence dashboard** that models the first delivery slice of the proposed product: a continuously updated, evidence-linked register of work, decisions, and delivery risk.

The initial build uses **synthetic/de-identified Outlook-style email data**. This proves the core business workflow before requesting mailbox permissions or connecting to Microsoft 365:

1. A new email is ingested into a message timeline.
2. A normalized task or decision record is created or reconciled with an existing record.
3. Every assertion is traceable to evidence from a source message.
4. A later email can change a due date, responsibility, or status without creating a duplicate.
5. Human review can accept or correct the system’s inference.
6. The dashboard distinguishes **confirmed delay** (explicit statement/evidence) from **at-risk** (inference), and does not label an item overdue merely because a due date is close.

### Explicitly deferred

- Live Microsoft Graph authorization, webhooks, and historical mailbox sync
- Gmail and multi-provider support
- Attachment parsing
- Automatic email sending or decision execution
- A company-wide knowledge graph, model fine-tuning, or predictive scoring
- Multi-tenant authentication and production persistence

These interfaces are represented in the data model and integration boundary so they can be added without redesigning the dashboard.

## Product design

### Design movement
**Operational intelligence / editorial command center**: a calm, high-trust interface inspired by airline operations consoles and premium investigative workspaces rather than a generic admin panel.

### Core principles
1. **Evidence before assertion** — source links, confidence, and message excerpts make each conclusion inspectable.
2. **Calm prioritization** — only confirmed delays and meaningful risks receive visual urgency.
3. **Continuous context** — task history reads as a narrative of message-driven changes.
4. **Human sovereignty** — reviewers can correct machine interpretations and preserve an auditable resolution.

### Color philosophy
A deep midnight workspace reduces visual fatigue and gives evidence cards the feel of working documents. A saturated electric mint is the signature action/state color for verified progress; amber is reserved for inferred risk; coral-red only signals confirmed delays. Neutral ivory text and low-contrast slate dividers keep the interface legible and deliberate.

### Layout paradigm
Use a **persistent intelligence rail** rather than a centered dashboard: a narrow navigation spine anchors the product, a left main column carries the task register, and a right-hand evidence/insight column maintains source context. On smaller screens the rail condenses and the evidence column flows beneath the selected work item.

### Signature elements
- A compact **signal pulse** in the header showing stream freshness.
- **Evidence thread cards** with message metadata, quoted proof, and confidence chips.
- A thin **decision line** in task rows linking status, deadline, and the latest verified event.

### Interaction philosophy
Interactions should reveal depth progressively: selecting a task opens its evidence narrative; filters reduce noise rather than moving users to a new screen; accepting or correcting an inference produces an immediate, auditable state update. No destructive automation is introduced.

### Animation
Use restrained 140–180ms transitions for selection, filter, and confirmation states. A slow, low-opacity pulse marks the live stream only while the simulated inbox is healthy. Respect `prefers-reduced-motion` and never animate information that could obscure a status change.

### Typography system
Use **DM Sans** for navigation, labels, and dense operational metadata, paired with **Instrument Serif** for strategic headings and selected task titles. Body metadata uses tabular numerals where dates or confidence values appear. Use a clear scale: display (40–48px), page title (30px), section heading (15px uppercase/tracked), card title (16–18px), metadata (11–13px).

### Brand essence
**Mail Intel turns inbox activity into an evidence-backed operating record for delivery teams.**

Personality: **precise, calm, accountable**.

### Brand voice
Direct and forensic, never alarmist.

- “Two deliveries require a decision, not another follow-up.”
- “Risk detected from a supplier status update — review the evidence.”

### Wordmark and logo
A compact `MI` monogram uses two interlocking vertical strokes, suggesting a message thread resolving into a verified record. It sits beside the wordmark **MAIL INTEL**, tracked in uppercase DM Sans.

### Signature brand color
**Signal Mint — #63F5C3**. It represents verified movement and is never used for warnings.

## Implementation approach

### Frontend
Create a Vite + React + TypeScript single-page application. The main dashboard will be fully usable without a backend by using a typed in-memory store seeded with realistic synthetic message threads.

The application will include:

- A command-center dashboard with metrics for open work, confirmed delays, at-risk work, and decisions needing review.
- A filterable task register with owner, deadline, status, source count, and confidence.
- A selected-item detail view that separates the current fact from its evidence chain.
- A message/evidence panel including sender, subject, received time, a quoted supporting passage, and a simulated “open original” action.
- Human-review controls: **Confirm**, **Edit finding**, and **Mark not a risk**. These modify local state and append a review event to the task history.
- A simulated inbound email control that processes a new message through a deterministic reconciliation function, demonstrating update-versus-duplicate behavior.
- Empty/filter states and responsive layout behavior.

### Domain model
The typed domain layer will be intentionally independent of the UI.

- `EmailMessage`: provider ID, thread ID, sender, recipients, received time, subject, body preview, original URL.
- `Evidence`: field asserted, source message, direct quote, extraction type (`explicit` or `inferred`), confidence, and review state.
- `WorkItem`: stable ID, type (`task` or `decision`), description, owner, due date, status, risk classification, evidence IDs, event history, and human-review fields.
- `ReconciliationEvent`: immutable activity records that show how message content updated the item.

A `reconcileIncomingMessage()` service simulates future extraction output and applies deterministic update rules. In a production integration, Microsoft Graph ingestion and an AI extractor would call this same contract.

### Future backend boundary
The product architecture is kept modular even though the MVP is frontend-seeded:

```text
Microsoft Graph connector → inbox queue → extraction adapter → reconciliation service → PostgreSQL repository → dashboard API
```

Later changes will replace the in-memory repository with PostgreSQL and add a FastAPI service without changing the domain object shape or the visual review workflow. The extractor adapter will accept structured JSON from either a local model or a customer-managed internal AI service. Email body text remains untrusted input and is never treated as executable instruction.

### Security posture carried into the MVP
- No live email credentials or message data are requested or stored.
- Seed messages are synthetic, clearly labeled, and use simulated deep links.
- Evidence is displayed as data, not as system instruction.
- Every update carries a source and update actor (`system` or `reviewer`) so audit history is visible.

## Project structure

```text
mailintel/
├── plan.md                 # Approved product, architecture, and design direction
├── TODO.md                 # Outcome-based implementation progress
├── package.json            # Pinned frontend toolchain and scripts
├── pnpm-workspace.yaml     # Reviewed pnpm build-script policy
├── index.html
├── public/
│   └── manus-routes.json   # Declares the single dashboard route
└── src/
    ├── main.tsx            # React entry point
    ├── App.tsx             # Dashboard composition and state ownership
    ├── styles.css          # Responsive visual system
    ├── domain/
    │   ├── types.ts        # Stable task, evidence, message, and audit contracts
    │   ├── seed.ts         # Synthetic email threads and initial work register
    │   └── reconcile.ts    # Deterministic incoming-message reconciliation demo
    └── components/
        ├── Sidebar.tsx
        ├── Header.tsx
        ├── Overview.tsx
        ├── WorkRegister.tsx
        ├── TaskDetail.tsx
        └── EvidencePanel.tsx
```

## Build workflow

1. Configure host-managed diagnostics for TypeScript before writing source files.
2. Set up a pinned Vite/React/TypeScript toolchain with a reviewed pnpm lifecycle policy.
3. Implement the domain contracts, seed threads, and deterministic reconciliation logic.
4. Build the responsive dashboard and review interactions.
5. Run type checking and production build; fix actionable diagnostics.
6. Start the local Preview, verify route manifest and runtime response, then inspect desktop and mobile screenshots.
7. Commit the implementation to the managed project repository. Publication remains optional and will not be enabled automatically.

## Architecture decision for the production connector

The dashboard MVP does not need an actual model. For the first connected customer deployment, the recommended default is **a local structured-JSON model inside the customer environment**, behind an `ExtractionAdapter` interface. This protects the privacy-led product position while keeping an approved customer-managed internal AI endpoint as a swappable alternative for companies that already operate one.
