import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAssignment, serveUrl, downloadUrl, updateAssignment } from '../lib/api'
import PresentationEditor from '../components/PresentationEditor'
import FeedbackThread from '../components/FeedbackThread'

const TABS = ['View', 'Customize', 'Discuss']

export default function AssignmentDetail() {
  const { id } = useParams()
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

  // Reload iframe after presentation update
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
        <Link to="/" className="text-brand-600 text-sm hover:underline mt-2 inline-block">
          ← Back to catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-xs text-brand-600 hover:underline">← Catalog</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{assignment.title}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            {assignment.subject_area && <span>{assignment.subject_area}</span>}
            {assignment.course_level && (
              <>
                <span>·</span>
                <span className="capitalize">{assignment.course_level}</span>
              </>
            )}
            <span>·</span>
            <span>{assignment.download_count ?? 0} downloads</span>
          </div>
        </div>
        <a
          href={downloadUrl(id)}
          download
          className="shrink-0 bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-brand-700 transition-colors"
        >
          Download Original
        </a>
      </div>

      {/* Tags */}
      {(assignment.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assignment.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Main layout: iframe left + panel right */}
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
        <div className="lg:w-80 shrink-0">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 mb-4">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-sm py-2 font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'View' && (
            <div className="space-y-4">
              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </h3>
                {editingSubstance ? (
                  <SubstanceEditor
                    assignment={assignment}
                    onSave={(data) => substanceMutation.mutate(data)}
                    onCancel={() => setEditingSubstance(false)}
                    isSaving={substanceMutation.isPending}
                  />
                ) : (
                  <div>
                    <p className="text-sm text-gray-700">
                      {assignment.description || <span className="italic text-gray-400">No description yet.</span>}
                    </p>
                    <button
                      onClick={() => setEditingSubstance(true)}
                      className="mt-2 text-xs text-brand-600 hover:underline"
                    >
                      Edit metadata
                    </button>
                  </div>
                )}
              </div>

              {/* Learning objectives */}
              {assignment.learning_objectives && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Learning Objectives
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {assignment.learning_objectives}
                  </p>
                </div>
              )}

              {/* Substance notes */}
              {assignment.substance_notes && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Instructor Notes
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {assignment.substance_notes}
                  </p>
                </div>
              )}

              {assignment.github_url && (
                <a
                  href={assignment.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline block"
                >
                  View source on GitHub →
                </a>
              )}
            </div>
          )}

          {tab === 'Customize' && (
            <PresentationEditor assignment={assignment} onUpdate={refreshIframe} />
          )}

          {tab === 'Discuss' && (
            <FeedbackThread assignmentId={parseInt(id)} assignmentTitle={assignment.title} />
          )}
        </div>
      </div>
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
  })

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        These fields describe the assignment content but never modify the HTML file.
      </p>
      {[
        { key: 'description', label: 'Description', rows: 3 },
        { key: 'learning_objectives', label: 'Learning Objectives', rows: 3 },
        { key: 'substance_notes', label: 'Instructor Notes', rows: 2 },
        { key: 'subject_area', label: 'Subject Area', rows: 1 },
        { key: 'course_level', label: 'Course Level', rows: 1 },
      ].map(({ key, label, rows }) => (
        <label key={key} className="block">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          <textarea
            rows={rows}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="mt-1 block w-full text-sm border border-gray-200 rounded px-2 py-1.5 resize-none"
          />
        </label>
      ))}
      <div className="flex gap-2">
        <button
          onClick={() => onSave(form)}
          disabled={isSaving}
          className="bg-brand-600 text-white text-xs rounded px-3 py-1.5 hover:bg-brand-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">
          Cancel
        </button>
      </div>
    </div>
  )
}
