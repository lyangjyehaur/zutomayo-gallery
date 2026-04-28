import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Translation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * 錯誤邊界組件
 * 捕獲子組件樹中的 JavaScript 錯誤，防止整個應用崩潰
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // 調用外部錯誤處理回調
    this.props.onError?.(error, errorInfo);
    
    // 記錄到控制台
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    // 將系統崩潰錯誤上報到 Umami
    if (typeof window !== 'undefined' && (window as any).umami && typeof (window as any).umami.track === 'function') {
      (window as any).umami.track('Z_System_Crash', {
        error_name: error.name,
        error_message: error.message.substring(0, 100),
        component_stack: errorInfo.componentStack?.substring(0, 200) || 'unknown',
        current_url: window.location.pathname + window.location.search
      });
    }

    // 這裡可以發送到錯誤監控服務（如 Sentry）
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    const run = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch {
      } finally {
        window.location.reload();
      }
    };
    void run();
  };

  render() {
    if (this.state.hasError) {
      // 自定義 fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Translation>
          {(t) => (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-mono text-foreground crt-lines">
              <div className="max-w-2xl w-full border-4 border-red-500 bg-card p-8 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)]">
                {/* 錯誤圖標 */}
                <div className="flex justify-center mb-6">
                  <i className="hn hn-exclamation-triangle text-7xl text-red-500 animate-pulse"></i>
                </div>

                {/* 標題 */}
                <div className="flex flex-col items-center leading-tight mb-4">
                  <h1 className="text-3xl font-black text-center uppercase tracking-tighter text-red-500">
                    {t('error.critical_error', '系統發生嚴重錯誤')}
                  </h1>
                  <span className="text-[10px] font-mono opacity-50 normal-case text-red-400">System_Critical_Error</span>
                </div>

                {/* 錯誤信息 */}
                <div className="bg-black/30 border-2 border-red-500/30 p-4 mb-6 font-mono text-sm">
                  <div className="text-red-400 mb-2 flex flex-col leading-tight">
                    <span>{t('error.error_info', '錯誤資訊')}</span>
                    <span className="text-[10px] font-mono opacity-60 normal-case">Error_Details:</span>
                  </div>
                  <p className="text-red-300/80 break-all">
                    {this.state.error?.message || t('error.unknown_error', '未知錯誤 (Unknown error occurred)')}
                  </p>
                  
                  {this.state.error && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-red-400 hover:text-red-300">
                        <span className="flex flex-col leading-tight">
                          <span>{t('error.stack_trace', '堆疊追蹤')}</span>
                          <span className="text-[10px] font-mono opacity-60 normal-case">Stack_Trace</span>
                        </span>
                      </summary>
                      <pre className="mt-2 text-xs text-red-300/60 overflow-auto max-h-40 whitespace-pre-wrap">
                        {(this.state.error.stack || '').substring(0, 4000)}
                        {this.state.errorInfo?.componentStack ? `\n\n${this.state.errorInfo.componentStack.substring(0, 4000)}` : ''}
                      </pre>
                    </details>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button 
                    onClick={this.handleReset}
                    variant="default"
                    className="border-2 border-black hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
                    data-umami-event="Z_Error_Recovery"
                    data-umami-event-action="retry"
                  >
                    {t('error.retry', '重試')}
                  </Button>
                  <Button 
                    onClick={this.handleReload}
                    variant="neutral"
                    className="border-2 border-black hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
                    data-umami-event="Z_Error_Recovery"
                    data-umami-event-action="reload"
                  >
                    {t('error.reload', '重新加載頁面')}
                  </Button>
                  <Button 
                    onClick={this.handleClearCacheAndReload}
                    variant="neutral"
                    className="border-2 border-black hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
                    data-umami-event="Z_Error_Recovery"
                    data-umami-event-action="clear_cache_reload"
                  >
                    {t('error.clear_cache_reload', '清除快取並重載')}
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/'}
                    variant="default"
                    className="border-2 border-black hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
                    data-umami-event="Z_Error_Recovery"
                    data-umami-event-action="home"
                  >
                    {t('error.back_home', '返回首頁')}
                  </Button>
                </div>

                {/* 狀態碼 */}
                <div className="mt-6 text-center">
                  <span className="inline-block bg-red-500/20 text-red-400 px-3 py-1 text-xs font-mono border border-red-500/30">
                    <span className="flex flex-col items-center leading-tight">
                      <span className="tracking-normal">{t('error.status_500', '狀態碼：500（內部錯誤）')}</span>
                      <span className="text-[10px] font-mono opacity-60 normal-case">STATUS_CODE: 500_INTERNAL_ERROR</span>
                    </span>
                  </span>
                </div>
              </div>

              {/* 底部信息 */}
              <p className="mt-8 text-xs opacity-50 font-mono flex flex-col items-center leading-tight">
                <span className="tracking-normal">{t('error.contact_support', '若此錯誤持續發生，請聯絡管理者')}</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">If this error persists, please contact support.</span>
              </p>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}

/**
 * 簡化的錯誤邊界 Hook 版本（用於函數組件包裹）
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
