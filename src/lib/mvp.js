/**
 * Agrupa os votos em posições (1º, 2º, 3º lugar) pela contagem de votos.
 * Empate mantém todo mundo na mesma posição — por isso pode sair mais de 3 nomes.
 * Retorna até 3 "degraus": [{ votos, jogadorIds: [...] }, ...]
 */
export function calcularPodioMvp(votos) {
  const contagem = new Map()
  for (const v of votos) {
    contagem.set(v.avaliado_id, (contagem.get(v.avaliado_id) ?? 0) + 1)
  }

  const ordenado = [...contagem.entries()]
    .map(([jogadorId, total]) => ({ jogadorId, votos: total }))
    .sort((a, b) => b.votos - a.votos)

  const degraus = []
  for (const item of ordenado) {
    let degrau = degraus.find((d) => d.votos === item.votos)
    if (!degrau) {
      if (degraus.length === 3) break
      degrau = { votos: item.votos, jogadorIds: [] }
      degraus.push(degrau)
    }
    degrau.jogadorIds.push(item.jogadorId)
  }
  return degraus
}

/** Quem fez mais gols dentro de uma pelada (empate retorna todos os empatados). */
export function calcularArtilheirosDaPelada(gols) {
  const contagem = new Map()
  for (const g of gols) {
    contagem.set(g.jogador_id, (contagem.get(g.jogador_id) ?? 0) + 1)
  }
  if (contagem.size === 0) return []

  const max = Math.max(...contagem.values())
  return [...contagem.entries()]
    .filter(([, total]) => total === max)
    .map(([jogadorId]) => ({ jogadorId, gols: max }))
}
