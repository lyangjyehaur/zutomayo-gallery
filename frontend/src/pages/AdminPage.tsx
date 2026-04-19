import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { VERSION_CONFIG } from '@/config/version';
import { toast } from "sonner"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';
import Editor from '@monaco-editor/react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
 

// 模板類型
interface Template {
  id: string;
  name: string;
  content: string;
}

const STORAGE_KEY = 'ztmy_richtext_templates';

// 從 localStorage 讀取模板
const loadTemplates = (): Template[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // 解析失敗時返回默認模板
  }
  return [
    { id: 'default-1', name: '空白模板', content: '' }
  ];
};

// 保存模板到 localStorage
const saveTemplates = (templates: Template[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // 存儲失敗時忽略
  }
};

// 佔位符數據類型
interface TemplateData {
  'display-name': string;
  'username': string;
  'original-link': string;
  'post': string;
  'translation': string;
  [key: string]: string; // 允許自定義佔位符
}

// 模板處理函數：替換 {{placeholder}} 佔位符
const processTemplate = (template: string, data: Partial<TemplateData>): string => {
  let result = template;
  
  // 遍歷數據對象，替換所有佔位符
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // 創建全局正則表達式，匹配 {{key}}
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(placeholder, String(value));
    }
  });
  
  return result;
};

// 從模板中提取所有佔位符
const extractPlaceholders = (template: string): string[] => {
  const matches = template.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  
  // 去重並移除 {{ 和 }}
  const placeholders = matches.map(match => match.slice(2, -2));
  return [...new Set(placeholders)];
};

// 富文本編輯器組件（雙欄實時預覽模式 + 自定義模板功能）
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showTemplateProcessor, setShowTemplateProcessor] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [localValue, setLocalValue] = useState(value);
  
  // 模板管理狀態
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // 模板處理器狀態
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateData, setTemplateData] = useState<Partial<TemplateData>>({
    'display-name': '',
    'username': '',
    'original-link': '',
    'post': '',
    'translation': ''
  });
  const [processedResult, setProcessedResult] = useState('');

  // 同步外部值變化
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // 保存模板變更
  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  // 處理編輯器變更
  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  // 切換分屏模式
  const toggleSplitMode = () => {
    setIsSplitMode(!isSplitMode);
  };

  // 應用模板
  const applyTemplate = (template: Template) => {
    const newValue = localValue ? localValue + '\n\n' + template.content : template.content;
    setLocalValue(newValue);
    onChange(newValue);
    setShowTemplates(false);
  };

  // 保存當前內容為新模板
  const handleSaveAsTemplate = () => {
    if (!newTemplateName.trim() || !localValue.trim()) return;
    
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      content: localValue
    };
    
    setTemplates(prev => [...prev, newTemplate]);
    setNewTemplateName('');
  };

  // 刪除模板
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const handleDeleteTemplate = (id: string) => {
    setDeleteTemplateId(id);
  };
  const confirmDeleteTemplate = () => {
    if (deleteTemplateId) {
      setTemplates(prev => prev.filter(t => t.id !== deleteTemplateId));
      setDeleteTemplateId(null);
    }
  };

  // 更新模板
  const handleUpdateTemplate = () => {
    if (!editingTemplate || !editingTemplate.name.trim()) return;
    
    setTemplates(prev => prev.map(t => 
      t.id === editingTemplate.id ? editingTemplate : t
    ));
    setEditingTemplate(null);
  };

  // 處理模板（替換佔位符）
  const handleProcessTemplate = () => {
    if (!selectedTemplate) return;
    
    const result = processTemplate(selectedTemplate.content, templateData);
    setProcessedResult(result);
  };

  // 應用處理結果到編輯器
  const applyProcessedResult = () => {
    if (!processedResult) return;
    
    const newValue = localValue ? localValue + '\n\n' + processedResult : processedResult;
    setLocalValue(newValue);
    onChange(newValue);
    setShowTemplateProcessor(false);
    setProcessedResult('');
    setSelectedTemplate(null);
  };

  // 獲取選中模板的所有佔位符
  const currentPlaceholders = selectedTemplate ? extractPlaceholders(selectedTemplate.content) : [];

  // 字體配置 - 使用更適合代碼的等寬字體
  const editorFontFamily = "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Source Code Pro', 'Consolas', 'Monaco', monospace";

  const editorOptions = {
    minimap: { enabled: false },
    lineNumbers: 'on',
    fontSize: 13,
    fontFamily: editorFontFamily,
    fontLigatures: true,
    padding: { top: 12, bottom: 12 },
    automaticLayout: true,
    formatOnPaste: true,
    formatOnType: true,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    lineHeight: 1.6,
    letterSpacing: 0.5,
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold opacity-50 uppercase">富文本內容 (RichText)</label>
        <div className="flex items-center gap-2">
          {/* 模板下拉選單 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase border-2 border-black rounded shadow-neo-sm transition-all ${
                  showTemplates 
                    ? 'bg-ztmy-green text-black' 
                    : 'bg-white text-black hover:bg-ztmy-green hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo'
                }`}
                title="插入模板"
              >
                <i className="hn hn-grid text-base" />
                模板
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px] border-2 border-black shadow-neo bg-white text-black">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase opacity-50">選擇模板</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-black/20" />
              {templates.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400 italic">暫無模板</div>
              ) : (
                templates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="flex items-center gap-2 cursor-pointer focus:bg-ztmy-green/20"
                  >
                    <i className="hn hn-notebook text-base opacity-50" />
                    <span className="truncate">{template.name}</span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator className="bg-black/20" />
              <DropdownMenuItem
                onClick={() => setShowTemplateManager(true)}
                className="flex items-center gap-2 cursor-pointer bg-black text-white focus:bg-ztmy-green focus:text-black font-bold"
              >
                <i className="hn hn-plus text-base" />
                保存當前為模板
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 填充按鈕 */}
          <button
            onClick={() => setShowTemplateProcessor(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase border-2 border-black rounded shadow-neo-sm bg-white text-black hover:bg-purple-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo transition-all"
            title="使用模板填充數據"
          >
            <i className="hn hn-edit text-base mr-1" />
            填充
          </button>

          {/* 分屏切換按鈕 */}
          <button
            onClick={toggleSplitMode}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase border-2 border-black rounded shadow-neo-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo ${
              isSplitMode 
                ? 'bg-black text-white hover:bg-gray-800' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
            title={isSplitMode ? '切換到單欄編輯' : '切換到雙欄預覽'}
          >
            <i className="hn hn-code text-base" />
            {isSplitMode ? '單欄' : '分屏'}
          </button>
        </div>
      </div>

      {/* 模板管理彈窗 */}
      <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
        <DialogContent className="max-w-lg border-4 border-black shadow-neo p-0 overflow-hidden bg-white text-black">
          <DialogHeader className="p-4 bg-ztmy-green border-b-4 border-black">
            <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
              <i className="hn hn-grid text-xl" /> 模板管理
            </DialogTitle>
            <DialogDescription className="text-black font-bold opacity-80 text-xs">
              保存、編輯或刪除您的自定義 HTML 模板
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {/* 保存當前為模板 */}
            <div className="p-3 border-2 border-dashed border-black/20 bg-gray-50 rounded space-y-2">
              <label className="text-[10px] font-bold uppercase opacity-60">保存當前內容為新模板</label>
              <div className="flex gap-2">
                <Input
                  placeholder="模板名稱"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="flex-1 h-8 text-sm"
                />
                <Button 
                  onClick={handleSaveAsTemplate}
                  disabled={!newTemplateName.trim() || !localValue.trim()}
                  size="sm"
                  className="bg-black text-white"
                >
                  <i className="hn hn-plus text-sm" />
                  保存
                </Button>
              </div>
            </div>

            {/* 模板列表 */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase opacity-60">已保存的模板 ({templates.length})</label>
              {templates.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-black/10">
                  暫無保存的模板
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center gap-2 p-2 border-2 border-black/10 rounded bg-white group">
                      {editingTemplate?.id === template.id ? (
                        // 編輯模式
                        <>
                          <Input
                            value={editingTemplate.name}
                            onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                            className="flex-1 h-7 text-sm"
                            autoFocus
                          />
                          <Button 
                            onClick={handleUpdateTemplate}
                            size="sm"
                            className="h-7 px-2 bg-ztmy-green text-black"
                          >
                            保存
                          </Button>
                          <Button 
                            onClick={() => setEditingTemplate(null)}
                            variant="neutral"
                            size="sm"
                            className="h-7 px-2"
                          >
                            取消
                          </Button>
                        </>
                      ) : (
                        // 顯示模式
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{template.name}</div>
                            <div className="text-[10px] text-gray-400 truncate">
                              {template.content.slice(0, 50) || '(空白)'}
                              {template.content.length > 50 ? '...' : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingTemplate(template)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded transition-all"
                            title="重命名"
                          >
                            <i className="hn hn-notebook text-sm" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 text-red-500 rounded transition-all"
                            title="刪除"
                          >
                            <i className="hn hn-trash text-base" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="p-4 bg-secondary-background border-t-2 border-black">
            <Button variant="neutral" onClick={() => setShowTemplateManager(false)} className="w-full">
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模板刪除確認 AlertDialog */}
      <AlertDialog open={deleteTemplateId !== null} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase flex items-center gap-2 text-red-500">
              <i className="hn hn-exclamation-triangle text-2xl" /> 刪除模板
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-bold opacity-80">
              確定要刪除此模板嗎？此操作不可撤銷。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTemplateId(null)}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTemplate}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              確定刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 模板處理器彈窗 */}
      <Dialog open={showTemplateProcessor} onOpenChange={setShowTemplateProcessor}>
        <DialogContent className="max-w-2xl border-4 border-black shadow-neo p-0 overflow-hidden bg-white text-black">
          <DialogHeader className="p-4 bg-purple-500 border-b-4 border-black">
            <DialogTitle className="text-xl font-black uppercase flex items-center gap-2 text-white">
              <i className="hn hn-edit text-xl mr-2" /> 模板填充器
            </DialogTitle>
            <DialogDescription className="text-white font-bold opacity-90 text-xs">
              選擇模板並填入數據，自動替換佔位符
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {/* 模板選擇 */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase opacity-60">選擇模板</label>
              <select
                value={selectedTemplate?.id || ''}
                onChange={(e) => {
                  const template = templates.find(t => t.id === e.target.value);
                  setSelectedTemplate(template || null);
                  setProcessedResult('');
                }}
                className="w-full h-9 px-3 border-2 border-black/20 rounded text-sm bg-white"
              >
                <option value="">-- 請選擇模板 --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <>
                {/* 模板預覽 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase opacity-60">模板內容預覽</label>
                  <div className="p-3 bg-gray-100 border-2 border-black/10 rounded text-xs font-mono max-h-[100px] overflow-auto whitespace-pre-wrap">
                    {selectedTemplate.content}
                  </div>
                  {currentPlaceholders.length > 0 && (
                    <div className="text-[10px] text-purple-600">
                      檢測到佔位符: {currentPlaceholders.map(p => `{{${p}}}`).join(', ')}
                    </div>
                  )}
                </div>

                {/* 數據輸入 */}
                <div className="space-y-3 border-2 border-dashed border-black/20 p-4 rounded">
                  <label className="text-[10px] font-bold uppercase opacity-60 block">填入數據</label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-40">display-name</label>
                      <Input
                        value={templateData['display-name']}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, 'display-name': e.target.value }))}
                        placeholder="顯示名稱"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-40">username</label>
                      <Input
                        value={templateData['username']}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, 'username': e.target.value }))}
                        placeholder="用戶名（不含@）"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-40">original-link</label>
                    <Input
                      value={templateData['original-link']}
                      onChange={(e) => setTemplateData(prev => ({ ...prev, 'original-link': e.target.value }))}
                      placeholder="原文鏈接 URL"
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-40">post</label>
                    <Textarea
                      value={templateData['post']}
                      onChange={(e) => setTemplateData(prev => ({ ...prev, 'post': e.target.value }))}
                      placeholder="原文內容"
                      className="min-h-[80px] text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-40">translation</label>
                    <Textarea
                      value={templateData['translation']}
                      onChange={(e) => setTemplateData(prev => ({ ...prev, 'translation': e.target.value }))}
                      placeholder="翻譯內容（可選）"
                      className="min-h-[80px] text-sm"
                    />
                  </div>

                  {/* 自定義佔位符輸入 */}
                  {currentPlaceholders.filter(p => !['display-name', 'username', 'original-link', 'post', 'translation'].includes(p)).map(placeholder => (
                    <div key={placeholder} className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-40">{placeholder}</label>
                      <Input
                        value={templateData[placeholder] || ''}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, [placeholder]: e.target.value }))}
                        placeholder={`輸入 ${placeholder}`}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>

                {/* 處理按鈕 */}
                <Button 
                  onClick={handleProcessTemplate}
                  className="w-full bg-purple-500 text-white hover:bg-purple-600"
                >
                  <i className="hn hn-edit text-base mr-2" />
                  生成結果
                </Button>

                {/* 處理結果 */}
                {processedResult && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase opacity-60">處理結果預覽</label>
                    <div className="p-3 bg-green-50 border-2 border-green-200 rounded text-xs font-mono max-h-[150px] overflow-auto whitespace-pre-wrap">
                      {processedResult}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter className="p-4 bg-secondary-background border-t-2 border-black flex gap-2">
            <Button 
              variant="neutral" 
              onClick={() => {
                setShowTemplateProcessor(false);
                setSelectedTemplate(null);
                setProcessedResult('');
              }} 
              className="flex-1"
            >
              取消
            </Button>
            <Button 
              onClick={applyProcessedResult}
              disabled={!processedResult}
              className="flex-1 bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
            >
              應用到編輯器
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isSplitMode ? (
        // 雙欄模式：左編輯右預覽
        <div className="grid grid-cols-2 gap-0 border-2 border-black/20 rounded overflow-hidden">
          {/* 左側：Monaco 編輯器 */}
          <div className="border-r border-black/20">
            <Editor
              height="320px"
              language="html"
              value={localValue}
              onChange={handleEditorChange}
              options={editorOptions}
            />
          </div>
          {/* 右側：實時預覽 */}
          <div className="bg-white">
            <div className="text-[10px] font-bold uppercase opacity-40 px-3 py-1 border-b border-black/10 bg-gray-50">
              實時預覽
            </div>
            <div 
              className="p-4 prose prose-sm max-w-none overflow-auto font-sans"
              style={{ height: '290px' }}
              dangerouslySetInnerHTML={{ __html: localValue }}
            />
          </div>
        </div>
      ) : (
        // 單欄模式：僅 Monaco 編輯器
        <div className="border-2 border-black/20 rounded overflow-hidden">
          <Editor
            height="280px"
            language="html"
            value={localValue}
            onChange={handleEditorChange}
            options={editorOptions}
          />
        </div>
      )}
    </div>
  );
}

interface AdminPageProps {
  mvData: MVItem[];
  metadata: {
    albumMeta: Record<string, { date?: string; hideDate?: boolean }>;
    artistMeta: Record<string, { id?: string; hideId?: boolean }>;
    settings: { showAutoAlbumDate: boolean };
  };
  systemStatus?: { maintenance: boolean; type?: 'data' | 'ui'; eta?: string | null; buildTime?: string | null; version?: string | null };
  onRefresh?: () => void;
}

export function AdminPage({ mvData, metadata, systemStatus, onRefresh }: AdminPageProps) {
  // 認證狀態
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  
  // 登入追蹤狀態
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginFailures, setLoginFailures] = useState(0);

  // 密碼修改狀態
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  const verifyPassword = async (pwd: string, silent = false) => {
    // 若已登入，阻擋追蹤與後續邏輯
    if (isAuthenticated) return;
    
    setIsVerifying(true);

    // 追蹤：有人嘗試登入
    if (!silent && (window as any).umami && typeof (window as any).umami.track === 'function') {
      (window as any).umami.track('Z_Admin_Login_Attempt', { 
        method: 'password', 
        attemptCount: loginAttempts + 1 
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
        const data = await res.json();
        setIsAuthenticated(true);
        localStorage.setItem('ztmy_admin_pwd', pwd);
        setIsDefaultPassword(data.isDefaultPassword);
        if (!silent) toast.success('登入成功');
      } else {
        if (!silent) {
          toast.error('密碼錯誤或驗證失敗');
          
          // 追蹤：登入失敗
          if ((window as any).umami && typeof (window as any).umami.track === 'function') {
            (window as any).umami.track('Z_Admin_Login_Failed', { 
              method: 'password',
              reason: 'invalid_password',
              failureCount: loginFailures + 1 
            });
            setLoginFailures(prev => prev + 1);
          }
        }
        localStorage.removeItem('ztmy_admin_pwd');
        setIsAuthenticated(false);
      }
    } catch (e) {
      if (!silent) {
        toast.error('伺服器連線失敗');
        
        // 追蹤：登入失敗 (連線問題)
        if ((window as any).umami && typeof (window as any).umami.track === 'function') {
          (window as any).umami.track('Z_Admin_Login_Failed', { 
            method: 'password',
            reason: 'network_error',
            failureCount: loginFailures + 1 
          });
          setLoginFailures(prev => prev + 1);
        }
      }
      setIsAuthenticated(false);
    } finally {
      setIsVerifying(false);
      setIsInitializing(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (isAuthenticated) return;
    
    setIsVerifying(true);

    // 追蹤：嘗試使用 Passkey 登入
    if ((window as any).umami && typeof (window as any).umami.track === 'function') {
      (window as any).umami.track('Z_Admin_Login_Attempt', { 
        method: 'passkey', 
        attemptCount: loginAttempts + 1 
      });
      setLoginAttempts(prev => prev + 1);
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const authApiUrl = apiUrl.replace(/\/mvs$/, '/auth');
      
      const resp = await fetch(`${authApiUrl}/generate-auth-options`);
      const options = await resp.json();
      if (options.error) throw new Error(options.error);

      const asseResp = await startAuthentication({ optionsJSON: options });
      const verifyResp = await fetch(`${authApiUrl}/verify-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asseResp)
      });
      const verifyResult = await verifyResp.json();
      if (verifyResult.success) {
        setIsAuthenticated(true);
        localStorage.setItem('ztmy_admin_pwd', verifyResult.token);
        setIsDefaultPassword(verifyResult.isDefaultPassword);
        toast.success('Passkey 登入成功');
      } else {
        toast.error('Passkey 驗證失敗');
        
        // 追蹤：Passkey 登入失敗
        if ((window as any).umami && typeof (window as any).umami.track === 'function') {
          (window as any).umami.track('Z_Admin_Login_Failed', { 
            method: 'passkey',
            reason: 'verification_failed',
            failureCount: loginFailures + 1 
          });
          setLoginFailures(prev => prev + 1);
        }
      }
    } catch (e: any) {
      toast.error('Passkey 登入失敗: ' + e.message);
      
      // 追蹤：Passkey 登入錯誤
      if ((window as any).umami && typeof (window as any).umami.track === 'function') {
        (window as any).umami.track('Z_Admin_Login_Failed', { 
          method: 'passkey',
          reason: 'error_or_cancelled',
          failureCount: loginFailures + 1 
        });
        setLoginFailures(prev => prev + 1);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(false);
    localStorage.removeItem('ztmy_admin_pwd');
    setIsAuthenticated(false);
    toast.success('已安全登出');
  };

  const handleChangePassword = async () => {
    if (!isDefaultPassword && !oldPwd) return toast.error('請輸入舊密碼');
    if (newPwd.length < 4) return toast.error('密碼至少需要4個字元');
    if (newPwd === 'zutomayo') return toast.error('不能修改回初始密碼');
    if (newPwd !== confirmPwd) return toast.error('兩次密碼輸入不一致');
    
    setIsSavingPwd(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const authApiUrl = apiUrl.replace(/\/mvs$/, '/auth');
      
      const res = await fetch(`${authApiUrl}/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
      });
      
      if (res.ok) {
        toast.success('密碼修改成功！');
        localStorage.setItem('ztmy_admin_pwd', newPwd);
        setIsDefaultPassword(false);
        setIsChangePwdOpen(false);
        setOldPwd('');
        setNewPwd('');
        setConfirmPwd('');
      } else {
        const data = await res.json();
        toast.error(data.error || '修改失敗');
      }
    } catch (e) {
      toast.error('伺服器連線失敗');
    } finally {
      setIsSavingPwd(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('ztmy_admin_pwd');
    if (saved) {
      verifyPassword(saved, true);
    } else {
      setIsInitializing(false);
    }
  }, []);

  const [data, setData] = useState<MVItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // 刪除確認 Drawer 狀態
  const [deleteDrawerOpen, setDeleteDrawerOpen] = useState(false);
  const [pendingDeleteMV, setPendingDeleteMV] = useState<MVItem | null>(null);
  const [pendingDeleteImageIdx, setPendingDeleteImageIdx] = useState<number | null>(null);

  // 圖片拖曳排序狀態
  const [draggedImageIdx, setDraggedImageIdx] = useState<number | null>(null);
  const [dragOverImageIdx, setDragOverImageIdx] = useState<number | null>(null);
  const [draggableIdx, setDraggableIdx] = useState<number | null>(null);

  // 控制圖片編輯器高級設置的展開狀態
  const [expandedImageIndices, setExpandedImageIndices] = useState<Set<number>>(new Set());
  const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'basic' | 'media' | 'images' | 'schema'>('images');
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  // 批量新增與分組狀態
  const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);
  const [batchTweetUrls, setBatchTweetUrls] = useState('');
  const [batchAddStatus, setBatchAddStatus] = useState<{ total: number, current: number, failedUrls: string[], isProcessing: boolean } | null>(null);
  const [selectedImageIndices, setSelectedImageIndices] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleImageExpand = (idx: number) => {
    setExpandedImageIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      return newSet;
    });
  };

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

  // 追蹤變動的字段: Map<mvId, Set<fieldPath>>
  const [changedFields, setChangedFields] = useState<Map<string, Set<string>>>(new Map());
  // 追蹤刪除的 MV ID
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  // 保存原始數據用於比較
  const originalDataRef = useRef<MVItem[]>([]);

  // Metadata 狀態
  const [localMetadata, setLocalMetadata] = useState<{
    albumMeta: Record<string, { date?: string; hideDate?: boolean }>;
    artistMeta: Record<string, { id?: string; hideId?: boolean }>;
    settings: { showAutoAlbumDate: boolean; announcements?: string[] };
  }>({ albumMeta: {}, artistMeta: {}, settings: { showAutoAlbumDate: false, announcements: [] } });
  const [localMaintenance, setLocalMaintenance] = useState(false);
  const [localMaintenanceType, setLocalMaintenanceType] = useState<'data' | 'ui'>('ui');
  const [localMaintenanceEta, setLocalMaintenanceEta] = useState<string>('');
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  useEffect(() => {
    setLocalMetadata(JSON.parse(JSON.stringify(metadata)));
  }, [metadata]);

  useEffect(() => {
    setLocalMaintenance(systemStatus?.maintenance || false);
    setLocalMaintenanceType(systemStatus?.type || 'ui');
    setLocalMaintenanceEta(systemStatus?.eta || '');
  }, [systemStatus]);

  const availableAlbums = useMemo(() => {
    const set = new Set<string>();
    mvData.forEach((mv) => {
      if (Array.isArray(mv.album)) {
        mv.album.forEach((a) => {
          if (typeof a === 'string' && a.trim() !== '') set.add(a);
        });
      }
    });
    return Array.from(set).sort();
  }, [mvData]);

  const availableArtists = useMemo(() => {
    const set = new Set<string>();
    mvData.forEach((mv) => {
      if (Array.isArray(mv.artist)) {
        mv.artist.forEach((a) => {
          if (typeof a === 'string' && a.trim() !== '') set.add(a);
        });
      } else if (typeof mv.artist === 'string' && (mv.artist as string).trim() !== '') {
        set.add(mv.artist as string);
      }
    });
    return Array.from(set).sort();
  }, [mvData]);

  const [passkeys, setPasskeys] = useState<{id: string, name?: string, createdAt: string}[]>([]);

  useEffect(() => {
    if (isMetadataDialogOpen) {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const authApiUrl = apiUrl.replace(/\/mvs$/, '/auth');
      fetch(`${authApiUrl}/passkeys`, {
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      }).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setPasskeys(data);
      });
    }
  }, [isMetadataDialogOpen]);

  const handleRegisterPasskey = async () => {
    try {
      const name = window.prompt('請為此設備的 Passkey 命名 (例如: My MacBook):');
      if (!name) return;

      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const authApiUrl = apiUrl.replace(/\/mvs$/, '/auth');
      const headers = { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '', 'Content-Type': 'application/json' };
      
      const resp = await fetch(`${authApiUrl}/generate-reg-options`, { headers });
      const options = await resp.json();
      if (options.error) throw new Error(options.error);

      const attResp = await startRegistration({ optionsJSON: options });
      
      const verifyResp = await fetch(`${authApiUrl}/verify-reg`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: attResp, name })
      });
      const verifyResult = await verifyResp.json();
      
      if (verifyResult.success) {
        toast.success('Passkey 註冊成功！');
        const listResp = await fetch(`${authApiUrl}/passkeys`, { headers });
        setPasskeys(await listResp.json());
      } else {
        toast.error('Passkey 註冊失敗');
      }
    } catch (e: any) {
      toast.error('Passkey 註冊錯誤: ' + e.message);
    }
  };

  const handleRemovePasskey = async (id: string) => {
    if (!window.confirm('確定要刪除這個 Passkey 嗎？')) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const authApiUrl = apiUrl.replace(/\/mvs$/, '/auth');
      await fetch(`${authApiUrl}/passkeys/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' }
      });
      setPasskeys(prev => prev.filter(p => p.id !== id));
      toast.success('Passkey 已刪除');
    } catch (e) {
      toast.error('刪除失敗');
    }
  };

  const albumDefaultDateMap = useMemo(() => {
    const map: Record<string, string> = {};
    mvData.forEach((mv) => {
      if (!mv.date) return;
      mv.album?.forEach((a) => {
        if (!map[a] || mv.date < map[a]) map[a] = mv.date.replace(/\//g, '/');
      });
    });
    return map;
  }, [mvData]);

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
      originalDataRef.current = JSON.parse(JSON.stringify(sortedData));
      // 重置變動追蹤
      setChangedFields(new Map());
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

const currentMV = data[activeIndex];

  // 保存 Metadata
  const handleSaveMetadata = async () => {
    setIsSavingMetadata(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const response = await fetch(`${apiUrl}/metadata`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify(localMetadata),
      });
      if (!response.ok) throw new Error('保存 Metadata 失敗');

      if (localMaintenance !== systemStatus?.maintenance || localMaintenanceType !== (systemStatus?.type || 'ui') || localMaintenanceEta !== (systemStatus?.eta || '')) {
        const sysResponse = await fetch(`${apiUrl.replace('/mvs', '/system')}/maintenance`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
          },
          body: JSON.stringify({ maintenance: localMaintenance, type: localMaintenanceType, eta: localMaintenanceEta })
        });
        if (!sysResponse.ok) throw new Error('保存系統狀態失敗');
      }
      
      toast.success('全局設定 (Metadata) 已保存！');
      setIsMetadataDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error(error);
      toast.error('保存全局設定失敗！');
    } finally {
      setIsSavingMetadata(false);
    }
  };
  useEffect(() => {
    setImageDisplayLimit(24);
  }, [activeIndex]);

  const visibleImages = useMemo(() => {
    return (currentMV?.images || []).slice(0, imageDisplayLimit);
  }, [currentMV?.images, imageDisplayLimit]);

  const handleImageObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && currentMV?.images) {
      if (imageDisplayLimit < currentMV.images.length) {
        setImageDisplayLimit(prev => prev + 24);
      }
    }
  }, [currentMV?.images, imageDisplayLimit]);

  useEffect(() => {
    if (!currentMV?.images || imageDisplayLimit >= currentMV.images.length) return;

    const observer = new IntersectionObserver(handleImageObserver, { 
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    });

    const currentTarget = imageSentinelRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [handleImageObserver, currentMV?.images, imageDisplayLimit]);

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

  // 標記字段為已變動
  const markFieldChanged = (mvId: string, fieldPath: string) => {
    setChangedFields(prev => {
      const newMap = new Map(prev);
      const fields = newMap.get(mvId) || new Set();
      fields.add(fieldPath);
      newMap.set(mvId, fields);
      return newMap;
    });
  };

  // 獲取需要保存的完整 MV 數據（用於部分更新）
  // 直接打包整個 MV 對象，避免嵌套字段的部分更新問題
  const getChangedData = (): MVItem[] & { _deleted?: string[] } => {
    const result: MVItem[] & { _deleted?: string[] } = [];
    
    data.forEach((mv) => {
      const changed = changedFields.get(mv.id);
      
      // 如果沒有任何變動，或這是未修改的新項目，跳過
      if (!changed || changed.size === 0) {
        return;
      }
      
      // 直接複製整個 MV 對象（包含所有字段和圖片）
      result.push({ ...mv });
    });
    
    // 添加刪除標記
    if (deletedIds.size > 0) {
      result._deleted = Array.from(deletedIds);
    }
    
    return result;
  };

  // 更新單個欄位
  const updateField = (field: keyof MVItem, value: any) => {
    const targetId = currentMV.id;
    const originalMv = originalDataRef.current.find(mv => mv.id === targetId);
    
    // 檢查值是否真的變動
    if (originalMv && JSON.stringify(originalMv[field]) !== JSON.stringify(value)) {
      markFieldChanged(targetId, field as string);
    }
    
    setData(prevData => prevData.map(mv => 
      mv.id === targetId ? { ...mv, [field]: value } : mv
    ));
  };

  // 更新圖片陣列
  const updateImage = (imgIdx: number, field: string, value: any) => {
    const targetId = currentMV.id;
    const originalMv = originalDataRef.current.find(mv => mv.id === targetId);
    const originalImage = originalMv?.images?.[imgIdx];
    
    // 檢查值是否真的變動
    if (!originalImage || JSON.stringify(originalImage[field as keyof typeof originalImage]) !== JSON.stringify(value)) {
      markFieldChanged(targetId, `images.${imgIdx}.${field}`);
    }
    
    setData(prevData => prevData.map(mv => {
      if (mv.id !== targetId) return mv;
      const newImages = [...(mv.images || [])];
      
      const currentImg = newImages[imgIdx];
      const groupId = currentImg.groupId;
      // 所有欄位除了白名單外的都同步
      const nonSyncFields = ['url', 'thumbnail', 'caption', 'alt', 'width', 'height'];
      
      newImages[imgIdx] = { ...currentImg, [field]: value };
      
      if (groupId && !nonSyncFields.includes(field)) {
        newImages.forEach((img, idx) => {
          if (idx !== imgIdx && img.groupId === groupId) {
            newImages[idx] = { ...img, [field]: value };
            markFieldChanged(targetId, `images.${idx}.${field}`);
          }
        });
      }
      
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
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify({ url: proxiedUrl }),
      });
      if (!response.ok) throw new Error('Network Error');
      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  // 清理空值的自訂欄位
  const handleCleanEmptyCustomFields = () => {
    if (!currentMV?.images) return;
    const targetId = currentMV.id;
    let modified = false;
    
    const newImages = currentMV.images.map((img, idx) => {
      const newImg = { ...img };
      const reservedKeys = ['url', 'thumbnail', 'caption', 'alt', 'richText', 'width', 'height', 'tweetUrl', 'groupId', 'tweetText', 'tweetAuthor', 'tweetHandle', 'tweetDate'];
      
      Object.keys(newImg).forEach(key => {
        if (!reservedKeys.includes(key)) {
          const val = newImg[key];
          if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            delete newImg[key];
            modified = true;
            markFieldChanged(targetId, `images.${idx}.${key}`);
          }
        }
      });
      return newImg;
    });

    if (modified) {
      setData(prevData => prevData.map(mv => mv.id === targetId ? { ...mv, images: newImages } : mv));
      toast.success('已清理所有空值的自訂欄位！');
    } else {
      toast.info('沒有需要清理的空欄位。');
    }
  };

  const handleBatchAddTweets = async (urlsToProcess?: string[]) => {
    if (!currentMV) return;
    const targetId = currentMV.id;
    const urls = urlsToProcess || batchTweetUrls.split('\n').map(u => u.trim()).filter(u => u);
    
    if (urls.length === 0) return;
    
    setBatchAddStatus({ total: urls.length, current: 0, failedUrls: [], isProcessing: true });
    
    let currentFailedUrls: string[] = [];
    let newExtractedImages: any[] = [];
    let existingImagesModified = false;
    let newImagesData = [...(currentMV.images || [])];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/mvs$/, '') + '/mvs/twitter-resolve';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || '' },
          body: JSON.stringify({ url }),
        });
        
        if (!response.ok) throw new Error('推文解析失敗');
        const json = await response.json();
        
        if (json.success && json.data && json.data.length > 0) {
          const groupId = json.data.length > 1 ? `tweet-${Date.now()}-${Math.floor(Math.random() * 1000)}` : undefined;
          
          for (const media of json.data) {
            // 檢查該媒體 URL 是否已存在於當前的圖片列表中
            const existingIdx = newImagesData.findIndex(img => img.url === media.url);
            
            if (existingIdx !== -1) {
              // 若已存在，補充缺少的資訊並加入群組
              existingImagesModified = true;
              newImagesData[existingIdx] = {
                ...newImagesData[existingIdx],
                thumbnail: newImagesData[existingIdx].thumbnail || media.thumbnail || '',
                tweetUrl: newImagesData[existingIdx].tweetUrl || url,
                groupId: newImagesData[existingIdx].groupId || groupId,
                tweetText: newImagesData[existingIdx].tweetText || media.text,
                tweetAuthor: newImagesData[existingIdx].tweetAuthor || media.user_name,
                tweetHandle: newImagesData[existingIdx].tweetHandle || media.user_screen_name,
                tweetDate: newImagesData[existingIdx].tweetDate || media.date
              };
              markFieldChanged(targetId, `images.${existingIdx}`);
            } else {
              // 若不存在，加入到新圖片列表並探測尺寸
              let width = 0;
              let height = 0;
              try {
                const probeResult = await probeImageSize(media.thumbnail || media.url);
                width = probeResult.data?.width || probeResult.width;
                height = probeResult.data?.height || probeResult.height;
              } catch (e) {
                // ignore probe error
              }
              
              newExtractedImages.push({
                url: media.url,
                thumbnail: media.thumbnail || '',
                tweetUrl: url,
                caption: '',
                alt: '',
                richText: '',
                width,
                height,
                groupId,
                tweetText: media.text,
                tweetAuthor: media.user_name,
                tweetHandle: media.user_screen_name,
                tweetDate: media.date
              });
            }
          }
        } else {
          throw new Error('找不到媒體');
        }
      } catch (err) {
        currentFailedUrls.push(url);
      }
      
      setBatchAddStatus(prev => prev ? { ...prev, current: i + 1, failedUrls: currentFailedUrls } : null);
    }
    
    if (newExtractedImages.length > 0 || existingImagesModified) {
      if (newExtractedImages.length > 0) {
        markFieldChanged(targetId, 'images');
        newImagesData = [...newImagesData, ...newExtractedImages];
      }
      
      setData(prevData => prevData.map(mv => {
        if (mv.id !== targetId) return mv;
        return { ...mv, images: newImagesData };
      }));
      
      if (newExtractedImages.length > 0) {
        setImageDisplayLimit(prev => prev + newExtractedImages.length);
      }
    }
    
    setBatchAddStatus(prev => prev ? { ...prev, isProcessing: false } : null);
    
    if (currentFailedUrls.length === 0) {
      toast.success(`解析完成: 新增 ${newExtractedImages.length} 個媒體${existingImagesModified ? '，並更新了已存在的媒體資訊' : ''}`);
      setTimeout(() => setIsBatchAddOpen(false), 1500);
    } else {
      toast.warning(`完成，但有 ${currentFailedUrls.length} 個連結解析失敗`);
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
          // 針對影片：優先使用 thumbnail 來探測尺寸，避免丟出 .mp4 導致探測失敗
          const targetUrlToProbe = images[imgIdx].thumbnail || images[imgIdx].url;
          const result = await probeImageSize(targetUrlToProbe);
          const width = result.data?.width || result.width;
          const height = result.data?.height || result.height;
          
          // 標記寬高字段變動
          markFieldChanged(targetId, `images.${imgIdx}.width`);
          markFieldChanged(targetId, `images.${imgIdx}.height`);
          
          // 使用函數式更新確保狀態正確
          setData(prevData => prevData.map(mv => {
            if (mv.id !== targetId) return mv;
            const newImages = [...(mv.images || [])];
            newImages[imgIdx] = { ...newImages[imgIdx], width, height };
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
      toast.success('所有圖片尺寸獲取完成');
      setTimeout(() => setBatchStatus(null), 3000);
    } else {
      toast.error(`任務結束，其中 ${failed.length} 張圖片獲取失敗`);
    }
  };

  // 調用後端偵測尺寸 (單個)
  const handleProbe = async (imgIdx: number, url: string) => {
    if (!url) return;
    const targetId = currentMV.id;
    let urlToProbe = url;
    let resolvedMediaList: any[] = [];

    // 如果是推文網址，先呼叫後端解析
    if (url.match(/(?:x|twitter)\.com\/[^/]+\/status\/\d+/)) {
      try {
        // 使用相對路徑加上後端代理的 VITE_API_URL 邏輯，避免跨域和環境變數問題
        const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/mvs$/, '') + '/mvs/twitter-resolve';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
          },
          body: JSON.stringify({ url }),
        });
        if (!response.ok) throw new Error('推文解析請求失敗');
        const json = await response.json();
        
        if (json.success && json.data && json.data.length > 0) {
          resolvedMediaList = json.data;
          toast.success(`成功解析推文，取得 ${json.data.length} 個媒體`);
        } else {
          throw new Error('推文中找不到媒體');
        }
      } catch (err: any) {
        toast.error('推文解析失敗: ' + err.message);
        return;
      }
    }

    // 如果有解析出推文媒體，先更新當前圖片列表
    if (resolvedMediaList.length > 0) {
      const firstMedia = resolvedMediaList[0];
      const newImages = [...(currentMV.images || [])];
      
      // 更新當前索引的圖片為第一個解析出的媒體
      const groupId = `tweet-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const updateData = {
        url: firstMedia.url,
        thumbnail: firstMedia.thumbnail || '', // 如果是影片會有縮圖
        tweetUrl: url, // 儲存原始推文 URL
        groupId: resolvedMediaList.length > 1 ? groupId : undefined,
        tweetText: firstMedia.text,
        tweetAuthor: firstMedia.user_name,
        tweetHandle: firstMedia.user_screen_name,
        tweetDate: firstMedia.date
      };

      newImages[imgIdx] = { 
        ...newImages[imgIdx], 
        ...updateData
      };
      
      // 如果推文有多張圖片/影片，將後續的媒體插入到當前圖片後面
      if (resolvedMediaList.length > 1) {
        for (let i = 1; i < resolvedMediaList.length; i++) {
          newImages.splice(imgIdx + i, 0, {
            url: resolvedMediaList[i].url,
            thumbnail: resolvedMediaList[i].thumbnail || '',
            caption: newImages[imgIdx].caption || '',
            alt: newImages[imgIdx].alt || '',
            richText: newImages[imgIdx].richText || '',
            tweetUrl: url,
            tweetText: resolvedMediaList[i].text,
            tweetAuthor: resolvedMediaList[i].user_name,
            tweetHandle: resolvedMediaList[i].user_screen_name,
            tweetDate: resolvedMediaList[i].date,
            groupId,
            width: 0,
            height: 0
          });
        }
      }
      
      markFieldChanged(targetId, 'images');
      setData(prevData => prevData.map(mv => {
        if (mv.id !== targetId) return mv;
        return { ...mv, images: newImages };
      }));

      // 對第一個媒體進行尺寸探測 (如果是影片，探測其縮圖)
      urlToProbe = firstMedia.thumbnail || firstMedia.url;
    }

    try {
      // 針對影片：優先使用 thumbnail 來探測尺寸，避免丟出 .mp4 導致探測失敗
      const targetUrlToProbe = urlToProbe || url;
      const result = await probeImageSize(targetUrlToProbe);
      
      // 標記寬高字段變動
      markFieldChanged(targetId, `images.${imgIdx}.width`);
      markFieldChanged(targetId, `images.${imgIdx}.height`);
      
      // 合併更新寬高，避免兩次調用 updateImage 導致的異步覆蓋問題
      setData(prevData => prevData.map(mv => {
        if (mv.id !== targetId) return mv;
        const newImages = [...(mv.images || [])];
        newImages[imgIdx] = { ...newImages[imgIdx], width: result.data?.width || result.width, height: result.data?.height || result.height };
        return { ...mv, images: newImages };
      }));

      toast.success('尺寸偵測完成');
    } catch (err: any) {
      toast.error('尺寸獲取失敗: ' + err.message);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImageIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverImageIdx !== index) {
      setDragOverImageIdx(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedImageIdx(null);
    setDragOverImageIdx(null);
    setDraggableIdx(null);
  };

  // 取得群組標識 (A, B, C...)
  const getGroupLetter = (groupId: string | undefined, allImages: MVImage[] | undefined) => {
    if (!groupId || !allImages) return '';
    const uniqueGroups = Array.from(new Set(allImages.filter(img => img.groupId).map(img => img.groupId)));
    const index = uniqueGroups.indexOf(groupId);
    if (index === -1) return '';
    // A-Z, AA, AB...
    let letter = '';
    let tempIndex = index;
    do {
      letter = String.fromCharCode(65 + (tempIndex % 26)) + letter;
      tempIndex = Math.floor(tempIndex / 26) - 1;
    } while (tempIndex >= 0);
    return letter;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedImageIdx === null || draggedImageIdx === dropIndex) {
      handleDragEnd();
      return;
    }
    
    const newImages = [...(currentMV.images || [])];
    const draggedImage = newImages[draggedImageIdx];
    const dropImage = newImages[dropIndex];
    
    // 若拖曳的圖片有分組
    if (draggedImage.groupId) {
      if (dropImage.groupId === draggedImage.groupId) {
        // 同組內部排序：只移動該張圖片
        newImages.splice(draggedImageIdx, 1);
        // 因為刪除了一個元素，如果 dropIndex > draggedImageIdx，實際插入位置要 -1，但 splice 是針對當前陣列操作
        // 所以直接用 splice 處理
        // 為了避免 index 偏移問題，先移除再計算插入
        const actualDropIndex = dropIndex > draggedImageIdx ? dropIndex - 1 : dropIndex;
        newImages.splice(dropIndex, 0, draggedImage);
      } else {
        // 跨組移動：將整個群組移動到目標位置
        const groupItems = newImages.filter(img => img.groupId === draggedImage.groupId);
        const filteredImages = newImages.filter(img => img.groupId !== draggedImage.groupId);
        const newDropIndex = filteredImages.indexOf(dropImage);
        filteredImages.splice(newDropIndex >= 0 ? newDropIndex : dropIndex, 0, ...groupItems);
        updateField('images', filteredImages);
        handleDragEnd();
        return;
      }
    } else {
      // 無分組圖片移動
      if (dropImage.groupId) {
        // 避免插入到群組中間，找到該群組的邊界
        const groupStartIndex = newImages.findIndex(img => img.groupId === dropImage.groupId);
        let groupEndIndex = -1;
        for (let i = newImages.length - 1; i >= 0; i--) {
          if (newImages[i].groupId === dropImage.groupId) {
            groupEndIndex = i;
            break;
          }
        }
        // 判斷是放在群組前半還是後半
        const insertIndex = dropIndex - groupStartIndex > (groupEndIndex - groupStartIndex) / 2 ? groupEndIndex + 1 : groupStartIndex;
        
        newImages.splice(draggedImageIdx, 1);
        const actualInsertIndex = insertIndex > draggedImageIdx ? insertIndex - 1 : insertIndex;
        newImages.splice(actualInsertIndex, 0, draggedImage);
      } else {
        newImages.splice(draggedImageIdx, 1);
        newImages.splice(dropIndex, 0, draggedImage);
      }
    }
    
    updateField('images', newImages);
    handleDragEnd();
  };

  const addImage = () => {
    const images = [...(currentMV.images || []), { url: '', caption: '', alt: '', richText: '', width: 0, height: 0 }];
    updateField('images', images);
    // 確保新增的圖片在視線範圍內
    setImageDisplayLimit(prev => Math.max(prev, images.length));
  };

  const removeImage = (imgIdx: number) => {
    // 關閉編輯彈窗
    if (editingImageIdx === imgIdx) {
      setEditingImageIdx(null);
    }
    // 打開刪除確認 Drawer
    setPendingDeleteImageIdx(imgIdx);
    setPendingDeleteMV(null);
    setDeleteDrawerOpen(true);
  };

  // 確認刪除圖片
  const confirmDeleteImage = () => {
    if (pendingDeleteImageIdx === null) return;
    const targetId = currentMV.id;
    const images = currentMV.images?.filter((_, i) => i !== pendingDeleteImageIdx);
    // 標記整個 images 數組變動
    markFieldChanged(targetId, 'images');
    setData(prevData => prevData.map(mv => 
      mv.id === targetId ? { ...mv, images } : mv
    ));
    setDeleteDrawerOpen(false);
    setPendingDeleteImageIdx(null);
  };

  // 開啟刪除 MV Drawer
  const openDeleteMVDrawer = (mv: MVItem) => {
    setPendingDeleteMV(mv);
    setPendingDeleteImageIdx(null);
    setDeleteDrawerOpen(true);
  };

  // 確認刪除 MV
  const confirmDeleteMV = () => {
    if (!pendingDeleteMV) return;
    const mv = pendingDeleteMV;
    const isNewItem = !originalDataRef.current.find(item => item.id === mv.id);
    if (isNewItem) {
      // 如果是新項目，直接從變動追蹤中移除
      setChangedFields(prev => {
        const newMap = new Map(prev);
        newMap.delete(mv.id);
        return newMap;
      });
    } else {
      // 如果是現有項目，標記為刪除
      setDeletedIds(prev => new Set(prev).add(mv.id));
    }
    setData(data.filter(item => item.id !== mv.id));
    setActiveIndex(0);
    setDeleteDrawerOpen(false);
    setPendingDeleteMV(null);
  };

  const addNewMV = () => {
    const newId = `new-mv-${Date.now()}`;
    const newItem: MVItem = {
      id: newId,
      title: "新影片標題",
      year: new Date().getFullYear().toString(),
      date: "",
      album: [],
      artist: ["Waboku"], // 改為陣列
      youtube: "",
      bilibili: "",
      description: "",
      images: [],
      coverImages: [],
      keywords: []
    };
    // 標記所有字段為變動（新項目需要全部保存）
    const allFields = Object.keys(newItem) as (keyof MVItem)[];
    setChangedFields(prev => {
      const newMap = new Map(prev);
      newMap.set(newId, new Set(allFields as string[]));
      return newMap;
    });
    
    setData([newItem, ...data]);
    setActiveIndex(0);
    toast('已新增條目，可開始編輯', {
      description: `ID: ${newId}`,
      action: {
        label: 'Undo',
        onClick: () => {
          setData(data);
          setChangedFields(prev => {
            const newMap = new Map(prev);
            newMap.delete(newId);
            return newMap;
          });
        },
      },
    });
  };

  // 同步新欄位到所有數據
  const handleSyncNewField = () => {
    const field = newFieldName.trim();
    if (!field) {
      toast.error('請輸入有效的欄位名稱');
      return;
    }

    setData(prevData => prevData.map(item => ({
      ...item,
      [field]: (item as any)[field] !== undefined ? (item as any)[field] : newFieldDefaultValue
    })));

    toast.success(`已為所有項目同步欄位: [${field}]`);
    setNewFieldName('');
    setNewFieldDefaultValue('');
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsConfirmOpen(false); // 關閉確認視窗
    
    // 只獲取變動的字段數據
    const changedData = getChangedData();
    const hasChanges = changedData.length > 0 || (changedData._deleted && changedData._deleted.length > 0);
    
    // 如果沒有實質變動，直接提示成功
    if (!hasChanges) {
      toast.success('沒有檢測到變動，無需保存');
      return;
    }
    
    const apiUrl = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/(\/mvs)?$/, '/mvs/update');
    
    // 使用 Promise toast 處理非同步狀態
    toast.promise(
      fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify({
          data: changedData,
          partial: true // 標記為部分更新
        }),
      }).then(async response => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: '未知錯誤' }));
          throw new Error(errorData.error || `儲存失敗 (${response.status})`);
        }
        return response.json();
      }),
      {
        loading: '正在同步數據到服務器...',
        success: (result) => {
          // 更新成功後，重置變動追蹤並同步原始數據
          originalDataRef.current = JSON.parse(JSON.stringify(data));
          setChangedFields(new Map());
          setDeletedIds(new Set());
          
          if (onRefresh) onRefresh();
          
          // 根據後端返回的詳細信息生成提示
          const { details } = result;
          if (details) {
            const parts: string[] = [];
            if (details.totalUpdated > 0) {
              parts.push(`已更新 ${details.totalUpdated} 條`);
            }
            if (details.totalDeleted > 0) {
              parts.push(`已刪除 ${details.totalDeleted} 條`);
            }
            return parts.join(' | ') || '數據回寫成功';
          }
          return '數據回寫成功';
        },
        error: (err) => {
          return `儲存失敗: ${err.message}`;
        },
      }
    );
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-foreground crt-lines p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5 crt-lines-global" />
        <div className="text-xl font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
          <i className="hn hn-refresh text-xl animate-spin" />
          <span className="flex flex-col leading-tight">
            <span className="tracking-normal opacity-70">驗證中...</span>
            <span className="text-[10px] font-mono opacity-40 normal-case">AUTHENTICATING...</span>
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-foreground crt-lines p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5 crt-lines-global" />
        <div className="w-full max-w-sm bg-card border-4 border-black shadow-neo flex flex-col z-10 relative">
          <div className="h-10 bg-black text-white flex items-center justify-between px-4 border-b-4 border-black">
            <span className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <i className="hn hn-exclamation-triangle text-base" />
              <span className="flex flex-col leading-tight">
                <span className="tracking-normal opacity-90">管理員驗證</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">ADMIN_AUTH</span>
              </span>
            </span>
            <div className="flex gap-2">
              <div className="size-3 rounded-full bg-main" />
              <div className="size-3 rounded-full bg-ztmy-green" />
              <div className="size-3 rounded-full bg-red-500" />
            </div>
          </div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              verifyPassword(passwordInput);
            }} 
            className="p-8 flex flex-col gap-6"
          >
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
                <span className="tracking-normal opacity-70">存取碼</span>
                <span className="text-[10px] font-mono opacity-40 normal-case">ACCESS_CODE</span>
              </label>
              <Input
                type="password"
                placeholder="請輸入密碼... (ENTER_PASSWORD...)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              variant="default" 
              className="w-full bg-black text-white hover:bg-main hover:text-black shadow-neo border-2 border-transparent transition-colors rounded-none h-12 font-black tracking-widest"
              disabled={isVerifying || !passwordInput}
            >
              <span className="flex flex-col items-center leading-tight">
                <span className="tracking-normal">{isVerifying ? '驗證中...' : '登入'}</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">{isVerifying ? 'VERIFYING...' : 'LOGIN_'}</span>
              </span>
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-black/20"></span></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-black/50 font-bold flex flex-col items-center leading-tight">
                  <span className="tracking-normal">或</span>
                  <span className="text-[10px] font-mono opacity-60 normal-case">OR</span>
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="neutral"
              className="w-full h-12 font-black tracking-widest flex items-center justify-center gap-2 border-2 border-black"
              onClick={handlePasskeyLogin}
              disabled={isVerifying}
            >
              <i className="hn hn-user text-xl" />
              <span className="flex flex-col items-center leading-tight">
                <span className="tracking-normal">使用 Passkey 登入</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">PASSKEY LOGIN</span>
              </span>
            </Button>
          </form>
          <div className="bg-secondary-background border-t-4 border-black p-3 flex justify-between items-center text-[10px] opacity-70">
            <span>SYS.AUTH.v{VERSION_CONFIG.app}</span>
            <button onClick={() => navigate('/')} className="hover:underline hover:text-main transition-colors uppercase">
              <span className="flex flex-col items-end leading-tight">
                <span className="tracking-normal">{'<'} 返回首頁</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">Return_Home</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentMV) {
    return (
      <div className="h-screen bg-background text-foreground flex flex-col font-mono font-normal overflow-hidden">
        {/* 頂部控制欄 */}
        <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm z-40 shrink-0">
          <div className="flex items-center gap-4">
            <Button 
              variant="neutral" 
              size="icon" 
              onClick={() => navigate('/')} 
              className="rounded-full bg-black text-white hover:bg-main hover:text-black border-2 border-transparent transition-all shadow-neo-sm"
            >
              <i className="hn hn-arrow-left text-xl" />
            </Button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-widest leading-none">管理員控制台</h1>
              <div className="text-[10px] font-bold opacity-40 font-mono normal-case tracking-widest">ZTMY.ADMIN.PANEL</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="neutral" 
              size="sm" 
              onClick={() => navigate('/admin/db')}
              className="border-2 border-transparent text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="資料庫管理（SQL EXPLORER）"
            >
              <i className="hn hn-table text-base" />
            </Button>
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
          <i className="hn hn-inbox text-4xl mb-4" />
          <h2 className="text-xl font-black mb-2">沒有找到 MV 資料</h2>
          <p className="text-sm">資料庫目前是空的，或是無法載入資料。</p>
        </div>

        {/* 登出確認對話框 */}
        <AlertDialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
          <AlertDialogContent className="border-4 border-black rounded-none shadow-neo-lg bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black text-xl flex items-center gap-2 uppercase">
                <i className="hn hn-exclamation-circle text-red-500 text-2xl" />
                <span className="flex flex-col leading-tight">
                  <span className="tracking-normal">確定要登出嗎？</span>
                  <span className="text-[10px] font-mono opacity-40 normal-case">CONFIRM_LOGOUT</span>
                </span>
              </AlertDialogTitle>
              <AlertDialogDescription className="font-mono text-sm font-bold opacity-80 pt-2">
                登出後需要重新輸入密碼或使用 Passkey 驗證才能再次進入管理後台。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex gap-2">
              <AlertDialogCancel 
                className="flex-1 border-2 border-black hover:bg-secondary-background shadow-neo-sm rounded-none font-bold"
              >
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

        <div className="h-8 border-t-4 border-black bg-card flex items-center justify-between px-8 text-[10px] font-bold opacity-70 shrink-0 z-40 absolute bottom-0 left-0 right-0 w-full">
          <span>ZTMY.ADMIN.PANEL</span>
          <span>
            FE: {VERSION_CONFIG.app}
            {systemStatus?.version && ` | BE: ${systemStatus.version}`}
            {systemStatus?.buildTime && ` | 🕒 ${new Date(systemStatus.buildTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '')}`}
          </span>
        </div>
      </div>
    );
  }

  return (

    <div className="h-screen bg-background text-foreground flex flex-col font-mono font-normal overflow-hidden">
      {/* 密碼安全性警告 */}
      {isDefaultPassword && (
        <div className="bg-red-600 text-white p-2 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-4 z-50 relative shrink-0">
          <i className="hn hn-exclamation-triangle text-base animate-pulse" />
          系統目前使用初始密碼 (zutomayo)，存在安全風險！請立即修改密碼。
          <Button size="sm" variant="neutral" className="h-6 text-[10px] bg-white text-red-600 hover:bg-gray-200 shadow-none border-transparent px-2" onClick={() => setIsChangePwdOpen(true)}>
            立即修改
          </Button>
        </div>
      )}

      {/* 頂部控制欄 */}
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm z-40 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="neutral" size="sm" onClick={() => navigate('/')}>
            <i className="hn hn-arrow-left text-base mr-2" /> 返回
          </Button>
          <h1 className="font-black uppercase tracking-tighter text-xl border-l-4 border-black pl-4">
            數據管理後台 V{VERSION_CONFIG.app}
            <span className="text-[10px] font-mono opacity-50 ml-2 normal-case tracking-normal align-middle">
              (🕒 {VERSION_CONFIG.buildDate.replace(/-/g, '')})
            </span>
          </h1>
          {systemStatus?.version && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 bg-muted border-2 border-black/10 rounded-sm ml-2">
              <i className="hn hn-server" />
              BE: {systemStatus.version}
              {systemStatus?.buildTime && ` | 🕒 ${new Date(systemStatus.buildTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '')}`}
            </span>
          )}
        </div>
        <div className="flex gap-4">
          <Button 
            variant="neutral" 
            size="sm" 
            onClick={() => setIsMetadataDialogOpen(true)}
            className="border-2 border-black font-bold bg-white"
          >
            全局設定 (Metadata)
          </Button>
          <Button 
            variant={showOnlyIncomplete ? "default" : "neutral"} 
            size="sm" 
            onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
            className={showOnlyIncomplete ? "bg-red-500 text-white shadow-neo" : ""}
          >
            <i className="hn hn-filter text-base mr-2" /> 
            <span className="hidden md:inline">
              {showOnlyIncomplete ? '正在查看待完善' : '只看待完善'}
            </span>
          </Button>
          <Button variant="default" size="sm" onClick={addNewMV} className="bg-main text-main-foreground shadow-neo hover:translate-x-0 hover:translate-y-0">
            <i className="hn hn-plus text-base mr-2" /> 新增條目
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setIsConfirmOpen(true)} 
            disabled={isSaving}
            className="bg-ztmy-green text-black shadow-neo hover:translate-x-0 hover:translate-y-0"
          >
            <i className="hn hn-save text-base mr-2" /> {isSaving ? '同步中...' : '儲存回寫 (COMMIT)'}
          </Button>
          <div className="w-px h-8 bg-black/20 mx-2"></div>
          <Button 
            variant="neutral" 
            size="sm" 
            onClick={() => navigate('/admin/db')}
            className="border-2 border-transparent text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="資料庫管理（SQL EXPLORER）"
          >
            <i className="hn hn-table text-base" />
          </Button>
          <Button 
            variant="neutral" 
            size="sm" 
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="border-2 border-transparent text-red-500 hover:text-red-600 hover:bg-red-50"
            title="登出管理員"
          >
            <i className="hn hn-logout text-base" />
          </Button>
          <Button 
            variant="neutral" 
            size="sm" 
            onClick={() => setIsChangePwdOpen(true)}
            className="border-2 border-transparent text-black hover:bg-black/5"
            title="修改密碼"
          >
            <i className="hn hn-lock-open text-base" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
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
                  #{mv.id} {isIncomplete && <i className="hn hn-exclamation-triangle text-sm text-red-500" />}
                </div>
                <div className="font-bold text-sm truncate" lang="ja">{mv.title}</div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteMVDrawer(mv);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
              >
                <i className="hn hn-trash text-base" />
              </button>
            </div>
              );
            })}
          </div>
        </div>

        {/* 右側表單 */}
        <div className="flex-1 h-full overflow-y-auto p-12 custom-scrollbar bg-card/50">
          <div className="max-w-4xl mx-auto space-y-12 pb-24">
            
            {/* 分頁導航列 */}
            <div className="flex gap-2 mb-8 border-b-4 border-black/20 pb-4 overflow-x-auto sticky top-0 z-20 bg-background/80 backdrop-blur pt-2">
              <button onClick={() => setActiveSection('basic')} className={`px-4 py-2 font-black uppercase border-2 transition-all shrink-0 ${activeSection === 'basic' ? 'bg-main text-main-foreground border-main shadow-neo' : 'bg-card text-card-foreground border-border hover:bg-main/10'}`}>01 基礎資訊</button>
              <button onClick={() => setActiveSection('media')} className={`px-4 py-2 font-black uppercase border-2 transition-all shrink-0 ${activeSection === 'media' ? 'bg-main text-main-foreground border-main shadow-neo' : 'bg-card text-card-foreground border-border hover:bg-main/10'}`}>02 媒體關聯</button>
              <button onClick={() => setActiveSection('images')} className={`px-4 py-2 font-black uppercase border-2 transition-all shrink-0 ${activeSection === 'images' ? 'bg-ztmy-green text-black border-ztmy-green shadow-neo' : 'bg-card text-card-foreground border-border hover:bg-ztmy-green/20'}`}>03 設定圖庫</button>
              <button onClick={() => setActiveSection('schema')} className={`px-4 py-2 font-black uppercase border-2 transition-all shrink-0 ${activeSection === 'schema' ? 'bg-foreground text-background border-foreground shadow-neo' : 'bg-card text-card-foreground border-border hover:bg-foreground/10'}`}>00 資料架構</button>
            </div>

            {/* 基礎資訊區塊 */}
            <div className={activeSection !== 'basic' ? 'hidden' : ''}>
            <section className="space-y-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">01 基礎資訊</h3>
                <span className="text-[10px] font-bold opacity-40 font-mono normal-case ml-2">01_Basic_Information</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-bold uppercase flex flex-col leading-tight">
                    <span className="opacity-70">MV 唯一 ID</span>
                    <span className="text-[10px] font-mono opacity-40 normal-case">MV_Unique_ID</span>
                  </label>
                  <Input 
                    value={currentMV.id} 
                    onChange={(e) => updateField('id', e.target.value)} 
                    className={getErrorClass(currentMV.id)}
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-bold uppercase flex flex-col leading-tight">
                    <span className="opacity-70">MV 標題</span>
                    <span className="text-[10px] font-mono opacity-40 normal-case">MV_Title</span>
                  </label>
                  <Input 
                    value={currentMV.title} 
                    onChange={(e) => updateField('title', e.target.value)} 
                    className={getErrorClass(currentMV.title)}
                    lang="ja"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase flex flex-col leading-tight">
                    <span className="opacity-70">描述</span>
                    <span className="text-[10px] font-mono opacity-40 normal-case">Description</span>
                  </label>
                  <Textarea 
                    value={currentMV.description} 
                    onChange={(e) => updateField('description', e.target.value)}
                    className={`min-h-[200px] font-sans text-sm ${getErrorClass(currentMV.description)}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase flex flex-col leading-tight">
                    <span className="opacity-70">發布年份</span>
                    <span className="text-[10px] font-mono opacity-40 normal-case">Release_Year</span>
                  </label>
                  <Input 
                    value={currentMV.year} 
                    onChange={(e) => updateField('year', e.target.value)} 
                    className={getErrorClass(currentMV.year)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase flex flex-col leading-tight">
                    <span className="opacity-70">完整日期</span>
                    <span className="text-[10px] font-mono opacity-40 normal-case">Full_Date</span>
                  </label>
                  <Input 
                    value={currentMV.date} 
                    onChange={(e) => updateField('date', e.target.value)} 
                    className={getErrorClass(currentMV.date)}
                  />
                </div>
              </div>
            </section>
            </div>

            {/* 媒體與關聯區塊 */}
            <div className={activeSection !== 'media' ? 'hidden' : ''}>
            <section className="space-y-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">02 媒體與關聯</h3>
                <span className="text-[10px] font-bold opacity-40 font-mono normal-case ml-2">02_Media_Connections</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase flex items-start gap-2">
                    <i className="hn hn-video-camera text-base mr-2" />
                    <span className="flex flex-col leading-tight">
                      <span className="opacity-70">YouTube 影片 ID</span>
                      <span className="text-[10px] font-mono opacity-40 normal-case">Youtube_ID</span>
                    </span>
                  </label>
                  <Input 
                    value={currentMV.youtube} 
                    onChange={(e) => updateField('youtube', e.target.value)} 
                    className={getErrorClass(currentMV.youtube)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase flex items-start gap-2">
                    <i className="hn hn-pc text-base mr-2" />
                    <span className="flex flex-col leading-tight">
                      <span className="opacity-70">Bilibili BV 號</span>
                      <span className="text-[10px] font-mono opacity-40 normal-case">Bilibili_BV</span>
                    </span>
                  </label>
                  <Input 
                    value={currentMV.bilibili || ''} 
                    onChange={(e) => updateField('bilibili', e.target.value)} 
                    className={getErrorClass(currentMV.bilibili)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase flex items-start gap-2">
                    <i className="hn hn-disc text-base mr-2" />
                    <span className="flex flex-col leading-tight">
                      <span className="opacity-70">專輯（每行一個項目）</span>
                      <span className="text-[10px] font-mono opacity-40 normal-case">Albums</span>
                    </span>
                  </label>
                  <Textarea 
                    value={currentMV.album?.join('\n')} 
                    onChange={(e) => updateField('album', e.target.value.split('\n').map(s => s.trim()).filter(s => s !== ''))} 
                    className={`min-h-[50px] font-sans text-sm ${getErrorClass(currentMV.album)}`}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase flex items-start gap-2">
                    <i className="hn hn-hashtag text-base mr-2" />
                    <span className="flex flex-col leading-tight">
                      <span className="opacity-70">關鍵字 / 標籤</span>
                      <span className="text-[10px] font-mono opacity-40 normal-case">Keywords / Tags</span>
                    </span>
                  </label>
                  <div className={`space-y-2 border-2 border-border bg-black/5 p-4 ${getErrorClass(currentMV.keywords)}`}>
                    {(currentMV.keywords || []).map((kw, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input 
                          placeholder="輸入關鍵字..."
                          value={kw.text}
                          onChange={(e) => {
                            const newKeywords = [...(currentMV.keywords || [])];
                            newKeywords[idx] = { ...kw, text: e.target.value };
                            updateField('keywords', newKeywords);
                          }}
                          className="flex-1 bg-white font-sans text-sm h-10"
                        />
                        <div className="w-[180px] shrink-0">
                          <Select
                            value={kw.lang || "none"}
                            onValueChange={(val) => {
                              const newKeywords = [...(currentMV.keywords || [])];
                              if (val === "none") {
                                delete newKeywords[idx].lang;
                              } else {
                                newKeywords[idx] = { ...kw, lang: val };
                              }
                              updateField('keywords', newKeywords);
                            }}
                          >
                            <SelectTrigger className="h-10 bg-white border-2 border-border shadow-none">
                              <SelectValue placeholder="選擇語言" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">無 (預設)</SelectItem>
                              <SelectItem value="zh-Hant">繁體中文 (zh-Hant)</SelectItem>
                              <SelectItem value="zh-Hans">簡體中文 (zh-Hans)</SelectItem>
                              <SelectItem value="ja">日文 (ja)</SelectItem>
                              <SelectItem value="en">英文 (en)</SelectItem>
                              <SelectItem value="ko">韓文 (ko)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="neutral"
                          size="icon"
                          className="shrink-0 h-10 w-10 text-red-500 hover:bg-red-500 hover:text-white shadow-none"
                          onClick={() => {
                            const newKeywords = [...(currentMV.keywords || [])];
                            newKeywords.splice(idx, 1);
                            updateField('keywords', newKeywords);
                          }}
                        >
                          <i className="hn hn-trash text-base" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="neutral"
                      size="sm"
                      className="w-full mt-2 border-dashed border-2 bg-white shadow-none hover:bg-black/5"
                      onClick={() => {
                        const newKeywords = [...(currentMV.keywords || []), { text: '', lang: 'zh-Hant' }];
                        updateField('keywords', newKeywords);
                      }}
                    >
                      <i className="hn hn-plus mr-2" /> 新增關鍵字
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase flex items-start gap-2">
                    <i className="hn hn-image text-base mr-2" />
                    <span className="flex flex-col leading-tight">
                      <span className="opacity-70">封面圖片（輪播，每行一個網址）</span>
                      <span className="text-[10px] font-mono opacity-40 normal-case">Cover Images</span>
                    </span>
                  </label>
                  <Textarea 
                    value={currentMV.coverImages?.join('\n')} 
                    onChange={(e) => updateField('coverImages', e.target.value.split('\n').map(s => s.trim()).filter(s => s !== ''))} 
                    className={`min-h-[100px] font-sans text-sm ${getErrorClass(currentMV.coverImages)}`}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase flex flex-col leading-tight">
                    <span className="opacity-70">畫師 / 動畫師（每行一個項目）</span>
                    <span className="text-[10px] font-mono opacity-40 normal-case">Artist / Animator</span>
                  </label>
                  <Textarea 
                    value={currentMV.artist?.join('\n')} 
                    onChange={(e) => updateField('artist', e.target.value.split('\n').map(s => s.trim()).filter(s => s !== ''))} 
                    className={`min-h-[50px] font-sans text-sm ${getErrorClass(currentMV.artist)}`}
                  />
                </div>
              </div>
            </section>
            </div>

            {/* 設定圖管理 (瀑布流數據源) */}
            <div className={activeSection !== 'images' ? 'hidden' : ''}>
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">03 設定圖庫</h3>
                    <span className="text-[10px] font-bold opacity-40 font-mono normal-case ml-2">03_Setting_Images_Gallery</span>
                  </div>
                  <span className="text-[10px] font-bold ml-2 flex flex-col leading-tight">
                    <span className="opacity-60">總數：{currentMV.images?.length || 0}</span>
                    <span className="font-mono opacity-30 normal-case">TOTAL_COUNT</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  {isSelectionMode && selectedImageIndices.size > 0 && (
                    <Button 
                      variant="neutral" 
                      size="sm" 
                      className="bg-blue-500 text-white hover:bg-blue-600 border-2 border-black"
                      onClick={() => {
                        const groupId = `group-${Date.now()}`;
                        const targetId = currentMV.id;
                        const newImages = [...(currentMV.images || [])];
                        selectedImageIndices.forEach(idx => {
                          newImages[idx] = { ...newImages[idx], groupId };
                          markFieldChanged(targetId, `images.${idx}.groupId`);
                        });
                        setData(prevData => prevData.map(mv => mv.id === targetId ? { ...mv, images: newImages } : mv));
                        setSelectedImageIndices(new Set());
                        setIsSelectionMode(false);
                        toast.success(`成功將 ${selectedImageIndices.size} 張圖片分為一組`);
                      }}
                    >
                      <i className="hn hn-link text-base mr-2" /> 設為同組
                    </Button>
                  )}
                  <Button 
                    variant={isSelectionMode ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedImageIndices(new Set());
                    }}
                  >
                    <i className="hn hn-check-square text-base mr-2" /> {isSelectionMode ? '取消選擇' : '手動分組'}
                  </Button>
                  <Button 
                    variant="neutral" 
                    size="sm" 
                    onClick={() => handleBatchProbe()} 
                    disabled={!!batchStatus && batchStatus.current < batchStatus.total}
                    className="bg-ztmy-green/10"
                  >
                    <i className="hn hn-play text-base mr-2" /> 一鍵獲取尺寸
                  </Button>
                  <Button variant="neutral" size="sm" onClick={addImage}>
                    <i className="hn hn-image text-base mr-2" /> 增加圖片
                  </Button>
                </div>
              </div>

              {/* 批處理進度條 */}
              {batchStatus && (
                <div className="border-4 border-black p-4 bg-secondary-background shadow-neo-sm space-y-3">
                  <div className="flex justify-between items-center text-xs font-black uppercase">
                    <div className="flex items-center gap-2">
                      <i className={`hn hn-refresh text-base mr-2 ${batchStatus.current < batchStatus.total ? 'animate-spin' : ''}`} />
                      <span className="flex flex-col leading-tight">
                        <span className="opacity-70">偵測進度：{batchStatus.current} / {batchStatus.total}</span>
                        <span className="text-[10px] font-mono opacity-40 normal-case">PROBING_PROGRESS</span>
                      </span>
                    </div>
                    {batchStatus.failedIndices.length > 0 && (
                      <div className="text-red-500 flex items-center gap-2">
                        <i className="hn hn-exclamation-triangle text-base mr-2" />
                        <span className="flex flex-col leading-tight">
                          <span className="opacity-90">失敗：{batchStatus.failedIndices.length}</span>
                          <span className="text-[10px] font-mono opacity-60 normal-case">FAILED</span>
                        </span>
                        <button 
                          onClick={() => handleBatchProbe(batchStatus.failedIndices)}
                          className="underline hover:text-black transition-colors ml-2"
                        >
                          <span className="flex flex-col leading-tight">
                            <span>重試失敗項目</span>
                            <span className="text-[10px] font-mono opacity-60 no-underline normal-case">[RETRY_FAILED]</span>
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                  <Progress 
                    value={(batchStatus.current / batchStatus.total) * 100} 
                    className="h-4 border-2 border-black"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {visibleImages.map((img, imgIdx) => {
                    const isVideo = img.url?.match(/\.(mp4|webm)$/i) || img.url?.includes('video.twimg.com') || (img.thumbnail && img.thumbnail !== img.url);
                    return (
                      <div
                        key={imgIdx}
                        draggable={draggableIdx === imgIdx}
                        onDragStart={(e) => handleDragStart(e, imgIdx)}
                        onDragOver={(e) => handleDragOver(e, imgIdx)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, imgIdx)}
                        onMouseEnter={() => img.groupId && setHoveredGroupId(img.groupId)}
                        onMouseLeave={() => img.groupId && setHoveredGroupId(null)}
                        className={`group relative flex flex-col border-4 transition-all duration-200 bg-card ${
                          draggedImageIdx === imgIdx ? 'opacity-50 scale-[0.98] z-50 border-dashed border-black/30' : 'hover:-translate-y-1 hover:shadow-neo-sm'
                        } ${dragOverImageIdx === imgIdx ? 'border-dashed border-blue-500 bg-blue-50/50' : ''} ${
                          hoveredGroupId && img.groupId === hoveredGroupId ? 'ring-4 ring-offset-2 z-20 scale-[1.02]' : ''
                        }`}
                        style={{
                          borderColor: img.groupId ? `hsl(${Array.from(img.groupId).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 50%)` : 'black',
                          ringColor: img.groupId ? `hsl(${Array.from(img.groupId).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 50%)` : undefined
                        }}
                      >
                        {/* 拖曳把手 */}
                        {!isSelectionMode && (
                          <div
                            className="absolute top-1 left-1 bg-white/90 backdrop-blur border-2 border-black p-1 rounded cursor-grab active:cursor-grabbing text-black opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-white flex items-center justify-center"
                            onMouseEnter={() => setDraggableIdx(imgIdx)}
                            onMouseLeave={() => setDraggableIdx(null)}
                            title="拖曳排序"
                          >
                            <i className="hn hn-list text-sm" />
                          </div>
                        )}
                        
                        {/* 刪除按鈕 */}
                        {!isSelectionMode && (
                          <button
                            onClick={() => removeImage(imgIdx)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border-2 border-black z-10 hover:bg-red-600"
                            title="刪除圖片"
                          >
                            <i className="hn hn-trash text-sm" />
                          </button>
                        )}

                        {/* 編輯按鈕 (置中顯示) */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-0 pointer-events-none">
                          <button
                            onClick={() => setEditingImageIdx(imgIdx)}
                            className="pointer-events-auto bg-black text-white font-bold text-xs px-3 py-1.5 rounded-full border-2 border-white/20 shadow-lg flex items-center gap-1 hover:bg-ztmy-green hover:text-black hover:border-black transition-colors"
                          >
                            <i className="hn hn-edit text-sm" />
                            編輯
                          </button>
                        </div>

                        {/* 縮圖區域 */}
                        <div className="aspect-square bg-black/5 border-b-4 border-black/10 flex items-center justify-center overflow-hidden relative cursor-pointer group/thumb" onClick={() => !isSelectionMode && setEditingImageIdx(imgIdx)} style={{ borderBottomColor: img.groupId ? `hsl(${Array.from(img.groupId).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 50%)` : undefined }}>
                          {isSelectionMode && (
                            <div 
                              className={`absolute inset-0 z-20 flex items-start justify-start p-2 transition-all ${selectedImageIndices.has(imgIdx) ? 'bg-blue-500/20' : 'hover:bg-black/10'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const newSet = new Set(selectedImageIndices);
                                if (newSet.has(imgIdx)) newSet.delete(imgIdx);
                                else newSet.add(imgIdx);
                                setSelectedImageIndices(newSet);
                              }}
                            >
                              <div className={`w-6 h-6 border-2 border-black rounded flex items-center justify-center bg-white ${selectedImageIndices.has(imgIdx) ? 'text-blue-600' : 'text-transparent'}`}>
                                <i className="hn hn-check font-black" />
                              </div>
                            </div>
                          )}
                          
                        {/* 顯示群組色塊邊框指示 (讓同一組的圖片有相同顏色或特徵) */}
                          {img.groupId && (
                            <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full pointer-events-none z-10 opacity-70" 
                                 style={{ backgroundColor: `hsl(${Array.from(img.groupId).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 50%)` }}>
                            </div>
                          )}
                          {img.url ? (
                            <>
                              <img src={getProxyImgUrl(img.thumbnail || img.url, 'thumb')} className="w-full h-full object-cover" alt="預覽" />
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                  <div className="bg-black/80 text-white rounded-full p-2 border-2 border-white/20">
                                    <i className="hn hn-play text-xl ml-0.5" />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] flex flex-col items-center leading-tight opacity-40">
                              <i className="hn hn-image text-2xl mb-1" />
                              無圖片
                            </span>
                          )}
                        </div>

                        {/* 狀態資訊列 */}
                        <div className="p-2 text-[10px] flex flex-col gap-1 bg-secondary text-secondary-foreground relative">
                          {img.groupId && (
                            <div 
                              className="absolute -top-3 -right-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm shadow-sm flex items-center gap-1 z-10"
                              title={`已分組: ${img.groupId}`}
                              style={{ backgroundColor: `hsl(${Array.from(img.groupId).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 40%)` }}
                            >
                              <i className="hn hn-link text-[8px] shrink-0" /> 
                              Group {getGroupLetter(img.groupId, currentMV.images)}
                            </div>
                          )}
                          <div className="flex justify-between items-center font-mono">
                            <span className={`font-bold ${!img.width || !img.height ? 'text-red-500' : 'opacity-60'}`}>
                              {img.width && img.height ? `${img.width}x${img.height}` : '⚠️ 無尺寸'}
                            </span>
                            <button
                              onClick={() => handleProbe(imgIdx, img.url)}
                              className="text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="自動偵測尺寸"
                            >
                              <i className="hn hn-expand" />
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="truncate opacity-50 font-mono flex-1" title={img.url}>
                              {img.url ? (() => {
                                try { return new URL(img.url).pathname.split('/').pop() } catch { return '無效網址' }
                              })() : '未設定 URL'}
                            </span>
                            {img.tweetUrl && (
                              <a href={img.tweetUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 ml-1 flex-shrink-0" title="開啟原始推文" onClick={e => e.stopPropagation()}>
                                <i className="hn hn-twitter" />
                              </a>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {img.caption && <i className="hn hn-comment text-green-600" title="包含說明文字" />}
                            {img.richText && <i className="hn hn-align-left text-blue-600" title="包含富文本" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* 圖片編輯彈窗 */}
                <Dialog open={editingImageIdx !== null} onOpenChange={(open) => !open && setEditingImageIdx(null)}>
                  <DialogContent className="max-w-[95vw] w-full border-4 border-black shadow-neo p-0 overflow-hidden bg-card text-card-foreground h-[95vh]">
                    {editingImageIdx !== null && currentMV.images && currentMV.images[editingImageIdx] && (
                        <div className="flex flex-col h-full">
                        <DialogHeader className="p-4 bg-ztmy-green border-b-4 border-black flex-shrink-0 text-black">
                          <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
                            <i className="hn hn-image text-xl" /> 編輯圖片資訊 (索引: {editingImageIdx})
                          </DialogTitle>
                          <DialogDescription className="text-black font-bold opacity-80 text-xs">
                            設定圖片的 URL、尺寸、說明與富文本內容
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-secondary-background space-y-6">
                          {currentMV.images[editingImageIdx].groupId && (
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 text-sm text-blue-700 flex items-start gap-2 rounded shadow-sm">
                                <i className="hn hn-info-circle text-lg mt-0.5" />
                                <div>
                                  <p className="font-bold">此圖片已分組 (Group {getGroupLetter(currentMV.images[editingImageIdx].groupId, currentMV.images)})</p>
                                  <p className="opacity-80">修改下方表單的「推文連結」、「富文本」與「自訂欄位」，將自動同步至同群組的其他圖片。「說明文字」與「替代文字」則單獨保存。</p>
                                </div>
                              </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 左側：預覽與尺寸 */}
                            <div className="space-y-4">
                              <div className="aspect-square bg-black/5 border-2 border-dashed border-black/20 flex items-center justify-center overflow-hidden relative rounded">
                                {currentMV.images[editingImageIdx].url ? (
                                  <>
                                    <img src={getProxyImgUrl(currentMV.images[editingImageIdx].thumbnail || currentMV.images[editingImageIdx].url, 'thumb')} className="w-full h-full object-contain" alt="預覽" />
                                    {(currentMV.images[editingImageIdx].url?.match(/\.(mp4|webm)$/i) || currentMV.images[editingImageIdx].url?.includes('video.twimg.com') || (currentMV.images[editingImageIdx].thumbnail && currentMV.images[editingImageIdx].thumbnail !== currentMV.images[editingImageIdx].url)) && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                        <div className="bg-black/80 text-white rounded-full p-2 border-2 border-white/20">
                                          <i className="hn hn-play text-2xl ml-1" />
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs font-bold opacity-40 uppercase">No Preview</span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold opacity-60 uppercase">Width (寬)</label>
                                  <Input 
                                    type="number" 
                                    value={currentMV.images[editingImageIdx].width || ''} 
                                    onChange={(e) => updateImage(editingImageIdx, 'width', parseInt(e.target.value))} 
                                    className={`h-8 text-sm ${!currentMV.images[editingImageIdx].width ? 'border-red-500 bg-red-50' : ''}`} 
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold opacity-60 uppercase">Height (高)</label>
                                  <Input 
                                    type="number" 
                                    value={currentMV.images[editingImageIdx].height || ''} 
                                    onChange={(e) => updateImage(editingImageIdx, 'height', parseInt(e.target.value))} 
                                    className={`h-8 text-sm ${!currentMV.images[editingImageIdx].height ? 'border-red-500 bg-red-50' : ''}`} 
                                  />
                                </div>
                              </div>
                              
                              <Button 
                                variant="outline" 
                                className="w-full border-2 border-black hover:bg-black hover:text-white transition-colors"
                                onClick={() => handleProbe(editingImageIdx, currentMV.images![editingImageIdx].url)}
                              >
                                <i className="hn hn-expand mr-2" /> 自動偵測尺寸 / 解析推文
                              </Button>
                            </div>
                            
                            {/* 右側：表單 */}
                            <div className="md:col-span-2 space-y-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold opacity-60 uppercase flex justify-between">
                                  <span>圖片 URL 或 推文連結</span>
                                  {currentMV.images[editingImageIdx].tweetUrl && (
                                    <span className="text-blue-600 truncate max-w-[200px]" title={currentMV.images[editingImageIdx].tweetUrl}>
                                      已解析: <a href={currentMV.images[editingImageIdx].tweetUrl} target="_blank" rel="noreferrer" className="underline">{currentMV.images[editingImageIdx].tweetUrl}</a>
                                    </span>
                                  )}
                                </label>
                                <Input 
                                  placeholder="https://..." 
                                  value={currentMV.images[editingImageIdx].url} 
                                  onChange={(e) => updateImage(editingImageIdx, 'url', e.target.value)} 
                                  className={`${!currentMV.images[editingImageIdx].url?.trim() ? 'border-red-500 bg-red-50' : ''}`} 
                                />
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold opacity-60 uppercase">原始推文連結 (自動解析來源)</label>
                                <Input 
                                  placeholder="https://x.com/..." 
                                  value={currentMV.images[editingImageIdx].tweetUrl || ''} 
                                  onChange={(e) => updateImage(editingImageIdx, 'tweetUrl', e.target.value)} 
                                />
                              </div>
                              
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold opacity-60 uppercase">說明文字 (Caption)</label>
                                  <Input 
                                    placeholder="可選填，此項不會同步至群組" 
                                    value={currentMV.images[editingImageIdx].caption || ''} 
                                    onChange={(e) => updateImage(editingImageIdx, 'caption', e.target.value)} 
                                  />
                                </div>
                                
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold opacity-60 uppercase">替代文字 (Alt)</label>
                                  <Input 
                                    placeholder="可選填，此項不會同步至群組" 
                                    value={currentMV.images[editingImageIdx].alt || ''} 
                                    onChange={(e) => updateImage(editingImageIdx, 'alt', e.target.value)} 
                                  />
                                </div>
                              
                              <div className="space-y-1 pt-2">
                                <RichTextEditor
                                  value={currentMV.images[editingImageIdx].richText || ''}
                                  onChange={(value) => updateImage(editingImageIdx, 'richText', value)}
                                />
                              </div>
                              {/* 動態渲染擴充欄位 */}
                              {Object.keys(currentMV.images[editingImageIdx]).filter(key => !['url', 'thumbnail', 'caption', 'alt', 'richText', 'width', 'height', 'tweetUrl', 'groupId'].includes(key)).map(key => {
                                const isTweetField = ['tweetText', 'tweetAuthor', 'tweetHandle', 'tweetDate'].includes(key);
                                return (
                                <div className="space-y-1" key={key}>
                                  <label className="text-[10px] font-bold opacity-60 uppercase flex justify-between">
                                    <span>{key} {isTweetField ? '(推文資訊)' : '(自訂欄位)'}</span>
                                    {!isTweetField && (
                                      <button 
                                        onClick={() => {
                                          const newImages = [...currentMV.images!];
                                          delete newImages[editingImageIdx][key];
                                          setData(prevData => prevData.map(mv => mv.id === currentMV.id ? { ...mv, images: newImages } : mv));
                                          markFieldChanged(currentMV.id, `images.${editingImageIdx}`);
                                        }}
                                        className="text-red-500 hover:text-red-700"
                                        title="刪除此欄位"
                                      >
                                        <i className="hn hn-times" />
                                      </button>
                                    )}
                                  </label>
                                  {key === 'tweetText' ? (
                                    <Textarea 
                                      value={currentMV.images![editingImageIdx][key] || ''} 
                                      onChange={(e) => updateImage(editingImageIdx, key, e.target.value)}
                                      className="min-h-[80px] text-xs" 
                                    />
                                  ) : (
                                    <Input 
                                      value={currentMV.images![editingImageIdx][key] || ''} 
                                      onChange={(e) => updateImage(editingImageIdx, key, e.target.value)} 
                                    />
                                  )}
                                </div>
                              )})}
                              
                              <div className="pt-2 border-t-2 border-dashed border-black/10">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full text-xs border-dashed"
                                  onClick={() => {
                                    const fieldName = window.prompt('請輸入新欄位的名稱 (英文)');
                                    if (fieldName && fieldName.trim()) {
                                      updateImage(editingImageIdx, fieldName.trim(), '');
                                    }
                                  }}
                                >
                                  <i className="hn hn-plus mr-2" /> 新增自訂欄位
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <DialogFooter className="p-4 bg-secondary border-t-4 border-black flex-shrink-0 flex justify-between items-center">
                          <div className="flex gap-2">
                            <Button variant="neutral" onClick={() => removeImage(editingImageIdx)} className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white border-red-200">
                              <i className="hn hn-trash mr-2" /> 刪除此圖片
                            </Button>
                            <Button variant="outline" onClick={handleCleanEmptyCustomFields} className="border-dashed text-black/60 hover:text-black">
                              <i className="hn hn-refresh mr-2" /> 清理空值欄位
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setEditingImageIdx(null)}>
                              關閉
                            </Button>
                            <Button 
                              className="bg-black text-white hover:bg-ztmy-green hover:text-black"
                              onClick={() => {
                                // Save is auto, just close
                                setEditingImageIdx(null);
                              }}
                            >
                              完成編輯
                            </Button>
                          </div>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                
                {/* 圖片列表分段載入哨兵 */}
                {imageDisplayLimit < (currentMV.images?.length || 0) && (
                  <div ref={imageSentinelRef} className="py-8 flex justify-center border-4 border-dashed border-black/10 bg-black/5">
                    <div className="flex items-start gap-3 text-xs font-black uppercase">
                      <i className="hn hn-refresh text-base animate-spin" />
                      <span className="flex flex-col leading-tight">
                        <span className="opacity-60">載入更多圖片編輯欄位...</span>
                        <span className="text-[10px] font-mono opacity-40 normal-case">Loading_More_Image_Editor_Fields...</span>
                      </span>
                    </div>
                  </div>
                )}

                {(!currentMV.images || currentMV.images.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-black/10 text-xs italic uppercase">
                    <div className="flex flex-col items-center leading-tight">
                      <div className="opacity-60">找不到圖庫資料</div>
                      <div className="text-[10px] font-mono opacity-40 normal-case">No_Gallery_Data_Found</div>
                    </div>
                  </div>
                )}
                
                {/* 底部的新增圖片按鈕 */}
                <div className="pt-4 border-t-4 border-black/10 flex gap-4">
                  <Button 
                    variant="default" 
                    className="flex-1 h-16 bg-black text-white hover:bg-ztmy-green hover:text-black font-black uppercase tracking-widest text-lg shadow-neo transition-all"
                    onClick={addImage}
                  >
                    <i className="hn hn-image text-2xl mr-3" /> 新增單張圖片
                  </Button>
                  <Button 
                    variant="default" 
                    className="flex-1 h-16 bg-blue-600 text-white hover:bg-blue-400 hover:text-black font-black uppercase tracking-widest text-lg shadow-neo transition-all"
                    onClick={() => setIsBatchAddOpen(true)}
                  >
                    <i className="hn hn-twitter text-2xl mr-3" /> 批量推文解析
                  </Button>
                </div>
                <p className="text-center text-xs font-bold opacity-50 mt-2">
                  Tip: 點擊「批量推文解析」可一次貼上多行 Twitter 網址，並自動分為同一個群組
                </p>
              </div>
            </section>
            </div>
                        {/* 數據架構維護工具 (Schema Maintenance) */}
            <div className={activeSection !== 'schema' ? 'hidden' : ''}>
            <section className="p-6 border-4 border-dashed border-black bg-main/5 space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black uppercase text-white bg-black px-2">00 資料架構維護</h3>
                  <span className="text-[10px] font-bold opacity-50 text-black font-mono normal-case ml-2">00_Schema_Maintenance</span>
                </div>
                <span className="text-[10px] font-bold opacity-50 text-black">自動為前端表單擴充新欄位</span>
              </div>
              <p className="text-xs font-bold text-black/70 mb-2">
                提示：後端資料庫已支援自動擴充，此處操作僅用於在前端編輯器中為所有 MV 條目預設一個空值，以方便你進行編輯。
                如果需要新增資料庫實體欄位，請前往 <code>backend/src/services/db.service.ts</code> 的 <code>expectedColumns</code> 陣列中新增。
              </p>
              <div className="flex flex-wrap md:flex-nowrap gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase flex flex-col leading-tight">
                    <span className="opacity-70">新欄位鍵名（例如：director）</span>
                    <span className="font-mono opacity-50 normal-case">New_Field_Key</span>
                  </label>
                  <Input 
                    value={newFieldName} 
                    onChange={(e) => setNewFieldName(e.target.value)} 
                    placeholder="欄位鍵名" 
                    className="bg-white"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase flex flex-col leading-tight">
                    <span className="opacity-70">預設值</span>
                    <span className="font-mono opacity-50 normal-case">Default_Value</span>
                  </label>
                  <Input 
                    value={newFieldDefaultValue} 
                    onChange={(e) => setNewFieldDefaultValue(e.target.value)} 
                    placeholder="默認值" 
                    className="bg-white"
                  />
                </div>
                <Button variant="default" onClick={handleSyncNewField} className="bg-black text-white shrink-0">
                  <i className="hn hn-refresh text-base" /> 執行全局同步
                </Button>
              </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* 批量推文解析 Dialog */}
      <Dialog open={isBatchAddOpen} onOpenChange={(open) => !batchAddStatus?.isProcessing && setIsBatchAddOpen(open)}>
        <DialogContent className="max-w-2xl border-4 border-black shadow-neo p-0 overflow-hidden bg-card text-card-foreground">
          <DialogHeader className="p-6 bg-blue-600 text-white border-b-4 border-black">
            <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
              <i className="hn hn-twitter text-2xl" /> 批量推文解析
            </DialogTitle>
            <DialogDescription className="text-white/80 font-mono text-xs mt-2">
              貼上多行 Twitter 網址，系統將自動解析並將每個推文中的媒體分為同一組。
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <Textarea
              placeholder="https://x.com/...&#10;https://x.com/..."
              value={batchTweetUrls}
              onChange={(e) => setBatchTweetUrls(e.target.value)}
              disabled={batchAddStatus?.isProcessing}
              className="min-h-[200px] font-mono text-sm"
            />
            {batchAddStatus && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span>處理進度: {batchAddStatus.current} / {batchAddStatus.total}</span>
                  {batchAddStatus.failedUrls.length > 0 && (
                    <span className="text-red-500">失敗: {batchAddStatus.failedUrls.length}</span>
                  )}
                </div>
                <Progress value={(batchAddStatus.current / batchAddStatus.total) * 100} className="h-2 border-2 border-black" />
                {batchAddStatus.failedUrls.length > 0 && !batchAddStatus.isProcessing && (
                  <div className="text-xs text-red-500 mt-2 max-h-20 overflow-y-auto border border-red-200 p-2">
                    <p className="font-bold">以下網址解析失敗：</p>
                    {batchAddStatus.failedUrls.map((u, i) => <div key={i}>{u}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="p-4 bg-secondary border-t-4 border-black flex gap-2">
            <Button variant="outline" onClick={() => setIsBatchAddOpen(false)} disabled={batchAddStatus?.isProcessing}>
              取消
            </Button>
            <Button 
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => handleBatchAddTweets()}
              disabled={!batchTweetUrls.trim() || batchAddStatus?.isProcessing}
            >
              {batchAddStatus?.isProcessing ? (
                <><i className="hn hn-refresh animate-spin mr-2" /> 處理中...</>
              ) : '開始解析'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 保存確認 AlertDialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase flex items-center gap-2">
              <i className="hn hn-question-circle text-2xl" /> 確認儲存變更
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-bold opacity-80">
              即將把當前所有變更回寫至服務器資料庫 (SQLite)，請確認操作！
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} className="bg-black text-white hover:bg-ztmy-green hover:text-black">確定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 刪除確認 AlertDialog */}
      <AlertDialog open={deleteDrawerOpen} onOpenChange={setDeleteDrawerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase flex items-center gap-2 text-red-500">
              <i className="hn hn-exclamation-triangle text-2xl" /> {pendingDeleteMV ? '刪除 MV 條目' : '刪除圖片'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-bold opacity-80">
              {pendingDeleteMV 
                ? `即將刪除「${pendingDeleteMV.title}」，${!originalDataRef.current.find(item => item.id === pendingDeleteMV.id) ? '此為新條目，將直接移除。' : '請確認操作！'}`
                : `即將刪除圖片 ${(pendingDeleteImageIdx ?? 0) + 1}，請確認操作！`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDrawerOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={pendingDeleteMV ? confirmDeleteMV : confirmDeleteImage}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              確定刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Metadata 全局設定 Dialog */}
      <Dialog open={isMetadataDialogOpen} onOpenChange={setIsMetadataDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 border-4 border-black rounded-none shadow-neo overflow-hidden">
          <DialogHeader className="p-6 bg-black text-white border-b-4 border-black">
            <DialogTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
              <i className="hn hn-disc text-xl" /> 全局設定 (Metadata)
            </DialogTitle>
            <DialogDescription className="text-white/70 font-mono text-xs">
              手動維護專輯的發布年份與畫師 ID 等全局變數。這會影響首頁篩選器的顯示。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-background space-y-8 font-mono">

            <div className="flex flex-col gap-3 border-2 border-black p-3 bg-yellow-500/20">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="text-xs font-black tracking-widest text-yellow-600">系統維護模式</div>
                  <div className="text-[10px] font-bold opacity-40 font-mono normal-case">Maintenance Mode</div>
                  <div className="text-[10px] font-bold opacity-60">開啟後所有訪客將看到維護頁面</div>
                </div>
                <Switch
                  checked={localMaintenance}
                  onCheckedChange={(checked) => setLocalMaintenance(checked)}
                />
              </div>
              
              {localMaintenance && (
                <div className="flex flex-col gap-3 pt-3 border-t-2 border-yellow-500/30">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                      <div className="text-xs font-black tracking-widest text-yellow-600">維護類型</div>
                      <div className="text-[10px] font-bold opacity-40 font-mono normal-case">Maintenance Type</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="maintenanceType"
                          value="ui"
                          checked={localMaintenanceType === 'ui'}
                          onChange={() => setLocalMaintenanceType('ui')}
                          className="accent-yellow-500"
                        />
                        <span className="text-xs font-bold text-yellow-600">介面升級 (UI Upgrade)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="maintenanceType"
                          value="data"
                          checked={localMaintenanceType === 'data'}
                          onChange={() => setLocalMaintenanceType('data')}
                          className="accent-yellow-500"
                        />
                        <span className="text-xs font-bold text-yellow-600">數據維護 (Data Maintenance)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex flex-col">
                      <div className="text-xs font-black tracking-widest text-yellow-600">預估恢復時間 (選填)</div>
                      <div className="text-[10px] font-bold opacity-40 font-mono normal-case">Estimated Time to Recovery</div>
                    </div>
                    <Input 
                      type="datetime-local" 
                      value={localMaintenanceEta} 
                      onChange={(e) => setLocalMaintenanceEta(e.target.value)} 
                      className="font-mono text-sm bg-background border-2 border-black focus-visible:ring-black h-8"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-2 border-black p-3 bg-card">
              <div className="flex flex-col">
                <div className="text-xs font-black tracking-widest">自動推算專輯日期</div>
                <div className="text-[10px] font-bold opacity-40 font-mono normal-case">Auto Album Date</div>
                <div className="text-[10px] font-bold opacity-60">未設定專輯發布日期時，是否顯示自動推算值</div>
              </div>
              <Switch
                checked={!!localMetadata.settings?.showAutoAlbumDate}
                onCheckedChange={(checked) => {
                  setLocalMetadata((prev) => ({
                    ...prev,
                    settings: { ...(prev.settings || { showAutoAlbumDate: false }), showAutoAlbumDate: checked },
                  }));
                }}
              />
            </div>
            
            {/* 首頁跑馬燈公告 */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-black uppercase bg-main text-main-foreground px-2 py-1">00 公告</h3>
                    <span className="text-[10px] font-bold opacity-50 font-mono normal-case ml-2">00_Announcements</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-50">首頁跑馬燈公告維護</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-2 border-black p-4 bg-card">
                <div className="text-xs font-bold opacity-60">
                  請輸入跑馬燈公告內容，每行一則公告。若為空則不顯示跑馬燈。
                </div>
                <Textarea 
                  value={(localMetadata.settings?.announcements || []).join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    setLocalMetadata(prev => ({
                      ...prev,
                      settings: { 
                        ...(prev.settings || { showAutoAlbumDate: false }), 
                        announcements: lines 
                      }
                    }));
                  }}
                  placeholder="例如：
【最新】ZUTOMAYO 新專輯發布！
網站功能更新公告..."
                  className="w-full min-h-[120px] text-sm font-bold border-2 border-black/20 bg-black/5"
                />
              </div>
            </section>
            
            <section className="space-y-4">
              <div className="flex items-start gap-2 border-b-2 border-black pb-2">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black uppercase bg-main text-main-foreground px-2 py-1">01 專輯日期</h3>
                  <span className="text-[10px] font-bold opacity-50 font-mono normal-case ml-2">01_Album_Dates</span>
                </div>
                <span className="text-[10px] font-bold opacity-50">手動覆蓋專輯發布日期</span>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase opacity-50">現有專輯</div>
                <div className="max-h-40 overflow-y-auto border-2 border-black/10 bg-black/5 p-2">
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(availableAlbums)).filter(a => typeof a === 'string').sort((a, b) => a.localeCompare(b)).map((album) => (
                      <Button
                        key={album}
                        variant="neutral"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-bold bg-white"
                        onClick={() => {
                          setLocalMetadata((prev) => {
                            if (Object.prototype.hasOwnProperty.call(prev.albumMeta || {}, album)) return prev;
                            return {
                              ...prev,
                              albumMeta: {
                                ...(prev.albumMeta || {}),
                                [album]: { date: albumDefaultDateMap[album] || "", hideDate: false },
                              },
                            };
                          });
                        }}
                      >
                        <span className="truncate max-w-[180px]">{album}</span>
                        <span className="ml-2 font-mono opacity-60 shrink-0">
                          {albumDefaultDateMap[album] || "--"}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(localMetadata.albumMeta || {}).map(([album, meta], idx) => (
                  <div key={idx} className="flex items-center gap-2 border-2 border-black p-2 bg-card">
                    <Input 
                      value={album} 
                      onChange={(e) => {
                        const newKey = e.target.value;
                        setLocalMetadata(prev => {
                          const newAlbumMeta = { ...prev.albumMeta };
                          const oldVal = newAlbumMeta[album];
                          delete newAlbumMeta[album];
                          newAlbumMeta[newKey] = oldVal;
                          return { ...prev, albumMeta: newAlbumMeta };
                        });
                      }} 
                      placeholder="專輯名稱" 
                      className="flex-1 h-8 text-xs font-bold border-none bg-black/5"
                    />
                    <Input 
                      value={meta?.date || ""} 
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setLocalMetadata(prev => ({
                          ...prev,
                          albumMeta: { ...prev.albumMeta, [album]: { ...(prev.albumMeta?.[album] || {}), date: newVal } }
                        }));
                      }} 
                      placeholder="日期 (可空)" 
                      className="w-24 h-8 text-xs font-mono text-center"
                    />
                    <Switch
                      checked={!!meta?.hideDate}
                      onCheckedChange={(checked) => {
                        setLocalMetadata((prev) => ({
                          ...prev,
                          albumMeta: { ...prev.albumMeta, [album]: { ...(prev.albumMeta?.[album] || {}), hideDate: checked } },
                        }));
                      }}
                    />
                    <Button 
                      variant="neutral" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:bg-red-500 hover:text-white"
                      onClick={() => {
                        setLocalMetadata(prev => {
                          const newAlbumMeta = { ...prev.albumMeta };
                          delete newAlbumMeta[album];
                          return { ...prev, albumMeta: newAlbumMeta };
                        });
                      }}
                    >
                      <i className="hn hn-trash text-base" />
                    </Button>
                  </div>
                ))}
                
                <Button 
                  variant="neutral" 
                  className="h-full min-h-[52px] border-2 border-dashed border-black/30 opacity-50 hover:opacity-100 flex items-center justify-center gap-2"
                  onClick={() => {
                    const newKey = `新專輯_${Object.keys(localMetadata.albumMeta || {}).length + 1}`;
                    setLocalMetadata(prev => ({
                      ...prev,
                      albumMeta: { ...prev.albumMeta, [newKey]: { date: new Date().getFullYear().toString(), hideDate: false } }
                    }));
                  }}
                >
                  <i className="hn hn-plus text-base mr-2" /> 新增專輯發布日期
                </Button>
              </div>
            </section>

            {/* 畫師 ID 設定 */}
            <section className="space-y-4">
              <div className="flex items-start gap-2 border-b-2 border-black pb-2">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black uppercase bg-main text-main-foreground px-2 py-1">02 畫師 ID</h3>
                  <span className="text-[10px] font-bold opacity-50 font-mono normal-case ml-2">02_Artist_IDs</span>
                </div>
                <span className="text-[10px] font-bold opacity-50">管理畫師關聯帳號/ID</span>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase opacity-50">現有畫師</div>
                <div className="max-h-40 overflow-y-auto border-2 border-black/10 bg-black/5 p-2">
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(availableArtists)).filter(a => typeof a === 'string').sort((a, b) => a.localeCompare(b)).map((artist) => (
                      <Button
                        key={artist}
                        variant="neutral"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-bold bg-white"
                        onClick={() => {
                          setLocalMetadata((prev) => {
                            if (Object.prototype.hasOwnProperty.call(prev.artistMeta || {}, artist)) return prev;
                            return {
                              ...prev,
                              artistMeta: {
                                ...(prev.artistMeta || {}),
                                [artist]: { id: "", hideId: false },
                              },
                            };
                          });
                        }}
                      >
                        <span className="truncate max-w-[220px]">{artist}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(localMetadata.artistMeta || {}).map(([artist, meta], idx) => (
                  <div key={idx} className="flex items-center gap-2 border-2 border-black p-2 bg-card">
                    <Input 
                      value={artist} 
                      onChange={(e) => {
                        const newKey = e.target.value;
                        setLocalMetadata(prev => {
                          const newArtistMeta = { ...prev.artistMeta };
                          const oldVal = newArtistMeta[artist];
                          delete newArtistMeta[artist];
                          newArtistMeta[newKey] = oldVal;
                          return { ...prev, artistMeta: newArtistMeta };
                        });
                      }} 
                      placeholder="畫師名稱" 
                      className="flex-1 h-8 text-xs font-bold border-none bg-black/5"
                    />
                    <Input 
                      value={meta?.id || ""} 
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setLocalMetadata(prev => ({
                          ...prev,
                          artistMeta: { ...prev.artistMeta, [artist]: { ...(prev.artistMeta?.[artist] || {}), id: newVal } }
                        }));
                      }} 
                      placeholder="社群 ID (Twitter/SNS ID)" 
                      className="flex-1 h-8 text-xs font-mono"
                    />
                    <Switch
                      checked={!!meta?.hideId}
                      onCheckedChange={(checked) => {
                        setLocalMetadata((prev) => ({
                          ...prev,
                          artistMeta: { ...prev.artistMeta, [artist]: { ...(prev.artistMeta?.[artist] || {}), hideId: checked } },
                        }));
                      }}
                    />
                    <Button 
                      variant="neutral" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:bg-red-500 hover:text-white"
                      onClick={() => {
                        setLocalMetadata(prev => {
                          const newArtistMeta = { ...prev.artistMeta };
                          delete newArtistMeta[artist];
                          return { ...prev, artistMeta: newArtistMeta };
                        });
                      }}
                    >
                      <i className="hn hn-trash text-base" />
                    </Button>
                  </div>
                ))}
                
                <Button 
                  variant="neutral" 
                  className="h-full min-h-[52px] border-2 border-dashed border-black/30 opacity-50 hover:opacity-100 flex items-center justify-center gap-2"
                  onClick={() => {
                    const newKey = `新畫師_${Object.keys(localMetadata.artistMeta || {}).length + 1}`;
                    setLocalMetadata(prev => ({
                      ...prev,
                      artistMeta: { ...prev.artistMeta, [newKey]: { id: "", hideId: false } }
                    }));
                  }}
                >
                  <i className="hn hn-plus text-base mr-2" /> 新增畫師 ID
                </Button>
              </div>
            </section>

            {/* Passkeys 設定 */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-black uppercase bg-main text-main-foreground px-2 py-1">03 登入裝置（Passkey）</h3>
                    <span className="text-[10px] font-bold opacity-50 font-mono normal-case ml-2">03_Passkeys</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-50">生物辨識 / 設備登入管理</span>
                </div>
                <Button variant="neutral" size="sm" className="h-7 px-2 text-[10px] font-bold bg-ztmy-green border-2 border-black text-black hover:bg-ztmy-green/80" onClick={handleRegisterPasskey}>
                  <i className="hn hn-plus text-base mr-2" /> 註冊新設備 (Passkey)
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {passkeys.length === 0 && (
                  <div className="col-span-full p-4 border-2 border-dashed border-black/30 text-center opacity-50 text-xs">
                    目前沒有註冊任何 Passkey，請點擊右上方按鈕新增。
                  </div>
                )}
                {passkeys.map((pk) => (
                  <div key={pk.id} className="flex flex-col gap-1 border-2 border-black p-3 bg-card relative">
                    <div className="font-bold text-sm flex items-center gap-2">
                      <i className="hn hn-user text-base mr-2" /> {pk.name || '未命名設備 (Unnamed Device)'}
                    </div>
                    <div className="text-[10px] opacity-60 font-mono">ID: {pk.id.slice(0, 16)}...</div>
                    <div className="text-[10px] opacity-60 font-mono">建立於: {new Date(pk.createdAt).toLocaleString()}</div>
                    <Button 
                      variant="neutral" 
                      size="icon" 
                      className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:bg-red-500 hover:text-white"
                      onClick={() => handleRemovePasskey(pk.id)}
                    >
                      <i className="hn hn-trash text-base" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

          </div>

          <DialogFooter className="p-4 bg-secondary-background border-t-4 border-black flex gap-4 sm:justify-end">
            <Button 
              variant="neutral" 
              onClick={() => setIsMetadataDialogOpen(false)} 
              className="flex-1 sm:flex-none"
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveMetadata}
              disabled={isSavingMetadata}
              className="flex-1 sm:flex-none bg-black text-white hover:bg-ztmy-green hover:text-black font-bold border-2 border-transparent shadow-neo"
            >
              {isSavingMetadata ? <i className="hn hn-refresh text-base animate-spin mr-2" /> : <i className="hn hn-save text-base mr-2" />}
              保存全局設定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 修改密碼 Dialog */}
      <Dialog open={isChangePwdOpen} onOpenChange={setIsChangePwdOpen}>
        <DialogContent className="max-w-sm flex flex-col p-0 border-4 border-black rounded-none shadow-neo overflow-hidden z-[100]">
          <DialogHeader className="p-6 bg-black text-white border-b-4 border-black">
            <DialogTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
              <i className="hn hn-lock-open text-xl" /> 修改管理密碼
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 bg-background space-y-4 font-mono">
            {!isDefaultPassword && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-red-500">舊密碼 (Current Password)</label>
                <Input
                  type="password"
                  placeholder="請輸入目前的密碼..."
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest">新密碼 (New Password)</label>
              <Input
                type="password"
                placeholder="至少 4 個字元..."
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest">確認新密碼 (Confirm)</label>
              <Input
                type="password"
                placeholder="再次輸入新密碼..."
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-secondary-background border-t-4 border-black flex gap-4 sm:justify-end">
            <Button 
              variant="neutral" 
              onClick={() => setIsChangePwdOpen(false)} 
              className="flex-1 sm:flex-none"
            >
              取消
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={isSavingPwd || newPwd.length < 4 || newPwd !== confirmPwd || (!isDefaultPassword && !oldPwd)}
              className="flex-1 sm:flex-none bg-black text-white hover:bg-ztmy-green hover:text-black font-bold border-2 border-transparent shadow-neo"
            >
              {isSavingPwd ? <i className="hn hn-refresh text-base animate-spin mr-2" /> : <i className="hn hn-save text-base mr-2" />}
              儲存密碼
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 登出確認 Dialog */}
      <AlertDialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
        <AlertDialogContent className="border-4 border-black rounded-none shadow-neo p-0 overflow-hidden max-w-sm">
          <AlertDialogHeader className="p-6 bg-red-500 text-white border-b-4 border-black">
            <AlertDialogTitle className="font-black uppercase tracking-widest flex items-center gap-2">
              <i className="hn hn-logout text-xl" /> 確認登出？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/80 font-mono text-xs mt-2">
              您確定要登出管理員身分嗎？所有未儲存的變更將會遺失。
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

      <div className="h-8 border-t-4 border-black bg-card flex items-center justify-between px-8 text-[10px] font-bold opacity-70 shrink-0 z-40 absolute bottom-0 left-0 right-0 w-full">
        <span>ZTMY.ADMIN.PANEL</span>
        <span>
          FE: {VERSION_CONFIG.app} (🕒 {VERSION_CONFIG.buildDate.replace(/-/g, '')})
          {systemStatus?.version && ` | BE: ${systemStatus.version}`}
          {systemStatus?.buildTime && ` (🕒 ${new Date(systemStatus.buildTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '')})`}
        </span>
      </div>
    </div>
    
    
  );
}
