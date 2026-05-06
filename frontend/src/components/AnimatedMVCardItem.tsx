import { memo, useRef, useState, useEffect, useCallback } from "react";
import { MVItem } from "@/lib/types";
import { MVCard } from "@/components/MVCard";
import { useLazyImage } from "@/hooks/useLazyImage";

export const AnimatedMVCardItem = memo(function AnimatedMVCardItem({
  mv,
  isFav,
  onToggleFav,
  onClick,
  delayMs,
  isPaused,
}: {
  mv: MVItem;
  isFav: boolean;
  onToggleFav: (id: string) => void;
  onClick: (id: string) => void;
  delayMs: number;
  isPaused: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { elementRef, shouldLoad } = useLazyImage({
    rootMargin: "300px",
    threshold: 0,
    triggerOnce: true,
  });

  const [isInView, setIsInView] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isEffectivelyPaused = isPaused || !isInView;

  const handleToggleFav = useCallback(() => onToggleFav(mv.id), [onToggleFav, mv.id]);
  const handleClick = useCallback(() => onClick(mv.id), [onClick, mv.id]);

  return (
    <div ref={elementRef} style={{ contentVisibility: 'auto', containIntrinsicSize: '300px' }} className="p-1">
      <div
        ref={containerRef}
        className={shouldLoad ? "animate-in fade-in slide-in-from-bottom-8 duration-700 motion-reduce:animate-none" : "opacity-0 translate-y-8"}
        style={shouldLoad ? {
          animationDelay: `${delayMs}ms`,
          animationFillMode: "both",
        } : {}}
      >
        <div style={{ animationPlayState: isEffectivelyPaused ? "paused" : "running", height: "100%" }}>
          {shouldLoad && (
            <MVCard
              mv={mv}
              isFav={isFav}
              onToggleFav={handleToggleFav}
              onClick={handleClick}
              isPaused={isEffectivelyPaused}
            />
          )}
        </div>
      </div>
    </div>
  );
});
