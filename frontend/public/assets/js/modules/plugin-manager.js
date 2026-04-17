import PhotoSwipeLightbox from 'https://unpkg.com/photoswipe/dist/photoswipe-lightbox.esm.js';
import PhotoSwipeDynamicCaption from 'https://unpkg.com/photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.esm.js';

export class PluginManager {
    constructor(app) {
        this.app = app;
    }

    initAll(scope) {
        scope.querySelectorAll('.carousel-random-speed:not([data-init])').forEach(el => {
            this.setupCarousel(el);
            el.setAttribute('data-init', 'true');
        });
        scope.querySelectorAll('.marquee-content:not([data-init])').forEach(el => {
            this.setupMarquee(el);
            el.setAttribute('data-init', 'true');
        });
    }

    setupCarousel(el) {
        const existing = bootstrap.Carousel.getInstance(el);
        if (existing) existing.dispose();
        el.removeAttribute('data-bs-ride');
        const randomInterval = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
        new bootstrap.Carousel(el, {
            interval: randomInterval,
            pause: false,
            ride: 'carousel'
        });
    }

    setupMarquee(titleEl) {
        const container = titleEl.parentElement;
        if (!container) return;
        if (!titleEl.dataset.originalHtml || titleEl.dataset.originalHtml !== titleEl.innerHTML) {
            titleEl.dataset.originalHtml = titleEl.innerHTML;
            titleEl.classList.remove('animate-marquee');
        }
        if (titleEl.offsetWidth >= container.offsetWidth + 5) {
            const originalHTML = titleEl.dataset.originalHtml;
            titleEl.innerHTML = `${originalHTML}&nbsp;&nbsp;&nbsp;&nbsp;${originalHTML}&nbsp;&nbsp;&nbsp;&nbsp;`;
            const duration = (titleEl.scrollWidth / 2) / this.app.CONFIG.MARQUEE_SPEED;
            titleEl.style.animationDuration = `${duration}s`;
            titleEl.classList.add('animate-marquee');
        }
    }

    initPhotoSwipe() {
        if (this.app.instances.lightbox) return;
        this.app.instances.lightbox = new PhotoSwipeLightbox({
            gallery: '#ztmy-gallery-container',
            children: 'div.pswp-gallery__item',
            wheelToZoom: true,
            pswpModule: () => import('https://unpkg.com/photoswipe/dist/photoswipe.esm.js')
        });
        this.app.instances.lightboxCaption = new PhotoSwipeDynamicCaption(this.app.instances.lightbox, { type: 'aside' });
        this.app.instances.lightbox.on('uiRegister', () => {
            this.app.instances.lightbox.pswp.ui.registerElement({
                name: 'caption',
                order: 5,
                tagName: 'div',
                className: 'pswp__caption marquee-wrapper width-auto text-center',
                html: `<div class="pswp__caption-content fw-bold fs-6 marquee-content"></div>`,
                onInit: (el, pswp) => {
                    pswp.on('change', () => {
                        const curr = pswp.currSlide?.data.element;
                        const link = curr?.querySelector('a.gallery-item');
                        const caption = link?.getAttribute('data-caption');
                        const title = link?.getAttribute('data-title');
                        const contentEl = el.querySelector('.pswp__caption-content');
                        if (contentEl) {
                            if (caption && title) {
                                contentEl.innerHTML = `<span lang="ja">${title}</span> ${caption}`;
                            } else if (title) {
                                contentEl.innerHTML = `<span lang="ja">${title}</span>`;
                            } else if (caption) {
                                contentEl.innerHTML = caption;
                            } else {
                                contentEl.innerHTML = '';
                            }
                            // 呼叫模組內部的跑馬燈初始化
                            this.setupMarquee(contentEl);
                        }
                    });
                }
            });

            

            // 3. 下載按鈕組 (保持原有邏輯)
            this.app.instances.lightbox.pswp.ui.registerElement({
                name: 'download-button-group',
                order: 8,
                tagName: 'div',
                className: 'pswp__download-wrapper',
                html: `<a type="button" class="pswp__button pswp__button--download-custom" title="下載原圖" data-umami-event="Z_download-original" data-umami-event-type="interaction" rel="noopener">
                    <svg width="32" height="32" viewBox="0 0 32 32" class="pswp__icn">
                    <use class="pswp__icn-shadow" xlink:href="#pswp__icn-download"></use>
                    <path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" id="pswp__icn-download"/></svg></a>
                                        <div class="pswp__download-popover alert alert-info p-2 shadow">
                <div class="d-flex align-items-center">
                    <span class="me-2" style="white-space: wrap;width:110px;font-size:0.675em;">網頁預覽存在畫質壓縮 如所需可點此下載原圖</span>
                    <button type="button" class="btn-close btn-close-white" style="font-size: 0.5rem; " data-umami-event="Z_download-popover-close" data-umami-event-type="interaction"></button>
                </div>
                <div class="popover-arrow"></div>
            </div>`,
                onInit: (el, pswp) => {
                    const closeBtn = el.querySelector('.btn-close');
                        const popover = el.querySelector('.pswp__download-popover');
                    pswp.on('change', () => {
                        const curr = pswp.currSlide?.data.element; 
                        const link = curr?.querySelector('a.gallery-item');
                        if (link) {
                            const rawSrc = link.getAttribute('data-raw-src');
                            const filename = link.getAttribute('data-download-filename');
                            el.querySelector('a').setAttribute('data-umami-event-content', link.getAttribute('data-download-filename'));
                            el.querySelector('a').href = this.app.utils.getProxyImgUrl(rawSrc, 'raw', filename);
                        }
                    });
                                            closeBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            popover.style.display = 'none';
                        };
                }
            });
        });
        this.app.instances.lightbox.init();
    }

    initLazyCarousel() {
        this.app.dom.songCards?.addEventListener('slide.bs.carousel', e => {
            const nextImg = e.relatedTarget.querySelector('.lazy-carousel-img');
            if (nextImg && nextImg.dataset.src) {
                nextImg.src = nextImg.dataset.src;
                nextImg.removeAttribute('data-src');
                nextImg.classList.remove('lazy-carousel-img');
                nextImg.onload = () => nextImg.closest('.placeholder-glow')?.classList.remove('placeholder-glow');
            }
        });
    }

    async initWaline({ el, path, saveInstance = false }) {
        if (!document.querySelector(el)) return;
        try {
            const { init } = await import('https://unpkg.com/@waline/client@v3/dist/waline.js');
            const instance = init({
                el: el,
                serverURL: this.app.CONFIG.WALINE_CONFIG.serverURL,
                path: path,
                emoji: this.app.CONFIG.WALINE_CONFIG.emoji,
                reaction: this.app.CONFIG.WALINE_CONFIG.reaction,
                dark: 'html[data-theme="dark"]',
                requiredMeta: ['nick'],
                locale: { reactionTitle: '' }
            });
            if (saveInstance) this.app.instances.mvWaline = instance;
        } catch (err) {
            console.error(`Waline failed to load for ${el}:`, err);
        }
    }
}