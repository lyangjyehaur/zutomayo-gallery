/**
 * 本地存儲鍵名配置
 * 集中管理所有 localStorage/sessionStorage 鍵名，避免衝突和拼寫錯誤
 */

export const STORAGE_KEYS = {
  // 收藏相關
  FAVORITES: 'ztmy_favs_v2',
  FAVORITES_VERSION: 'ztmy_favs_version',
  
  // 用戶設置
  SETTINGS: 'ztmy_settings',
  THEME: 'ztmy_theme',
  LANGUAGE: 'ztmy_language',
  
  // 緩存相關
  CACHE_MV_DATA: 'ztmy_cache_mv_data',
  CACHE_TIMESTAMP: 'ztmy_cache_timestamp',
  CACHE_VERSION: 'ztmy_cache_version',
  
  // UI 狀態
  GRID_VIEW_MODE: 'ztmy_grid_view',
  MODAL_STATE: 'ztmy_modal_state',
  
  // 用戶行為
  LAST_VISIT: 'ztmy_last_visit',
  VIEW_HISTORY: 'ztmy_view_history',
} as const;

// 存儲版本號，用於數據遷移
export const STORAGE_VERSION = '2.0';

// 緩存過期時間（毫秒）
export const CACHE_EXPIRY = {
  MV_DATA: 1000 * 60 * 60, // 1小時
  USER_SETTINGS: 1000 * 60 * 60 * 24 * 30, // 30天
} as const;

/**
 * 安全的 localStorage 操作封裝
 */
export const storage = {
  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`[Storage] Failed to get ${key}:`, error);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[Storage] Failed to set ${key}:`, error);
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`[Storage] Failed to remove ${key}:`, error);
      return false;
    }
  },

  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('[Storage] Failed to clear:', error);
      return false;
    }
  },

  // 檢查存儲空間
  getStorageInfo() {
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length * 2; // UTF-16 編碼
      }
    }
    return {
      used: (used / 1024 / 1024).toFixed(2) + ' MB',
      limit: '5-10 MB (browser dependent)',
    };
  },
};

/**
 * 帶過期時間的緩存存儲
 */
export const cacheStorage = {
  get<T>(key: string, maxAge: number): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const { value, timestamp } = JSON.parse(item);
      const age = Date.now() - timestamp;
      
      if (age > maxAge) {
        localStorage.removeItem(key);
        return null;
      }
      
      return value as T;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify({
        value,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn(`[CacheStorage] Failed to set ${key}:`, error);
    }
  },
};
