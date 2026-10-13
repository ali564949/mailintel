export type WorkItemType = 'task' | 'decision'

export type WorkStatus = 'Open' | 'In progress' | 'Awaiting decision' | 'Completed'

export type RiskClass = 'confirmed_delay' | 'at_risk' | 'needs_review' | 'on_track'

export type EvidenceKind = 'explicit' | 'inferred'

export type ReviewState = 'unreviewed' | 'confirmed' | 'corrected' | 'dismissed'

export interface EmailMessage {
  id: string
  providerMessageId: string
  threadId: string
  sender: string
  senderRole: string
  recipients: string[]
  subject: string
  receivedAt: string
  bodyPreview: string
  originalUrl: string
}

export interface Evidence {
  id: string
  workItemId: string
  messageId: string
  field: 'status' | 'owner' | 'due_date' | 'decision' | 'risk'
  quote: string
  kind: EvidenceKind
  confidence: number
  extractedAt: string
}

export interface ChangeEvent {
  id: string
  at: string
  actor: 'System' | 'Reviewer'
  title: string
  detail: string
  messageId?: string
}

export interface WorkItem {
  id: string
  type: WorkItemType
  threadId: string
  title: string
  summary: string
  owner: {
    name: string
    initials: string
    tone: 'mint' | 'violet' | 'blue' | 'amber' | 'rose'
  } | null
  dueDate: string | null
  status: WorkStatus
  risk: RiskClass
  reviewState: ReviewState
  evidenceIds: string[]
  messageIds: string[]
  events: ChangeEvent[]
}

export interface WorkStore {
  workItems: WorkItem[]
  messages: EmailMessage[]
  evidence: Evidence[]
}

export interface ReconciliationResult {
  workItems: WorkItem[]
  messages: EmailMessage[]
  evidence: Evidence[]
  updatedItemId: string
  createdNewItem: boolean
}
