export class FavoritesManager {
    constructor(app) {
        this.app = app;
    }

    init() {
        let favs = JSON.parse(localStorage.getItem(this.app.CONFIG.STORAGE_KEY)) || [];
        const oldFavs = localStorage.getItem(this.app.CONFIG.OLD_STORAGE_KEY);
        if (favs.length === 0 && oldFavs) {
            favs = JSON.parse(oldFavs);
            localStorage.setItem(this.app.CONFIG.STORAGE_KEY, JSON.stringify(favs));
            localStorage.removeItem(this.app.CONFIG.OLD_STORAGE_KEY);
        }
        return favs;
    }

    handleClick(id, source) {
        const index = this.app.state.favorites.indexOf(id);
        const isAdded = index === -1;
        const targetMv = MV_DATA.find(m => m.id === id);
        
        this.app.utils.trackEvent('fav-toggle', { 
            type: 'favorite', 
            id, 
            title: targetMv?.title || '', 
            action: isAdded ? 'add' : 'remove', 
            source 
        });

        if (isAdded) this.app.state.favorites.push(id);
        else this.app.state.favorites.splice(index, 1);

        localStorage.setItem(this.app.CONFIG.STORAGE_KEY, JSON.stringify(this.app.state.favorites));
        this.app.state.lastFavoriteAction = isAdded ? null : { id, title: targetMv?.title || '' };

        this.updateFavUI(id, isAdded);
        this.app.uiManager.showToast(targetMv?.title || '', isAdded);

        if (!isAdded && this.app.state.showFavOnly) {
            this.animateRemoval(id);
        }
    }

    updateFavUI(id, isFav) {
        const card = document.getElementById(`mv-card-${id}`);
        if (card) {
            const btn = card.querySelector('.favorite-btn');
            if (btn) {
                btn.classList.toggle('active', isFav);
                btn.innerHTML = isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
            }
        }
        if (this.app.dom.songModal.dataset.currentMvId === id) {
            const favContainer = document.getElementById('favIconContainer');
            if (favContainer) {
                favContainer.innerHTML = isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
                favContainer.classList.toggle('active', isFav);
                favContainer.style.color = isFav ? '#ffcf00' : '#fff';
            }
        }
    }

    setupModalBtn(id) {
        let favContainer = document.getElementById('favIconContainer');
        if (!favContainer) {
            favContainer = document.createElement('button');
            favContainer.id = 'favIconContainer';
            favContainer.classList.add('btn');
            favContainer.style.border = 'none';
            this.app.dom.modalTitle.parentElement.prepend(favContainer);
        }
        favContainer.onclick = (e) => {
            e.stopPropagation();
            this.handleClick(id, 'modal');
        };
        this.updateFavUI(id, this.app.state.favorites.includes(id));
    }

    handleUndo(e) {
        e.preventDefault();
        if (!this.app.state.lastFavoriteAction) return;
        const { id } = this.app.state.lastFavoriteAction;
        this.handleClick(id, 'undo');
                    const cardCol = document.getElementById(`mv-card-${id}`);
            if (cardCol && this.app.state.showFavOnly) {
                cardCol.style.display = 'block';
                setTimeout(() => {
                    cardCol.style.transform = 'scale(1)';
                    cardCol.style.opacity = '1';
                }, 10);
            }
        this.app.toastManager.hide();
        this.state.lastFavoriteAction = null;
    }

    animateRemoval(id) {
        const cardCol = document.getElementById(`mv-card-${id}`);
        if (!cardCol) return;
        cardCol.style.transition = 'opacity 0.3s, transform 0.3s';
        cardCol.style.opacity = '0';
        cardCol.style.transform = 'scale(0.8)';
        setTimeout(() => {
            if (cardCol.style.opacity === '0') {
                cardCol.style.display = 'none';
                const visibleCards = Array.from(this.app.dom.songCards.children).filter(c => c.style.display !== 'none');
                if (visibleCards.length === 0) {
                    this.app.dom.songCards.innerHTML = '<div class="w-100 text-center p-5">暫無收藏內容</div>';
                }
            }
        }, 300);
    }

    toggleFavOnlyMode(e) {
        this.app.state.showFavOnly = !this.app.state.showFavOnly;
        const isFav = this.app.state.showFavOnly;
        
        // 更新 URL 錨點
        this.app.utils.updateUrlHash(isFav ? 'favorites' : null);

        // 切換按鈕樣式
        if (this.app.dom.favOnlyBtn) {
            this.app.dom.favOnlyBtn.classList.toggle('btn-outline-warning', !isFav);
            this.app.dom.favOnlyBtn.classList.toggle('btn-warning', isFav);
        }

        this.app.utils.trackEvent('toggle-fav-only', { type: 'filter', showFavOnly: isFav });
        this.app.filterManager.apply();
    }
}