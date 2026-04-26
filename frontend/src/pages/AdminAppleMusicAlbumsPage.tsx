import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export interface AppleMusicAlbum {
  id: number;
  album_name: string;
  artist_name: string;
  release_date: string;
  collection_type: string;
  track_count: number;
  is_hidden: boolean;
  source_url: string;
}

export function AdminAppleMusicAlbumsPage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<AppleMusicAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const albumUrl = apiUrl.replace(/\/mvs$/, '/album/apple-music');
      
      const res = await fetch(albumUrl);
      const json = await res.json();
      
      if (json.success) {
        setAlbums(json.data);
      } else {
        toast.error('載入 Apple Music 專輯失敗');
      }
    } catch (e) {
      toast.error('載入資料失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const pwd = localStorage.getItem('ztmy_admin_pwd');
    if (pwd) {
      fetchData();
    } else {
      navigate('/admin');
    }
  }, [navigate]);

  const handleSave = async () => {
    const pwd = localStorage.getItem('ztmy_admin_pwd');
    const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
    const albumUrl = apiUrl.replace(/\/mvs$/, '/album/apple-music');
    
    toast.promise(
      fetch(albumUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd || '' },
        body: JSON.stringify({ albums })
      }).then(r => r.json()),
      {
        loading: '儲存中...',
        success: (res) => {
          if (res.success) {
            setAlbums(res.data);
            return '儲存成功！';
          }
          throw new Error(res.error || '儲存失敗');
        },
        error: '儲存失敗'
      }
    );
  };

  const handleChange = (index: number, field: keyof AppleMusicAlbum, value: any) => {
    const newAlbums = [...albums];
    newAlbums[index] = { ...newAlbums[index], [field]: value };
    setAlbums(newAlbums);
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden font-mono">
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm shrink-0">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest leading-none">Apple Music 專輯管理</h1>
          <div className="text-[10px] font-bold opacity-40">APPLE.MUSIC.ADMIN</div>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleSave} className="bg-main text-black hover:bg-main/80 border-2 border-black font-black shadow-neo-sm">
            <i className="hn hn-save mr-2" /> 儲存所有變更
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-card/50">
        <div className="max-w-6xl mx-auto space-y-4">
          {isLoading ? (
            <div className="text-center opacity-50 font-bold py-8">載入中...</div>
          ) : albums.length === 0 ? (
            <div className="text-center opacity-50 font-bold py-8">目前沒有 Apple Music 專輯項目。</div>
          ) : (
            <div className="grid gap-4">
              {albums.map((album, idx) => (
                <div key={album.id} className="bg-card border-4 border-black p-4 flex flex-col gap-4 shadow-neo">
                  <div className="flex flex-wrap md:flex-nowrap gap-4 items-center">
                    <div className="flex-1">
                      <div className="font-bold text-lg">{album.album_name}</div>
                      <div className="text-sm opacity-70">
                        {album.artist_name} • {new Date(album.release_date).toLocaleDateString()} • {album.collection_type} • {album.track_count} 首
                      </div>
                      <a href={album.source_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        來源連結
                      </a>
                    </div>
                    <div className="space-y-1 w-full md:w-[20%] flex flex-col items-center justify-center border-l-2 border-black/20 pl-4">
                      <label className="text-[10px] font-black uppercase opacity-70">隱藏 (不在時間軸顯示)</label>
                      <Switch checked={album.is_hidden || false} onCheckedChange={c => handleChange(idx, 'is_hidden', c)} className="mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}