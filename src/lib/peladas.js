import { supabase } from './supabaseClient'

/**
 * Pelada mais recente (por data) que esse jogador foi convocado.
 * Passe `apenasAvaliacaoAberta: true` pra filtrar só peladas com avaliação liberada.
 */
export async function buscarPeladaMaisRecenteDoJogador(jogadorId, { apenasAvaliacaoAberta = false } = {}) {
  const { data: vinculos, error: vinculosError } = await supabase
    .from('pelada_jogadores')
    .select('pelada_id')
    .eq('jogador_id', jogadorId)

  if (vinculosError || !vinculos || vinculos.length === 0) return null

  let query = supabase
    .from('peladas')
    .select('*')
    .in('id', vinculos.map((v) => v.pelada_id))
    .order('data', { ascending: false })
    .limit(1)

  if (apenasAvaliacaoAberta) query = query.eq('avaliacao_aberta', true)

  const { data, error } = await query
  if (error || !data || data.length === 0) return null
  return data[0]
}
