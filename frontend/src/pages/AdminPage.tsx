import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCustomMutation, useInvalidate, useList } from "@refinedev/core"
import { VERSION_CONFIG } from '@/config/version';
import { toast } from "sonner"
import { adminFetch, getMvsApiBase, getSystemApiBase } from "@/lib/admin-api";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MultiSelect, type Option } from "@/components/ui/multi-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MVItem } from '@/lib/types';
import { getProxyImgUrl, isMediaVideo } from '@/lib/image';
import Editor from '@monaco-editor/react';
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
import { materializeGroupAndStripLegacy } from "@/lib/admin-media"
import { Progress } from '@/components/ui/progress';
import { AdminSplitView, type AdminSplitGroup } from "@/components/admin/AdminSplitView"
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

const mergeEntityOptions = (base: Option[], entities: Array<{ id?: string; name?: string }>) => {
  const seen = new Set(base.map((o) => o.value))
  const out = [...base]
  entities.forEach((e) => {
    const id = e?.id ? String(e.id).trim() : ""
    const name = e?.name ? String(e.name).trim() : ""
    if (!id || !name) return
    if (seen.has(id)) return
    seen.add(id)
    out.push({ label: name, value: id })
  })
  return out
}

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
const saveTemplates = (templates: Template[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
  } catch {
    return false;
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
    if (!saveTemplates(templates)) {
      toast.error('模板保存失敗，請檢查瀏覽器隱私模式或存儲空間');
    }
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
        <DialogContent className="max-w-lg border-2 border-black shadow-[var(--admin-shadow)] rounded-[var(--admin-radius)] p-0 overflow-hidden bg-[var(--admin-panel-bg)] text-foreground">
          <DialogHeader className="p-4 bg-ztmy-green border-b-2 border-black">
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
          
          <DialogFooter className="p-4 bg-[var(--admin-panel-bg)] border-t-2 border-black">
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
        <DialogContent className="max-w-2xl border-2 border-black shadow-[var(--admin-shadow)] rounded-[var(--admin-radius)] p-0 overflow-hidden bg-[var(--admin-panel-bg)] text-foreground">
          <DialogHeader className="p-4 bg-purple-500 border-b-2 border-black">
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

type SystemStatus = { maintenance: boolean; type?: "data" | "ui"; eta?: string | null; buildTime?: string | null; version?: string | null }

export function AdminPage() {
  const invalidate = useInvalidate()
  const mvList = useList<MVItem>({ resource: "mvs", pagination: { current: 1, pageSize: 1000 } })
  const mvUpdateMutation = useCustomMutation()
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)

  const [data, setData] = useState<MVItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [mvQuery, setMvQuery] = useState("");
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
  const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null);

  // 批量新增與分組狀態
  const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);
  const [batchTweetUrls, setBatchTweetUrls] = useState('');
  const [batchAddStatus, setBatchAddStatus] = useState<{ total: number, current: number, failedUrls: string[], isProcessing: boolean } | null>(null);
  const [selectedImageIndices, setSelectedImageIndices] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sourceUrlDialogOpen, setSourceUrlDialogOpen] = useState(false)
  const [sourceUrlDraft, setSourceUrlDraft] = useState("")
  const [sourceUrlTarget, setSourceUrlTarget] = useState<{ mvId: string; indices: number[] } | null>(null)
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false)
  const [customFieldDraft, setCustomFieldDraft] = useState("")
  const [customFieldTarget, setCustomFieldTarget] = useState<number | null>(null)

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
  const [imageTypeTab, setImageTypeTab] = useState<'official' | 'fanart'>('official');
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

  const mvs = useMemo(() => mvList.data?.data || [], [mvList.data])
  const hasUnsavedChanges = useMemo(() => changedFields.size > 0 || deletedIds.size > 0, [changedFields, deletedIds])

  useEffect(() => {
    const run = async () => {
      try {
        const res = await adminFetch(`${getSystemApiBase()}/status`)
        const json = await res.json().catch(() => null)
        if (json && typeof json === "object" && "maintenance" in json) {
          setSystemStatus(json as any)
        }
      } catch {
      }
    }
    run()
  }, [])

  const albumsQuery = useList<any>({ resource: "albums", hasPagination: false })
  const artistsQuery = useList<any>({ resource: "artists", hasPagination: false })

  const albumOptions = useMemo(() => {
    const rows = albumsQuery.data?.data || []
    return rows
      .map((a: any) => ({ label: String(a.name), value: String(a.id) }))
      .filter((o: any) => o.value && o.label)
  }, [albumsQuery.data])

  const artistOptions = useMemo(() => {
    const rows = artistsQuery.data?.data || []
    return rows
      .map((a: any) => ({ label: String(a.name), value: String(a.id) }))
      .filter((o: any) => o.value && o.label)
  }, [artistsQuery.data])

  const albumDefaultDateMap = useMemo(() => {
    const map: Record<string, string> = {};
    mvs.forEach((mv) => {
      if (!mv.date) return;
      mv.albums?.forEach((a: any) => {
        const name = a.name || a;
        if (!map[name] || mv.date < map[name]) map[name] = mv.date.replace(/\//g, '/');
      });
    });
    return map;
  }, [mvs]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pendingJump, setPendingJump] = useState<{ mvId: string; mediaId?: string } | null>(null);

  useEffect(() => {
    const mvId = searchParams.get('mvId') || searchParams.get('mv');
    const mediaId = searchParams.get('mediaId') || searchParams.get('media') || undefined;
    if (!mvId) return;
    setPendingJump({ mvId, mediaId });
  }, [searchParams]);

  useEffect(() => {
    if (hasUnsavedChanges) return;
    if (!mvs || mvs.length === 0) {
      setData([]);
      originalDataRef.current = [];
      setChangedFields(new Map());
      return;
    }
    // 按年份和日期降序排序（最新的排在最前）
    const sortedData = [...mvs].sort((a, b) => {
      const dateA = `${a.year}-${a.date || ''}`;
      const dateB = `${b.year}-${b.date || ''}`;
      return dateB.localeCompare(dateA);
    });
    const cloned = JSON.parse(JSON.stringify(sortedData));
    const hydrated = cloned;
    setData(hydrated);
    originalDataRef.current = JSON.parse(JSON.stringify(hydrated));
    // 重置變動追蹤
    setChangedFields(new Map());
  }, [hasUnsavedChanges, mvs]);

  useEffect(() => {
    if (!pendingJump) return;
    if (!data || data.length === 0) return;
    const idx = data.findIndex((mv) => String((mv as any).id) === pendingJump.mvId);
    if (idx < 0) {
      setPendingJump(null);
      return;
    }
    if (activeIndex !== idx) {
      setActiveIndex(idx);
      return;
    }
    if (pendingJump.mediaId) {
      const mv: any = data[idx] as any;
      const images = Array.isArray(mv?.images) ? mv.images : [];
      const imgIdx = images.findIndex((img: any) => String(img?.id) === pendingJump.mediaId);
      if (imgIdx >= 0) {
        setActiveSection('images');
        setEditingImageIdx(imgIdx);
      }
    }
    setPendingJump(null);
  }, [activeIndex, data, pendingJump]);

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

  const mvIndexById = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach((mv, idx) => map.set(String(mv.id), idx))
    return map
  }, [data])

  const filteredMvs = useMemo(() => {
    const q = mvQuery.trim().toLowerCase()
    return data
      .filter((mv) => (!showOnlyIncomplete ? true : isMVIncomplete(mv)))
      .filter((mv) => {
        if (!q) return true
        const hay = `${mv.id} ${mv.title} ${mv.year} ${mv.date || ""}`.toLowerCase()
        return hay.includes(q)
      })
  }, [data, mvQuery, showOnlyIncomplete])

  const mvGroups: AdminSplitGroup<MVItem>[] = useMemo(() => {
    const map = new Map<string, MVItem[]>()
    filteredMvs.forEach((mv) => {
      const key = String(mv.year || "Unknown")
      const list = map.get(key) || []
      list.push(mv)
      map.set(key, list)
    })
    return Array.from(map.entries())
      .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      .map(([k, items]) => ({ key: k, items }))
  }, [filteredMvs])

  const editingGroupKey = useMemo(() => {
    if (editingImageIdx === null) return '';
    const img: any = currentMV?.images?.[editingImageIdx];
    if (!img) return '';
    return getGroupKey(img);
  }, [currentMV?.images, editingImageIdx]);

  const editingGroupItems = useMemo(() => {
    const images: any[] = Array.isArray(currentMV?.images) ? currentMV.images : [];
    if (!editingGroupKey) return [];
    return images
      .map((img, idx) => ({ img, idx }))
      .filter(({ img }) => getGroupKey(img) === editingGroupKey);
  }, [currentMV?.images, editingGroupKey]);
  useEffect(() => {
    setImageDisplayLimit(24);
  }, [activeIndex]);

  const visibleImages = useMemo(() => {
    return (currentMV?.images || [])
      .map((img, originalIndex) => ({ img, originalIndex }))
      .filter(({ img }) => {
        if (imageTypeTab === 'fanart') return img.type === 'fanart';
        return img.type !== 'fanart';
      })
      .filter(({ img }) => img.usage !== 'cover' && img.type !== 'cover')
      .slice(0, imageDisplayLimit);
  }, [currentMV?.images, imageDisplayLimit, imageTypeTab]);

  const getAdminImagePreviewUrl = (img: any) => {
    const raw = img.thumbnail || img.url || '';
    const original = img.original_url || img.originalUrl || '';
    const prefer = original && (original.includes('twimg.com') || original.includes('ytimg.com')) ? original : raw;
    const mode = String(prefer).includes('r2.dan.tw') ? 'full' : 'thumb';
    return getProxyImgUrl(prefer, mode as any);
  };

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
    // 在原始數據中尋找這筆 MV (使用最初載入的 ID 來找)
    const originalMv = originalDataRef.current.find(mv => mv.id === targetId);
    
    // 檢查值是否真的變動 (如果是新增的 MV，originalMv 會是 undefined，此時必然標記變動)
    if (!originalMv || JSON.stringify(originalMv[field]) !== JSON.stringify(value)) {
      if (field === 'id') {
        const newId = value as string;
        // 如果修改的是 ID，必須遷移 changedFields 追蹤的鍵值，否則追蹤會斷鏈
        setChangedFields(prev => {
          const newMap = new Map(prev);
          const fields = newMap.get(targetId) || new Set();
          fields.add('id');
          newMap.set(newId, fields);
          newMap.delete(targetId);
          return newMap;
        });
        
        // 如果這是一筆已存在資料庫的 MV 被改了 ID，標記舊 ID 刪除，避免產生重複資料
        if (originalMv && originalMv.id !== newId) {
          setDeletedIds(prev => new Set(prev).add(originalMv.id));
        }
      } else {
        markFieldChanged(targetId, field as string);
      }
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
    
    // 檢查值是否真的變動 (新增的圖片會是 undefined)
    if (!originalImage || JSON.stringify(originalImage[field as keyof typeof originalImage]) !== JSON.stringify(value)) {
      markFieldChanged(targetId, `images.${imgIdx}.${field}`);
    }
    
    setData(prevData => prevData.map(mv => {
      if (mv.id !== targetId) return mv;
      const newImages = [...(mv.images || [])];
      
      const currentImg = newImages[imgIdx];
      const groupKey = currentImg?.group?.source_url ? String(currentImg.group.source_url).trim() : '';
      // 所有欄位除了白名單外的都同步
      const nonSyncFields = ['url', 'thumbnail', 'caption', 'alt', 'width', 'height'];
      
      newImages[imgIdx] = { ...currentImg, [field]: value };
      
      if (groupKey && !nonSyncFields.includes(field)) {
        newImages.forEach((img, idx) => {
          const k = img?.group?.source_url ? String(img.group.source_url).trim() : '';
          if (idx !== imgIdx && k === groupKey) {
            newImages[idx] = { ...img, [field]: value };
            markFieldChanged(targetId, `images.${idx}.${field}`);
          }
        });
      }
      
      return { ...mv, images: newImages };
    }));
  };

  const updateImageGroupField = (imgIdx: number, key: string, value: any) => {
    const targetId = currentMV.id;
    markFieldChanged(targetId, `images.${imgIdx}.group.${key}`);

    setData(prevData => prevData.map(mv => {
      if (mv.id !== targetId) return mv;
      const newImages = [...(mv.images || [])];
      const currentImg: any = newImages[imgIdx];
      const groupKey = currentImg?.group?.source_url ? String(currentImg.group.source_url).trim() : '';
      const currentGroup = (currentImg && typeof currentImg.group === 'object' && currentImg.group) ? currentImg.group : {};
      const nextGroup = { ...currentGroup, [key]: value };
      newImages[imgIdx] = { ...currentImg, group: nextGroup };

      if (groupKey) {
        newImages.forEach((img: any, idx: number) => {
          const k = img?.group?.source_url ? String(img.group.source_url).trim() : '';
          if (idx !== imgIdx && k === groupKey) {
            const g = (img && typeof img.group === 'object' && img.group) ? img.group : {};
            newImages[idx] = { ...img, group: { ...g, [key]: value } };
            markFieldChanged(targetId, `images.${idx}.group.${key}`);
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
      const apiUrl = `${getMvsApiBase()}/probe`;
      const response = await adminFetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: proxiedUrl }),
      });
      if (!response.ok) throw new Error('Network Error');
      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  // 一鍵依推文時間排序
  const handleSortByDate = () => {
    if (!currentMV?.images) return;
    const targetId = currentMV.id;
    
    // 降冪排序：最新的推文在前，沒有日期的往後排
    const sortedImages = [...currentMV.images].sort((a, b) => {
      const timeA = a.group?.post_date ? new Date(a.group.post_date).getTime() : 0;
      const timeB = b.group?.post_date ? new Date(b.group.post_date).getTime() : 0;
      return timeB - timeA;
    });

    setData(prevData => prevData.map(mv => mv.id === targetId ? { ...mv, images: sortedImages } : mv));
    markFieldChanged(targetId, 'images');
    toast.success('已依據推文發布時間重新排序！');
  };
  const handleCleanEmptyCustomFields = () => {
    if (!currentMV?.images) return;
    const targetId = currentMV.id;
    let modified = false;
    
    const newImages = currentMV.images.map((img, idx) => {
      const newImg = { ...img };
      const reservedKeys = ['id', 'type', 'media_type', 'original_url', 'thumbnail_url', 'usage', 'order_index', 'tags', 'group', 'url', 'thumbnail', 'caption', 'alt', 'richText', 'width', 'height'];
      
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

    if ((window as any).umami && typeof (window as any).umami.track === 'function') {
      (window as any).umami.track('Z_Admin_Action', {
        action_type: 'batch_add_tweets',
        mv_id: targetId,
        url_count: urls.length
      });
    }
    
    setBatchAddStatus({ total: urls.length, current: 0, failedUrls: [], isProcessing: true });
    
    let currentFailedUrls: string[] = [];
    let newExtractedImages: any[] = [];
    let existingImagesModified = false;
    let newImagesData = [...(currentMV.images || [])];

    // 輔助函數：提取 Twitter 媒體核心 ID 進行比對
    const getTwitterMediaId = (url: string) => {
      if (!url) return null;
      // 比對圖片: pbs.twimg.com/media/XXXXX
      const imgMatch = url.match(/\/media\/([a-zA-Z0-9_-]+)/);
      if (imgMatch) return imgMatch[1];
      // 比對影片: ext_tw_video/XXXXX
      const vidMatch = url.match(/\/ext_tw_video\/([a-zA-Z0-9_-]+)/);
      if (vidMatch) return vidMatch[1];
      return url; // 如果不是推特，就回傳原網址
    };

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const apiUrl = `${getMvsApiBase()}/twitter-resolve`;
        const response = await adminFetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        
        if (!response.ok) throw new Error('推文解析失敗');
        const json = await response.json();
        
        if (json.success && json.data && json.data.length > 0) {
          for (const media of json.data) {
            // 使用核心 ID 比對，忽略推特網址尾綴參數的干擾
            const targetMediaId = getTwitterMediaId(media.url);
            const existingIdx = newImagesData.findIndex(img => {
              if (targetMediaId) {
                const imgId = getTwitterMediaId(img.url);
                return imgId === targetMediaId;
              }
              return img.url === media.url;
            });
            
            if (existingIdx !== -1) {
              // 若已存在，補充缺少的資訊並加入群組
              existingImagesModified = true;
              newImagesData[existingIdx] = {
                ...newImagesData[existingIdx],
                thumbnail: newImagesData[existingIdx].thumbnail || media.thumbnail || '',
                group: {
                  ...(newImagesData[existingIdx].group || {}),
                  source_url: newImagesData[existingIdx].group?.source_url || url,
                  source_text: newImagesData[existingIdx].group?.source_text || media.text,
                  author_name: newImagesData[existingIdx].group?.author_name || media.user_name,
                  author_handle: newImagesData[existingIdx].group?.author_handle || media.user_screen_name,
                  post_date: newImagesData[existingIdx].group?.post_date || media.date,
                  status: newImagesData[existingIdx].group?.status || 'organized',
                },
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
                group: {
                  source_url: url,
                  source_text: media.text,
                  author_name: media.user_name,
                  author_handle: media.user_screen_name,
                  post_date: media.date,
                  status: 'organized',
                },
                caption: '',
                alt: '',
                richText: '',
                width,
                height,
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
        const apiUrl = `${getMvsApiBase()}/twitter-resolve`;
        const response = await adminFetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      const updateData = {
        url: firstMedia.url,
        thumbnail: firstMedia.thumbnail || '', // 如果是影片會有縮圖
        group: {
          source_url: url,
          source_text: firstMedia.text,
          author_name: firstMedia.user_name,
          author_handle: firstMedia.user_screen_name,
          post_date: firstMedia.date,
          status: 'organized',
        },
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
            group: {
              source_url: url,
              source_text: resolvedMediaList[i].text,
              author_name: resolvedMediaList[i].user_name,
              author_handle: resolvedMediaList[i].user_screen_name,
              post_date: resolvedMediaList[i].date,
              status: 'organized',
            },
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

  function getGroupKey(img: any) {
    const v = img?.group?.source_url
    if (typeof v !== "string") return ""
    return v.trim()
  }

  const getGroupLetter = (groupKey: string | undefined, allImages: MVMedia[] | undefined) => {
    if (!groupKey || !allImages) return '';
    const uniqueGroups = Array.from(new Set(allImages.map(getGroupKey).filter(Boolean)));
    const index = uniqueGroups.indexOf(groupKey);
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
    const draggedKey = getGroupKey(draggedImage);
    const dropKey = getGroupKey(dropImage);
    
    // 若拖曳的圖片有分組
    if (draggedKey) {
      if (dropKey === draggedKey) {
        // 同組內部排序：只移動該張圖片
        newImages.splice(draggedImageIdx, 1);
        // 因為刪除了一個元素，如果 dropIndex > draggedImageIdx，實際插入位置要 -1，但 splice 是針對當前陣列操作
        // 所以直接用 splice 處理
        // 為了避免 index 偏移問題，先移除再計算插入
        const actualDropIndex = dropIndex > draggedImageIdx ? dropIndex - 1 : dropIndex;
        newImages.splice(dropIndex, 0, draggedImage);
      } else {
        // 跨組移動：將整個群組移動到目標位置
        const groupItems = newImages.filter(img => getGroupKey(img) === draggedKey);
        const filteredImages = newImages.filter(img => getGroupKey(img) !== draggedKey);
        const newDropIndex = filteredImages.indexOf(dropImage);
        filteredImages.splice(newDropIndex >= 0 ? newDropIndex : dropIndex, 0, ...groupItems);
        updateField('images', filteredImages);
        handleDragEnd();
        return;
      }
    } else {
      // 無分組圖片移動
      if (dropKey) {
        // 避免插入到群組中間，找到該群組的邊界
        const groupStartIndex = newImages.findIndex(img => getGroupKey(img) === dropKey);
        let groupEndIndex = -1;
        for (let i = newImages.length - 1; i >= 0; i--) {
          if (getGroupKey(newImages[i]) === dropKey) {
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
    const newImage: any = { url: '', caption: '', alt: '', richText: '', width: 0, height: 0 };
    if (imageTypeTab === 'fanart') newImage.type = 'fanart';
    const images = [...(currentMV.images || []), newImage];
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

    if ((window as any).umami && typeof (window as any).umami.track === 'function') {
      (window as any).umami.track('Z_Admin_Action', {
        action_type: 'delete_mv',
        mv_id: mv.id,
        mv_title: mv.title,
        is_new_item: isNewItem
      });
    }

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
      youtube: "",
      bilibili: "",
      description: "",
      images: [],
      creators: [{ name: "Waboku" }],
      albums: [],
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

    setChangedFields(prev => {
      const newMap = new Map(prev);
      data.forEach(item => {
        // 如果值真的被變更（被賦予預設值），才標記為變更
        if ((item as any)[field] === undefined) {
          const fields = newMap.get(item.id) || new Set();
          fields.add(field);
          newMap.set(item.id, fields);
        }
      });
      return newMap;
    });

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
    setIsSaving(true)
    
    // 只獲取變動的字段數據
    const changedData = getChangedData();
    const hasChanges = changedData.length > 0 || (changedData._deleted && changedData._deleted.length > 0);
    
    // 如果沒有實質變動，直接提示成功
    if (!hasChanges) {
      toast.success('沒有檢測到變動，無需保存');
      setIsSaving(false)
      return;
    }
    
    const apiUrl = `${getMvsApiBase()}/update`
    
    // 將管理員的實質寫入操作上報至 Umami
    if ((window as any).umami && typeof (window as any).umami.track === 'function') {
      (window as any).umami.track('Z_Admin_Action', {
        action_type: 'save_db',
        updated_count: changedData.length || 0,
        deleted_count: changedData._deleted?.length || 0
      });
    }
    
    // 使用 Promise toast 處理非同步狀態
    const normalizedChangedData = Array.isArray(changedData)
      ? changedData.map((mv: any) => {
          if (!mv || typeof mv !== 'object') return mv;
          if (!Array.isArray(mv.images)) return mv;
          return {
            ...mv,
            images: mv.images.map((img: any) => materializeGroupAndStripLegacy(img)),
          };
        })
      : changedData;
    (normalizedChangedData as any)._deleted = (changedData as any)._deleted;

    try {
      await toast.promise(
        mvUpdateMutation.mutateAsync({
          url: apiUrl,
          method: "post",
          values: {
            data: normalizedChangedData,
            deletedIds: (normalizedChangedData as any)._deleted || [],
            partial: true,
          },
        }) as any,
        {
          loading: '正在同步數據到服務器...',
          success: (result: any) => {
            const payload = result?.data ?? result
            originalDataRef.current = JSON.parse(JSON.stringify(data));
            setChangedFields(new Map());
            setDeletedIds(new Set());
            invalidate({ resource: "mvs", invalidates: ["list"] })
            invalidate({ resource: "albums", invalidates: ["list"] })
            invalidate({ resource: "artists", invalidates: ["list"] })
            mvList.refetch?.()
            
            const { details } = payload || {};
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
          error: (err: any) => {
            return `儲存失敗: ${err.message}`;
          },
        }
      );
    } finally {
      setIsSaving(false)
    }
  };

  if (mvList.isLoading) {
    return (
      <div className="h-full bg-background text-foreground flex flex-col font-mono font-normal overflow-hidden">
        <div className="h-20 border-b-2 border-black bg-[var(--admin-header-bg)] flex items-center justify-between px-8 shadow-[var(--admin-shadow-sm)] shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-widest leading-none">管理員控制台</h1>
              <div className="text-[10px] font-bold opacity-40 font-mono normal-case tracking-widest">ZTMY.ADMIN.PANEL</div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
          <i className="hn hn-refresh text-4xl mb-4 animate-spin" />
          <h2 className="text-xl font-black mb-2">載入中...</h2>
        </div>
      </div>
    );
  }

  if (!currentMV) {
    return (
      <div className="h-full bg-background text-foreground flex flex-col font-mono font-normal overflow-hidden">
        {/* 頂部控制欄 */}
        <div className="h-20 border-b-2 border-black bg-[var(--admin-header-bg)] flex items-center justify-between px-8 shadow-[var(--admin-shadow-sm)] shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-widest leading-none">管理員控制台</h1>
              <div className="text-[10px] font-bold opacity-40 font-mono normal-case tracking-widest">ZTMY.ADMIN.PANEL</div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
          <i className="hn hn-inbox text-4xl mb-4" />
          <h2 className="text-xl font-black mb-2">沒有找到 MV 資料</h2>
          <p className="text-sm">資料庫目前是空的，或是無法載入資料。</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminSplitView
        title={`數據管理後台 V${VERSION_CONFIG.app}`}
        description={
          systemStatus?.version
            ? `BE: ${systemStatus.version}${systemStatus?.buildTime ? ` | ${new Date(systemStatus.buildTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '')}` : ""}`
            : undefined
        }
        actions={
          <>
            <Button variant={showOnlyIncomplete ? "default" : "neutral"} size="sm" onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}>
              <i className="hn hn-filter text-base mr-2" />
              <span className="hidden md:inline">{showOnlyIncomplete ? "正在查看待完善" : "只看待完善"}</span>
            </Button>
            <Button variant="default" size="sm" onClick={addNewMV} className="bg-main text-main-foreground">
              <i className="hn hn-plus text-base mr-2" /> 新增條目
            </Button>
            <Button variant="default" size="sm" onClick={() => setIsConfirmOpen(true)} disabled={isSaving} className="bg-ztmy-green text-black">
              <i className="hn hn-save text-base mr-2" /> {isSaving ? "同步中..." : "儲存回寫 (COMMIT)"}
            </Button>
          </>
        }
        leftSearchValue={mvQuery}
        onLeftSearchValueChange={setMvQuery}
        leftSearchPlaceholder="搜尋標題 / ID / 年份..."
        groups={mvGroups}
        getKey={(mv) => String(mv.id)}
        renderItemTitle={(mv) => (
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <div className="text-[10px] opacity-60 mb-1 flex items-center gap-1">
                #{mv.id}
                {isMVIncomplete(mv) ? <i className="hn hn-exclamation-triangle text-sm text-red-500" /> : null}
              </div>
              <div className="font-bold text-sm truncate" lang="ja">
                {mv.title}
              </div>
            </div>
          </div>
        )}
        renderItemSubtitle={(mv) => {
          const dirty = (changedFields.get(String(mv.id)) || new Set()).size > 0
          return `${mv.year || ""}${mv.date ? ` · ${mv.date}` : ""}${dirty ? " · edited" : ""}`
        }}
        renderItemEnd={(mv) => (
          <button
            onClick={() => openDeleteMVDrawer(mv)}
            className="opacity-70 hover:opacity-100 hover:text-red-500 transition-opacity"
            title="刪除"
          >
            <i className="hn hn-trash text-base" />
          </button>
        )}
        selectedKey={currentMV?.id ? String(currentMV.id) : null}
        onSelect={(id) => {
          const idx = mvIndexById.get(String(id))
          if (typeof idx === "number") setActiveIndex(idx)
        }}
        rightEmpty={<div className="text-xs font-mono opacity-60">選擇左側項目以編輯</div>}
        right={
          <div className="h-[calc(100dvh-220px)] overflow-y-auto custom-scrollbar p-1">
            <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-24">
              <div className="border-2 border-black bg-[var(--admin-panel-bg)] shadow-[var(--admin-shadow-sm)] rounded-[var(--admin-radius)] p-4 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-black break-words" lang="ja">
                      {currentMV.title}
                    </div>
                    <div className="text-[10px] font-mono opacity-60 break-all">
                      MV: {currentMV.id} {currentMV.year ? `· ${currentMV.year}` : ""} {currentMV.date ? `· ${currentMV.date}` : ""}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono opacity-60 whitespace-nowrap">
                    {(changedFields.get(String(currentMV.id)) || new Set()).size > 0 ? "edited" : "saved"}
                  </div>
                </div>
              </div>

              <Tabs value={activeSection} onValueChange={setActiveSection}>
                <TabsList className="w-full justify-start gap-1 p-1 border-2 border-black bg-[var(--admin-panel-bg)] shadow-[var(--admin-shadow-sm)] rounded-[var(--admin-radius)] overflow-x-auto sticky top-0 z-20">
                  <TabsTrigger
                    value="basic"
                    className="px-4 py-2 text-xs font-black uppercase tracking-[0.12em] border-2 border-transparent rounded-[calc(var(--admin-radius)-4px)] hover:bg-black/5 data-[state=active]:border-black data-[state=active]:bg-main data-[state=active]:text-black data-[state=active]:shadow-neo"
                  >
                    01 基礎資訊
                  </TabsTrigger>
                  <TabsTrigger
                    value="media"
                    className="px-4 py-2 text-xs font-black uppercase tracking-[0.12em] border-2 border-transparent rounded-[calc(var(--admin-radius)-4px)] hover:bg-black/5 data-[state=active]:border-black data-[state=active]:bg-main data-[state=active]:text-black data-[state=active]:shadow-neo"
                  >
                    02 媒體關聯
                  </TabsTrigger>
                  <TabsTrigger
                    value="images"
                    className="px-4 py-2 text-xs font-black uppercase tracking-[0.12em] border-2 border-transparent rounded-[calc(var(--admin-radius)-4px)] hover:bg-ztmy-green/15 data-[state=active]:border-black data-[state=active]:bg-ztmy-green data-[state=active]:text-black data-[state=active]:shadow-neo data-[state=active]:hover:bg-ztmy-green"
                  >
                    03 設定圖庫
                  </TabsTrigger>
                  <TabsTrigger
                    value="schema"
                    className="px-4 py-2 text-xs font-black uppercase tracking-[0.12em] border-2 border-transparent rounded-[calc(var(--admin-radius)-4px)] hover:bg-foreground/10 data-[state=active]:border-black data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-neo data-[state=active]:hover:bg-foreground"
                  >
                    00 資料架構
                  </TabsTrigger>
                </TabsList>

            {/* 基礎資訊區塊 */}
            <TabsContent value="basic">
            <section className="space-y-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">01 基礎資訊</h3>
                <span className="text-[10px] font-bold opacity-40 font-mono normal-case ml-2">01_Basic_Information</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase flex flex-col leading-tight">
                    <div className="flex items-center justify-between">
                      <span className="opacity-70">前台展示設定</span>
                      <Switch 
                        checked={currentMV.autoLoadMore || false}
                        onCheckedChange={(checked) => updateField('autoLoadMore', checked)}
                      />
                    </div>
                    <span className="text-[10px] font-mono opacity-40 normal-case mt-1">
                      {currentMV.autoLoadMore ? '自動載入更多圖片 (Infinite Scroll)' : '手動點擊按鈕載入更多'}
                    </span>
                  </label>
                </div>
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
            </TabsContent>

            {/* 媒體與關聯區塊 */}
            <TabsContent value="media">
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
                      <span className="opacity-70">專輯（下拉多選）</span>
                      <span className="text-[10px] font-mono opacity-40 normal-case">Albums</span>
                    </span>
                  </label>
                  <MultiSelect
                    options={mergeEntityOptions(
                      albumOptions,
                      (currentMV.albums || []).map((a: any) => (a && typeof a === "object" ? a : null)).filter(Boolean),
                    )}
                    selected={(currentMV.albums || [])
                      .map((a: any) => (a && typeof a === "object" && a.id ? String(a.id) : ""))
                      .filter((v: any) => typeof v === "string" && v.trim() !== "")}
                    onChange={(selected) => {
                      const map = new Map(albumOptions.map((o) => [o.value, o.label]))
                      const existing = new Map(
                        (currentMV.albums || [])
                          .filter((a: any) => a && typeof a === "object" && a.id && a.name)
                          .map((a: any) => [String(a.id), String(a.name)]),
                      )
                      updateField(
                        "albums",
                        selected
                          .map((id) => {
                            const name = map.get(id) || existing.get(id) || ""
                            if (!name) return null
                            return { id, name }
                          })
                          .filter(Boolean),
                      )
                    }}
                    placeholder="搜尋並選擇專輯..."
                    className={getErrorClass(currentMV.albums)}
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
                          value={(kw.name ?? kw.text) || ""}
                          onChange={(e) => {
                            const newKeywords = [...(currentMV.keywords || [])];
                            newKeywords[idx] = { ...kw, name: e.target.value, text: e.target.value };
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
                        const newKeywords = [...(currentMV.keywords || []), { name: '', lang: 'zh-Hant' }];
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
                    value={(currentMV.images?.filter(img => img.usage === 'cover').map(img => img.url) || []).join('\n')} 
                    onChange={(e) => {
                      const newUrls = e.target.value.split('\n').map(s => s.trim()).filter(s => s !== '');
                      const otherImages = currentMV.images?.filter(img => img.usage !== 'cover') || [];
                      const newCovers = newUrls.map((url, i) => ({ url, type: 'cover', usage: 'cover', order_index: i }));
                      updateField('images', [...newCovers, ...otherImages]);
                    }} 
                    className={`min-h-[100px] font-sans text-sm ${getErrorClass(currentMV.images)}`}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase flex flex-col leading-tight">
                    <span className="opacity-70">畫師 / 動畫師（下拉多選）</span>
                    <span className="text-[10px] font-mono opacity-40 normal-case">Artist / Animator</span>
                  </label>
                  <MultiSelect
                    options={mergeEntityOptions(
                      artistOptions,
                      (currentMV.creators || [])
                        .map((a: any) => (a && typeof a === "object" ? a : null))
                        .filter(Boolean),
                    )}
                    selected={(currentMV.creators || [])
                      .map((a: any) => (a && typeof a === "object" && a.id ? String(a.id) : ""))
                      .filter((v: any) => typeof v === "string" && v.trim() !== "")}
                    onChange={(selected) => {
                      const map = new Map(artistOptions.map((o) => [o.value, o.label]))
                      const existing = new Map(
                        (currentMV.creators || [])
                          .filter((a: any) => a && typeof a === "object" && a.id && a.name)
                          .map((a: any) => [String(a.id), String(a.name)]),
                      )
                      updateField(
                        "creators",
                        selected
                          .map((id) => {
                            const name = map.get(id) || existing.get(id) || ""
                            if (!name) return null
                            return { id, name }
                          })
                          .filter(Boolean),
                      )
                    }}
                    placeholder="搜尋並選擇畫師..."
                    className={getErrorClass(currentMV.creators)}
                  />
                </div>
              </div>
            </section>
            </TabsContent>

            {/* 設定圖管理 (瀑布流數據源) */}
            <TabsContent value="images">
            <section className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-4">
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

                    <div className="flex bg-black/5 p-1 rounded-sm border-2 border-black ml-4">
                      <button
                        onClick={() => setImageTypeTab('official')}
                        className={`px-4 py-1 text-xs font-black uppercase transition-colors ${imageTypeTab === 'official' ? 'bg-black text-white' : 'text-black/60 hover:text-black'}`}
                      >
                        MV 圖片 (Official)
                      </button>
                      <button
                        onClick={() => setImageTypeTab('fanart')}
                        className={`px-4 py-1 text-xs font-black uppercase transition-colors ${imageTypeTab === 'fanart' ? 'bg-black text-white' : 'text-black/60 hover:text-black'}`}
                      >
                        FanArt 圖片
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap justify-end">
                  {isSelectionMode && selectedImageIndices.size > 0 && (
                    <Button 
                      variant="neutral" 
                      size="sm" 
                      className="bg-blue-500 text-white hover:bg-blue-600 border-2 border-black"
                      onClick={() => {
                        const indices = Array.from(selectedImageIndices)
                        if (indices.length === 0) return
                        setSourceUrlTarget({ mvId: currentMV.id, indices })
                        setSourceUrlDraft("")
                        setSourceUrlDialogOpen(true)
                      }}
                    >
                      <i className="hn hn-link text-base mr-2" /> 設定推文
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
                    onClick={handleSortByDate} 
                    className="border-dashed hover:bg-black/5"
                    title="將圖片依據推文發布時間降冪排列"
                  >
                    <i className="hn hn-sort-amount-desc text-base mr-2" /> 依時間排序
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
                <div className="border-2 border-black p-4 bg-[var(--admin-panel-bg)] shadow-[var(--admin-shadow-sm)] rounded-[var(--admin-radius)] flex flex-col gap-3">
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
                  {visibleImages.map(({ img, originalIndex: imgIdx }) => {
                    const isGif = img.url?.match(/\.gif$/i) || img.url?.includes('tweet_video_thumb');
                    const isVideo = isMediaVideo(img.url, img.type);
                    const groupKey = getGroupKey(img);
                    const groupHue = groupKey ? Array.from(groupKey).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360 : 0;
                    return (
                      <div
                        key={imgIdx}
                        draggable={draggableIdx === imgIdx}
                        onDragStart={(e) => handleDragStart(e, imgIdx)}
                        onDragOver={(e) => handleDragOver(e, imgIdx)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, imgIdx)}
                        onMouseEnter={() => groupKey && setHoveredGroupKey(groupKey)}
                        onMouseLeave={() => groupKey && setHoveredGroupKey(null)}
                        className={`group relative flex flex-col border-4 transition-all duration-200 bg-card ${
                          draggedImageIdx === imgIdx ? 'opacity-50 scale-[0.98] z-50 border-dashed border-black/30' : 'hover:-translate-y-1 hover:shadow-neo-sm'
                        } ${dragOverImageIdx === imgIdx ? 'border-dashed border-blue-500 bg-blue-50/50' : ''} ${
                          hoveredGroupKey && groupKey === hoveredGroupKey ? 'ring-4 ring-offset-2 z-20 scale-[1.02]' : ''
                        }`}
                        style={{
                          borderColor: groupKey ? `hsl(${groupHue}, 70%, 50%)` : 'black',
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
                        <div className="aspect-square bg-black/5 border-b-4 border-black/10 flex items-center justify-center overflow-hidden relative cursor-pointer group/thumb" onClick={() => !isSelectionMode && setEditingImageIdx(imgIdx)} style={{ borderBottomColor: groupKey ? `hsl(${groupHue}, 70%, 50%)` : undefined }}>
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
                          {groupKey && (
                            <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full pointer-events-none z-10 opacity-70" 
                                 style={{ backgroundColor: `hsl(${groupHue}, 70%, 50%)` }}>
                            </div>
                          )}
                          {img.url ? (
                            <>
                              <img src={getAdminImagePreviewUrl(img)} className="w-full h-full object-cover" alt="預覽" />
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
                          {groupKey && (
                            <div 
                              className="absolute -top-3 -right-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm shadow-sm flex items-center gap-1 z-10"
                              title={`已分組: ${groupKey}`}
                              style={{ backgroundColor: `hsl(${groupHue}, 70%, 40%)` }}
                            >
                              <i className="hn hn-link text-[8px] shrink-0" /> 
                              Group {getGroupLetter(groupKey, currentMV.images)}
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
                            {img.group?.source_url && (
                              <a href={img.group.source_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 ml-1 flex-shrink-0" title="開啟原始推文" onClick={e => e.stopPropagation()}>
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
                  <DialogContent className="w-screen h-[100dvh] max-w-none md:left-0 md:top-0 md:w-screen md:h-[100dvh] md:max-w-none md:!translate-x-0 md:!translate-y-0 border-0 md:border-0 shadow-none md:shadow-none p-0 overflow-hidden bg-card text-card-foreground [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:md:top-3 [&_[data-slot=dialog-close]]:md:right-3">
                    {editingImageIdx !== null && currentMV.images && currentMV.images[editingImageIdx] && (
                      <div className="flex flex-col h-full">
                        <DialogHeader className="p-4 pr-16 bg-ztmy-green border-b-4 border-black flex-shrink-0 text-black">
                          <div className="flex flex-col md:flex-row gap-3 md:items-start md:justify-between">
                            <div className="min-w-0">
                              <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
                                <i className="hn hn-image text-xl" /> 圖片編輯
                              </DialogTitle>
                              <DialogDescription className="text-black font-bold opacity-80 text-xs">
                                索引 {editingImageIdx} · {currentMV.images[editingImageIdx].id}
                              </DialogDescription>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end pr-2">
                              <Button
                                variant="neutral"
                                size="sm"
                                onClick={() => setEditingImageIdx((v) => (typeof v === "number" ? Math.max(0, v - 1) : v))}
                                disabled={editingImageIdx <= 0}
                                className="border-2 border-black"
                              >
                                <i className="hn hn-arrow-left" /> Prev
                              </Button>
                              <Button
                                variant="neutral"
                                size="sm"
                                onClick={() =>
                                  setEditingImageIdx((v) =>
                                    typeof v === "number" ? Math.min((currentMV.images?.length || 1) - 1, v + 1) : v,
                                  )
                                }
                                disabled={editingImageIdx >= (currentMV.images?.length || 1) - 1}
                                className="border-2 border-black"
                              >
                                Next <i className="hn hn-arrow-right" />
                              </Button>
                            </div>
                          </div>
                        </DialogHeader>

                        <div className="flex-1 min-h-0 bg-secondary-background">
                          <div className="h-full grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
                            <div className="border-b-4 lg:border-b-0 lg:border-r-4 border-black bg-card p-4 flex flex-col gap-3 overflow-auto">
                              <div className="aspect-square bg-black/5 border-2 border-dashed border-black/20 flex items-center justify-center overflow-hidden relative rounded">
                                {currentMV.images[editingImageIdx].url ? (
                                  <>
                                    <img
                                      src={getAdminImagePreviewUrl(currentMV.images[editingImageIdx])}
                                      className="w-full h-full object-contain"
                                      alt="預覽"
                                    />
                                    {currentMV.images[editingImageIdx].url?.match(/\.gif$/i) || currentMV.images[editingImageIdx].url?.includes("tweet_video_thumb") ? (
                                      <div className="absolute top-2 left-2 flex items-center justify-center bg-black/60 text-white rounded px-2 py-0.5 shadow-sm backdrop-blur-sm border border-white/10 z-10 pointer-events-none">
                                        <span className="font-black text-[10px] tracking-widest">GIF</span>
                                      </div>
                                    ) : null}
                                    {((currentMV.images[editingImageIdx].url?.match(/\.(mp4|webm)$/i) ||
                                      currentMV.images[editingImageIdx].url?.includes("video.twimg.com") ||
                                      (currentMV.images[editingImageIdx].thumbnail &&
                                        currentMV.images[editingImageIdx].thumbnail !== currentMV.images[editingImageIdx].url)) &&
                                      !(
                                        currentMV.images[editingImageIdx].url?.match(/\.gif$/i) ||
                                        currentMV.images[editingImageIdx].url?.includes("tweet_video_thumb")
                                      )) && (
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

                              <div className="flex flex-col gap-2">
                                <div className="text-xs font-mono opacity-70 break-all">{currentMV.images[editingImageIdx].url || "-"}</div>
                                <div className="flex flex-wrap gap-2">
                                  {currentMV.images[editingImageIdx].group?.source_url ? (
                                    <Button variant="neutral" size="sm" asChild className="border-2 border-black">
                                      <a href={currentMV.images[editingImageIdx].group!.source_url} target="_blank" rel="noreferrer">
                                        <i className="hn hn-twitter" /> Open Tweet
                                      </a>
                                    </Button>
                                  ) : null}
                                  {currentMV.images[editingImageIdx].url ? (
                                    <Button variant="neutral" size="sm" asChild className="border-2 border-black">
                                      <a href={currentMV.images[editingImageIdx].url} target="_blank" rel="noreferrer">
                                        Open Media
                                      </a>
                                    </Button>
                                  ) : null}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold opacity-60 uppercase">Width</label>
                                  <Input
                                    type="number"
                                    value={currentMV.images[editingImageIdx].width || ""}
                                    onChange={(e) => updateImage(editingImageIdx, "width", parseInt(e.target.value))}
                                    className={`h-9 text-sm ${!currentMV.images[editingImageIdx].width ? "border-red-500 bg-red-50" : ""}`}
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold opacity-60 uppercase">Height</label>
                                  <Input
                                    type="number"
                                    value={currentMV.images[editingImageIdx].height || ""}
                                    onChange={(e) => updateImage(editingImageIdx, "height", parseInt(e.target.value))}
                                    className={`h-9 text-sm ${!currentMV.images[editingImageIdx].height ? "border-red-500 bg-red-50" : ""}`}
                                  />
                                </div>
                              </div>

                              <Button
                                variant="neutral"
                                className="w-full border-2 border-black"
                                onClick={() => handleProbe(editingImageIdx, currentMV.images![editingImageIdx].url)}
                                disabled={!currentMV.images[editingImageIdx].url}
                              >
                                <i className="hn hn-expand" /> 自動偵測尺寸 / 解析推文
                              </Button>

                              {editingGroupKey ? (
                                <div className="border-2 border-black bg-white p-3 flex flex-col gap-1">
                                  <div className="text-xs font-black uppercase tracking-widest">Sync</div>
                                  <div className="text-xs font-mono opacity-70">
                                    Group {getGroupLetter(editingGroupKey, currentMV.images)} · {editingGroupKey}
                                  </div>
                                  <div className="text-xs opacity-70">會同步：推文 / 富文本 / 自訂欄位</div>
                                  <div className="text-xs opacity-70">不會同步：URL / 尺寸 / Caption / Alt</div>
                                </div>
                              ) : (
                                <div className="border-2 border-black bg-white p-3 flex flex-col gap-1">
                                  <div className="text-xs font-black uppercase tracking-widest">Scope</div>
                                  <div className="text-xs opacity-70">未分組：所有修改只影響本張圖片。</div>
                                </div>
                              )}

                              {editingGroupKey ? (
                                <div className="border-2 border-black bg-white p-3 flex flex-col gap-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs font-black uppercase tracking-widest">同組圖片</div>
                                    <div className="text-xs font-mono opacity-70">{editingGroupItems.length}</div>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2">
                                    {editingGroupItems.slice(0, 12).map(({ img, idx }) => {
                                      const rawUrl = String(img?.url || '')
                                      const isVideo = isMediaVideo(rawUrl, img?.type)
                                      const active = idx === editingImageIdx
                                      return (
                                        <button
                                          key={`${String(img?.id || idx)}-${idx}`}
                                          type="button"
                                          onClick={() => setEditingImageIdx(idx)}
                                          className={`relative size-16 border-2 border-black overflow-hidden bg-black ${active ? 'outline outline-4 outline-ztmy-green' : 'hover:outline hover:outline-4 hover:outline-black/40'}`}
                                          title={String(img?.id || idx)}
                                        >
                                          {rawUrl ? (
                                            <>
                                              <img src={getAdminImagePreviewUrl(img)} className="w-full h-full object-cover" alt={String(img?.id || idx)} />
                                              {isVideo ? (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                                  <div className="bg-black/80 text-white rounded-full p-1 border border-white/20">
                                                    <i className="hn hn-play text-sm ml-0.5" />
                                                  </div>
                                                </div>
                                              ) : null}
                                            </>
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/70 text-[10px] font-mono">No</div>
                                          )}
                                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] font-mono px-1 py-0.5 truncate">
                                            {String(img?.id || idx)}
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                  {editingGroupItems.length > 12 ? (
                                    <div className="text-[10px] font-mono opacity-60">+{editingGroupItems.length - 12} more</div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <ScrollArea className="h-full">
                              <div className="p-4 md:p-6 flex flex-col gap-4">
                                <Tabs defaultValue="basic">
                                  <TabsList className="w-full justify-start gap-1 p-1 border-2 border-black bg-[var(--admin-panel-bg)] shadow-[var(--admin-shadow-sm)] rounded-[var(--admin-radius)] overflow-x-auto">
                                    <TabsTrigger
                                      value="basic"
                                      className="px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] border-2 border-transparent rounded-[calc(var(--admin-radius)-4px)] hover:bg-black/5 data-[state=active]:border-black data-[state=active]:bg-main data-[state=active]:text-black data-[state=active]:shadow-neo"
                                    >
                                      基本
                                    </TabsTrigger>
                                    <TabsTrigger
                                      value="tweet"
                                      className="px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] border-2 border-transparent rounded-[calc(var(--admin-radius)-4px)] hover:bg-black/5 data-[state=active]:border-black data-[state=active]:bg-main data-[state=active]:text-black data-[state=active]:shadow-neo"
                                    >
                                      推文
                                    </TabsTrigger>
                                    <TabsTrigger
                                      value="rich"
                                      className="px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] border-2 border-transparent rounded-[calc(var(--admin-radius)-4px)] hover:bg-black/5 data-[state=active]:border-black data-[state=active]:bg-main data-[state=active]:text-black data-[state=active]:shadow-neo"
                                    >
                                      富文本
                                    </TabsTrigger>
                                    <TabsTrigger
                                      value="custom"
                                      className="px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] border-2 border-transparent rounded-[calc(var(--admin-radius)-4px)] hover:bg-black/5 data-[state=active]:border-black data-[state=active]:bg-main data-[state=active]:text-black data-[state=active]:shadow-neo"
                                    >
                                      自訂
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="basic">
                                    <div className="flex flex-col gap-3">
                                      <div className="text-xs font-mono opacity-60">本頁欄位只影響本張圖片（不會同步）。</div>
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold opacity-60 uppercase">圖片 URL</label>
                                        <Input
                                          placeholder="https://..."
                                          value={currentMV.images[editingImageIdx].url}
                                          onChange={(e) => updateImage(editingImageIdx, "url", e.target.value)}
                                          className={`${!currentMV.images[editingImageIdx].url?.trim() ? "border-red-500 bg-red-50" : ""}`}
                                        />
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[10px] font-bold opacity-60 uppercase">Caption</label>
                                          <Input
                                            placeholder="可選填"
                                            value={currentMV.images[editingImageIdx].caption || ""}
                                            onChange={(e) => updateImage(editingImageIdx, "caption", e.target.value)}
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[10px] font-bold opacity-60 uppercase">Alt</label>
                                          <Input
                                            placeholder="可選填"
                                            value={currentMV.images[editingImageIdx].alt || ""}
                                            onChange={(e) => updateImage(editingImageIdx, "alt", e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="tweet">
                                    <div className="flex flex-col gap-3">
                                      <div className="text-xs font-mono opacity-60">{editingGroupKey ? "本頁欄位會同步到同組圖片。" : "未分組：本頁欄位只影響本張圖片。"}</div>
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold opacity-60 uppercase flex justify-between">
                                          <span>推文連結 (source_url)</span>
                                          {currentMV.images[editingImageIdx].group?.source_url ? (
                                            <a
                                              href={currentMV.images[editingImageIdx].group!.source_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-blue-600 underline truncate max-w-[200px]"
                                              title={currentMV.images[editingImageIdx].group!.source_url}
                                            >
                                              Open
                                            </a>
                                          ) : null}
                                        </label>
                                        <Input
                                          placeholder="https://x.com/.../status/..."
                                          value={currentMV.images[editingImageIdx].group?.source_url || ""}
                                          onChange={(e) => updateImageGroupField(editingImageIdx, "source_url", e.target.value)}
                                        />
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[10px] font-bold opacity-60 uppercase">author_name</label>
                                          <Input
                                            value={currentMV.images[editingImageIdx].group?.author_name || ""}
                                            onChange={(e) => updateImageGroupField(editingImageIdx, "author_name", e.target.value)}
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[10px] font-bold opacity-60 uppercase">author_handle</label>
                                          <Input
                                            value={currentMV.images[editingImageIdx].group?.author_handle || ""}
                                            onChange={(e) => updateImageGroupField(editingImageIdx, "author_handle", e.target.value)}
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[10px] font-bold opacity-60 uppercase">post_date</label>
                                          <Input
                                            type="datetime-local"
                                            value={(() => {
                                              const raw = currentMV.images[editingImageIdx].group?.post_date
                                              if (!raw) return ""
                                              const d = new Date(raw)
                                              if (Number.isNaN(d.getTime())) return ""
                                              const pad = (n: number) => String(n).padStart(2, "0")
                                              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                                            })()}
                                            onChange={(e) => {
                                              const v = e.target.value
                                              const d = v ? new Date(v) : null
                                              updateImageGroupField(editingImageIdx, "post_date", d ? d.toISOString() : null)
                                            }}
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[10px] font-bold opacity-60 uppercase">status</label>
                                          <Select
                                            value={currentMV.images[editingImageIdx].group?.status || "__none__"}
                                            onValueChange={(v) => updateImageGroupField(editingImageIdx, "status", v === "__none__" ? null : v)}
                                          >
                                            <SelectTrigger className="h-10 bg-white border-2 border-border shadow-none">
                                              <SelectValue placeholder="status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__none__">未設定</SelectItem>
                                              <SelectItem value="organized">organized</SelectItem>
                                              <SelectItem value="unorganized">unorganized</SelectItem>
                                              <SelectItem value="pending">pending</SelectItem>
                                              <SelectItem value="deleted">deleted</SelectItem>
                                              <SelectItem value="rejected">rejected</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>

                                      <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold opacity-60 uppercase">source_text</label>
                                        <Textarea
                                          value={currentMV.images[editingImageIdx].group?.source_text || ""}
                                          onChange={(e) => updateImageGroupField(editingImageIdx, "source_text", e.target.value)}
                                          className="min-h-[120px] text-xs"
                                        />
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="rich">
                                    <div className="flex flex-col gap-3">
                                      <div className="text-xs font-mono opacity-60">{editingGroupKey ? "本頁欄位會同步到同組圖片。" : "未分組：本頁欄位只影響本張圖片。"}</div>
                                      <RichTextEditor
                                        value={currentMV.images[editingImageIdx].richText || ""}
                                        onChange={(value) => updateImage(editingImageIdx, "richText", value)}
                                      />
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="custom">
                                    <div className="flex flex-col gap-3">
                                      <div className="text-xs font-mono opacity-60">{editingGroupKey ? "本頁欄位會同步到同組圖片。" : "未分組：本頁欄位只影響本張圖片。"}</div>
                                      {Object.keys(currentMV.images[editingImageIdx])
                                        .filter(
                                          (key) =>
                                            ![
                                              "id",
                                              "type",
                                              "media_type",
                                              "original_url",
                                              "thumbnail_url",
                                              "usage",
                                              "order_index",
                                              "tags",
                                              "group",
                                              "url",
                                              "thumbnail",
                                              "caption",
                                              "alt",
                                              "richText",
                                              "width",
                                              "height",
                                            ].includes(key),
                                        )
                                        .map((key) => {
                                          return (
                                            <div className="flex flex-col gap-1" key={key}>
                                              <label className="text-[10px] font-bold opacity-60 uppercase flex justify-between">
                                                <span>{key}</span>
                                                <button
                                                  onClick={() => {
                                                    const newImages = [...currentMV.images!]
                                                    delete newImages[editingImageIdx][key]
                                                    setData((prevData) =>
                                                      prevData.map((mv) => (mv.id === currentMV.id ? { ...mv, images: newImages } : mv)),
                                                    )
                                                    markFieldChanged(currentMV.id, `images.${editingImageIdx}`)
                                                  }}
                                                  className="text-red-500 hover:text-red-700"
                                                  title="刪除此欄位"
                                                >
                                                  <i className="hn hn-times" />
                                                </button>
                                              </label>
                                              <Input
                                                value={currentMV.images![editingImageIdx][key] || ""}
                                                onChange={(e) => updateImage(editingImageIdx, key, e.target.value)}
                                              />
                                            </div>
                                          )
                                        })}

                                      <div className="pt-2 border-t-2 border-dashed border-black/10 flex flex-col gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full text-xs border-dashed"
                                          onClick={() => {
                                            setCustomFieldTarget(editingImageIdx)
                                            setCustomFieldDraft("")
                                            setCustomFieldDialogOpen(true)
                                          }}
                                        >
                                          <i className="hn hn-plus mr-2" /> 新增自訂欄位
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleCleanEmptyCustomFields} className="w-full text-xs border-dashed">
                                          <i className="hn hn-refresh mr-2" /> 清理空值（整支 MV）
                                        </Button>
                                        <div className="text-[10px] font-mono opacity-60">清理會掃描此 MV 的所有圖片，不限同組。</div>
                                      </div>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                        
                        <DialogFooter className="p-4 bg-secondary border-t-4 border-black flex-shrink-0 flex justify-between items-center">
                          <div className="flex gap-2">
                            <Button variant="neutral" onClick={() => removeImage(editingImageIdx)} className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white border-red-200">
                              <i className="hn hn-trash mr-2" /> 刪除此圖片
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
              </div>
            </section>
            </TabsContent>

            {/* 數據架構維護工具 (Schema Maintenance) */}
            <TabsContent value="schema">
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
            </TabsContent>
            </Tabs>
            </div>
          </div>
        }
      />

      {/* 批量推文解析 Dialog */}
      <Dialog open={isBatchAddOpen} onOpenChange={(open) => !batchAddStatus?.isProcessing && setIsBatchAddOpen(open)}>
        <DialogContent className="max-w-2xl border-2 border-black shadow-[var(--admin-shadow)] rounded-[var(--admin-radius)] p-0 overflow-hidden bg-[var(--admin-panel-bg)] text-foreground">
          <DialogHeader className="p-6 bg-blue-600 text-white border-b-2 border-black">
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
          <DialogFooter className="p-4 bg-[var(--admin-panel-bg)] border-t-2 border-black flex gap-2">
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

      <Dialog open={sourceUrlDialogOpen} onOpenChange={setSourceUrlDialogOpen}>
        <DialogContent className="max-w-md border-2 border-black shadow-[var(--admin-shadow)] rounded-[var(--admin-radius)] bg-[var(--admin-panel-bg)] text-foreground">
          <DialogHeader>
            <DialogTitle>設定推文來源</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="text-xs font-mono opacity-60">source_url</div>
            <Input value={sourceUrlDraft} onChange={(e) => setSourceUrlDraft(e.target.value)} placeholder="https://x.com/.../status/..." />
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setSourceUrlDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                const url = sourceUrlDraft.trim()
                if (!url) {
                  toast.error("請輸入推文網址")
                  return
                }
                if (!sourceUrlTarget) {
                  setSourceUrlDialogOpen(false)
                  return
                }
                const mvId = sourceUrlTarget.mvId
                const indices = sourceUrlTarget.indices
                setData((prevData) =>
                  prevData.map((mv) => {
                    if (mv.id !== mvId) return mv
                    const newImages = [...(mv.images || [])]
                    indices.forEach((idx) => {
                      const img: any = newImages[idx]
                      const g = img && typeof img.group === "object" && img.group ? img.group : {}
                      newImages[idx] = { ...img, group: { ...g, source_url: url, status: g.status || "organized" } }
                      markFieldChanged(mvId, `images.${idx}.group.source_url`)
                    })
                    return { ...mv, images: newImages }
                  }),
                )
                setSelectedImageIndices(new Set())
                setIsSelectionMode(false)
                setSourceUrlDialogOpen(false)
                setSourceUrlTarget(null)
                toast.success(`已為 ${indices.length} 張圖片設定推文來源`)
              }}
              className="border-2 border-black"
            >
              套用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customFieldDialogOpen} onOpenChange={setCustomFieldDialogOpen}>
        <DialogContent className="max-w-md border-2 border-black shadow-[var(--admin-shadow)] rounded-[var(--admin-radius)] bg-[var(--admin-panel-bg)] text-foreground">
          <DialogHeader>
            <DialogTitle>新增自訂欄位</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="text-xs font-mono opacity-60">僅允許英數與底線</div>
            <Input value={customFieldDraft} onChange={(e) => setCustomFieldDraft(e.target.value)} placeholder="e.g. source_url / credit / note" />
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setCustomFieldDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                const name = customFieldDraft.trim()
                if (!name) return
                if (!/^[A-Za-z0-9_]+$/.test(name)) {
                  toast.error("欄位名稱格式不正確")
                  return
                }
                if (customFieldTarget === null) {
                  setCustomFieldDialogOpen(false)
                  return
                }
                updateImage(customFieldTarget, name, "")
                setCustomFieldDialogOpen(false)
                setCustomFieldTarget(null)
              }}
              className="border-2 border-black"
            >
              新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
