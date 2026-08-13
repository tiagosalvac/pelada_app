import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useJogadorAtual } from '../../context/JogadorAtualContext'

export default function JogadorEstatisticas() {
  const { jogadorAtual } = useJogadorAtual()

  const [gols, setGols] = useState(null)
  const [vitorias, setVitorias] = useState(null)
  const [mvps, setMvps] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro(null)

    const [golsResp, vitoriasResp, mvpsResp] = await Promise.all([
      supabase.from('view_gols_por_jogador').select('*').eq('jogador_id', jogadorAtual.id).maybeSingle(),
      supabase.from('view_vitorias_por_jogador').select('*').eq('jogador_id', jogadorAtual.id).maybeSingle(),
      supabase.from('view_mvps_por_jogador').select('*').eq('jogador_id', jogadorAtual.id).maybeSingle(),
    ])

    if (golsResp.error || vitoriasResp.error || mvpsResp.error) {
      setErro('Não foi possível carregar suas estatísticas.')
    } else {
      setGols(golsResp.data)
      setVitorias(vitoriasResp.data)
      setMvps(mvpsResp.data)
    }
    setCarregando(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Suas estatísticas</h1>
        <p className="mt-1 text-sm text-texto-secundario">Somando todas as peladas que você jogou.</p>
      </div>

      {erro && (
        <div className="rounded-md border border-perigo/40 bg-perigo/10 px-4 py-3 text-sm text-perigo">{erro}</div>
      )}

      {carregando ? (
        <p className="text-sm text-texto-secundario">Carregando...</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatTile emoji="⚽" label="Gols" valor={gols?.total_gols ?? 0} />
          <StatTile emoji="🏆" label="Vitórias" valor={vitorias?.total_vitorias ?? 0} />
          <StatTile emoji="🌟" label="Votos de MVP" valor={mvps?.total_votos_mvp ?? 0} />
        </div>
      )}
    </div>
  )
}

function StatTile({ emoji, label, valor, sub }) {
  return (
    <div className="rounded-lg border border-amarelo-500/25 bg-azul-700 p-4 text-center">
      <p className="text-2xl">{emoji}</p>
      <p className="mt-1 text-2xl font-bold text-amarelo-500">{valor}</p>
      <p className="text-xs text-texto-secundario">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-texto-secundario">{sub}</p>}
    </div>
  )
}
