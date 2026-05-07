import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getSystemApiBase } from '@/lib/admin-api';

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

const StarRating = ({ onRate, disabled }: { onRate: (rating: number) => void; disabled?: boolean }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const value = percent < 0.5 ? index - 0.5 : index;
    setHoverRating(value);
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex space-x-2" onMouseLeave={() => setHoverRating(0)}>
      {[1, 2, 3, 4, 5].map((index) => {
        const isFull = displayRating >= index;
        const isHalf = displayRating === index - 0.5;

        return (
          <div
            key={index}
            role="button"
            aria-label={`Rate ${index} stars`}
            className={`relative w-10 h-10 transition-transform ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
            onMouseMove={(e) => handleMouseMove(e, index)}
            onClick={() => {
              if (disabled) return;
              setRating(hoverRating);
              onRate(hoverRating);
            }}
            data-umami-event="Z_Submit_Speed_Rating"
            data-umami-event-rating={hoverRating || index}
          >
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-foreground fill-current stroke-current opacity-20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>

            {(isFull || isHalf) && (
              <div
                className="absolute top-0 left-0 overflow-hidden text-main"
                style={{ width: isHalf ? '50%' : '100%' }}
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export function SpeedRatingSurvey({ forceOpen = false, onCloseForce }: { forceOpen?: boolean; onCloseForce?: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useActiveTimer(60, () => {
    if (shouldShowSurvey()) {
      setOpen(true);
    }
  });

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

  const submitToBackend = async (payload: { rating: number; comment?: string; url: string; userAgent: string }) => {
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

  const handleRate = async (value: number) => {
    setRating(value);
    setIsSubmitting(true);

    const payload = {
      rating: value,
      comment: comment.trim() || undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    try {
      await submitToBackend(payload);
      setSurveyRecord({ shown: true, submittedAt: new Date().toISOString() });
      toast.success(t('survey.toast_success', '感謝您的 {{rating}} 星評價！', { rating: value }), {
        description: t('survey.toast_desc', '您的反饋已記錄，這將幫助我們優化加載速度。'),
      });
      setSubmitted(true);
      setTimeout(() => {
        handleOpenChange(false);
        setTimeout(() => {
          setSubmitted(false);
          setRating(0);
          setComment('');
        }, 300);
      }, 1500);
    } catch {
      toast.error(t('survey.submit_error', '提交失敗，請稍後再試'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] crt-lines border-4 border-foreground bg-card shadow-neo p-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
            <i className="hn hn-clock text-2xl"></i>
            {t('survey.title', '加載速度調查')}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] opacity-70 absolute right-6 top-8">
            LOAD_SPEED_SURVEY
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8 px-4 gap-6">
          {submitted ? (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300 py-4">
              <i className="hn hn-check text-4xl text-main mb-2"></i>
              <h3 className="font-black text-lg">{t('survey.received', '反饋已接收')}</h3>
              <p className="text-xs opacity-70 mt-1 font-bold">{t('survey.thanks', '謝謝您協助我們變得更好！')}</p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm font-bold">{t('survey.question', '您覺得目前的網頁加載速度如何？')}</p>
                <p className="text-xs opacity-60 font-bold bg-foreground/5 inline-block px-2 py-1">
                  {t('survey.hint', '支援半星評分，滑動預覽')}
                </p>
              </div>
              <div className="py-2">
                <StarRating onRate={handleRate} disabled={isSubmitting} />
              </div>
              <div className="w-full space-y-2">
                <Textarea
                  placeholder={t('survey.comment_placeholder', '還有其他建議嗎？（選填）')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[80px] rounded-none border-2 border-foreground bg-background text-sm resize-none"
                />
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="neutral"
                  className="flex-1 rounded-none border-2 border-foreground font-black tracking-widest"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {t('common.cancel', '取消')}
                </Button>
                <Button
                  className="flex-1 rounded-none bg-main text-black hover:bg-main/90 font-black tracking-widest border-2 border-transparent"
                  onClick={() => rating > 0 && handleRate(rating)}
                  disabled={rating <= 0 || isSubmitting}
                >
                  {isSubmitting ? t('common.loading', '提交中...') : t('common.confirm', '確認')}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
