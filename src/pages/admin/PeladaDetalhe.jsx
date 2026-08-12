import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import JogadorAvatar from '../../components/JogadorAvatar'
import { siglaPosicao } from '../../lib/constants'
import { contarGols } from '../../lib/partidas'
import { calcularPodioMvp, calcularArtilheirosDaPelada } from '../../lib/mvp'

const STATUS_LABEL = {
  em_andamento: 'Em andamento',
  finalizada: 'Finalizada',
}

const STATUS_CLASSE = {
  em_andamento: 'bg-emerald-50 text-emerald-700',
  finalizada: 'bg-neutral-100 text-neutral-500',
}

const NUM_TIMES_PADRAO = 3
const NUM_TIMES_MIN = 2
const NUM_TIMES_MAX = 8
const NIVEL_PADRAO = 3

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function embaralhar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Distribui jogadores nos times tentando equilibrar a soma de nível entre eles. */
function sortearBalanceado(jogadores, numTimes) {
  const grupos = Array.from({ length: numTimes }, () => ({ jogadores: [], soma: 0 }))
  const ordenados = embaralhar(jogadores).sort(
    (a, b) => (b.nivel ?? NIVEL_PADRAO) - (a.nivel ?? NIVEL_PADRAO),
  )

  for (const jogador of ordenados) {
    grupos.sort((a, b) => a.soma - b.soma || a.jogadores.length - b.jogadores.length)
    grupos[0].jogadores.push(jogador)
    grupos[0].soma += jogador.nivel ?? NIVEL_PADRAO
  }

  return grupos
}

export default function AdminPeladaDetalhe() {
  const { peladaId } = useParams()

  const [pelada, setPelada] = useState(null)
  const [todosJogadores, setTodosJogadores] = useState([]) // todo mundo cadastrado no app
  const [convocados, setConvocados] = useState([]) // quem foi chamado pra essa pelada
  const [times, setTimes] = useState([]) // [{ id, nome, jogadores: [jogador,...] }]
  const [partidas, setPartidas] = useState([]) // [{ id, time_a_id, time_b_id, time_vencedor_id, created_at, gols: [...] }]
  const [votosMvp, setVotosMvp] = useState([]) // [{ avaliado_id }]
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState(null)
  const [numTimes, setNumTimes] = useState(NUM_TIMES_PADRAO)
  const [arrastandoId, setArrastandoId] = useState(null)
  const [mostrarEscolhaVencedor, setMostrarEscolhaVencedor] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Evita duas fontes de corrida: o efeito de inicialização rodando duas vezes
  // (StrictMode, em dev) e respostas de carregar() chegando fora de ordem.
  const iniciadoParaRef = useRef(null)
  const ultimaRequisicaoRef = useRef(0)

  const carregar = useCallback(async () => {
    const minhaRequisicao = ++ultimaRequisicaoRef.current
    setErro(null)

    const [peladaResp, jogadoresResp, convocadosResp, timesResp, partidasResp, votosResp] = await Promise.all([
      supabase.from('peladas').select('*').eq('id', peladaId).single(),
      supabase.from('jogadores').select('*').order('nome', { ascending: true }),
      supabase.from('pelada_jogadores').select('jogador_id, jogadores(*)').eq('pelada_id', peladaId),
      supabase
        .from('times')
        .select('id, nome, time_jogadores(jogador_id)')
        .eq('pelada_id', peladaId)
        .order('nome', { ascending: true }),
      supabase
        .from('partidas')
        .select('id, time_a_id, time_b_id, time_vencedor_id, created_at, gols(id, jogador_id, time_id)')
        .eq('pelada_id', peladaId)
        .order('created_at', { ascending: true }),
      supabase.from('mvp_votos').select('avaliado_id').eq('pelada_id', peladaId),
    ])

    if (
      peladaResp.error ||
      jogadoresResp.error ||
      convocadosResp.error ||
      timesResp.error ||
      partidasResp.error ||
      votosResp.error
    ) {
      if (ultimaRequisicaoRef.current === minhaRequisicao) {
        setErro('Não foi possível carregar a pelada.')
        setCarregando(false)
      }
      return null
    }

    const convocadosMontados = convocadosResp.data.map((pj) => pj.jogadores).filter(Boolean)
    const jogadoresPorId = new Map(convocadosMontados.map((j) => [j.id, j]))
    const timesMontados = timesResp.data.map((t) => ({
      id: t.id,
      nome: t.nome,
      jogadores: t.time_jogadores.map((tj) => jogadoresPorId.get(tj.jogador_id)).filter(Boolean),
    }))

    // Se já saiu uma requisição mais nova enquanto esta esperava a resposta,
    // descarta este resultado desatualizado em vez de sobrescrever o estado atual.
    if (ultimaRequisicaoRef.current === minhaRequisicao) {
      setPelada(peladaResp.data)
      setTodosJogadores(jogadoresResp.data)
      setConvocados(convocadosMontados)
      setTimes(timesMontados)
      setPartidas(partidasResp.data)
      setVotosMvp(votosResp.data)
      if (timesMontados.length > 0) setNumTimes(timesMontados.length)
      setCarregando(false)
    }

    return { convocados: convocadosMontados, times: timesMontados }
  }, [peladaId])

  useEffect(() => {
    if (iniciadoParaRef.current === peladaId) return
    iniciadoParaRef.current = peladaId

    async function iniciar() {
      setCarregando(true)
      const resultado = await carregar()
      // primeira visita: ainda não existem times pra essa pelada — cria os padrão já sorteados
      // com quem foi convocado na criação da pelada
      if (resultado && resultado.times.length === 0) {
        await criarTimes(NUM_TIMES_PADRAO, resultado.convocados)
      }
    }
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peladaId])

  const alocadosIds = useMemo(
    () => new Set(times.flatMap((t) => t.jogadores.map((j) => j.id))),
    [times],
  )
  const disponiveis = useMemo(
    () => convocados.filter((j) => !alocadosIds.has(j.id)),
    [convocados, alocadosIds],
  )
  const naoConvocados = useMemo(() => {
    const convocadosIds = new Set(convocados.map((j) => j.id))
    return todosJogadores.filter((j) => !convocadosIds.has(j.id))
  }, [todosJogadores, convocados])

  const timesPorId = useMemo(() => new Map(times.map((t) => [t.id, t])), [times])
  const partidaAtual = useMemo(() => partidas.find((p) => !p.time_vencedor_id) ?? null, [partidas])
  const partidasFinalizadas = useMemo(() => partidas.filter((p) => p.time_vencedor_id), [partidas])
  const timesEsperando = useMemo(() => {
    if (!partidaAtual) return []
    return times.filter((t) => t.id !== partidaAtual.time_a_id && t.id !== partidaAtual.time_b_id)
  }, [times, partidaAtual])

  const jogadoresPorId = useMemo(() => new Map(convocados.map((j) => [j.id, j])), [convocados])
  const podioMvp = useMemo(() => calcularPodioMvp(votosMvp), [votosMvp])
  const artilheirosDaPelada = useMemo(
    () => calcularArtilheirosDaPelada(partidas.flatMap((p) => p.gols)),
    [partidas],
  )
  const mensagemMvp = useMemo(() => {
    if (!pelada || podioMvp.length === 0) return ''

    const emojiPosicao = ['🥇 MVP', '🥈 2º lugar', '🥉 3º lugar']
    const linhas = [`📋 Resultado da pelada – ${formatarData(pelada.data)}`, '']

    podioMvp.forEach((degrau, i) => {
      const nomes = degrau.jogadorIds.map((id) => jogadoresPorId.get(id)?.nome ?? '?').join(' e ')
      linhas.push(`${emojiPosicao[i]}: ${nomes} (${degrau.votos} voto${degrau.votos === 1 ? '' : 's'})`)
    })

    if (artilheirosDaPelada.length > 0) {
      const nomes = artilheirosDaPelada.map((a) => jogadoresPorId.get(a.jogadorId)?.nome ?? '?').join(' e ')
      linhas.push('')
      linhas.push(`⚽ Artilheiro: ${nomes} (${artilheirosDaPelada[0].gols} gol${artilheirosDaPelada[0].gols === 1 ? '' : 's'})`)
    }

    return linhas.join('\n')
  }, [pelada, podioMvp, artilheirosDaPelada, jogadoresPorId])

  const peladaFinalizada = pelada?.status === 'finalizada'
  // Uma vez que tem partida registrada, trava a montagem de times: mexer nos times
  // no meio do jogo apagaria as partidas junto (times tem cascade pra partidas).
  const timesTravados = partidas.length > 0 || peladaFinalizada

  useEffect(() => {
    setMostrarEscolhaVencedor(false)
  }, [partidaAtual?.id])

  async function criarTimes(n, jogadoresParaSortear) {
    setProcessando(true)
    setErro(null)

    const timeIdsAtuais = times.map((t) => t.id)
    if (timeIdsAtuais.length > 0) {
      // times tem ON DELETE CASCADE pra time_jogadores, não precisa apagar as duas.
      await supabase.from('times').delete().in('id', timeIdsAtuais)
    }

    const novosTimes = Array.from({ length: n }, (_, i) => ({
      pelada_id: peladaId,
      nome: `Time ${i + 1}`,
    }))
    const { data: timesInseridos, error: timesError } = await supabase
      .from('times')
      .insert(novosTimes)
      .select()
      .order('nome', { ascending: true })

    if (timesError) {
      setErro('Não foi possível criar os times.')
      setProcessando(false)
      return
    }

    const grupos = sortearBalanceado(jogadoresParaSortear ?? convocados, n)
    const linhas = grupos.flatMap((grupo, i) =>
      grupo.jogadores.map((jogador) => ({ time_id: timesInseridos[i].id, jogador_id: jogador.id })),
    )
    if (linhas.length > 0) {
      const { error: insertError } = await supabase.from('time_jogadores').insert(linhas)
      if (insertError) {
        setErro('Times criados, mas não foi possível sortear os jogadores.')
      }
    }

    await carregar()
    setProcessando(false)
  }

  async function aplicarNumTimes() {
    if (numTimes === times.length) return
    const confirmado = window.confirm(
      'Isso recria os times e sorteia os jogadores de novo. Continuar?',
    )
    if (!confirmado) return
    await criarTimes(numTimes)
  }

  async function sortearNovamente() {
    setProcessando(true)
    setErro(null)

    const timeIds = times.map((t) => t.id)
    const grupos = sortearBalanceado(convocados, times.length)
    const linhas = grupos.flatMap((grupo, i) =>
      grupo.jogadores.map((jogador) => ({ time_id: times[i].id, jogador_id: jogador.id })),
    )

    await supabase.from('time_jogadores').delete().in('time_id', timeIds)
    if (linhas.length > 0) {
      const { error } = await supabase.from('time_jogadores').insert(linhas)
      if (error) setErro('Não foi possível sortear os jogadores.')
    }

    await carregar()
    setProcessando(false)
  }

  async function limparTimes() {
    setProcessando(true)
    setErro(null)

    const timeIds = times.map((t) => t.id)
    const { error } = await supabase.from('time_jogadores').delete().in('time_id', timeIds)
    if (error) setErro('Não foi possível limpar os times.')

    await carregar()
    setProcessando(false)
  }

  async function moverJogador(jogadorId, destinoTimeId) {
    if (timesTravados) return
    const timeIds = times.map((t) => t.id)
    const jaEstaNoDestino = times.find((t) => t.id === destinoTimeId)?.jogadores.some((j) => j.id === jogadorId)
    if (destinoTimeId && jaEstaNoDestino) return

    setProcessando(true)
    setErro(null)

    await supabase.from('time_jogadores').delete().eq('jogador_id', jogadorId).in('time_id', timeIds)
    if (destinoTimeId) {
      const { error } = await supabase
        .from('time_jogadores')
        .insert({ time_id: destinoTimeId, jogador_id: jogadorId })
      if (error) setErro('Não foi possível mover o jogador.')
    }

    await carregar()
    setProcessando(false)
  }

  async function convocarJogador(jogadorId) {
    if (!jogadorId) return
    setProcessando(true)
    setErro(null)

    const { error } = await supabase
      .from('pelada_jogadores')
      .insert({ pelada_id: peladaId, jogador_id: jogadorId })
    if (error) setErro('Não foi possível convocar o jogador.')

    await carregar()
    setProcessando(false)
  }

  async function desconvocarJogador(jogadorId) {
    setProcessando(true)
    setErro(null)

    const { error } = await supabase
      .from('pelada_jogadores')
      .delete()
      .eq('pelada_id', peladaId)
      .eq('jogador_id', jogadorId)
    if (error) setErro('Não foi possível remover o jogador da pelada.')

    await carregar()
    setProcessando(false)
  }

  function onDropZona(event, destinoTimeId) {
    event.preventDefault()
    if (timesTravados) return
    const jogadorId = event.dataTransfer.getData('text/plain')
    setArrastandoId(null)
    if (jogadorId) moverJogador(jogadorId, destinoTimeId)
  }

  /** Quem entra em seguida: de quem tá esperando, prioriza quem faz mais tempo que não joga. */
  function proximoDaFila(idsForaDaFila) {
    const esperando = times.filter((t) => !idsForaDaFila.includes(t.id))
    if (esperando.length === 0) return null

    const ultimaVezQueJogou = new Map()
    for (const p of partidas) {
      if (!p.time_vencedor_id) continue
      for (const tid of [p.time_a_id, p.time_b_id]) {
        const atual = ultimaVezQueJogou.get(tid)
        if (!atual || p.created_at > atual) ultimaVezQueJogou.set(tid, p.created_at)
      }
    }

    return [...esperando].sort((a, b) => {
      const va = ultimaVezQueJogou.get(a.id) ?? ''
      const vb = ultimaVezQueJogou.get(b.id) ?? ''
      return va.localeCompare(vb) // quem nunca jogou (string vazia) entra primeiro
    })[0]
  }

  async function comecarJogo() {
    if (times.length < 2) return
    setProcessando(true)
    setErro(null)

    const { error } = await supabase.from('partidas').insert({
      pelada_id: peladaId,
      time_a_id: times[0].id,
      time_b_id: times[1].id,
    })
    if (error) setErro('Não foi possível começar o jogo.')

    await carregar()
    setProcessando(false)
  }

  async function adicionarGol(jogadorId, timeId) {
    if (!partidaAtual) return
    setProcessando(true)
    setErro(null)

    const { error } = await supabase
      .from('gols')
      .insert({ partida_id: partidaAtual.id, jogador_id: jogadorId, time_id: timeId })
    if (error) setErro('Não foi possível registrar o gol.')

    await carregar()
    setProcessando(false)
  }

  async function removerGol(jogadorId) {
    if (!partidaAtual) return
    const gol = partidaAtual.gols.find((g) => g.jogador_id === jogadorId)
    if (!gol) return

    setProcessando(true)
    setErro(null)

    const { error } = await supabase.from('gols').delete().eq('id', gol.id)
    if (error) setErro('Não foi possível remover o gol.')

    await carregar()
    setProcessando(false)
  }

  function iniciarEncerramento() {
    if (!partidaAtual) return
    const scoreA = contarGols(partidaAtual, partidaAtual.time_a_id)
    const scoreB = contarGols(partidaAtual, partidaAtual.time_b_id)
    if (scoreA === scoreB) {
      setMostrarEscolhaVencedor(true)
    } else {
      encerrarPartida(scoreA > scoreB ? partidaAtual.time_a_id : partidaAtual.time_b_id)
    }
  }

  async function encerrarPartida(vencedorId) {
    setProcessando(true)
    setErro(null)
    setMostrarEscolhaVencedor(false)

    const { error: updateError } = await supabase
      .from('partidas')
      .update({ time_vencedor_id: vencedorId })
      .eq('id', partidaAtual.id)
    if (updateError) {
      setErro('Não foi possível encerrar a partida.')
      setProcessando(false)
      return
    }

    const desafiante = proximoDaFila([partidaAtual.time_a_id, partidaAtual.time_b_id])
    if (desafiante) {
      const { error: novaError } = await supabase.from('partidas').insert({
        pelada_id: peladaId,
        time_a_id: vencedorId,
        time_b_id: desafiante.id,
      })
      if (novaError) setErro('Partida encerrada, mas não consegui criar o próximo confronto.')
    }

    await carregar()
    setProcessando(false)
  }

  async function finalizarPelada() {
    const confirmado = window.confirm('Finalizar a pelada? Isso libera a avaliação pros jogadores.')
    if (!confirmado) return

    setProcessando(true)
    setErro(null)

    const { error } = await supabase
      .from('peladas')
      .update({ status: 'finalizada', avaliacao_aberta: true })
      .eq('id', peladaId)
    if (error) setErro('Não foi possível finalizar a pelada.')

    await carregar()
    setProcessando(false)
  }

  async function encerrarVotacao() {
    const confirmado = window.confirm('Encerrar a votação de MVP? Ninguém mais vai poder votar.')
    if (!confirmado) return

    setProcessando(true)
    setErro(null)

    const { error } = await supabase.from('peladas').update({ avaliacao_aberta: false }).eq('id', peladaId)
    if (error) setErro('Não foi possível encerrar a votação.')

    await carregar()
    setProcessando(false)
  }

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(mensagemMvp)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErro('Não foi possível copiar. Copia manualmente o texto acima.')
    }
  }

  if (carregando) {
    return <p className="text-sm text-neutral-400">Carregando...</p>
  }

  if (!pelada) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{erro ?? 'Pelada não encontrada.'}</p>
        <Link to="/admin/peladas" className="text-sm text-emerald-700 hover:underline">
          ← Voltar pra peladas
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/peladas" className="text-sm text-neutral-400 hover:text-neutral-600">
          ← Peladas
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-neutral-900">{formatarData(pelada.data)}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSE[pelada.status] ?? 'bg-neutral-100 text-neutral-500'}`}
          >
            {STATUS_LABEL[pelada.status] ?? pelada.status}
          </span>
          {!peladaFinalizada && (
            <button
              type="button"
              onClick={finalizarPelada}
              disabled={processando}
              className="ml-auto rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
            >
              Finalizar pelada
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {todosJogadores.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Nenhum jogador cadastrado ainda.{' '}
          <Link to="/admin/jogadores" className="text-emerald-700 hover:underline">
            Cadastre jogadores
          </Link>{' '}
          antes de montar os times.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-neutral-700">Número de times</span>
              <input
                type="number"
                min={NUM_TIMES_MIN}
                max={NUM_TIMES_MAX}
                value={numTimes}
                onChange={(e) => setNumTimes(Number(e.target.value))}
                disabled={timesTravados}
                className="w-16 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              onClick={aplicarNumTimes}
              disabled={processando || numTimes === times.length || timesTravados}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              Aplicar
            </button>

            {timesTravados && (
              <span className="text-xs text-amber-600">🔒 Times travados — já tem partida registrada.</span>
            )}

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={sortearNovamente}
                disabled={processando || timesTravados}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                🔀 Sortear novamente
              </button>
              <button
                type="button"
                onClick={limparTimes}
                disabled={processando || timesTravados}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className={`grid gap-4 lg:grid-cols-[240px_1fr] ${processando ? 'opacity-60' : ''}`}>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropZona(e, null)}
              className="rounded-lg border border-dashed border-neutral-300 bg-white p-3"
            >
              <h2 className="mb-2 text-sm font-semibold text-neutral-900">
                Disponíveis ({disponiveis.length})
              </h2>

              {naoConvocados.length > 0 && (
                <select
                  value=""
                  onChange={(e) => convocarJogador(e.target.value)}
                  disabled={processando}
                  className="mb-2 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">+ Convocar jogador...</option>
                  {naoConvocados.map((jogador) => (
                    <option key={jogador.id} value={jogador.id}>
                      {jogador.nome}
                    </option>
                  ))}
                </select>
              )}

              <div className="space-y-2">
                {disponiveis.map((jogador) => (
                  <JogadorCard
                    key={jogador.id}
                    jogador={jogador}
                    arrastavel={!timesTravados}
                    arrastando={arrastandoId === jogador.id}
                    onDragStart={setArrastandoId}
                    onDragEnd={() => setArrastandoId(null)}
                    onRemover={() => desconvocarJogador(jogador.id)}
                  />
                ))}
                {disponiveis.length === 0 && (
                  <p className="text-xs text-neutral-400">
                    {convocados.length === 0
                      ? 'Ninguém convocado ainda pra essa pelada.'
                      : 'Todo mundo convocado já está em um time.'}
                  </p>
                )}
              </div>
            </div>

            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.max(times.length, 1)}, minmax(0, 1fr))` }}
            >
              {times.map((time) => {
                const soma = time.jogadores.reduce((acc, j) => acc + (j.nivel ?? NIVEL_PADRAO), 0)
                return (
                  <div
                    key={time.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropZona(e, time.id)}
                    className="rounded-lg border border-neutral-200 bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-neutral-900">{time.nome}</h2>
                      <span className="text-xs text-neutral-400">
                        {time.jogadores.length} · nível {soma}
                      </span>
                    </div>
                    <div className="min-h-16 space-y-2">
                      {time.jogadores.map((jogador) => (
                        <JogadorCard
                          key={jogador.id}
                          jogador={jogador}
                          arrastavel={!timesTravados}
                          arrastando={arrastandoId === jogador.id}
                          onDragStart={setArrastandoId}
                          onDragEnd={() => setArrastandoId(null)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {times.length >= 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-neutral-900">Partidas</h2>

              {peladaFinalizada && !partidaAtual && partidasFinalizadas.length === 0 && (
                <p className="text-sm text-neutral-400">Pelada finalizada sem partidas registradas.</p>
              )}

              {!peladaFinalizada &&
                (partidaAtual ? (
                  <div className="rounded-lg border border-neutral-200 bg-white p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[partidaAtual.time_a_id, partidaAtual.time_b_id].map((timeId) => {
                        const time = timesPorId.get(timeId)
                        const score = contarGols(partidaAtual, timeId)
                        return (
                          <div key={timeId}>
                            <div className="mb-2 flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-neutral-900">{time?.nome ?? '?'}</h3>
                              <span className="text-lg font-bold text-neutral-900">{score}</span>
                            </div>
                            <div className="space-y-1.5">
                              {(time?.jogadores ?? []).map((jogador) => (
                                <JogadorPartidaLinha
                                  key={jogador.id}
                                  jogador={jogador}
                                  gols={
                                    partidaAtual.gols.filter(
                                      (g) => g.jogador_id === jogador.id && g.time_id === timeId,
                                    ).length
                                  }
                                  onMais={() => adicionarGol(jogador.id, timeId)}
                                  onMenos={() => removerGol(jogador.id)}
                                  disabled={processando}
                                />
                              ))}
                              {(time?.jogadores ?? []).length === 0 && (
                                <p className="text-xs text-neutral-400">Time sem jogadores.</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                      <p className="text-xs text-neutral-400">
                        Esperando: {timesEsperando.length > 0 ? timesEsperando.map((t) => t.nome).join(', ') : '—'}
                      </p>
                      {mostrarEscolhaVencedor ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-neutral-500">Empate — quem venceu?</span>
                          <button
                            type="button"
                            onClick={() => encerrarPartida(partidaAtual.time_a_id)}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
                          >
                            🏆 {timesPorId.get(partidaAtual.time_a_id)?.nome}
                          </button>
                          <button
                            type="button"
                            onClick={() => encerrarPartida(partidaAtual.time_b_id)}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
                          >
                            🏆 {timesPorId.get(partidaAtual.time_b_id)?.nome}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={iniciarEncerramento}
                          disabled={processando}
                          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                          Encerrar partida
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-center">
                    <p className="mb-3 text-sm text-neutral-500">
                      {partidas.length === 0
                        ? `Pronto pra começar: ${times[0]?.nome} × ${times[1]?.nome}${
                            times.length > 2 ? ` (${times.slice(2).map((t) => t.nome).join(', ')} espera)` : ''
                          }.`
                        : 'Ninguém esperando pra jogar. Pode recomeçar se quiser.'}
                    </p>
                    <button
                      type="button"
                      onClick={comecarJogo}
                      disabled={processando}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {partidas.length === 0 ? '▶️ Começar jogo' : '🔁 Novo confronto'}
                    </button>
                  </div>
                ))}

              {partidasFinalizadas.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-neutral-500">Histórico</h3>
                  <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white text-sm">
                    {partidasFinalizadas.map((p, i) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                        <span className="text-neutral-400">#{i + 1}</span>
                        <span className="text-neutral-900">
                          {timesPorId.get(p.time_a_id)?.nome ?? '?'} {contarGols(p, p.time_a_id)} ×{' '}
                          {contarGols(p, p.time_b_id)} {timesPorId.get(p.time_b_id)?.nome ?? '?'}
                        </span>
                        <span className="font-medium text-emerald-700">
                          🏆 {timesPorId.get(p.time_vencedor_id)?.nome ?? '?'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {peladaFinalizada && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-neutral-900">Votação de MVP</h2>

              {pelada.avaliacao_aberta ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <p className="text-sm text-neutral-500">
                    {votosMvp.length} de {convocados.length} jogador{convocados.length === 1 ? '' : 'es'} já{' '}
                    {votosMvp.length === 1 ? 'votou' : 'votaram'}.
                  </p>
                  <button
                    type="button"
                    onClick={encerrarVotacao}
                    disabled={processando}
                    className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Encerrar votação
                  </button>
                </div>
              ) : podioMvp.length === 0 ? (
                <p className="text-sm text-neutral-400">A votação foi encerrada, mas ninguém votou.</p>
              ) : (
                <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
                  <pre className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 font-sans text-sm text-neutral-800">
                    {mensagemMvp}
                  </pre>
                  <button
                    type="button"
                    onClick={copiarMensagem}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    {copiado ? 'Copiado ✓' : '📋 Copiar mensagem'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function JogadorCard({ jogador, arrastavel = true, arrastando, onDragStart, onDragEnd, onRemover }) {
  const sigla = siglaPosicao(jogador.posicao)

  return (
    <div
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', jogador.id)
        onDragStart(jogador.id)
      }}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 ${
        arrastavel ? 'cursor-grab active:cursor-grabbing' : ''
      } ${arrastando ? 'opacity-40' : ''}`}
    >
      <JogadorAvatar jogador={jogador} className="h-7 w-7 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neutral-900">{jogador.nome}</p>
        <p className="text-xs text-neutral-400">
          {sigla ?? '—'} · Nv {jogador.nivel ?? '-'}
        </p>
      </div>
      {onRemover && (
        <button
          type="button"
          onClick={onRemover}
          title="Remover da pelada"
          className="shrink-0 px-1 text-neutral-300 hover:text-red-600"
        >
          ×
        </button>
      )}
    </div>
  )
}

function JogadorPartidaLinha({ jogador, gols, onMais, onMenos, disabled }) {
  const sigla = siglaPosicao(jogador.posicao)

  return (
    <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5">
      <JogadorAvatar jogador={jogador} className="h-7 w-7 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neutral-900">{jogador.nome}</p>
        <p className="text-xs text-neutral-400">{sigla ?? '—'}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onMenos}
          disabled={disabled || gols === 0}
          className="h-6 w-6 rounded-md border border-neutral-300 text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-4 text-center text-sm font-semibold text-neutral-900">{gols}</span>
        <button
          type="button"
          onClick={onMais}
          disabled={disabled}
          className="h-6 w-6 rounded-md border border-emerald-300 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  )
}
