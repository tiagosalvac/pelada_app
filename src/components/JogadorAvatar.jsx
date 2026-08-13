/**
 * Foto do jogador, ou as iniciais do nome quando não há foto cadastrada.
 * `className` controla tamanho/tipografia (ex: "h-10 w-10 text-sm").
 */
export default function JogadorAvatar({ jogador, className = 'h-10 w-10 text-sm' }) {
  if (jogador.foto_url) {
    return (
      <img
        src={jogador.foto_url}
        alt={jogador.nome}
        className={`rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-azul-600 font-medium text-white ${className}`}
    >
      {jogador.nome.charAt(0).toUpperCase()}
    </div>
  )
}
