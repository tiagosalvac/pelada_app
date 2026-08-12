export const POSICOES = [
  { value: 'goleiro', label: 'Goleiro', sigla: 'GOL' },
  { value: 'zagueiro', label: 'Zagueiro', sigla: 'ZAG' },
  { value: 'meio', label: 'Meio', sigla: 'MEI' },
  { value: 'atacante', label: 'Atacante', sigla: 'ATA' },
]

export function labelPosicao(posicao) {
  return POSICOES.find((p) => p.value === posicao)?.label ?? null
}

export function siglaPosicao(posicao) {
  return POSICOES.find((p) => p.value === posicao)?.sigla ?? null
}
