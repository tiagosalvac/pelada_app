import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'pelada_app:jogador_atual'

const JogadorAtualContext = createContext(null)

function lerJogadorSalvo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Guarda quem é o jogador "logado" no navegador (sem senha, só identificação).
 * Persiste em localStorage pra não pedir de novo a cada visita no mesmo aparelho.
 */
export function JogadorAtualProvider({ children }) {
  const [jogadorAtual, setJogadorAtualState] = useState(lerJogadorSalvo)

  function setJogadorAtual(jogador) {
    setJogadorAtualState(jogador)
    if (jogador) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jogador))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return (
    <JogadorAtualContext.Provider value={{ jogadorAtual, setJogadorAtual }}>
      {children}
    </JogadorAtualContext.Provider>
  )
}

export function useJogadorAtual() {
  const ctx = useContext(JogadorAtualContext)
  if (!ctx) {
    throw new Error('useJogadorAtual precisa ser usado dentro de <JogadorAtualProvider>')
  }
  return ctx
}
