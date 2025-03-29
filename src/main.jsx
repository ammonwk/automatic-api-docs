import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { OpenApiProvider } from './contexts/OpenApiContext'
import 'bootstrap/dist/css/bootstrap.min.css'
// Using GitHub Dark theme for syntax highlighting
import 'highlight.js/styles/github-dark.min.css'
import './styles/index.css' // Main custom styles
import './index.css' // Root styles (optional, could merge into styles/index.css)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OpenApiProvider>
      <App />
    </OpenApiProvider>
  </React.StrictMode>,
)
