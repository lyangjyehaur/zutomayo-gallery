import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect, Option } from '@/components/ui/multi-select';

interface StagingFanart {
  id: string;
  tweet_id: string;
  original_url: string;
  media_url: string;
  r2_url: string | null;
  media_type: string;
  crawled_at: string;
  status: string;
  source: string;
}

interface ProgressData {
  syncProgress: {
    status?: string;
    current_run_processed?: number;
    current_run_total?: number;
    total_crawled?: number;
    total_tweets?: number;
    processed_tweets?: number;
    saved_images?: number;
    saved_videos?: number;
    last_processed_id?: string;
  } | null;
  statusCounts: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export function AdminStagingFanartPage() {
  const [fanarts, setFanarts] = useState<StagingFanart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewStatus, setViewStatus] = useState<'pending' | 'rejected'>('pending');
  
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  
  const [searchTerms, setSearchTerms] = useState('from:zutomayo_art filter:media include:nativeretweets');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [maxItems, setMaxItems] = useState<number>(1000);

  const [mvs, setMvs] = useState<Option[]>([]);
  const [selectedMvs, setSelectedMvs] = useState<Record<string, string[]>>({});
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [batchSelectedMvs, setBatchSelectedMvs] = useState<string[]>([]);

  const baseApiUrl = useMemo(
    () => (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/mvs$/, ''),
    []
  );

  const fetchMvs = useCallback(async () => {
    try {
      const res = await fetch(`${baseApiUrl}/mvs`);
      const data = await res.json();
      if (data.success) {
        const tagOptions: Option[] = [
          { label: '綜合合繪', value: 'tag:collab' },
          { label: 'ACAね', value: 'tag:aca-ne' },
        ];
        const mvOptions: Option[] = data.data.map((mv: any) => ({ label: mv.title, value: mv.id }));
        setMvs([...tagOptions, ...mvOptions]);
      }
    } catch (error) {
      console.error('Failed to fetch MVs', error);
    }
  }, [baseApiUrl]);

  const fetchProgress = useCallback(async () => {
    setIsProgressLoading(true);
    try {
      const res = await fetch(`${baseApiUrl}/staging-fanarts/progress`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      const data = await res.json();
      if (data.success) {
        setProgress(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch progress', error);
    } finally {
      setIsProgressLoading(false);
    }
  }, [baseApiUrl]);

  const fetchFanarts = useCallback(async (p: number, status: 'pending' | 'rejected') => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseApiUrl}/staging-fanarts?page=${p}&limit=60&status=${status}`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      const data = await res.json();
      if (data.success) {
        setFanarts(data.data);
        setTotalPages(data.meta.totalPages);
      } else {
        toast.error(data.error || 'Failed to fetch');
      }
    } catch (error) {
      toast.error('Failed to fetch staging fanarts');
    } finally {
      setIsLoading(false);
    }
  }, [baseApiUrl]);

  useEffect(() => {
    fetchFanarts(page, viewStatus);
  }, [fetchFanarts, page, viewStatus]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    fetchMvs();
  }, [fetchMvs]);

  useEffect(() => {
    const status = progress?.syncProgress?.status;
    if (status && status !== 'idle' && status !== 'error') {
      const timer = setInterval(() => {
        fetchProgress();
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [fetchProgress, progress?.syncProgress?.status]);

  const switchViewStatus = (status: 'pending' | 'rejected') => {
    setViewStatus(status);
    setPage(1);
    setSelectedCards(new Set());
    setBatchSelectedMvs([]);
  };

  const handleTriggerCrawler = async () => {
    if (!searchTerms.trim()) {
      toast.error('請輸入 searchTerms');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('請選擇開始與結束日期');
      return;
    }

    if (startDate > endDate) {
      toast.error('開始日期不能大於結束日期');
      return;
    }
    
    setIsTriggering(true);
    try {
      const res = await fetch(`${baseApiUrl}/staging-fanarts/trigger`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' 
        },
        body: JSON.stringify({ 
          searchTerms,
          startDate: startDate,
          endDate: endDate,
          maxItems
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Crawler started');
        fetchProgress();
      } else {
        toast.error(data.error || 'Failed to start crawler');
      }
    } catch (error) {
      toast.error('Failed to trigger crawler');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'restore') => {
    try {
      const isApprove = action === 'approve';
      const isRestore = action === 'restore';
      const payload = isApprove ? { mvs: selectedMvs[id] || [] } : undefined;
      const endpointAction = isRestore ? 'restore' : action;

      const res = await fetch(`${baseApiUrl}/staging-fanarts/${id}/${endpointAction}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' 
        },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'restore' ? '已還原為待審核' : data.message);
        setFanarts(prev => prev.filter(f => f.id !== id));
        setSelectedCards(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        
        setProgress(prev => {
          if (!prev) return prev;
          if (action === 'restore') {
            return {
              ...prev,
              statusCounts: {
                ...prev.statusCounts,
                pending: prev.statusCounts.pending + 1,
                rejected: Math.max(0, prev.statusCounts.rejected - 1)
              }
            };
          }
          return {
            ...prev,
            statusCounts: {
              ...prev.statusCounts,
              pending: Math.max(0, prev.statusCounts.pending - 1),
              [action === 'approve' ? 'approved' : 'rejected']: prev.statusCounts[action === 'approve' ? 'approved' : 'rejected'] + 1
            }
          };
        });
        
        if (fanarts.length <= 1) {
          fetchFanarts(page, viewStatus);
        }
      } else {
        toast.error(data.error || `Failed to ${action}`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} staging fanart`);
    }
  };

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    if (selectedCards.size === 0) return;
    
    if (!window.confirm(`確定要批次${action === 'approve' ? '核准' : '拒絕'}這 ${selectedCards.size} 張卡片嗎？`)) {
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    const idsToProcess = Array.from(selectedCards);

    for (const id of idsToProcess) {
      try {
        const cardMvs = selectedMvs[id] || [];
        const combinedMvs = Array.from(new Set([...cardMvs, ...batchSelectedMvs]));
        const payload = action === 'approve' ? { mvs: combinedMvs } : {};
        const res = await fetch(`${baseApiUrl}/staging-fanarts/${id}/${action}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' 
          },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    toast.success(`批次操作完成：成功 ${successCount} 筆，失敗 ${failCount} 筆`);
    setSelectedCards(new Set());
    setBatchSelectedMvs([]);
    fetchFanarts(page, viewStatus);
    fetchProgress();
  };

  const handleBatchRestore = async () => {
    if (selectedCards.size === 0) return;
    if (!window.confirm(`確定要將這 ${selectedCards.size} 筆已拒絕資料還原回待審核嗎？`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${baseApiUrl}/staging-fanarts/batch-restore`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' 
        },
        body: JSON.stringify({ ids: Array.from(selectedCards) })
      });
      const data = await res.json();
      if (data.success) {
        const updatedCount = data.data?.updatedCount ?? 0;
        toast.success(`已還原 ${updatedCount} 筆`);
        setSelectedCards(new Set());
        setBatchSelectedMvs([]);
        fetchFanarts(page, viewStatus);
        fetchProgress();
      } else {
        toast.error(data.error || '批次還原失敗');
      }
    } catch (error) {
      toast.error('批次還原失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-secondary-background relative overflow-hidden">
      <div className="h-20 bg-background border-b-4 border-black flex items-center justify-between px-6 shrink-0 shadow-neo z-10">
        <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
          <i className="hn hn-image" /> Staging FanArts
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className={`border-2 border-black font-bold shadow-neo-sm h-8 ${viewStatus === 'pending' ? 'bg-yellow-200' : 'bg-white'}`}
              onClick={() => switchViewStatus('pending')}
            >
              待審核 ({progress?.statusCounts?.pending || 0})
            </Button>
            <Button
              variant="outline"
              className={`border-2 border-black font-bold shadow-neo-sm h-8 ${viewStatus === 'rejected' ? 'bg-red-200' : 'bg-white'}`}
              onClick={() => switchViewStatus('rejected')}
            >
              已拒絕 ({progress?.statusCounts?.rejected || 0})
            </Button>
          </div>
          <span className="text-sm font-bold font-mono">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-2 border-black font-bold shadow-neo-sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              上一頁
            </Button>
            <Button 
              variant="outline" 
              className="border-2 border-black font-bold shadow-neo-sm"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              下一頁
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-0">
          <div className="bg-card border-4 border-black shadow-neo p-4 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
              <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
                <i className="hn hn-chart-bar" /> 抓取進度與統計
              </h2>
              
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 flex-1 md:flex-none">
                  <span className="text-sm font-bold uppercase shrink-0">Search:</span>
                  <Input 
                    value={searchTerms}
                    onChange={(e) => setSearchTerms(e.target.value)}
                    className="border-2 border-black font-bold shadow-neo-sm h-8 w-[280px] md:w-[420px] bg-background"
                    placeholder="e.g. from:zutomayo_art filter:media include:nativeretweets"
                  />
                  <div className="flex items-center gap-1">
                    <Input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border-2 border-black font-bold shadow-neo-sm h-8 w-[140px] bg-background"
                    />
                    <span className="font-bold">-</span>
                    <Input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border-2 border-black font-bold shadow-neo-sm h-8 w-[140px] bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold uppercase shrink-0">最大抓取數量:</span>
                    <Input 
                      type="number"
                      value={maxItems}
                      onChange={(e) => setMaxItems(parseInt(e.target.value, 10) || 0)}
                      className="border-2 border-black font-bold shadow-neo-sm h-8 w-24 bg-background"
                      min={1}
                    />
                  </div>
                </div>
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-black text-white hover:bg-black/80 border-2 border-black font-bold shadow-neo-sm h-8"
                  onClick={handleTriggerCrawler}
                  disabled={isTriggering}
                >
                  <i className={`hn ${isTriggering ? 'hn-refresh animate-spin' : 'hn-play'} mr-2`} /> 抓取 {startDate && endDate ? `${startDate}~${endDate}` : '指定區間'} 的推文
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-2 border-black font-bold shadow-neo-sm h-8"
                  onClick={fetchProgress}
                  disabled={isProgressLoading}
                >
                  <i className={`hn hn-refresh ${isProgressLoading ? 'animate-spin' : ''} mr-2`} /> 更新
                </Button>
              </div>
            </div>

            <div className="mb-4 p-3 border-2 border-black bg-blue-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase text-sm opacity-70">目前狀態:</span>
                <span className="font-black text-lg text-blue-900">
                  {progress?.syncProgress?.status === 'crawling' ? '正在呼叫 Apify 抓取資料...' :
                   progress?.syncProgress?.status === 'processing' ? `正在處理並上傳媒體 (${progress?.syncProgress?.current_run_processed || 0} / ${progress?.syncProgress?.current_run_total || 0})` :
                   progress?.syncProgress?.status === 'idle' ? '閒置中' :
                   progress?.syncProgress?.status === 'error' ? '發生錯誤' :
                   progress?.syncProgress?.status || '閒置中'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase text-sm opacity-70">總抓取數:</span>
                <span className="font-black text-xl">{progress?.syncProgress?.total_crawled || 0}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border-2 border-black p-3 bg-secondary-background">
                <div className="text-xs font-bold uppercase opacity-70 mb-1">X/Twitter 抓取進度</div>
                <div className="text-2xl font-black">
                  {progress?.syncProgress?.current_run_processed || 0}
                  <span className="text-sm font-bold opacity-50 ml-1">/ {progress?.syncProgress?.current_run_total || '?'}</span>
                </div>
              </div>
              
              <div className="border-2 border-black p-3 bg-yellow-200">
                <div className="text-xs font-bold uppercase opacity-70 mb-1">待審核 (Pending)</div>
                <div className="text-2xl font-black">{progress?.statusCounts?.pending || 0}</div>
              </div>
              
              <div className="border-2 border-black p-3 bg-ztmy-green/50">
                <div className="text-xs font-bold uppercase opacity-70 mb-1">已核准 (Approved)</div>
                <div className="text-2xl font-black">{progress?.statusCounts?.approved || 0}</div>
              </div>
              
              <div className="border-2 border-black p-3 bg-red-200">
                <div className="text-xs font-bold uppercase opacity-70 mb-1">已拒絕 (Rejected)</div>
                <div className="text-2xl font-black">{progress?.statusCounts?.rejected || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <i className="hn hn-refresh animate-spin text-4xl opacity-50" />
          </div>
        ) : fanarts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-4 border-dashed border-black/20 text-black/50 font-bold text-lg uppercase tracking-widest">
            <i className="hn hn-inbox text-4xl mb-4" />
            {viewStatus === 'pending' ? 'No pending fanarts' : 'No rejected fanarts'}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between p-3 border-2 border-black bg-white shadow-neo-sm">
              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-black border-2 border-black cursor-pointer"
                  checked={selectedCards.size === fanarts.length && fanarts.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCards(new Set(fanarts.map(f => f.id)));
                    } else {
                      setSelectedCards(new Set());
                    }
                  }}
                />
                <span className="uppercase tracking-wider">全選 ({selectedCards.size})</span>
              </label>
              
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                {viewStatus === 'pending' ? (
                  <>
                    <div className="w-[200px]">
                      <MultiSelect
                        options={mvs}
                        selected={batchSelectedMvs}
                        onChange={setBatchSelectedMvs}
                        placeholder="批次選擇 MV..."
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-2 border-black bg-red-500 text-white font-black uppercase tracking-wider hover:bg-red-600 h-8"
                      disabled={selectedCards.size === 0 || isLoading}
                      onClick={() => handleBatchAction('reject')}
                    >
                      <i className="hn hn-trash mr-2" /> 批次拒絕
                    </Button>
                    <Button 
                      className="border-2 border-black bg-ztmy-green font-black text-black uppercase tracking-wider hover:bg-[#8aff8a] h-8"
                      disabled={selectedCards.size === 0 || isLoading}
                      onClick={() => handleBatchAction('approve')}
                    >
                      <i className="hn hn-check mr-2" /> 批次核准 (含已選MV)
                    </Button>
                  </>
                ) : (
                  <Button
                    className="border-2 border-black bg-yellow-200 font-black text-black uppercase tracking-wider hover:bg-yellow-300 h-8"
                    disabled={selectedCards.size === 0 || isLoading}
                    onClick={handleBatchRestore}
                  >
                    <i className="hn hn-refresh mr-2" /> 批次還原為待審核
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {fanarts.map(f => (
                <div 
                  key={f.id} 
                  className={`bg-card border-4 border-black shadow-neo flex flex-col overflow-hidden group relative transition-colors ${selectedCards.has(f.id) ? 'ring-4 ring-ztmy-green ring-offset-2' : ''}`}
                >
                  {/* Card Checkbox overlay */}
                  <label className="absolute top-2 left-2 z-20 cursor-pointer bg-white border-2 border-black p-1 shadow-neo-sm hover:scale-110 transition-transform flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-black cursor-pointer"
                      checked={selectedCards.has(f.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedCards(prev => {
                          const next = new Set(prev);
                          if (checked) next.add(f.id);
                          else next.delete(f.id);
                          return next;
                        });
                      }}
                    />
                  </label>

                  <div className="aspect-square bg-black relative border-b-4 border-black">
                  {f.media_type === 'video' ? (
                    <video 
                      src={f.r2_url || f.media_url} 
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img 
                      src={f.r2_url || f.media_url} 
                      alt="Fanart" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <a 
                    href={f.original_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 size-8 bg-black text-white border-2 border-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-neo-sm z-10"
                    title="View Original"
                  >
                    <i className="hn hn-external-link" />
                  </a>
                </div>
                
                <div className="p-2 flex flex-col gap-2 flex-1">
                  <div className="flex flex-col gap-1 text-[10px] sm:text-xs font-mono font-bold opacity-70">
                    <span className="truncate" title={f.tweet_id}>ID: {f.tweet_id}</span>
                    <span>Type: {f.media_type}</span>
                    <span className="truncate" title={new Date(f.crawled_at).toLocaleString()}>Date: {new Date(f.crawled_at).toLocaleDateString()}</span>
                  </div>
                  
                  {viewStatus === 'pending' ? (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Associated MVs:</span>
                      <MultiSelect
                        options={mvs}
                        selected={selectedMvs[f.id] || []}
                        onChange={(selected) => setSelectedMvs(prev => ({ ...prev, [f.id]: selected }))}
                        placeholder="Select MVs..."
                      />
                    </div>
                  ) : null}

                  {viewStatus === 'pending' ? (
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                      <Button 
                        className="w-full bg-red-500 text-white hover:bg-red-600 border-2 border-black shadow-neo-sm font-black uppercase tracking-wider text-xs h-8"
                        onClick={() => handleAction(f.id, 'reject')}
                      >
                        <i className="hn hn-trash sm:mr-1" /> <span className="hidden sm:inline">拒絕</span>
                      </Button>
                      <Button 
                        className="w-full bg-ztmy-green text-black hover:bg-[#8aff8a] border-2 border-black shadow-neo-sm font-black uppercase tracking-wider text-xs h-8"
                        onClick={() => handleAction(f.id, 'approve')}
                      >
                        <i className="hn hn-check sm:mr-1" /> <span className="hidden sm:inline">核准</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-auto pt-2">
                      <Button
                        className="w-full bg-yellow-200 text-black hover:bg-yellow-300 border-2 border-black shadow-neo-sm font-black uppercase tracking-wider text-xs h-8"
                        onClick={() => handleAction(f.id, 'restore')}
                      >
                        <i className="hn hn-refresh sm:mr-1" /> <span className="hidden sm:inline">還原</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
        </div>
      </div>
    </div>
  );
}
