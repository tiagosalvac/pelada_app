import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-azul-900 px-4">
      <div className="w-full max-w-xs text-center">
        <img src="/logo.png" alt="Pelada da VT" className="mx-auto h-24 w-24 rounded-full object-cover shadow-md" />
        <h1 className="mt-4 text-2xl font-semibold text-white">Pelada da VT</h1>
        <p className="mt-2 text-texto-secundario">Escolha como você quer entrar</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/admin"
            className="rounded-md bg-azul-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-azul-500"
          >
            Sou admin
          </Link>
          <Link
            to="/jogador"
            className="rounded-md bg-amarelo-500 px-4 py-2.5 text-sm font-bold text-azul-900 hover:bg-amarelo-400"
          >
            Sou jogador
          </Link>
        </div>
      </div>
    </div>
  )
}
