import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

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

  render() {
    if (this.state.hasError) {
      // 自定義 fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-mono text-foreground crt-lines">
          <div className="max-w-2xl w-full border-4 border-red-500 bg-card p-8 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)]">
            {/* 錯誤圖標 */}
            <div className="flex justify-center mb-6">
              <svg 
                viewBox="0 0 24 24" 
                className="w-20 h-20 text-red-500 animate-pulse" 
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>

            {/* 標題 */}
            <h1 className="text-3xl font-black text-center mb-4 uppercase tracking-tighter text-red-500">
              System_Critical_Error
            </h1>

            {/* 錯誤信息 */}
            <div className="bg-black/30 border-2 border-red-500/30 p-4 mb-6 font-mono text-sm">
              <p className="text-red-400 mb-2">Error_Details:</p>
              <p className="text-red-300/80 break-all">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
              
              {/* 開發環境顯示堆棧 */}
              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-red-400 hover:text-red-300">
                    Stack_Trace (Dev_Mode)
                  </summary>
                  <pre className="mt-2 text-xs text-red-300/60 overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                onClick={this.handleReset}
                variant="default"
                className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                重試
              </Button>
              <Button 
                onClick={this.handleReload}
                variant="neutral"
                className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                重新加載頁面
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="reverse"
                className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                返回首頁
              </Button>
            </div>

            {/* 狀態碼 */}
            <div className="mt-6 text-center">
              <span className="inline-block bg-red-500/20 text-red-400 px-3 py-1 text-xs font-mono border border-red-500/30">
                STATUS_CODE: 500_INTERNAL_ERROR
              </span>
            </div>
          </div>

          {/* 底部信息 */}
          <p className="mt-8 text-xs opacity-50 font-mono">
            If this error persists, please contact support.
          </p>
        </div>
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
