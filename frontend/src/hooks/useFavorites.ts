import { useState, useEffect, useCallback, useRef } from 'react';
import { MVItem } from '@/lib/types';
import { STORAGE_KEYS, storage } from '@/config/storage';
import { toast } from 'sonner';

interface UseFavoritesParams {
  mvData: MVItem[];
  showFavOnly: boolean;
}

export function useFavorites({ mvData, showFavOnly }: UseFavoritesParams) {
  const [favorites, setFavorites] = useState<string[]>(() => {
    return storage.get<string[]>(STORAGE_KEYS.FAVORITES, []) || [];
  });
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);
  const [favVersion, setFavVersion] = useState(0);

  const toggleFav = useCallback(
    (id: string) => {
      const currentFavs = favoritesRef.current;
      const isRemoving = currentFavs.includes(id);
      const newFavs = isRemoving
        ? currentFavs.filter((favId) => favId !== id)
        : [...currentFavs, id];
      favoritesRef.current = newFavs;
      setFavorites(newFavs);
      if (showFavOnly) {
        setFavVersion((v) => v + 1);
      }
      if (!storage.set(STORAGE_KEYS.FAVORITES, newFavs)) {
        toast.error("收藏狀態無法保存，刷新頁面後可能會丟失");
      }

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel("favorites_sync");
        channel.postMessage(newFavs);
        channel.close();
      }

      const mvTitle = mvData.find((m) => m.id === id)?.title || "作品";
      if (isRemoving) {
        toast("已取消收藏", {
          description: mvTitle,
          action: {
            label: "復原",
            onClick: () => {
              if (favoritesRef.current.includes(id)) return;
              const restoredFavs = [...favoritesRef.current, id];
              favoritesRef.current = restoredFavs;
              setFavorites(restoredFavs);
              if (showFavOnly) {
                setFavVersion((v) => v + 1);
              }
              if (!storage.set(STORAGE_KEYS.FAVORITES, restoredFavs)) {
                toast.error("收藏復原失敗，無法持久化保存");
              }
              if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                const channel = new BroadcastChannel("favorites_sync");
                channel.postMessage(restoredFavs);
                channel.close();
              }
              toast("已加入收藏", { description: mvTitle });
            },
          },
        });
      } else {
        toast("已加入收藏", {
          description: mvTitle,
        });
      }
    },
    [mvData, showFavOnly],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window))
      return;

    const channel = new BroadcastChannel("favorites_sync");
    channel.onmessage = (e) => {
      setFavorites(e.data);
    };

    return () => channel.close();
  }, []);

  return {
    favorites,
    favoritesRef,
    favVersion,
    toggleFav,
  };
}
