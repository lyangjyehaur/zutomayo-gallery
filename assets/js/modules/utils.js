export class Utils {
    constructor(app) {
        this.app = app;
        this._trackBuffer = [];
        this._isPollingUmami = false;
        this._urlCache = {};
        // 預先判定是否為本地環境，避免重複執行判定邏輯
        this.isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) || window.location.protocol === 'file:';
    }

    trackEvent(name, data) {
        // 如果是本地環境，直接跳過統計邏輯，防止污染正式數據或產生無效緩衝
        if (this.isLocal) return;

        if (window.umami) {
            window.umami.track(name, data);
            return;
        }

        if (Array.isArray(this._trackBuffer)) {
            this._trackBuffer.push({ name, data });
        }

        if (!this._isPollingUmami) {
            this._isPollingUmami = true;
            const checkInterval = setInterval(() => {
                if (window.umami) {
                    this._trackBuffer.forEach(ev => window.umami.track(ev.name, ev.data));
                    this._trackBuffer = [];
                    this._isPollingUmami = false;
                    clearInterval(checkInterval);
                }
            }, 500);
            setTimeout(() => {
                if (this._isPollingUmami) {
                    clearInterval(checkInterval);
                    this._isPollingUmami = false;
                    this._trackBuffer = [];
                }
            }, 10000);
        }
    }

    debounce(func, delay) {
        let timer = null;
        return (...args) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => func.apply(this.app, args), delay);
        };
    }

    getProxyImgUrl(rawUrl, mode = 'thumb', customFilename = '') {
        const cacheKey = `${rawUrl}_${mode}_${customFilename}`;
        if (this._urlCache[cacheKey]) return this._urlCache[cacheKey];
        if (!rawUrl || rawUrl.startsWith('data:')) return rawUrl;
        
        let targetUrl = rawUrl;
        if (targetUrl.includes('pbs.twimg.com')) {
            const cleanUrl = targetUrl.split('?')[0];
            const format = new URLSearchParams(targetUrl.split('?')[1] || '').get('format') || 'jpg';
            const name = mode === 'raw' ? 'orig' : (mode === 'full' ? 'large' : 'small');
            targetUrl = `${cleanUrl}?format=${format}&name=${name}`;
        }
        const base64Url = this.safeBase64(targetUrl);
        let params = [];
        if (mode === 'raw') {
            params.push('raw:1', 'return_attachment:1');
            if (customFilename) params.push(`filename:${this.safeBase64(customFilename)}:1`);
        } else if (mode === 'full' || mode === 'small') {
            params.push('f:webp');
        } else {
            params.push('rs:fill:400', 'f:webp');
        }
        const finalUrl = `${this.app.CONFIG.PROXY_BASE}${params.join('/')}/${base64Url}`;
        this._urlCache[cacheKey] = finalUrl;
        return finalUrl;
    }

    safeBase64(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode('0x' + p1))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').catch(err => console.error('PWA SW failed', err));
            });
        }
    }

    playZTMYEggAnimation() {
        const overlay = document.createElement('div');
        overlay.className = 'ztmy-pixel-overlay';
        overlay.innerHTML = `<div class="pixel-container"><div class="pixel-nira"></div><div class="pixel-text dotgothic16-regular">UNIGURI DETECTED!</div><div class="crt-scanlines"></div></div>`;
        document.body.appendChild(overlay);
        if (!document.getElementById('ztmy-egg-style')) {
            const style = document.createElement('style');
            style.id = 'ztmy-egg-style';
            style.innerHTML = `.ztmy-pixel-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:9999; display:flex; align-items:center; justify-content:center; pointer-events:auto; cursor:wait; animation: fadeIn 0.3s forwards; } .pixel-text { color:#00ff00; font-size:2rem; margin-top:20px; text-shadow: 0 0 10px #00ff00; } .toast-container { z-index: 10001 !important; } .crt-scanlines { position:absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); background-size: 100% 4px, 3px 100%; pointer-events: none; } @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }`;
            document.head.appendChild(style);
        }
        setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 500); }, 2500);
    }

    adjustPcDescriptionHeight() {
        if (window.innerWidth < 992) return;
        const videoRect = this.app.dom.videoContainer.getBoundingClientRect();
        const availableHeight = window.innerHeight - videoRect.bottom - 60;
        if (this.app.dom.mvDescriptionPC) {
            this.app.dom.mvDescriptionPC.style.maxHeight = `${Math.max(availableHeight, 200)}px`;
        }
    }

    updateUrlHash(id) {
        const newHash = id ? `#${id}` : "";
        if (window.location.hash !== newHash) {
            history.replaceState(null, '', newHash === "" ? window.location.pathname + window.location.search : newHash);
        }
    }

    checkInitialHash() {
        const hash = window.location.hash;
        if (!hash) return;
        if (hash === '#favorites') {
            this.app.state.showFavOnly = true;
            this.trackEvent('view-favorites-direct', { source: 'hash' });
            this.app.dom.favOnlyBtn?.classList.replace('btn-outline-warning', 'btn-warning');
            this.app.filterManager.apply();
        } else if (hash === '#feedback') {
            this.trackEvent('feedback-modal-open', { source: 'hash' });
        } else if (hash === '#changelog') {
            this.trackEvent('changelog-modal-open', { source: 'hash' });
        } else if (hash && !['#feedbackModal', '#feedback', '#changelogModal', '#changelog'].includes(hash)) {
            // 在 React 版本中，Hash 開啟 Modal 邏輯已移至 App.jsx 的 useEffect
        }
    }

    printEgg() {
            console.log(
                "%c ZUTOMAYO MV Gallery %c V2.7 %c\n%cお 勉 強 し と い て よ ！ %c\n\n(°∀°)ﾉ ZTMY MV Gallery歡迎你，好奇心是前進的動力。\n如有前端開發、UI改善建議或Bug回報，請點擊頁首反饋連結！",
                "background:#1a1a20;color:#00ff00;padding:5px 10px;border-radius:5px 0 0 5px;font-family:DotGothic16;",
                "background:#0dcaf0;color:#fff;padding:5px 10px;border-radius:0 5px 5px 0;font-family:sans-serif;",
                "", "color:#ffcf00;font-size:20px;font-weight:bold;font-family:DotGothic16;", ""
            );
    }


        /**
     * 初始化 Umami 統計（僅限非本地環境）
     */
    initAnalytics() {
        if (this.isLocal) {
            console.log('本地環境，跳過 Umami 統計加載');
            return;
        }

        const script = document.createElement('script');
        script.src = "https://u.danndann.cn/script.js";
        script.defer = true;
        script.setAttribute('data-website-id', '405e07a8-7aae-41a6-bdb9-6851e898ab0c');
        document.head.appendChild(script);
    }
}
