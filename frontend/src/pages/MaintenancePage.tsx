import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { shouldShowSecondaryLang } from "@/i18n";
import { VERSION_CONFIG } from "@/config/version";
import { useGeoLabel } from "@/hooks/useGeoLabel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MaintenancePageProps {
  type?: 'data' | 'ui';
  eta?: string | null;
}

export function MaintenancePage({ type = 'ui', eta }: MaintenancePageProps) {
  const { t, i18n } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const geoInfo = useGeoLabel();

  // 記錄虛擬頁面瀏覽：系統維護中
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).umami && typeof (window as any).umami.track === 'function') {
      (window as any).umami.track((props: any) => ({
        ...props,
        url: '/virtual/maintenance',
        title: '系統維護中'
      }));
    }
  }, []);

  useEffect(() => {
    if (!eta) {
      setTimeLeft(t('maintenance.unknown_time', '未知'));
      return;
    }

    const targetDate = new Date(eta).getTime();
    if (isNaN(targetDate)) {
      setTimeLeft(t('maintenance.unknown_time', '未知'));
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        setTimeLeft(t('maintenance.almost_done', '即將完成'));
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}${t('maintenance.days_suffix', '天')}`);
      parts.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      
      setTimeLeft(parts.join(' '));
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [eta]);

  return (
    <div className="dark min-h-screen bg-background text-foreground font-base flex flex-col items-center justify-center p-6 selection:bg-main selection:text-black crt relative overflow-hidden">
      <Helmet>
        <title>{type === 'ui' ? t('maintenance.title_ui', '系統升級中') : t('maintenance.title_sys', '系統維護中')} - ZUTOMAYO Gallery</title>
      </Helmet>
      
      {/* 背景格線與掃描線 */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute inset-0 opacity-10 pointer-events-none crt-lines"></div>

      <div className="w-full max-w-md bg-card border-4 border-black shadow-neo flex flex-col relative z-10">
        <div className="flex items-center justify-between px-4 py-2 border-b-4 border-black bg-black/5">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-yellow-500 animate-pulse shadow-[2px_2px_0_0_rgba(234,179,8,0.4)]"></div>
            <span className="text-[10px] font-black uppercase tracking-widest flex flex-col leading-tight">
              <span className="tracking-normal flex items-baseline gap-1.5 opacity-60">
                {t('maintenance.status', '系統狀態')} {shouldShowSecondaryLang(i18n.language) && <span className="text-[8px] font-mono normal-case">System_Status</span>}
              </span>
              <span className="tracking-normal text-yellow-500 flex items-baseline gap-1.5">
                {type === 'ui' ? t('maintenance.upgrading', '升級中') : t('maintenance.maintaining', '維護中')} {shouldShowSecondaryLang(i18n.language) && <span className="text-[8px] font-mono normal-case">{type === 'ui' ? 'Upgrading' : 'Maintenance'}</span>}
              </span>
            </span>
          </div>
        </div>

        <div className="p-8 flex flex-col items-center text-center gap-6">
          <div className="w-24 h-24 border-4 border-black bg-yellow-500/20 flex items-center justify-center shadow-neo-sm relative">
            <i className="hn hn-cog text-5xl text-yellow-500 animate-spin"></i>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-black uppercase tracking-widest text-yellow-500 mb-1">
              {type === 'ui' ? t('maintenance.title_ui', '系統升級中') : t('maintenance.title_sys', '系統維護中')}
            </h1>
            <p className="text-xs font-mono opacity-60 tracking-widest uppercase">
              {shouldShowSecondaryLang(i18n.language) && (type === 'ui' ? 'SYSTEM_UPGRADE_IN_PROGRESS' : 'SYSTEM_UNDER_MAINTENANCE')}
            </p>
          </div>
          
          <div className="w-full h-1 bg-border/30 my-2"></div>
          
          <p className="text-sm font-bold opacity-80 leading-relaxed max-w-xs">
            {type === 'ui' 
              ? t('maintenance.desc_ui', '資料庫主視覺與 UI 介面正在進行全新升級，敬請期待。')
              : t('maintenance.desc_sys', '站長目前正在進行資料庫維護與系統更新，請稍後再回來。')}
          </p>

          <div className="mt-4 px-8 py-3 border-2 border-black bg-black text-main uppercase flex flex-col items-center gap-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
            <span className="flex flex-col items-center leading-tight opacity-80">
              <span className="tracking-normal font-bold text-xs">{t('maintenance.eta', '預估恢復時間')}</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[8px] font-mono opacity-60 normal-case mt-0.5">ESTIMATED_TIME_TO_RECOVERY</span>
              )}
            </span>
            <span className="flex flex-col items-center leading-tight text-white glitch-text">
              <span className="tracking-normal font-black text-sm">{timeLeft || t('maintenance.unknown', '未定')}</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[8px] font-mono opacity-60 normal-case mt-0.5 text-main">{!eta ? 'UNKNOWN' : 'COUNTDOWN'}</span>
              )}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-12 text-[10px] uppercase tracking-[0.2em] text-center flex flex-col items-center gap-1">
        <a
          href="https://dan.tw"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 font-black border-2 border-main px-4 py-2 bg-black text-main group transition-all hover:bg-main hover:text-black mb-4"
          title="前往開發者個人網站"
        >
          <img 
            src={`https://${geoInfo.isChinaIP ? 'cravatar.cn' : 'gravatar.com'}/avatar/2ad947c5152cd8d6d2f9b5bd450d939b?s=80&d=retro`} 
            alt="DANERSAKA" 
            className="w-8 h-8 rounded-sm border-2 border-current group-hover:border-black transition-colors"
          />
          <div className="flex flex-col items-start leading-tight">
            <div className="flex gap-2 items-center">
              <span className="opacity-90">{t('maintenance.by', '由 飯糰 製作')}</span>
              <i className="hn hn-heart-solid text-red-500 group-hover:animate-pulse text-[12px] leading-none"></i>
            </div>
            <span className="text-[8px] font-mono">
              {shouldShowSecondaryLang(i18n.language) && (<><span className="opacity-60">MADE_WITH{" "}</span>
              <i className="hn hn-heart-solid opacity-90 text-red-500 group-hover:animate-pulse text-[10px] leading-none"></i>{" "}
              <span className="opacity-60">BY_DANERSAKA</span></>)}
            </span>
          </div>
        </a>
        <span className="flex items-center gap-1 flex-wrap justify-center">
          <span className="opacity-30">© {new Date().getFullYear()} {t('maintenance.db', 'ZTMY MV 資料庫')} V{VERSION_CONFIG.app} | </span>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span 
                className="cursor-help border-b border-dashed border-current hover:text-main transition-colors select-none opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
              >
                {geoInfo.labelCn}
              </span>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              align="center" 
              sideOffset={10} 
              className="max-w-[250px] text-left z-[100] bg-main text-main-foreground shadow-md opacity-100"
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <div className="flex flex-col gap-1">
                <p className="text-xs leading-relaxed font-bold tracking-normal normal-case opacity-100">{geoInfo.desc}</p>
                {geoInfo.details && (
                  <div className="mt-1 pt-1 border-t border-black/20 text-[10px] font-mono opacity-80 leading-tight tracking-normal normal-case">
                    {geoInfo.details.province && geoInfo.details.city ? (
                      <p>LOC: {geoInfo.details.city.startsWith(geoInfo.details.province) || geoInfo.details.province.startsWith(geoInfo.details.city) || geoInfo.details.province === geoInfo.details.city ? geoInfo.details.city || geoInfo.details.province : `${geoInfo.details.province} ${geoInfo.details.city}`}</p>
                    ) : geoInfo.details.province ? (
                      <p>LOC: {geoInfo.details.province}</p>
                    ) : geoInfo.details.city ? (
                      <p>LOC: {geoInfo.details.city}</p>
                    ) : null}
                    {geoInfo.details.isp && (
                      <p>ISP: {geoInfo.details.isp}</p>
                    )}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </span>
        <span className="opacity-30 normal-case text-[8px] flex flex-col gap-0.5">
          <span>ZUTOMAYO_MV_GALLERY</span>
          <span className="flex items-center gap-1 flex-wrap justify-center">
            BUILD_{import.meta.env.VITE_BUILD_DATE?.replace(/-/g, '')}_{import.meta.env.VITE_BUILD_HASH || 'dev'} | 
            <span className="uppercase">{geoInfo.labelEn}</span>
          </span>
        </span>
      </div>
    </div>
  );
}
