import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MVItem, MVMedia } from '@/lib/types';

export function AdminFanArtPage() {
  const navigate = useNavigate();
  const [mvData, setMvData] = useState<MVItem[]>([]);
  
  const [tweetUrl, setTweetUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{ total: number, current: number, failedUrls: string[] } | null>(null);
  const [parsedImages, setParsedImages] = useState<MVMedia[]>([]);
  
  const [selectedMvIds, setSelectedMvIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const [unorganizedGroups, setUnorganizedGroups] = useState<any[]>([]);
  const [isLoadingUnorganized, setIsLoadingUnorganized] = useState(false);
  const [pendingGroupIds, setPendingGroupIds] = useState<Set<string>>(new Set());

  const fetchUnorganized = async () => {
    setIsLoadingUnorganized(true);
    try {
      const baseApiUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/mvs$/, '');
      const res = await fetch(`${baseApiUrl}/fanarts/unorganized`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      const data = await res.json();
      if (data.success) {
        setUnorganizedGroups(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch unorganized fanarts', e);
    } finally {
      setIsLoadingUnorganized(false);
    }
  };

  const fetchData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const res = await fetch(`${apiUrl}?limit=1000`);
      const mvs = await res.json();
      setMvData(mvs.data || []);
    } catch (e) {
      toast.error('載入失敗');
    }
  };

  useEffect(() => {
    const pwd = localStorage.getItem('ztmy_admin_pwd');
    if (pwd) {
      fetchData();
      fetchUnorganized();
    } else {
      navigate('/admin');
    }
  }, []);

  const handleSelectUnorganized = (group: any) => {
    const newImages = (group.media || []).map((m: any) => ({
      url: m.url,
      thumbnail: m.thumbnail_url || m.url,
      tweetUrl: group.source_url || '',
      tweetText: group.source_text || '',
      tweetAuthor: group.author_name || '',
      tweetHandle: group.author_handle || '',
      tweetDate: group.post_date || '',
      groupId: group.id,
      type: 'fanart',
      width: m.width || 0,
      height: m.height || 0,
      caption: '',
      alt: ''
    }));
    setParsedImages(prev => [...prev, ...newImages]);
    setUnorganizedGroups(prev => prev.filter(g => g.id !== group.id));
    setPendingGroupIds(prev => new Set(prev).add(group.id));
  };

  const handleDeleteUnorganized = async (group: any) => {
    if (!window.confirm('確定要捨棄這篇推文嗎？這將不會保存到畫廊中。')) return;
    try {
      const baseApiUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/mvs$/, '');
      const res = await fetch(`${baseApiUrl}/fanarts/${group.id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify({ status: 'deleted' })
      });
      if (!res.ok) throw new Error('刪除失敗');
      setUnorganizedGroups(prev => prev.filter(g => g.id !== group.id));
      toast.success('已捨棄推文');
    } catch (e) {
      toast.error('刪除失敗');
    }
  };

  const handleParse = async () => {
    if (!tweetUrl.trim()) return toast.error('請輸入推文網址');
    
    const urls = tweetUrl.split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) return;

    setIsParsing(true);
    setBatchStatus({ total: urls.length, current: 0, failedUrls: [] });
    
    let currentFailedUrls: string[] = [];
    let allNewImages: any[] = [];

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/mvs$/, '') + '/mvs/twitter-resolve';
      
      for (const url of urls) {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
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
              type: 'fanart', // 標記為 FanArt
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
        setParsedImages(prev => [...prev, ...allNewImages]);
        setTweetUrl('');
      }
      
      if (currentFailedUrls.length === 0) {
        toast.success(`解析完成: 成功取得 ${allNewImages.length} 個媒體`);
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

  const handleSave = async () => {
    if (parsedImages.length === 0) return toast.error('沒有可保存的圖片');
    if (selectedMvIds.size === 0) return toast.error('請至少選擇一個關聯的 MV');
    
    setIsSaving(true);
    try {
      // 找出被選擇的 MVs，並將 parsedImages 附加到它們的 images 陣列中
      const updatedMvs = mvData.filter(mv => selectedMvIds.has(mv.id)).map(mv => ({
        ...mv,
        images: [...(mv.images || []), ...parsedImages]
      }));

      const apiUrl = (import.meta.env.VITE_API_URL || '/api/v1/mvs').replace(/(\/mvs)?$/, '/mvs/update');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify({ 
          data: updatedMvs,
          partial: true 
        }),
      });

      if (!response.ok) throw new Error('保存失敗');
      
      // 更新未整理推文的狀態
      const baseApiUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/mvs$/, '');
      for (const groupId of pendingGroupIds) {
        if (!groupId || groupId.startsWith('tweet-')) continue; // 跳過手動解析產生的假 ID
        try {
          await fetch(`${baseApiUrl}/fanarts/${groupId}/status`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
            },
            body: JSON.stringify({ status: 'organized' })
          });
        } catch (err) {
          console.error('Failed to update group status', err);
        }
      }
      
      toast.success('FanArt 已成功關聯並保存至選擇的 MV 中！');
      setParsedImages([]);
      setSelectedMvIds(new Set());
      setPendingGroupIds(new Set());
      fetchData(); // 重新拉取資料
      fetchUnorganized(); // 重新拉取未整理推文
    } catch (e: any) {
      toast.error('保存時發生錯誤: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMvSelection = (id: string) => {
    setSelectedMvIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden font-mono">
      {/* 頂部導航 */}
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black uppercase tracking-widest text-black">FanArt 管理中心</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        
        {/* 左側：解析推文與圖片預覽 */}
        <div className="space-y-6">
          
          {/* 未整理收件匣 */}
          {unorganizedGroups.length > 0 && (
            <div className="bg-card border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-black uppercase mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="hn hn-inbox text-xl" /> 未整理收件匣 ({unorganizedGroups.length})
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchUnorganized} 
                  disabled={isLoadingUnorganized} 
                  className="border-2 border-black hover:bg-black hover:text-white"
                >
                  <i className={`hn hn-refresh ${isLoadingUnorganized ? 'animate-spin' : ''}`} />
                </Button>
              </h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {unorganizedGroups.map(group => (
                  <div key={group.id} className="border-2 border-black p-3 bg-white flex flex-col gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between">
                      <a href={group.source_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                        <i className="hn hn-twitter" /> @{group.author_handle}
                      </a>
                      <span className="text-[10px] opacity-50">{new Date(group.post_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs line-clamp-2 opacity-80">{group.source_text}</p>
                    
                    {/* 媒體預覽縮圖 */}
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                      {(group.media || []).map((m: any, i: number) => (
                        <div key={i} className="relative shrink-0">
                          <img 
                            src={m.thumbnail_url || m.url} 
                            alt="media" 
                            className="w-16 h-16 object-cover border border-black" 
                          />
                          {m.media_type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <i className="hn hn-play text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="sm" variant="destructive" className="h-7 text-xs border-2 border-black rounded-none" onClick={() => handleDeleteUnorganized(group)}>
                        捨棄
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-ztmy-green text-black hover:bg-black hover:text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none" onClick={() => handleSelectUnorganized(group)}>
                        <i className="hn hn-arrow-right mr-1" /> 提取圖片
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
              <i className="hn hn-twitter text-xl" /> 解析推文
            </h2>
            <div className="flex flex-col gap-2">
              <Textarea 
                placeholder="貼上多行 X/Twitter 網址 (每行一個)..." 
                value={tweetUrl}
                onChange={e => setTweetUrl(e.target.value)}
                className="font-mono text-xs min-h-[120px] border-2 border-black"
              />
              <Button onClick={handleParse} disabled={isParsing} className="bg-black text-white hover:bg-main hover:text-black w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {isParsing ? <i className="hn hn-refresh animate-spin mr-2" /> : <i className="hn hn-download mr-2" />} 
                {isParsing ? '解析中...' : '開始解析'}
              </Button>
            </div>
            
            {/* 進度條 */}
            {batchStatus && batchStatus.total > 0 && (
              <div className="mt-4 p-4 border-2 border-black bg-black/5">
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

          {parsedImages.length > 0 && (
            <div className="bg-card border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black uppercase">待保存圖片 ({parsedImages.length})</h2>
                <Button variant="outline" size="sm" onClick={() => setParsedImages([])} className="border-2 border-black text-red-600 hover:bg-red-50">
                  清空
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {parsedImages.map((img, idx) => (
                  <div key={idx} className="border-2 border-black p-2 relative group bg-background">
                    <img src={img.thumbnail_url || img.url} alt="preview" className="w-full h-32 object-cover" />
                    <button 
                      onClick={() => setParsedImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 flex items-center justify-center border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i className="hn hn-x" />
                    </button>
                    <div className="mt-2 space-y-2">
                      <Input 
                        placeholder="圖片標題 (Caption)" 
                        value={img.caption || ''} 
                        onChange={e => setParsedImages(prev => prev.map((p, i) => i === idx ? { ...p, caption: e.target.value } : p))}
                        className="text-xs h-7"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右側：選擇關聯 MV */}
        <div className="space-y-6">
          <div className="bg-card border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[calc(100vh-200px)]">
            <h2 className="text-lg font-black uppercase mb-4 flex items-center justify-between">
              <span><i className="hn hn-link text-xl mr-2" /> 關聯至 MV ({selectedMvIds.size})</span>
              <Button onClick={handleSave} disabled={isSaving || parsedImages.length === 0 || selectedMvIds.size === 0} className="bg-ztmy-green text-black hover:bg-black hover:text-white border-2 border-black">
                {isSaving ? <i className="hn hn-refresh animate-spin mr-2" /> : <i className="hn hn-save mr-2" />}
                保存關聯
              </Button>
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 border-2 border-black/10 p-2">
              {mvData.map(mv => {
                const fanartCount = mv.images?.filter(img => img.type === 'fanart').length || 0;
                return (
                  <label key={mv.id} className="flex items-center gap-3 p-2 hover:bg-black/5 rounded cursor-pointer border-b border-black/5">
                    <input 
                      type="checkbox"
                      checked={selectedMvIds.has(mv.id)} 
                      onChange={() => toggleMvSelection(mv.id)}
                      className="w-5 h-5 border-2 border-black accent-black cursor-pointer"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-bold truncate text-sm">{mv.title}</span>
                      <span className="text-[10px] opacity-50 font-mono truncate">{mv.date} | {mv.creators?.map(c => c.name || c).join(', ')}</span>
                    </div>
                    {fanartCount > 0 && (
                      <span className="text-[10px] bg-ztmy-green text-black border border-black px-2 py-0.5 rounded-full font-bold">
                        {fanartCount} FanArt
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
