import { Link } from 'react-router-dom'

const STATUS_STYLES = {
  approved: 'bg-green-50 text-green-700 border-green-200',
  under_review: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  needs_revision: 'bg-red-50 text-red-700 border-red-200',
  unreviewed: 'bg-gray-50 text-gray-500 border-gray-200',
}

const STATUS_LABELS = {
  approved: 'Approved',
  under_review: 'Under Review',
  needs_revision: 'Needs Revision',
  unreviewed: 'Unreviewed',
}

export default function AssignmentCard({ assignment }) {
  const {
    id,
    title,
    description,
    subject_area,
    course_level,
    tags = [],
    download_count,
    review_status = 'unreviewed',
    conformance_score,
    difficulty_level,
  } = assignment

  return (
    <Link
      to={`/assignments/${id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-300 transition-all p-5 group"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-brand-700 leading-tight flex-1">
          {title}
        </h3>
        <span className={`shrink-0 text-xs border rounded px-2 py-0.5 font-medium ${STATUS_STYLES[review_status] || STATUS_STYLES.unreviewed}`}>
          {STATUS_LABELS[review_status] || review_status}
        </span>
      </div>

      {description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(tags || []).map((tag) => (
          <span key={tag} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span>{subject_area || 'Public Administration'}</span>
          {difficulty_level && (
            <>
              <span>·</span>
              <span className="capitalize">{difficulty_level}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {conformance_score != null && (
            <span className={`font-medium ${conformance_score >= 0.7 ? 'text-green-600' : conformance_score >= 0.4 ? 'text-yellow-600' : 'text-red-500'}`}>
              {Math.round(conformance_score * 100)}%
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {download_count ?? 0}
          </span>
        </div>
      </div>
    </Link>
  )
}
