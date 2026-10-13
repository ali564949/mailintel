import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardCheck,
  Clock3,
  FileText,
  Filter,
  FolderClock,
  Inbox,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { reconcileIncomingMessage } from './domain/reconcile'
import { initialStore } from './domain/seed'
import type { RiskClass, WorkItem, WorkStore } from './domain/types'

type RegisterFilter = 'all' | 'open' | 'delayed' | 'risk' | 'decisions'

const riskMeta: Record<RiskClass, { label: string; className: string; description: string }> = {
  confirmed_delay: {
    label: 'Confirmed delay',
    className: 'danger',
    description: 'Explicit message wording confirms the commitment has slipped.',
  },
  at_risk: {
    label: 'At risk',
    className: 'warning',
    description: 'A dependency indicates risk; no delay was explicitly confirmed.',
  },
  needs_review: {
    label: 'Needs decision',
    className: 'review',
    description: 'An accountable decision is required before work can proceed.',
  },
  on_track: {
    label: 'On track',
    className: 'success',
    description: 'The latest source confirms the item is progressing as planned.',
  },
}

const formatDate = (value: string | null) => {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

const newAuditId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function RiskPill({ risk }: { risk: RiskClass }) {
  const meta = riskMeta[risk]
  return <span className={`risk-pill ${meta.className}`}>{meta.label}</span>
}

function Avatar({ item }: { item: WorkItem }) {
  if (!item.owner) return <span className="avatar empty">—</span>
  return <span className={`avatar ${item.owner.tone}`}>{item.owner.initials}</span>
}

function App() {
  const [store, setStore] = useState<WorkStore>(initialStore)
  const [selectedId, setSelectedId] = useState('task-vendor-pack')
  const [activeFilter, setActiveFilter] = useState<RegisterFilter>('all')
  const [toast, setToast] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [draftRisk, setDraftRisk] = useState<RiskClass>('at_risk')
  const [draftSummary, setDraftSummary] = useState('')

  const selected = store.workItems.find((item) => item.id === selectedId) ?? store.workItems[0]
  const hasProcessedSample = store.messages.some((message) => message.id === 'msg-106')

  const metrics = useMemo(() => ({
    open: store.workItems.filter((item) => item.status !== 'Completed').length,
    delayed: store.workItems.filter((item) => item.risk === 'confirmed_delay').length,
    atRisk: store.workItems.filter((item) => item.risk === 'at_risk').length,
    review: store.workItems.filter((item) => item.risk === 'needs_review').length,
  }), [store.workItems])

  const displayedItems = useMemo(() => {
    const matches = (item: WorkItem) => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'open') return item.status !== 'Completed'
      if (activeFilter === 'delayed') return item.risk === 'confirmed_delay'
      if (activeFilter === 'risk') return item.risk === 'at_risk'
      return item.type === 'decision'
    }

    const order: Record<RiskClass, number> = {
      confirmed_delay: 0,
      at_risk: 1,
      needs_review: 2,
      on_track: 3,
    }

    const needle = searchTerm.trim().toLowerCase()
    return store.workItems
      .filter((item) => {
        if (!matches(item)) return false
        if (!needle) return true
        return [item.title, item.summary, item.owner?.name ?? ''].join(' ').toLowerCase().includes(needle)
      })
      .sort((a, b) => order[a.risk] - order[b.risk])
  }, [activeFilter, searchTerm, store.workItems])

  const selectedEvidence = store.evidence.filter((item) => item.workItemId === selected.id)

  const processSampleEmail = () => {
    if (hasProcessedSample) {
      setToast('The sample email was already reconciled into the existing landing-page record.')
      return
    }

    const result = reconcileIncomingMessage(store)
    setStore({ workItems: result.workItems, messages: result.messages, evidence: result.evidence })
    setSelectedId(result.updatedItemId)
    setToast('Sample inbox update reconciled — deadline changed, no duplicate task created.')
  }

  const applyReview = (action: 'confirm' | 'dismiss') => {
    const at = '2026-10-13T16:48:00Z'
    setStore((current) => ({
      ...current,
      workItems: current.workItems.map((item) => {
        if (item.id !== selected.id) return item
        const dismissing = action === 'dismiss'
        const linkedMessageId = current.evidence.find((evidence) => evidence.workItemId === item.id)?.messageId
        return {
          ...item,
          risk: dismissing ? 'on_track' : item.risk,
          reviewState: dismissing ? 'dismissed' : 'confirmed',
          events: [
            {
              id: newAuditId(`review-${action}-${item.id}`),
              at,
              actor: 'Reviewer',
              title: dismissing ? 'Risk dismissed after review' : 'Finding confirmed',
              detail: dismissing
                ? `Assessment changed from “${riskMeta[item.risk].label}” to “On track” after reviewing the linked source evidence.`
                : `Reviewer verified “${riskMeta[item.risk].label}” against the linked source evidence.`,
              messageId: linkedMessageId,
            },
            ...item.events,
          ],
        }
      }),
    }))
    setToast(action === 'dismiss' ? 'Risk marked as not current. Source evidence remains attached.' : 'Finding confirmed and recorded in the audit trail.')
  }

  const openCorrection = () => {
    setDraftRisk(selected.risk)
    setDraftSummary(selected.summary)
    setShowCorrection(true)
  }

  const saveCorrection = () => {
    const at = '2026-10-13T16:50:00Z'
    setStore((current) => ({
      ...current,
      workItems: current.workItems.map((item) => {
        if (item.id !== selected.id) return item
        const linkedMessageId = current.evidence.find((evidence) => evidence.workItemId === item.id)?.messageId
        return {
          ...item,
          risk: draftRisk,
          summary: draftSummary.trim() || item.summary,
          reviewState: 'corrected',
          events: [
            {
              id: newAuditId(`review-correction-${item.id}`),
              at,
              actor: 'Reviewer',
              title: 'Finding corrected',
              detail: `Assessment changed from “${riskMeta[item.risk].label}” to “${riskMeta[draftRisk].label}”; reviewer note was updated and the original evidence retained.`,
              messageId: linkedMessageId,
            },
            ...item.events,
          ],
        }
      }),
    }))
    setShowCorrection(false)
    setToast('Reviewer correction saved. The original evidence remains immutable.')
  }

  const filters: Array<{ id: RegisterFilter; label: string; count?: number }> = [
    { id: 'all', label: 'All work', count: store.workItems.length },
    { id: 'open', label: 'Open work', count: metrics.open },
    { id: 'delayed', label: 'Confirmed delay', count: metrics.delayed },
    { id: 'risk', label: 'At risk', count: metrics.atRisk },
    { id: 'decisions', label: 'Decisions' },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" aria-label="Mail Intel">
          <span className="brand-mark"><i /><i /></span>
          <span className="brand-name">MAIL INTEL</span>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-orb">N</span>
          <span><b>Northstar</b><small>Delivery desk</small></span>
          <ChevronDown size={15} />
        </div>

        <nav className="navigation" aria-label="Workspace navigation">
          <span className="nav-label">WORKSPACE</span>
          <span className="nav-link active"><LayoutDashboard size={17} /> Intelligence <span>08</span></span>
          <span className="nav-link"><Inbox size={17} /> Inbox stream <span>01</span></span>
          <span className="nav-link"><ClipboardCheck size={17} /> Review queue <span>{metrics.review}</span></span>
          <span className="nav-label secondary">SYSTEM</span>
          <span className="nav-link"><ShieldCheck size={17} /> Evidence ledger</span>
          <span className="nav-link"><Settings size={17} /> Workspace settings</span>
        </nav>

        <div className="sidebar-footer">
          <div className="synthetic-note"><Sparkles size={15} /><span><b>Demo workspace</b><small>Synthetic email data only</small></span></div>
          <div className="profile"><span className="profile-avatar">AR</span><span><b>Alex Rivera</b><small>Programme lead</small></span><MoreHorizontal size={17} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="crumbs"><span>Northstar</span><span>/</span><b>Delivery intelligence</b></div>
          <div className="topbar-actions">
            {searchOpen && <input className="search-input" autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search work" aria-label="Search work register" />}
            <button className="icon-button" aria-label="Search work register" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}><Search size={18} /></button>
            <button className="icon-button notifications" aria-label="Notifications" onClick={() => setToast('No new workspace notifications. The email stream is healthy.')}><Bell size={18} /><i /></button>
            <div className="vertical-rule" />
            <div className="presence"><span className="live-dot" /> Stream healthy</div>
            <button className="process-button" onClick={processSampleEmail}>
              {hasProcessedSample ? <Check size={16} /> : <Plus size={16} />}
              {hasProcessedSample ? 'Email reconciled' : 'Process sample email'}
            </button>
          </div>
        </header>

        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><Activity size={14} /> LIVE WORK REGISTER</span>
            <h1>Inbox, resolved<br />into <em>action.</em></h1>
            <p>Continuous context for delivery work — every signal is linked back to the message that proved it.</p>
          </div>
          <div className="freshness-card">
            <div className="freshness-top"><span className="live-dot" /> Signal freshness <ArrowUpRight size={16} /></div>
            <strong>2m 14s</strong>
            <span>Last message processed <b>16:42</b></span>
            <div className="freshness-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
        </section>

        <section className="metric-strip" aria-label="Work summary">
          <div className="metric-card">
            <span className="metric-icon neutral"><FolderClock size={19} /></span>
            <span><small>OPEN WORK</small><strong>{metrics.open}</strong><em>across 5 threads</em></span>
          </div>
          <div className="metric-card alert-card">
            <span className="metric-icon danger"><AlertTriangle size={19} /></span>
            <span><small>CONFIRMED DELAY</small><strong>{metrics.delayed}</strong><em>explicit source evidence</em></span>
          </div>
          <div className="metric-card">
            <span className="metric-icon warning"><CircleDot size={19} /></span>
            <span><small>AT RISK</small><strong>{metrics.atRisk}</strong><em>requires attention</em></span>
          </div>
          <div className="metric-card">
            <span className="metric-icon review"><ClipboardCheck size={19} /></span>
            <span><small>DECISIONS DUE</small><strong>{metrics.review}</strong><em>pending accountable call</em></span>
          </div>
        </section>

        <section className="workbench">
          <div className="register-panel">
            <div className="section-heading">
              <div><span className="eyebrow"><Mail size={14} /> MESSAGE-DERIVED WORK</span><h2>Active register <span>{displayedItems.length}</span></h2></div>
            </div>

            <div className="filter-row" role="tablist" aria-label="Work filters">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  className={activeFilter === filter.id ? 'filter-chip active' : 'filter-chip'}
                  onClick={() => setActiveFilter(filter.id)}
                  aria-pressed={activeFilter === filter.id}
                >
                  {filter.label}{filter.count !== undefined && <span>{filter.count}</span>}
                </button>
              ))}
            </div>

            <div className="register-head" aria-hidden="true"><span>WORK ITEM</span><span>OWNER</span><span>DATE</span><span>ASSESSMENT</span></div>
            <div className="work-list">
              {displayedItems.map((item) => (
                <button
                  className={selected.id === item.id ? 'work-row selected' : 'work-row'}
                  onClick={() => { setSelectedId(item.id); setShowCorrection(false) }}
                  key={item.id}
                  aria-pressed={selected.id === item.id}
                >
                  <span className={`work-accent ${riskMeta[item.risk].className}`} />
                  <span className="work-main">
                    <span className="work-title-line"><span className={`type-badge ${item.type}`}>{item.type === 'task' ? 'TASK' : 'DECISION'}</span><b>{item.title}</b></span>
                    <span>{item.summary}</span>
                  </span>
                  <span className="owner-cell"><Avatar item={item} /><span className="owner-name">{item.owner?.name ?? 'Unassigned'}</span><span className="mobile-risk"><RiskPill risk={item.risk} /></span></span>
                  <span className="date-cell"><Clock3 size={14} /> {formatDate(item.dueDate)}</span>
                  <span className="assessment-cell"><RiskPill risk={item.risk} /><small>{item.evidenceIds.length} source{item.evidenceIds.length !== 1 ? 's' : ''}</small></span>
                </button>
              ))}
            </div>
          </div>

          <aside className="detail-panel" aria-label="Selected work item detail" aria-live="polite">
            <div className="detail-intro">
              <span className="detail-kicker">SELECTED RECORD</span>
              <span className="more-button" aria-hidden="true"><MoreHorizontal size={18} /></span>
            </div>
            <div className="detail-title-row"><span className={`record-icon ${selected.type}`}><FileText size={16} /></span><RiskPill risk={selected.risk} /></div>
            <h3>{selected.title}</h3>
            <p className="detail-summary">{selected.summary}</p>

            <div className="record-metadata">
              <div><span>Owner</span><b>{selected.owner?.name ?? 'Unassigned'}</b></div>
              <div><span>Current due date</span><b>{formatDate(selected.dueDate)}</b></div>
              <div><span>System confidence</span><b>{Math.round((selectedEvidence[0]?.confidence ?? 0) * 100)}%</b></div>
              <div><span>Review state</span><b className={`review-text ${selected.reviewState}`}>{selected.reviewState}</b></div>
            </div>

            <div className="assessment-box">
              <div><span className="assessment-label">CURRENT ASSESSMENT</span><b>{riskMeta[selected.risk].label}</b></div>
              <p>{riskMeta[selected.risk].description}</p>
            </div>

            <div className="review-actions">
              <span>HUMAN REVIEW</span>
              <div>
                <button className="review-primary" onClick={() => applyReview('confirm')}><CheckCircle2 size={15} /> Confirm</button>
                <button className="review-secondary" onClick={openCorrection}>Edit finding</button>
                {selected.risk !== 'on_track' && <button className="text-action" onClick={() => applyReview('dismiss')}>Not a risk</button>}
              </div>
            </div>

            {showCorrection && (
              <form className="correction-form" onSubmit={(event) => { event.preventDefault(); saveCorrection() }}>
                <div className="correction-title"><span>Correct system finding</span><button type="button" onClick={() => setShowCorrection(false)} aria-label="Close correction"><X size={15} /></button></div>
                <label>Assessment
                  <select value={draftRisk} onChange={(event) => setDraftRisk(event.target.value as RiskClass)}>
                    <option value="confirmed_delay">Confirmed delay</option>
                    <option value="at_risk">At risk</option>
                    <option value="needs_review">Needs decision</option>
                    <option value="on_track">On track</option>
                  </select>
                </label>
                <label>Reviewer note
                  <textarea value={draftSummary} onChange={(event) => setDraftSummary(event.target.value)} rows={3} />
                </label>
                <button className="save-correction" type="submit">Save correction</button>
              </form>
            )}

            <div className="evidence-section">
              <div className="evidence-heading"><span><ShieldCheck size={15} /> EVIDENCE MAP</span><b>{selectedEvidence.length} linked</b></div>
              {selectedEvidence.map((evidence) => {
                const message = store.messages.find((candidate) => candidate.id === evidence.messageId)
                if (!message) return null
                return (
                  <article className="evidence-card" key={evidence.id}>
                    <div className="evidence-meta"><span className={`evidence-kind ${evidence.kind}`}>{evidence.kind}</span><span>{Math.round(evidence.confidence * 100)}% confidence</span></div>
                    <blockquote>“{evidence.quote}”</blockquote>
                    <footer><span><b>{message.sender}</b> · {message.subject}</span><a href={message.originalUrl} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={13} /></a></footer>
                  </article>
                )
              })}
            </div>

            <div className="timeline-section">
              <div className="timeline-heading"><span>CHANGE HISTORY</span><small>Immutable audit trail</small></div>
              <div className="timeline">
                {selected.events.map((event) => (
                  <div className="timeline-event" key={event.id}>
                    <span className={`timeline-dot ${event.actor.toLowerCase()}`} />
                    <div><span><b>{event.title}</b><time>{formatTimestamp(event.at)}</time></span><p>{event.detail}</p><small>{event.actor === 'System' ? <><Sparkles size={12} /> System reconciliation</> : <><UserRound size={12} /> Reviewer action</>}</small></div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>

      {toast && <div className="toast" role="status"><CheckCircle2 size={17} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    </div>
  )
}

export default App
