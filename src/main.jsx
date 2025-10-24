import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// --- FIX FOR 'buffer' and 'global' ---
// We must provide these for the 'hashconnect' library
import { Buffer } from 'buffer'
window.Buffer = Buffer
window.global = window
// --- END FIX ---

ReactDOM.createRoot(document.getElementById('root')).render(
  // By removing StrictMode, we prevent the double-init bug with HashConnect
  <App />
)

