import React, { useState, useEffect, useRef, ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = {
  imageUrl: string
  caption: string
  className?: string
  children?: ReactNode
}

export default function ImageCard({ imageUrl, caption, className, children }: Props) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isOverflow, setIsOverflow] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)

  // 檢測標題是否溢出
  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const check = () => {
      setIsOverflow(inner.scrollWidth > outer.clientWidth)
    }

    check()
    const observer = new ResizeObserver(check)
    observer.observe(outer)
    return () => observer.disconnect()
  }, [caption])

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-base border-2 border-border bg-main font-base shadow-shadow",
        className,
      )}
    >
      <div className="relative aspect-16/9 bg-secondary-background overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 animate-pulse bg-main/10 flex flex-col items-center justify-center gap-2">
            <div className="size-5 border-2 border-black/10 border-t-black animate-spin rounded-full" />
            <span className="text-[8px] font-black opacity-20 uppercase tracking-tighter">Syncing_Visual...</span>
          </div>
        )}
        <img 
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-110 blur-xl"
          )} 
          src={imageUrl} 
          alt="image" 
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      
      <figcaption className="border-t-2 text-main-foreground border-border p-4">
        {/* 滾動標題區域 */}
        <div 
          ref={outerRef}
          className="overflow-hidden relative text-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span
            ref={innerRef}
            className={cn(
              "inline-block whitespace-nowrap font-base",
              isOverflow ? "animate-marquee-title" : "truncate"
            )}
            style={isOverflow ? {
              animationPlayState: isHovered ? "paused" : "running"
            } : undefined}
          >
            {caption}
            {isOverflow && (
              <>
                <span className="inline-block w-4">&nbsp;</span>
                {caption}
              </>
            )}
          </span>
        </div>
        
        {/* 額外的子內容 */}
        {children}
      </figcaption>
    </figure>
  )
}
