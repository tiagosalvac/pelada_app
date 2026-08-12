export default function EmConstrucao({ titulo }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-neutral-900">{titulo}</h2>
      <p className="mt-1 text-sm text-neutral-400">Em construção — chega na próxima etapa.</p>
    </div>
  )
}
