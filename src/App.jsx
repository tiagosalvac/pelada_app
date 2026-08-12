import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import AdminLayout from './layouts/AdminLayout'
import AdminJogadores from './pages/admin/Jogadores'
import AdminPeladas from './pages/admin/Peladas'
import AdminPeladaDetalhe from './pages/admin/PeladaDetalhe'
import AdminEstatisticas from './pages/admin/Estatisticas'
import JogadorLayout from './layouts/JogadorLayout'
import JogadorIdentificacao from './pages/jogador/Identificacao'
import JogadorAvaliar from './pages/jogador/Avaliar'
import JogadorResultado from './pages/jogador/Resultado'
import JogadorEstatisticas from './pages/jogador/Estatisticas'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="jogadores" replace />} />
        <Route path="jogadores" element={<AdminJogadores />} />
        <Route path="peladas" element={<AdminPeladas />} />
        <Route path="peladas/:peladaId" element={<AdminPeladaDetalhe />} />
        <Route path="estatisticas" element={<AdminEstatisticas />} />
      </Route>

      <Route path="/jogador" element={<JogadorLayout />}>
        <Route index element={<JogadorIdentificacao />} />
        <Route path="avaliar" element={<JogadorAvaliar />} />
        <Route path="resultado" element={<JogadorResultado />} />
        <Route path="estatisticas" element={<JogadorEstatisticas />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
