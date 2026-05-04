"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Edit2, Trash, Link as LinkIcon, Download, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageItem {
  id: string;
  url: string;
  originalName: string;
  filename: string;
}

export default function ImageManagementPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Watermark state
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkTile, setWatermarkTile] = useState(false);
  const [watermarkRotation, setWatermarkRotation] = useState("0");
  const [watermarkX, setWatermarkX] = useState("0");
  const [watermarkY, setWatermarkY] = useState("0");

  const fetchImages = async () => {
    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      if (data.success) {
        setImages(data.data.items);
      }
    } catch (err) {
      console.error("Failed to fetch images", err);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Link copied!");
  };

  const handleUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("file", files[i]);
    }

    if (watermarkText) {
      formData.append("watermark", JSON.stringify({
        text: watermarkText,
        tile: watermarkTile,
        rotation: parseInt(watermarkRotation),
        x: parseInt(watermarkX),
        y: parseInt(watermarkY),
      }));
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadOpen(false);
        fetchImages();
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [watermarkText, watermarkTile, watermarkRotation, watermarkX, watermarkY]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      handleUpload(e.clipboardData.files);
    }
  }, [watermarkText, watermarkTile, watermarkRotation, watermarkX, watermarkY]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Image Management</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {selected.length} selected
          </div>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger render={<Button />}>
              <UploadCloud className="mr-2 h-4 w-4" /> Upload
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" onPaste={onPaste}>
              <DialogHeader>
                <DialogTitle>Upload Images</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center text-muted-foreground hover:bg-gray-50 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <UploadCloud className="h-10 w-10 mb-2" />
                  <p>Drag & drop images here, paste, or click to select</p>
                  <Input id="file-upload" type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
                </div>
                
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium text-sm">Watermark Settings (Optional)</h4>
                  <div className="grid gap-2">
                    <Label>Text</Label>
                    <Input value={watermarkText} onChange={e => setWatermarkText(e.target.value)} placeholder="Enter watermark text" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="tile" checked={watermarkTile} onCheckedChange={(c) => setWatermarkTile(!!c)} />
                    <Label htmlFor="tile">Tile watermark</Label>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Rotation</Label>
                      <Input type="number" value={watermarkRotation} onChange={e => setWatermarkRotation(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Offset X</Label>
                      <Input type="number" value={watermarkX} onChange={e => setWatermarkX(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Offset Y</Label>
                      <Input type="number" value={watermarkY} onChange={e => setWatermarkY(e.target.value)} />
                    </div>
                  </div>
                </div>
                
                {uploading && <div className="text-center text-sm text-blue-500">Uploading...</div>}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {images.map((img) => (
          <ContextMenu key={img.id}>
            <ContextMenuTrigger className="relative group break-inside-avoid block">
              <Card className={`overflow-hidden transition-all ${selected.includes(img.id) ? 'ring-2 ring-primary' : ''}`}>
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Checkbox 
                    checked={selected.includes(img.id)} 
                    onCheckedChange={() => toggleSelect(img.id)} 
                    className="bg-white/80"
                  />
                </div>
                <img 
                  src={img.url} 
                  alt={img.originalName} 
                  loading="lazy" 
                  className="w-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.originalName}
                </div>
              </Card>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => copyLink(img.url)}>
                <LinkIcon className="mr-2 h-4 w-4" /> Copy Link
              </ContextMenuItem>
              <ContextMenuItem>
                <Edit2 className="mr-2 h-4 w-4" /> Rename
              </ContextMenuItem>
              <ContextMenuItem onClick={() => window.open(img.url, '_blank')}>
                <Download className="mr-2 h-4 w-4" /> Download
              </ContextMenuItem>
              <ContextMenuItem className="text-red-500">
                <Trash className="mr-2 h-4 w-4" /> Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
        {images.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No images found.
          </div>
        )}
      </div>
    </div>
  );
}
