import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  
  const [searchTerms, setSearchTerms] = useState('from:zutomayo_art filter:media include:nativeretweets');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [maxItems, setMaxItems] = useState<number>(1000);

  const baseApiUrl = useMemo(
    () => (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/mvs$/, ''),
    []
  );

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

  const fetchFanarts = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseApiUrl}/staging-fanarts?page=${p}&limit=20`, {
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
    fetchFanarts(page);
  }, [fetchFanarts, page]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    const status = progress?.syncProgress?.status;
    if (status && status !== 'idle' && status !== 'error') {
      const timer = setInterval(() => {
        fetchProgress();
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [fetchProgress, progress?.syncProgress?.status]);

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

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`${baseApiUrl}/staging-fanarts/${id}/${action}`, {
        method: 'POST',
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setFanarts(prev => prev.filter(f => f.id !== id));
        
        setProgress(prev => {
          if (!prev) return prev;
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
          fetchFanarts(page);
        }
      } else {
        toast.error(data.error || `Failed to ${action}`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} staging fanart`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-secondary-background relative overflow-hidden">
      <div className="h-20 bg-background border-b-4 border-black flex items-center justify-between px-6 shrink-0 shadow-neo z-10">
        <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
          <i className="hn hn-image" /> Staging FanArts
        </h1>
        <div className="flex items-center gap-4">
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
            No pending fanarts
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {fanarts.map(f => (
              <div key={f.id} className="bg-card border-4 border-black shadow-neo flex flex-col overflow-hidden group">
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
                
                <div className="p-4 flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-1 text-xs font-mono font-bold opacity-70">
                    <span className="truncate" title={f.tweet_id}>ID: {f.tweet_id}</span>
                    <span>Type: {f.media_type}</span>
                    <span>Date: {new Date(f.crawled_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                    <Button 
                      className="w-full bg-red-500 text-white hover:bg-red-600 border-2 border-black shadow-neo-sm font-black uppercase tracking-wider"
                      onClick={() => handleAction(f.id, 'reject')}
                    >
                      <i className="hn hn-trash mr-2" /> 拒絕
                    </Button>
                    <Button 
                      className="w-full bg-ztmy-green text-black hover:bg-[#8aff8a] border-2 border-black shadow-neo-sm font-black uppercase tracking-wider"
                      onClick={() => handleAction(f.id, 'approve')}
                    >
                      <i className="hn hn-check mr-2" /> 核准
                    </Button>
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
