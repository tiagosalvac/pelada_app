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
    return <p className="text-sm text-texto-secundario">Entrando...</p>
  }

  const filtrados = jogadores.filter((j) => j.nome.toLowerCase().includes(busca.trim().toLowerCase()))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Quem é você?</h1>
        <p className="mt-1 text-sm text-texto-secundario">Escolha seu nome na lista. Sem senha, sem complicação.</p>
      </div>

      {erro && (
        <div className="rounded-md border border-perigo/40 bg-perigo/10 px-4 py-3 text-sm text-perigo">{erro}</div>
      )}

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar pelo nome..."
        className="w-full rounded-md border border-borda-input bg-azul-700 px-3 py-2 text-sm text-white placeholder:text-texto-secundario focus:border-amarelo-500 focus:outline-none focus:ring-2 focus:ring-amarelo-500"
      />

      {carregando ? (
        <p className="text-sm text-texto-secundario">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-texto-secundario">Nenhum jogador encontrado.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-amarelo-500/25">
          {filtrados.map((jogador, i) => (
            <li key={jogador.id} className={i % 2 === 0 ? 'bg-azul-700' : 'bg-azul-900'}>
              <button
                type="button"
                onClick={() => escolher(jogador)}
                disabled={entrando}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-azul-600/40 disabled:opacity-50"
              >
                <JogadorAvatar jogador={jogador} />
                <span className="text-sm font-medium text-white">{jogador.nome}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
