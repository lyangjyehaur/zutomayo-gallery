import React from 'react';
import { toast } from 'sonner';
import { getApiRoot } from '@/lib/admin-api';

interface BackendErrorEvent {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  stack?: string;
  statusCode?: number;
  code?: string;
  method?: string;
  url?: string;
  requestId?: string;
  ip?: string;
  details?: unknown;
}

export function useBackendErrorStream(enabled: boolean) {
  const [errorCount, setErrorCount] = React.useState(0);
  const shownRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (!enabled) return;

    const base = getApiRoot();
    const url = `${base}/system/errors/stream`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          return;
        }

        if (data.type === 'history') {
          const events: BackendErrorEvent[] = data.events || [];
          for (const ev of events) {
            if (!shownRef.current.has(ev.id)) {
              shownRef.current.add(ev.id);
              setErrorCount((c) => c + 1);
            }
          }
          if (events.length > 0) {
            toast.warning(`後端有 ${events.length} 筆歷史錯誤`, {
              description: '請至錯誤日誌頁面查看詳情',
              duration: 8000,
            });
          }
          return;
        }

        if (data.type === 'error') {
          const ev: BackendErrorEvent = data.event;
          if (shownRef.current.has(ev.id)) return;
          shownRef.current.add(ev.id);
          setErrorCount((c) => c + 1);

          const sourceLabel: Record<string, string> = {
            request: '請求錯誤',
            uncaught: '未捕獲異常',
            unhandled_rejection: '未處理 Promise',
            cron: '定時任務',
            queue: '佇列任務',
          };

          const label = sourceLabel[ev.source] || ev.source;
          const statusPart = ev.statusCode ? ` [${ev.statusCode}]` : '';
          const methodPart = ev.method ? ` ${ev.method}` : '';
          const urlPart = ev.url ? ` ${ev.url}` : '';

          toast.error(`⚠️ 後端${label}${statusPart}`, {
            description: `${ev.message}${methodPart}${urlPart}`,
            duration: 10000,
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [enabled]);

  const resetCount = React.useCallback(() => {
    setErrorCount(0);
  }, []);

  return { errorCount, resetCount };
}
