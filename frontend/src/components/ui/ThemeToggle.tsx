import React, { useState, useEffect } from "react";
import { Button } from "./button";

type Theme = "light" | "dark";

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // 從localStorage或系統偏好獲取主題
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as Theme;
      if (saved) return saved;
      
      // 檢查系統偏好
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
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
    localStorage.setItem("theme", theme);
    
    // 更新App.tsx中的強制dark類（如果需要）
    const appDarkClass = document.querySelector('.dark');
    if (appDarkClass && theme === "light") {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <Button
      variant="neutral"
      onClick={toggleTheme}
      className="gap-2 border-2 border-border shadow-neo-sm bg-card hover:bg-card/80"
      aria-label={`切換到${theme === "light" ? "深色" : "淺色"}模式`}
    >
      {theme === "light" ? (
        <>
          <i className="fa-solid fa-moon"></i>
          <span className="text-xs font-bold">深色模式</span>
        </>
      ) : (
        <>
          <i className="fa-solid fa-sun"></i>
          <span className="text-xs font-bold">淺色模式</span>
        </>
      )}
    </Button>
  );
};

export default ThemeToggle;