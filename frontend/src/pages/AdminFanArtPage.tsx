import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MVItem, MVImage } from '@/lib/types';

export function AdminFanArtPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [mvData, setMvData] = useState<MVItem[]>([]);
  
  const [tweetUrl, setTweetUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedImages, setParsedImages] = useState<MVImage[]>([]);
  
  const [selectedMvIds, setSelectedMvIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

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
      const res = await fetch('/api/v1/mvs');
      const mvs = await res.json();
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

  const handleParse = async () => {
    if (!tweetUrl) return toast.error('請輸入推文網址');
    setIsParsing(true);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/mvs$/, '') + '/mvs/twitter-resolve';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify({ url: tweetUrl }),
      });
      
      if (!response.ok) throw new Error('推文解析失敗');
      const json = await response.json();
      
      if (json.success && json.data && json.data.length > 0) {
        const groupId = json.data.length > 1 ? `tweet-${Date.now()}` : undefined;
        const newImages = json.data.map((media: any) => ({
          url: media.url,
          thumbnail: media.thumbnail || '',
          tweetUrl: tweetUrl,
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
        setParsedImages(prev => [...prev, ...newImages]);
        setTweetUrl('');
        toast.success(`成功解析取得 ${json.data.length} 個媒體`);
      } else {
        throw new Error('推文中找不到媒體');
      }
    } catch (err: any) {
      toast.error('推文解析失敗: ' + err.message);
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
      
      toast.success('FanArt 已成功關聯並保存至選擇的 MV 中！');
      setParsedImages([]);
      setSelectedMvIds(new Set());
      fetchData(); // 重新拉取資料
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

  if (isInitializing) return <div className="h-screen bg-background text-foreground flex items-center justify-center">驗證中...</div>;

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <div className="bg-card border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full flex flex-col gap-4">
          <h2 className="text-xl font-black uppercase">FanArt 管理員驗證</h2>
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

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* 頂部導航 */}
      <div className="bg-ztmy-green border-b-4 border-black p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="neutral" size="sm" onClick={() => navigate('/admin')}>
            <i className="hn hn-arrow-left mr-2" /> 返回主控台
          </Button>
          <h1 className="text-xl font-black uppercase tracking-widest text-black">FanArt 管理中心</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        
        {/* 左側：解析推文與圖片預覽 */}
        <div className="space-y-6">
          <div className="bg-card border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
              <i className="hn hn-twitter text-xl" /> 解析推文
            </h2>
            <div className="flex gap-2">
              <Input 
                placeholder="貼上 X/Twitter 網址..." 
                value={tweetUrl}
                onChange={e => setTweetUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleParse} disabled={isParsing} className="bg-black text-white hover:bg-main hover:text-black">
                {isParsing ? <i className="hn hn-refresh animate-spin" /> : '解析'}
              </Button>
            </div>
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
                    <img src={img.thumbnail || img.url} alt="preview" className="w-full h-32 object-cover" />
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
              {mvData.map(mv => (
                <label key={mv.id} className="flex items-center gap-3 p-2 hover:bg-black/5 rounded cursor-pointer border-b border-black/5">
                  <input 
                    type="checkbox"
                    checked={selectedMvIds.has(mv.id)} 
                    onChange={() => toggleMvSelection(mv.id)}
                    className="w-5 h-5 border-2 border-black accent-black cursor-pointer"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold truncate text-sm">{mv.title}</span>
                    <span className="text-[10px] opacity-50 font-mono truncate">{mv.date} | {Array.isArray(mv.artist) ? mv.artist.join(', ') : mv.artist}</span>
                  </div>
                  {mv.images?.length > 0 && (
                    <span className="text-[10px] bg-black/10 px-2 py-0.5 rounded-full font-mono">{mv.images.length} 媒體</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
