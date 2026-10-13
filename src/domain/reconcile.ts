import type { EmailMessage, Evidence, ReconciliationResult, WorkStore } from './types'

export const sampleIncomingMessage: EmailMessage = {
  id: 'msg-106',
  providerMessageId: 'AAMkAGM2-106',
  threadId: 'thread-landing-page',
  sender: 'Sarah Chen',
  senderRole: 'Growth lead',
  recipients: ['Brand delivery group'],
  subject: 'Re: Q4 campaign landing page — revised hand-off',
  receivedAt: '2026-10-13T16:42:00Z',
  bodyPreview: 'The agency needs until Monday to finish the event map. We have moved the hand-off from Friday to Tuesday 20 October.',
  originalUrl: 'https://outlook.office.com/mail/deeplink/read/AAMkAGM2-106',
}

/**
 * Demonstrates the contract used by a future email connector + extraction adapter.
 * The message has already been converted into structured facts; reconciliation finds
 * a stable item by thread ID and updates it instead of creating a duplicate.
 */
export function reconcileIncomingMessage(store: WorkStore): ReconciliationResult {
  const existing = store.workItems.find((item) => item.threadId === sampleIncomingMessage.threadId)

  if (!existing) {
    throw new Error('Expected a stable work item for the sample thread.')
  }

  if (store.messages.some((message) => message.id === sampleIncomingMessage.id)) {
    return {
      workItems: store.workItems,
      messages: store.messages,
      evidence: store.evidence,
      updatedItemId: existing.id,
      createdNewItem: false,
    }
  }

  const dueDateEvidence: Evidence = {
    id: 'ev-106a',
    workItemId: existing.id,
    messageId: sampleIncomingMessage.id,
    field: 'due_date',
    quote: 'We have moved the hand-off from Friday to Tuesday 20 October.',
    kind: 'explicit',
    confidence: 0.98,
    extractedAt: '2026-10-13T16:42:19Z',
  }

  const updatedItem = {
    ...existing,
    dueDate: '2026-10-20',
    summary: 'The agency dependency moved the planned hand-off from Friday to Tuesday 20 October. This remains a risk, not a confirmed failure.',
    evidenceIds: [dueDateEvidence.id, ...existing.evidenceIds],
    messageIds: [sampleIncomingMessage.id, ...existing.messageIds],
    events: [
      {
        id: 'event-106a',
        at: '2026-10-13T16:42:19Z',
        actor: 'System' as const,
        title: 'Deadline updated from new email',
        detail: 'Existing task reconciled by thread. Due date moved from 17 Oct to 20 Oct; no duplicate created.',
        messageId: sampleIncomingMessage.id,
      },
      ...existing.events,
    ],
  }

  return {
    workItems: store.workItems.map((item) => (item.id === existing.id ? updatedItem : item)),
    messages: [sampleIncomingMessage, ...store.messages],
    evidence: [dueDateEvidence, ...store.evidence],
    updatedItemId: existing.id,
    createdNewItem: false,
  }
}
