import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFeedback, createFeedback, getFeedbackThemes, deleteFeedback } from '../lib/api'

const ROLES = ['professor', 'expert', 'student']

function Comment({ comment, assignmentId, onReply }) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: () => deleteFeedback(assignmentId, comment.id),
    onSuccess: () => queryClient.invalidateQueries(['feedback', assignmentId]),
  })

  return (
    <div className={`${comment.parent_id ? 'ml-6 border-l-2 border-brand-100 pl-4' : ''}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">{comment.author}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              comment.role === 'professor' ? 'bg-brand-50 text-brand-700' :
              comment.role === 'expert' ? 'bg-purple-50 text-purple-700' :
              'bg-green-50 text-green-700'
            }`}>
              {comment.role}
            </span>
            {comment.is_review && (
              <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded-full">
                Review
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{new Date(comment.created_at).toLocaleDateString()}</span>
            <button
              onClick={() => onReply(comment)}
              className="hover:text-brand-600"
            >
              Reply
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              className="hover:text-red-500"
            >
              ×
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
      </div>
    </div>
  )
}

export default function FeedbackThread({ assignmentId, assignmentTitle }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ author: '', role: 'professor', content: '', is_review: false })
  const [replyTo, setReplyTo] = useState(null)
  const [showThemes, setShowThemes] = useState(false)
  const [themesData, setThemesData] = useState(null)
  const [themesLoading, setThemesLoading] = useState(false)

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['feedback', assignmentId],
    queryFn: () => getFeedback(assignmentId),
  })

  const addMutation = useMutation({
    mutationFn: (data) => createFeedback(assignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['feedback', assignmentId])
      setForm({ author: '', role: 'professor', content: '', is_review: false })
      setReplyTo(null)
    },
  })

  // Build threaded structure: top-level comments with nested replies
  const topLevel = comments.filter((c) => !c.parent_id)
  const replies = comments.filter((c) => c.parent_id)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.content.trim()) return
    addMutation.mutate({
      ...form,
      parent_id: replyTo?.id ?? null,
    })
  }

  const handleAnalyzeThemes = async () => {
    setThemesLoading(true)
    setShowThemes(true)
    try {
      const data = await getFeedbackThemes(assignmentId)
      setThemesData(data)
    } catch (e) {
      setThemesData({ summary: 'AI analysis unavailable.' })
    } finally {
      setThemesLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* AI Theme Analysis */}
      <div>
        <button
          onClick={handleAnalyzeThemes}
          disabled={themesLoading || comments.length === 0}
          className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-3 py-1.5 hover:bg-purple-100 disabled:opacity-50 transition-colors"
        >
          {themesLoading ? 'Analyzing…' : '✦ AI: Summarize Feedback Themes'}
        </button>
        {showThemes && themesData && (
          <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-900">
            <p className="font-medium text-xs text-purple-500 mb-1">
              AI Analysis ({themesData.comment_count ?? comments.length} comments)
            </p>
            <p>{themesData.summary}</p>
          </div>
        )}
      </div>

      {/* Comment list */}
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading comments…</p>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No feedback yet. Be the first to comment.</p>
      ) : (
        <div className="space-y-3">
          {topLevel.map((c) => (
            <div key={c.id} className="space-y-2">
              <Comment comment={c} assignmentId={assignmentId} onReply={setReplyTo} />
              {replies
                .filter((r) => r.parent_id === c.id)
                .map((r) => (
                  <Comment key={r.id} comment={r} assignmentId={assignmentId} onReply={setReplyTo} />
                ))}
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
        {replyTo && (
          <div className="flex items-center justify-between text-xs bg-brand-50 text-brand-700 rounded px-2 py-1">
            <span>Replying to {replyTo.author}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="font-bold">×</button>
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Your name"
            value={form.author}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={form.is_review}
              onChange={(e) => setForm((f) => ({ ...f, is_review: e.target.checked }))}
            />
            Formal Review
          </label>
        </div>
        <textarea
          placeholder="Add a comment…"
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white resize-none"
          required
        />
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="bg-brand-600 text-white text-sm font-medium rounded px-4 py-1.5 hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {addMutation.isPending ? 'Posting…' : 'Post Comment'}
        </button>
      </form>
    </div>
  )
}
