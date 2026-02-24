import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getStandards, getAssignments, generateAgentPrompt } from '../lib/api'

export default function AgentPrompt() {
  const [standardId, setStandardId] = useState('')
  const [refAssignmentId, setRefAssignmentId] = useState('')
  const [sourceDescription, setSourceDescription] = useState('')
  const [sourceHtml, setSourceHtml] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState(null)
  const [copied, setCopied] = useState(false)

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: getStandards,
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => getAssignments({ published_only: true }),
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      generateAgentPrompt(parseInt(standardId), {
        source_description: sourceDescription,
        source_html_snippet: sourceHtml,
        reference_assignment_id: refAssignmentId ? parseInt(refAssignmentId) : null,
      }),
    onSuccess: (data) => setGeneratedPrompt(data.generated_prompt),
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Assignment Agent</h1>
      <p className="text-sm text-gray-500 mb-6">
        Describe your source material and select a standard. The AI will generate a detailed,
        copy-pasteable prompt you can hand to any coding assistant (Claude, Cursor, Copilot)
        to build a conforming interactive assignment.
      </p>

      <div className="space-y-5 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {/* Standard selection */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Target Standard *</span>
          <select
            value={standardId}
            onChange={(e) => setStandardId(e.target.value)}
            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-400"
            required
          >
            <option value="">Select a standard...</option>
            {standards.map((s) => (
              <option key={s.id} value={s.id}>{s.name} (v{s.version})</option>
            ))}
          </select>
          {standards.length === 0 && (
            <p className="mt-1 text-xs text-yellow-600">
              No standards defined yet. Create one on the Standards page first.
            </p>
          )}
        </label>

        {/* Reference assignment (optional) */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Reference Assignment (optional)</span>
          <select
            value={refAssignmentId}
            onChange={(e) => setRefAssignmentId(e.target.value)}
            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-400"
          >
            <option value="">None — generate from standard only</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            If selected, the AI will use this assignment's HTML structure as a concrete template.
          </p>
        </label>

        {/* Source description */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Describe Your Source Material *
          </span>
          <textarea
            rows={4}
            value={sourceDescription}
            onChange={(e) => setSourceDescription(e.target.value)}
            placeholder={"Example: I have a dataset of 10 years of property tax assessments for Ada County, Idaho. Students should learn to calculate millage rates, compare assessed vs. market values, and forecast future revenue under different growth scenarios. The exercise uses Excel."}
            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-400"
            required
          />
        </label>

        {/* Optional HTML snippet */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Source HTML Snippet (optional)
          </span>
          <textarea
            rows={4}
            value={sourceHtml}
            onChange={(e) => setSourceHtml(e.target.value)}
            placeholder="Paste any existing HTML content you want the agent to incorporate..."
            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none font-mono text-xs focus:outline-none focus:border-brand-400"
          />
        </label>

        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || !standardId || !sourceDescription}
          className="w-full bg-brand-600 text-white font-medium rounded-lg px-4 py-2.5 hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {generateMutation.isPending ? 'Generating Prompt...' : 'Generate Agent Prompt'}
        </button>

        {generateMutation.isError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            <p className="font-medium">Generation failed</p>
            <p className="text-xs mt-0.5">
              {generateMutation.error?.response?.data?.detail || 'AI service unavailable'}
            </p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="mt-6 bg-purple-50 border border-purple-100 rounded-lg p-4 text-xs text-purple-800 space-y-1">
        <p className="font-semibold">How this works:</p>
        <ul className="list-disc list-inside space-y-0.5 text-purple-700">
          <li>You describe your raw educational content (data, topic, learning goals)</li>
          <li>The AI combines your material with the standard's structural requirements</li>
          <li>It generates a detailed prompt that any AI coding assistant can follow</li>
          <li>Paste the prompt into Claude, Cursor, or Copilot to build the assignment</li>
          <li>Upload the result back here and run a conformance check</li>
        </ul>
      </div>

      {/* Generated prompt output */}
      {generatedPrompt && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Generated Prompt</h2>
            <button
              onClick={handleCopy}
              className="text-xs bg-brand-600 text-white rounded px-3 py-1.5 hover:bg-brand-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <div className="bg-gray-900 text-gray-100 rounded-xl p-5 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
            {generatedPrompt}
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            Paste this prompt into Claude, Cursor, or any AI coding assistant to generate your assignment.
          </p>
        </div>
      )}
    </div>
  )
}
