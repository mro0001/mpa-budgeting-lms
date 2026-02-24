import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Home from './pages/Home'
import AssignmentDetail from './pages/AssignmentDetail'
import Submit from './pages/Submit'
import Standards from './pages/Standards'
import AgentPrompt from './pages/AgentPrompt'
import Dashboard from './pages/Dashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="assignments/:id" element={<AssignmentDetail />} />
            <Route path="submit" element={<Submit />} />
            <Route path="standards" element={<Standards />} />
            <Route path="agent" element={<AgentPrompt />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
