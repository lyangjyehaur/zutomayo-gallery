import { useTranslation } from 'react-i18next';
import { shouldShowSecondaryLang } from '@/i18n';
import { MODAL_THEME } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { WalineComments } from '@/components/WalineComments';

interface FeedbackDrawerProps {
  isFeedbackOpen: boolean;
  setIsFeedbackOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shouldRenderFeedback: boolean;
}

export function FeedbackDrawer({ isFeedbackOpen, setIsFeedbackOpen, shouldRenderFeedback }: FeedbackDrawerProps) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] ${MODAL_THEME.overlay.drawer} ${
          isFeedbackOpen
            ? "animate-[dialog-fade-in_700ms_cubic-bezier(0.32,0.72,0,1)_forwards] pointer-events-auto"
            : "animate-[dialog-fade-out_700ms_cubic-bezier(0.32,0.72,0,1)_forwards] pointer-events-none"
        }`}
        onClick={() => setIsFeedbackOpen(false)}
        style={{
          visibility: isFeedbackOpen ? "visible" : "hidden",
          transition: isFeedbackOpen ? "visibility 0s 0s" : "visibility 0s linear 700ms"
        }}
      />

      <div
        className={`fixed left-0 top-0 bottom-0 h-screen w-full lg:w-[768px] xl:w-[800px] border-r-0 lg:border-r-4 border-black ${MODAL_THEME.content.drawer} shadow-none lg:shadow-neo z-[100] flex flex-col origin-center ${
          isFeedbackOpen
            ? "animate-[drawer-mobile-fade-in_700ms_cubic-bezier(0.32,0.72,0,1)_forwards lg:animate-[drawer-desktop-fade-in_700ms_cubic-bezier(0.32,0.72,0,1)_forwards pointer-events-auto"
            : "animate-[drawer-mobile-fade-out_700ms_cubic-bezier(0.32,0.72,0,1)_forwards lg:animate-[drawer-desktop-fade-out_700ms_cubic-bezier(0.32,0.72,0,1)_forwards pointer-events-none"
        }`}
        style={{
          visibility: isFeedbackOpen ? "visible" : "hidden",
          transition: isFeedbackOpen ? "visibility 0s 0s" : "visibility 0s linear 700ms"
        }}
      >
        <div className={MODAL_THEME.crt}></div>
        <div className="pt-10 px-8 pb-6 border-b-4 border-border text-foreground flex flex-col justify-center shrink-0 pr-24 relative z-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
              <i className="hn hn-message text-2xl"></i> {t("app.feedback", "意見回饋")}
            </h2>
            {shouldShowSecondaryLang(i18n.language) && (
            <span className="text-[10px] font-bold opacity-50 font-mono normal-case">
              {t("app.feedback_subtitle", "Feedback")}
            </span>
            )}
          </div>
          <p className="text-xs font-bold text-foreground/70 mt-1">
            {t("app.feedback_desc", "有任何建議或發現 Bug，歡迎在這裡留言告訴我！")}
          </p>

          <Button
            variant="noShadow"
            size="icon"
            onClick={() => setIsFeedbackOpen(false)}
            className="absolute top-6 right-8 z-50 bg-background text-foreground border-3 border-foreground shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[0px_0px_0px_0px_var(--border)] transition-all w-10 h-10 rounded-none flex items-center justify-center"
            data-umami-event="Z_Close_Feedback_Drawer"
          >
            <i className="hn hn-times text-xl leading-none"></i>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10">
          {shouldRenderFeedback && (
            <WalineComments
                path="/site-feedback"
                className="waline-wrapper"
                reactionTitle={t("waline.reactionTitleSite", "喜歡這個網站嗎？")}
              />
          )}
        </div>
      </div>
    </>
  );
}
