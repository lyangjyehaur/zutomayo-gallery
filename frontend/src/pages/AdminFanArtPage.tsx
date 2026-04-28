import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { getProxyImgUrl, isMediaVideo } from '@/lib/image';

export function AdminFanArtPage() {
  const [activeTab, setActiveTab] = useState<string>('unorganized');
  const [unorganizedGroups, setUnorganizedGroups] = useState<any[]>([]);
  const [deletedGroups, setDeletedGroups] = useState<any[]>([]);
  const [legacyMedia, setLegacyMedia] = useState<any[]>([]);
  const [tagSummary, setTagSummary] = useState<Record<string, number>>({});
  const [tagMedia, setTagMedia] = useState<any[]>([]);
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

  const fetchDeleted = async () => {
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/deleted`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      const data = await res.json();
      if (data.success) {
        setDeletedGroups(data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch deleted fanarts');
    }
  };

  const fetchLegacy = async () => {
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/legacy`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      const data = await res.json();
      if (data.success) {
        setLegacyMedia(data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch legacy fanarts');
    }
  };

  const fetchTagSummary = async () => {
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/tag-summary`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      const data = await res.json();
      if (data.success) {
        setTagSummary(data.data || {});
      }
    } catch (err) {
      toast.error('Failed to fetch tag summary');
    }
  };

  const fetchFanartsByTag = async (tagId: string) => {
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/by-tag/${encodeURIComponent(tagId)}`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      const data = await res.json();
      if (data.success) {
        setTagMedia(Array.isArray(data.data) ? data.data : []);
      } else {
        setTagMedia([]);
      }
    } catch (err) {
      toast.error('Failed to fetch fanarts by tag');
      setTagMedia([]);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUnorganized();
    fetchDeleted();
    fetchLegacy();
    fetchTagSummary();
  }, [baseApiUrl]);

  useEffect(() => {
    if (activeTab.startsWith('tag:')) {
      fetchFanartsByTag(activeTab);
    } else {
      setTagMedia([]);
    }
  }, [activeTab]);

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
        if (img.usage === 'cover') return;
        const mediaId = img.id;
        if (!mediaId) return;
        const currentTags = Array.isArray(img.tags) ? img.tags.map(normalizeTag) : [];
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

  const isYoutubeLike = (url?: string) => {
    if (!url) return false;
    return url.includes('ytimg.com') || url.includes('youtube.com') || url.includes('img.youtube.com');
  };

  const formatPostDateTime = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  function normalizeTag(tag: any) {
    if (!tag) return '';
    const str = String(tag);
    if (str.startsWith('tag:')) return str;
    return `tag:${str}`;
  }

  const getTagSet = (obj: any) => {
    const tags = Array.isArray(obj?.tags) ? obj.tags : [];
    return new Set(tags.map(normalizeTag).filter(Boolean));
  };

  const hasTag = (obj: any, tagId: string) => {
    return getTagSet(obj).has(tagId);
  };

  const getRawMediaUrl = (media: any) => {
    const originalUrl = media.original_url || media.originalUrl || '';
    const url = media.url || '';
    const prefer = originalUrl && !isYoutubeLike(originalUrl) ? originalUrl : url;
    return prefer || url;
  };

  const renderPreview = (media: any) => {
    const rawUrl = getRawMediaUrl(media);
    if (!rawUrl) return null;
    const video = isMediaVideo(rawUrl) || media.media_type === 'video';
    const src = getProxyImgUrl(rawUrl, video ? 'full' : 'thumb');
    if (video) {
      return <video src={src} className="w-full h-full object-cover" controls preload="metadata" />;
    }
    return <img src={src} className="w-full h-full object-cover" loading="lazy" />;
  };

  // MV selection logic
  const selectedMvData = useMemo(() => {
    if (activeTab.startsWith('mv:')) {
      const id = activeTab.replace('mv:', '');
      return mvData.find(m => m.id === id);
    }
    if (activeTab.startsWith('tag:')) {
      const id = activeTab;
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
        images: tagMedia
      };
    }
    return null;
  }, [activeTab, mvData, tagMedia]);

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
        fetchTagSummary();
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
        fetchDeleted();
      }
    } catch (e) {
      toast.error('刪除失敗');
    }
  };

  const handleRestoreGroup = async (groupId: string) => {
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/${groupId}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify({ status: 'unorganized' })
      });
      if (res.ok) {
        toast.success('已還原回未整理');
        setDeletedGroups(prev => prev.filter(g => g.id !== groupId));
        fetchUnorganized();
      }
    } catch (e) {
      toast.error('還原失敗');
    }
  };

  const handleUpdateAssociations = async (mediaId: string, mvs: string[]) => {
    if (mvs.length === 0) return toast.error('請至少選擇一個 MV 或標籤');
    try {
      const res = await fetch(`${baseApiUrl}/fanarts/media/${mediaId}/sync`, {
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
        fetchTagSummary();
        if (activeTab.startsWith('tag:')) fetchFanartsByTag(activeTab);
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
            className={`px-4 py-2 text-left font-bold border-2 border-transparent hover:border-black ${activeTab === 'deleted' ? 'bg-red-500 text-white border-black shadow-neo-sm' : ''}`}
            onClick={() => setActiveTab('deleted')}
          >
            已捨棄 ({deletedGroups.length})
          </button>
          <button 
            className={`px-4 py-2 text-left font-bold border-2 border-transparent hover:border-black ${activeTab === 'legacy' ? 'bg-yellow-200 text-black border-black shadow-neo-sm' : ''}`}
            onClick={() => setActiveTab('legacy')}
          >
            舊資料 ({legacyMedia.length})
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
            const count = tagSummary[tagId] || 0;

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
            const fanartCount = mv.images?.filter((i: any) => i.type === 'fanart' && i.usage !== 'cover' && !isYoutubeLike(i.original_url || i.url)).length || 0;
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
                      {renderPreview(media)}
                    </div>
                    <div className="p-2 flex flex-col gap-2 flex-1">
                      <div className="text-xs truncate font-bold opacity-70">
                        {formatPostDateTime(media.group?.post_date)}
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

        {activeTab === 'deleted' && (
          <div className="p-6">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-6">已捨棄的推文</h2>
            {deletedGroups.length === 0 ? (
              <div className="text-center p-12 border-4 border-dashed border-black/20 text-black/50 font-bold uppercase text-lg">
                無已捨棄項目
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {deletedGroups.map(group => {
                  const cover = group.media?.[0]?.url || group.images?.[0]?.url || '';
                  const coverOriginal = group.media?.[0]?.original_url || group.images?.[0]?.original_url || '';
                  const coverMedia = group.media?.[0] || group.images?.[0] || { url: cover, original_url: coverOriginal };
                  return (
                    <div key={group.id} className="bg-card border-4 border-black shadow-neo flex flex-col overflow-hidden">
                      <div className="aspect-video bg-black border-b-4 border-black">
                        {cover ? (
                          <div className="w-full h-full">
                            {renderPreview(coverMedia)}
                          </div>
                        ) : null}
                      </div>
                      <div className="p-3 flex flex-col gap-2">
                        <div className="text-xs font-bold opacity-70 truncate">
                          {formatPostDateTime(group.post_date)}
                        </div>
                        <div className="text-xs font-mono opacity-70 truncate" title={group.source_url || ''}>
                          {group.source_url || ''}
                        </div>
                        <Button
                          className="h-8 text-xs bg-yellow-200 text-black font-black hover:bg-yellow-300 border-2 border-black w-full"
                          onClick={() => handleRestoreGroup(group.id)}
                        >
                          還原回未整理
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'legacy' && (
          <div className="p-6">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-6">舊資料 / 異常 FanArt</h2>
            {legacyMedia.length === 0 ? (
              <div className="text-center p-12 border-4 border-dashed border-black/20 text-black/50 font-bold uppercase text-lg">
                無異常項目
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {legacyMedia.map((m: any) => (
                  <div key={m.id} className="bg-card border-4 border-black shadow-neo flex flex-col overflow-hidden">
                    <div className="aspect-square bg-black relative border-b-4 border-black">
                      {renderPreview(m)}
                    </div>
                    <div className="p-2 flex flex-col gap-2">
                      <div className="text-[10px] font-mono opacity-70 truncate" title={m.original_url || m.url}>
                        {m.original_url || m.url}
                      </div>
                      <div className="text-[10px] font-mono opacity-70 truncate" title={m.group?.source_url || ''}>
                        {m.group?.source_url || ''}
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
            {selectedMvData.images?.filter((i: any) => i.type === 'fanart' && i.usage !== 'cover' && !isYoutubeLike(i.original_url || i.url)).length === 0 ? (
              <div className="text-center p-12 border-4 border-dashed border-black/20 text-black/50 font-bold uppercase text-lg">
                此 MV 尚未關聯任何 FanArt
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {selectedMvData.images?.filter((i: any) => i.type === 'fanart' && i.usage !== 'cover' && !isYoutubeLike(i.original_url || i.url)).map((media: any) => {
                  const assoc = mediaAssociations.get(media.id);
                  const defaultSel = [
                    ...(assoc ? Array.from(assoc.tags) : []),
                    ...(assoc ? Array.from(assoc.mvIds) : []),
                  ];
                  const currentSel = editMvs[media.id] ?? defaultSel;
                  const tagSet = getTagSet(media);

                  return (
                    <div key={media.id} className="bg-card border-4 border-black shadow-neo flex flex-col overflow-hidden">
                      <div className="aspect-square bg-black relative border-b-4 border-black">
                        {renderPreview(media)}
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
                          {tagSet.has('tag:collab') ? '合繪 ' : ''}
                          {tagSet.has('tag:acane') ? 'ACAね ' : ''}
                          {tagSet.has('tag:real') ? '實物 ' : ''}
                          {tagSet.has('tag:uniguri') ? '海膽栗子 ' : ''}
                          {tagSet.has('tag:shoga') ? '生薑 ' : ''}
                        </div>
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
