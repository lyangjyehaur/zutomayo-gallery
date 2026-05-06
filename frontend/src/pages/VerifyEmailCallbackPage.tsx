import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatApiError } from '@/lib/api-error';
import { verifyEmail } from '@/lib/public-auth';
import { AuthCard } from '@/components/auth/AuthCard';

export function VerifyEmailCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const params = new URLSearchParams(location.search);
      const token = String(params.get('token') || '').trim();
      const redirect = String(params.get('redirect') || '/').trim() || '/';
      if (!token) {
        toast.error('缺少 token');
        if (!cancelled) navigate(redirect, { replace: true });
        return;
      }
      try {
        await verifyEmail(token);
        if (!cancelled) toast.success('驗證成功，已登入');
      } catch (e: any) {
        if (!cancelled) toast.error(formatApiError(e, '驗證失敗'));
      }
      if (!cancelled) navigate(redirect, { replace: true });
    };
    void run();
    return () => { cancelled = true; };
  }, [location.search, navigate]);

  return (
    <AuthCard title="Email 驗證" code="VERIFY_EMAIL" iconClassName="hn hn-exclamation-triangle" bodyClassName="flex items-center justify-center">
      <div className="font-black tracking-widest uppercase">Verifying…</div>
    </AuthCard>
  );
}
