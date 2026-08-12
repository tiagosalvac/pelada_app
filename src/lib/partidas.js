export function contarGols(partida, timeId) {
  return partida.gols.filter((g) => g.time_id === timeId).length
}

/**
 * Time(s) com mais vitórias entre as partidas finalizadas de uma pelada.
 * Empate é resolvido por saldo de gols; empate total retorna todos os empatados.
 */
export function calcularCampeoes(times, partidasFinalizadas) {
  if (partidasFinalizadas.length === 0) return []

  const stats = new Map(times.map((t) => [t.id, { vitorias: 0, golsPro: 0, golsContra: 0 }]))
  for (const p of partidasFinalizadas) {
    const golsA = contarGols(p, p.time_a_id)
    const golsB = contarGols(p, p.time_b_id)
    if (stats.has(p.time_a_id)) {
      stats.get(p.time_a_id).golsPro += golsA
      stats.get(p.time_a_id).golsContra += golsB
    }
    if (stats.has(p.time_b_id)) {
      stats.get(p.time_b_id).golsPro += golsB
      stats.get(p.time_b_id).golsContra += golsA
    }
    if (stats.has(p.time_vencedor_id)) {
      stats.get(p.time_vencedor_id).vitorias += 1
    }
  }

  const maxVitorias = Math.max(...[...stats.values()].map((s) => s.vitorias))
  const candidatos = times.filter((t) => stats.get(t.id)?.vitorias === maxVitorias)
  if (candidatos.length <= 1) return candidatos

  const saldo = (t) => {
    const s = stats.get(t.id)
    return s.golsPro - s.golsContra
  }
  const maxSaldo = Math.max(...candidatos.map(saldo))
  return candidatos.filter((t) => saldo(t) === maxSaldo)
}
