import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface LanguageToggleProps {
  isIconOnly?: boolean;
}

const languages = [
  { code: "zh-TW", name: "正體中文 (台灣)", short: "TW" },
  { code: "zh-HK", name: "繁體中文 (香港)", short: "HK" },
  { code: "zh-CN", name: "简体中文", short: "CN" },
  { code: "ja", name: "日本語", short: "JA" },
  { code: "ko", name: "한국어", short: "KO" },
  { code: "en", name: "English", short: "EN" },
  { code: "es", name: "Español", short: "ES" },
];

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ isIconOnly = false }) => {
  const { t, i18n } = useTranslation();

  const [isOpen, setIsOpen] = React.useState(false);

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const buttonContent = (
    <>
      <i className={`hn hn-globe ${isIconOnly ? 'text-xl md:text-2xl' : 'text-lg'}`}></i>
      {!isIconOnly && <span className="text-xs font-bold">{currentLang.name}</span>}
    </>
  );

  const buttonProps = {
    variant: "neutral" as const,
    size: (isIconOnly ? "icon" : "default") as "icon" | "default",
    className: isIconOnly
      ? "z-10 relative h-10 w-10 md:h-12 md:w-12 rounded-none transition-all duration-150 hover:bg-main hover:text-black data-[state=open]:bg-main data-[state=open]:text-black data-[state=open]:translate-x-[4px] data-[state=open]:translate-y-[4px] data-[state=open]:shadow-none group"
      : "gap-2 border-2 border-border shadow-neo-sm bg-card hover:bg-card/80",
    "aria-label": "Change Language",
    "data-umami-event": "Z_Change_Language",
  };

  const dropdownMenu = (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {isIconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full h-full relative group/tooltip-trigger">
              <DropdownMenuTrigger asChild>
                <Button {...buttonProps}>{buttonContent}</Button>
              </DropdownMenuTrigger>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="left" 
            align="center" 
            sideOffset={10}
            className={isOpen ? "hidden" : ""}
          >
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-black tracking-widest">{t("app.language", "語言")}</p>
              {i18n.language !== 'en' && (
<p className="text-[10px] font-mono opacity-60 normal-case">LANGUAGE</p>
)}
              <p className="text-xs font-bold">{t("app.change_language", "切換顯示語言")}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>
          <Button {...buttonProps}>{buttonContent}</Button>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="end" side="left" sideOffset={10} className="w-56 z-[100]">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={i18n.language} onValueChange={handleLanguageChange}>
            {languages.map((lang) => (
              <DropdownMenuRadioItem
                key={lang.code}
                value={lang.code}
                lang={lang.code}
                data-umami-event="Z_Select_Language"
                data-umami-event-language={lang.code}
              >
                {lang.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return dropdownMenu;
};

export default LanguageToggle;
