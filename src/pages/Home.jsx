import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center">
        <img src="/logo.png" alt="Pelada da VT" className="mx-auto h-24 w-24 rounded-full object-cover shadow-md" />
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Pelada da VT</h1>
        <p className="mt-2 text-neutral-500">Escolha como você quer entrar</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/admin"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sou admin
          </Link>
          <Link
            to="/jogador"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Sou jogador
          </Link>
        </div>
      </div>
    </div>
  )
}
