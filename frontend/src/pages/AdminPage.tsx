import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';
import { Plus, Trash2, Save, ArrowLeft, Image as ImageIcon, Hash, Disc, Youtube, Tv, Ruler, CheckCircle2, AlertCircle, RefreshCw, Play, AlertTriangle, Filter, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AdminPageProps {
  mvData: MVItem[];
  onRefresh?: () => void;
}

export function AdminPage({ mvData, onRefresh }: AdminPageProps) {
  const [data, setData] = useState<MVItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // 圖片列表分批加載狀態
  const [imageDisplayLimit, setImageDisplayLimit] = useState(12);
  const imageSentinelRef = useRef<HTMLDivElement>(null);
  
  // 批處理狀態
  const [batchStatus, setBatchStatus] = useState<{
    total: number;
    current: number;
    failedIndices: number[];
  } | null>(null);
  
  // 新增欄位同步狀態
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldDefaultValue, setNewFieldDefaultValue] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (mvData && mvData.length > 0) {
      // 按年份和日期降序排序（最新的排在最前）
      const sortedData = [...mvData].sort((a, b) => {
        const dateA = `${a.year}-${a.date || ''}`;
        const dateB = `${b.year}-${b.date || ''}`;
        return dateB.localeCompare(dateA);
      });
      setData(JSON.parse(JSON.stringify(sortedData))); 
    }
  }, [mvData]);

  // 註冊鍵盤快捷鍵 Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setIsConfirmOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

    // 自動關閉提示
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
const currentMV = data[activeIndex];

  // 當切換影片時重置圖片顯示數量
  useEffect(() => {
    setImageDisplayLimit(12);
  }, [activeIndex]);

  // 滾動自動加載圖片列表邏輯 (Admin 側)
  useEffect(() => {
    if (!currentMV?.images || imageDisplayLimit >= currentMV.images.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setImageDisplayLimit((prev) => prev + 12);
        }
      },
      { rootMargin: '200px' } // 提前觸發以保持流暢
    );

    if (imageSentinelRef.current) {
      observer.observe(imageSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [currentMV?.images, imageDisplayLimit]);

  const visibleImages = useMemo(() => {
    return (currentMV?.images || []).slice(0, imageDisplayLimit);
  }, [currentMV?.images, imageDisplayLimit]);

  // 動態檢測欄位是否為空 (支持未來新增的欄位)
  const isFieldIncomplete = (val: any) => {
    if (val === undefined || val === null) return true;
    if (typeof val === 'string') return val.trim() === '';
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'number') return val === 0;
    return false;
  };

  // 檢測整個 MV 項目是否完整
  const isMVIncomplete = (mv: MVItem) => {
    // 1. 檢查頂層欄位 (id, title, year, youtube, 或是透過 Schema 工具新增的欄位)
    const hasBasicEmpty = Object.values(mv).some(value => isFieldIncomplete(value));
    
    // 2. 深度檢查設定圖陣列中的每一項 (URL 不能為空，寬高不能為 0)
    const hasImageEmpty = mv.images?.some(img => 
      isFieldIncomplete(img.url) || isFieldIncomplete(img.width) || isFieldIncomplete(img.height)
    );

    return hasBasicEmpty || !!hasImageEmpty;
  };

  const getErrorClass = (val: any) => isFieldIncomplete(val) ? 'border-red-500/50 bg-red-500/5' : '';

  // 更新單個欄位
  const updateField = (field: keyof MVItem, value: any) => {
    const targetId = currentMV.id;
    setData(prevData => prevData.map(mv => 
      mv.id === targetId ? { ...mv, [field]: value } : mv
    ));
  };

  // 更新圖片陣列
  const updateImage = (imgIdx: number, field: string, value: any) => {
    const targetId = currentMV.id;
    setData(prevData => prevData.map(mv => {
      if (mv.id !== targetId) return mv;
      const newImages = [...(mv.images || [])];
      newImages[imgIdx] = { ...newImages[imgIdx], [field]: value };
      return { ...mv, images: newImages };
    }));
  };

  // 核心偵測邏輯抽離
  const probeImageSize = async (url: string) => {
    // 探測時使用 'full' 模式獲取原始比例 WebP
    const proxiedUrl = getProxyImgUrl(url, 'full');
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/\/mvs$/, '/mvs/probe');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: proxiedUrl }),
      });
      if (!response.ok) throw new Error('Network Error');
      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  // 一鍵獲取所有圖片尺寸 (帶分批邏輯)
  const handleBatchProbe = async (retryIndices?: number[]) => {
    const targetId = currentMV.id;
    const images = currentMV.images || [];
    const indicesToProcess = retryIndices || images.map((_, i) => i).filter(i => images[i].url);
    
    if (indicesToProcess.length === 0) return;

    setBatchStatus({
      total: indicesToProcess.length,
      current: 0,
      failedIndices: []
    });

    const chunkSize = 3; // 每組併發 3 個請求，避免壓力過大
    const failed: number[] = [];

    for (let i = 0; i < indicesToProcess.length; i += chunkSize) {
      const chunk = indicesToProcess.slice(i, i + chunkSize);
      
      await Promise.all(chunk.map(async (imgIdx) => {
        try {
          const result = await probeImageSize(images[imgIdx].url);
          
          // 使用函數式更新確保狀態正確
          setData(prevData => prevData.map(mv => {
            if (mv.id !== targetId) return mv;
            const newImages = [...(mv.images || [])];
            newImages[imgIdx] = { ...newImages[imgIdx], width: result.width, height: result.height };
            return { ...mv, images: newImages };
          }));
        } catch (err) {
          failed.push(imgIdx);
        } finally {
          setBatchStatus(prev => prev ? { ...prev, current: prev.current + 1 } : null);
        }
      }));

      // 稍微停頓一下，給服務器喘息時間
      if (i + chunkSize < indicesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setBatchStatus(prev => prev ? { ...prev, failedIndices: failed } : null);
    
    if (failed.length === 0) {
      showNotify('success', '所有圖片尺寸獲取完成');
      setTimeout(() => setBatchStatus(null), 3000);
    } else {
      showNotify('error', `任務結束，其中 ${failed.length} 張圖片獲取失敗`);
    }
  };

  // 調用後端偵測尺寸 (單個)
  const handleProbe = async (imgIdx: number, url: string) => {
    if (!url) return;
    const targetId = currentMV.id;
    try {
      const result = await probeImageSize(url);
      
      // 合併更新寬高，避免兩次調用 updateImage 導致的異步覆蓋問題
      setData(prevData => prevData.map(mv => {
        if (mv.id !== targetId) return mv;
        const newImages = [...(mv.images || [])];
        newImages[imgIdx] = { ...newImages[imgIdx], width: result.width, height: result.height };
        return { ...mv, images: newImages };
      }));

      showNotify('success', '尺寸偵測完成');
    } catch (err: any) {
      showNotify('error', '尺寸獲取失敗: ' + err.message);
    }
  };

  const addImage = () => {
    const images = [...(currentMV.images || []), { url: '', caption: '', alt: '', richText: '', width: 0, height: 0 }];
    updateField('images', images);
    // 確保新增的圖片在視線範圍內
    setImageDisplayLimit(prev => Math.max(prev, images.length));
  };

  const removeImage = (imgIdx: number) => {
    const images = currentMV.images?.filter((_, i) => i !== imgIdx);
    updateField('images', images);
  };

  const addNewMV = () => {
    const newItem: MVItem = {
      id: `new-mv-${Date.now()}`,
      title: "新影片標題",
      year: new Date().getFullYear().toString(),
      date: "",
      album: [],
      artist: "Waboku",
      youtube: "",
      description: "",
      images: [],
      coverImages: [],
      keywords: []
    };
    setData([newItem, ...data]);
    setActiveIndex(0);
  };

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  // 同步新欄位到所有數據
  const handleSyncNewField = () => {
    const field = newFieldName.trim();
    if (!field) {
      showNotify('error', '請輸入有效的欄位名稱');
      return;
    }

    setData(prevData => prevData.map(item => ({
      ...item,
      [field]: (item as any)[field] !== undefined ? (item as any)[field] : newFieldDefaultValue
    })));

    showNotify('success', `已為所有項目同步欄位: [${field}]`);
    setNewFieldName('');
    setNewFieldDefaultValue('');
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsConfirmOpen(false); // 關閉確認視窗
    
    try {
      setIsSaving(true);
      
      const apiUrl = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/(\/mvs)?$/, '/mvs/update');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('儲存失敗');
      showNotify('success', '數據回寫成功，當前狀態已保存');
      
      // 註解掉引發刷新頁面的回調，以保留左側列表焦點
      // if (onRefresh) onRefresh();
    } catch (err: any) {
      showNotify('error', '儲存失敗: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentMV) return null;
  return (

    <div className="h-screen bg-background text-foreground flex flex-col font-mono overflow-hidden">
      {/* 頂部控制欄 */}
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm z-50">
        <div className="flex items-center gap-4">
          <Button variant="neutral" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4" /> 返回
          </Button>
          <h1 className="font-black uppercase tracking-tighter text-xl border-l-4 border-black pl-4">
            Console_Maintenance_v3
          </h1>
        </div>
        <div className="flex gap-4">
          <Button 
            variant={showOnlyIncomplete ? "default" : "neutral"} 
            size="sm" 
            onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
            className={showOnlyIncomplete ? "bg-red-500 text-white shadow-neo" : ""}
          >
            <Filter className="size-4" /> 
            <span className="hidden md:inline">
              {showOnlyIncomplete ? '正在查看待完善' : '只看待完善'}
            </span>
          </Button>
          <Button variant="default" size="sm" onClick={addNewMV} className="bg-main text-black">
            <Plus className="size-4" /> 新增條目
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setIsConfirmOpen(true)} 
            disabled={isSaving}
            className="bg-ztmy-green text-black shadow-neo"
          >
            <Save className="size-4" /> {isSaving ? '同步中...' : '儲存回寫 (COMMIT)'}
          </Button>
        </div>
      </div>

      {/* 自定義 Alert 組件 (Toast) */}
      {notification && (
        <div className={`fixed top-24 right-8 z-[100] flex items-center gap-3 px-6 py-4 border-4 border-black shadow-neo animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'success' ? 'bg-ztmy-green text-black' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
          <span className="font-bold uppercase tracking-tight text-sm">{notification.message}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* 左側列表 */}
        <div className="w-80 border-r-4 border-black bg-card h-full flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {data.filter(mv => !showOnlyIncomplete || isMVIncomplete(mv)).map((mv) => {
              const isIncomplete = isMVIncomplete(mv);
              const originalIndex = data.findIndex(item => item.id === mv.id);
              
              return (
            <div 
              key={mv.id}
              onClick={() => setActiveIndex(originalIndex)}
              className={`p-4 border-b-2 border-black cursor-pointer transition-colors group flex justify-between items-center ${
                originalIndex === activeIndex ? 'bg-black text-ztmy-green' : 'hover:bg-main/10'
              } ${isIncomplete ? 'border-l-4 border-l-red-500' : ''}`}
            >
              <div className="truncate pr-2">
                <div className="text-[10px] opacity-50 mb-1 flex items-center gap-1">
                  #{mv.id} {isIncomplete && <AlertTriangle className="size-3 text-red-500" />}
                </div>
                <div className="font-bold text-sm truncate">{mv.title}</div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('確定刪除？')) {
                    setData(data.filter(item => item.id !== mv.id));
                    setActiveIndex(0);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
              );
            })}
          </div>
        </div>

        {/* 右側表單 */}
        <div className="flex-1 h-full overflow-y-auto p-12 custom-scrollbar bg-card/50">
          <div className="max-w-4xl mx-auto space-y-12 pb-24">
            

            
            {/* 基礎資訊區塊 */}
            <section className="space-y-6">
              <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">01_Basic_Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-bold opacity-50 uppercase">MV_Unique_ID</label>
                  <Input 
                    value={currentMV.id} 
                    onChange={(e) => updateField('id', e.target.value)} 
                    className={getErrorClass(currentMV.id)}
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-bold opacity-50 uppercase">MV_Title</label>
                  <Input 
                    value={currentMV.title} 
                    onChange={(e) => updateField('title', e.target.value)} 
                    className={getErrorClass(currentMV.title)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold opacity-50 uppercase">Description</label>
                  <Textarea 
                    value={currentMV.description} 
                    onChange={(e) => updateField('description', e.target.value)}
                    className={`min-h-[200px] font-sans text-sm ${getErrorClass(currentMV.description)}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase">Release_Year</label>
                  <Input 
                    value={currentMV.year} 
                    onChange={(e) => updateField('year', e.target.value)} 
                    className={getErrorClass(currentMV.year)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase">Full_Date</label>
                  <Input 
                    value={currentMV.date} 
                    onChange={(e) => updateField('date', e.target.value)} 
                    className={getErrorClass(currentMV.date)}
                  />
                </div>
              </div>
            </section>

            {/* 媒體與關聯區塊 */}
            <section className="space-y-6">
              <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">02_Media_Connections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2"><Youtube className="size-3"/> Youtube_ID</label>
                  <Input 
                    value={currentMV.youtube} 
                    onChange={(e) => updateField('youtube', e.target.value)} 
                    className={getErrorClass(currentMV.youtube)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2"><Tv className="size-3"/> Bilibili_BV</label>
                  <Input 
                    value={currentMV.bilibili || ''} 
                    onChange={(e) => updateField('bilibili', e.target.value)} 
                    className={getErrorClass(currentMV.bilibili)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase">Artist / Animator</label>
                  <Input 
                    value={currentMV.artist} 
                    onChange={(e) => updateField('artist', e.target.value)} 
                    className={getErrorClass(currentMV.artist)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2">
                    <Disc className="size-3" /> Albums (每行一個項目)
                  </label>
                  <Textarea 
                    value={currentMV.album?.join('\n')} 
                    onChange={(e) => updateField('album', e.target.value.split('\n').map(s => s.trim()).filter(s => s !== ''))} 
                    className={`min-h-[50px] font-sans text-sm ${getErrorClass(currentMV.album)}`}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2">
                    <Hash className="size-3" /> Keywords / Tags (每行一個項目)
                  </label>
                  <Textarea 
                    value={currentMV.keywords?.join('\n')} 
                    onChange={(e) => updateField('keywords', e.target.value.split('\n').map(s => s.trim()).filter(s => s !== ''))} 
                    className={`min-h-[200px] font-sans text-sm ${getErrorClass(currentMV.keywords)}`}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2">
                    <ImageIcon className="size-3" /> Cover Images (封面輪播，每行一個網址)
                  </label>
                  <Textarea 
                    value={currentMV.coverImages?.join('\n')} 
                    onChange={(e) => updateField('coverImages', e.target.value.split('\n').map(s => s.trim()).filter(s => s !== ''))} 
                    className={`min-h-[100px] font-sans text-sm ${getErrorClass(currentMV.coverImages)}`}
                  />
                </div>
              </div>
            </section>

            {/* 設定圖管理 (瀑布流數據源) */}
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">03_Setting_Images_Gallery</h3>
                  <span className="text-[10px] opacity-40 font-bold ml-2">TOTAL_COUNT: {currentMV.images?.length || 0}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="neutral" 
                    size="sm" 
                    onClick={() => handleBatchProbe()} 
                    disabled={!!batchStatus && batchStatus.current < batchStatus.total}
                    className="bg-ztmy-green/10"
                  >
                    <Play className="size-3" /> 一鍵獲取尺寸
                  </Button>
                  <Button variant="neutral" size="sm" onClick={addImage}>
                    <ImageIcon className="size-3" /> 增加圖片
                  </Button>
                </div>
              </div>

              {/* 批處理進度條 */}
              {batchStatus && (
                <div className="border-4 border-black p-4 bg-secondary-background shadow-neo-sm space-y-3">
                  <div className="flex justify-between items-center text-xs font-black uppercase">
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`size-3 ${batchStatus.current < batchStatus.total ? 'animate-spin' : ''}`} />
                      PROBING_PROGRESS: {batchStatus.current} / {batchStatus.total}
                    </div>
                    {batchStatus.failedIndices.length > 0 && (
                      <div className="text-red-500 flex items-center gap-2">
                        <AlertTriangle className="size-3" /> FAILED: {batchStatus.failedIndices.length}
                        <button 
                          onClick={() => handleBatchProbe(batchStatus.failedIndices)}
                          className="underline hover:text-black transition-colors ml-2"
                        >
                          [RETRY_FAILED]
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="h-4 w-full bg-black/10 border-2 border-black overflow-hidden">
                    <div 
                      className="h-full bg-main transition-all duration-300" 
                      style={{ width: `${(batchStatus.current / batchStatus.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {visibleImages.map((img, imgIdx) => (
                  <div key={imgIdx} className="p-4 border-2 border-black bg-background shadow-neo-sm relative group">
                    <button 
                      onClick={() => removeImage(imgIdx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-black"
                    >
                      <Trash2 className="size-3" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex gap-2">
                          <Input 
                            placeholder="圖片 URL" 
                            value={img.url} 
                            onChange={(e) => updateImage(imgIdx, 'url', e.target.value)} 
                            className={`flex-1 ${!img.url?.trim() ? 'border-red-500/50 bg-red-500/5' : ''}`} />
                          <Button variant="neutral" size="icon" onClick={() => handleProbe(imgIdx, img.url)} title="自動偵測尺寸">
                            <Ruler className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="flex items-center gap-2 bg-black/5 px-2 rounded">
                              <span className="text-[10px] font-bold opacity-40">W</span>
                              <Input 
                                type="number" 
                                placeholder="寬度" 
                                value={img.width || ''} 
                                onChange={(e) => updateImage(imgIdx, 'width', parseInt(e.target.value))} 
                                className={`h-7 border-none bg-transparent shadow-none ${!img.width ? 'text-red-500' : ''}`} />
                           </div>
                           <div className="flex items-center gap-2 bg-black/5 px-2 rounded">
                              <span className="text-[10px] font-bold opacity-40">H</span>
                              <Input 
                                type="number" 
                                placeholder="高度" 
                                value={img.height || ''} 
                                onChange={(e) => updateImage(imgIdx, 'height', parseInt(e.target.value))} 
                                className={`h-7 border-none bg-transparent shadow-none ${!img.height ? 'text-red-500' : ''}`} />
                           </div>
                        </div>
                        <Input placeholder="說明文字 (Caption)" value={img.caption || ''} onChange={(e) => updateImage(imgIdx, 'caption', e.target.value)} />
                        <Input placeholder="替代文字 (Alt)" value={img.alt || ''} onChange={(e) => updateImage(imgIdx, 'alt', e.target.value)} />
                        <Textarea 
                          placeholder="富文本 / 來源連結 (RichText)" 
                          value={img.richText || ''} 
                          onChange={(e) => updateImage(imgIdx, 'richText', e.target.value)} 
                          className="min-h-[200px] font-sans text-sm"
                        />
                      </div>
                      <div className="bg-black/5 border-2 border-dashed border-black/10 flex items-center justify-center overflow-hidden">
                        {img.url ? (
                          <img src={getProxyImgUrl(img.url, 'thumb')} className="max-h-40 object-contain" alt="preview" />
                        ) : (
                          <span className="text-[10px] opacity-30">NO_PREVIEW</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 圖片列表分段載入哨兵 */}
                {imageDisplayLimit < (currentMV.images?.length || 0) && (
                  <div ref={imageSentinelRef} className="py-8 flex justify-center border-4 border-dashed border-black/10 bg-black/5">
                    <div className="flex items-center gap-3 text-xs font-black uppercase opacity-40">
                      <RefreshCw className="size-4 animate-spin" />
                      Loading_More_Image_Editor_Fields...
                    </div>
                  </div>
                )}

                {(!currentMV.images || currentMV.images.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-black/10 opacity-30 text-xs italic uppercase">
                    No_Gallery_Data_Found
                  </div>
                )}
              </div>
            </section>
                        {/* 數據架構維護工具 (Schema Maintenance) */}
            <section className="p-6 border-4 border-dashed border-black bg-main/5 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase text-white bg-black px-2">00_Schema_Maintenance</h3>
                <span className="text-[10px] font-bold opacity-50 text-black">批量注入新屬性至所有數據條目</span>
              </div>
              <div className="flex flex-wrap md:flex-nowrap gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-60">New_Field_Key (e.g. director)</label>
                  <Input 
                    value={newFieldName} 
                    onChange={(e) => setNewFieldName(e.target.value)} 
                    placeholder="欄位鍵名" 
                    className="bg-white"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-60">Default_Value</label>
                  <Input 
                    value={newFieldDefaultValue} 
                    onChange={(e) => setNewFieldDefaultValue(e.target.value)} 
                    placeholder="默認值" 
                    className="bg-white"
                  />
                </div>
                <Button variant="default" onClick={handleSyncNewField} className="bg-black text-white shrink-0">
                  <RefreshCw className="size-4" /> 執行全局同步
                </Button>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* 保存確認彈窗 */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md border-4 border-black shadow-neo p-0 overflow-hidden bg-white text-black">
          <DialogHeader className="p-6 bg-ztmy-green border-b-4 border-black">
            <DialogTitle className="text-2xl font-black uppercase flex items-center gap-2">
              <HelpCircle className="size-6" /> Confirm_Action
            </DialogTitle>
            <DialogDescription className="text-black font-bold opacity-80">
              即將把當前所有變更回寫至服務器數據庫 (data.js)，此操作不可撤銷。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 bg-secondary-background flex gap-3">
            <Button variant="neutral" onClick={() => setIsConfirmOpen(false)} className="flex-1">
              [ESC] 取消
            </Button>
            <Button variant="default" onClick={handleSave} className="flex-1 bg-black text-white hover:bg-ztmy-green hover:text-black">
              [ENTER] 確定執行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    
    
  );
}