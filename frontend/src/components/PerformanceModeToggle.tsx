import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { shouldShowSecondaryLang } from '@/i18n';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface PerformanceModeToggleProps {
  isReduced: boolean;
  onToggle: () => void;
  isDisabled?: boolean;
}

export const PerformanceModeToggle = memo(function PerformanceModeToggle({
  isReduced,
  onToggle,
  isDisabled = false,
}: PerformanceModeToggleProps) {
  const { t, i18n } = useTranslation();

  const handleToggle = () => {
    const willReduce = !isReduced;
    onToggle();
    toast(willReduce ? t("app.perf_mode.toast_off") : t("app.perf_mode.toast_on"), {
      duration: 2000,
      position: "bottom-center",
    });
  };

  const buttonContent = (
    <i className={`hn hn-sparkles text-xl md:text-2xl`}></i>
  );

  const buttonProps = {
    variant: "neutral" as const,
    size: "icon" as const,
    onClick: handleToggle,
    disabled: isDisabled,
    "data-active": isReduced,
    className: `h-10 w-10 md:h-12 md:w-12 rounded-none transition-all duration-150 ${
      isReduced
        ? "bg-main text-black translate-x-[4px] translate-y-[4px] shadow-none hover:bg-main/80"
        : "hover:bg-main hover:text-black"
    }`,
    "aria-label": isReduced ? t("app.perf_mode.off") : t("app.perf_mode.on"),
    "data-umami-event": "Z_Toggle_Performance_Mode",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...buttonProps}>{buttonContent}</Button>
      </TooltipTrigger>
      <TooltipContent side="left" align="center" sideOffset={10}>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-black tracking-widest">
            {isReduced ? t("app.perf_mode.off") : t("app.perf_mode.on")}
          </p>
          {shouldShowSecondaryLang(i18n.language) && (
            <p className="text-[10px] font-mono opacity-60 normal-case">
              {isReduced ? "REDUCED MOTION" : "FULL MOTION"}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});
