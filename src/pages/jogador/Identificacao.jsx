import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useJogadorAtual } from '../../context/JogadorAtualContext'
import { buscarPeladaMaisRecenteDoJogador } from '../../lib/peladas'
import JogadorAvatar from '../../components/JogadorAvatar'

export default function JogadorIdentificacao() {
  const navigate = useNavigate()
  const { jogadorAtual, setJogadorAtual } = useJogadorAtual()
  const [jogadores, setJogadores] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    if (jogadorAtual) {
      irParaDestino(jogadorAtual.id)
      return
    }
    buscarJogadores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function buscarJogadores() {
    setCarregando(true)
    setErro(null)
    const { data, error } = await supabase.from('jogadores').select('*').order('nome', { ascending: true })
    if (error) {
      setErro('Não foi possível carregar os jogadores. Tente recarregar a página.')
    } else {
      setJogadores(data)
    }
    setCarregando(false)
  }

  async function irParaDestino(jogadorId) {
    // se tem alguma pelada com avaliação aberta que essa pessoa participou, cai direto lá
    const pelada = await buscarPeladaMaisRecenteDoJogador(jogadorId, { apenasAvaliacaoAberta: true })
    navigate(pelada ? '/jogador/avaliar' : '/jogador/estatisticas', { replace: true })
  }

  async function escolher(jogador) {
    setEntrando(true)
    setJogadorAtual(jogador)
    await irParaDestino(jogador.id)
  }

  if (jogadorAtual) {
    return <p className="text-sm text-neutral-400">Entrando...</p>
  }

  const filtrados = jogadores.filter((j) => j.nome.toLowerCase().includes(busca.trim().toLowerCase()))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Quem é você?</h1>
        <p className="mt-1 text-sm text-neutral-500">Escolha seu nome na lista. Sem senha, sem complicação.</p>
      </div>

      {erro && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar pelo nome..."
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />

      {carregando ? (
        <p className="text-sm text-neutral-400">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-neutral-400">Nenhum jogador encontrado.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {filtrados.map((jogador) => (
            <li key={jogador.id}>
              <button
                type="button"
                onClick={() => escolher(jogador)}
                disabled={entrando}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 disabled:opacity-50"
              >
                <JogadorAvatar jogador={jogador} />
                <span className="text-sm font-medium text-neutral-900">{jogador.nome}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
