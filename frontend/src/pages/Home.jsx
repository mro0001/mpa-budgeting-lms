import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAssignments } from '../lib/api'
import AssignmentCard from '../components/AssignmentCard'
import { Link } from 'react-router-dom'

const SUBJECTS = ['All', 'Budget & Finance', 'Revenue Forecasting', 'Capital Planning', 'Debt Management']
const LEVELS = ['All', 'undergraduate', 'graduate']

export default function Home() {
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All')
  const [level, setLevel] = useState('All')

  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ['assignments', { search, subject, level }],
    queryFn: () =>
      getAssignments({
        search: search || undefined,
        subject_area: subject !== 'All' ? subject : undefined,
        course_level: level !== 'All' ? level : undefined,
      }),
  })

  return (
    <div>
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assignment Catalog</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse, preview, and customize local government budgeting assignments for your MPA courses.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search assignments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-brand-400"
        />
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
        >
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
        >
          {LEVELS.map((l) => <option key={l}>{l === 'All' ? 'All Levels' : l}</option>)}
        </select>
        <Link
          to="/submit"
          className="bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-brand-700 transition-colors whitespace-nowrap"
        >
          + Import
        </Link>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">Failed to load assignments. Is the backend running?</p>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No assignments found.</p>
          <p className="text-sm mt-1">
            <Link to="/submit" className="text-brand-600 hover:underline">Import one from GitHub</Link> to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  )
}
