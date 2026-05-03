import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerPublicUser } from '@/lib/public-auth';
import { AuthCard } from '@/components/auth/AuthCard';

export function PublicRegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const activeLang = React.useMemo(() => {
    const parts = (location.pathname || '/').split('/');
    const maybeLng = parts[1];
    return maybeLng && maybeLng.length > 0 ? maybeLng : 'zh-TW';
  }, [location.pathname]);

  const redirectUrl = `/${activeLang}/me/submissions`;

  const onRegister = React.useCallback(async () => {
    const em = email.trim();
    if (!em || !password) return;
    setIsSubmitting(true);
    try {
      const result: any = await registerPublicUser({ email: em, password, display_name: displayName.trim() || undefined, redirectUrl });
      if (result?.link) {
        toast.success('已產生驗證連結（dev）');
        try {
          await navigator.clipboard.writeText(String(result.link));
          toast.success('驗證連結已複製');
        } catch {
        }
      } else {
        toast.success('已寄出註冊驗證信，請至信箱完成驗證');
      }
      navigate(`/${activeLang}/login`, { replace: true });
    } catch (e: any) {
      toast.error(`註冊失敗：${String(e?.message || e)}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [activeLang, displayName, email, navigate, password, redirectUrl]);

  return (
    <AuthCard title="用戶註冊" code="USER_REGISTER" iconClassName="hn hn-edit" bodyClassName="flex flex-col gap-6" maxWidthClassName="max-w-md">
      <div className="text-sm opacity-70">註冊後會寄出 Email 驗證連結，完成驗證後即可登入。</div>

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

      <div className="space-y-2">
        <div className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
          <span className="tracking-normal opacity-70">顯示名稱</span>
          <span className="text-[10px] font-mono opacity-40 normal-case">DISPLAY_NAME</span>
        </div>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="你的暱稱…"
          className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
        />
      </div>

      <Button
        type="button"
        variant="default"
        className="w-full bg-black text-white hover:bg-main hover:text-black shadow-neo border-2 border-transparent transition-colors rounded-none h-12 font-black tracking-widest"
        onClick={onRegister}
        disabled={isSubmitting || !email.trim() || !password}
      >
        <span className="flex flex-col items-center leading-tight">
          <span className="tracking-normal">{isSubmitting ? '送出中...' : '送出註冊'}</span>
          <span className="text-[10px] font-mono opacity-60 normal-case">{isSubmitting ? 'SUBMITTING...' : 'REGISTER_'}</span>
        </span>
      </Button>

      <Button variant="neutral" className="w-full h-12 font-black tracking-widest border-2 border-black rounded-none" onClick={() => navigate(`/${activeLang}/login`)}>
        返回登入
      </Button>
    </AuthCard>
  );
}
