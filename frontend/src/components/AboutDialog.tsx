import React from 'react';
import { useTranslation } from 'react-i18next';
import { shouldShowSecondaryLang } from '@/i18n';
import { MODAL_THEME } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AboutDialogProps {
  isAboutOpen: boolean;
  setIsAboutOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AboutDialog({ isAboutOpen, setIsAboutOpen }: AboutDialogProps) {
  const { t, i18n } = useTranslation();

  return (
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
  );
}
