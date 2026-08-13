import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import JogadorAvatar from '../../components/JogadorAvatar'
import { POSICOES } from '../../lib/constants'

const FORM_VAZIO = {
  id: null,
  nome: '',
  foto_url: '',
  posicao: '',
  nivel: '',
}

const BUCKET_FOTOS = 'jogadores-fotos'

export default function AdminJogadores() {
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [previewLocal, setPreviewLocal] = useState(null)

  const editando = form.id !== null
  const previewFoto = previewLocal ?? form.foto_url

  useEffect(() => {
    buscarJogadores()
  }, [])

  async function buscarJogadores() {
    setCarregando(true)
    setErro(null)
    const { data, error } = await supabase
      .from('jogadores')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      setErro('Não foi possível carregar os jogadores. Tente recarregar a página.')
    } else {
      setJogadores(data)
    }
    setCarregando(false)
  }

  function iniciarEdicao(jogador) {
    setForm({
      id: jogador.id,
      nome: jogador.nome,
      foto_url: jogador.foto_url ?? '',
      posicao: jogador.posicao ?? '',
      nivel: jogador.nivel ?? '',
    })
    setPreviewLocal(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setForm(FORM_VAZIO)
    setPreviewLocal(null)
  }

  async function onFotoSelecionada(event) {
    const arquivo = event.target.files[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo depois, se precisar
    if (!arquivo) return

    setPreviewLocal(URL.createObjectURL(arquivo))
    setEnviandoFoto(true)
    setErro(null)

    const extensao = arquivo.name.split('.').pop() || 'jpg'
    const caminho = `${crypto.randomUUID()}.${extensao}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(caminho, arquivo, { cacheControl: '3600' })

    if (uploadError) {
      setErro('Não foi possível enviar a foto. Tente de novo.')
      setEnviandoFoto(false)
      return
    }

    const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho)
    setForm((f) => ({ ...f, foto_url: data.publicUrl }))
    setEnviandoFoto(false)
  }

  function removerFoto() {
    setPreviewLocal(null)
    setForm((f) => ({ ...f, foto_url: '' }))
  }

  async function salvar(event) {
    event.preventDefault()
    if (!form.nome.trim()) return

    setSalvando(true)
    setErro(null)

    const payload = {
      nome: form.nome.trim(),
      foto_url: form.foto_url.trim() || null,
      posicao: form.posicao || null,
      nivel: form.nivel ? Number(form.nivel) : null,
    }

    const { error } = editando
      ? await supabase.from('jogadores').update(payload).eq('id', form.id)
      : await supabase.from('jogadores').insert(payload)

    if (error) {
      setErro('Não foi possível salvar o jogador. Confira os dados e tente de novo.')
    } else {
      setForm(FORM_VAZIO)
      setPreviewLocal(null)
      await buscarJogadores()
    }
    setSalvando(false)
  }

  async function excluir(jogador) {
    const confirmado = window.confirm(`Remover "${jogador.nome}" do cadastro?`)
    if (!confirmado) return

    const { error } = await supabase.from('jogadores').delete().eq('id', jogador.id)
    if (error) {
      setErro('Não foi possível remover o jogador.')
    } else {
      if (form.id === jogador.id) setForm(FORM_VAZIO)
      await buscarJogadores()
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Jogadores</h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Cadastre quem participa da pelada. Esses dados são usados pra montar os times.
        </p>
      </div>

      {erro && (
        <div className="rounded-md border border-perigo/40 bg-perigo/10 px-4 py-3 text-sm text-perigo">
          {erro}
        </div>
      )}

      <form
        onSubmit={salvar}
        className="grid gap-4 rounded-lg border border-amarelo-500/25 bg-azul-700 p-5 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold text-white">
            {editando ? 'Editar jogador' : 'Novo jogador'}
          </h2>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-white/90">Nome *</span>
          <input
            type="text"
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="rounded-md border border-borda-input bg-azul-700 px-3 py-2 text-sm text-white placeholder:text-texto-secundario focus:border-amarelo-500 focus:outline-none focus:ring-2 focus:ring-amarelo-500"
            placeholder="Ex: João Silva"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-white/90">Foto</span>
          <div className="flex items-center gap-3">
            <JogadorAvatar
              jogador={{ nome: form.nome || '?', foto_url: previewFoto }}
              className="h-14 w-14 text-base"
            />
            <div className="flex flex-col items-start gap-1">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-borda-input px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-azul-600">
                {enviandoFoto ? 'Enviando...' : form.foto_url ? 'Trocar foto' : 'Escolher foto'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFotoSelecionada}
                  disabled={enviandoFoto}
                  className="hidden"
                />
              </label>
              {form.foto_url && !enviandoFoto && (
                <button
                  type="button"
                  onClick={removerFoto}
                  className="text-xs text-texto-secundario hover:text-perigo"
                >
                  Remover foto
                </button>
              )}
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-white/90">Posição</span>
          <select
            value={form.posicao}
            onChange={(e) => setForm({ ...form, posicao: e.target.value })}
            className="rounded-md border border-borda-input bg-azul-700 px-3 py-2 text-sm text-white focus:border-amarelo-500 focus:outline-none focus:ring-2 focus:ring-amarelo-500"
          >
            <option value="">Selecione</option>
            {POSICOES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-white/90">Nível (1-5)</span>
          <select
            value={form.nivel}
            onChange={(e) => setForm({ ...form, nivel: e.target.value })}
            className="rounded-md border border-borda-input bg-azul-700 px-3 py-2 text-sm text-white focus:border-amarelo-500 focus:outline-none focus:ring-2 focus:ring-amarelo-500"
          >
            <option value="">Selecione</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={salvando || enviandoFoto}
            className="rounded-md bg-amarelo-500 px-4 py-2 text-sm font-bold text-azul-900 hover:bg-amarelo-400 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Adicionar jogador'}
          </button>
          {editando && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="rounded-md border border-amarelo-500 px-4 py-2 text-sm font-medium text-amarelo-500 hover:bg-amarelo-500/10"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-white">
          Cadastrados {!carregando && `(${jogadores.length})`}
        </h2>

        {carregando ? (
          <p className="text-sm text-texto-secundario">Carregando...</p>
        ) : jogadores.length === 0 ? (
          <p className="text-sm text-texto-secundario">Nenhum jogador cadastrado ainda.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-amarelo-500/25">
            {jogadores.map((jogador, i) => (
              <li
                key={jogador.id}
                className={`flex items-center gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-azul-700' : 'bg-azul-900'}`}
              >
                <JogadorAvatar jogador={jogador} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{jogador.nome}</p>
                  <p className="text-xs text-texto-secundario">
                    {POSICOES.find((p) => p.value === jogador.posicao)?.label ?? 'Sem posição'}
                    {jogador.nivel ? ` · Nível ${jogador.nivel}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => iniciarEdicao(jogador)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-texto-secundario hover:bg-azul-600 hover:text-white"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => excluir(jogador)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-perigo hover:bg-perigo/10"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
