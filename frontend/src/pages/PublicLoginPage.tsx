import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginPublicUser, usePublicMe } from '@/lib/public-auth';
import { AuthCard } from '@/components/auth/AuthCard';

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
    <AuthCard title="用戶登入" code="USER_LOGIN" iconClassName="hn hn-user" bodyClassName="flex flex-col gap-6" maxWidthClassName="max-w-md">
      {isLoading ? <div className="text-sm opacity-70">Loading…</div> : null}

      <div className="space-y-2">
        <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
          <span className="tracking-normal opacity-70">Email</span>
          <span className="text-[10px] font-mono opacity-40 normal-case">EMAIL</span>
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

      <div className="space-y-2">
        <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
          <span className="tracking-normal opacity-70">密碼</span>
          <span className="text-[10px] font-mono opacity-40 normal-case">PASSWORD</span>
        </div>
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
        />
      </div>

      <Button
        type="button"
        variant="default"
        className="w-full bg-black text-white hover:bg-main hover:text-black shadow-neo border-2 border-transparent transition-colors rounded-none h-12 font-black tracking-widest"
        onClick={onLogin}
        disabled={isSubmitting || !email.trim() || !password}
      >
        <span className="flex flex-col items-center leading-tight">
          <span className="tracking-normal">{isSubmitting ? '驗證中...' : '登入'}</span>
          <span className="text-[10px] font-mono opacity-60 normal-case">{isSubmitting ? 'VERIFYING...' : 'LOGIN_'}</span>
        </span>
      </Button>

      <div className="flex flex-col md:flex-row gap-3">
        <Button variant="neutral" className="w-full h-12 font-black tracking-widest border-2 border-black rounded-none" onClick={() => navigate(`/${activeLang}/register`)}>
          註冊
        </Button>
        <Button variant="neutral" className="w-full h-12 font-black tracking-widest border-2 border-black rounded-none" onClick={() => navigate(`/${activeLang}/forgot`)}>
          忘記密碼
        </Button>
      </div>
    </AuthCard>
  );
}
