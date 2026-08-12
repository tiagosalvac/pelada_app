import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const MEDALHAS = ['🥇', '🥈', '🥉']

export default function AdminEstatisticas() {
  const [artilheiros, setArtilheiros] = useState([])
  const [vitorias, setVitorias] = useState([])
  const [mvps, setMvps] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro(null)

    // só entra no ranking quem já tem alguma coisa pra mostrar — evita lotar o top 10 com zeros
    const [golsResp, vitoriasResp, mvpsResp] = await Promise.all([
      supabase
        .from('view_gols_por_jogador')
        .select('*')
        .gt('total_gols', 0)
        .order('total_gols', { ascending: false })
        .limit(10),
      supabase
        .from('view_vitorias_por_jogador')
        .select('*')
        .gt('total_vitorias', 0)
        .order('total_vitorias', { ascending: false })
        .limit(10),
      supabase
        .from('view_mvps_por_jogador')
        .select('*')
        .gt('total_votos_mvp', 0)
        .order('total_votos_mvp', { ascending: false })
        .limit(10),
    ])

    if (golsResp.error || vitoriasResp.error || mvpsResp.error) {
      setErro('Não foi possível carregar as estatísticas.')
    } else {
      setArtilheiros(golsResp.data)
      setVitorias(vitoriasResp.data)
      setMvps(mvpsResp.data)
    }
    setCarregando(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Estatísticas</h1>
        <p className="mt-1 text-sm text-neutral-500">Ranking geral, somando todas as peladas.</p>
      </div>

      {erro && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {carregando ? (
        <p className="text-sm text-neutral-400">Carregando...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <RankingCard
            titulo="⚽ Artilheiros"
            itens={artilheiros}
            formatarValor={(i) => `${i.total_gols} gol${i.total_gols === 1 ? '' : 's'}`}
          />
          <RankingCard
            titulo="🏆 Mais vitórias"
            itens={vitorias}
            formatarValor={(i) => `${i.total_vitorias} vitória${i.total_vitorias === 1 ? '' : 's'}`}
          />
          <RankingCard
            titulo="🌟 Mais votos de MVP"
            itens={mvps}
            formatarValor={(i) => `${i.total_votos_mvp} voto${i.total_votos_mvp === 1 ? '' : 's'}`}
          />
        </div>
      )}
    </div>
  )
}

function RankingCard({ titulo, itens, formatarValor }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="text-xs text-neutral-400">Sem dados ainda.</p>
      ) : (
        <ol className="space-y-2">
          {itens.map((item, i) => (
            <li key={item.jogador_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-neutral-700">
                {MEDALHAS[i] ?? `${i + 1}.`} {item.nome}
              </span>
              <span className="shrink-0 font-medium text-neutral-900">{formatarValor(item)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
