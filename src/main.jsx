import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { JogadorAtualProvider } from './context/JogadorAtualContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <JogadorAtualProvider>
        <App />
      </JogadorAtualProvider>
    </BrowserRouter>
  </StrictMode>,
)
