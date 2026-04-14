import React, { useEffect, useMemo } from "react";
import { Fancybox } from "@fancyapps/ui/dist/fancybox/fancybox.esm.js";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { Sidebar } from "@fancyapps/ui/dist/fancybox/fancybox.sidebar.esm.js";
import "@fancyapps/ui/dist/fancybox/fancybox.sidebar.css";
import { MVItem } from "@/lib/types";
import { getProxyImgUrl } from "@/lib/image";

interface DebugGalleryProps {
    mvData?: MVItem[];
}

export default function DebugGallery({ mvData = [] }: DebugGalleryProps) {
    // 1. 從真實資料中提取測試圖片
    const photos = useMemo(() => {
        // 拿前 3 個 MV 的所有設定圖作為測試源
        const allImages = mvData.slice(0, 3).flatMap(mv =>
            (mv.images || []).map(img => ({
                src: getProxyImgUrl(img.url, 'thumb'),
                full: getProxyImgUrl(img.url, 'full'),
                width: img.width || 1200,
                height: img.height || 800,
                caption: img.caption || mv.title,
                richText: img.richText || '',
                key: img.url
            }))
        );
        return allImages;
    }, [mvData]);

    // 2. 初始化 Fancybox
    useEffect(() => {
        // 在這裡定義 Fancybox 的選項，並包含 Sidebar 配置
        const opts = {
            Carousel: {
                infinite: false,
            },
            // 側邊欄插件配置
            Sidebar: {
                display: "right", // 顯示在右側
                width: 400,       // 側邊欄寬度
                autoHide: false,  // 是否自動隱藏
            },
            // 註冊插件
            tpl: {
                // 如果需要自定義側邊欄容器，可以在這裡覆蓋
            }
        };

        // 綁定 Fancybox，第三個參數傳入包含 Sidebar 的插件物件
        Fancybox.bind('[data-fancybox="gallery"]', opts, { Sidebar });

        return () => {
            Fancybox.destroy(); // 組件卸載時銷毀，防止重複綁定
        };
    }, []);

    return (
        <div className="min-h-screen p-10 bg-white font-mono">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 border-b-8 border-black pb-4">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter">Fancybox_Debug_Terminal</h1>
                    <p className="font-bold opacity-50 uppercase mt-2">Source_Mode: {mvData.length > 0 ? 'REAL_DATABASE' : 'FALLBACK_MOCK'}</p>
                </header>

                {/* 測試階段：使用簡單的 CSS Grid 代替 PhotoAlbum */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {photos.map((photo) => {
                        // 構造側邊欄 HTML 內容
                        const captionHtml = `
              <div class="fancy-sidebar-content">
                <div class="text-[10px] font-black uppercase bg-black text-ztmy-green px-2 py-0.5 inline-block mb-4 border border-ztmy-green">Asset_Metadata_Node</div>
                <h2 class="text-2xl font-black italic uppercase tracking-tighter mb-4 leading-none">${photo.caption}</h2>
                <div class="rich-text-content space-y-4 text-sm leading-relaxed border-t-2 border-black pt-4">
                  ${photo.richText || '<span class="opacity-30 italic">No additional telemetry data found for this asset.</span>'}
                </div>
                <div class="mt-8 pt-4 border-t border-black/10 text-[8px] font-black opacity-20 uppercase tracking-[0.3em]">
                  System_Archive_v3 // Access_Stable
                </div>
              </div>
            `;

                        return (
                            <div key={photo.key} className="relative">
                                <a
                                    href={photo.full}
                                    data-fancybox="gallery"
                                    data-caption={captionHtml}
                                    className="block cursor-zoom-in border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all bg-gray-100 overflow-hidden aspect-square"
                                >
                                    <img
                                        src={photo.src}
                                        alt={photo.caption}
                                        className="w-full h-full object-cover block"
                                        loading="lazy"
                                    />
                                </a>
                                <p className="mt-2 text-[10px] font-bold truncate opacity-60 uppercase">{photo.caption}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );