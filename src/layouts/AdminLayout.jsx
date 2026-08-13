import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  `shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors sm:px-3 sm:py-2 sm:text-sm ${
    isActive ? 'bg-amarelo-500 text-azul-900' : 'text-texto-secundario hover:bg-azul-700 hover:text-white'
  }`

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-azul-900">
      <header className="border-b-[3px] border-amarelo-500 bg-azul-900">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white sm:text-base">
            <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            <span className="whitespace-nowrap">
              Pelada da VT <span className="hidden sm:inline">· Admin</span>
            </span>
          </span>
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
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
      <main className="mx-auto max-w-4xl px-3 py-5 sm:px-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
