import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Catalog', end: true },
  { to: '/submit', label: 'Import Assignment' },
  { to: '/dashboard', label: 'Dashboard' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight">MPA Budgeting LMS</span>
            <span className="text-brand-100 text-sm hidden sm:block">
              Local Government Finance Assignments
            </span>
          </div>
          <nav className="flex gap-1">
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-brand-700'
                      : 'text-brand-100 hover:text-white hover:bg-brand-600'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white text-center text-xs text-gray-400 py-3">
        MPA Budgeting LMS — University of Idaho
      </footer>
    </div>
  )
}
