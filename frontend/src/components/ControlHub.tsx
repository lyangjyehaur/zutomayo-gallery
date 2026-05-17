import React from "react";
import { useTranslation } from "react-i18next";
import { shouldShowSecondaryLang } from "@/i18n";
import { MVItem } from "@/lib/types";
import { MODAL_THEME } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { PerformanceModeToggle } from "@/components/PerformanceModeToggle";

const SubmitFanArtPage = React.lazy(() => import("@/pages/SubmitFanArtPage").then((m) => ({ default: m.SubmitFanArtPage })));

interface ControlHubProps {
  scrolled: boolean;
  sortOrder: "asc" | "desc";
  setSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  showFavOnly: boolean;
  basePath: string;
  navigate: (path: string, options?: any) => void;
  deferredPrompt: any;
  setDeferredPrompt: React.Dispatch<React.SetStateAction<any>>;
  isInstallPromptOpen: boolean;
  setIsInstallPromptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRecoverPromptOpen: boolean;
  setIsRecoverPromptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isFeedbackOpen: boolean;
  setIsFeedbackOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAboutOpen: boolean;
  setIsAboutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAnimationComplete: boolean;
  isContentFadingIn: boolean;
  pathnameWithoutLang: string;
  mvIdMatch: RegExpMatchArray | null;
  isFanArtSubmitRoute: boolean;
  isMac: boolean;
  triggerPWARecovery: () => void;
  runPWARecovery: () => Promise<void>;
  mvData: MVItem[];
  pageFallback: React.ReactNode;
  onOpenSpeedSurvey: () => void;
  isReducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export function ControlHub({
  scrolled,
  sortOrder,
  setSortOrder,
  showFavOnly,
  basePath,
  navigate,
  deferredPrompt,
  setDeferredPrompt,
  isInstallPromptOpen,
  setIsInstallPromptOpen,
  isRecoverPromptOpen,
  setIsRecoverPromptOpen,
  isFeedbackOpen,
  setIsFeedbackOpen,
  isAboutOpen,
  setIsAboutOpen,
  isAnimationComplete,
  isContentFadingIn,
  pathnameWithoutLang,
  mvIdMatch,
  isFanArtSubmitRoute,
  isMac,
  triggerPWARecovery,
  runPWARecovery,
  mvData,
  pageFallback,
  onOpenSpeedSurvey,
  isReducedMotion,
  onToggleReducedMotion,
}: ControlHubProps) {
  const { t, i18n } = useTranslation();
  const is404Route = pathnameWithoutLang === "/404";

  if (is404Route) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 pointer-events-none z-[60] flex justify-center">
      <div className="w-full max-w-7xl max-[1430px]:max-w-[calc(100%-12rem)] max-[1024px]:max-w-[calc(100%-10rem)] max-[768px]:max-w-[80%] relative px-4">
        <div className="absolute bottom-0 right-4 translate-x-full pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-[768px]:pb-[calc(4.5rem+env(safe-area-inset-bottom))] pointer-events-none flex flex-col justify-end items-start pl-2 md:pl-4">
          <div className={`flex flex-col items-center -space-y-[2px] pointer-events-auto transition-all duration-[1000ms] ease-out ${isAnimationComplete ? '' : (isContentFadingIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}`}>
              <div
                className={`transition-all duration-300 ${scrolled ? "h-10 md:h-12 opacity-100 mb-[8px]" : "h-0 opacity-0 mb-0 pointer-events-none"}`}
              >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                variant="neutral"
                size="icon"
                className="z-[50] w-10 h-10 md:w-12 md:h-12 rounded-none transition-all duration-150 hover:bg-main hover:text-black group hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_0px_var(--border)]"
                data-umami-event="Z_Scroll_To_Top"
              >
                <i className="hn hn-arrow-up text-xl md:text-2xl group-hover:-translate-y-1 transition-transform"></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" sideOffset={10}>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-black tracking-widest">{t("app.back_to_top", "返回頂部")}</p>
                {shouldShowSecondaryLang(i18n.language) && (
                <p className="text-[10px] font-mono opacity-60 normal-case">
                  TOP
                </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {(pathnameWithoutLang === "/" || pathnameWithoutLang === "/favorites" || !!mvIdMatch) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => {
                  setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
                  toast(sortOrder === "desc" ? t("app.toast_sort_oldest") : t("app.toast_sort_newest"), {
                    duration: 2000,
                    position: "bottom-center",
                  });
                }}
                variant="neutral"
                size="icon"
                data-active={sortOrder === "asc"}
                className={`z-10 w-10 h-10 md:w-12 md:h-12 rounded-none transition-all duration-150 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_0px_var(--border)] ${sortOrder === "asc" ? "bg-main text-black hover:bg-main/80 translate-x-[4px] translate-y-[4px] shadow-[0px_0px_0px_0px_var(--border)]" : "hover:bg-main hover:text-black"}`}
                data-umami-event="Z_Toggle_Sort_Order"
                data-umami-event-order={sortOrder === "desc" ? "asc" : "desc"}
              >
                <i className={`hn hn-sort text-xl md:text-2xl`}></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" sideOffset={10}>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-black tracking-widest">{t("app.sort", "排序")}</p>
                {shouldShowSecondaryLang(i18n.language) && (
                <p className="text-[10px] font-mono opacity-60 normal-case">
                  SORT
                </p>
                )}
                <p className="text-xs font-bold">
                  {sortOrder === "desc" ? t("app.newest_to_oldest", "最新 → 最舊") : t("app.oldest_to_newest", "最舊 → 最新")}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

          {(import.meta.env.DEV || deferredPrompt) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsInstallPromptOpen(true)}
                  variant="neutral"
                  size="icon"
                  className="z-20 w-10 h-10 md:w-12 md:h-12 rounded-none transition-all duration-150 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_0px_var(--border)] hover:bg-main hover:text-black"
                  data-umami-event="Z_Click_Install_PWA_Btn"
                >
                  <i className="hn hn-download-alt text-xl md:text-2xl leading-none"></i>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" sideOffset={10}>
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-black tracking-widest">{t("app.install", "安裝 App")}</p>
                  {shouldShowSecondaryLang(i18n.language) && (
                  <p className="text-[10px] font-mono opacity-60 normal-case">
                    INSTALL PWA
                  </p>
                  )}
                  <p className="text-xs font-bold">
                    {t("app.install_pwa_desc", "將網站加入主畫面，享受全螢幕與離線瀏覽體驗！")}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

        {(pathnameWithoutLang === "/" || pathnameWithoutLang === "/favorites" || !!mvIdMatch) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => {
                  navigate(showFavOnly ? basePath : `${basePath}/favorites`);
                  toast(showFavOnly ? t("app.toast_back_to_all") : t("app.toast_show_fav_only"), {
                    duration: 2000,
                    position: "bottom-center",
                  });
                }}
                variant="neutral"
                size="icon"
                data-active={showFavOnly}
                className={`z-20 w-10 h-10 md:w-12 md:h-12 rounded-none transition-all duration-150 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_0px_var(--border)] ${showFavOnly ? "bg-main text-black hover:bg-main/80 translate-x-[4px] translate-y-[4px] shadow-[0px_0px_0px_0px_var(--border)]" : "hover:bg-main hover:text-black"}`}
                data-umami-event="Z_Toggle_Favorites_View"
                data-umami-event-view={showFavOnly ? "all" : "favorites"}
              >
                <i
                  className={`hn hn-star-solid text-xl md:text-2xl leading-none ${showFavOnly ? "animate-pulse" : ""}`}
                ></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" sideOffset={10}>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-black tracking-widest">{t("app.favorite", "收藏")}</p>
                {shouldShowSecondaryLang(i18n.language) && (
                <p className="text-[10px] font-mono opacity-60 normal-case">
                  FAVORITES
                </p>
                )}
                <p className="text-xs font-bold">
                  {showFavOnly ? t("app.back_to_all", "返回所有作品") : t("app.show_fav_only", "只看收藏")}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {(pathnameWithoutLang === "/fanart" || pathnameWithoutLang === "/fanart/submit") && (
          <Dialog
            open={isFanArtSubmitRoute}
            onOpenChange={(open) => {
              if (!open) navigate(`${basePath}/fanart`);
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => navigate(`${basePath}/fanart/submit`)}
                  variant="neutral"
                  size="icon"
                  className={`z-20 w-10 h-10 md:w-12 md:h-12 rounded-none transition-all duration-150 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_0px_var(--border)] hover:bg-main hover:text-black ${isFanArtSubmitRoute ? "bg-main text-black translate-x-[4px] translate-y-[4px] shadow-[0px_0px_0px_0px_var(--border)]" : ""}`}
                  data-umami-event="Z_Open_Fanart_Submit"
                >
                  <i className="hn hn-edit text-xl md:text-2xl"></i>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" sideOffset={10}>
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-black tracking-widest">{t("submit.title", "投稿")}</p>
                  {shouldShowSecondaryLang(i18n.language) && (
                  <p className="text-[10px] font-mono opacity-60 normal-case">SUBMIT</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>

            <DialogContent
              overlayClassName={MODAL_THEME.overlay.dialog}
              showClose={false}
              className={`!w-screen !h-[100dvh] md:!w-screen md:!h-[100dvh] !max-w-none md:!max-w-none overflow-hidden flex flex-col p-0 border-0 ${MODAL_THEME.content.dialog} !rounded-none shadow-none fixed top-0 left-0 !translate-x-0 !translate-y-0 z-[100]`}
            >
              <div className={MODAL_THEME.crt}></div>
              <div className="relative z-10 flex flex-col h-full min-h-0 overflow-hidden">
                <div className="shrink-0 border-b-4 border-black bg-black text-white px-4 md:px-6 pt-3 pb-2 md:pt-4 md:pb-3 relative">
                  <button
                    type="button"
                    onClick={() => navigate(`${basePath}/fanart`)}
                    className={`absolute top-3 md:top-4 z-[110] bg-background text-foreground border-3 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all ${isMac ? "left-4 md:left-6 w-auto px-3" : "right-4 md:right-6 w-10"} h-10 flex items-center justify-center rounded-none font-black uppercase tracking-widest text-xs gap-1.5 hover:bg-main hover:text-black`}
                    aria-label={isMac ? "Back" : "Close"}
                  >
                    {isMac ? (
                      <>
                        <i className="hn hn-angle-left text-xs leading-none"></i>
                        <span>返回</span>
                      </>
                    ) : (
                      <i className="hn hn-times text-xl leading-none"></i>
                    )}
                  </button>

                  <div className={`min-w-0 ${isMac ? "pl-16 md:pl-20 pr-4" : "pr-16 md:pr-20"}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 md:w-9 md:h-9 border-2 border-white/20 bg-white/10 flex items-center justify-center">
                        <i className="hn hn-edit text-lg md:text-xl"></i>
                      </div>
                      <div className="min-w-0">
                        <div className="font-black tracking-widest uppercase leading-tight">
                          {t("submit.title", "FanArt 投稿")}
                        </div>
                        <div className="text-[10px] font-mono opacity-70 leading-tight">
                          /fanart/submit
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs opacity-75 leading-relaxed max-w-[60ch]">
                      匿名或登入皆可投稿；上傳與 Tweet 來源支援混用。
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  <div className="px-4 md:px-6 py-4 md:py-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <React.Suspense fallback={pageFallback}><SubmitFanArtPage mvData={mvData} /></React.Suspense>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="neutral"
                  size="icon"
                  className={`z-30 w-10 h-10 md:w-12 md:h-12 rounded-none transition-all duration-150 hover:bg-main hover:text-black group hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_0px_var(--border)] ${isAboutOpen ? 'bg-main text-black translate-x-[4px] translate-y-[4px] shadow-[0px_0px_0px_0px_var(--border)]' : ''}`}
                  data-umami-event="Z_Click_About"
                >
                  <i className="hn hn-info-circle text-xl md:text-2xl group-hover:rotate-12 transition-transform"></i>
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" sideOffset={10}>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-black tracking-widest">{t("app.about_author", "碎碎念")}</p>
                {shouldShowSecondaryLang(i18n.language) && (
                <p className="text-[10px] font-mono opacity-60 normal-case">
                  ABOUT
                </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

              <DialogContent
                overlayClassName={MODAL_THEME.overlay.dialog}
                className={`w-screen h-[100dvh] max-w-none md:max-w-2xl md:w-full md:h-[85vh] md:max-h-[85vh] overflow-hidden flex flex-col p-0 border-0 md:border-4 border-black ${MODAL_THEME.content.dialog} sm:rounded-none rounded-none shadow-none md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] fixed top-0 left-0 md:top-[50%] md:left-[50%] !translate-x-0 !translate-y-0 md:!translate-x-[-50%] md:!translate-y-[-50%] z-[100]`}
              >
                <div className={MODAL_THEME.crt}></div>

                <div className="p-4 md:p-8 relative flex-1 flex flex-col overflow-hidden min-h-0 z-10">
                  <DialogHeader className="relative z-10 mb-6 md:mb-8 shrink-0">
                    <DialogTitle className="text-2xl md:text-4xl font-black uppercase tracking-tighter flex flex-wrap items-center gap-2 md:gap-3">
                      <span className="bg-black text-main px-2 md:px-3 py-1">ZUTOMAYO</span>
                      <span className="opacity-90">MV Gallery</span>
                    </DialogTitle>
                    <DialogDescription className="text-sm md:text-lg font-bold opacity-70 mt-2">
                      A fan-made gallery for ZUTOMAYO Music Videos.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-h-0">
                    <ScrollArea className="flex-1 min-h-0 w-full">
                      <div className="pl-3 md:pl-4 py-1 space-y-4 text-sm md:text-base font-medium opacity-90 leading-relaxed text-justify pr-4">
                      <p>{t("app.about_p1", "哈囉！這裡是飯糰，歡迎造訪這個資料庫。")}</p>

                      <p>
                        {t("app.about_p2", "其實很早就有做這個資料庫的打算了。身為社團成員之一，經常看到社團擺攤團建的時候有老師出 COS 需要找人設圖、或者畫師老師想找參考資料的情況，尤其是官宣 Intense II 之後，想著大家肯定有產糧和做無料的需求，到處翻找設定圖實在不方便，而且大多數老師還得克服網絡環境的難題。再加上官方的資料量大且散，找起來真的很累，當時就在想，如果自己能做一個資料庫，應該會比 QQ 群相冊好用很多吧？ 於是就有了這個資料庫。")}
                      </p>

                      <p>
                        {t("app.about_p3", "從最開始整理推文，到後來手搓 HTML 的簡單框架上線之後，就一直收到老師們的高度評價，打心底真的超開心，畢竟初衷就是想幫到更多人。")}
                      </p>

                      <p>
                        {t("app.about_p4", "後來慢慢發現純靜態網頁已經跟不上需求了，於是在各路 AI 的「物理外掛」下開始 React 工程化。雖然現在流行 vibe coding，但畢竟自帶一點代碼功底，而且本身對 UI/UX 還是有些執念的。於是自己兼任 PM，在保證基本瀏覽體驗的同時瘋狂打磨細節。畢竟我不是專業的網頁設計師，在風格挑選上真的糾結了很久，最終才確定使用與 ZUTOMAYO 視覺風格很搭的 Neobrutalism；大到整體的實現、畫廊佈局到 Lightbox 燈箱的細節，小到每個按鈕偏移的像素，光是為了適配調試電腦和手機的不同顯示寬度，佈局就反反複覆改了好幾版。")}
                      </p>

                      <p>
                        {t("app.about_p5", "雖然聽起來可能有點囉嗦，但我一定要分享一下這裡面的小巧思。比如為了幫大家解決找圖最大的痛點，我在搜尋功能上真的下了不少苦功，除了可以篩選專輯和畫師，為了保證搜尋的命中率，我幾乎把所有能跟歌曲關聯上的關鍵字別名全都手動維護上去了，就是想隨便搜個關鍵詞都能精確對上。還有那種肉眼不容易發現的細節，像是做了完整的「泛中日韓語言特定字形」支持，這塊我鑽研了很久，選字體選到一度想放棄這個 feature，直到後來遇到「縫合像素字體 / Fusion Pixel Font」這個字體開源項目，真的很偉大；還有我也針對大陸用戶、海外用戶甚至爬牆用戶做了不同的訪問處理，甚至還加入了 PWA 支持，可以像應用一樣安裝到手機上，還提供了一定程度的離線瀏覽，連原推和翻譯的對照也都做進去了（雖然還在施工中）。")}
                      </p>

                      <p>
                        {t("app.about_p6", "除了目前 MV 畫廊的完善，後續還打算做畫師專題頁，甚至更後期還想把官方轉推的優秀作品也展示出來。奈何量實在太大，還在研究能不能靠 AI 幫忙，畢竟好多神仙 FanArt 被埋沒了真的很可惜。（開始畫餅了）")}
                      </p>

                      <p>
                        {t("app.about_p7", "廢話了這麼多，感謝你能看到這裡！如果你用起來覺得哪裡不爽，或者對資料庫有什麼想法建議，真的非常希望你能抽空給我個反饋。我們集思廣益，把這個資料庫做得更好，去幫助更多的老師。")}
                      </p>

                      <p className="font-bold text-base md:text-lg italic text-right mt-6 pr-4 pb-8">
                        {t("app.about_p8", "—— 祝「永遠深夜」")}
                      </p>

                      <div className="mt-8 pt-8 pr-4">
                        <div className="flex flex-col mb-6 items-start">
                          <h3 className="text-xl md:text-2xl font-black tracking-widest bg-black text-main px-3 py-1 inline-block">
                            {t("app.special_thanks", "特別感謝")}
                          </h3>
                          {shouldShowSecondaryLang(i18n.language) && (
                          <p className="text-[10px] md:text-xs font-mono opacity-50 uppercase tracking-widest mt-2 pl-1 whitespace-nowrap">Special Thanks</p>
                          )}
                        </div>
                        <div className="space-y-4 text-sm md:text-base font-medium">
                          <p>
                            {t("app.thanks_desc", "感謝以下老師與開源專案的支持與貢獻：")}
                          </p>
                          <ul className="list-none space-y-3 mt-4">
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <a href="https://space.bilibili.com/531797444" target="_blank" rel="noopener noreferrer" className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1">深夜大活躍_WAKE_03</a><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_wake_03", "感謝對 ZUTOMAYO 粉絲社群的巨大貢獻，以及提供評論區像素 Nira 醬表情的授權")}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <a href="https://jhenty.cn" target="_blank" rel="noopener noreferrer" className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1">立花</a><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_rikka", "立花老師的像素風 favicon 換上去真的很加分，不愧是專業的出手，感謝支援門面")}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <a href="https://github.com/TakWolf/fusion-pixel-font" target="_blank" rel="noopener noreferrer" className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1">縫合像素字體 / Fusion Pixel Font</a><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_fusion_pixel", "提供完整「泛中日韓語言特定字形」開源字型支援")}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <a href="https://fancyapps.com/fancybox/" target="_blank" rel="noopener noreferrer" className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1">
                                  Fancybox
                                </a><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_fancybox", "無可挑剔的圖片燈箱解決方案（雖然覆寫官方的樣式真的超累）")}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1">
                                  Google Gemini
                                </a><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_react", "幫助實現專案從靜態網頁到 React 工程化的轉型")}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <span className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1 cursor-default">
                                  Trae AI
                                </span><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_cursor", "與飯糰一起打磨這些瘋狂 UI 細節的物理外掛（好像是用的 GPT 5.4 的模型）")}</span>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                      </div>
                    </ScrollArea>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-6 shrink-0 pb-2 px-1">
                      <a
                        href="https://zutomayo.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 md:p-4 border-2 border-black bg-background hover:bg-main hover:text-black active:bg-main active:text-black transition-all duration-150 group shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-[0px_0px_0px_0px_var(--border)] active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-[0px_0px_0px_0px_var(--border)]"
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-sm uppercase">Official Site</span>
                          <span className="font-mono text-[10px] opacity-60">zutomayo.net</span>
                        </div>
                        <i className="hn hn-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                      </a>

                      <a
                        href="https://github.com/lyangjyehaur/zutomayo-gallery"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 md:p-4 border-2 border-black bg-background hover:bg-main hover:text-black active:bg-main active:text-black transition-all duration-150 group shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-[0px_0px_0px_0px_var(--border)] active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-[0px_0px_0px_0px_var(--border)]"
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-sm uppercase">Source Code</span>
                          <span className="font-mono text-[10px] opacity-60">GitHub</span>
                        </div>
                        <i className="hn hn-github text-xl"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </DialogContent>
          </Dialog>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
                variant="neutral"
                size="icon"
                data-active={isFeedbackOpen}
                className={`z-30 w-10 h-10 md:w-12 md:h-12 rounded-none transition-all duration-150 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_0px_var(--border)] group ${isFeedbackOpen ? "bg-main text-black hover:bg-main/80 translate-x-[4px] translate-y-[4px] shadow-[0px_0px_0px_0px_var(--border)]" : "hover:bg-main hover:text-black"}`}
                data-umami-event="Z_Toggle_Feedback_Drawer"
                data-umami-event-state={isFeedbackOpen ? "close" : "open"}
              >
                <i className="hn hn-message text-xl md:text-2xl group-hover:rotate-12 transition-transform"></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" sideOffset={10}>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-black tracking-widest">{t("app.feedback", "意見回饋")}</p>
                {shouldShowSecondaryLang(i18n.language) && (
                <p className="text-[10px] font-mono opacity-60 normal-case">
                  FEEDBACK
                </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              onClick={onOpenSpeedSurvey}
              onTouchStart={(e) => e.stopPropagation()}
              variant="neutral"
              size="icon"
              className="z-[35] w-10 h-10 md:w-12 md:h-12 rounded-none transition-all duration-150 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_0px_var(--border)] hover:bg-main hover:text-black"
              data-umami-event="Z_Click_Speed_Survey"
            >
              <i className="hn hn-face-thinking text-xl md:text-2xl"></i>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center" sideOffset={10}>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-black tracking-widest">{t("app.speed_survey", "加載速度調查")}</p>
              {shouldShowSecondaryLang(i18n.language) && (
              <p className="text-[10px] font-mono opacity-60 normal-case">
                SPEED_SURVEY
              </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        <div className="z-40 relative">
          <LanguageToggle isIconOnly={true} />
        </div>
        <div className="z-40 relative">
          <ThemeToggle isIconOnly={true} />
        </div>
        <div className="z-45 relative">
          <PerformanceModeToggle
            isReduced={isReducedMotion}
            onToggle={onToggleReducedMotion}
          />
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
