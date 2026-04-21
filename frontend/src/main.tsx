import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TooltipProvider } from './components/ui/tooltip'
import '@hackernoon/pixel-icon-library/fonts/iconfont.css'
import './tailwind.css'
import './i18n'

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <TooltipProvider delayDuration={200}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
          </BrowserRouter>
        </TooltipProvider>
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>,
)
