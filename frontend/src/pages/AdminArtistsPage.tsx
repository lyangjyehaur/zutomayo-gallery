import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArtistMeta, MVItem, MVMedia } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adminFetch, getApiRoot } from '@/lib/admin-api';

export function AdminArtistsPage() {
  const [artistMeta, setArtistMeta] = useState<Record<string, ArtistMeta>>({});
  const [mvData, setMvData] = useState<MVItem[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  
  // 批量解析推文的狀態
  const [tweetUrl, setTweetUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{ total: number, current: number, failedUrls: string[] } | null>(null);

  const fetchData = async () => {
    try {
      const apiUrl = `${getApiRoot()}/mvs`;
      const [metaRes, mvRes] = await Promise.all([
        adminFetch(`${apiUrl}/metadata`),
        adminFetch(`${apiUrl}?limit=1000`)
      ]);
      const metaData = await metaRes.json();
      const mvs = await mvRes.json();
      const meta = (metaData?.data ?? metaData)?.artistMeta ?? metaData?.artistMeta ?? {};
      setArtistMeta(meta);
      setMvData(mvs?.data || []);
    } catch (e) {
      toast.error('載入資料失敗');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    const apiUrl = `${getApiRoot()}/mvs`;
    toast.promise(
      adminFetch(`${apiUrl}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistMeta })
      }).then(r => r.json()),
      {
        loading: '儲存中...',
        success: '儲存成功！',
        error: '儲存失敗'
      }
    );
  };

  const handleParseTweet = async () => {
    if (!tweetUrl.trim()) return toast.error('請輸入推文網址');
    if (!selectedArtist) return toast.error('請先選擇一位畫師');
    
    const urls = tweetUrl.split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) return;

    setIsParsing(true);
    setBatchStatus({ total: urls.length, current: 0, failedUrls: [] });
    
    let currentFailedUrls: string[] = [];
    let allNewImages: any[] = [];

    try {
      const apiUrl = `${getApiRoot()}/mvs/twitter-resolve`;
      
      for (const url of urls) {
        try {
          const response = await adminFetch(apiUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          });
          
          if (!response.ok) throw new Error('推文解析失敗');
          const json = await response.json();
          
          if (json.success && json.data && json.data.length > 0) {
            const groupId = json.data.length > 1 ? `tweet-${Date.now()}-${Math.floor(Math.random() * 1000)}` : undefined;
            const newImages = json.data.map((media: any) => ({
              url: media.url,
              thumbnail: media.thumbnail || '',
              tweetUrl: url,
              tweetText: media.text,
              tweetAuthor: media.user_name,
              tweetHandle: media.user_screen_name,
              tweetDate: media.date,
              groupId,
              width: 0,
              height: 0,
              caption: '',
              alt: ''
            }));
            
            allNewImages = [...allNewImages, ...newImages];
          } else {
            throw new Error('推文中找不到媒體');
          }
        } catch (err: any) {
          console.error(err);
          currentFailedUrls.push(url);
        } finally {
          setBatchStatus(prev => prev ? { ...prev, current: prev.current + 1, failedUrls: currentFailedUrls } : null);
        }
      }

      if (allNewImages.length > 0) {
        // 將解析出的圖片加到當前畫師的 collaborations 陣列中
        setArtistMeta(p => {
          const current = p[selectedArtist] || { id: '', hideId: false };
          return {
            ...p,
            [selectedArtist]: {
              ...current,
              collaborations: [...(current.collaborations || []), ...allNewImages]
            }
          };
        });
        setTweetUrl('');
      }
      
      if (currentFailedUrls.length === 0) {
        toast.success(`解析完成: 成功取得 ${allNewImages.length} 個媒體，已加入畫師綜合插畫列表中`);
        setTimeout(() => setBatchStatus(null), 2000);
      } else {
        toast.warning(`完成，但有 ${currentFailedUrls.length} 個連結解析失敗`);
      }
    } catch (err: any) {
      toast.error('解析過程發生錯誤: ' + err.message);
      setBatchStatus(null);
    } finally {
      setIsParsing(false);
    }
  };

  const availableArtists = Array.from(new Set([
    ...Object.keys(artistMeta),
    ...mvData.flatMap(mv => mv.creators?.map(c => typeof c === 'object' ? c.name : c) || [])
  ])).filter(Boolean).sort((a, b) => a.localeCompare(b));

  const currentMeta = selectedArtist ? (artistMeta[selectedArtist] || { id: '', hideId: false }) : null;

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden font-mono">
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm shrink-0">
        <div className="flex items-center gap-4">
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
                  <label className="text-xs font-black uppercase">Twitter/X ID</label>
                  <Input value={currentMeta.id || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, id: e.target.value } }))} className="border-2 border-black font-mono" placeholder="@username" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase flex items-center gap-1"><i className="hn hn-instagram" /> Instagram</label>
                  <Input value={currentMeta.instagram || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, instagram: e.target.value } }))} className="border-2 border-black font-mono" placeholder="@username 或網址" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase flex items-center gap-1"><i className="hn hn-youtube" /> YouTube</label>
                  <Input value={currentMeta.youtube || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, youtube: e.target.value } }))} className="border-2 border-black font-mono" placeholder="頻道網址" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase flex items-center gap-1">Pixiv</label>
                  <Input value={currentMeta.pixiv || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, pixiv: e.target.value } }))} className="border-2 border-black font-mono" placeholder="畫師主頁網址" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase flex items-center gap-1">TikTok</label>
                  <Input value={currentMeta.tiktok || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, tiktok: e.target.value } }))} className="border-2 border-black font-mono" placeholder="@username 或網址" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase flex items-center gap-1"><i className="hn hn-link" /> 個人網站 (Website)</label>
                  <Input value={currentMeta.website || currentMeta.profileUrl || ''} onChange={e => setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, website: e.target.value, profileUrl: e.target.value } }))} className="border-2 border-black font-mono" placeholder="https://..." />
                </div>
                <div className="space-y-2">
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
                <div className="flex flex-col md:flex-row md:justify-between md:items-start border-b-4 border-black pb-4 mb-4 gap-4">
                  <h3 className="text-xl font-black uppercase tracking-widest whitespace-nowrap pt-2">綜合插畫 (Compilation)</h3>
                  
                  <div className="flex flex-col gap-2 w-full md:w-auto flex-1 md:max-w-md">
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <Textarea 
                        placeholder="貼上多行推文網址 (每行一個)..." 
                        value={tweetUrl}
                        onChange={e => setTweetUrl(e.target.value)}
                        className="border-2 border-black font-mono text-xs min-h-[80px]"
                      />
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <Button 
                          onClick={handleParseTweet}
                          disabled={isParsing}
                          className="bg-black text-white border-2 border-black hover:bg-main hover:text-black shadow-neo-sm flex-1 sm:flex-none"
                        >
                          {isParsing ? <i className="hn hn-refresh animate-spin mr-2" /> : <i className="hn hn-download mr-2" />} 
                          {isParsing ? '解析中...' : '開始解析'}
                        </Button>
                        <Button 
                          onClick={() => {
                            const newCollab: MVMedia = { url: '', width: 1920, height: 1080 };
                            setArtistMeta(p => ({ ...p, [selectedArtist]: { ...currentMeta, collaborations: [...(currentMeta.collaborations || []), newCollab] } }))
                          }}
                          className="bg-ztmy-green text-black border-2 border-black hover:bg-ztmy-green/80 shadow-neo-sm flex-1 sm:flex-none"
                          title="手動新增空白圖片"
                        >
                          <i className="hn hn-plus mr-2" /> 手動新增
                        </Button>
                      </div>
                    </div>
                    
                    {/* 進度條 */}
                    {batchStatus && batchStatus.total > 0 && (
                      <div className="mt-2 p-3 border-2 border-black bg-black/5">
                        <div className="flex justify-between text-xs font-bold uppercase mb-2">
                          <span>處理進度</span>
                          <span>{batchStatus.current} / {batchStatus.total}</span>
                        </div>
                        <div className="h-2 bg-black/20 w-full rounded-full overflow-hidden border border-black">
                          <div 
                            className="h-full bg-ztmy-green transition-all duration-300"
                            style={{ width: `${(batchStatus.current / batchStatus.total) * 100}%` }}
                          />
                        </div>
                        {batchStatus.failedUrls.length > 0 && (
                          <div className="mt-2 text-xs text-red-600 font-bold">
                            <i className="hn hn-exclamation-triangle mr-1" /> {batchStatus.failedUrls.length} 個網址解析失敗
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
