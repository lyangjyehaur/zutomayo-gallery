import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArtistMeta, MVItem, MVImage } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AdminArtistsPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [artistMeta, setArtistMeta] = useState<Record<string, ArtistMeta>>({});
  const [mvData, setMvData] = useState<MVItem[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  const verifyPassword = async (pwd: string) => {
    try {
      const res = await fetch('/api/v1/mvs', {
        headers: { 'x-admin-password': pwd }
      });
      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('ztmy_admin_pwd', pwd);
        fetchData();
      } else {
        toast.error('密碼錯誤');
      }
    } catch (e) {
      toast.error('驗證失敗');
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchData = async () => {
    try {
      const [metaRes, mvRes] = await Promise.all([
        fetch('/api/v1/meta'),
        fetch('/api/v1/mvs')
      ]);
      const metaData = await metaRes.json();
      const mvs = await mvRes.json();
      setArtistMeta(metaData.artistMeta || {});
      setMvData(mvs.data || []);
    } catch (e) {
      toast.error('載入失敗');
    }
  };

  useEffect(() => {
    const pwd = localStorage.getItem('ztmy_admin_pwd');
    if (pwd) verifyPassword(pwd);
    else setIsInitializing(false);
  }, []);

  const handleSave = async () => {
    const pwd = localStorage.getItem('ztmy_admin_pwd');
    toast.promise(
      fetch('/api/v1/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd || '' },
        body: JSON.stringify({ artistMeta })
      }).then(r => r.json()),
      {
        loading: '儲存中...',
        success: '儲存成功！',
        error: '儲存失敗'
      }
    );
  };

  const availableArtists = Array.from(new Set([
    ...Object.keys(artistMeta),
    ...mvData.flatMap(mv => mv.artist || [])
  ])).filter(Boolean).sort((a, b) => a.localeCompare(b));

  if (isInitializing) return <div className="h-screen bg-background text-foreground flex items-center justify-center">驗證中...</div>;

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <div className="bg-card border-4 border-black p-8 shadow-neo max-w-sm w-full flex flex-col gap-4">
          <h2 className="text-xl font-black uppercase">管理員驗證</h2>
          <Input 
            type="password" 
            placeholder="請輸入密碼" 
            onKeyDown={(e) => {
              if (e.key === 'Enter') verifyPassword(e.currentTarget.value);
            }} 
          />
        </div>
      </div>
    );
  }

  const currentMeta = selectedArtist ? (artistMeta[selectedArtist] || { id: '', hideId: false }) : null;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-mono">
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm z-40 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="neutral" size="icon" onClick={() => navigate('/admin')} className="rounded-full bg-black text-white hover:bg-main hover:text-black">
            <i className="hn hn-arrow-left text-xl" />
          </Button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest leading-none">畫師管理控制台</h1>
            <div className="text-[10px] font-bold opacity-40">ARTIST.ADMIN.PANEL</div>
          </div>
        </div>
        <Button onClick={handleSave} className="bg-main text-black hover:bg-main/80 border-2 border-black font-black shadow-neo-sm">
          <i className="hn hn-save mr-2" /> 儲存所有變更
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左側清單 */}
        <div className="w-80 border-r-4 border-black bg-card/30 flex flex-col h-full overflow-y-auto">
          {availableArtists.map(artist => (
            <button
              key={artist}
              onClick={() => setSelectedArtist(artist)}
              className={`p-4 text-left border-b-2 border-black/10 font-bold transition-all hover:bg-main/10 truncate ${selectedArtist === artist ? 'bg-main text-black shadow-[inset_4px_0_0_0_#000]' : ''}`}
            >
              {artist}
            </button>
          ))}
        </div>

        {/* 右側編輯區 */}
        <div className="flex-1 h-full overflow-y-auto p-8 custom-scrollbar bg-card/50">
          {selectedArtist && currentMeta ? (
            <div className="max-w-3xl mx-auto space-y-8 pb-20">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black bg-black text-white px-4 py-2 inline-block shadow-neo rotate-[-1deg]">{selectedArtist}</h2>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>隱藏畫師社群ID</span>
                  <Switch 
                    checked={currentMeta.hideId || false}
                    onCheckedChange={(c) => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, hideId: c } }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border-4 border-black p-6 shadow-neo">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase">顯示名稱 (DisplayName)</label>
                  <Input value={currentMeta.displayName || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, displayName: e.target.value } }))} className="border-2 border-black font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase">Twitter/X / SNS ID</label>
                  <Input value={currentMeta.id || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, id: e.target.value } }))} className="border-2 border-black font-mono" placeholder="@username" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase">個人主頁 (Profile URL)</label>
                  <Input value={currentMeta.profileUrl || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, profileUrl: e.target.value } }))} className="border-2 border-black font-mono" placeholder="https://..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase">數據 ID (Data ID)</label>
                  <Input value={currentMeta.dataId || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, dataId: e.target.value } }))} className="border-2 border-black font-mono" placeholder="URL 拼接用 ID" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase">畫師介紹 (Bio)</label>
                  <Textarea value={currentMeta.bio || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, bio: e.target.value } }))} className="border-2 border-black font-bold min-h-[100px]" />
                </div>
              </div>

              {/* 綜合插畫管理 */}
              <div className="bg-card border-4 border-black p-6 shadow-neo space-y-4">
                <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-4">
                  <h3 className="text-xl font-black uppercase tracking-widest">綜合插畫 (Compilation Illusts)</h3>
                  <Button 
                    onClick={() => {
                      const newCollab: MVImage = { url: '', width: 1920, height: 1080 };
                      setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, collaborations: [...(currentMeta.collaborations || []), newCollab] } }))
                    }}
                    className="bg-ztmy-green text-black border-2 border-black hover:bg-ztmy-green/80 shadow-neo-sm"
                  >
                    <i className="hn hn-plus mr-2" /> 新增圖片
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {(currentMeta.collaborations || []).map((img, i) => (
                    <div key={i} className="flex gap-4 border-2 border-black p-4 bg-white/50 items-start">
                      <div className="w-32 h-20 bg-black/10 border-2 border-black flex shrink-0 items-center justify-center overflow-hidden relative group">
                        {img.url ? <img src={img.url} className="w-full h-full object-cover" /> : <i className="hn hn-image text-2xl opacity-20" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input value={img.url} onChange={e => {
                          const newCollabs = [...(currentMeta.collaborations || [])];
                          newCollabs[i].url = e.target.value;
                          setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, collaborations: newCollabs } }));
                        }} placeholder="Image URL" className="h-8 text-xs font-mono border-black" />
                        <Input value={img.caption || ''} onChange={e => {
                          const newCollabs = [...(currentMeta.collaborations || [])];
                          newCollabs[i].caption = e.target.value;
                          setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, collaborations: newCollabs } }));
                        }} placeholder="Caption / 描述" className="h-8 text-xs font-bold border-black" />
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => {
                        const newCollabs = [...(currentMeta.collaborations || [])];
                        newCollabs.splice(i, 1);
                        setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, collaborations: newCollabs } }));
                      }} className="shrink-0 border-2 border-black rounded-none shadow-neo-sm">
                        <i className="hn hn-trash text-lg" />
                      </Button>
                    </div>
                  ))}
                  {(!currentMeta.collaborations || currentMeta.collaborations.length === 0) && (
                    <div className="text-center opacity-50 py-8 font-bold text-sm">目前沒有綜合插畫。</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center opacity-30 text-2xl font-black">
              請從左側選擇一位畫師
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
