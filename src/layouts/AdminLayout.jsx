import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
  }`

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="font-semibold text-neutral-900">Pelada App · Admin</span>
          <nav className="flex gap-1">
            <NavLink to="/admin/jogadores" className={linkClass}>
              Jogadores
            </NavLink>
            <NavLink to="/admin/peladas" className={linkClass}>
              Peladas
            </NavLink>
            <NavLink to="/admin/estatisticas" className={linkClass}>
              Estatísticas
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
