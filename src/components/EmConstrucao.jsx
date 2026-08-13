export default function EmConstrucao({ titulo }) {
  return (
    <div className="rounded-lg border border-dashed border-amarelo-500/25 bg-azul-700 p-10 text-center">
      <h2 className="text-lg font-semibold text-white">{titulo}</h2>
      <p className="mt-1 text-sm text-texto-secundario">Em construção — chega na próxima etapa.</p>
    </div>
  )
}
