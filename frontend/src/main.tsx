import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TooltipProvider } from './components/ui/tooltip'
import CustomCursor from './components/ui/CustomCursor'
import '@hackernoon/pixel-icon-library/fonts/iconfont.css'
import './tailwind.css'
import './i18n'

// 強制舊版 PWA 檢查更新 (解決被 CDN / Nginx 快取卡住的問題)
const enablePwa = import.meta.env.PROD || import.meta.env.VITE_PWA_DEV === 'true'

if (enablePwa && 'serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    // 每次打開網頁時，強制去伺服器拉最新的 sw.js，略過本地瀏覽器快取
    registration.update().catch((err) => {
      console.error('Service Worker 強制更新失敗:', err);
    });
  });

  // 監聽 Controller 變更（這是給舊版 autoUpdate 用的）
  // 當舊版的 autoUpdate 下載完新的 SW 並啟動時，它會接管頁面 (controllerchange)
  // 此時我們強制重新整理頁面，確保載入最新資源
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
      <BrowserRouter 
        basename={import.meta.env.BASE_URL}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <CustomCursor />
        <ErrorBoundary>
          <TooltipProvider delayDuration={200} skipDelayDuration={0} disableHoverableContent>
            <App />
          </TooltipProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
