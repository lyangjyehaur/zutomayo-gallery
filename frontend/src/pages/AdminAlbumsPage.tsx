import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DictItem {
  id: string;
  category: string;
  code: string;
  label: string;
  description: string;
  sort_order: number;
}

interface AlbumItem {
  id: string;
  name: string;
  type: string;
  release_date: string;
  cover_image_url: string;
  hide_date: boolean;
}

export function AdminAlbumsPage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [dicts, setDicts] = useState<DictItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const albumUrl = apiUrl.replace(/\/mvs$/, '/album');
      const dictUrl = apiUrl.replace(/\/mvs$/, '/system/dicts');
      
      const [albumRes, dictRes] = await Promise.all([
        fetch(albumUrl),
        fetch(dictUrl)
      ]);
      
      const albumJson = await albumRes.json();
      const dictJson = await dictRes.json();
      
      if (albumJson.success) {
        setAlbums(albumJson.data);
      } else {
        toast.error('載入專輯失敗');
      }
      
      if (dictJson.success) {
        setDicts(dictJson.data);
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
    const albumUrl = apiUrl.replace(/\/mvs$/, '/album');
    
    toast.promise(
      fetch(albumUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd || '' },
        body: JSON.stringify({ albums, deletedIds })
      }).then(r => r.json()),
      {
        loading: '儲存中...',
        success: (res) => {
          if (res.success) {
            setAlbums(res.data);
            setDeletedIds([]);
            return '儲存成功！';
          }
          throw new Error(res.error || '儲存失敗');
        },
        error: '儲存失敗'
      }
    );
  };

  const handleAdd = () => {
    const newId = `album-${Date.now()}`;
    setAlbums([...albums, { id: newId, name: '', type: '', release_date: '', cover_image_url: '', hide_date: false }]);
  };

  const handleDelete = (id: string, index: number) => {
    if (!id.startsWith('album-')) {
      setDeletedIds([...deletedIds, id]);
    }
    const newAlbums = [...albums];
    newAlbums.splice(index, 1);
    setAlbums(newAlbums);
  };

  const handleChange = (index: number, field: keyof AlbumItem, value: any) => {
    const newAlbums = [...albums];
    newAlbums[index] = { ...newAlbums[index], [field]: value };
    setAlbums(newAlbums);
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden font-mono">
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm shrink-0">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest leading-none">專輯管理</h1>
          <div className="text-[10px] font-bold opacity-40">ALBUM.ADMIN</div>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleAdd} className="bg-ztmy-green text-black hover:bg-ztmy-green/80 border-2 border-black font-black shadow-neo-sm">
            <i className="hn hn-plus mr-2" /> 新增專輯
          </Button>
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
            <div className="text-center opacity-50 font-bold py-8">目前沒有專輯項目。</div>
          ) : (
            <div className="grid gap-4">
              {albums.map((album, idx) => (
                <div key={album.id} className="bg-card border-4 border-black p-4 flex flex-col gap-4 shadow-neo">
                  <div className="flex flex-wrap md:flex-nowrap gap-4 items-start">
                    <div className="space-y-1 w-full md:w-1/3">
                      <label className="text-[10px] font-black uppercase opacity-70">Album Name (專輯名稱)</label>
                      <Input value={album.name} onChange={e => handleChange(idx, 'name', e.target.value)} className="border-2 border-black font-bold h-8" placeholder="e.g. 潛潛話" />
                    </div>
                    <div className="space-y-1 w-full md:w-1/4">
                      <label className="text-[10px] font-black uppercase opacity-70">Release Date (發行日期)</label>
                      <Input type="date" value={album.release_date ? new Date(album.release_date).toISOString().split('T')[0] : ''} onChange={e => handleChange(idx, 'release_date', e.target.value)} className="border-2 border-black font-bold h-8" />
                    </div>
                    <div className="space-y-1 w-full md:w-1/4">
                      <label className="text-[10px] font-black uppercase opacity-70">Type (分類)</label>
                      <Select value={album.type || ''} onValueChange={v => handleChange(idx, 'type', v)}>
                        <SelectTrigger className="border-2 border-black font-bold h-8 rounded-none">
                          <SelectValue placeholder="選擇分類" />
                        </SelectTrigger>
                        <SelectContent className="border-2 border-black rounded-none">
                          {dicts.filter(d => d.category === 'album_type').map(d => (
                            <SelectItem key={d.id} value={d.code}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 w-full md:w-[15%] flex flex-col items-center">
                      <label className="text-[10px] font-black uppercase opacity-70">Hide Date (隱藏日期)</label>
                      <Switch checked={album.hide_date} onCheckedChange={c => handleChange(idx, 'hide_date', c)} className="mt-1" />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(album.id, idx)} className="shrink-0 mt-5 border-2 border-black shadow-neo-sm rounded-none">
                      <i className="hn hn-trash" />
                    </Button>
                  </div>
                  <div className="space-y-1 w-full">
                    <label className="text-[10px] font-black uppercase opacity-70">Cover Image URL (封面圖片)</label>
                    <Input value={album.cover_image_url || ''} onChange={e => handleChange(idx, 'cover_image_url', e.target.value)} className="border-2 border-black font-bold h-8" placeholder="https://..." />
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
