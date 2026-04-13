import React, { useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  imageUrl: string
  caption: string
  className?: string
}

export default function ImageCard({ imageUrl, caption, className }: Props) {
  const [isLoaded, setIsLoaded] = useState(false)

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
        <p className="text-center font-base">{caption}</p>
      </figcaption>
    </figure>
  )
}
