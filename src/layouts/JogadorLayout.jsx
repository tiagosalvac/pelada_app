import { NavLink, Outlet } from 'react-router-dom'
import { useJogadorAtual } from '../context/JogadorAtualContext'

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
  }`

export default function JogadorLayout() {
  const { jogadorAtual, setJogadorAtual } = useJogadorAtual()

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="font-semibold text-neutral-900">Pelada App</span>

          {jogadorAtual && (
            <nav className="flex items-center gap-1">
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
                className="ml-2 text-sm text-neutral-400 hover:text-neutral-600"
              >
                {jogadorAtual.nome} · trocar
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
