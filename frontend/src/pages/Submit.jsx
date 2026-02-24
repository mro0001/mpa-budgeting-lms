import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { importFromGitHub, uploadAssignment } from '../lib/api'

const EXAMPLE_URL = 'https://github.com/mro0001/excel-revenue-forecasting'

export default function Submit() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('github')  // 'github' | 'upload'

  // GitHub import state
  const [githubUrl, setGithubUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [createdBy, setCreatedBy] = useState('')

  // File upload state
  const [file, setFile] = useState(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCreatedBy, setUploadCreatedBy] = useState('')
  const fileInputRef = useRef(null)

  const importMutation = useMutation({
    mutationFn: () =>
      importFromGitHub({
        github_url: githubUrl,
        branch,
        created_by: createdBy || 'anonymous',
      }),
    onSuccess: (data) => navigate(`/assignments/${data.id}`),
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', uploadTitle)
      fd.append('created_by', uploadCreatedBy || 'anonymous')
      return uploadAssignment(fd)
    },
    onSuccess: (data) => navigate(`/assignments/${data.id}`),
  })

  const handleGithubSubmit = (e) => { e.preventDefault(); importMutation.mutate() }
  const handleUploadSubmit = (e) => { e.preventDefault(); uploadMutation.mutate() }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.name.endsWith('.html') || dropped.name.endsWith('.htm'))) {
      setFile(dropped)
      if (!uploadTitle) setUploadTitle(dropped.name.replace(/\.html?$/, '').replace(/[-_]/g, ' '))
    }
  }

  const handleFileSelect = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      if (!uploadTitle) setUploadTitle(selected.name.replace(/\.html?$/, '').replace(/[-_]/g, ' '))
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Submit Assignment</h1>
      <p className="text-sm text-gray-500 mb-6">
        Import from a GitHub repository or upload an HTML file directly. AI will auto-generate
        a catalog description and suggest tags in the background.
      </p>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'github', label: 'GitHub Import' },
          { key: 'upload', label: 'File Upload' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 text-sm py-2.5 font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GitHub Import Tab */}
      {tab === 'github' && (
        <form onSubmit={handleGithubSubmit} className="space-y-4 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">GitHub Repository URL</span>
            <input
              type="url"
              required
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder={EXAMPLE_URL}
              className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
            />
            <p className="mt-1 text-xs text-gray-400">
              Accepts <code>https://github.com/owner/repo</code> or <code>.../tree/branch</code>
            </p>
          </label>

          <div className="flex gap-4">
            <label className="flex-1 block">
              <span className="text-sm font-medium text-gray-700">Branch</span>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex-1 block">
              <span className="text-sm font-medium text-gray-700">Your Name</span>
              <input
                type="text"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Prof. Smith"
                className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={importMutation.isPending || !githubUrl}
            className="w-full bg-brand-600 text-white font-medium rounded-lg px-4 py-2.5 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {importMutation.isPending ? 'Importing...' : 'Import from GitHub'}
          </button>

          {importMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              <p className="font-medium">Import failed</p>
              <p className="text-xs mt-0.5">
                {importMutation.error?.response?.data?.detail || importMutation.error?.message}
              </p>
            </div>
          )}
        </form>
      )}

      {/* File Upload Tab */}
      {tab === 'upload' && (
        <form onSubmit={handleUploadSubmit} className="space-y-4 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-brand-300'
            }`}
          >
            {file ? (
              <div>
                <p className="text-sm font-medium text-brand-700">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">Drop an HTML file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Accepts .html files up to 10 MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Assignment Title</span>
            <input
              type="text"
              required
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Revenue Forecasting Tutorial"
              className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Your Name</span>
            <input
              type="text"
              value={uploadCreatedBy}
              onChange={(e) => setUploadCreatedBy(e.target.value)}
              placeholder="Prof. Smith"
              className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
            />
          </label>

          <button
            type="submit"
            disabled={uploadMutation.isPending || !file || !uploadTitle}
            className="w-full bg-brand-600 text-white font-medium rounded-lg px-4 py-2.5 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Assignment'}
          </button>

          {uploadMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              <p className="font-medium">Upload failed</p>
              <p className="text-xs mt-0.5">
                {uploadMutation.error?.response?.data?.detail || uploadMutation.error?.message}
              </p>
            </div>
          )}
        </form>
      )}

      {/* How it works */}
      <div className="mt-6 bg-brand-50 border border-brand-100 rounded-lg p-4 text-xs text-brand-800 space-y-1">
        <p className="font-semibold">What happens on submit:</p>
        <ul className="list-disc list-inside space-y-0.5 text-brand-700">
          <li>Files are downloaded/saved and the entry HTML is auto-detected</li>
          <li>AI generates a catalog description + tags in the background</li>
          <li>The original file is never modified (presentation/substance separation)</li>
          <li>You can then run a conformance check against any assignment standard</li>
        </ul>
      </div>

      {tab === 'github' && (
        <p className="mt-4 text-xs text-gray-400 text-center">
          Testing?{' '}
          <button onClick={() => setGithubUrl(EXAMPLE_URL)} className="text-brand-600 hover:underline">
            Use the excel-revenue-forecasting example
          </button>
        </p>
      )}
    </div>
  )
}
