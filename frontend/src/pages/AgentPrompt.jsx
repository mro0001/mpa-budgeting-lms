import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getStandards, getAssignments, generateAgentPrompt, extractTextFromFile } from '../lib/api'

const MODES = [
  { key: 'create', label: 'Create New' },
  { key: 'convert', label: 'Convert Existing' },
]

const ALLOWED_EXTENSIONS = ['.docx', '.pdf', '.pptx', '.html', '.htm']

export default function AgentPrompt() {
  const [searchParams] = useSearchParams()

  const [mode, setMode] = useState(searchParams.get('mode') === 'convert' ? 'convert' : 'create')
  const [standardId, setStandardId] = useState('')
  const [refAssignmentId, setRefAssignmentId] = useState(searchParams.get('ref') || '')
  const [sourceDescription, setSourceDescription] = useState('')
  const [sourceHtml, setSourceHtml] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState(null)
  const [copied, setCopied] = useState(false)

  // Convert mode state
  const [extractedText, setExtractedText] = useState('')
  const [extractedFilename, setExtractedFilename] = useState('')
  const [extractedFileType, setExtractedFileType] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // Pre-populate ref from URL params
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setRefAssignmentId(ref)
    if (searchParams.get('mode') === 'convert') setMode('convert')
  }, [searchParams])

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: getStandards,
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => getAssignments({ published_only: true }),
  })

  const extractMutation = useMutation({
    mutationFn: (formData) => extractTextFromFile(formData),
    onSuccess: (data) => {
      setExtractedText(data.extracted_text)
      setExtractedFilename(data.filename)
      setExtractedFileType(data.file_type)
    },
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      generateAgentPrompt(parseInt(standardId), {
        source_description: sourceDescription,
        source_html_snippet: mode === 'convert' ? extractedText : sourceHtml,
        reference_assignment_id: refAssignmentId ? parseInt(refAssignmentId) : null,
        mode,
        original_format: mode === 'convert' ? extractedFileType : null,
      }),
    onSuccess: (data) => setGeneratedPrompt(data.generated_prompt),
  })

  const handleFileUpload = useCallback((file) => {
    if (!file) return
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      alert(`Unsupported file type: ${ext}\nAllowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    extractMutation.mutate(formData)
  }, [extractMutation])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
  }, [handleFileUpload])

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Determine which step is active in convert mode
  const convertStep = extractedText ? (standardId ? 3 : 2) : 1

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Assignment Agent</h1>
      <p className="text-sm text-gray-500 mb-6">
        {mode === 'create'
          ? 'Describe your source material and select a standard. The AI will generate a detailed, copy-pasteable prompt you can hand to any coding assistant.'
          : 'Upload an existing document (Word, PDF, PowerPoint, or HTML) and convert it into a conforming interactive assignment.'}
      </p>

      {/* Mode toggle tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setGeneratedPrompt(null) }}
            className={`text-sm py-2 px-4 font-medium border-b-2 transition-colors ${
              mode === m.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Convert mode: step indicators */}
      {mode === 'convert' && (
        <div className="flex items-center gap-2 mb-5 text-xs">
          {[
            { num: 1, label: 'Upload & Extract' },
            { num: 2, label: 'Select Standard' },
            { num: 3, label: 'Generate Prompt' },
          ].map(({ num, label }) => (
            <div key={num} className="flex items-center gap-1.5">
              {num > 1 && <div className={`w-8 h-px ${convertStep >= num ? 'bg-brand-400' : 'bg-gray-200'}`} />}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
                convertStep >= num
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'bg-gray-50 text-gray-400'
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  convertStep >= num ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {num}
                </span>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-5 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">

        {/* ── Convert mode: File upload dropzone ── */}
        {mode === 'convert' && (
          <div>
            <span className="text-sm font-medium text-gray-700 block mb-1">
              Upload Document *
            </span>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-brand-400 bg-brand-50'
                  : extractedText
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
              }`}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = ALLOWED_EXTENSIONS.join(',')
                input.onchange = (e) => handleFileUpload(e.target.files[0])
                input.click()
              }}
            >
              {extractMutation.isPending ? (
                <div className="text-sm text-brand-600">
                  <svg className="animate-spin h-5 w-5 mx-auto mb-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Extracting text...
                </div>
              ) : extractedText ? (
                <div className="text-sm text-green-700">
                  <p className="font-medium">{extractedFilename}</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {extractedText.length.toLocaleString()} characters extracted
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Click or drop to replace</p>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  <p className="font-medium">Drop your file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Supports .docx, .pdf, .pptx, .html (max 20 MB)
                  </p>
                </div>
              )}
            </div>
            {extractMutation.isError && (
              <p className="text-xs text-red-600 mt-1">
                {extractMutation.error?.response?.data?.detail || 'Extraction failed'}
              </p>
            )}
          </div>
        )}

        {/* ── Extracted content preview (convert mode) ── */}
        {mode === 'convert' && extractedText && (
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Extracted Content
            </span>
            <textarea
              rows={6}
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:border-brand-400 bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-400">
              You can edit this text before generating the prompt.
            </p>
          </label>
        )}

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
            {mode === 'convert'
              ? 'Conversion Instructions *'
              : 'Describe Your Source Material *'}
          </span>
          <textarea
            rows={4}
            value={sourceDescription}
            onChange={(e) => setSourceDescription(e.target.value)}
            placeholder={mode === 'convert'
              ? 'Example: Convert this Word document into an interactive assignment. Keep all existing questions and data tables. Add progressive hints for each task and a sidebar with navigation. Students should be able to verify their Excel calculations inline.'
              : 'Example: I have a dataset of 10 years of property tax assessments for Ada County, Idaho. Students should learn to calculate millage rates, compare assessed vs. market values, and forecast future revenue under different growth scenarios. The exercise uses Excel.'}
            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-400"
            required
          />
        </label>

        {/* Optional HTML snippet — only in create mode */}
        {mode === 'create' && (
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
        )}

        <button
          onClick={() => generateMutation.mutate()}
          disabled={
            generateMutation.isPending
            || !standardId
            || !sourceDescription
            || (mode === 'convert' && !extractedText)
          }
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
        <p className="font-semibold">
          {mode === 'convert' ? 'How conversion works:' : 'How this works:'}
        </p>
        <ul className="list-disc list-inside space-y-0.5 text-purple-700">
          {mode === 'convert' ? (
            <>
              <li>Upload your existing Word, PDF, PowerPoint, or HTML document</li>
              <li>The system extracts text content from your file</li>
              <li>Add conversion instructions describing the interactivity you want</li>
              <li>The AI generates a prompt that preserves ALL your original content</li>
              <li>Paste the prompt into Claude, Cursor, or Copilot to build the interactive version</li>
            </>
          ) : (
            <>
              <li>You describe your raw educational content (data, topic, learning goals)</li>
              <li>The AI combines your material with the standard's structural requirements</li>
              <li>It generates a detailed prompt that any AI coding assistant can follow</li>
              <li>Paste the prompt into Claude, Cursor, or Copilot to build the assignment</li>
              <li>Upload the result back here and run a conformance check</li>
            </>
          )}
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
