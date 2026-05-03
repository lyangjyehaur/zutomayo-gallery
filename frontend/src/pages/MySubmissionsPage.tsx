import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePublicMe } from '@/lib/public-auth';

const baseApiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/mvs$/, '');

const fetchJson = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(String(json?.error || json?.message || 'REQUEST_FAILED'));
  }
  return json.data;
};

export function MySubmissionsPage() {
  const { t } = useTranslation();
  const { data: me, isLoading } = usePublicMe();
  const [rows, setRows] = React.useState<any[]>([]);
  const [isBusy, setIsBusy] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const activeLang = React.useMemo(() => {
    const parts = (location.pathname || '/').split('/');
    const maybeLng = parts[1];
    return maybeLng && maybeLng.length > 0 ? maybeLng : 'zh-TW';
  }, [location.pathname]);

  const load = React.useCallback(async () => {
    setIsBusy(true);
    try {
      const data = await fetchJson(`${baseApiUrl}/submissions/me/list`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(`載入失敗：${String(e?.message || e)}`);
      setRows([]);
    } finally {
      setIsBusy(false);
    }
  }, []);

  React.useEffect(() => {
    if (!me) return;
    void load();
  }, [load, me]);

  if (isLoading) {
    return (
      <div className="border-4 border-black bg-card shadow-shadow p-6">
        <div className="font-black">Loading…</div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="border-4 border-black bg-card shadow-shadow p-6 space-y-4">
        <div className="text-xl font-black tracking-widest uppercase">{t('me.submissions', '我的投稿')}</div>
        <div className="text-sm opacity-70">需先登入才能查看投稿記錄。</div>
        <Button onClick={() => navigate(`/${activeLang}/login`)}>前往登入</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="border-4 border-black bg-card shadow-shadow p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xl font-black tracking-widest uppercase">{t('me.submissions', '我的投稿')}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/${activeLang}/submit`)}>前往投稿</Button>
            <Button variant="outline" onClick={load} disabled={isBusy}>刷新</Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 text-sm opacity-70">尚無投稿記錄</div>
        ) : (
          <div className="mt-4 space-y-3">
            {rows.map((s: any) => (
              <div key={s.id} className="border-3 border-black bg-background p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-black break-all">{s.id}</div>
                  <div className="text-xs font-mono opacity-70">{String(s.status || '')}</div>
                </div>
                {s.review_reason ? <div className="mt-2 text-xs opacity-70">退回原因：{String(s.review_reason)}</div> : null}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/${activeLang}/submit`)}
                  >
                    去投稿頁
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

