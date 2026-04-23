import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import Editor from '@monaco-editor/react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AdminDBPage() {
  const navigate = useNavigate();

  // 認證狀態
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // DB 狀態
  const [dbQuery, setDbQuery] = useState("SELECT name FROM sqlite_master WHERE type='table';");
  const [dbResults, setDbResults] = useState<any[] | null>(null);
  const [dbMessage, setDbMessage] = useState<string>('');
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  
  // 登入追蹤狀態
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginFailures, setLoginFailures] = useState(0);

  const dbColumns = useMemo<ColumnDef<any>[]>(() => {
    if (!dbResults || dbResults.length === 0) return [];
    return Object.keys(dbResults[0]).map(key => ({
      accessorKey: key,
      header: key,
      cell: ({ row }) => {
        const val = row.getValue(key);
        return <span title={String(val)}>{String(val)}</span>;
      }
    }));
  }, [dbResults]);

  const verifyPassword = async (pwd: string) => {
    // 若已登入，阻擋追蹤與後續邏輯
    if (isAuthenticated) return;

    setIsInitializing(true);
    
    // 追蹤：有人嘗試登入 DB 頁面
    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track('Z_Admin_Login_Attempt', { 
        method: 'db_password', 
        attempt_count: loginAttempts + 1 
      });
      setLoginAttempts(prev => prev + 1);
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const res = await fetch(`${apiUrl}/verify-admin`, {
        method: 'POST',
        headers: { 'x-admin-password': pwd }
      });
      if (res.ok) {
        setIsAuthenticated(true);
        handleRunQuery("SELECT name FROM sqlite_master WHERE type='table';");
      } else {
        toast.error('身分驗證過期，請重新登入');
        
        // 追蹤：DB 頁面登入連線失敗
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track('Z_Admin_Login_Failed', { 
          method: 'db_password',
          reason: 'network_error',
          failure_count: loginFailures + 1 
        });
        setLoginFailures(prev => prev + 1);
      }
        navigate('/admin');
      }
    } catch (e) {
      toast.error('伺服器連線失敗');
      
      // 追蹤：DB 頁面登入連線失敗
      if ((window as any).umami && typeof (window as any).umami.track === 'function') {
        (window as any).umami.track('Z_Admin_Login_Failed', { 
          method: 'db_password',
          reason: 'network_error',
          failureCount: loginFailures + 1 
        });
        setLoginFailures(prev => prev + 1);
      }
      navigate('/admin');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('ztmy_admin_pwd');
    if (saved) {
      verifyPassword(saved);
    } else {
      navigate('/admin');
    }
  }, []);

  const handleExportDB = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const res = await fetch(`${apiUrl}/export-db`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      if (!res.ok) throw new Error('無法匯出資料庫');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zutomayo-gallery-${new Date().toISOString().split('T')[0]}.sqlite`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('資料庫備份已下載');
    } catch (e) {
      toast.error('匯出資料庫失敗');
    }
  };

  const handleRunQuery = async (queryToRun: string = dbQuery) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const res = await fetch(`${apiUrl}/db/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' 
        },
        body: JSON.stringify({ sql: queryToRun })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.rows) {
          setDbResults(data.rows);
          setDbMessage(`查詢成功，共 ${data.rows.length} 筆結果`);
        } else {
          setDbResults(null);
          setDbMessage(`執行成功，影響 ${data.result.changes} 行`);
        }
      } else {
        setDbResults(null);
        setDbMessage(`錯誤: ${data.error}`);
      }
    } catch (e) {
      setDbResults(null);
      setDbMessage('伺服器連線失敗');
    }
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(false);
    localStorage.removeItem('ztmy_admin_pwd');
    setIsAuthenticated(false);
    toast.success('已安全登出');
    navigate('/admin');
  };

  if (isInitializing || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-foreground crt-lines p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5 crt-lines-global" />
        <div className="text-xl font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
          <i className="hn hn-refresh animate-spin text-xl" />
          <span className="flex flex-col leading-tight">
            <span className="tracking-normal opacity-70">驗證中...</span>
            <span className="text-[10px] font-mono opacity-40 normal-case">AUTHENTICATING...</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col font-mono font-normal overflow-hidden">
      {/* 頂部控制欄 */}
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm z-40 shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="neutral" 
            size="icon" 
            onClick={() => navigate('/admin')} 
            className="rounded-full bg-black text-white hover:bg-main hover:text-black border-2 border-transparent transition-all shadow-neo-sm"
          >
            <i className="hn hn-arrow-left text-xl" />
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
              <i className="hn hn-table text-2xl text-blue-600" />
              <span className="flex flex-col leading-tight">
                <span className="tracking-normal">資料庫查詢</span>
                <span className="text-[10px] font-mono opacity-50 normal-case">SQL EXPLORER</span>
              </span>
            </h1>
            <p className="text-xs font-bold opacity-60 flex flex-col leading-tight">
              <span className="tracking-normal">ZTMY 資料庫管理系統</span>
              <span className="text-[10px] font-mono opacity-50 normal-case">ZTMY_DATABASE_MANAGEMENT_SYSTEM</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="neutral" size="sm" onClick={handleExportDB} className="h-8 text-xs font-bold bg-white text-black hover:bg-ztmy-green border-2 border-black shadow-neo-sm">
            下載 .sqlite 備份
          </Button>
          <div className="w-px h-8 bg-black/20 mx-2"></div>
          <Button 
            variant="neutral" 
            size="sm" 
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="border-2 border-transparent text-red-500 hover:text-red-600 hover:bg-red-50"
            title="登出管理員"
          >
            <i className="hn hn-logout text-base" />
          </Button>
        </div>
      </div>

      {/* 內容區 */}
      <div className="flex-1 flex flex-col p-6 bg-background space-y-4 overflow-hidden">
        <div className="flex gap-2 shrink-0 overflow-x-auto pb-2">
          <Button variant="neutral" size="sm" className="text-xs whitespace-nowrap" onClick={() => { setDbQuery("SELECT name FROM sqlite_master WHERE type='table';"); handleRunQuery("SELECT name FROM sqlite_master WHERE type='table';"); }}>列出所有資料表</Button>
          <Button variant="neutral" size="sm" className="text-xs whitespace-nowrap" onClick={() => { setDbQuery("SELECT * FROM mvs LIMIT 10;"); handleRunQuery("SELECT * FROM mvs LIMIT 10;"); }}>查看 MVs</Button>
          <Button variant="neutral" size="sm" className="text-xs whitespace-nowrap" onClick={() => { setDbQuery("SELECT * FROM meta_albums;"); handleRunQuery("SELECT * FROM meta_albums;"); }}>查看 Metadata (Albums)</Button>
          <Button variant="neutral" size="sm" className="text-xs whitespace-nowrap" onClick={() => { setDbQuery("SELECT * FROM auth_passkeys;"); handleRunQuery("SELECT * FROM auth_passkeys;"); }}>查看 Auth (Passkeys)</Button>
        </div>
        
        <div className="flex gap-2 shrink-0 h-[150px]">
          <div className="flex-1 border-2 border-black overflow-hidden rounded-none bg-white">
            <Editor
              height="100%"
              defaultLanguage="sql"
              value={dbQuery}
              onChange={(val) => setDbQuery(val || '')}
              theme="light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: 'off',
                folding: false,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
          <Button 
            onClick={() => handleRunQuery()}
            className="h-full px-6 bg-black text-white hover:bg-main hover:text-black border-2 border-transparent font-black shadow-neo"
          >
            <i className="hn hn-play text-2xl" />
          </Button>
        </div>

        <div className="text-xs font-bold text-gray-500 shrink-0">
          {dbMessage}
        </div>

        <div className="flex-1 overflow-hidden bg-white border-2 border-black">
          {dbResults && dbResults.length > 0 ? (
            <DataTable columns={dbColumns} data={dbResults} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 font-mono text-sm">
              無資料或未執行查詢
            </div>
          )}
        </div>
      </div>

      {/* 登出確認 Dialog */}
      <AlertDialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
        <AlertDialogContent className="border-4 border-black rounded-none shadow-neo p-0 overflow-hidden max-w-sm">
          <AlertDialogHeader className="p-6 bg-red-500 text-white border-b-4 border-black">
            <AlertDialogTitle className="font-black uppercase tracking-widest flex items-center gap-2">
              <i className="hn hn-logout text-xl" /> 確認登出？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/80 font-mono text-xs mt-2">
              您確定要登出管理員身分嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-4 bg-secondary-background flex gap-4">
            <AlertDialogCancel className="flex-1 border-2 border-black shadow-none hover:bg-black/5 rounded-none font-bold">
              取消
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="flex-1 bg-red-500 text-white hover:bg-red-600 border-2 border-black shadow-neo rounded-none font-bold"
            >
              確定登出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
