import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestPasswordReset } from '@/lib/public-auth';

export function PublicForgotPasswordPage() {
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
      toast.error(`操作失敗：${String(e?.message || e)}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [activeLang, email, navigate, redirectUrl]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="border-4 border-black bg-card shadow-shadow p-6 space-y-4">
        <div className="text-2xl font-black tracking-widest uppercase">忘記密碼</div>
        <div className="text-sm opacity-70">輸入 Email 後會寄出重設密碼連結。</div>

        <div className="space-y-2">
          <div className="text-sm font-black">Email</div>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@example.com" />
        </div>

        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <Button onClick={onSubmit} disabled={isSubmitting}>寄送重設密碼信</Button>
          <Button variant="outline" onClick={() => navigate(`/${activeLang}/login`)}>返回登入</Button>
        </div>
      </div>
    </div>
  );
}

