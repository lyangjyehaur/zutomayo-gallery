/**
 * ZUTOMAYO MV Gallery
 */
import { CONFIG } from './modules/config.js';
import { Utils } from './modules/utils.js';
import { UIManager } from './modules/ui-manager.js';
import { FavoritesManager } from './modules/favorites.js';
import { FilterManager, PaginationManager } from './modules/data-manager.js';
import { PluginManager } from './modules/plugin-manager.js';

class ZTMYMVApp {
    constructor() {
        if (typeof MV_DATA === 'undefined') {
            console.error('MV_DATA 未定義，請確保 data.js 已正確加載');
            return;
        }

        this.CONFIG = CONFIG;
        this.utils = new Utils(this);
        this.favoritesManager = new FavoritesManager(this);
        this.uiManager = new UIManager(this);
        this.filterManager = new FilterManager(this);
        this.paginationManager = new PaginationManager(this);
        this.pluginManager = new PluginManager(this);

        this.state = {
            favorites: this.favoritesManager.init(),
            currentFilteredData: [...MV_DATA],
            currentSortedData: [],
            currentPage: 1,
            currentSortOrder: 'desc',
            showFavOnly: false,
            lastFavoriteAction: null,
            modalGallery: {
                currentIndex: 0,
                currentMv: null,
                isLoading: false
            }
        };

        this.instances = {
            modal: null,
            msnry: null,
            lightbox: null,
            lightboxCaption: null,
            cardObserver: null,
            modalGalleryObserver: null,
            mvWaline: null
        };

        this._cacheDOM();
        this.init();
    }

    _cacheDOM() {
        this.dom = {
            songCards: document.getElementById('songCards'),
            searchInput: document.getElementById('searchInput'),
            favOnlyBtn: document.getElementById('favOnlyBtn'),
            scrollAnchor: document.getElementById('scroll-anchor'),
            noMoreData: document.getElementById('no-more-data'),
            songModal: document.getElementById('songModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalSubtitle: document.getElementById('modalHeaderSubtitle'),
            mvDescriptionPC: document.getElementById('mvDescriptionPC'),
            mvDescriptionMobile: document.getElementById('mvDescriptionMobile'),
            videoContainer: document.getElementById('videoContainer'),
            galleryContainer: document.getElementById('ztmy-gallery-container'),
            modalLoadMoreContainer: document.getElementById('modal-load-more-container'),
            modalLoadMoreBtn: document.getElementById('modal-load-more-btn'),
            favToast: document.getElementById('favToast'),
            toastMsg: document.getElementById('toastMessage'),
            undoBtn: document.getElementById('undoFavBtn'),
            yearFilter: document.getElementById('yearFilter'),
            albumFilter: document.getElementById('albumFilter'),
            artistFilter: document.getElementById('artistFilter'),
            favNotice: document.getElementById('fav-notice'),
            feedbackModal: document.getElementById('feedbackModal'),
            walineMv: document.getElementById('waline-mv'),
            changelogModal: document.getElementById('changelogModal'),
            versionBadge: document.getElementById('version-badge')
        };
    }

    init() {
        if (this.dom.songModal) {
            this.instances.modal = new bootstrap.Modal(this.dom.songModal, { focus: false });
        }
        this.paginationManager.init();
        this._bindEvents();
        this.pluginManager.initLazyCarousel();
        this.utils.initAnalytics();
        this.utils.printEgg();
        this.filterManager.apply();
        this.utils.checkInitialHash();
        this.utils.registerServiceWorker();
    }

    _bindEvents() {
        const debouncedFilter = this.utils.debounce((e) => {
            this.utils.trackEvent('search-input', { type: 'filter', value: e.target.value });
            this.filterManager.apply();
        }, 400);
        this.dom.searchInput?.addEventListener('input', debouncedFilter);

        ['yearFilter', 'albumFilter', 'artistFilter'].forEach(id => {
            this.dom[id]?.addEventListener('change', (e) => {
                this.utils.trackEvent(`filter-${id}`, { type: 'filter', filterType: id, value: e.target.value });
                this.filterManager.apply();
            });
        });

        document.getElementById("reverseBtn")?.addEventListener("click", () => {
            this.state.currentSortOrder = this.state.currentSortOrder === 'desc' ? 'asc' : 'desc';
            this.utils.trackEvent('reverse-sort', { type: 'filter', order: this.state.currentSortOrder });
            this.filterManager.apply();
        });

        this.dom.favOnlyBtn?.addEventListener('click', (e) => this.favoritesManager.toggleFavOnlyMode(e));
        this.dom.undoBtn?.addEventListener('click', (e) => this.favoritesManager.handleUndo(e));

        this.dom.songCards?.addEventListener('click', (e) => {
            const favBtn = e.target.closest('.favorite-btn');
            const card = e.target.closest('.card[data-mv-id]');
            if (favBtn && card) {
                e.preventDefault();
                e.stopPropagation();
                this.favoritesManager.handleClick(card.dataset.mvId, 'card');
            } else if (card) {
                this.uiManager.openModal(card.dataset.mvId, 'manual');
            }
        });

        this.dom.songModal?.addEventListener('shown.bs.modal', () => {
            this.pluginManager.initPhotoSwipe();
            this.utils.adjustPcDescriptionHeight();
            this.uiManager.renderModalPhotosBatch();
        });

        this.dom.songModal?.addEventListener('hidden.bs.modal', () => {
            this.uiManager.resetModal();
            this.utils.updateUrlHash(this.state.showFavOnly ? 'favorites' : null);
            this.dom.songModal.dataset.currentMvId = "";
        });

        this.dom.modalLoadMoreBtn?.addEventListener('click', () => {
            this.uiManager.renderModalPhotosBatch();
        });

        this._debouncedAdjustHeight = this.utils.debounce(() => {
            if (this.dom.songModal?.classList.contains('show')) {
                this.utils.adjustPcDescriptionHeight();
            }
        }, 200);
        window.addEventListener('resize', this._debouncedAdjustHeight);

        this.dom.feedbackModal?.addEventListener('shown.bs.modal', () => {
            this.utils.updateUrlHash('feedback');
            this.pluginManager.initWaline({
                el: '#waline',
                path: this.CONFIG.WALINE_CONFIG.path
            });
        }, { once: true });

        this.dom.feedbackModal?.addEventListener('show.bs.modal', () => {
            this.utils.updateUrlHash('feedback');
        });

        this.dom.feedbackModal?.addEventListener('hidden.bs.modal', () => {
            this.utils.updateUrlHash(this.state.showFavOnly ? 'favorites' : null);
        });

        this.dom.changelogModal?.addEventListener('show.bs.modal', () => {
            this.utils.updateUrlHash('changelog');
        });

        this.dom.changelogModal?.addEventListener('hidden.bs.modal', () => {
            this.utils.updateUrlHash(this.state.showFavOnly ? 'favorites' : null);
        });

        let eggClickCount = 0;
        let eggTimer = null;
        let longPressTimer = null;

        const triggerEgg = () => {
            eggClickCount = 0;
            clearTimeout(eggTimer);
            this.utils.playZTMYEggAnimation();
            this.uiManager.showToast('恭喜發現隱藏彩蛋！(°∀°)ﾉ ', true, true);
            this.utils.trackEvent('easter-egg-triggered', { type: 'interaction' });
        };

        this.dom.versionBadge?.addEventListener('click', (e) => {
            e.preventDefault();
            eggClickCount++;
            clearTimeout(eggTimer);
            if (eggClickCount === 5) {
                triggerEgg();
            } else {
                eggTimer = setTimeout(() => {
                    if (eggClickCount > 0 && eggClickCount < 5) {
                        const changelogModalIns = bootstrap.Modal.getOrCreateInstance(this.dom.changelogModal);
                        this.utils.trackEvent('changelog-modal-open', { source: 'version-badge' });
                        this.utils.updateUrlHash('changelog');
                        changelogModalIns.show();
                    }
                    eggClickCount = 0;
                }, 300);
            }
        });

        this.dom.versionBadge?.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => triggerEgg(), 1000);
        });
        this.dom.versionBadge?.addEventListener('touchend', () => clearTimeout(longPressTimer));
        this.dom.versionBadge?.addEventListener('touchmove', () => clearTimeout(longPressTimer));

        this.instances.modalGalleryObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && this.state.modalGallery.currentMv) {
                this.uiManager.renderModalPhotosBatch();
            }
        }, { rootMargin: '200px' });
    }


}

const app = new ZTMYMVApp();