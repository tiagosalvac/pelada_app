import { NavLink, Outlet } from 'react-router-dom'
import { useJogadorAtual } from '../context/JogadorAtualContext'

const linkClass = ({ isActive }) =>
  `shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
    isActive ? 'bg-brand-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
  }`

export default function JogadorLayout() {
  const { jogadorAtual, setJogadorAtual } = useJogadorAtual()

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-neutral-900 sm:text-base">
            <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            <span className="whitespace-nowrap">Pelada da VT</span>
          </span>

          {jogadorAtual && (
            <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              <NavLink to="/jogador/avaliar" className={linkClass}>
                Avaliar
              </NavLink>
              <NavLink to="/jogador/resultado" className={linkClass}>
                Resultado
              </NavLink>
              <NavLink to="/jogador/estatisticas" className={linkClass}>
                Estatísticas
              </NavLink>
              <button
                type="button"
                onClick={() => setJogadorAtual(null)}
                className="ml-auto shrink-0 whitespace-nowrap pl-2 text-xs text-neutral-400 hover:text-neutral-600 sm:text-sm"
              >
                {jogadorAtual.nome} · trocar
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-3 py-5 sm:px-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
