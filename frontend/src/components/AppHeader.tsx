import React, { useState, useCallback, useRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { shouldShowSecondaryLang } from '@/i18n';
import { VERSION_CONFIG } from '@/config/version';

interface AppHeaderProps {
  isGlobalPaused: boolean;
  glitchStyleVars: React.CSSProperties;
  onVersionClick: (e: React.MouseEvent) => void;
  onVersionTouchStart: (e: React.TouchEvent) => void;
}

export const AppHeader = forwardRef<HTMLElement, AppHeaderProps>(function AppHeader({ isGlobalPaused, glitchStyleVars, onVersionClick, onVersionTouchStart }, ref) {
  const { t } = useTranslation();
  const [isTitleHovering, setIsTitleHovering] = useState(false);
  const [titleBurstKey, setTitleBurstKey] = useState(0);
  const titleRef = useRef<HTMLSpanElement>(null);
  const titlePointerRef = useRef<{ x: number; y: number } | null>(null);
  const titleRafRef = useRef<number | null>(null);
  const lastTitleBurstAtRef = useRef(0);

  return (
    <header ref={ref} className="py-12 md:py-16 text-center bg-card relative overflow-hidden z-30">
        <div className="absolute inset-0 opacity-5 pointer-events-none crt-lines"></div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black flex flex-col md:flex-row items-center justify-center gap-2 sm:gap-4 px-2">
          <span
            ref={titleRef}
            className={`ztmy-cyber-title-crt ztmy-cyber-title-glow whitespace-nowrap relative z-10 inline-block pb-[0.2em] -mb-[0.2em] px-[0.1em] -mx-[0.1em] will-change-transform ${isTitleHovering ? 'ztmy-cyber-title-hovering' : ''}`}
            data-text="ZUTOMAYO Gallery"
            style={{
              animation: 'cyber-jitter var(--jitter-dur, 3.5s) infinite linear',
              '--anim-state': isGlobalPaused ? 'paused' : 'running',
              animationPlayState: isGlobalPaused ? "paused" : "running",
              ...glitchStyleVars
            } as React.CSSProperties}
            onMouseEnter={() => {
              setIsTitleHovering(true);
              if (isGlobalPaused) return;
              const now = Date.now();
              if (now - lastTitleBurstAtRef.current < 1200) return;
              lastTitleBurstAtRef.current = now;
              setTitleBurstKey((v) => v + 1);
            }}
            onMouseMove={(e) => {
              const el = titleRef.current;
              if (!el) return;
              titlePointerRef.current = { x: e.clientX, y: e.clientY };
              if (titleRafRef.current != null) return;
              titleRafRef.current = window.requestAnimationFrame(() => {
                titleRafRef.current = null;
                const p = titlePointerRef.current;
                if (!p) return;
                const r = el.getBoundingClientRect();
                const dx = (p.x - (r.left + r.width / 2)) / Math.max(1, r.width / 2);
                const dy = (p.y - (r.top + r.height / 2)) / Math.max(1, r.height / 2);
                const clamp = (v: number) => Math.max(-1, Math.min(1, v));
                el.style.setProperty("--mx", String(clamp(dx)));
                el.style.setProperty("--my", String(clamp(dy)));
              });
            }}
            onMouseLeave={() => {
              setIsTitleHovering(false);
              const el = titleRef.current;
              if (el) {
                el.style.setProperty("--mx", "0");
                el.style.setProperty("--my", "0");
              }
              if (titleRafRef.current != null) {
                cancelAnimationFrame(titleRafRef.current);
                titleRafRef.current = null;
              }
              titlePointerRef.current = null;
            }}
          >
            <span className="ztmy-cyber-hover-layer will-change-transform">
              <span key={titleBurstKey} className="ztmy-cyber-hover-burst" data-text="ZUTOMAYO Gallery"></span>
              <span className="ztmy-cyber-title-scan will-change-transform" data-text="ZUTOMAYO Gallery"></span>
              <span className="ztmy-cyber-text-aberration will-change-transform" data-text="ZUTOMAYO Gallery">
                ZUTOMAYO Gallery
              </span>
            </span>
          </span>
          <span
            className="text-[10px] sm:text-xs md:text-sm bg-main/20 text-main border-2 md:border-3 border-main px-1.5 md:px-2 py-0.5 md:py-1 animate-pulse relative z-10 cursor-pointer select-none"
            style={{
              animationPlayState: isGlobalPaused ? "paused" : "running",
              animationDuration: 'var(--pulse-dur, 2s)',
              ...glitchStyleVars
            }}
            onClick={(e) => {
              e.stopPropagation();
              onVersionClick(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onVersionTouchStart(e);
            }}
            title={t("app.pwa_recover_title", "修復更新/清除快取")}
          >
            V{VERSION_CONFIG.app}
          </span>
        </h1>
        <p className="mt-2 text-sm opacity-70">{t("app.slogan", "日々研磨爆裂中！")}</p>
      </header>
  );
});
