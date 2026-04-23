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

  // DB 狀態
  const [dbQuery, setDbQuery] = useState("SELECT name FROM sqlite_master WHERE type='table';");
  const [dbResults, setDbResults] = useState<any[] | null>(null);
  const [dbMessage, setDbMessage] = useState<string>('');

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

  useEffect(() => {
    const saved = localStorage.getItem('ztmy_admin_pwd');
    if (!saved) {
      navigate('/admin');
    } else {
      handleRunQuery("SELECT name FROM sqlite_master WHERE type='table';");
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

  return (
    <div className="h-full flex flex-col font-mono font-normal overflow-hidden bg-background text-foreground">
      {/* 頂部控制欄 */}
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm shrink-0">
        <div className="flex items-center gap-4">
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
    </div>
  );
}
