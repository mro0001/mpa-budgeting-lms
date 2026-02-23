import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { importFromGitHub } from '../lib/api'

const EXAMPLE_URL = 'https://github.com/mro0001/excel-revenue-forecasting'

export default function Submit() {
  const navigate = useNavigate()
  const [githubUrl, setGithubUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [createdBy, setCreatedBy] = useState('')

  const importMutation = useMutation({
    mutationFn: () =>
      importFromGitHub({
        github_url: githubUrl,
        branch,
        created_by: createdBy || 'anonymous',
      }),
    onSuccess: (data) => {
      navigate(`/assignments/${data.id}`)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    importMutation.mutate()
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Import Assignment</h1>
      <p className="text-sm text-gray-500 mb-6">
        Import a self-contained HTML assignment from a GitHub repository. The platform will
        download all files and generate a catalog description using AI.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
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

        {/* How it works */}
        <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 text-xs text-brand-800 space-y-1">
          <p className="font-semibold">What happens on import:</p>
          <ul className="list-disc list-inside space-y-0.5 text-brand-700">
            <li>All repository files are downloaded and stored</li>
            <li>The entry HTML file is detected automatically</li>
            <li>AI generates a catalog description + tags in the background</li>
            <li>The original file is never modified</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={importMutation.isPending || !githubUrl}
          className="w-full bg-brand-600 text-white font-medium rounded-lg px-4 py-2.5 hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {importMutation.isPending ? 'Importing…' : 'Import from GitHub'}
        </button>

        {importMutation.isError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            <p className="font-medium">Import failed</p>
            <p className="text-xs mt-0.5">
              {importMutation.error?.response?.data?.detail || importMutation.error?.message || 'Unknown error'}
            </p>
          </div>
        )}
      </form>

      {/* Quick-fill example */}
      <p className="mt-4 text-xs text-gray-400 text-center">
        Testing?{' '}
        <button
          onClick={() => setGithubUrl(EXAMPLE_URL)}
          className="text-brand-600 hover:underline"
        >
          Use the excel-revenue-forecasting example
        </button>
      </p>
    </div>
  )
}
