import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { VERSION_CONFIG } from '@/config/version';
import { toast } from "sonner"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';
import { Plus, Trash2, Save, ArrowLeft, Image as ImageIcon, Hash, Disc, Youtube, Tv, Ruler, RefreshCw, Play, AlertTriangle, Filter, HelpCircle, Code, LayoutTemplate, FileCode, Plus as PlusIcon, Wand2 } from 'lucide-react';
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
                <LayoutTemplate className="size-4" />
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
                    <FileCode className="size-4 opacity-50" />
                    <span className="truncate">{template.name}</span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator className="bg-black/20" />
              <DropdownMenuItem
                onClick={() => setShowTemplateManager(true)}
                className="flex items-center gap-2 cursor-pointer bg-black text-white focus:bg-ztmy-green focus:text-black font-bold"
              >
                <PlusIcon className="size-4" />
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
            <Wand2 className="size-4" />
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
            <Code className="size-4" />
            {isSplitMode ? '單欄' : '分屏'}
          </button>
        </div>
      </div>

      {/* 模板管理彈窗 */}
      <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
        <DialogContent className="max-w-lg border-4 border-black shadow-neo p-0 overflow-hidden bg-white text-black">
          <DialogHeader className="p-4 bg-ztmy-green border-b-4 border-black">
            <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
              <LayoutTemplate className="size-5" /> 模板管理
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
                  <PlusIcon className="size-3" />
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
                            <FileCode className="size-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 text-red-500 rounded transition-all"
                            title="刪除"
                          >
                            <Trash2 className="size-3" />
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
              <AlertTriangle className="size-6" /> 刪除模板
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
              <Wand2 className="size-5" /> 模板填充器
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
                  <Wand2 className="size-4 mr-2" />
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
  onRefresh?: () => void;
}

export function AdminPage({ mvData, onRefresh }: AdminPageProps) {
  const [data, setData] = useState<MVItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // 刪除確認 Drawer 狀態
  const [deleteDrawerOpen, setDeleteDrawerOpen] = useState(false);
  const [pendingDeleteMV, setPendingDeleteMV] = useState<MVItem | null>(null);
  const [pendingDeleteImageIdx, setPendingDeleteImageIdx] = useState<number | null>(null);

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

  // 當切換影片時重置圖片顯示數量
  useEffect(() => {
    setImageDisplayLimit(12);
  }, [activeIndex]);

  // 滾動自動加載圖片列表邏輯 (Admin 側)
  useEffect(() => {
    if (!currentMV?.images || imageDisplayLimit >= currentMV.images.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setImageDisplayLimit((prev) => prev + 12);
        }
      },
      { rootMargin: '200px' } // 提前觸發以保持流暢
    );

    if (imageSentinelRef.current) {
      observer.observe(imageSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [currentMV?.images, imageDisplayLimit]);

  const visibleImages = useMemo(() => {
    return (currentMV?.images || []).slice(0, imageDisplayLimit);
  }, [currentMV?.images, imageDisplayLimit]);

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
      newImages[imgIdx] = { ...newImages[imgIdx], [field]: value };
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: proxiedUrl }),
      });
      if (!response.ok) throw new Error('Network Error');
      return await response.json();
    } catch (err) {
      throw err;
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
          const result = await probeImageSize(images[imgIdx].url);
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
    try {
      const result = await probeImageSize(url);
      
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

  const addImage = () => {
    const images = [...(currentMV.images || []), { url: '', caption: '', alt: '', richText: '', width: 0, height: 0 }];
    updateField('images', images);
    // 確保新增的圖片在視線範圍內
    setImageDisplayLimit(prev => Math.max(prev, images.length));
  };

  const removeImage = (imgIdx: number) => {
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
      artist: "Waboku",
      youtube: "",
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
        headers: { 'Content-Type': 'application/json' },
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

  if (!currentMV) return null;
  return (

    <div className="h-screen bg-background text-foreground flex flex-col font-mono font-normal overflow-hidden">
      {/* 頂部控制欄 */}
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm z-50">
        <div className="flex items-center gap-4">
          <Button variant="neutral" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4" /> 返回
          </Button>
          <h1 className="font-black uppercase tracking-tighter text-xl border-l-4 border-black pl-4">
            數據管理後台 V{VERSION_CONFIG.app}
          </h1>
        </div>
        <div className="flex gap-4">
          <Button 
            variant={showOnlyIncomplete ? "default" : "neutral"} 
            size="sm" 
            onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
            className={showOnlyIncomplete ? "bg-red-500 text-white shadow-neo" : ""}
          >
            <Filter className="size-4" /> 
            <span className="hidden md:inline">
              {showOnlyIncomplete ? '正在查看待完善' : '只看待完善'}
            </span>
          </Button>
          <Button variant="default" size="sm" onClick={addNewMV} className="bg-main text-black">
            <Plus className="size-4" /> 新增條目
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setIsConfirmOpen(true)} 
            disabled={isSaving}
            className="bg-ztmy-green text-black shadow-neo"
          >
            <Save className="size-4" /> {isSaving ? '同步中...' : '儲存回寫 (COMMIT)'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
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
                  #{mv.id} {isIncomplete && <AlertTriangle className="size-3 text-red-500" />}
                </div>
                <div className="font-bold text-sm truncate">{mv.title}</div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteMVDrawer(mv);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
              );
            })}
          </div>
        </div>

        {/* 右側表單 */}
        <div className="flex-1 h-full overflow-y-auto p-12 custom-scrollbar bg-card/50">
          <div className="max-w-4xl mx-auto space-y-12 pb-24">
            

            
            {/* 基礎資訊區塊 */}
            <section className="space-y-6">
              <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">01_Basic_Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-bold opacity-50 uppercase">MV_Unique_ID</label>
                  <Input 
                    value={currentMV.id} 
                    onChange={(e) => updateField('id', e.target.value)} 
                    className={getErrorClass(currentMV.id)}
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-bold opacity-50 uppercase">MV_Title</label>
                  <Input 
                    value={currentMV.title} 
                    onChange={(e) => updateField('title', e.target.value)} 
                    className={getErrorClass(currentMV.title)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold opacity-50 uppercase">Description</label>
                  <Textarea 
                    value={currentMV.description} 
                    onChange={(e) => updateField('description', e.target.value)}
                    className={`min-h-[200px] font-sans text-sm ${getErrorClass(currentMV.description)}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase">Release_Year</label>
                  <Input 
                    value={currentMV.year} 
                    onChange={(e) => updateField('year', e.target.value)} 
                    className={getErrorClass(currentMV.year)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase">Full_Date</label>
                  <Input 
                    value={currentMV.date} 
                    onChange={(e) => updateField('date', e.target.value)} 
                    className={getErrorClass(currentMV.date)}
                  />
                </div>
              </div>
            </section>

            {/* 媒體與關聯區塊 */}
            <section className="space-y-6">
              <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">02_Media_Connections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2"><Youtube className="size-3"/> Youtube_ID</label>
                  <Input 
                    value={currentMV.youtube} 
                    onChange={(e) => updateField('youtube', e.target.value)} 
                    className={getErrorClass(currentMV.youtube)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2"><Tv className="size-3"/> Bilibili_BV</label>
                  <Input 
                    value={currentMV.bilibili || ''} 
                    onChange={(e) => updateField('bilibili', e.target.value)} 
                    className={getErrorClass(currentMV.bilibili)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-50 uppercase">Artist / Animator</label>
                  <Input 
                    value={currentMV.artist} 
                    onChange={(e) => updateField('artist', e.target.value)} 
                    className={getErrorClass(currentMV.artist)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2">
                    <Disc className="size-3" /> Albums (每行一個項目)
                  </label>
                  <Textarea 
                    value={currentMV.album?.join('\n')} 
                    onChange={(e) => updateField('album', e.target.value.split('\n').map(s => s.trim()).filter(s => s !== ''))} 
                    className={`min-h-[50px] font-sans text-sm ${getErrorClass(currentMV.album)}`}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2">
                    <Hash className="size-3" /> Keywords / Tags (每行一個項目)
                  </label>
                  <Textarea 
                    value={currentMV.keywords?.join('\n')} 
                    onChange={(e) => updateField('keywords', e.target.value.split('\n').map(s => s.trim()).filter(s => s !== ''))} 
                    className={`min-h-[200px] font-sans text-sm ${getErrorClass(currentMV.keywords)}`}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold opacity-50 uppercase flex items-center gap-2">
                    <ImageIcon className="size-3" /> Cover Images (封面輪播，每行一個網址)
                  </label>
                  <Textarea 
                    value={currentMV.coverImages?.join('\n')} 
                    onChange={(e) => updateField('coverImages', e.target.value.split('\n').map(s => s.trim()).filter(s => s !== ''))} 
                    className={`min-h-[100px] font-sans text-sm ${getErrorClass(currentMV.coverImages)}`}
                  />
                </div>
              </div>
            </section>

            {/* 設定圖管理 (瀑布流數據源) */}
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black uppercase text-main bg-main/10 inline-block px-2">03_Setting_Images_Gallery</h3>
                  <span className="text-[10px] opacity-40 font-bold ml-2">TOTAL_COUNT: {currentMV.images?.length || 0}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="neutral" 
                    size="sm" 
                    onClick={() => handleBatchProbe()} 
                    disabled={!!batchStatus && batchStatus.current < batchStatus.total}
                    className="bg-ztmy-green/10"
                  >
                    <Play className="size-3" /> 一鍵獲取尺寸
                  </Button>
                  <Button variant="neutral" size="sm" onClick={addImage}>
                    <ImageIcon className="size-3" /> 增加圖片
                  </Button>
                </div>
              </div>

              {/* 批處理進度條 */}
              {batchStatus && (
                <div className="border-4 border-black p-4 bg-secondary-background shadow-neo-sm space-y-3">
                  <div className="flex justify-between items-center text-xs font-black uppercase">
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`size-3 ${batchStatus.current < batchStatus.total ? 'animate-spin' : ''}`} />
                      PROBING_PROGRESS: {batchStatus.current} / {batchStatus.total}
                    </div>
                    {batchStatus.failedIndices.length > 0 && (
                      <div className="text-red-500 flex items-center gap-2">
                        <AlertTriangle className="size-3" /> FAILED: {batchStatus.failedIndices.length}
                        <button 
                          onClick={() => handleBatchProbe(batchStatus.failedIndices)}
                          className="underline hover:text-black transition-colors ml-2"
                        >
                          [RETRY_FAILED]
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
                {visibleImages.map((img, imgIdx) => (
                  <div key={imgIdx} className="p-4 border-2 border-black bg-background shadow-neo-sm relative group">
                    <button 
                      onClick={() => removeImage(imgIdx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-black"
                    >
                      <Trash2 className="size-3" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex gap-2">
                          <Input 
                            placeholder="圖片 URL" 
                            value={img.url} 
                            onChange={(e) => updateImage(imgIdx, 'url', e.target.value)} 
                            className={`flex-1 ${!img.url?.trim() ? 'border-red-500/50 bg-red-500/5' : ''}`} />
                          <Button variant="neutral" size="icon" onClick={() => handleProbe(imgIdx, img.url)} title="自動偵測尺寸">
                            <Ruler className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="flex items-center gap-2 bg-black/5 px-2 rounded">
                              <span className="text-[10px] font-bold opacity-40">W</span>
                              <Input 
                                type="number" 
                                placeholder="寬度" 
                                value={img.width || ''} 
                                onChange={(e) => updateImage(imgIdx, 'width', parseInt(e.target.value))} 
                                className={`h-7 border-none bg-transparent shadow-none ${!img.width ? 'text-red-500' : ''}`} />
                           </div>
                           <div className="flex items-center gap-2 bg-black/5 px-2 rounded">
                              <span className="text-[10px] font-bold opacity-40">H</span>
                              <Input 
                                type="number" 
                                placeholder="高度" 
                                value={img.height || ''} 
                                onChange={(e) => updateImage(imgIdx, 'height', parseInt(e.target.value))} 
                                className={`h-7 border-none bg-transparent shadow-none ${!img.height ? 'text-red-500' : ''}`} />
                           </div>
                        </div>
                        <Input placeholder="說明文字 (Caption)" value={img.caption || ''} onChange={(e) => updateImage(imgIdx, 'caption', e.target.value)} />
                        <Input placeholder="替代文字 (Alt)" value={img.alt || ''} onChange={(e) => updateImage(imgIdx, 'alt', e.target.value)} />
                        <RichTextEditor
                          value={img.richText || ''}
                          onChange={(value) => updateImage(imgIdx, 'richText', value)}
                        />
                      </div>
                      <div className="bg-black/5 border-2 border-dashed border-black/10 flex items-center justify-center overflow-hidden">
                        {img.url ? (
                          <img src={getProxyImgUrl(img.url, 'thumb')} className="max-h-40 object-contain" alt="preview" />
                        ) : (
                          <span className="text-[10px] opacity-30">NO_PREVIEW</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 圖片列表分段載入哨兵 */}
                {imageDisplayLimit < (currentMV.images?.length || 0) && (
                  <div ref={imageSentinelRef} className="py-8 flex justify-center border-4 border-dashed border-black/10 bg-black/5">
                    <div className="flex items-center gap-3 text-xs font-black uppercase opacity-40">
                      <RefreshCw className="size-4 animate-spin" />
                      Loading_More_Image_Editor_Fields...
                    </div>
                  </div>
                )}

                {(!currentMV.images || currentMV.images.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-black/10 opacity-30 text-xs italic uppercase">
                    No_Gallery_Data_Found
                  </div>
                )}
              </div>
            </section>
                        {/* 數據架構維護工具 (Schema Maintenance) */}
            <section className="p-6 border-4 border-dashed border-black bg-main/5 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase text-white bg-black px-2">00_Schema_Maintenance</h3>
                <span className="text-[10px] font-bold opacity-50 text-black">批量注入新屬性至所有數據條目</span>
              </div>
              <div className="flex flex-wrap md:flex-nowrap gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-60">New_Field_Key (e.g. director)</label>
                  <Input 
                    value={newFieldName} 
                    onChange={(e) => setNewFieldName(e.target.value)} 
                    placeholder="欄位鍵名" 
                    className="bg-white"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-60">Default_Value</label>
                  <Input 
                    value={newFieldDefaultValue} 
                    onChange={(e) => setNewFieldDefaultValue(e.target.value)} 
                    placeholder="默認值" 
                    className="bg-white"
                  />
                </div>
                <Button variant="default" onClick={handleSyncNewField} className="bg-black text-white shrink-0">
                  <RefreshCw className="size-4" /> 執行全局同步
                </Button>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* 保存確認 AlertDialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase flex items-center gap-2">
              <HelpCircle className="size-6" /> 確認儲存變更
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-bold opacity-80">
              即將把當前所有變更回寫至服務器數據庫 (data.js)，請確認操作！
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
              <AlertTriangle className="size-6" /> {pendingDeleteMV ? '刪除 MV 條目' : '刪除圖片'}
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
    </div>
    
    
  );
}