import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

try {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.add('light')
    if (!savedTheme) {
      localStorage.setItem('theme', 'light')
    }
  }
} catch (e) {
  // Fallback to light if storage is unavailable.
  document.documentElement.classList.add('light')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
