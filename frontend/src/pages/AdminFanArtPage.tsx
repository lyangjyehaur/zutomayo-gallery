import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect, Option } from '@/components/ui/multi-select';

export function AdminFanArtPage() {
  const [activeTab, setActiveTab] = useState<string>('unorganized');
  const [unorganizedGroups, setUnorganizedGroups] = useState<any[]>([]);
  const [mvData, setMvData] = useState<any[]>([]);
  const [selectedMvs, setSelectedMvs] = useState<Record<string, string[]>>({});
  const [editMvs, setEditMvs] = useState<Record<string, string[]>>({});
  
  // Parse Tweets states
  const [tweetUrl, setTweetUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{ total: number, current: number, failedUrls: string[] } | null>(null);
  const [parsedImages, setParsedImages] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [parseMvSelection, setParseMvSelection] = useState<string[]>([]);

  const baseApiUrl = useMemo(() => (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/mvs$/, ''), []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${baseApiUrl}/mvs`);
      const data = await res.json();
      if (data.success) {
        setMvData(data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch MVs');
    }
  };

  const fetchUnorganized = async () => {
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/unorganized`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      const data = await res.json();
      if (data.success) {
        setUnorganizedGroups(data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch unorganized fanarts');
    }
  };

  useEffect(() => {
    fetchData();
    fetchUnorganized();
  }, [baseApiUrl]);

  const mvsOptions: Option[] = useMemo(() => {
    const tagOpts: Option[] = [
      { label: '綜合合繪', value: 'tag:collab' },
      { label: 'ACAね', value: 'tag:acane' },
      { label: '實物', value: 'tag:real' },
      { label: '海膽栗子', value: 'tag:uniguri' },
      { label: '生薑', value: 'tag:shoga' },
    ];
    const opts = mvData.map(mv => ({ label: mv.title, value: mv.id }));
    return [...tagOpts, ...opts];
  }, [mvData]);

  // Flatten unorganized media
  const unorganizedMedia = useMemo(() => {
    const mediaList: any[] = [];
    unorganizedGroups.forEach(g => {
      g.media?.forEach((m: any) => {
        mediaList.push({ ...m, group: g });
      });
    });
    return mediaList;
  }, [unorganizedGroups]);

  const mediaAssociations = useMemo(() => {
    const map = new Map<string, { mvIds: Set<string>; tags: Set<string> }>();
    mvData.forEach(mv => {
      mv.images?.forEach((img: any) => {
        if (img.type !== 'fanart') return;
        const mediaId = img.id;
        if (!mediaId) return;
        const currentTags = Array.isArray(img.tags) ? img.tags : [];
        if (!map.has(mediaId)) {
          map.set(mediaId, { mvIds: new Set(), tags: new Set(currentTags) });
        }
        const entry = map.get(mediaId)!;
        entry.mvIds.add(mv.id);
        currentTags.forEach((t: string) => entry.tags.add(t));
      });
    });
    return map;
  }, [mvData]);

  // MV selection logic
  const selectedMvData = useMemo(() => {
    if (activeTab.startsWith('mv:')) {
      const id = activeTab.replace('mv:', '');
      return mvData.find(m => m.id === id);
    }
    if (activeTab.startsWith('tag:')) {
      const id = activeTab;
      // Find all media in mvData that have this tag
      const allImagesWithTag: any[] = [];
      const seenIds = new Set();
      
      mvData.forEach(mv => {
        mv.images?.forEach((img: any) => {
          if (img.type === 'fanart' && img.tags?.includes(id) && !seenIds.has(img.id)) {
            seenIds.add(img.id);
            allImagesWithTag.push(img);
          }
        });
      });
      
      return {
        id,
        title:
          id === 'tag:collab'
            ? '綜合合繪'
            : id === 'tag:acane'
              ? 'ACAね'
              : id === 'tag:real'
                ? '實物'
                : id === 'tag:uniguri'
                  ? '海膽栗子'
                  : '生薑',
        images: allImagesWithTag
      };
    }
    return null;
  }, [activeTab, mvData]);

  const handleAssignMedia = async (mediaId: string, groupId: string) => {
    const mvs = selectedMvs[mediaId] || [];
    if (mvs.length === 0) return toast.error('請至少選擇一個關聯的 MV 或標籤');
    
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/media/${mediaId}/assign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' 
        },
        body: JSON.stringify({ mvs, groupId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('已保存並關聯');
        setUnorganizedGroups(prev => prev.filter(g => g.id !== groupId));
        fetchData(); // refresh mv data
      } else {
        toast.error(data.error || '保存失敗');
      }
    } catch (err) {
      toast.error('保存發生錯誤');
    }
  };

  const handleDiscardGroup = async (groupId: string) => {
    if (!window.confirm('確定要捨棄整篇推文嗎？這將不會保存到畫廊中。')) return;
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/${groupId}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify({ status: 'deleted' })
      });
      if (res.ok) {
        toast.success('已捨棄推文');
        setUnorganizedGroups(prev => prev.filter(g => g.id !== groupId));
      }
    } catch (e) {
      toast.error('刪除失敗');
    }
  };

  const handleRemoveFromMv = async (mediaId: string, mvId: string) => {
    const isTag = mvId.startsWith('tag:');
    if (!window.confirm(`確定要${isTag ? '移除這個標籤' : '從這個 MV 中移除此圖片'}嗎？`)) return;
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/media/${mediaId}/remove-mv`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' 
        },
        body: JSON.stringify({ mvId })
      });
      if (res.ok) {
        toast.success('已移除');
        fetchData();
      }
    } catch (e) {
      toast.error('移除失敗');
    }
  };

  const handleUpdateAssociations = async (mediaId: string, mvs: string[]) => {
    if (mvs.length === 0) return toast.error('請至少選擇一個 MV 或標籤');
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/media/${mediaId}/assign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' 
        },
        body: JSON.stringify({ mvs })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('已更新關聯');
        fetchData();
      } else {
        toast.error(data.error || '更新失敗');
      }
    } catch (err) {
      toast.error('更新發生錯誤');
    }
  };

  // Parse logic
  const handleParse = async () => {
    if (!tweetUrl.trim()) return toast.error('請輸入推文網址');
    const urls = tweetUrl.split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) return;

    setIsParsing(true);
    setBatchStatus({ total: urls.length, current: 0, failedUrls: [] });
    
    let currentFailedUrls: string[] = [];
    let allNewImages: any[] = [];

    try {
      const apiUrl = `${baseApiUrl}/mvs/twitter-resolve`;
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
            const newImages = json.data.map((media: any) => ({
              url: media.url,
              thumbnail: media.thumbnail || '',
              tweetUrl: url,
              tweetText: media.text,
              tweetAuthor: media.user_name,
              tweetHandle: media.user_screen_name,
              tweetDate: media.date,
              type: 'fanart',
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
      toast.error('解析過程發生錯誤');
      setBatchStatus(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveParsed = async () => {
    if (parsedImages.length === 0) return toast.error('沒有可保存的圖片');
    if (parseMvSelection.length === 0) return toast.error('請至少選擇一個關聯的 MV 或標籤');
    
    setIsSaving(true);
    try {
      const mvIds = parseMvSelection.filter(m => !m.startsWith('tag:'));
      const tags = parseMvSelection.filter(m => m.startsWith('tag:'));
      
      if (mvIds.length === 0) {
        setIsSaving(false);
        return toast.error('手動解析保存時必須至少選擇一個 MV');
      }

      const imagesToSave = parsedImages.map(img => ({ ...img, tags }));

      if (mvIds.length > 0) {
        const updatedMvs = mvData.filter(mv => mvIds.includes(mv.id)).map(mv => ({
          ...mv,
          images: [...(mv.images || []), ...imagesToSave]
        }));

        const response = await fetch(`${baseApiUrl}/mvs/update`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
          },
          body: JSON.stringify({ data: updatedMvs, partial: true }),
        });

        if (!response.ok) throw new Error('保存失敗');
      }
      
      toast.success('FanArt 已成功保存！');
      setParsedImages([]);
      setParseMvSelection([]);
      fetchData();
    } catch (e: any) {
      toast.error('保存時發生錯誤');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex bg-background text-foreground overflow-hidden font-mono">
      {/* Sidebar */}
      <div className="w-64 border-r-4 border-black bg-card flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b-4 border-black font-black uppercase tracking-widest text-lg">
          維護中心
        </div>
        
        <div className="p-2 flex flex-col gap-2">
          <button 
            className={`px-4 py-2 text-left font-bold border-2 border-transparent hover:border-black ${activeTab === 'unorganized' ? 'bg-ztmy-blue text-white border-black shadow-neo-sm' : ''}`}
            onClick={() => setActiveTab('unorganized')}
          >
            未整理 ({unorganizedGroups.length})
          </button>
          <button 
            className={`px-4 py-2 text-left font-bold border-2 border-transparent hover:border-black ${activeTab === 'parse' ? 'bg-ztmy-purple text-white border-black shadow-neo-sm' : ''}`}
            onClick={() => setActiveTab('parse')}
          >
            手動解析推文
          </button>
        </div>

        <div className="px-4 py-2 font-black uppercase text-sm border-y-4 border-black bg-muted">
          特殊標籤
        </div>

        <div className="p-2 flex flex-col gap-1">
          {['tag:collab', 'tag:acane', 'tag:real', 'tag:uniguri', 'tag:shoga'].map(tagId => {
            let count = 0;
            const seen = new Set();
            mvData.forEach(mv => {
              mv.images?.forEach((img: any) => {
                if (img.type === 'fanart' && img.tags?.includes(tagId) && !seen.has(img.id)) {
                  seen.add(img.id);
                  count++;
                }
              });
            });

            return (
              <button
                key={tagId}
                className={`px-2 py-2 text-left font-bold border-2 border-transparent hover:border-black text-sm flex justify-between items-center ${activeTab === tagId ? 'bg-ztmy-green text-black border-black shadow-neo-sm' : ''}`}
                onClick={() => setActiveTab(tagId)}
              >
                <span className="truncate pr-2">
                  {tagId === 'tag:collab'
                    ? '綜合合繪'
                    : tagId === 'tag:acane'
                      ? 'ACAね'
                      : tagId === 'tag:real'
                        ? '實物'
                        : tagId === 'tag:uniguri'
                          ? '海膽栗子'
                          : '生薑'}
                </span>
                <span className="bg-black text-white px-2 py-0.5 rounded-full text-xs shrink-0">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2 font-black uppercase text-sm border-y-4 border-black bg-muted mt-2">
          依 MV 維護
        </div>

        <div className="p-2 flex flex-col gap-1 overflow-y-auto flex-1">
          {mvData.map(mv => {
            const fanartCount = mv.images?.filter((i: any) => i.type === 'fanart').length || 0;
            return (
              <button
                key={mv.id}
                className={`px-2 py-2 text-left font-bold border-2 border-transparent hover:border-black text-sm flex justify-between items-center ${activeTab === `mv:${mv.id}` ? 'bg-ztmy-green text-black border-black shadow-neo-sm' : ''}`}
                onClick={() => setActiveTab(`mv:${mv.id}`)}
              >
                <span className="truncate pr-2">{mv.title}</span>
                <span className="bg-black text-white px-2 py-0.5 rounded-full text-xs shrink-0">{fanartCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-muted">
        {activeTab === 'unorganized' && (
          <div className="p-6">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-6">未整理的 FanArt</h2>
            {unorganizedMedia.length === 0 ? (
              <div className="text-center p-12 border-4 border-dashed border-black/20 text-black/50 font-bold uppercase text-lg">
                無未整理項目
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {unorganizedMedia.map(media => (
                  <div key={media.id} className="bg-card border-4 border-black shadow-neo flex flex-col overflow-hidden">
                    <div className="aspect-square bg-black relative border-b-4 border-black">
                      <img src={media.url || media.original_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2 flex flex-col gap-2 flex-1">
                      <div className="text-xs truncate font-bold opacity-70">
                        {media.group?.post_date ? new Date(media.group.post_date).toLocaleDateString() : ''}
                      </div>
                      <MultiSelect
                        options={mvsOptions}
                        selected={selectedMvs[media.id] || []}
                        onChange={(sel) => setSelectedMvs(prev => ({ ...prev, [media.id]: sel }))}
                        placeholder="選擇 MV/標籤..."
                        className="border-2 border-black bg-white"
                      />
                      <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          className="h-8 text-xs bg-red-500 text-white font-black hover:bg-red-600 border-2 border-black"
                          onClick={() => handleDiscardGroup(media.group.id)}
                        >
                          捨棄推文
                        </Button>
                        <Button 
                          className="h-8 text-xs bg-ztmy-green text-black font-black hover:bg-[#8aff8a] border-2 border-black"
                          onClick={() => handleAssignMedia(media.id, media.group.id)}
                        >
                          保存關聯
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'parse' && (
          <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-2">手動解析推文</h2>
            <div className="bg-card border-4 border-black p-4 shadow-neo flex flex-col gap-4">
              <textarea
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                placeholder="貼上 Twitter/X 網址 (支援多行)"
                className="w-full h-32 p-3 font-mono text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-black/20 resize-none bg-background"
              />
              <Button 
                onClick={handleParse} 
                disabled={isParsing || !tweetUrl.trim()}
                className="bg-black text-white hover:bg-black/80 font-bold uppercase tracking-wider self-end border-2 border-black shadow-neo-sm"
              >
                {isParsing ? '解析中...' : '開始解析'}
              </Button>
              {batchStatus && (
                <div className="mt-4 p-4 border-2 border-black bg-muted">
                  <div className="flex justify-between font-bold mb-2">
                    <span>解析進度</span>
                    <span>{batchStatus.current} / {batchStatus.total}</span>
                  </div>
                  <div className="h-4 bg-background border-2 border-black w-full overflow-hidden">
                    <div 
                      className="h-full bg-ztmy-blue transition-all duration-300"
                      style={{ width: `${(batchStatus.current / batchStatus.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {parsedImages.length > 0 && (
              <div className="bg-card border-4 border-black p-4 shadow-neo flex flex-col gap-4">
                <div className="flex justify-between items-center border-b-4 border-black pb-4">
                  <h3 className="text-lg font-black uppercase">待保存 ({parsedImages.length})</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-[200px]">
                      <MultiSelect
                        options={mvsOptions}
                        selected={parseMvSelection}
                        onChange={setParseMvSelection}
                        placeholder="選擇目標 MV..."
                        className="border-2 border-black bg-white"
                      />
                    </div>
                    <Button 
                      onClick={handleSaveParsed} 
                      disabled={isSaving || parsedImages.length === 0}
                      className="bg-ztmy-green text-black hover:bg-[#8aff8a] font-bold uppercase tracking-wider border-2 border-black shadow-neo-sm"
                    >
                      {isSaving ? '保存中...' : '全部保存'}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {parsedImages.map((img, i) => (
                    <div key={i} className="border-4 border-black bg-muted relative group aspect-square">
                      <img src={img.url} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setParsedImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 border-2 border-black text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedMvData && (
          <div className="p-6">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-6">{selectedMvData.title}</h2>
            {selectedMvData.images?.filter((i: any) => i.type === 'fanart').length === 0 ? (
              <div className="text-center p-12 border-4 border-dashed border-black/20 text-black/50 font-bold uppercase text-lg">
                此 MV 尚未關聯任何 FanArt
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {selectedMvData.images?.filter((i: any) => i.type === 'fanart').map((media: any) => {
                  const assoc = mediaAssociations.get(media.id);
                  const defaultSel = [
                    ...(assoc ? Array.from(assoc.tags) : []),
                    ...(assoc ? Array.from(assoc.mvIds) : []),
                  ];
                  const currentSel = editMvs[media.id] ?? defaultSel;

                  return (
                    <div key={media.id} className="bg-card border-4 border-black shadow-neo flex flex-col overflow-hidden">
                      <div className="aspect-square bg-black relative border-b-4 border-black">
                        <img src={media.url} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2 flex flex-col gap-2">
                        <MultiSelect
                          options={mvsOptions}
                          selected={currentSel}
                          onChange={(sel) => setEditMvs(prev => ({ ...prev, [media.id]: sel }))}
                          placeholder="補充關聯 MV/標籤..."
                          className="border-2 border-black bg-white"
                        />
                        <Button
                          className="h-8 text-xs bg-ztmy-green text-black font-black hover:bg-[#8aff8a] border-2 border-black w-full"
                          onClick={() => handleUpdateAssociations(media.id, currentSel)}
                        >
                          更新關聯
                        </Button>
                        <div className="text-xs truncate opacity-70 mb-2">
                          {media.tags?.includes('tag:collab') ? '合繪 ' : ''}
                          {media.tags?.includes('tag:acane') ? 'ACAね ' : ''}
                          {media.tags?.includes('tag:real') ? '實物 ' : ''}
                          {media.tags?.includes('tag:uniguri') ? '海膽栗子 ' : ''}
                          {media.tags?.includes('tag:shoga') ? '生薑 ' : ''}
                        </div>
                        <Button 
                          variant="outline" 
                          className="h-8 text-xs bg-red-500 text-white font-black hover:bg-red-600 border-2 border-black w-full"
                          onClick={() => handleRemoveFromMv(media.id, selectedMvData.id)}
                        >
                          {selectedMvData.id.startsWith('tag:') ? '移除標籤' : '從此 MV 移除'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
