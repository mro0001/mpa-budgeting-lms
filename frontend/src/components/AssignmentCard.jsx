import { Link } from 'react-router-dom'

export default function AssignmentCard({ assignment }) {
  const {
    id,
    title,
    description,
    subject_area,
    course_level,
    tags = [],
    download_count,
    created_by,
  } = assignment

  return (
    <Link
      to={`/assignments/${id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-300 transition-all p-5 group"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-brand-700 leading-tight">
          {title}
        </h3>
        <span className="shrink-0 text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded px-2 py-0.5 font-medium">
          {course_level || 'Graduate'}
        </span>
      </div>

      {description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(tags || []).map((tag) => (
          <span
            key={tag}
            className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>{subject_area || 'Public Administration'}</span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {download_count ?? 0}
        </span>
      </div>
    </Link>
  )
}
