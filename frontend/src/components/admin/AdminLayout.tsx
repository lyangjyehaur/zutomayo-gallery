import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { startAuthentication } from '@simplewebauthn/browser';
import { VERSION_CONFIG } from '@/config/version';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // 螢幕寬度檢測 (手機端阻擋)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 認證狀態
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  
  // 登入追蹤狀態
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginFailures, setLoginFailures] = useState(0);

  // 密碼修改狀態
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      setIsAuthenticated(true);
      setIsInitializing(false);
      localStorage.setItem('ztmy_admin_pwd', 'dev_backdoor');
      return;
    }

    const saved = localStorage.getItem('ztmy_admin_pwd');
    if (saved) {
      verifyPassword(saved, true);
    } else {
      setIsInitializing(false);
    }
  }, []);

  const verifyPassword = async (pwd: string, silent = false) => {
    if (isAuthenticated) return;
    setIsVerifying(true);

    if (!silent && (window as any).umami && typeof (window as any).umami.track === 'function') {
      (window as any).umami.track('Z_Admin_Login_Attempt', { 
        method: 'password', 
        attempt_count: loginAttempts + 1 
      });
      setLoginAttempts(prev => prev + 1);
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const res = await fetch(`${apiUrl}/verify-admin`, {
        method: 'POST',
        headers: { 'x-admin-password': pwd }
      });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        localStorage.setItem('ztmy_admin_pwd', pwd);
        setIsDefaultPassword(data.isDefaultPassword);
        if (!silent) toast.success('登入成功');
      } else {
        if (!silent) {
          toast.error('密碼錯誤或驗證失敗');
          if ((window as any).umami && typeof (window as any).umami.track === 'function') {
            (window as any).umami.track('Z_Admin_Login_Failed', { 
              method: 'password', reason: 'invalid_password', failure_count: loginFailures + 1 
            });
            setLoginFailures(prev => prev + 1);
          }
        }
        localStorage.removeItem('ztmy_admin_pwd');
        setIsAuthenticated(false);
      }
    } catch (e) {
      if (!silent) {
        toast.error('伺服器連線失敗');
        if ((window as any).umami && typeof (window as any).umami.track === 'function') {
          (window as any).umami.track('Z_Admin_Login_Failed', { 
            method: 'password', reason: 'network_error', failure_count: loginFailures + 1 
          });
          setLoginFailures(prev => prev + 1);
        }
      }
      setIsAuthenticated(false);
    } finally {
      setIsVerifying(false);
      setIsInitializing(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (isAuthenticated) return;
    setIsVerifying(true);

    if ((window as any).umami && typeof (window as any).umami.track === 'function') {
      (window as any).umami.track('Z_Admin_Login_Attempt', { method: 'passkey', attempt_count: loginAttempts + 1 });
      setLoginAttempts(prev => prev + 1);
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const authApiUrl = apiUrl.replace(/\/mvs$/, '/auth');
      
      const resp = await fetch(`${authApiUrl}/generate-auth-options`);
      const options = await resp.json();
      if (options.error) throw new Error(options.error);

      const asseResp = await startAuthentication({ optionsJSON: options });
      const verifyResp = await fetch(`${authApiUrl}/verify-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asseResp)
      });
      const verifyResult = await verifyResp.json();
      if (verifyResult.success) {
        setIsAuthenticated(true);
        localStorage.setItem('ztmy_admin_pwd', verifyResult.token);
        setIsDefaultPassword(verifyResult.isDefaultPassword);
        toast.success('Passkey 登入成功');
      } else {
        toast.error('Passkey 驗證失敗');
        if ((window as any).umami && typeof (window as any).umami.track === 'function') {
          (window as any).umami.track('Z_Admin_Login_Failed', { method: 'passkey', reason: 'verification_failed', failure_count: loginFailures + 1 });
          setLoginFailures(prev => prev + 1);
        }
      }
    } catch (e: any) {
      toast.error('Passkey 登入失敗: ' + e.message);
      if ((window as any).umami && typeof (window as any).umami.track === 'function') {
        (window as any).umami.track('Z_Admin_Login_Failed', { method: 'passkey', reason: 'error_or_cancelled', failure_count: loginFailures + 1 });
        setLoginFailures(prev => prev + 1);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(false);
    localStorage.removeItem('ztmy_admin_pwd');
    setIsAuthenticated(false);
    toast.success('已安全登出');
    navigate('/admin');
  };

  const handleChangePassword = async () => {
    if (!isDefaultPassword && !oldPwd) return toast.error('請輸入舊密碼');
    if (newPwd.length < 4) return toast.error('密碼至少需要4個字元');
    if (newPwd === 'zutomayo') return toast.error('不能修改回初始密碼');
    if (newPwd !== confirmPwd) return toast.error('兩次密碼輸入不一致');
    
    setIsSavingPwd(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
      const authApiUrl = apiUrl.replace(/\/mvs$/, '/auth');
      
      const res = await fetch(`${authApiUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('ztmy_admin_pwd') || ''
        },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('密碼修改成功，請重新登入');
        setIsChangePwdOpen(false);
        setOldPwd('');
        setNewPwd('');
        setConfirmPwd('');
        handleLogout();
      } else {
        toast.error(data.error || '密碼修改失敗');
      }
    } catch (e) {
      toast.error('伺服器連線失敗');
    } finally {
      setIsSavingPwd(false);
    }
  };

  // 手機端阻擋畫面
  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-mono text-foreground crt-lines relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5 crt-lines-global" />
        <i className="hn hn-exclamation-triangle text-6xl text-main mb-6 animate-pulse" />
        <h1 className="text-2xl font-black mb-4 uppercase tracking-widest">不支援行動裝置</h1>
        <p className="text-sm opacity-70 mb-8 max-w-xs leading-relaxed">
          管理後台包含大量數據操作與複雜的介面，為了確保操作安全與體驗，請使用電腦版瀏覽器存取此頁面。
        </p>
        <Button onClick={() => navigate('/')} className="bg-black text-white hover:bg-main hover:text-black font-bold uppercase tracking-widest shadow-neo rounded-none">
          返回首頁 (RETURN_HOME)
        </Button>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-foreground crt-lines p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5 crt-lines-global" />
        <div className="text-xl font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
          <i className="hn hn-refresh text-xl animate-spin" />
          <span className="flex flex-col leading-tight">
            <span className="tracking-normal opacity-70">驗證中...</span>
            <span className="text-[10px] font-mono opacity-40 normal-case">AUTHENTICATING...</span>
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-foreground crt-lines p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5 crt-lines-global" />
        <div className="w-full max-w-sm bg-card border-4 border-black shadow-neo flex flex-col z-10 relative">
          <div className="h-10 bg-black text-white flex items-center justify-between px-4 border-b-4 border-black">
            <span className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <i className="hn hn-exclamation-triangle text-base" />
              <span className="flex flex-col leading-tight">
                <span className="tracking-normal opacity-90">管理員驗證</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">ADMIN_AUTH</span>
              </span>
            </span>
            <div className="flex gap-2">
              <div className="size-3 rounded-full bg-main" />
              <div className="size-3 rounded-full bg-ztmy-green" />
              <div className="size-3 rounded-full bg-red-500" />
            </div>
          </div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              verifyPassword(passwordInput);
            }} 
            className="p-8 flex flex-col gap-6"
          >
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest flex flex-col leading-tight">
                <span className="tracking-normal opacity-70">存取碼</span>
                <span className="text-[10px] font-mono opacity-40 normal-case">ACCESS_CODE</span>
              </label>
              <Input
                type="password"
                placeholder="請輸入密碼... (ENTER_PASSWORD...)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="font-mono bg-black/5 border-2 border-black focus-visible:ring-black rounded-none h-12"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              variant="default" 
              className="w-full bg-black text-white hover:bg-main hover:text-black shadow-neo border-2 border-transparent transition-colors rounded-none h-12 font-black tracking-widest"
              disabled={isVerifying || !passwordInput}
            >
              <span className="flex flex-col items-center leading-tight">
                <span className="tracking-normal">{isVerifying ? '驗證中...' : '登入'}</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">{isVerifying ? 'VERIFYING...' : 'LOGIN_'}</span>
              </span>
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-black/20"></span></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-black/50 font-bold flex flex-col items-center leading-tight">
                  <span className="tracking-normal">或</span>
                  <span className="text-[10px] font-mono opacity-60 normal-case">OR</span>
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="neutral"
              className="w-full h-12 font-black tracking-widest flex items-center justify-center gap-2 border-2 border-black"
              onClick={handlePasskeyLogin}
              disabled={isVerifying}
            >
              <i className="hn hn-user text-xl" />
              <span className="flex flex-col items-center leading-tight">
                <span className="tracking-normal">使用 Passkey 登入</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">PASSKEY LOGIN</span>
              </span>
            </Button>
          </form>
          <div className="bg-secondary-background border-t-4 border-black p-3 flex justify-between items-center text-[10px] opacity-70">
            <span>SYS.AUTH.v{VERSION_CONFIG.app}</span>
            <button onClick={() => navigate('/')} className="hover:underline hover:text-main transition-colors uppercase">
              <span className="flex flex-col items-end leading-tight">
                <span className="tracking-normal">{'<'} 返回首頁</span>
                <span className="text-[10px] font-mono opacity-60 normal-case">Return_Home</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: '/admin', label: 'MV 管理', icon: 'hn-video', subLabel: 'MV_MANAGER' },
    { path: '/admin/artists', label: '畫師管理', icon: 'hn-user', subLabel: 'ARTISTS' },
    { path: '/admin/albums', label: '專輯管理', icon: 'hn-disc', subLabel: 'ALBUMS' },
    { path: '/admin/apple-music-albums', label: 'AM 專輯管理', icon: 'hn-music', subLabel: 'APPLE MUSIC' },
    { path: '/admin/fanart', label: 'FanArt', icon: 'hn-image', subLabel: 'FANART' },
    { path: '/admin/dicts', label: '字典管理', icon: 'hn-book', subLabel: 'DICTIONARIES' },
    { path: '/admin/db', label: '資料庫', icon: 'hn-table', subLabel: 'DATABASE' }
  ];

  return (
    <div className="flex h-screen bg-background text-foreground font-mono font-normal overflow-hidden">
      {/* 側邊導覽欄 */}
      <aside className="w-64 border-r-4 border-black bg-card flex flex-col shrink-0 z-40">
        <div className="h-20 border-b-4 border-black flex items-center px-6">
          <Button variant="neutral" size="icon" onClick={() => navigate('/')} className="rounded-full bg-black text-white hover:bg-main hover:text-black border-2 border-transparent transition-all shadow-neo-sm mr-4 shrink-0">
            <i className="hn hn-arrow-left text-xl" />
          </Button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-widest leading-none">管理台</h1>
            <div className="text-[10px] font-bold opacity-40 font-mono normal-case tracking-widest">ZTMY.ADMIN</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 border-2 transition-all rounded-none font-bold uppercase tracking-widest group ${
                  isActive 
                    ? 'border-black bg-black text-white shadow-neo' 
                    : 'border-transparent text-foreground hover:border-black hover:bg-black/5'
                }`}
              >
                <i className={`hn ${item.icon} text-xl ${isActive ? 'text-main' : 'opacity-70 group-hover:opacity-100'}`} />
                <div className="flex flex-col leading-tight">
                  <span className="tracking-normal">{item.label}</span>
                  <span className={`text-[10px] font-mono normal-case ${isActive ? 'opacity-70' : 'opacity-40'}`}>
                    {item.subLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t-4 border-black space-y-2">
          {isDefaultPassword && (
            <div className="bg-red-600 text-white p-2 text-center text-xs font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-2 mb-2 relative shrink-0">
              <span className="flex items-center gap-1"><i className="hn hn-exclamation-triangle animate-pulse" /> 初始密碼風險</span>
              <Button size="sm" variant="neutral" className="h-6 text-[10px] bg-white text-red-600 hover:bg-gray-200 shadow-none border-transparent px-2 w-full" onClick={() => setIsChangePwdOpen(true)}>
                修改密碼
              </Button>
            </div>
          )}
          
          {!isDefaultPassword && (
            <Button 
              variant="neutral" 
              className="w-full justify-start gap-2 border-2 border-transparent hover:border-black font-bold uppercase"
              onClick={() => setIsChangePwdOpen(true)}
            >
              <i className="hn hn-key text-base opacity-70" /> 修改密碼
            </Button>
          )}
          
          <Button 
            variant="neutral" 
            className="w-full justify-start gap-2 border-2 border-transparent hover:border-black text-red-500 hover:text-red-600 hover:bg-red-50 font-bold uppercase"
            onClick={() => setIsLogoutConfirmOpen(true)}
          >
            <i className="hn hn-logout text-base" /> 登出系統
          </Button>
        </div>
      </aside>

      {/* 主內容區 */}
      <main className="flex-1 flex flex-col min-w-0 bg-secondary-background/30 relative">
        <Outlet />
      </main>

      {/* 登出確認對話框 */}
      <AlertDialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
        <AlertDialogContent className="border-4 border-black rounded-none shadow-neo-lg bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-xl flex items-center gap-2 uppercase">
              <i className="hn hn-exclamation-circle text-red-500 text-2xl" />
              <span className="flex flex-col leading-tight">
                <span className="tracking-normal">確定要登出嗎？</span>
                <span className="text-[10px] font-mono opacity-40 normal-case">CONFIRM_LOGOUT</span>
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-sm font-bold opacity-80 pt-2">
              登出後需要重新輸入密碼或使用 Passkey 驗證才能再次進入管理後台。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2">
            <AlertDialogCancel className="flex-1 border-2 border-black hover:bg-secondary-background shadow-neo-sm rounded-none font-bold">
              取消
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="flex-1 bg-red-500 text-white hover:bg-red-600 border-2 border-black shadow-neo rounded-none font-bold"
            >
              確定登出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 修改密碼對話框 */}
      <Dialog open={isChangePwdOpen} onOpenChange={setIsChangePwdOpen}>
        <DialogContent className="border-4 border-black rounded-none shadow-neo-lg bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-xl flex items-center gap-2 uppercase">
              <i className="hn hn-key text-2xl" />
              <span className="flex flex-col leading-tight">
                <span className="tracking-normal">修改管理員密碼</span>
                <span className="text-[10px] font-mono opacity-40 normal-case">CHANGE_PASSWORD</span>
              </span>
            </DialogTitle>
            <DialogDescription className="font-mono text-sm font-bold opacity-80">
              {isDefaultPassword ? '為了系統安全，請立即修改預設密碼。' : '請輸入舊密碼與新密碼。'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {!isDefaultPassword && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-70">舊密碼 (OLD_PASSWORD)</label>
                <Input
                  type="password"
                  value={oldPwd}
                  onChange={e => setOldPwd(e.target.value)}
                  className="font-mono border-2 border-black focus-visible:ring-black rounded-none"
                  placeholder="輸入舊密碼..."
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest opacity-70">新密碼 (NEW_PASSWORD)</label>
              <Input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                className="font-mono border-2 border-black focus-visible:ring-black rounded-none"
                placeholder="輸入新密碼 (至少4字元)..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest opacity-70">確認新密碼 (CONFIRM_PASSWORD)</label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                className="font-mono border-2 border-black focus-visible:ring-black rounded-none"
                placeholder="再次輸入新密碼..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="neutral" onClick={() => setIsChangePwdOpen(false)} className="border-2 border-black font-bold uppercase rounded-none" disabled={isSavingPwd}>
              取消
            </Button>
            <Button onClick={handleChangePassword} className="bg-black text-white hover:bg-main hover:text-black font-bold uppercase shadow-neo border-2 border-transparent transition-colors rounded-none" disabled={isSavingPwd || !newPwd || !confirmPwd || (!isDefaultPassword && !oldPwd)}>
              {isSavingPwd ? '儲存中...' : '確認修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
