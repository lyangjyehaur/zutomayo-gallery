import React, { useEffect, useRef, useState, ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = {
  imageUrl: string
  caption: string
  className?: string
  children?: ReactNode
  media?: ReactNode
  isPaused?: boolean
  lang?: string
}

const MARQUEE_GAP = 24
const MARQUEE_SPEED = 48
const MIN_MARQUEE_DURATION = 8

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updatePreference()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference)
      return () => mediaQuery.removeEventListener("change", updatePreference)
    }

    mediaQuery.addListener(updatePreference)
    return () => mediaQuery.removeListener(updatePreference)
  }, [])

  return prefersReducedMotion
}

export default function ImageCard({ imageUrl, caption, className, children, media, isPaused, lang }: Props) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isOverflow, setIsOverflow] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [marqueeDistance, setMarqueeDistance] = useState(0)
  const [animationDuration, setAnimationDuration] = useState(MIN_MARQUEE_DURATION)
  const prefersReducedMotion = usePrefersReducedMotion()
  const outerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)

  // 檢測標題是否溢出
  useEffect(() => {
    const outer = outerRef.current
    const measure = measureRef.current
    if (!outer || !measure) return

    const check = () => {
      const textWidth = Math.ceil(measure.scrollWidth)
      const containerWidth = Math.ceil(outer.clientWidth)
      const overflow = textWidth > containerWidth

      setIsOverflow(overflow)

      if (!overflow) {
        setMarqueeDistance(0)
        setAnimationDuration(MIN_MARQUEE_DURATION)
        return
      }

      const nextDistance = textWidth + MARQUEE_GAP
      setMarqueeDistance(nextDistance)
      setAnimationDuration(Math.max(nextDistance / MARQUEE_SPEED, MIN_MARQUEE_DURATION))
    }

    const scheduleCheck = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(check)
    }

    let frameId = window.requestAnimationFrame(check)
    const fonts = "fonts" in document ? document.fonts : null

    if (fonts?.ready) {
      fonts.ready.then(scheduleCheck).catch(() => {})
    }

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(scheduleCheck)

      observer.observe(outer)
      observer.observe(measure)

      return () => {
        window.cancelAnimationFrame(frameId)
        observer.disconnect()
      }
    }

    const handleResize = () => {
      scheduleCheck()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener("resize", handleResize)
    }
  }, [caption])

  const shouldWrapText = prefersReducedMotion && isOverflow

  const marqueeStyle = isOverflow && !shouldWrapText
    ? ({
        "--marquee-distance": `${marqueeDistance}px`,
        "--marquee-duration": `${animationDuration}s`,
        animationName: "image-card-title-marquee",
        animationDuration: `${animationDuration}s`,
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
        animationPlayState: isPaused || isHovered ? "paused" : "running",
        willChange: "transform",
      } as React.CSSProperties)
    : undefined

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-base border-2 border-border bg-main font-base",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 300px' }}
    >
      <style>{`
        @keyframes image-card-title-marquee {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(calc(var(--marquee-distance, 0px) * -1), 0, 0);
          }
        }
      `}</style>
      <div className="relative aspect-16/9 bg-secondary-background overflow-hidden">
        {media ? (
          media
        ) : (
          <>
            <div className="absolute inset-0 animate-pulse bg-main/10 flex flex-col items-center justify-center gap-2 z-0 transition-opacity duration-700 pointer-events-none" style={{ opacity: isLoaded ? 0 : 1, willChange: 'opacity' }}>
              <div className="size-5 border-2 border-black/10 border-t-black animate-spin rounded-full" />
              <span className="text-[8px] font-black uppercase tracking-tighter flex flex-col items-center leading-tight">
                <span className="opacity-40 tracking-normal">同步視覺中...</span>
                <span className="font-mono opacity-20 normal-case">Syncing_Visual...</span>
              </span>
            </div>
            {imageUrl && (
              <img 
                className={cn(
                  "w-full h-full object-cover relative z-10",
                )} 
                style={{
                  opacity: isLoaded ? 1 : 0,
                  transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  willChange: 'opacity'
                }}
                src={imageUrl} 
                alt="圖片 (image)" 
                onLoad={() => setIsLoaded(true)}
                loading="lazy"
                decoding="async"
              />
            )}
          </>
        )}
      </div>
      
      <figcaption className="border-t-2 text-main-foreground border-border bg-secondary-background">
        {/* 滾動標題區域 */}
        <div 
          ref={outerRef}
          className="relative overflow-hidden border-b-2 border-border bg-main px-0 py-2 min-[521px]:py-3 text-main-foreground"
          title={caption}
          data-testid="image-card-caption-container"
          lang={lang}
        >
            <span
              ref={measureRef}
              aria-hidden="true"
              data-testid="image-card-caption-measure"
              className="pointer-events-none absolute invisible inline-block whitespace-nowrap px-2 min-[521px]:px-3 font-heading uppercase tracking-wide text-xs min-[521px]:text-sm"
            >
            {caption}
          </span>

          {shouldWrapText ? (
            <span
              data-testid="image-card-caption-wrap"
              className="block whitespace-normal break-words px-2 min-[521px]:px-3 text-center font-heading leading-snug text-xs min-[521px]:text-sm"
            >
              {caption}
            </span>
          ) : isOverflow ? (
            <div className="overflow-hidden">
              <div
                data-testid="image-card-caption-track"
                className="flex w-max whitespace-nowrap font-heading uppercase tracking-wide text-xs min-[521px]:text-sm"
                style={{
                  ...marqueeStyle,
                  gap: `${MARQUEE_GAP}px`,
                }}
              >
                <span className="shrink-0 px-2 min-[521px]:px-3">
                  {caption}
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 px-2 min-[521px]:px-3"
                >
                  {caption}
                </span>
              </div>
            </div>
          ) : (
            <span
              data-testid="image-card-caption-static"
              className="block truncate px-2 min-[521px]:px-3 text-center font-heading uppercase tracking-wide text-xs min-[521px]:text-sm"
            >
              {caption}
            </span>
          )}
        </div>
        
        {/* 額外的子內容 */}
        {children && <div className="px-0 pb-0 bg-main">{children}</div>}
      </figcaption>
    </figure>
  )
}
