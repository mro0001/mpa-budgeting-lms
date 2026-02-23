import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDashboardStats, getTopAssignments, getRecentFeedback, getTagCloud } from '../lib/api'

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: topAssignments = [] } = useQuery({
    queryKey: ['top-assignments'],
    queryFn: () => getTopAssignments(5),
  })

  const { data: recentFeedback = [] } = useQuery({
    queryKey: ['recent-feedback'],
    queryFn: () => getRecentFeedback(8),
  })

  const { data: tagCloud = [] } = useQuery({
    queryKey: ['tag-cloud'],
    queryFn: getTagCloud,
  })

  const maxCount = tagCloud[0]?.count || 1

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Published Assignments" value={stats?.total_assignments} icon="📚" />
        <StatCard label="Total Downloads" value={stats?.total_downloads} icon="⬇️" />
        <StatCard label="Feedback Comments" value={stats?.total_feedback} icon="💬" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top assignments */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Most Downloaded
          </h2>
          <div className="space-y-2">
            {topAssignments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No assignments yet.</p>
            ) : (
              topAssignments.map((a, i) => (
                <Link
                  key={a.id}
                  to={`/assignments/${a.id}`}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-brand-300 transition-colors"
                >
                  <span className="text-lg font-bold text-gray-300 w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.subject_area || 'General'}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {a.download_count} ↓
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent feedback */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Recent Feedback
          </h2>
          <div className="space-y-2">
            {recentFeedback.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No feedback yet.</p>
            ) : (
              recentFeedback.map((f) => (
                <Link
                  key={f.id}
                  to={`/assignments/${f.assignment_id}#discuss`}
                  className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-brand-300 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">{f.author}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      f.role === 'professor' ? 'bg-brand-50 text-brand-600' :
                      f.role === 'expert' ? 'bg-purple-50 text-purple-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {f.role}
                    </span>
                    <span className="ml-auto text-xs text-gray-300">
                      {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{f.content}</p>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Tag cloud */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Topic Cloud
          </h2>
          {tagCloud.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No tags yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tagCloud.map(({ tag, count }) => {
                const size = 0.7 + (count / maxCount) * 0.8
                return (
                  <span
                    key={tag}
                    style={{ fontSize: `${size}rem` }}
                    className="bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-2.5 py-0.5 cursor-default"
                    title={`${count} assignment${count !== 1 ? 's' : ''}`}
                  >
                    {tag}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
