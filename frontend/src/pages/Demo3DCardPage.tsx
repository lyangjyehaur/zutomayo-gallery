import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const IMAGE_SRCS = [
  "/assets/cardlist/2nd/se/zutomayocard_2nd_106.jpg",
  "/assets/cardlist/1st/se/zutomayocard_1st_105.jpg",
  "/assets/cardlist/1st/se/zutomayocard_1st_106.jpg",
];

export function Demo3DCardPage({ basePath }: { basePath: string }) {
  const navigate = useNavigate();

  return (
    <div className="w-full flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col leading-tight">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">
            3D Card Demo
          </h2>
          <span className="text-[10px] font-mono opacity-50 normal-case">
            /demo/3d-card
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="neutral" onClick={() => navigate(-1)}>
            <i className="hn hn-arrow-left mr-2" />
            返回
          </Button>
          <Button variant="noShadow" onClick={() => navigate(basePath)}>
            <i className="hn hn-home mr-2" />
            回首頁
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center py-10 p-10">
        <div className="flex flex-wrap items-center justify-center gap-10">
          {IMAGE_SRCS.map((src) => (
            <div key={src} className="hover-3d">
              <figure className="rounded-2xl border-4 border-border bg-card">
                <img
                  src={src}
                  alt=""
                  className="block max-h-[40vh] max-w-[min(90vw,320px)] h-auto w-auto rounded-[inherit]"
                  loading="eager"
                  decoding="async"
                />
              </figure>
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
