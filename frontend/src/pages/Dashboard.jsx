import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  getDashboardStats, getQualityMetrics, getTopAssignments,
  getRecentFeedback, getPendingReviews, getTagCloud,
} from '../lib/api'

function StatCard({ label, value, detail }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-2xl font-bold text-gray-900">{value ?? '--'}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {detail && <p className="text-xs text-gray-400 mt-1">{detail}</p>}
    </div>
  )
}

function ProgressBar({ label, value, max, color = 'brand' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const colors = {
    brand: 'bg-brand-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{value}/{max} ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats })
  const { data: quality } = useQuery({ queryKey: ['quality-metrics'], queryFn: getQualityMetrics })
  const { data: topAssignments = [] } = useQuery({ queryKey: ['top-assignments'], queryFn: () => getTopAssignments(5) })
  const { data: recentFeedback = [] } = useQuery({ queryKey: ['recent-feedback'], queryFn: () => getRecentFeedback(8) })
  const { data: pendingReviews = [] } = useQuery({ queryKey: ['pending-reviews'], queryFn: getPendingReviews })
  const { data: tagCloud = [] } = useQuery({ queryKey: ['tag-cloud'], queryFn: getTagCloud })

  const maxCount = tagCloud[0]?.count || 1

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Published Assignments" value={stats?.total_assignments} />
        <StatCard label="Total Downloads" value={stats?.total_downloads} />
        <StatCard label="Feedback Comments" value={stats?.total_feedback} />
        <StatCard label="Expert Reviews" value={stats?.total_reviews} />
        <StatCard label="Active Standards" value={stats?.total_standards} />
      </div>

      {/* Quality metrics */}
      {quality && quality.total > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Quality & Completeness
          </h2>
          <div className="space-y-3">
            <ProgressBar label="With descriptions" value={quality.with_description} max={quality.total} color="brand" />
            <ProgressBar label="With learning objectives" value={quality.with_objectives} max={quality.total} color="green" />
            <ProgressBar label="Reviewed" value={quality.with_reviews} max={quality.total} color="yellow" />
            <ProgressBar label="Conformance checked" value={quality.conformance_checked} max={quality.total} color="brand" />
          </div>
          {quality.avg_conformance_score != null && (
            <p className="mt-3 text-xs text-gray-500">
              Avg conformance score: <span className="font-medium text-gray-700">{Math.round(quality.avg_conformance_score * 100)}%</span>
            </p>
          )}
          {Object.keys(quality.review_status_breakdown).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(quality.review_status_breakdown).map(([status, count]) => (
                <span key={status} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
                  {status.replace('_', ' ')}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending reviews */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Needs Attention ({pendingReviews.length})
          </h2>
          <div className="space-y-2">
            {pendingReviews.length === 0 ? (
              <p className="text-sm text-gray-400 italic">All assignments reviewed.</p>
            ) : (
              pendingReviews.slice(0, 8).map((a) => (
                <Link key={a.id} to={`/assignments/${a.id}`}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3 hover:border-brand-300 transition-colors">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    a.review_status === 'needs_revision' ? 'bg-red-50 text-red-600' :
                    a.review_status === 'under_review' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {a.review_status.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-900 truncate flex-1">{a.title}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top assignments */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Most Downloaded</h2>
          <div className="space-y-2">
            {topAssignments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No assignments yet.</p>
            ) : (
              topAssignments.map((a, i) => (
                <Link key={a.id} to={`/assignments/${a.id}`}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-brand-300 transition-colors">
                  <span className="text-lg font-bold text-gray-300 w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    <div className="flex gap-2 text-xs text-gray-400">
                      {a.subject_area && <span>{a.subject_area}</span>}
                      {a.conformance_score != null && (
                        <span className={a.conformance_score >= 0.7 ? 'text-green-600' : 'text-yellow-600'}>
                          {Math.round(a.conformance_score * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{a.download_count} downloads</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Tag cloud + recent feedback */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Topic Cloud</h2>
            {tagCloud.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No tags yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagCloud.map(({ tag, count }) => {
                  const size = 0.7 + (count / maxCount) * 0.8
                  return (
                    <span key={tag} style={{ fontSize: `${size}rem` }}
                      className="bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-2.5 py-0.5 cursor-default"
                      title={`${count} assignment${count !== 1 ? 's' : ''}`}>
                      {tag}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Recent Feedback</h2>
            {recentFeedback.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No feedback yet.</p>
            ) : (
              <div className="space-y-2">
                {recentFeedback.slice(0, 5).map((f) => (
                  <Link key={f.id} to={`/assignments/${f.assignment_id}`}
                    className="block bg-white border border-gray-200 rounded-lg p-2 hover:border-brand-300 transition-colors">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-medium text-gray-700">{f.author}</span>
                      <span className={`px-1 py-0.5 rounded-full ${
                        f.role === 'professor' ? 'bg-brand-50 text-brand-600' :
                        f.role === 'expert' ? 'bg-purple-50 text-purple-600' :
                        'bg-green-50 text-green-600'
                      }`}>{f.role}</span>
                      <span className="ml-auto text-gray-300">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{f.content}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
