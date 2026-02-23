/**
 * Axios API client — all requests go to /api (proxied to FastAPI by Vite).
 * Never call MindRouter2 directly from the frontend.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Assignments ──────────────────────────────────────────────────────────────

export const getAssignments = (params = {}) =>
  api.get('/assignments', { params }).then(r => r.data)

export const getAssignment = (id) =>
  api.get(`/assignments/${id}`).then(r => r.data)

export const updateAssignment = (id, data) =>
  api.patch(`/assignments/${id}`, data).then(r => r.data)

export const deleteAssignment = (id) =>
  api.delete(`/assignments/${id}`).then(r => r.data)

export const importFromGitHub = (payload) =>
  api.post('/assignments/import', payload).then(r => r.data)

/** The serve URL is used as iframe src — not fetched via axios */
export const serveUrl = (id) => `/api/assignments/${id}/serve`

export const downloadUrl = (id) => `/api/assignments/${id}/download`

// ── Presentation ─────────────────────────────────────────────────────────────

export const updatePresentation = (id, config) =>
  api.put(`/assignments/${id}/presentation`, config).then(r => r.data)

export const getPresentationHistory = (id) =>
  api.get(`/assignments/${id}/presentation/history`).then(r => r.data)

// ── Feedback ─────────────────────────────────────────────────────────────────

export const getFeedback = (assignmentId) =>
  api.get(`/assignments/${assignmentId}/feedback`).then(r => r.data)

export const createFeedback = (assignmentId, data) =>
  api.post(`/assignments/${assignmentId}/feedback`, data).then(r => r.data)

export const deleteFeedback = (assignmentId, feedbackId) =>
  api.delete(`/assignments/${assignmentId}/feedback/${feedbackId}`).then(r => r.data)

export const getFeedbackThemes = (assignmentId) =>
  api.get(`/assignments/${assignmentId}/feedback/themes`).then(r => r.data)

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardStats = () =>
  api.get('/dashboard/stats').then(r => r.data)

export const getTopAssignments = (limit = 5) =>
  api.get('/dashboard/top-assignments', { params: { limit } }).then(r => r.data)

export const getRecentFeedback = (limit = 10) =>
  api.get('/dashboard/recent-feedback', { params: { limit } }).then(r => r.data)

export const getTagCloud = () =>
  api.get('/dashboard/tag-cloud').then(r => r.data)

export default api
