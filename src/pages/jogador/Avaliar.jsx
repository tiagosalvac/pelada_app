import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useJogadorAtual } from '../../context/JogadorAtualContext'
import { buscarPeladaMaisRecenteDoJogador } from '../../lib/peladas'
import JogadorAvatar from '../../components/JogadorAvatar'

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function JogadorAvaliar() {
  const navigate = useNavigate()
  const { jogadorAtual } = useJogadorAtual()

  const [pelada, setPelada] = useState(null)
  const [colegas, setColegas] = useState([])
  const [votoAtual, setVotoAtual] = useState(null) // avaliado_id já registrado no banco, se houver
  const [escolha, setEscolha] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  // Em dev, o StrictMode roda este efeito duas vezes — sem essa trava, a resposta
  // da chamada duplicada podia chegar depois e resetar o voto que a pessoa já tinha escolhido.
  const ultimaRequisicaoRef = useRef(0)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregar() {
    const minhaRequisicao = ++ultimaRequisicaoRef.current
    setCarregando(true)
    setErro(null)

    const peladaAlvo = await buscarPeladaMaisRecenteDoJogador(jogadorAtual.id, { apenasAvaliacaoAberta: true })
    if (ultimaRequisicaoRef.current !== minhaRequisicao) return // resposta desatualizada, ignora

    if (!peladaAlvo) {
      setPelada(null)
      setCarregando(false)
      return
    }

    const [convocadosResp, votoResp] = await Promise.all([
      supabase.from('pelada_jogadores').select('jogador_id, jogadores(*)').eq('pelada_id', peladaAlvo.id),
      supabase
        .from('mvp_votos')
        .select('avaliado_id')
        .eq('pelada_id', peladaAlvo.id)
        .eq('avaliador_id', jogadorAtual.id)
        .maybeSingle(),
    ])
    if (ultimaRequisicaoRef.current !== minhaRequisicao) return // resposta desatualizada, ignora

    if (convocadosResp.error || votoResp.error) {
      setErro('Não foi possível carregar a votação.')
      setCarregando(false)
      return
    }

    const colegasList = convocadosResp.data
      .map((c) => c.jogadores)
      .filter((j) => j && j.id !== jogadorAtual.id)
    const votoExistente = votoResp.data?.avaliado_id ?? null

    setPelada(peladaAlvo)
    setColegas(colegasList)
    setVotoAtual(votoExistente)
    setEscolha(votoExistente)
    setCarregando(false)
  }

  async function votar() {
    if (!escolha) {
      setErro('Escolhe alguém antes de confirmar o voto.')
      return
    }

    setEnviando(true)
    setErro(null)

    const { error } = await supabase
      .from('mvp_votos')
      .upsert(
        { pelada_id: pelada.id, avaliador_id: jogadorAtual.id, avaliado_id: escolha },
        { onConflict: 'pelada_id,avaliador_id' },
      )

    if (error) {
      setErro('Não foi possível registrar seu voto. Tente de novo.')
      setEnviando(false)
      return
    }

    navigate('/jogador/resultado')
  }

  if (carregando) {
    return <p className="text-sm text-neutral-400">Carregando...</p>
  }

  if (!pelada) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-neutral-400">Nenhuma votação de MVP aberta pra você no momento.</p>
        <Link to="/jogador/resultado" className="text-sm text-emerald-700 hover:underline">
          Ver resultado da última pelada →
        </Link>
      </div>
    )
  }

  const mudouEscolha = escolha !== votoAtual

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Quem foi o MVP?</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Pelada de {formatarData(pelada.data)}. Escolhe 1 pessoa — pode trocar até a votação fechar.
        </p>
      </div>

      {erro && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {colegas.length === 0 ? (
        <p className="text-sm text-neutral-400">Ninguém mais convocado pra essa pelada.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {colegas.map((colega) => {
            const selecionado = escolha === colega.id
            return (
              <li key={colega.id}>
                <button
                  type="button"
                  onClick={() => setEscolha(colega.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selecionado ? 'bg-emerald-50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <JogadorAvatar jogador={colega} />
                  <span className="flex-1 text-sm font-medium text-neutral-900">{colega.nome}</span>
                  {selecionado && <span className="text-lg text-emerald-600">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={votar}
        disabled={enviando || colegas.length === 0 || !escolha || !mudouEscolha}
        className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
      >
        {enviando ? 'Enviando...' : votoAtual ? 'Atualizar voto' : 'Confirmar voto'}
      </button>
    </div>
  )
}
