import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStandards, createStandard } from '../lib/api'

const DEFAULT_STANDARD = {
  name: 'Interactive Excel Tutorial v1',
  description: 'Standard based on the excel-revenue-forecasting reference implementation. Assignments must be self-contained single HTML files with sidebar navigation, progressive tasks, verification, and discussion questions.',
  required_sections: [
    'hero/introduction',
    'getting-started',
    'tasks (at least 2)',
    'discussion-questions',
    'answer-key',
  ],
  required_elements: [
    'sidebar-navigation',
    'progress-tracking',
    'downloadable-starter-file',
    'concept-explanation-per-task',
    'worked-example-per-task',
    'step-by-step-instructions',
    'progressive-hints (3 levels)',
    'verification-quick-check',
    'verification-file-upload',
  ],
  recommended_elements: [
    'interactive-chart-or-visualization',
    'error-diagnosis-feedback',
    'responsive-mobile-layout',
    'formula-reference-cards',
    'prediction-calculators',
  ],
  technical_requirements: [
    'self-contained single HTML file',
    'all CSS/JS embedded or from public CDN',
    'no server-side dependencies',
    'works in iframe with sandbox',
  ],
  pedagogical_requirements: [
    'clear learning objectives stated',
    'scaffolded difficulty progression',
    'formative assessment (verification) per task',
    'summative reflection (discussion questions)',
  ],
}

function CriteriaList({ title, items, color = 'gray' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  }
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`text-xs border rounded-full px-2.5 py-0.5 ${colors[color]}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function StandardCard({ standard }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{standard.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">v{standard.version} · by {standard.created_by}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-brand-600 hover:underline"
        >
          {expanded ? 'Collapse' : 'View Criteria'}
        </button>
      </div>
      {standard.description && (
        <p className="text-sm text-gray-600 mt-2">{standard.description}</p>
      )}
      {expanded && (
        <div className="mt-4 space-y-4">
          <CriteriaList title="Required Sections" items={standard.required_sections} color="blue" />
          <CriteriaList title="Required Elements" items={standard.required_elements} color="green" />
          <CriteriaList title="Recommended Elements" items={standard.recommended_elements} color="purple" />
          <CriteriaList title="Technical Requirements" items={standard.technical_requirements} color="orange" />
          <CriteriaList title="Pedagogical Requirements" items={standard.pedagogical_requirements} color="gray" />
        </div>
      )}
    </div>
  )
}

export default function Standards() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: standards = [], isLoading } = useQuery({
    queryKey: ['standards'],
    queryFn: getStandards,
  })

  const createMutation = useMutation({
    mutationFn: (data) => createStandard(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['standards'])
      setShowCreate(false)
    },
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment Standards</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define what a conforming assignment looks like. Standards are used for AI conformance
            checks and as templates for the AI Agent prompt generator.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-brand-700 transition-colors"
        >
          {showCreate ? 'Cancel' : '+ New Standard'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-brand-200 rounded-xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Create from Reference Template</h2>
          <p className="text-xs text-gray-500 mb-4">
            This creates a standard based on the excel-revenue-forecasting reference assignment.
            You can customize the criteria after creation.
          </p>
          <button
            onClick={() => createMutation.mutate(DEFAULT_STANDARD)}
            disabled={createMutation.isPending}
            className="bg-brand-600 text-white text-sm font-medium rounded px-4 py-2 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Reference Standard'}
          </button>
          {createMutation.isError && (
            <p className="text-xs text-red-600 mt-2">Failed to create standard.</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : standards.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No standards defined yet.</p>
          <p className="text-sm mt-1">
            Click "New Standard" above to create your first assignment standard.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {standards.map((s) => <StandardCard key={s.id} standard={s} />)}
        </div>
      )}
    </div>
  )
}
