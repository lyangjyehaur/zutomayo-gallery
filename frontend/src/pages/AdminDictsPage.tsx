import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { adminFetch, getApiRoot } from '@/lib/admin-api';

interface DictItem {
  id: string;
  category: string;
  code: string;
  label: string;
  description: string;
  sort_order: number;
}

export function AdminDictsPage() {
  const [dicts, setDicts] = useState<DictItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await adminFetch(`${getApiRoot()}/system/dicts`);
      const json = await res.json();
      if (json.success) {
        setDicts(json.data);
      } else {
        toast.error('載入字典失敗');
      }
    } catch (e) {
      toast.error('載入字典失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    toast.promise(
      adminFetch(`${getApiRoot()}/system/dicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dicts, deletedIds })
      }).then(r => r.json()),
      {
        loading: '儲存中...',
        success: (res) => {
          if (res.success) {
            setDicts(res.data);
            setDeletedIds([]);
            return '儲存成功！';
          }
          throw new Error(res.error || '儲存失敗');
        },
        error: '儲存失敗'
      }
    );
  };

  const handleAdd = () => {
    const newId = `dict-${Date.now()}`;
    setDicts([...dicts, { id: newId, category: '', code: '', label: '', description: '', sort_order: 0 }]);
  };

  const handleDelete = (id: string, index: number) => {
    if (!id.startsWith('dict-')) {
      setDeletedIds([...deletedIds, id]);
    }
    const newDicts = [...dicts];
    newDicts.splice(index, 1);
    setDicts(newDicts);
  };

  const handleChange = (index: number, field: keyof DictItem, value: any) => {
    const newDicts = [...dicts];
    newDicts[index] = { ...newDicts[index], [field]: value };
    setDicts(newDicts);
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden font-mono">
      <div className="h-20 border-b-4 border-black bg-card flex items-center justify-between px-8 shadow-neo-sm shrink-0">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest leading-none">字典管理</h1>
          <div className="text-[10px] font-bold opacity-40">DICTIONARY.ADMIN</div>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleAdd} className="bg-ztmy-green text-black hover:bg-ztmy-green/80 border-2 border-black font-black shadow-neo-sm">
            <i className="hn hn-plus mr-2" /> 新增項目
          </Button>
          <Button onClick={handleSave} className="bg-main text-black hover:bg-main/80 border-2 border-black font-black shadow-neo-sm">
            <i className="hn hn-save mr-2" /> 儲存所有變更
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-card/50">
        <div className="max-w-6xl mx-auto space-y-4">
          {isLoading ? (
            <div className="text-center opacity-50 font-bold py-8">載入中...</div>
          ) : dicts.length === 0 ? (
            <div className="text-center opacity-50 font-bold py-8">目前沒有字典項目。</div>
          ) : (
            <div className="grid gap-4">
              {dicts.map((dict, idx) => (
                <div key={dict.id} className="bg-card border-4 border-black p-4 flex flex-col gap-4 shadow-neo">
                  <div className="flex flex-wrap md:flex-nowrap gap-4 items-start">
                    <div className="space-y-1 w-full md:w-1/4">
                      <label className="text-[10px] font-black uppercase opacity-70">Category (分類)</label>
                      <Input value={dict.category} onChange={e => handleChange(idx, 'category', e.target.value)} className="border-2 border-black font-bold h-8" placeholder="e.g. album_type" />
                    </div>
                    <div className="space-y-1 w-full md:w-1/4">
                      <label className="text-[10px] font-black uppercase opacity-70">Code (代碼)</label>
                      <Input value={dict.code} onChange={e => handleChange(idx, 'code', e.target.value)} className="border-2 border-black font-bold h-8" placeholder="e.g. full" />
                    </div>
                    <div className="space-y-1 w-full md:w-1/4">
                      <label className="text-[10px] font-black uppercase opacity-70">Label (顯示名稱)</label>
                      <Input value={dict.label} onChange={e => handleChange(idx, 'label', e.target.value)} className="border-2 border-black font-bold h-8" placeholder="e.g. 完整專輯" />
                    </div>
                    <div className="space-y-1 w-full md:w-[15%]">
                      <label className="text-[10px] font-black uppercase opacity-70">Sort (排序)</label>
                      <Input type="number" value={dict.sort_order} onChange={e => handleChange(idx, 'sort_order', parseInt(e.target.value))} className="border-2 border-black font-bold h-8" />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(dict.id, idx)} className="shrink-0 mt-5 border-2 border-black shadow-neo-sm rounded-none">
                      <i className="hn hn-trash" />
                    </Button>
                  </div>
                  <div className="space-y-1 w-full">
                    <label className="text-[10px] font-black uppercase opacity-70">Description (描述)</label>
                    <Input value={dict.description || ''} onChange={e => handleChange(idx, 'description', e.target.value)} className="border-2 border-black font-bold h-8" placeholder="可選描述" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
