import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerPublicUser } from '@/lib/public-auth';

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
    <div className="w-full max-w-xl mx-auto">
      <div className="border-4 border-black bg-card shadow-shadow p-6 space-y-4">
        <div className="text-2xl font-black tracking-widest uppercase">註冊</div>
        <div className="text-sm opacity-70">註冊後會寄出 Email 驗證連結，完成驗證後即可登入。</div>

        <div className="space-y-2">
          <div className="text-sm font-black">Email</div>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@example.com" />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-black">密碼（至少 8 碼）</div>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-black">顯示名稱（可選）</div>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="你的暱稱…" />
        </div>

        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <Button onClick={onRegister} disabled={isSubmitting}>送出註冊</Button>
          <Button variant="outline" onClick={() => navigate(`/${activeLang}/login`)}>返回登入</Button>
        </div>
      </div>
    </div>
  );
}

