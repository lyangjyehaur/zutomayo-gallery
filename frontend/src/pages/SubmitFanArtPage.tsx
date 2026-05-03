import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MVItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { toast } from 'sonner';

type LocalTokenItem = { id: string; token: string };

const storageKey = 'ztmy_public_submission_tokens';
const allowedTags: Option[] = [
  { label: 'Collab', value: 'tag:collab' },
  { label: 'AcaNe', value: 'tag:acane' },
  { label: 'Real', value: 'tag:real' },
  { label: 'Uniguri', value: 'tag:uniguri' },
  { label: 'Other', value: 'tag:other' },
];

const readLocalTokens = (): LocalTokenItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((x: any) => x && typeof x.id === 'string' && typeof x.token === 'string')
      .map((x: any) => ({ id: x.id, token: x.token }));
  } catch {
    return [];
  }
};

const writeLocalTokens = (items: LocalTokenItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
  }
};

const upsertLocalToken = (item: LocalTokenItem) => {
  const prev = readLocalTokens();
  const next = [item, ...prev.filter((x) => x.id !== item.id)].slice(0, 50);
  writeLocalTokens(next);
};

interface SubmitFanArtPageProps {
  mvData: MVItem[];
}

export function SubmitFanArtPage({ mvData }: SubmitFanArtPageProps) {
  const { t } = useTranslation();
  const baseApiUrl = useMemo(() => (import.meta.env.VITE_API_URL || '/api').replace(/\/mvs$/, ''), []);

  const mvOptions = useMemo<Option[]>(() => {
    return mvData
      .map((mv) => ({ value: mv.id, label: `${mv.title} (${mv.year || mv.date?.slice(0, 4) || ''})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [mvData]);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [anonToken, setAnonToken] = useState<string | null>(null);
  const [mvIds, setMvIds] = useState<string[]>([]);
  const [specialTags, setSpecialTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [contact, setContact] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [media, setMedia] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('draft');
  const [isBusy, setIsBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (anonToken) h['x-anonymous-token'] = anonToken;
    return h;
  }, [anonToken]);

  const canSubmit = useMemo(() => {
    return (mvIds.length > 0 || specialTags.length > 0) && media.length > 0;
  }, [media.length, mvIds.length, specialTags.length]);

  const createDraft = useCallback(async () => {
    setIsBusy(true);
    try {
      const res = await fetch(`${baseApiUrl}/submissions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mvIds, specialTags, note, contact }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(String(json?.error || 'CREATE_FAILED'));
      const submission = json.data?.submission;
      const token = json.data?.anonymousToken || null;
      if (!submission?.id) throw new Error('BAD_PAYLOAD');
      setDraftId(submission.id);
      setStatus(String(submission.status || 'draft'));
      setAnonToken(token);
      setMedia([]);
      if (token) upsertLocalToken({ id: submission.id, token });
      toast.success('已建立草稿');
    } catch (e: any) {
      toast.error(`建立草稿失敗：${String(e?.message || e)}`);
    } finally {
      setIsBusy(false);
    }
  }, [baseApiUrl, contact, mvIds, note, specialTags]);

  const saveDraft = useCallback(async () => {
    if (!draftId) return;
    setIsBusy(true);
    try {
      const res = await fetch(`${baseApiUrl}/submissions/${encodeURIComponent(draftId)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...authHeaders },
        body: JSON.stringify({ mvIds, specialTags, note, contact }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(String(json?.error || 'SAVE_FAILED'));
      toast.success('已儲存草稿');
    } catch (e: any) {
      toast.error(`儲存失敗：${String(e?.message || e)}`);
    } finally {
      setIsBusy(false);
    }
  }, [authHeaders, baseApiUrl, contact, draftId, mvIds, note, specialTags]);

  const refreshDraft = useCallback(async () => {
    if (!draftId) return;
    setIsBusy(true);
    try {
      const res = await fetch(`${baseApiUrl}/submissions/${encodeURIComponent(draftId)}`, {
        headers: { ...authHeaders },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(String(json?.error || 'LOAD_FAILED'));
      const data = json.data || {};
      setMvIds(Array.isArray(data.mvs) ? data.mvs.map((m: any) => m.id).filter(Boolean) : mvIds);
      setSpecialTags(Array.isArray(data.special_tags) ? data.special_tags : specialTags);
      setNote(String(data.note || ''));
      setContact(String(data.contact || ''));
      setMedia(Array.isArray(data.media) ? data.media : []);
      setStatus(String(data.status || 'draft'));
    } catch (e: any) {
      toast.error(`載入失敗：${String(e?.message || e)}`);
    } finally {
      setIsBusy(false);
    }
  }, [authHeaders, baseApiUrl, draftId, mvIds, specialTags]);

  const addTweet = useCallback(async () => {
    if (!draftId) return;
    const url = tweetUrl.trim();
    if (!url) return;
    setIsBusy(true);
    try {
      const res = await fetch(`${baseApiUrl}/submissions/${encodeURIComponent(draftId)}/add-tweet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders },
        body: JSON.stringify({ tweetUrl: url }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(String(json?.error || 'ADD_TWEET_FAILED'));
      setTweetUrl('');
      setMedia(Array.isArray(json.data) ? json.data : []);
      toast.success('已加入 Tweet 媒體');
    } catch (e: any) {
      toast.error(`加入 Tweet 失敗：${String(e?.message || e)}`);
    } finally {
      setIsBusy(false);
    }
  }, [authHeaders, baseApiUrl, draftId, tweetUrl]);

  const upload = useCallback(async () => {
    if (!draftId) return;
    const input = fileRef.current;
    if (!input?.files || input.files.length === 0) return;
    if (input.files.length > 10) {
      toast.error('一次最多只能上傳 10 個檔案');
      return;
    }

    const fd = new FormData();
    Array.from(input.files).forEach((f) => fd.append('files', f));

    setIsBusy(true);
    try {
      const res = await fetch(`${baseApiUrl}/submissions/${encodeURIComponent(draftId)}/upload`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(String(json?.error || 'UPLOAD_FAILED'));
      setMedia(Array.isArray(json.data) ? json.data : []);
      if (input) input.value = '';
      toast.success('已上傳檔案');
    } catch (e: any) {
      toast.error(`上傳失敗：${String(e?.message || e)}`);
    } finally {
      setIsBusy(false);
    }
  }, [authHeaders, baseApiUrl, draftId]);

  const submit = useCallback(async () => {
    if (!draftId) return;
    if (!canSubmit) {
      toast.error('需至少加入 1 個媒體，且 MV/特殊標籤至少擇一');
      return;
    }
    setIsBusy(true);
    try {
      await saveDraft();
      const res = await fetch(`${baseApiUrl}/submissions/${encodeURIComponent(draftId)}/submit`, {
        method: 'POST',
        headers: { ...authHeaders },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(String(json?.error || 'SUBMIT_FAILED'));
      setStatus('pending');
      toast.success('已送出審核');
    } catch (e: any) {
      toast.error(`送審失敗：${String(e?.message || e)}`);
    } finally {
      setIsBusy(false);
    }
  }, [authHeaders, baseApiUrl, canSubmit, draftId, saveDraft]);

  const [localList, setLocalList] = useState<any[]>([]);
  const refreshLocalList = useCallback(async () => {
    const items = readLocalTokens();
    if (items.length === 0) {
      setLocalList([]);
      return;
    }
    try {
      const res = await fetch(`${baseApiUrl}/submissions/local/list`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setLocalList(json.data);
      }
    } catch {
    }
  }, [baseApiUrl]);

  useEffect(() => {
    void refreshLocalList();
  }, [refreshLocalList]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="border-4 border-black bg-card shadow-shadow p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black tracking-widest uppercase">{t('submit.title', 'FanArt 投稿')}</h2>
          <div className="text-xs font-mono opacity-70">{draftId ? `#${draftId} · ${status}` : 'No draft'}</div>
        </div>

        <div className="mt-3 text-sm opacity-80">
          <div>可匿名投稿；匿名資料會保存在本機。清除瀏覽器資料會導致匿名投稿的編輯/查詢失效，想跨裝置請登入。</div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-black">關聯 MV（可多選，可為空）</div>
            <MultiSelect
              options={mvOptions}
              value={mvIds}
              onChange={setMvIds}
              placeholder="選擇 MV…"
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-black">特殊標籤（可多選，可為空）</div>
            <MultiSelect
              options={allowedTags}
              value={specialTags}
              onChange={setSpecialTags}
              placeholder="選擇標籤…"
            />
          </div>
        </div>

        <div className="mt-3 text-xs font-mono opacity-70">
          MV/標籤至少擇一（不允許兩者都空）
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-black">備註（可選）</div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="想補充的資訊…" />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-black">聯絡方式（可選，僅管理員可見）</div>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email/discord…" />
          </div>
        </div>

        <div className="mt-6 border-t-2 border-black/20 pt-6 space-y-3">
          <div className="text-sm font-black">Tweet 來源</div>
          <div className="flex flex-col md:flex-row gap-3">
            <Input value={tweetUrl} onChange={(e) => setTweetUrl(e.target.value)} placeholder="https://x.com/.../status/..." />
            <Button onClick={addTweet} disabled={!draftId || isBusy || status !== 'draft' && status !== 'rejected'}>加入 Tweet</Button>
          </div>
        </div>

        <div className="mt-6 border-t-2 border-black/20 pt-6 space-y-3">
          <div className="text-sm font-black">Upload（圖片 / mp4）</div>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/mp4"
              className="block w-full text-sm"
            />
            <Button onClick={upload} disabled={!draftId || isBusy || status !== 'draft' && status !== 'rejected'}>上傳</Button>
          </div>
          <div className="text-xs font-mono opacity-70">一次最多 10 個，單檔 ≤ 50MB，影片僅支援 mp4</div>
        </div>

        <div className="mt-6 border-t-2 border-black/20 pt-6">
          <div className="text-sm font-black">媒體預覽</div>
          {media.length === 0 ? (
            <div className="text-sm opacity-70 mt-2">尚未加入媒體</div>
          ) : (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              {media.map((m: any) => {
                const url = m.r2_url || m.original_url || m.thumbnail_url;
                const isVideo = String(m.media_type || '') === 'video';
                if (!url) return null;
                return (
                  <a key={m.id} href={url} target="_blank" rel="noreferrer" className="border-2 border-black bg-background shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="aspect-square bg-black/10 flex items-center justify-center">
                      {isVideo ? (
                        <div className="text-xs font-black">VIDEO</div>
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-3">
          {!draftId ? (
            <Button onClick={createDraft} disabled={isBusy}>建立草稿</Button>
          ) : (
            <>
              <Button onClick={saveDraft} disabled={isBusy || status !== 'draft' && status !== 'rejected'}>儲存草稿</Button>
              <Button onClick={refreshDraft} disabled={isBusy}>重新載入</Button>
              <Button onClick={submit} disabled={isBusy || status !== 'draft' && status !== 'rejected'}>送審</Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 border-4 border-black bg-card shadow-shadow p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-black tracking-widest uppercase">本機投稿記錄</h3>
          <Button onClick={refreshLocalList} variant="outline">刷新</Button>
        </div>
        {localList.length === 0 ? (
          <div className="mt-3 text-sm opacity-70">本機尚無匿名投稿記錄</div>
        ) : (
          <div className="mt-4 space-y-3">
            {localList.map((s: any) => (
              <button
                key={s.id}
                onClick={() => {
                  const token = readLocalTokens().find((x) => x.id === s.id)?.token || null;
                  setDraftId(s.id);
                  setAnonToken(token);
                  setStatus(String(s.status || 'draft'));
                  setNote(String(s.note || ''));
                  setContact(String(s.contact || ''));
                  setSpecialTags(Array.isArray(s.special_tags) ? s.special_tags : []);
                  setMedia(Array.isArray(s.media) ? s.media : []);
                  toast.success(`已切換到投稿 #${s.id}`);
                }}
                className="w-full text-left border-3 border-black bg-background px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-black">{s.id}</div>
                  <div className="text-xs font-mono opacity-70">{String(s.status || '')}</div>
                </div>
                {s.review_reason ? <div className="mt-2 text-xs opacity-70">退回原因：{String(s.review_reason)}</div> : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

