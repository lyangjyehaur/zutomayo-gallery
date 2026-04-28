"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageItem {
  id: string;
  url: string;
  originalName: string;
  user?: {
    username: string;
  };
}

export default function ImageSquarePage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchImages() {
      try {
        const res = await fetch("/api/images?public=true&limit=50");
        const data = await res.json();
        if (data.success) {
          setImages(data.data.items);
        }
      } catch (err) {
        console.error("Failed to fetch public images:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchImages();
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Public Gallery</h1>
        <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
          Explore the latest approved images shared by our community.
        </p>
      </div>
      
      {loading ? (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-[250px] rounded-xl break-inside-avoid" />
          ))}
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {images.map((img) => (
            <Dialog key={img.id}>
              <DialogTrigger render={<div className="break-inside-avoid cursor-pointer group" />}>
                <Card className="overflow-hidden border-0 shadow-sm group-hover:shadow-md transition-shadow">
                  <div className="relative">
                    <img 
                      src={img.url} 
                      alt={img.originalName} 
                      loading="lazy" 
                      className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium truncate">{img.originalName}</p>
                      <p className="text-white/80 text-xs">by {img.user?.username || "Unknown"}</p>
                    </div>
                  </div>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-transparent border-0 shadow-none">
                <div className="flex flex-col items-center justify-center relative">
                  <img src={img.url} alt={img.originalName} className="max-h-[85vh] object-contain rounded-md" />
                  <div className="absolute bottom-[-40px] text-white text-center w-full font-medium">
                    {img.originalName} - {img.user?.username || "Unknown"}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}
          {images.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No public images available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}