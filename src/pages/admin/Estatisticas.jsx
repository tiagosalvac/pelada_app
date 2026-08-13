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
        <h1 className="text-xl font-semibold text-white">Estatísticas</h1>
        <p className="mt-1 text-sm text-texto-secundario">Ranking geral, somando todas as peladas.</p>
      </div>

      {erro && (
        <div className="rounded-md border border-perigo/40 bg-perigo/10 px-4 py-3 text-sm text-perigo">{erro}</div>
      )}

      {carregando ? (
        <p className="text-sm text-texto-secundario">Carregando...</p>
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
    <div className="rounded-lg border border-amarelo-500/25 bg-azul-700 p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="text-xs text-texto-secundario">Sem dados ainda.</p>
      ) : (
        <ol className="space-y-2">
          {itens.map((item, i) => (
            <li key={item.jogador_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-white/90">
                {MEDALHAS[i] ?? `${i + 1}.`} {item.nome}
              </span>
              <span className="shrink-0 font-semibold text-amarelo-500">{formatarValor(item)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
