/**
 * API client — all requests go to /api (proxied to FastAPI by Vite).
 * Never call MindRouter2 directly from the frontend.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
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

export const uploadAssignment = (formData) =>
  api.post('/assignments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

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

// ── Reviews ──────────────────────────────────────────────────────────────────

export const getReviews = (assignmentId) =>
  api.get(`/assignments/${assignmentId}/reviews`).then(r => r.data)

export const createReview = (assignmentId, data) =>
  api.post(`/assignments/${assignmentId}/reviews`, data).then(r => r.data)

export const updateReviewStatus = (reviewId, data) =>
  api.patch(`/reviews/${reviewId}/status`, data).then(r => r.data)

// ── Standards ────────────────────────────────────────────────────────────────

export const getStandards = () =>
  api.get('/standards').then(r => r.data)

export const getStandard = (id) =>
  api.get(`/standards/${id}`).then(r => r.data)

export const createStandard = (data) =>
  api.post('/standards', data).then(r => r.data)

export const updateStandard = (id, data) =>
  api.put(`/standards/${id}`, data).then(r => r.data)

export const checkConformance = (standardId, assignmentId) =>
  api.post(`/standards/${standardId}/check/${assignmentId}`).then(r => r.data)

export const generateAgentPrompt = (standardId, data) =>
  api.post(`/standards/${standardId}/generate-prompt`, data).then(r => r.data)

// ── Connections ──────────────────────────────────────────────────────────────

export const getConnections = (assignmentId) =>
  api.get(`/assignments/${assignmentId}/connections`).then(r => r.data)

export const createConnection = (data) =>
  api.post('/connections', data).then(r => r.data)

export const deleteConnection = (connectionId) =>
  api.delete(`/connections/${connectionId}`).then(r => r.data)

export const getLearningPaths = () =>
  api.get('/learning-paths').then(r => r.data)

// ── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboardStats = () =>
  api.get('/dashboard/stats').then(r => r.data)

export const getQualityMetrics = () =>
  api.get('/dashboard/quality').then(r => r.data)

export const getTopAssignments = (limit = 5) =>
  api.get('/dashboard/top-assignments', { params: { limit } }).then(r => r.data)

export const getRecentFeedback = (limit = 10) =>
  api.get('/dashboard/recent-feedback', { params: { limit } }).then(r => r.data)

export const getPendingReviews = () =>
  api.get('/dashboard/pending-reviews').then(r => r.data)

export const getTagCloud = () =>
  api.get('/dashboard/tag-cloud').then(r => r.data)

export const getSubjectAreas = () =>
  api.get('/dashboard/subject-areas').then(r => r.data)

export default api
