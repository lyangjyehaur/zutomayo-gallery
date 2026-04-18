import { MV_DATA } from '../data.js';
import imagesLoaded from 'https://esm.sh/imagesloaded';
import Masonry from 'https://esm.sh/masonry-layout';

export class UIManager {
    constructor(app) {
        this.app = app;
    }

    renderGallery(append = false) {
        const { currentPage, currentSortedData } = this.app.state;
        const pageSize = this.app.CONFIG.PAGE_SIZE;

        if (!append) {
            this.app.dom.songCards.innerHTML = '';
            this.app.dom.noMoreData?.classList.add('hidden');
        }

        const start = (currentPage - 1) * pageSize;
        const pageData = currentSortedData.slice(start, start + pageSize);

        if (pageData.length > 0) {
            const html = pageData.map(mv => this.generateCardHTML(mv)).join('');
            if (append) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const newCards = Array.from(tempDiv.children);
                const fragment = document.createDocumentFragment();
                newCards.forEach(card => fragment.appendChild(card));
                this.app.dom.songCards.appendChild(fragment);
                requestAnimationFrame(() => newCards.forEach(card => this.app.pluginManager.initAll(card)));
            } else {
                this.app.dom.songCards.innerHTML = html;
                this.app.pluginManager.initAll(this.app.dom.songCards);
            }
            this.app.paginationManager.bind();
        }

        const hasMore = (currentPage * pageSize) < currentSortedData.length;
        this.app.dom.noMoreData?.classList.toggle('hidden', hasMore);
        if (!append && hasMore) this.app.paginationManager.checkAnchor();
    }

    generateCardHTML(mv) {
        const isFav = this.app.state.favorites.includes(mv.id);
        const hasMultipleImgs = mv.coverImages && mv.coverImages.length > 1;
        const thumbUrl = this.app.utils.getProxyImgUrl(mv.coverImages?.[0] || '/default.jpg', 'thumb');

        let imgSection = '';
        if (hasMultipleImgs) {
            imgSection = `<div class="carousel slide carousel-random-speed" data-bs-pause="false"><div class="carousel-inner" style="aspect-ratio: 16/9; background:#2a2a30; overflow:hidden;">
                ${mv.coverImages.map((img, i) => `<div class="carousel-item ${i === 0 ? 'active' : ''}"><img ${i === 0 ? `src="${this.app.utils.getProxyImgUrl(img, 'thumb')}"` : `data-src="${this.app.utils.getProxyImgUrl(img, 'thumb')}"`} class="card-img-top w-100 ${i === 0 ? '' : 'lazy-carousel-img'}" style="aspect-ratio:16/9; object-fit:cover;" loading="lazy"></div>`).join('')}
            </div></div>`;
        } else {
            imgSection = `<img src="${thumbUrl}" class="card-img-top w-100" style="aspect-ratio:16/9; object-fit:cover; background:#2a2a30;" alt="${mv.title}" loading="lazy">`;
        }

        return `<div class="col" id="mv-card-${mv.id}">
            <div class="card song-item h-100 border-3 border-black rounded-none shadow-neo bg-[#15151a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all overflow-hidden" data-mv-id="${mv.id}">
                <button title="收藏" class="favorite-btn z-10 border-2 border-black shadow-neo-sm ${isFav ? 'active' : ''}">${isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>'}</button>
                ${imgSection}
                <div class="card-body p-3 text-center border-t-3 border-black">
                    <div class="card-title-container marquee-wrapper mb-1">
                        <h5 class="card-title mb-0 dotgothic16-regular font-bold marquee-content">${mv.title}</h5>
                    </div>
                    <p class="card-text small dotgothic16-regular opacity-75 mb-0">${mv.date}</p>
                </div>
            </div>
        </div>`;
    }

    openModal(id, source) {
        const mv = MV_DATA.find(m => m.id === id);
        if (!mv) return;
        this.app.utils.trackEvent('mv-modal-open', { type: 'interaction', id, title: mv.title, source });
        this.app.dom.songModal.dataset.currentMvId = id;
        this.app.utils.updateUrlHash(id);
        this.app.favoritesManager.setupModalBtn(id);
        this.app.dom.modalTitle.textContent = mv.title;
        this.app.dom.modalTitle.setAttribute("lang", "ja");
        this.app.dom.modalSubtitle.innerHTML = (mv.keywords || []).map(k => `<span class="text-light">${k.text || k}</span>`).join('<span class="text-white-50"> / </span>');

        this.renderModalDescription(mv.description);
        this.renderModalVideo(mv);

        this.app.state.modalGallery.currentMv = mv;
        this.app.state.modalGallery.currentIndex = 0;

        this.app.pluginManager.initWaline({ el: '#waline-mv', path: mv.id, saveInstance: true });
        this.app.instances.modal.show();
    }

    renderModalPhotosBatch() {
        const mv = this.app.state.modalGallery.currentMv;
        const { galleryContainer, modalLoadMoreBtn, modalLoadMoreContainer } = this.app.dom;
        if (!mv || this.app.state.modalGallery.isLoading || !this.app.dom.songModal.classList.contains('show')) return;

        const start = this.app.state.modalGallery.currentIndex;
        const batch = mv.images?.slice(start, start + this.app.CONFIG.MODAL_BATCH_SIZE) || [];

        if (start === 0 && batch.length === 0) {
            galleryContainer.innerHTML = '<span class="text-info">暫無設定圖</span>';
            galleryContainer.style.opacity = '1';
            return;
        }
        if (batch.length === 0) return;

        this.app.state.modalGallery.isLoading = true;
        if (modalLoadMoreBtn) {
            modalLoadMoreBtn.disabled = true;
            modalLoadMoreBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 處理中...';
        }

        const newNodes = batch.map((imgObj, i) => {
            const idx = start + i;
            const item = document.createElement('div');
            item.className = 'pswp-gallery__item';
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            const thumbUrl = this.app.utils.getProxyImgUrl(imgObj.url, 'small');
            const fullUrl = this.app.utils.getProxyImgUrl(imgObj.url, 'full');
            item.innerHTML = `
                <a class="gallery-item" href="${fullUrl}" data-download-filename="${mv.id}_${idx + 1}" data-raw-src="${imgObj.url}" data-title="${mv.title || ''}" data-caption="${imgObj.caption || ''}">
                    <img src="${thumbUrl}" alt="${mv.title}_${imgObj.caption}" class="img-fluid border-secondary" loading="lazy">
                </a>
                <div class="pswp-caption-content">${imgObj.richText || ''}</div>
                <div class="pswp-caption small text-center mt-1">${imgObj.caption || ''}</div>`;
            return item;
        });

        const fragment = document.createDocumentFragment();
        newNodes.forEach(node => fragment.appendChild(node));
        galleryContainer.appendChild(fragment);

        imagesLoaded(newNodes, () => {
            galleryContainer.style.opacity = '1';
            if (start === 0) {
                this.app.instances.msnry = new Masonry(galleryContainer, {
                    itemSelector: '.pswp-gallery__item',
                    columnWidth: '.pswp-gallery__item',
                    percentPosition: true,
                    gutter: 10,
                    transitionDuration: 0
                });
                this.app._modalResizeObserver = new ResizeObserver(this.app.utils.debounce(() => {
                    this.app.instances.msnry?.layout();
                }, 150));
                this.app._modalResizeObserver.observe(galleryContainer);
            } else {
                this.app.instances.msnry.appended(newNodes);
            }
            this.app.instances.msnry.layout();
            if (this.app.instances.lightbox?.pswp) this.app.instances.lightbox.pswp.refresh();
            requestAnimationFrame(() => {
                newNodes.forEach(node => { node.style.opacity = '1'; node.style.transform = 'translateY(0)'; });
            });
            this.app.state.modalGallery.currentIndex += batch.length;
            this.app.state.modalGallery.isLoading = false;
            const hasMore = this.app.state.modalGallery.currentIndex < mv.images.length;
            if (this.app.CONFIG.MODAL_GALLERY_TYPE === 'auto') {
                if (hasMore) this.app.instances.modalGalleryObserver.observe(newNodes[newNodes.length - 1]);
                if (modalLoadMoreContainer) modalLoadMoreContainer.classList.add('hidden');
            } else {
                if (modalLoadMoreBtn) { modalLoadMoreBtn.disabled = false; modalLoadMoreBtn.textContent = '載入更多'; }
                if (modalLoadMoreContainer) modalLoadMoreContainer.classList.toggle('hidden', !hasMore);
            }
            newNodes.forEach(node => {
                const link = node.querySelector('a');
                if (link) {
                    const tempImg = new Image();
                    tempImg.src = link.href; // 這是大圖的 URL
                    tempImg.onload = () => {
                        link.setAttribute('data-pswp-width', tempImg.width);
                        link.setAttribute('data-pswp-height', tempImg.height);
                    };
                }
            });
        });
    }

    renderModalVideo(mv) {
        const { videoContainer } = this.app.dom;
        videoContainer.innerHTML = '';
        const setupVideoInteraction = (container, type, vid) => {
            const coverUrl = mv.coverImages?.[0] || '';
            const platformIcons = {
                bilibili: `<i class="fa-brands fa-bilibili" style="font-size: 5rem; color: #FB7299;"></i>`,
                youtube: `<i class="fa-brands fa-youtube" style="font-size: 5rem; color: #FF0000;"></i>`
            };
            const currentIcon = platformIcons[type] || platformIcons.youtube;
            container.classList.add('video-placeholder', 'position-relative', 'overflow-hidden', 'rounded');
            container.innerHTML = `<img src="${this.app.utils.getProxyImgUrl(coverUrl, 'full')}" class="w-100 h-100 object-fit-cover opacity-50" alt="Video"><div class="play-icon-wrapper">${currentIcon}</div>`;
            container.onclick = () => {
                container.onclick = null;
                container.classList.remove('video-placeholder');
                container.innerHTML = '';
                const clone = document.getElementById('iframe-template').content.cloneNode(true);
                const ifr = clone.querySelector('iframe');
                ifr.src = type === 'bilibili' ? `https://player.bilibili.com/player.html?bvid=${vid}&autoplay=1&poster=1&muted=false` : `https://www.youtube.com/embed/${vid}?autoplay=1`;
                container.appendChild(clone);
            };
        };
        if (mv.youtube && mv.bilibili) {
            const tabs = document.getElementById('video-tabs-template').content.cloneNode(true);
            setupVideoInteraction(tabs.querySelector('#bilibili-pane .ratio'), 'bilibili', mv.bilibili);
            setupVideoInteraction(tabs.querySelector('#youtube-pane .ratio'), 'youtube', mv.youtube);
            videoContainer.appendChild(tabs);
        } else if (mv.youtube || mv.bilibili) {
            const wrap = document.createElement('div'); wrap.className = 'ratio ratio-16x9 mb-3 bg-dark';
            setupVideoInteraction(wrap, mv.youtube ? 'youtube' : 'bilibili', mv.youtube || mv.bilibili);
            videoContainer.appendChild(wrap);
        } else {
            videoContainer.innerHTML = '<div class="text-center p-4 border border-secondary rounded">暫無影片資源</div>';
        }
    }

    renderModalDescription(text) {
        [this.app.dom.mvDescriptionPC, this.app.dom.mvDescriptionMobile].forEach(el => {
            if (el) {
                el.innerHTML = text || '';
                el.style.opacity = '0';
            }
        });
        setTimeout(() => {
            [this.app.dom.mvDescriptionPC, this.app.dom.mvDescriptionMobile].forEach(el => {
                if (el) {
                    el.style.transition = 'opacity 0.3s ease';
                    el.style.opacity = '1';
                }
            });
        }, 300);
    }

    /**
     * 消息提示控制
     */
    showToast(title, isAdded, isCustom = false) {
        const { favToast, toastMsg, undoBtn } = this.app.dom;
        let ins = bootstrap.Toast.getOrCreateInstance(favToast, { delay: this.app.CONFIG.TOAST_DELAY });
        
        if (isCustom) {
            toastMsg.innerHTML = `<span style="color:#ffcf00;"><i class="fa-solid fa-wand-magic-sparkles"></i></span> ${title}`;
            undoBtn.style.display = 'none';
        } else {
            toastMsg.innerHTML = `<span style="color:#ffcf00;">${isAdded ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>'}</span> ${isAdded ? '已將' : '已取消收藏'}「<span class="fw-bold" lang="ja">${title}</span>」${isAdded ? '加入收藏' : ''}`;
            undoBtn.style.display = (!isAdded && this.app.state.lastFavoriteAction) ? 'block' : 'none';
        }
        
        favToast.classList.remove('bg-success', 'bg-dark');
        favToast.classList.add(isAdded ? 'bg-success' : 'bg-dark');
        ins.show();
    }

    hideToast() {
        bootstrap.Toast.getInstance(this.app.dom.favToast)?.hide();
    }

    /**
     * 重置 Modal 內容
     */
    resetModal() {
        this.app.state.modalGallery.currentMv = null;
        this.app.state.modalGallery.currentIndex = 0;
        this.app.state.modalGallery.isLoading = false;
        this.app.instances.modalGalleryObserver?.disconnect();

        if (this.app._modalResizeObserver) {
            this.app._modalResizeObserver.disconnect();
            this.app._modalResizeObserver = null;
        }
        if (this.app.instances.msnry) {
            this.app.instances.msnry.destroy();
            this.app.instances.msnry = null;
        }
        this.app.dom.videoContainer.innerHTML = '';
        this.app.dom.galleryContainer.innerHTML = '';
        this.app.dom.modalLoadMoreContainer?.classList.add('hidden');
        this.app.dom.galleryContainer.style.cssText = 'opacity: 0;';
        this.renderModalDescription('');
        
        if (this.app.instances.mvWaline) {
            this.app.instances.mvWaline.destroy();
            this.app.instances.mvWaline = null;
        }
        if (this.app.dom.walineMv) this.app.dom.walineMv.innerHTML = '';
    }
}
