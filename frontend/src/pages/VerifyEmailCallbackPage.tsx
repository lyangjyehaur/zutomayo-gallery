import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { verifyEmail } from '@/lib/public-auth';
import { AuthCard } from '@/components/auth/AuthCard';

export function VerifyEmailCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(location.search);
      const token = String(params.get('token') || '').trim();
      const redirect = String(params.get('redirect') || '/').trim() || '/';
      if (!token) {
        toast.error('缺少 token');
        navigate(redirect, { replace: true });
        return;
      }
      try {
        await verifyEmail(token);
        toast.success('驗證成功，已登入');
      } catch (e: any) {
        toast.error(`驗證失敗：${String(e?.message || e)}`);
      }
      navigate(redirect, { replace: true });
    };
    void run();
  }, [location.search, navigate]);

  return (
    <AuthCard title="Email 驗證" code="VERIFY_EMAIL" iconClassName="hn hn-exclamation-triangle" bodyClassName="flex items-center justify-center">
      <div className="font-black tracking-widest uppercase">Verifying…</div>
    </AuthCard>
  );
}
