import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginPublicUser, usePublicMe } from '@/lib/public-auth';

export function PublicLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: me, mutate, isLoading } = usePublicMe();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const activeLang = React.useMemo(() => {
    const parts = (location.pathname || '/').split('/');
    const maybeLng = parts[1];
    return maybeLng && maybeLng.length > 0 ? maybeLng : 'zh-TW';
  }, [location.pathname]);

  React.useEffect(() => {
    if (!me) return;
    navigate(`/${activeLang}/me/submissions`, { replace: true });
  }, [activeLang, me, navigate]);

  const onLogin = React.useCallback(async () => {
    const em = email.trim();
    if (!em || !password) return;
    setIsSubmitting(true);
    try {
      await loginPublicUser({ email: em, password });
      await mutate();
      toast.success('登入成功');
      navigate(`/${activeLang}/me/submissions`, { replace: true });
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg === 'EMAIL_NOT_VERIFIED') {
        toast.error('Email 尚未驗證，請先完成註冊信件驗證');
      } else {
        toast.error(`登入失敗：${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [activeLang, email, mutate, navigate, password]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="border-4 border-black bg-card shadow-shadow p-6 space-y-4">
        <div className="text-2xl font-black tracking-widest uppercase">登入</div>
        {isLoading ? <div className="text-sm opacity-70">Loading…</div> : null}

        <div className="space-y-2">
          <div className="text-sm font-black">Email</div>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@example.com" />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-black">密碼</div>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
        </div>

        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <Button onClick={onLogin} disabled={isSubmitting}>登入</Button>
          <Button variant="outline" onClick={() => navigate(`/${activeLang}/register`)}>註冊</Button>
          <Button variant="outline" onClick={() => navigate(`/${activeLang}/forgot`)}>忘記密碼</Button>
        </div>
      </div>
    </div>
  );
}

