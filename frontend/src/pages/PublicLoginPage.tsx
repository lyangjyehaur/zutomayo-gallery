import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logoutPublicUser, requestMagicLink, updatePublicMe, usePublicMe } from '@/lib/public-auth';

export function PublicLoginPage({ redirectUrl }: { redirectUrl: string }) {
  const { t } = useTranslation();
  const { data: me, mutate, isLoading } = usePublicMe();

  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [displayName, setDisplayName] = React.useState('');
  const [x, setX] = React.useState('');
  const [instagram, setInstagram] = React.useState('');
  const [pixiv, setPixiv] = React.useState('');
  const [youtube, setYoutube] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [publicEnabled, setPublicEnabled] = React.useState(false);
  const [fieldDisplayName, setFieldDisplayName] = React.useState(true);
  const [fieldSocials, setFieldSocials] = React.useState(true);
  const [fieldEmailMasked, setFieldEmailMasked] = React.useState(true);

  React.useEffect(() => {
    if (!me) return;
    setDisplayName(String(me.display_name || ''));
    setPublicEnabled(Boolean(me.public_profile_enabled));
    const fields = me.public_profile_fields || {};
    setFieldDisplayName(fields.display_name !== false);
    setFieldSocials(fields.socials !== false);
    setFieldEmailMasked(fields.email_masked !== false);
    const socials = me.social_links || {};
    setX(String(socials.x || ''));
    setInstagram(String(socials.instagram || ''));
    setPixiv(String(socials.pixiv || ''));
    setYoutube(String(socials.youtube || ''));
    setWebsite(String(socials.website || ''));
  }, [me]);

  const onRequest = React.useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      const result: any = await requestMagicLink(trimmed, redirectUrl);
      if (result?.link) {
        toast.success('已產生登入連結（dev）');
        try {
          await navigator.clipboard.writeText(String(result.link));
          toast.success('登入連結已複製');
        } catch {
        }
      } else {
        toast.success(t('login.sent', '已寄出登入連結，請檢查信箱'));
      }
    } catch (e: any) {
      toast.error(`寄送失敗：${String(e?.message || e)}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, redirectUrl, t]);

  const onLogout = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await logoutPublicUser();
      await mutate(null, { revalidate: false });
      toast.success('已登出');
    } catch (e: any) {
      toast.error(`登出失敗：${String(e?.message || e)}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const onSaveProfile = React.useCallback(async () => {
    if (!me) return;
    setIsSubmitting(true);
    try {
      await updatePublicMe({
        display_name: displayName,
        social_links: { x, instagram, pixiv, youtube, website },
        public_profile_enabled: publicEnabled,
        public_profile_fields: {
          display_name: fieldDisplayName,
          socials: fieldSocials,
          email_masked: fieldEmailMasked,
        },
      } as any);
      await mutate();
      toast.success('已儲存');
    } catch (e: any) {
      toast.error(`儲存失敗：${String(e?.message || e)}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, fieldDisplayName, fieldEmailMasked, fieldSocials, instagram, me, mutate, pixiv, publicEnabled, website, x, youtube]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="border-4 border-black bg-card shadow-shadow p-6">
        <div className="text-2xl font-black tracking-widest uppercase">{t('login.title', '登入 / 註冊')}</div>
        <div className="mt-2 text-sm opacity-80">
          使用 Email 魔法連結登入；若帳號不存在會自動建立。
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            type="email"
          />
          <Button onClick={onRequest} disabled={isSubmitting}>
            寄送登入連結
          </Button>
        </div>

        <div className="mt-6 border-t-2 border-black/20 pt-6">
          {isLoading ? (
            <div className="text-sm opacity-70">Loading…</div>
          ) : me ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black">已登入：{me.email || me.id}</div>
                <Button variant="outline" onClick={onLogout} disabled={isSubmitting}>登出</Button>
              </div>

              <div className="border-2 border-black bg-background p-4 space-y-3">
                <div className="text-sm font-black">公開資訊設定</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-black">顯示名稱</div>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-black">Website</div>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-black">X</div>
                    <Input value={x} onChange={(e) => setX(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-black">Instagram</div>
                    <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-black">Pixiv</div>
                    <Input value={pixiv} onChange={(e) => setPixiv(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-black">YouTube</div>
                    <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <label className="flex items-center gap-3 font-bold text-sm">
                    <input type="checkbox" checked={publicEnabled} onChange={(e) => setPublicEnabled(e.target.checked)} />
                    啟用公開個人頁
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 font-bold text-xs">
                      <input type="checkbox" checked={fieldDisplayName} onChange={(e) => setFieldDisplayName(e.target.checked)} />
                      顯示名稱
                    </label>
                    <label className="flex items-center gap-2 font-bold text-xs">
                      <input type="checkbox" checked={fieldSocials} onChange={(e) => setFieldSocials(e.target.checked)} />
                      社交連結
                    </label>
                    <label className="flex items-center gap-2 font-bold text-xs">
                      <input type="checkbox" checked={fieldEmailMasked} onChange={(e) => setFieldEmailMasked(e.target.checked)} />
                      Email 掩碼
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={onSaveProfile} disabled={isSubmitting}>儲存設定</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm opacity-70">
              尚未登入。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

