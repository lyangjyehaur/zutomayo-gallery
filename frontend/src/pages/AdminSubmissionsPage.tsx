import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatApiError } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminFetch, getApiRoot } from '@/lib/admin-api';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type Submission = {
  id: string;
  status: string;
  note?: string | null;
  contact?: string | null;
  created_at?: string;
  submitted_at?: string | null;
  review_reason?: string | null;
  media?: any[];
  mvs?: Array<{ id: string; title: string }>;
  submitter?: any;
};

export function AdminSubmissionsPage() {
  const baseApiUrl = useMemo(() => getApiRoot(), []);

  const [status, setStatus] = useState<'pending' | 'rejected' | 'approved'>('pending');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const gotoPage = (p: number) => setPage(() => Math.min(Math.max(1, p), totalPages || 1));

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', status);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const res = await adminFetch(`${baseApiUrl}/admin/submissions?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(String(json?.error || 'LOAD_FAILED'));
      setRows(Array.isArray(json.data) ? json.data : []);
      const meta = json.meta || {};
      setTotalPages(Number(meta.totalPages || 1) || 1);
    } catch (e: any) {
      setRows([]);
      toast.error(formatApiError(e, '載入失敗'));
    } finally {
      setIsLoading(false);
    }
  }, [baseApiUrl, limit, page, status]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const setBusy = useCallback((id: string, next: boolean) => {
    setBusyIds((prev) => {
      const n = new Set(prev);
      if (next) n.add(id); else n.delete(id);
      return n;
    });
  }, []);

  const approve = useCallback(async (id: string) => {
    setBusy(id, true);
    try {
      const res = await adminFetch(`${baseApiUrl}/admin/submissions/${encodeURIComponent(id)}/approve`, { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(String(json?.error || 'APPROVE_FAILED'));
      toast.success('已通過');
      await fetchList();
    } catch (e: any) {
      toast.error(formatApiError(e, '通過失敗'));
    } finally {
      setBusy(id, false);
    }
  }, [baseApiUrl, fetchList, setBusy]);

  const reject = useCallback(async (id: string) => {
    const reason = String(rejectReason[id] || '').trim();
    if (!reason) {
      toast.error('請填寫退回原因');
      return;
    }
    setBusy(id, true);
    try {
      const res = await adminFetch(`${baseApiUrl}/admin/submissions/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      } as any);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(String(json?.error || 'REJECT_FAILED'));
      toast.success('已退回');
      await fetchList();
    } catch (e: any) {
      toast.error(formatApiError(e, '退回失敗'));
    } finally {
      setBusy(id, false);
    }
  }, [baseApiUrl, fetchList, rejectReason, setBusy]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-2xl font-black tracking-widest uppercase">投稿審核</div>
        <div className="flex items-center gap-2">
          <Button variant={status === 'pending' ? 'default' : 'outline'} onClick={() => { setPage(1); setStatus('pending'); }}>
            待審核
          </Button>
          <Button variant={status === 'rejected' ? 'default' : 'outline'} onClick={() => { setPage(1); setStatus('rejected'); }}>
            已退回
          </Button>
          <Button variant={status === 'approved' ? 'default' : 'outline'} onClick={() => { setPage(1); setStatus('approved'); }}>
            已通過
          </Button>
          <Button variant="outline" onClick={fetchList}>刷新</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="border-4 border-black bg-card shadow-shadow p-8">
          <div className="font-black">Loading…</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="border-4 border-black bg-card shadow-shadow p-8">
          <div className="opacity-70">沒有資料</div>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((s) => {
            const media = Array.isArray(s.media) ? s.media : [];
            const first = media[0];
            const previewUrl = first?.thumbnail_url || first?.r2_url || first?.original_url || null;
            const isBusyRow = busyIds.has(s.id);
            const mvLabels = Array.isArray(s.mvs) ? s.mvs.map((m) => m.title).filter(Boolean) : [];
            return (
              <div key={s.id} className="border-4 border-black bg-card shadow-shadow p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-40 shrink-0">
                    <div className="aspect-square border-2 border-black bg-background overflow-hidden flex items-center justify-center">
                      {previewUrl ? (
                        <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-xs font-black opacity-60">NO PREVIEW</div>
                      )}
                    </div>
                    <div className="mt-2 text-[10px] font-mono opacity-70 break-all">{s.status}</div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-black break-all">{s.id}</div>
                      <div className="text-xs font-mono opacity-70">{media.length} media</div>
                    </div>

                    {mvLabels.length > 0 ? (
                      <div className="text-xs opacity-70">MV：{mvLabels.join(' / ')}</div>
                    ) : null}

                    {s.note ? (
                      <div className="text-sm whitespace-pre-wrap">{s.note}</div>
                    ) : (
                      <div className="text-sm opacity-60">（無備註）</div>
                    )}

                    {s.review_reason ? (
                      <div className="text-xs opacity-70">退回原因：{String(s.review_reason)}</div>
                    ) : null}

                    {status === 'pending' ? (
                      <div className="pt-2 flex flex-col md:flex-row gap-3 md:items-center">
                        <Input
                          value={rejectReason[s.id] || ''}
                          onChange={(e) => setRejectReason((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          placeholder="退回原因（必填）"
                          className="md:flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <Button onClick={() => approve(s.id)} disabled={isBusyRow}>通過</Button>
                          <Button variant="destructive" onClick={() => reject(s.id)} disabled={isBusyRow}>退回</Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => gotoPage(page - 1)} />
            </PaginationItem>
            {Array.from({ length: totalPages }).slice(0, 7).map((_, idx) => {
              const p = idx + 1;
              return (
                <PaginationItem key={p}>
                  <PaginationLink isActive={p === page} onClick={() => gotoPage(p)}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext onClick={() => gotoPage(page + 1)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}

