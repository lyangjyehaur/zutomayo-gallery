import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPassword } from '@/lib/public-auth';

export function ResetPasswordPage() {
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
    <div className="w-full max-w-xl mx-auto">
      <div className="border-4 border-black bg-card shadow-shadow p-6 space-y-4">
        <div className="text-2xl font-black tracking-widest uppercase">重設密碼</div>
        <div className="space-y-2">
          <div className="text-sm font-black">新密碼（至少 8 碼）</div>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
        </div>
        <div className="pt-2">
          <Button onClick={onSubmit} disabled={isSubmitting || !token}>確認重設</Button>
        </div>
      </div>
    </div>
  );
}

