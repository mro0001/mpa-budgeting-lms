import { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAssignment, serveUrl, downloadUrl, updateAssignment, deleteAssignment,
  getReviews, createReview, updateReviewStatus,
  getConnections, getAssignments, createConnection, deleteConnection,
  getStandards, checkConformance,
  getPresentationHistory,
} from '../lib/api'
import PresentationEditor from '../components/PresentationEditor'
import FeedbackThread from '../components/FeedbackThread'

const TABS = ['View', 'Customize', 'Discuss', 'Reviews', 'Connections']

const REVIEW_STATUS_STYLES = {
  approved: 'bg-green-100 text-green-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  needs_revision: 'bg-red-100 text-red-800',
  unreviewed: 'bg-gray-100 text-gray-600',
}

export default function AssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('View')
  const [editingSubstance, setEditingSubstance] = useState(false)
  const iframeRef = useRef(null)
  const queryClient = useQueryClient()

  const { data: assignment, isLoading, error } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => getAssignment(id),
  })

  const substanceMutation = useMutation({
    mutationFn: (data) => updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assignment', id])
      setEditingSubstance(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAssignment(id),
    onSuccess: () => navigate('/'),
  })

  const refreshIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = serveUrl(id) + '?t=' + Date.now()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-100 rounded animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">Assignment not found.</p>
        <Link to="/" className="text-brand-600 text-sm hover:underline mt-2 inline-block">Back to catalog</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-xs text-brand-600 hover:underline">Back to catalog</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{assignment.title}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full font-medium ${REVIEW_STATUS_STYLES[assignment.review_status] || REVIEW_STATUS_STYLES.unreviewed}`}>
              {(assignment.review_status || 'unreviewed').replace('_', ' ')}
            </span>
            {assignment.conformance_score != null && (
              <span className={`font-medium ${assignment.conformance_score >= 0.7 ? 'text-green-600' : 'text-yellow-600'}`}>
                Conformance: {Math.round(assignment.conformance_score * 100)}%
              </span>
            )}
            {assignment.subject_area && <span>· {assignment.subject_area}</span>}
            {assignment.difficulty_level && <span>· <span className="capitalize">{assignment.difficulty_level}</span></span>}
            {assignment.estimated_time && <span>· {assignment.estimated_time}</span>}
            <span>· {assignment.download_count ?? 0} downloads</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={downloadUrl(id)}
            download
            className="bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-brand-700 transition-colors"
          >
            Download Original
          </a>
          <button
            onClick={() => { if (confirm('Delete this assignment?')) deleteMutation.mutate() }}
            className="text-sm text-red-500 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tags */}
      {(assignment.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assignment.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">{tag}</span>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* iframe */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
            <iframe
              ref={iframeRef}
              src={serveUrl(id)}
              title={assignment.title}
              className="w-full h-[70vh]"
              sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:w-96 shrink-0">
          <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap text-sm py-2 px-3 font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="max-h-[65vh] overflow-y-auto pr-1">
            {tab === 'View' && (
              <ViewTab
                assignment={assignment}
                editing={editingSubstance}
                setEditing={setEditingSubstance}
                onSave={(data) => substanceMutation.mutate(data)}
                isSaving={substanceMutation.isPending}
              />
            )}
            {tab === 'Customize' && (
              <CustomizeTab assignment={assignment} onUpdate={refreshIframe} assignmentId={id} />
            )}
            {tab === 'Discuss' && (
              <FeedbackThread assignmentId={parseInt(id)} assignmentTitle={assignment.title} />
            )}
            {tab === 'Reviews' && (
              <ReviewsTab assignmentId={parseInt(id)} />
            )}
            {tab === 'Connections' && (
              <ConnectionsTab assignmentId={parseInt(id)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ── View Tab ──────────────────────────────────────────────────────────────────

function ViewTab({ assignment, editing, setEditing, onSave, isSaving }) {
  return (
    <div className="space-y-4">
      {editing ? (
        <SubstanceEditor assignment={assignment} onSave={onSave} onCancel={() => setEditing(false)} isSaving={isSaving} />
      ) : (
        <>
          <MetadataSection title="Description" content={assignment.description} />
          <MetadataSection title="Learning Objectives" content={assignment.learning_objectives} />
          <MetadataSection title="Prerequisites" content={assignment.prerequisites} />
          <MetadataSection title="Assessment Criteria" content={assignment.assessment_criteria} />
          <MetadataSection title="Tools Required" content={assignment.tools_required} />
          <MetadataSection title="Instructor Notes" content={assignment.substance_notes} />
          <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:underline">
            Edit metadata
          </button>
        </>
      )}
      {assignment.github_url && (
        <a href={assignment.github_url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-brand-600 hover:underline block">
          View source on GitHub
        </a>
      )}
    </div>
  )
}

function MetadataSection({ title, content }) {
  if (!content) return null
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
    </div>
  )
}

function SubstanceEditor({ assignment, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    description: assignment.description || '',
    learning_objectives: assignment.learning_objectives || '',
    substance_notes: assignment.substance_notes || '',
    subject_area: assignment.subject_area || '',
    course_level: assignment.course_level || '',
    prerequisites: assignment.prerequisites || '',
    estimated_time: assignment.estimated_time || '',
    difficulty_level: assignment.difficulty_level || '',
    assessment_criteria: assignment.assessment_criteria || '',
    tools_required: assignment.tools_required || '',
  })

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        These fields describe the assignment content but never modify the HTML file.
      </p>
      {[
        { key: 'description', label: 'Description', rows: 3 },
        { key: 'learning_objectives', label: 'Learning Objectives', rows: 3 },
        { key: 'prerequisites', label: 'Prerequisites', rows: 2 },
        { key: 'assessment_criteria', label: 'Assessment Criteria', rows: 2 },
        { key: 'tools_required', label: 'Tools Required', rows: 1 },
        { key: 'estimated_time', label: 'Estimated Time (e.g. 90 minutes)', rows: 1 },
        { key: 'difficulty_level', label: 'Difficulty Level', rows: 1, hint: 'introductory / intermediate / advanced' },
        { key: 'substance_notes', label: 'Instructor Notes', rows: 2 },
        { key: 'subject_area', label: 'Subject Area', rows: 1 },
        { key: 'course_level', label: 'Course Level', rows: 1, hint: 'undergraduate / graduate' },
      ].map(({ key, label, rows, hint }) => (
        <label key={key} className="block">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          {hint && <span className="text-xs text-gray-400 ml-1">({hint})</span>}
          <textarea
            rows={rows}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="mt-1 block w-full text-sm border border-gray-200 rounded px-2 py-1.5 resize-none"
          />
        </label>
      ))}
      <div className="flex gap-2">
        <button onClick={() => onSave(form)} disabled={isSaving}
          className="bg-brand-600 text-white text-xs rounded px-3 py-1.5 hover:bg-brand-700 disabled:opacity-50">
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
      </div>
    </div>
  )
}


// ── Customize Tab ─────────────────────────────────────────────────────────────

function CustomizeTab({ assignment, onUpdate, assignmentId }) {
  const [showHistory, setShowHistory] = useState(false)
  const { data: history = [] } = useQuery({
    queryKey: ['presentation-history', assignmentId],
    queryFn: () => getPresentationHistory(assignmentId),
    enabled: showHistory,
  })

  return (
    <div className="space-y-4">
      <PresentationEditor assignment={assignment} onUpdate={onUpdate} />
      <div>
        <button onClick={() => setShowHistory(!showHistory)} className="text-xs text-brand-600 hover:underline">
          {showHistory ? 'Hide history' : 'Show change history'}
        </button>
        {showHistory && history.length > 0 && (
          <div className="mt-2 space-y-1">
            {history.map((v) => (
              <div key={v.id} className="text-xs text-gray-500 border-l-2 border-gray-200 pl-2">
                <span className="font-medium">{v.changed_by}</span> — {v.description || 'Updated'}{' '}
                <span className="text-gray-400">{new Date(v.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


// ── Reviews Tab ───────────────────────────────────────────────────────────────

function ReviewsTab({ assignmentId }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    reviewer: '', reviewer_role: 'expert', overall_rating: 3,
    strengths: '', weaknesses: '', suggested_changes: '',
  })

  // Conformance check state
  const [selectedStandard, setSelectedStandard] = useState('')
  const [conformanceReport, setConformanceReport] = useState(null)

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', assignmentId],
    queryFn: () => getReviews(assignmentId),
  })

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: getStandards,
  })

  const createMutation = useMutation({
    mutationFn: (data) => createReview(assignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', assignmentId])
      queryClient.invalidateQueries(['assignment', String(assignmentId)])
      setShowForm(false)
      setForm({ reviewer: '', reviewer_role: 'expert', overall_rating: 3, strengths: '', weaknesses: '', suggested_changes: '' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ reviewId, status }) => updateReviewStatus(reviewId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', assignmentId])
      queryClient.invalidateQueries(['assignment', String(assignmentId)])
    },
  })

  const conformanceMutation = useMutation({
    mutationFn: () => checkConformance(parseInt(selectedStandard), assignmentId),
    onSuccess: (data) => {
      setConformanceReport(data)
      queryClient.invalidateQueries(['assignment', String(assignmentId)])
    },
  })

  return (
    <div className="space-y-4">
      {/* Conformance check */}
      <div className="border border-purple-200 bg-purple-50 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-purple-700 mb-2">AI Conformance Check</h3>
        <div className="flex gap-2">
          <select
            value={selectedStandard}
            onChange={(e) => setSelectedStandard(e.target.value)}
            className="flex-1 text-xs border border-purple-200 rounded px-2 py-1.5 bg-white"
          >
            <option value="">Select standard...</option>
            {standards.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            onClick={() => conformanceMutation.mutate()}
            disabled={conformanceMutation.isPending || !selectedStandard}
            className="text-xs bg-purple-600 text-white rounded px-3 py-1.5 hover:bg-purple-700 disabled:opacity-50"
          >
            {conformanceMutation.isPending ? 'Checking...' : 'Check'}
          </button>
        </div>
        {conformanceReport && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-purple-800">
                {Math.round(conformanceReport.overall_score * 100)}%
              </span>
              <span className="text-xs text-purple-600">conformance score</span>
            </div>
            {conformanceReport.ai_analysis && (
              <p className="text-xs text-purple-800">{conformanceReport.ai_analysis}</p>
            )}
            {conformanceReport.missing_criteria.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-600 mt-1">Missing:</p>
                <ul className="text-xs text-red-700 list-disc list-inside">
                  {conformanceReport.missing_criteria.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {conformanceReport.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-purple-600 mt-1">Recommendations:</p>
                <ul className="text-xs text-purple-700 list-disc list-inside">
                  {conformanceReport.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review list */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Expert Reviews ({reviews.length})
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-brand-600 hover:underline">
          {showForm ? 'Cancel' : '+ Add Review'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }}
          className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
          <div className="flex gap-2">
            <input type="text" placeholder="Your name" value={form.reviewer} required
              onChange={(e) => setForm(f => ({...f, reviewer: e.target.value}))}
              className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 bg-white" />
            <select value={form.reviewer_role}
              onChange={(e) => setForm(f => ({...f, reviewer_role: e.target.value}))}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
              <option value="professor">Professor</option>
              <option value="expert">Expert</option>
              <option value="practitioner">Practitioner</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            Rating:
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" onClick={() => setForm(f => ({...f, overall_rating: n}))}
                className={`w-7 h-7 rounded-full border text-xs font-medium ${
                  form.overall_rating >= n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-400 border-gray-200'
                }`}>
                {n}
              </button>
            ))}
          </label>
          <textarea rows={2} placeholder="Strengths..." value={form.strengths}
            onChange={(e) => setForm(f => ({...f, strengths: e.target.value}))}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white resize-none" />
          <textarea rows={2} placeholder="Weaknesses / areas for improvement..." value={form.weaknesses}
            onChange={(e) => setForm(f => ({...f, weaknesses: e.target.value}))}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white resize-none" />
          <textarea rows={2} placeholder="Suggested changes..." value={form.suggested_changes}
            onChange={(e) => setForm(f => ({...f, suggested_changes: e.target.value}))}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white resize-none" />
          <button type="submit" disabled={createMutation.isPending}
            className="bg-brand-600 text-white text-xs rounded px-3 py-1.5 hover:bg-brand-700 disabled:opacity-50">
            {createMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.reviewer}</span>
                  <span className="text-xs bg-purple-50 text-purple-700 rounded-full px-1.5 py-0.5">
                    {r.reviewer_role}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    r.status === 'approved' ? 'bg-green-50 text-green-700' :
                    r.status === 'needs_revision' ? 'bg-red-50 text-red-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`w-2 h-2 rounded-full ${n <= (r.overall_rating || 0) ? 'bg-brand-500' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              {r.strengths && <p className="text-xs text-green-700 mt-1"><b>Strengths:</b> {r.strengths}</p>}
              {r.weaknesses && <p className="text-xs text-red-700 mt-1"><b>Weaknesses:</b> {r.weaknesses}</p>}
              {r.suggested_changes && <p className="text-xs text-gray-700 mt-1"><b>Suggestions:</b> {r.suggested_changes}</p>}
              {r.status === 'submitted' && (
                <button onClick={() => statusMutation.mutate({ reviewId: r.id, status: 'under_review' })}
                  className="mt-2 text-xs text-brand-600 hover:underline">
                  Begin review
                </button>
              )}
              {r.status === 'under_review' && (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => statusMutation.mutate({ reviewId: r.id, status: 'approved' })}
                    className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700">Approve</button>
                  <button onClick={() => statusMutation.mutate({ reviewId: r.id, status: 'needs_revision' })}
                    className="text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700">Needs Revision</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ── Connections Tab ───────────────────────────────────────────────────────────

function ConnectionsTab({ assignmentId }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ to_assignment_id: '', connection_type: 'prerequisite', description: '' })

  const { data: connections = [] } = useQuery({
    queryKey: ['connections', assignmentId],
    queryFn: () => getConnections(assignmentId),
  })

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => getAssignments({ published_only: true }),
  })

  const createMutation = useMutation({
    mutationFn: () => createConnection({
      from_assignment_id: assignmentId,
      to_assignment_id: parseInt(form.to_assignment_id),
      connection_type: form.connection_type,
      description: form.description || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['connections', assignmentId])
      setShowForm(false)
      setForm({ to_assignment_id: '', connection_type: 'prerequisite', description: '' })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (connId) => deleteConnection(connId),
    onSuccess: () => queryClient.invalidateQueries(['connections', assignmentId]),
  })

  const TYPE_LABELS = { prerequisite: 'Prerequisite', recommended: 'Recommended Next', related: 'Related' }
  const TYPE_COLORS = {
    prerequisite: 'bg-orange-50 text-orange-700 border-orange-200',
    recommended: 'bg-green-50 text-green-700 border-green-200',
    related: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  const otherAssignments = allAssignments.filter(a => a.id !== assignmentId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Connections ({connections.length})
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-brand-600 hover:underline">
          {showForm ? 'Cancel' : '+ Add Connection'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}
          className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
          <select value={form.to_assignment_id} required
            onChange={(e) => setForm(f => ({...f, to_assignment_id: e.target.value}))}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
            <option value="">Select assignment...</option>
            {otherAssignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <select value={form.connection_type}
            onChange={(e) => setForm(f => ({...f, connection_type: e.target.value}))}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
            <option value="prerequisite">Prerequisite (must complete first)</option>
            <option value="recommended">Recommended Next</option>
            <option value="related">Related Topic</option>
          </select>
          <input type="text" placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm(f => ({...f, description: e.target.value}))}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white" />
          <button type="submit" disabled={createMutation.isPending || !form.to_assignment_id}
            className="bg-brand-600 text-white text-xs rounded px-3 py-1.5 hover:bg-brand-700 disabled:opacity-50">
            Add Connection
          </button>
          {createMutation.isError && (
            <p className="text-xs text-red-600">{createMutation.error?.response?.data?.detail || 'Failed'}</p>
          )}
        </form>
      )}

      {connections.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No connections yet. Link this to other assignments in the curriculum.</p>
      ) : (
        <div className="space-y-2">
          {connections.map((c) => {
            const isFrom = c.from_assignment_id === assignmentId
            const otherId = isFrom ? c.to_assignment_id : c.from_assignment_id
            const otherTitle = allAssignments.find(a => a.id === otherId)?.title || `Assignment #${otherId}`
            return (
              <div key={c.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2">
                <span className={`text-xs border rounded-full px-2 py-0.5 ${TYPE_COLORS[c.connection_type]}`}>
                  {isFrom ? TYPE_LABELS[c.connection_type] : 'Required by'}
                </span>
                <Link to={`/assignments/${otherId}`} className="flex-1 text-sm text-brand-600 hover:underline truncate">
                  {otherTitle}
                </Link>
                <button onClick={() => deleteMut.mutate(c.id)} className="text-xs text-gray-400 hover:text-red-500">x</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
