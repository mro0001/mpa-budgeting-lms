import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updatePresentation } from '../lib/api'

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
]

export default function PresentationEditor({ assignment, onUpdate }) {
  const current = assignment.presentation_config || {}
  const [form, setForm] = useState({
    primary_color: current.primary_color || '#1a56db',
    accent_color: current.accent_color || '#ff5a1f',
    font_family: current.font_family || 'Inter, sans-serif',
    logo_url: current.logo_url || '',
    header_text: current.header_text || '',
  })
  const [saved, setSaved] = useState(false)

  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data) => updatePresentation(assignment.id, { ...data, changed_by: 'professor' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['assignment', assignment.id])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onUpdate?.()
    },
  })

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Visual changes apply when viewing in the browser. The downloadable file is always the original, unmodified version.
      </p>

      {/* Color pickers */}
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Primary Color</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => handleChange('primary_color', e.target.value)}
              className="h-8 w-14 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={form.primary_color}
              onChange={(e) => handleChange('primary_color', e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-600">Accent Color</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) => handleChange('accent_color', e.target.value)}
              className="h-8 w-14 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={form.accent_color}
              onChange={(e) => handleChange('accent_color', e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
            />
          </div>
        </label>
      </div>

      {/* Font family */}
      <label className="block">
        <span className="text-xs font-medium text-gray-600">Font Family</span>
        <select
          value={form.font_family}
          onChange={(e) => handleChange('font_family', e.target.value)}
          className="mt-1 block w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
        >
          {FONT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      {/* Header banner */}
      <label className="block">
        <span className="text-xs font-medium text-gray-600">Header Text (optional)</span>
        <input
          type="text"
          value={form.header_text}
          placeholder="e.g. PADM 502 — Fall 2025"
          onChange={(e) => handleChange('header_text', e.target.value)}
          className="mt-1 block w-full text-sm border border-gray-200 rounded px-2 py-1.5"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-600">Logo URL (optional)</span>
        <input
          type="url"
          value={form.logo_url}
          placeholder="https://..."
          onChange={(e) => handleChange('logo_url', e.target.value)}
          className="mt-1 block w-full text-sm border border-gray-200 rounded px-2 py-1.5"
        />
      </label>

      <button
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending}
        className="w-full bg-brand-600 text-white text-sm font-medium rounded px-4 py-2 hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Apply Changes'}
      </button>

      {mutation.isError && (
        <p className="text-xs text-red-600">Failed to save. Please try again.</p>
      )}
    </div>
  )
}
