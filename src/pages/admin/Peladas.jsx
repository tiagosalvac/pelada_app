import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import JogadorAvatar from '../../components/JogadorAvatar'
import { siglaPosicao } from '../../lib/constants'

const STATUS_LABEL = {
  em_andamento: 'Em andamento',
  finalizada: 'Finalizada',
}

const STATUS_CLASSE = {
  em_andamento: 'bg-brand-50 text-brand-700',
  finalizada: 'bg-neutral-100 text-neutral-500',
}

function dataParaInput(date) {
  const semFuso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return semFuso.toISOString().slice(0, 16)
}

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function AdminPeladas() {
  const navigate = useNavigate()
  const [peladas, setPeladas] = useState([])
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [dataForm, setDataForm] = useState(() => dataParaInput(new Date()))
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro(null)

    const [peladasResp, jogadoresResp] = await Promise.all([
      supabase.from('peladas').select('*').order('data', { ascending: false }),
      supabase.from('jogadores').select('*').order('nome', { ascending: true }),
    ])

    if (peladasResp.error || jogadoresResp.error) {
      setErro('Não foi possível carregar os dados. Tente recarregar a página.')
    } else {
      setPeladas(peladasResp.data)
      setJogadores(jogadoresResp.data)
    }
    setCarregando(false)
  }

  function alternarSelecionado(jogadorId) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(jogadorId)) {
        novo.delete(jogadorId)
      } else {
        novo.add(jogadorId)
      }
      return novo
    })
  }

  function selecionarTodos() {
    setSelecionados(new Set(jogadores.map((j) => j.id)))
  }

  function limparSelecao() {
    setSelecionados(new Set())
  }

  async function criarPelada(event) {
    event.preventDefault()
    setCriando(true)
    setErro(null)

    const { data: pelada, error } = await supabase
      .from('peladas')
      .insert({ data: new Date(dataForm).toISOString() })
      .select()
      .single()

    if (error) {
      setErro('Não foi possível criar a pelada. Tente de novo.')
      setCriando(false)
      return
    }

    if (selecionados.size > 0) {
      const linhas = [...selecionados].map((jogadorId) => ({
        pelada_id: pelada.id,
        jogador_id: jogadorId,
      }))
      const { error: convocarError } = await supabase.from('pelada_jogadores').insert(linhas)
      if (convocarError) {
        setErro('Pelada criada, mas não foi possível convocar os jogadores selecionados.')
        setCriando(false)
        return
      }
    }

    navigate(`/admin/peladas/${pelada.id}`)
  }

  async function excluir(pelada) {
    const confirmado = window.confirm(
      `Remover a pelada de ${formatarData(pelada.data)}? Isso apaga os times montados também.`,
    )
    if (!confirmado) return

    setErro(null)

    // peladas tem ON DELETE CASCADE pra times/convocados (e times pra time_jogadores),
    // então apagar a pelada já limpa tudo que depende dela.
    const { error } = await supabase.from('peladas').delete().eq('id', pelada.id)
    if (error) {
      setErro('Não foi possível remover a pelada.')
    } else {
      await carregar()
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Peladas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Crie uma pelada, escolha quem vai jogar e monte os times.
        </p>
      </div>

      {erro && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <form
        onSubmit={criarPelada}
        className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5"
      >
        <label className="flex w-fit flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Data e horário</span>
          <input
            type="datetime-local"
            required
            value={dataForm}
            onChange={(e) => setDataForm(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">
              Quem vai jogar? {selecionados.size > 0 && `(${selecionados.size} selecionado${selecionados.size > 1 ? 's' : ''})`}
            </span>
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={selecionarTodos} className="text-brand-700 hover:underline">
                Selecionar todos
              </button>
              <button type="button" onClick={limparSelecao} className="text-neutral-400 hover:underline">
                Limpar
              </button>
            </div>
          </div>

          {jogadores.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Nenhum jogador cadastrado ainda.{' '}
              <Link to="/admin/jogadores" className="text-brand-700 hover:underline">
                Cadastre jogadores
              </Link>{' '}
              antes de criar uma pelada.
            </p>
          ) : (
            <div className="grid max-h-72 gap-1 overflow-y-auto rounded-md border border-neutral-200 p-2 sm:grid-cols-2">
              {jogadores.map((jogador) => {
                const marcado = selecionados.has(jogador.id)
                return (
                  <label
                    key={jogador.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      marcado ? 'bg-brand-50' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternarSelecionado(jogador.id)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <JogadorAvatar jogador={jogador} className="h-7 w-7 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-neutral-900">{jogador.nome}</p>
                      <p className="text-xs text-neutral-400">
                        {siglaPosicao(jogador.posicao) ?? '—'} · Nv {jogador.nivel ?? '-'}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={criando}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {criando ? 'Criando...' : 'Criar pelada'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Histórico {!carregando && `(${peladas.length})`}
        </h2>

        {carregando ? (
          <p className="text-sm text-neutral-400">Carregando...</p>
        ) : peladas.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma pelada criada ainda.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {peladas.map((pelada) => (
              <li key={pelada.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900">{formatarData(pelada.data)}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSE[pelada.status]}`}
                  >
                    {STATUS_LABEL[pelada.status] ?? pelada.status}
                  </span>
                </div>

                <Link
                  to={`/admin/peladas/${pelada.id}`}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  Montar times
                </Link>
                <button
                  type="button"
                  onClick={() => excluir(pelada)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
