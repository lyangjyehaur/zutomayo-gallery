import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { shouldShowSecondaryLang } from "@/i18n";

type Theme = "light" | "dark";

interface ThemeToggleProps {
  isIconOnly?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isIconOnly = false }) => {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<Theme>(() => {
    // 從localStorage或系統偏好獲取主題
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("theme") as Theme;
        if (saved === "light" || saved === "dark") return saved;
      } catch {
        // 讀取失敗時使用默認主題
      }
    }
    return "dark"; // 默認dark模式
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // 移除現有的theme類
    root.classList.remove("light", "dark");
    
    // 添加新的theme類
    root.classList.add(theme);
    
    // 更新data-theme屬性
    root.setAttribute("data-theme", theme);
    
    // 保存到localStorage
    try {
      localStorage.setItem("theme", theme);
    } catch {
      toast.error(t("app.theme_save_failed", "主題設定保存失敗，可能是瀏覽器隱私模式或存儲空間不足"));
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const buttonContent = theme === "light" ? (
    <>
      <i className={`hn hn-lightbulb ${isIconOnly ? 'text-xl md:text-2xl' : 'text-lg'}`}></i>
      {!isIconOnly && <span className="text-xs font-bold">{t("app.dark_mode", "關燈模式")}</span>}
    </>
  ) : (
    <>
      <i className={`hn hn-lightbulb-solid ${isIconOnly ? 'text-xl md:text-2xl' : 'text-lg'}`}></i>
      {!isIconOnly && <span className="text-xs font-bold">{t("app.light_mode", "開燈模式")}</span>}
    </>
  );

  const buttonProps = {
    variant: "neutral" as const,
    size: (isIconOnly ? "icon" : "default") as "icon" | "default",
    onClick: toggleTheme,
    "data-active": theme === "light",
    className: isIconOnly
      ? `h-10 w-10 md:h-12 md:w-12 rounded-none transition-colors ${theme === "light" ? "bg-main text-black hover:bg-main/80" : "hover:bg-main hover:text-black"}`
      : "gap-2 border-2 border-border shadow-neo-sm bg-card hover:bg-card/80",
    title: theme === "light" ? t("app.turn_off_lights", "關燈") : t("app.turn_on_lights", "開燈"),
    "aria-label": theme === "light" ? t("app.turn_off_lights", "關燈") : t("app.turn_on_lights", "開燈"),
    "data-umami-event": "Z_Toggle_Theme",
    "data-umami-event-to": theme === 'dark' ? 'light' : 'dark',
  };

  if (!isIconOnly) {
    return <Button {...buttonProps}>{buttonContent}</Button>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...buttonProps}>{buttonContent}</Button>
      </TooltipTrigger>
      <TooltipContent side="left" align="center" sideOffset={10}>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-black tracking-widest">{t("app.lighting", "照明")}</p>
          {shouldShowSecondaryLang(i18n.language) && (
          <p className="text-[10px] font-mono opacity-60 normal-case">ILLUMINATION</p>
          )}
          <p className="text-xs font-bold">
            {theme === "light" ? t("app.turn_off_desc", "關閉光源，回歸「永遠深夜」") : t("app.turn_on_desc", "確認開燈嗎？「永遠深夜」才是最佳體驗")}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default ThemeToggle;
