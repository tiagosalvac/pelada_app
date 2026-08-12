import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useJogadorAtual } from '../../context/JogadorAtualContext'
import { buscarPeladaMaisRecenteDoJogador } from '../../lib/peladas'
import { contarGols, calcularCampeoes } from '../../lib/partidas'

const STATUS_LABEL = {
  em_andamento: 'Em andamento',
  finalizada: 'Finalizada',
}

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function JogadorResultado() {
  const { jogadorAtual } = useJogadorAtual()

  const [pelada, setPelada] = useState(null)
  const [times, setTimes] = useState([])
  const [partidas, setPartidas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro(null)

    const peladaAlvo = await buscarPeladaMaisRecenteDoJogador(jogadorAtual.id)
    if (!peladaAlvo) {
      setPelada(null)
      setCarregando(false)
      return
    }

    const [convocadosResp, timesResp, partidasResp] = await Promise.all([
      supabase.from('pelada_jogadores').select('jogador_id, jogadores(*)').eq('pelada_id', peladaAlvo.id),
      supabase
        .from('times')
        .select('id, nome, time_jogadores(jogador_id)')
        .eq('pelada_id', peladaAlvo.id)
        .order('nome', { ascending: true }),
      supabase
        .from('partidas')
        .select('id, time_a_id, time_b_id, time_vencedor_id, created_at, gols(id, jogador_id, time_id)')
        .eq('pelada_id', peladaAlvo.id)
        .order('created_at', { ascending: true }),
    ])

    if (convocadosResp.error || timesResp.error || partidasResp.error) {
      setErro('Não foi possível carregar o resultado.')
      setCarregando(false)
      return
    }

    const jogadoresPorId = new Map(
      convocadosResp.data.filter((c) => c.jogadores).map((c) => [c.jogador_id, c.jogadores]),
    )
    const timesMontados = timesResp.data.map((t) => ({
      id: t.id,
      nome: t.nome,
      jogadores: t.time_jogadores.map((tj) => jogadoresPorId.get(tj.jogador_id)).filter(Boolean),
    }))

    setPelada(peladaAlvo)
    setTimes(timesMontados)
    setPartidas(partidasResp.data)
    setCarregando(false)
  }

  if (carregando) {
    return <p className="text-sm text-neutral-400">Carregando...</p>
  }

  if (erro) {
    return <p className="text-sm text-red-700">{erro}</p>
  }

  if (!pelada) {
    return <p className="text-sm text-neutral-400">Você ainda não participou de nenhuma pelada.</p>
  }

  const timesPorId = new Map(times.map((t) => [t.id, t]))
  const partidaAtual = partidas.find((p) => !p.time_vencedor_id) ?? null
  const partidasFinalizadas = partidas.filter((p) => p.time_vencedor_id)
  const peladaFinalizada = pelada.status === 'finalizada'
  const campeoes = peladaFinalizada ? calcularCampeoes(times, partidasFinalizadas) : []
  const meuTimeId = times.find((t) => t.jogadores.some((j) => j.id === jogadorAtual.id))?.id ?? null

  function nomeTime(id) {
    return timesPorId.get(id)?.nome ?? '?'
  }

  function destaque(id) {
    return id === meuTimeId ? 'font-semibold text-emerald-700' : ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{formatarData(pelada.data)}</h1>
        <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
          {STATUS_LABEL[pelada.status] ?? pelada.status}
        </span>
      </div>

      {campeoes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          🏆 {campeoes.length === 1 ? 'Campeão do dia' : 'Campeões do dia (empate)'}:{' '}
          <span className="font-semibold">{campeoes.map((t) => t.nome).join(' e ')}</span>
        </div>
      )}

      {partidaAtual && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-center text-xs font-semibold text-neutral-500">Rolando agora</p>
          <div className="flex items-center justify-center gap-4 text-lg font-bold text-neutral-900">
            <span className={destaque(partidaAtual.time_a_id)}>{nomeTime(partidaAtual.time_a_id)}</span>
            <span>
              {contarGols(partidaAtual, partidaAtual.time_a_id)} × {contarGols(partidaAtual, partidaAtual.time_b_id)}
            </span>
            <span className={destaque(partidaAtual.time_b_id)}>{nomeTime(partidaAtual.time_b_id)}</span>
          </div>
        </div>
      )}

      {partidasFinalizadas.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">Confrontos</h2>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white text-sm">
            {partidasFinalizadas.map((p, i) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="text-neutral-400">#{i + 1}</span>
                <span>
                  <span className={destaque(p.time_a_id)}>{nomeTime(p.time_a_id)}</span>{' '}
                  {contarGols(p, p.time_a_id)} × {contarGols(p, p.time_b_id)}{' '}
                  <span className={destaque(p.time_b_id)}>{nomeTime(p.time_b_id)}</span>
                </span>
                <span className="font-medium text-emerald-700">🏆 {nomeTime(p.time_vencedor_id)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !partidaAtual && <p className="text-sm text-neutral-400">Nenhuma partida registrada ainda.</p>
      )}
    </div>
  )
}
