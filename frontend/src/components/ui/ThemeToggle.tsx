import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type Theme = "light" | "dark";

interface ThemeToggleProps {
  isIconOnly?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isIconOnly = false }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // 從localStorage或系統偏好獲取主題
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as Theme;
      if (saved === "light" || saved === "dark") return saved;
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
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const buttonContent = theme === "light" ? (
    <>
      <i className={`hn hn-lightbulb ${isIconOnly ? 'text-xl md:text-2xl' : 'text-lg'}`}></i>
      {!isIconOnly && <span className="text-xs font-bold">關燈模式</span>}
    </>
  ) : (
    <>
      <i className={`hn hn-lightbulb-solid ${isIconOnly ? 'text-xl md:text-2xl' : 'text-lg'}`}></i>
      {!isIconOnly && <span className="text-xs font-bold">開燈模式</span>}
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
    title: theme === "light" ? "關燈" : "開燈",
    "aria-label": theme === "light" ? "關燈" : "開燈",
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
          <p className="text-xs font-black tracking-widest">照明</p>
          <p className="text-[10px] font-mono opacity-60 normal-case">ILLUMINATION</p>
          <p className="text-xs font-bold">
            {theme === "light" ? "關閉光源，回歸「永遠深夜」" : "確認開燈嗎？「永遠深夜」才是最佳體驗"}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default ThemeToggle;
