import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function useActiveTimer(thresholdSeconds = 60, onTrigger: () => void) {
  const activeTimeRef = useRef(0);
  const lastActiveTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (localStorage.getItem('speed_rating_shown')) return;

    const handleActivity = () => {
      lastActiveTimeRef.current = Date.now();
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, handleActivity));

    timerRef.current = setInterval(() => {
      const now = Date.now();
      // 如果距離上次操作在 5 秒內，算作「正在交互」
      if (now - lastActiveTimeRef.current < 5000) {
        activeTimeRef.current += 1;
        
        // 為了避免打斷用戶，要求用戶至少暫停操作 2 秒才彈窗
        const isPaused = now - lastActiveTimeRef.current > 2000;
        
        if (activeTimeRef.current >= thresholdSeconds && isPaused) {
          onTrigger();
          localStorage.setItem('speed_rating_shown', 'true');
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    }, 1000);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [thresholdSeconds, onTrigger]);
}

const StarRating = ({ onRate }: { onRate: (rating: number) => void }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
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
            className="relative cursor-pointer w-10 h-10 transition-transform hover:scale-110 active:scale-95"
            onMouseMove={(e) => handleMouseMove(e, index)}
            onClick={() => {
              setRating(hoverRating);
              onRate(hoverRating);
            }}
          >
            {/* 底色星星 */}
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-foreground fill-current stroke-current opacity-20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            
            {/* 實心星星 (全星或半星) */}
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

export function SpeedRatingSurvey({ forceOpen = false, onCloseForce }: { forceOpen?: boolean, onCloseForce?: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useActiveTimer(60, () => {
    setOpen(true);
  });

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onCloseForce) {
      onCloseForce();
    }
  };

  const handleRate = async (rating: number) => {
    // 顯示成功提示
    toast.success(`感謝您的 ${rating} 星評價！`, {
      description: '您的反饋已記錄，這將幫助我們優化加載速度。'
    });
    setSubmitted(true);
    
    // 這裡未來可以接入真實的後端 API
    console.log('Submitted rating:', rating);
    
    setTimeout(() => {
      handleOpenChange(false);
      setTimeout(() => setSubmitted(false), 300); // 關閉動畫結束後重置狀態
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] crt-lines border-4 border-foreground bg-card shadow-neo p-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
            <i className="hn hn-clock text-2xl"></i> 加載速度調查
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] opacity-70 absolute right-6 top-8">
            LOAD_SPEED_SURVEY
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8 px-4 gap-6">
          {submitted ? (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300 py-4">
              <i className="hn hn-check text-4xl text-main mb-2"></i>
              <h3 className="font-black text-lg">反饋已接收</h3>
              <p className="text-xs opacity-70 mt-1 font-bold">謝謝您協助我們變得更好！</p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm font-bold">您覺得目前的網頁加載速度如何？</p>
                <p className="text-xs opacity-60 font-bold bg-foreground/5 inline-block px-2 py-1">💡 支援半星評分，滑動預覽</p>
              </div>
              <div className="py-2">
                <StarRating onRate={handleRate} />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
