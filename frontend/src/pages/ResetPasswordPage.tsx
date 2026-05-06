import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPassword } from '@/lib/public-auth';
import { AuthCard } from '@/components/auth/AuthCard';
import { useTranslation } from 'react-i18next';
import { shouldShowSecondaryLang } from '@/i18n';

export function ResetPasswordPage() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = String(params.get('token') || '').trim();
  const redirect = String(params.get('redirect') || '/').trim() || '/';

  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = React.useCallback(async () => {
    if (!token || !password) return;
    setIsSubmitting(true);
    try {
      await resetPassword({ token, password });
      toast.success('已重設密碼並登入');
      navigate(redirect, { replace: true });
    } catch (e: any) {
      toast.error(`重設失敗：${String(e?.message || e)}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate, password, redirect, token]);

  return (
    <AuthCard title="重設密碼" code="RESET_PASSWORD" iconClassName="hn hn-edit" bodyClassName="flex flex-col gap-6" maxWidthClassName="max-w-md">
      <div className="space-y-2">
        <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
          <span className="tracking-normal opacity-70">新密碼</span>
          {shouldShowSecondaryLang(i18n.language) && (
          <span className="text-[10px] font-mono opacity-40 normal-case">NEW_PASSWORD</span>
          )}
        </div>
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
          autoFocus
        />
      </div>
      <Button
        type="button"
        variant="default"
        className="w-full bg-black text-white hover:bg-main hover:text-black shadow-neo border-2 border-transparent transition-colors rounded-none h-12 font-black tracking-widest"
        onClick={onSubmit}
        disabled={isSubmitting || !token || !password}
      >
        <span className="flex flex-col items-center leading-tight">
          <span className="tracking-normal">{isSubmitting ? '處理中...' : '確認重設'}</span>
          {shouldShowSecondaryLang(i18n.language) && (
          <span className="text-[10px] font-mono opacity-60 normal-case">{isSubmitting ? 'APPLYING...' : 'APPLY_'}</span>
          )}
        </span>
      </Button>
    </AuthCard>
  );
}
