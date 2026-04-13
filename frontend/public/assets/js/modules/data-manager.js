import { MV_DATA } from '../data.js';

export class FilterManager {
    constructor(app) {
        this.app = app;
    }

    apply() {
        this.app.state.lastFavoriteAction = null;
        this.app.uiManager.hideToast();

        const keyword = this.app.dom.searchInput?.value.toLowerCase().trim() || "";
        const activeYear = this.app.dom.yearFilter?.value || "";
        const activeAlbum = this.app.dom.albumFilter?.value || "";
        const activeArtist = this.app.dom.artistFilter?.value || "";

        this.app.state.currentFilteredData = MV_DATA.filter(mv => {
            const matchFav = !this.app.state.showFavOnly || this.app.state.favorites.includes(mv.id);
            const matchKeyword = !keyword ||
                mv.title.toLowerCase().includes(keyword) ||
                (mv.keywords && mv.keywords.some(k => k.toLowerCase().includes(keyword)));
            const matchYear = !activeYear || mv.year === activeYear || (mv.date && mv.date.startsWith(activeYear));
            const matchAlbum = !activeAlbum || (mv.album && mv.album.includes(activeAlbum));
            const matchArtist = !activeArtist || mv.artist === activeArtist;

            return matchFav && matchKeyword && matchYear && matchAlbum && matchArtist;
        });

        const rawData = this.app.state.currentFilteredData;
        this.app.state.currentSortedData = this.app.state.currentSortOrder === 'desc' ? [...rawData].reverse() : [...rawData];
        this.app.dom.favNotice?.classList.toggle('hidden', !this.app.state.showFavOnly);
        this.app.state.currentPage = 1;
        this.app.uiManager.renderGallery(false);
    }
}

export class PaginationManager {
    constructor(app) {
        this.app = app;
    }

    init() {
        this.app.instances.cardObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                const hasMore = (this.app.state.currentPage * this.app.CONFIG.PAGE_SIZE) < this.app.state.currentSortedData.length;
                if (hasMore) {
                    this.app.state.currentPage++;
                    this.app.uiManager.renderGallery(true);
                }
            }
        }, { rootMargin: '300px', threshold: 0 });
    }

    bind() {
        if (this.app.dom.scrollAnchor && this.app.instances.cardObserver) {
            this.app.instances.cardObserver.disconnect();
            this.app.instances.cardObserver.observe(this.app.dom.scrollAnchor);
        }
    }

    checkAnchor() {
        requestAnimationFrame(() => {
            const anchor = this.app.dom.scrollAnchor;
            if (!anchor) return;
            const rect = anchor.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                this.app.state.currentPage++;
                this.app.uiManager.renderGallery(true);
            }
        });
    }
}