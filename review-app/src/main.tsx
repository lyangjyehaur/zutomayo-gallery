import React from 'react'
import ReactDOM from 'react-dom/client'
import Framework7 from 'framework7/lite-bundle'
import Framework7React from 'framework7-react'
import App from './App'
import './index.css'

// Framework7.use() is a static initialization method, not a React Hook.
// It registers the React plugin with Framework7 before any components render.
// eslint-disable-next-line react-hooks/rules-of-hooks
Framework7.use(Framework7React)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {},
      onOfflineReady() {},
    })
  })
}
