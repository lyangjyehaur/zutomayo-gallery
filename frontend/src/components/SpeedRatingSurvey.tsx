import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getSystemApiBase } from '@/lib/admin-api';
import { MODAL_THEME } from '@/lib/theme';
import { ScrollArea } from '@/components/ui/scroll-area';

const SURVEY_SHOWN_KEY = 'speed_rating_shown_v2';
const SURVEY_COOLDOWN_DAYS = 30;

function getSurveyRecord(): { shown?: boolean; submittedAt?: string; dismissedAt?: string } {
  try {
    const raw = localStorage.getItem(SURVEY_SHOWN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setSurveyRecord(record: { shown?: boolean; submittedAt?: string; dismissedAt?: string }) {
  try {
    localStorage.setItem(SURVEY_SHOWN_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

function shouldShowSurvey(): boolean {
  const record = getSurveyRecord();
  if (!record.submittedAt && !record.dismissedAt) return true;
  const last = record.submittedAt || record.dismissedAt;
  if (!last) return true;
  const daysSince = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= SURVEY_COOLDOWN_DAYS;
}

export function useActiveTimer(thresholdSeconds = 60, onTrigger: () => void) {
  const activeTimeRef = useRef(0);
  const lastActiveTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!shouldShowSurvey()) return;

    const handleActivity = () => {
      lastActiveTimeRef.current = Date.now();
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    const startTimer = () => {
      timerRef.current = setInterval(() => {
        if (document.hidden) return;
        const now = Date.now();
        if (now - lastActiveTimeRef.current < 5000) {
          activeTimeRef.current += 1;
          const isPaused = now - lastActiveTimeRef.current > 2000;
          if (activeTimeRef.current >= thresholdSeconds && isPaused) {
            onTrigger();
            if (timerRef.current) clearInterval(timerRef.current);
            events.forEach(e => window.removeEventListener(e, handleActivity));
          }
        }
      }, 1000);
    };

    startTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [thresholdSeconds, onTrigger]);
}

// ============ Web Vitals & Performance Data Collection ============

interface PerfMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  imageLoadAvg?: number;
  imageLoadCount?: number;
}

interface NetworkInfo {
  connectionType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

const perfMetricsRef: PerfMetrics = {};
const imageLoadTimes: number[] = [];

function initPerfObservers() {
  if (typeof window === 'undefined') return;

  // LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime?: number };
      if (last && 'startTime' in last) {
        perfMetricsRef.lcp = Math.round(last.startTime * 100) / 100;
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] as any });
  } catch { /* ignore */ }

  // FID
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { processingStart?: number; startTime?: number };
        if (e.processingStart && e.startTime) {
          perfMetricsRef.fid = Math.round((e.processingStart - e.startTime) * 100) / 100;
        }
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] as any });
  } catch { /* ignore */ }

  // CLS
  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (!e.hadRecentInput && e.value) {
          perfMetricsRef.cls = (perfMetricsRef.cls || 0) + e.value;
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] as any });
  } catch { /* ignore */ }

  // FCP & TTFB from navigation
  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const nav = navEntries[0];
    if (nav) {
      if (nav.responseStart > 0) {
        perfMetricsRef.ttfb = Math.round(nav.responseStart * 100) / 100;
      }
    }
    const paintEntries = performance.getEntriesByType('paint');
    for (const entry of paintEntries) {
      if (entry.name === 'first-contentful-paint') {
        perfMetricsRef.fcp = Math.round(entry.startTime * 100) / 100;
      }
    }
  } catch { /* ignore */ }

  // Image load tracking
  try {
    const imgObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceResourceTiming;
        if (e.initiatorType === 'img' && e.responseEnd > e.startTime) {
          const duration = e.responseEnd - e.startTime;
          if (duration > 0 && duration < 60000) {
            imageLoadTimes.push(duration);
          }
        }
      }
    });
    imgObserver.observe({ entryTypes: ['resource'] as any });
  } catch { /* ignore */ }
}

function getNetworkInfo(): NetworkInfo {
  if (typeof navigator === 'undefined') return {};
  const conn = (navigator as any).connection;
  if (!conn) return {};
  return {
    connectionType: conn.effectiveType,
    downlink: conn.downlink,
    rtt: conn.rtt,
    saveData: conn.saveData,
  };
}

function getPerfMetrics(): PerfMetrics {
  const result = { ...perfMetricsRef };
  if (imageLoadTimes.length > 0) {
    const avg = imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length;
    result.imageLoadAvg = Math.round(avg * 100) / 100;
    result.imageLoadCount = imageLoadTimes.length;
  }
  return result;
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initPerfObservers();
}

// ============ Star Rating Component ============

const StarRating = ({
  value,
  onRate,
  disabled,
  size = 'md',
}: {
  value: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const val = percent < 0.5 ? index - 0.5 : index;
    setHoverRating(val);
  };

  const displayRating = hoverRating || value;
  const iconSize = size === 'sm' ? 'text-lg' : 'text-xl';

  return (
    <div className="flex space-x-0.5" onMouseLeave={() => setHoverRating(0)}>
      {[1, 2, 3, 4, 5].map((index) => {
        const isFull = displayRating >= index;
        const isHalf = displayRating === index - 0.5;

        return (
          <div
            key={index}
            role="button"
            aria-label={`Rate ${index} stars`}
            className={`relative ${iconSize} transition-transform leading-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
            onMouseMove={(e) => handleMouseMove(e, index)}
            onClick={() => {
              if (disabled) return;
              onRate(hoverRating);
            }}
          >
            <i className={`hn hn-star ${iconSize} opacity-20`}></i>

            {(isFull || isHalf) && (
              <div
                className="absolute top-0 left-0 overflow-hidden text-main"
                style={{ width: isHalf ? '50%' : '100%' }}
              >
                <i className={`hn hn-star-solid ${iconSize}`}></i>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============ Survey Dimensions ============

type DimensionKey = 'speed' | 'experience' | 'imageQuality' | 'ui' | 'search';

interface Dimension {
  key: DimensionKey;
  icon: string;
}

const DIMENSIONS: Dimension[] = [
  { key: 'speed', icon: 'hn-clock' },
  { key: 'experience', icon: 'hn-sparkles' },
  { key: 'imageQuality', icon: 'hn-image' },
  { key: 'ui', icon: 'hn-thumbsup' },
  { key: 'search', icon: 'hn-search' },
];

// ============ Main Component ============

export function SpeedRatingSurvey({ forceOpen = false, onCloseForce }: { forceOpen?: boolean; onCloseForce?: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ratings, setRatings] = useState<Record<DimensionKey, number>>({
    speed: 0,
    experience: 0,
    imageQuality: 0,
    ui: 0,
    search: 0,
  });
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      if (!submitted && !isSubmitting) {
        const record = getSurveyRecord();
        setSurveyRecord({ ...record, dismissedAt: new Date().toISOString() });
      }
      if (onCloseForce) {
        onCloseForce();
      }
    }
  }, [submitted, isSubmitting, onCloseForce]);

  const hasAnyRating = Object.values(ratings).some((r) => r > 0);

  const submitToBackend = async (payload: Record<string, unknown>) => {
    const res = await fetch(`${getSystemApiBase()}/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const handleSubmit = async () => {
    if (!hasAnyRating) return;
    setIsSubmitting(true);

    const network = getNetworkInfo();
    const perf = getPerfMetrics();

    const payload: Record<string, unknown> = {
      ratingSpeed: ratings.speed > 0 ? ratings.speed : undefined,
      ratingExperience: ratings.experience > 0 ? ratings.experience : undefined,
      ratingImageQuality: ratings.imageQuality > 0 ? ratings.imageQuality : undefined,
      ratingUi: ratings.ui > 0 ? ratings.ui : undefined,
      ratingSearch: ratings.search > 0 ? ratings.search : undefined,
      comment: comment.trim() || undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...network,
      ...perf,
    };

    try {
      await submitToBackend(payload);
      setSurveyRecord({ shown: true, submittedAt: new Date().toISOString() });

      const ratedCount = Object.values(ratings).filter((r) => r > 0).length;
      toast.success(t('survey.toast_success', '感謝您的評價！', { count: ratedCount }), {
        description: t('survey.toast_desc', '您的反饋已記錄，這將幫助我們優化體驗。'),
      });
      setSubmitted(true);
      setTimeout(() => {
        handleOpenChange(false);
        setTimeout(() => {
          setSubmitted(false);
          setRatings({ speed: 0, experience: 0, imageQuality: 0, ui: 0, search: 0 });
          setComment('');
        }, 300);
      }, 1500);
    } catch {
      toast.error(t('survey.submit_error', '提交失敗，請稍後再試'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRate = (key: DimensionKey, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName={MODAL_THEME.overlay.dialog}
        className={`w-screen h-[100dvh] max-w-none md:max-w-2xl md:w-full md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col p-0 border-0 md:border-4 border-black ${MODAL_THEME.content.dialog} sm:rounded-none rounded-none shadow-none md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] fixed top-0 left-0 md:top-[50%] md:left-[50%] !translate-x-0 !translate-y-0 md:!translate-x-[-50%] md:!translate-y-[-50%] z-[100]`}
      >
        <div className={MODAL_THEME.crt}></div>

        <div className="p-4 md:p-8 relative flex-1 flex flex-col overflow-hidden min-h-0 z-10">
          <DialogHeader className="relative z-10 mb-4 md:mb-6 shrink-0">
            <DialogTitle className="text-2xl md:text-4xl font-black uppercase tracking-tighter flex items-center gap-2 md:gap-3">
              <i className="hn hn-face-thinking text-main"></i>
              <span>{t('survey.title', '訪問體驗調查')}</span>
            </DialogTitle>
            <DialogDescription className="text-sm md:text-lg font-bold opacity-70 mt-2">
              {t('survey.question', '您覺得以下各方面的體驗如何？')}
            </DialogDescription>
          </DialogHeader>

          <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-h-0">
            <ScrollArea className="flex-1 min-h-0 w-full">
              <div className="pl-3 md:pl-4 py-1 space-y-4 pr-4">
          {submitted ? (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300 py-4">
              <i className="hn hn-check text-4xl text-main mb-2"></i>
              <h3 className="font-black text-lg">{t('survey.received', '反饋已接收')}</h3>
              <p className="text-xs opacity-70 mt-1 font-bold">{t('survey.thanks', '謝謝您協助我們變得更好！')}</p>
            </div>
          ) : (
            <>
              <p className="text-xs opacity-60 font-bold bg-foreground/5 inline-block px-2 py-1">
                {t('survey.hint', '支援半星評分，選填即可提交')}
              </p>

              <div className="w-full space-y-3">
                {DIMENSIONS.map((dim) => (
                  <div key={dim.key} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <i className={`hn ${dim.icon} text-main text-sm`}></i>
                      <span className="text-xs font-bold whitespace-nowrap">
                        {t(`survey.dim_${dim.key}`, dim.key)}
                      </span>
                    </div>
                    <StarRating
                      value={ratings[dim.key]}
                      onRate={(v) => handleRate(dim.key, v)}
                      disabled={isSubmitting}
                      size="sm"
                    />
                  </div>
                ))}
              </div>

              <div className="w-full space-y-2">
                <Textarea
                  placeholder={t('survey.comment_placeholder', '還有其他建議嗎？（選填）')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[80px] rounded-none border-2 border-black bg-background text-sm resize-none"
                />
              </div>
            </>
          )}
              </div>
            </ScrollArea>

            {!submitted && (
            <div className="flex gap-2 mt-4 md:mt-6 shrink-0 pb-2 px-1">
              <Button
                variant="neutral"
                className="flex-1 rounded-none border-2 border-black font-black tracking-widest"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel', '取消')}
              </Button>
              <Button
                className="flex-1 rounded-none bg-main text-black hover:bg-main/90 font-black tracking-widest border-2 border-black"
                onClick={handleSubmit}
                disabled={!hasAnyRating || isSubmitting}
              >
                {isSubmitting ? t('common.loading', '提交中...') : t('common.confirm', '確認')}
              </Button>
            </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
