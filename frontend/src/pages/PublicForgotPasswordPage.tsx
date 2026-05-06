import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatApiError } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestPasswordReset } from '@/lib/public-auth';
import { AuthCard } from '@/components/auth/AuthCard';
import { useTranslation } from 'react-i18next';
import { shouldShowSecondaryLang } from '@/i18n';

export function PublicForgotPasswordPage() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const activeLang = React.useMemo(() => {
    const parts = (location.pathname || '/').split('/');
    const maybeLng = parts[1];
    return maybeLng && maybeLng.length > 0 ? maybeLng : 'zh-TW';
  }, [location.pathname]);

  const redirectUrl = `/${activeLang}/me/submissions`;

  const onSubmit = React.useCallback(async () => {
    const em = email.trim();
    if (!em) return;
    setIsSubmitting(true);
    try {
      await requestPasswordReset({ email: em, redirectUrl });
      toast.success('如果帳號存在，已寄出重設密碼信件');
      navigate(`/${activeLang}/login`, { replace: true });
    } catch (e: any) {
      toast.error(formatApiError(e, '操作失敗'));
    } finally {
      setIsSubmitting(false);
    }
  }, [activeLang, email, navigate, redirectUrl]);

  return (
    <AuthCard title="找回密碼" code="FORGOT_PASSWORD" iconClassName="hn hn-exclamation-triangle" bodyClassName="flex flex-col gap-6" maxWidthClassName="max-w-md">
      <div className="text-sm opacity-70">輸入 Email 後會寄出重設密碼連結。</div>

      <div className="space-y-2">
        <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
          <span className="tracking-normal opacity-70">Email</span>
          {shouldShowSecondaryLang(i18n.language) && (
          <span className="text-[10px] font-mono opacity-40 normal-case">EMAIL</span>
          )}
        </div>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          type="email"
          className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
          autoFocus
        />
      </div>

      <Button
        type="button"
        variant="default"
        className="w-full bg-black text-white hover:bg-main hover:text-black shadow-neo border-2 border-transparent transition-colors rounded-none h-12 font-black tracking-widest"
        onClick={onSubmit}
        disabled={isSubmitting || !email.trim()}
      >
        <span className="flex flex-col items-center leading-tight">
          <span className="tracking-normal">{isSubmitting ? '送出中...' : '寄送重設密碼信'}</span>
          {shouldShowSecondaryLang(i18n.language) && (
          <span className="text-[10px] font-mono opacity-60 normal-case">{isSubmitting ? 'SENDING...' : 'SEND_'}</span>
          )}
        </span>
      </Button>

      <Button variant="neutral" className="w-full h-12 font-black tracking-widest border-2 border-black rounded-none" onClick={() => navigate(`/${activeLang}/login`)}>
        返回登入
      </Button>
    </AuthCard>
  );
}
