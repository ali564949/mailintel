import { useMemo, useState, type FormEvent } from 'react'
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Inbox,
  Mail,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  X,
} from 'lucide-react'
import { reconcileIncomingMessage } from './domain/reconcile'
import { initialStore } from './domain/seed'
import type { RiskClass, WorkItem, WorkStore } from './domain/types'

type Filter = 'all' | 'tasks' | 'decisions' | 'delays' | 'risk'

const riskLabels: Record<RiskClass, string> = {
  confirmed_delay: 'Confirmed delay',
  at_risk: 'At risk',
  needs_review: 'Needs decision',
  on_track: 'On track',
}

const riskClass: Record<RiskClass, string> = {
  confirmed_delay: 'red',
  at_risk: 'amber',
  needs_review: 'purple',
  on_track: 'green',
}

const formatDate = (value: string | null) => {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))

const auditId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function RiskLabel({ risk }: { risk: RiskClass }) {
  return <span className={`label ${riskClass[risk]}`}>{riskLabels[risk]}</span>
}

function App() {
  const [store, setStore] = useState<WorkStore>(initialStore)
  const [selectedId, setSelectedId] = useState('task-vendor-pack')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [mobileDetail, setMobileDetail] = useState(false)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [correctionRisk, setCorrectionRisk] = useState<RiskClass>('at_risk')
  const [correctionNote, setCorrectionNote] = useState('')

  const selected = store.workItems.find((item) => item.id === selectedId) ?? store.workItems[0]
  const selectedEvidence = store.evidence.filter((item) => item.workItemId === selected.id)
  const selectedMessages = store.messages.filter((item) => selected.messageIds.includes(item.id))
  const processed = store.messages.some((item) => item.id === 'msg-106')

  const items = useMemo(() => {
    const term = search.trim().toLowerCase()
    return store.workItems.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'tasks' && item.type === 'task') ||
        (filter === 'decisions' && item.type === 'decision') ||
        (filter === 'delays' && item.risk === 'confirmed_delay') ||
        (filter === 'risk' && item.risk === 'at_risk')
      const matchesSearch = !term || `${item.title} ${item.summary} ${item.owner?.name ?? ''}`.toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [filter, search, store.workItems])

  const counts = {
    tasks: store.workItems.filter((item) => item.type === 'task').length,
    decisions: store.workItems.filter((item) => item.type === 'decision').length,
    delays: store.workItems.filter((item) => item.risk === 'confirmed_delay').length,
    risk: store.workItems.filter((item) => item.risk === 'at_risk').length,
  }

  const selectItem = (id: string) => {
    setSelectedId(id)
    setMobileDetail(true)
  }

  const processEmail = () => {
    if (processed) {
      setMessage('This sample message has already been reconciled into the existing task.')
      return
    }
    const result = reconcileIncomingMessage(store)
    setStore({ workItems: result.workItems, messages: result.messages, evidence: result.evidence })
    setSelectedId(result.updatedItemId)
    setMobileDetail(true)
    setMessage('New email processed. The existing task was updated; no duplicate was created.')
  }

  const review = (action: 'confirm' | 'dismiss') => {
    const oldRisk = selected.risk
    const newRisk = action === 'dismiss' ? 'on_track' : oldRisk
    const sourceId = selectedEvidence[0]?.messageId
    setStore((current) => ({
      ...current,
      workItems: current.workItems.map((item) => item.id !== selected.id ? item : ({
        ...item,
        risk: newRisk,
        reviewState: action === 'dismiss' ? 'dismissed' : 'confirmed',
        events: [{
          id: auditId(`review-${action}`),
          at: new Date().toISOString(),
          actor: 'Reviewer',
          title: action === 'dismiss' ? 'Risk marked as not current' : 'Finding confirmed',
          detail: action === 'dismiss'
            ? `Assessment changed from “${riskLabels[oldRisk]}” to “On track” after review.`
            : `Reviewer verified “${riskLabels[oldRisk]}” against the linked source evidence.`,
          messageId: sourceId,
        }, ...item.events],
      })),
    }))
    setMessage(action === 'dismiss' ? 'The risk was marked as not current.' : 'Finding confirmed and added to the change history.')
  }

  const openCorrection = () => {
    setCorrectionRisk(selected.risk)
    setCorrectionNote(selected.summary)
    setCorrectionOpen(true)
  }

  const saveCorrection = (event: FormEvent) => {
    event.preventDefault()
    const oldRisk = selected.risk
    const sourceId = selectedEvidence[0]?.messageId
    setStore((current) => ({
      ...current,
      workItems: current.workItems.map((item) => item.id !== selected.id ? item : ({
        ...item,
        risk: correctionRisk,
        summary: correctionNote.trim() || item.summary,
        reviewState: 'corrected',
        events: [{
          id: auditId('review-correction'),
          at: new Date().toISOString(),
          actor: 'Reviewer',
          title: 'Finding corrected',
          detail: `Assessment changed from “${riskLabels[oldRisk]}” to “${riskLabels[correctionRisk]}”.`,
          messageId: sourceId,
        }, ...item.events],
      })),
    }))
    setCorrectionOpen(false)
    setMessage('Your correction was saved. The original email evidence is still preserved.')
  }

  return (
    <div className="mail-app">
      <header className="mail-header">
        <div className="brand"><span className="brand-icon"><i /><i /></span><b>Mail Intel</b></div>
        <div className="header-center"><span className="workspace-name">Northstar</span><ChevronDown size={14} /><span className="divider" /><span className="connection"><span /> Email stream connected</span></div>
        <div className="header-actions"><button className="header-icon mobile-menu" aria-label="Menu"><Menu size={18} /></button><button className="header-icon" aria-label="More options"><MoreHorizontal size={18} /></button><button className="profile">AR</button></div>
      </header>

      <div className="mail-layout">
        <aside className="mail-sidebar">
          <button className="compose" onClick={processEmail}><Plus size={16} /> Process new email</button>
          <nav aria-label="Mail Intel sections">
            <button className={filter === 'all' ? 'nav-item active' : 'nav-item'} onClick={() => setFilter('all')}><Inbox size={16} /> All intelligence <span>{store.workItems.length}</span></button>
            <button className={filter === 'tasks' ? 'nav-item active' : 'nav-item'} onClick={() => setFilter('tasks')}><Tag size={16} /> Tasks <span>{counts.tasks}</span></button>
            <button className={filter === 'decisions' ? 'nav-item active' : 'nav-item'} onClick={() => setFilter('decisions')}><CheckCircle2 size={16} /> Decisions <span>{counts.decisions}</span></button>
            <button className={filter === 'delays' ? 'nav-item active' : 'nav-item'} onClick={() => setFilter('delays')}><Clock3 size={16} /> Confirmed delays <span>{counts.delays}</span></button>
            <button className={filter === 'risk' ? 'nav-item active' : 'nav-item'} onClick={() => setFilter('risk')}><ShieldCheck size={16} /> At risk <span>{counts.risk}</span></button>
          </nav>
          <div className="sidebar-note"><Sparkles size={14} /><span><b>Demo workspace</b><small>Synthetic email data only</small></span></div>
        </aside>

        <main className={mobileDetail ? 'mail-main detail-open' : 'mail-main'}>
          <div className="content-header">
            <div className="mobile-back"><button onClick={() => setMobileDetail(false)} aria-label="Back to inbox"><ArrowLeft size={18} /></button></div>
            <div><p className="overline">EMAIL INTELLIGENCE</p><h1>{filter === 'all' ? 'All intelligence' : filter === 'tasks' ? 'Tasks' : filter === 'decisions' ? 'Decisions' : filter === 'delays' ? 'Confirmed delays' : 'At risk'}</h1></div>
            <div className="content-tools"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" aria-label="Search intelligence" /></div><button className="refresh" onClick={processEmail}>{processed ? <Check size={15} /> : <Send size={15} />} {processed ? 'Processed' : 'Process email'}</button></div>
          </div>
          <div className="simple-summary"><span><b>{items.length}</b> records</span><span>Updated just now</span><span className="summary-source">Source: synthetic Outlook messages</span></div>

          <div className="record-list">
            {items.map((item) => (
              <button key={item.id} className={selected.id === item.id ? 'record selected' : 'record'} onClick={() => selectItem(item.id)} aria-pressed={selected.id === item.id}>
                <span className={`record-type ${item.type}`}>{item.type === 'task' ? <Tag size={13} /> : <CheckCircle2 size={13} />}</span>
                <span className="record-copy"><span className="record-title"><b>{item.title}</b><span>{item.type}</span></span><span className="record-summary">{item.summary}</span><span className="record-meta">{item.owner?.name ?? 'Unassigned'} · Due {formatDate(item.dueDate)} · {item.evidenceIds.length} source{item.evidenceIds.length === 1 ? '' : 's'}</span></span>
                <RiskLabel risk={item.risk} />
              </button>
            ))}
            {items.length === 0 && <div className="empty-state"><Mail size={22} /><b>No matching records</b><span>Try another search or section.</span></div>}
          </div>
        </main>

        <aside className={mobileDetail ? 'detail-pane visible' : 'detail-pane'}>
          <div className="detail-top"><span className="overline">RECORD DETAILS</span><button onClick={() => setMobileDetail(false)} className="close-detail" aria-label="Close details"><X size={18} /></button></div>
          <div className="detail-heading"><span className={`detail-type ${selected.type}`}>{selected.type === 'task' ? <Tag size={15} /> : <CheckCircle2 size={15} />}</span><RiskLabel risk={selected.risk} /></div>
          <h2>{selected.title}</h2>
          <p className="detail-summary">{selected.summary}</p>
          <div className="facts"><div><small>Owner</small><b>{selected.owner?.name ?? 'Unassigned'}</b></div><div><small>Due date</small><b>{formatDate(selected.dueDate)}</b></div><div><small>Status</small><b>{selected.status}</b></div><div><small>Review</small><b>{selected.reviewState}</b></div></div>

          <section className="detail-section review-section"><div className="section-title">Human review <small>Correct the system when needed</small></div><div className="review-buttons"><button className="confirm" onClick={() => review('confirm')}><Check size={14} /> Confirm</button><button onClick={openCorrection}>Edit finding</button>{selected.risk !== 'on_track' && <button className="quiet" onClick={() => review('dismiss')}>Not a risk</button>}</div></section>

          {correctionOpen && <form className="correction" onSubmit={saveCorrection}><div className="correction-head"><b>Edit finding</b><button type="button" onClick={() => setCorrectionOpen(false)} aria-label="Close edit"><X size={15} /></button></div><label>Assessment<select value={correctionRisk} onChange={(event) => setCorrectionRisk(event.target.value as RiskClass)}><option value="confirmed_delay">Confirmed delay</option><option value="at_risk">At risk</option><option value="needs_review">Needs decision</option><option value="on_track">On track</option></select></label><label>Note<textarea rows={3} value={correctionNote} onChange={(event) => setCorrectionNote(event.target.value)} /></label><button className="save" type="submit">Save correction</button></form>}

          <section className="detail-section"><div className="section-title"><span><ShieldCheck size={15} /> Evidence</span><small>{selectedEvidence.length} linked source{selectedEvidence.length === 1 ? '' : 's'}</small></div>
            {selectedEvidence.map((evidence) => { const source = store.messages.find((item) => item.id === evidence.messageId); if (!source) return null; return <article className="evidence" key={evidence.id}><div className="evidence-head"><span className={evidence.kind}>{evidence.kind}</span><span>{Math.round(evidence.confidence * 100)}% confidence</span></div><blockquote>“{evidence.quote}”</blockquote><div className="evidence-source"><span><b>{source.sender}</b><br />{source.subject}</span><a href={source.originalUrl} target="_blank" rel="noreferrer">Open email <ArrowLeft size={12} /></a></div></article> })}
          </section>

          <section className="detail-section"><div className="section-title"><span><Archive size={15} /> Change history</span><small>Audit trail</small></div><div className="history">{selected.events.map((event) => <div className="history-item" key={event.id}><span className={event.actor === 'Reviewer' ? 'history-dot reviewer' : 'history-dot'} /><div><b>{event.title}</b><time>{formatDateTime(event.at)}</time><p>{event.detail}</p><small>{event.actor === 'Reviewer' ? <><UserRound size={11} /> Reviewer</> : <><Sparkles size={11} /> System</>}</small></div></div>)}</div></section>

          <section className="detail-section source-list"><div className="section-title"><span><FileText size={15} /> Source messages</span><small>{selectedMessages.length}</small></div>{selectedMessages.map((source) => <a className="source-row" href={source.originalUrl} target="_blank" rel="noreferrer" key={source.id}><Mail size={14} /><span><b>{source.subject}</b><small>{source.sender} · {formatDateTime(source.receivedAt)}</small></span><ArrowLeft size={13} /></a>)}</section>
        </aside>
      </div>

      {message && <div className="notice" role="status"><CheckCircle2 size={16} /><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    </div>
  )
}

export default App
