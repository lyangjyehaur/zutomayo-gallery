import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && window.umami && typeof window.umami.track === "function") {
      const searchParams = new URLSearchParams(location.search);
      const fromUrl = searchParams.get("from");
      
      window.umami.track('Z_404_Page_View', {
        original_url: fromUrl || location.pathname,
        current_url: window.location.href
      });
    }
  }, [location]);

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md py-16 px-8 flex flex-col items-center justify-center border-4 border-dashed border-border bg-card shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-all hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        <div className="text-6xl mb-6 opacity-20 animate-pulse">
          <i className="hn hn-cassette-tape"></i>
        </div>
        <div className="flex flex-col items-center leading-tight mb-4">
          <h1 className="text-4xl font-black mb-2 text-center">404</h1>
          <h3 className="text-xl font-bold text-center">
            {t("app.page_not_found", "找不到頁面")}
          </h3>
          <span className="text-xs font-mono opacity-40 mt-2">
            PAGE_NOT_FOUND
          </span>
        </div>
        <p className="text-sm opacity-60 mb-8 font-mono text-center">
          {t("app.page_not_found_desc", "您尋找的訊號似乎已經消失在午夜之中")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
          <Button
            onClick={() => navigate(-1)}
            variant="neutral"
            size="lg"
            className="font-bold tracking-widest group"
          >
            <i className="hn hn-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i>
            {t("app.back", "返回上一頁")}
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="noShadow"
            size="lg"
            className="font-bold tracking-widest group border-4 border-foreground"
          >
            <i className="hn hn-home mr-2 group-hover:scale-110 transition-transform"></i>
            {t("app.back_to_home", "返回首頁")}
          </Button>
        </div>
      </div>
    </div>
  );
}
