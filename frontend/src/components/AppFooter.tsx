import { useTranslation } from 'react-i18next'
import { shouldShowSecondaryLang } from '@/i18n'
import { VERSION_CONFIG } from '@/config/version'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface AppFooterProps {
  is404Route: boolean;
  isGeoTooltipOpen: boolean;
  setIsGeoTooltipOpen: React.Dispatch<React.SetStateAction<boolean>>;
  geoInfo: {
    labelCn: string;
    labelEn: string;
    desc: string;
    details?: { province?: string; city?: string; isp?: string };
    isChinaIP?: boolean;
  };
  systemStatus?: { maintenance: boolean; type?: 'data' | 'ui'; eta?: string | null; buildTime?: string | null; version?: string };
}

export function AppFooter({ is404Route, isGeoTooltipOpen, setIsGeoTooltipOpen, geoInfo, systemStatus }: AppFooterProps) {
  const { t, i18n } = useTranslation()

  return (
    <footer className="bg-card relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none crt-lines"></div>
      <div className="mx-auto px-4 pb-16 pt-8 w-full max-w-7xl relative max-[1430px]:max-w-[calc(100%-12rem)] max-[1024px]:max-w-[calc(100%-10rem)] max-[768px]:max-w-full">
        <div className={`${!is404Route ? "p-6 md:p-8 border-4 border-black bg-black/5" : ""} relative group`}>
          {!is404Route && (
            <>
              <div className="absolute -top-4 left-4 md:left-6 bg-black text-main px-3 py-1 text-[10px] font-black border-2 border-main">
                <div className="flex flex-col leading-tight">
                  <span className="opacity-90">
                    {t("app.footer_legal", "版權/法律聲明")}
                  </span>
                  {shouldShowSecondaryLang(i18n.language) && (
                  <span className="font-mono opacity-60">
                    Legal_Signal_Broadcast
                  </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1120px]:grid-cols-4 gap-8 md:gap-10 items-center">
                <div className="space-y-6 min-[520px]:col-span-1 min-[900px]:col-span-2 min-[1120px]:col-span-3">
                <div className="space-y-3">
                  <p className="text-[10px] leading-relaxed opacity-60">
                      {t("app.disclaimer_1").split("「")[0] || t("app.disclaimer_1")}
                      {t("app.disclaimer_1").includes("「") && (
                        <>
                          「<span lang="ja">ずっと真夜中でいいのに。</span>」
                          {t("app.disclaimer_1").split("」")[1]}
                        </>
                      )}
                      <br />
                      {t("app.disclaimer_2")}
                      <br />
                      {t("app.disclaimer_3")}
                    </p>
                  {i18n.language !== 'ja' && (
                      <p
                        lang="ja"
                        className="text-[10px] leading-relaxed opacity-60"
                      >
                        本サイトは「ずっと真夜中でいいのに。」（ZUTOMAYO）のファンによって運営されている非公式アーカイブであり、ファン同士の交流およびコンテンツの整理を目的としています。営利目的の運営は一切行っておりません。
                        <br />
                        本サイトのサーバーにはオリジナルのファイルは保存されておらず、掲載されている動画、画像、設定画、イラスト、その他の視覚素材の著作権は、すべて原作者および権利所有者に帰属します。
                        <br />
                        権利者様の方で掲載に問題がある場合や削除をご希望の際は、お手数ですがご連絡いただけますようお願い申し上げます。
                      </p>
                    )}
                    {shouldShowSecondaryLang(i18n.language) && (
                      <p
                        lang="en"
                        className="text-[10px] leading-relaxed opacity-60"
                      >
                        This is an unofficial fan-made archive site for "ZUTOMAYO"
                        (Zutto Mayonaka de ii Noni.), created for community exchange
                        and content organization with no commercial intent. <br />
                        No original image files are stored on our servers. All
                        copyrights to the videos, images, concept art,
                        illustrations, and related visual materials belong to their
                        respective creators and organizations. <br />
                        If you are a copyright holder and have concerns or requests
                        for content removal, please contact us.
                      </p>
                    )}
                    {(i18n.language === 'en' || i18n.language === 'ja') && (
                      <p
                        lang="zh-Hant"
                        className="text-[10px] leading-relaxed opacity-60"
                      >
                        本站為「永遠是深夜有多好。」（ZUTOMAYO）粉絲建立之非官方資料庫，旨在整理歷年 MV 設定圖與視覺資源，並方便同好交流。本站無任何商業營利目的。
                        <br />
                        本站伺服器不存儲任何原始圖片檔案，所有收錄之影片、影像、設定畫、插圖及相關視覺素材的版權均歸原創作者及權利機構所有。
                        <br />
                        若您是版權所有者，對內容的展示有任何疑慮或要求移除，請與我們聯繫。
                      </p>
                    )}
                </div>
              </div>

              <div className="border-t-2 min-[520px]:border-t-0 min-[520px]:border-l-2 border-black/10 pt-6 min-[520px]:pt-0 pl-0 min-[520px]:pl-6 md:pl-8 col-span-1 flex flex-col justify-center">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black mb-2 opacity-30 flex flex-col leading-tight">
                    <span>{t("app.external_resources", "外部資源")}</span>
                    {shouldShowSecondaryLang(i18n.language) && (
                    <span className="text-[10px] font-mono opacity-60">
                      External_Resources
                    </span>
                    )}
                  </span>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 text-[10px] font-bold text-left">
                      <a
                        href="https://pixeliconlibrary.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-main transition-colors flex items-center gap-2 group"
                        title={t("app.pixel_icons", "像素圖示庫") + " (HackerNoon Pixel Icons)"}
                      >
                        <i className="hn hn-external-link text-[10px] opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="whitespace-nowrap">{t("app.pixel_icons", "像素圖示庫")}</span>
                          {shouldShowSecondaryLang(i18n.language) && (
                          <span className="text-[10px] font-mono opacity-60 normal-case break-words">
                            HackerNoon Pixel Icons
                          </span>
                          )}
                        </span>
                      </a>
                      <a
                        href="https://creativecommons.org/licenses/by/4.0/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-50 hover:opacity-100 hover:text-main transition-all ml-7 flex items-baseline gap-1.5"
                        title="授權：CC BY 4.0 (CC BY 4.0 License)"
                      >
                        <span>{t("app.license", "授權：")} CC BY 4.0</span>
                        {shouldShowSecondaryLang(i18n.language) && (
                        <span className="text-[8px] font-mono opacity-60">
                          License
                        </span>
                        )}
                      </a>
                    </div>

                    <div className="flex flex-col gap-1 text-[10px] font-bold text-left">
                      <a
                        href="https://github.com/TakWolf/fusion-pixel-font"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-main transition-colors flex items-center gap-2 group"
                        title={t("app.pixel_font", "像素字型") + " (Fusion Pixel Font)"}
                      >
                        <i className="hn hn-external-link text-[10px] opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="whitespace-nowrap">{t("app.pixel_font", "像素字型")}</span>
                          {shouldShowSecondaryLang(i18n.language) && (
                          <span className="text-[10px] font-mono opacity-60 break-words">
                            Fusion Pixel Font
                          </span>
                          )}
                        </span>
                      </a>
                      <a
                        href="https://openfontlicense.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-50 hover:opacity-100 hover:text-main transition-all ml-7 flex items-baseline gap-1.5"
                        title="授權：OFL 1.1 (SIL OFL 1.1)"
                      >
                        <span>{t("app.license", "授權：")} OFL 1.1</span>
                        {shouldShowSecondaryLang(i18n.language) && (
                        <span className="text-[8px] font-mono opacity-60">
                          License
                        </span>
                        )}
                      </a>
                    </div>

                    <div className="flex flex-col gap-1 text-[10px] font-bold text-left">
                      <a
                        href="https://www.neobrutalism.dev/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-main transition-colors flex items-center gap-2 group"
                        title={t("app.ui_design_system", "UI 設計系統") + " (Neobrutalism UI)"}
                      >
                        <i className="hn hn-external-link text-[10px] opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="whitespace-nowrap">{t("app.ui_design_system", "UI 設計系統")}</span>
                          {shouldShowSecondaryLang(i18n.language) && (
                          <span className="text-[10px] font-mono opacity-60 break-words">
                            Neobrutalism UI
                          </span>
                          )}
                        </span>
                      </a>
                      <span
                        className="opacity-50 ml-7 flex items-baseline gap-1.5"
                        title="授權：MIT (MIT License)"
                      >
                        <span>{t("app.license", "授權：")} MIT</span>
                        {shouldShowSecondaryLang(i18n.language) && (
                        <span className="text-[8px] font-mono opacity-60">
                          License
                        </span>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-[10px] font-bold text-left">
                      <a
                        href="https://fancyapps.com/fancybox/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-main transition-colors flex items-center gap-2 group"
                        title={t("app.lightbox_ui", "燈箱元件") + " (Fancybox UI)"}
                      >
                        <i className="hn hn-external-link text-[10px] opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="whitespace-nowrap">{t("app.lightbox_ui", "燈箱元件")}</span>
                          {shouldShowSecondaryLang(i18n.language) && (
                          <span className="text-[10px] font-mono opacity-60 break-words">
                            Fancybox UI
                          </span>
                          )}
                        </span>
                      </a>
                      <span
                        className="opacity-50 ml-7 flex items-baseline gap-1.5"
                        title="授權：GPLv3 (GPLv3 License)"
                      >
                        <span>{t("app.license", "授權：")} GPLv3</span>
                        {shouldShowSecondaryLang(i18n.language) && (
                        <span className="text-[8px] font-mono opacity-60">
                          License
                        </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}
          </div>

          <div className={`${!is404Route ? "pt-8" : ""} flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 text-[10px]`}>
            <div className="text-center md:text-left flex flex-col leading-tight items-center md:items-start md:flex-1 md:basis-0">

              <span className="flex items-center gap-1 flex-wrap justify-center md:justify-start">
                <span className="opacity-30">
                  © {new Date().getFullYear()} ZTMY MV {t("app.gallery", "資料庫")}
                  | FE: {VERSION_CONFIG.app} (🕒 {VERSION_CONFIG.buildDate.replace(/-/g, '')})
                  {systemStatus?.version && ` | BE: ${systemStatus.version}`}
                  {systemStatus?.buildTime && ` (🕒 ${new Date(systemStatus.buildTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '')})`}
                </span>
                <Tooltip delayDuration={0} open={isGeoTooltipOpen} onOpenChange={setIsGeoTooltipOpen}>
                  <TooltipTrigger asChild>
                    <span
                      className="cursor-help border-b border-dashed border-current hover:text-main transition-colors select-none opacity-30 hover:opacity-100 block"
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setIsGeoTooltipOpen(prev => !prev);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {geoInfo.labelCn}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="start"
                    sideOffset={10}
                    className="max-w-[250px] text-left z-[100] bg-main text-main-foreground shadow-md opacity-100"
                    onPointerDownOutside={() => {
                      setIsGeoTooltipOpen(false);
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-xs leading-relaxed font-bold opacity-100">{geoInfo.desc}</p>
                      {geoInfo.details && (
                        <div className="mt-1 pt-1 border-t border-black/20 text-[10px] font-mono opacity-80 leading-tight">
                          {geoInfo.details.province && geoInfo.details.city ? (
                            <p>LOC: {geoInfo.details.city.startsWith(geoInfo.details.province) || geoInfo.details.province.startsWith(geoInfo.details.city) || geoInfo.details.province === geoInfo.details.city ? geoInfo.details.city || geoInfo.details.province : `${geoInfo.details.province} ${geoInfo.details.city}`}</p>
                          ) : geoInfo.details.province ? (
                            <p>LOC: {geoInfo.details.province}</p>
                          ) : geoInfo.details.city ? (
                            <p>LOC: {geoInfo.details.city}</p>
                          ) : null}
                          {geoInfo.details.isp && (
                            <p>ISP: {geoInfo.details.isp}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </span>

              <span className="opacity-18 normal-case text-[8px] mt-1">
                <span>ZUTOMAYO_MV_GALLERY_BUILD_{import.meta.env.VITE_BUILD_DATE?.replace(/-/g, '')}_{import.meta.env.VITE_BUILD_HASH || 'dev'}_{geoInfo.labelEn}
                </span>
              </span>

            </div>

            <div className="flex flex-col items-center gap-4 order-first md:order-none md:flex-none">
              <a
                href="https://dan.tw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 font-black border-2 border-main px-4 py-2 bg-black text-main group transition-all hover:bg-main hover:text-black ztmy-avatar-trigger mb-2"
                title={t("app.visit_developer", "前往開發者個人網站")}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) {
                    img.style.animation = 'none';
                    void img.offsetWidth;
                    img.style.animation = 'var(--animate-avatar-land)';
                  }
                }}
                onMouseEnter={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) {
                    img.style.animation = 'var(--animate-avatar-jump)';
                  }
                }}
              >
                <img
                  src={`https://${geoInfo.isChinaIP ? 'cravatar.cn' : 'gravatar.com'}/avatar/2ad947c5152cd8d6d2f9b5bd450d939b?s=80&d=retro`}
                  alt="DANERSAKA"
                  className="w-8 h-8 rounded-sm border-2 border-current group-hover:border-black transition-colors origin-bottom"
                />
                <div className="flex flex-col items-start leading-tight text-[10px]">
                  <div className="flex gap-2 items-center">
                    <span className="opacity-90">{t("app.made_by_fantuan", "由 飯糰 製作")}</span>
                    <i className="hn hn-heart-solid text-red-500 group-hover:animate-pulse text-[12px] leading-none"></i>
                  </div>
                  <span className="text-[8px] font-mono">
                    <span className="opacity-60">MADE_WITH{" "}</span>
                    <i className="hn hn-heart-solid opacity-90 text-red-500 group-hover:animate-pulse text-[10px] leading-none"></i>{" "}
                    <span className="opacity-60">BY_DANERSAKA</span>
                  </span>
                </div>
              </a>

              <a
                href="https://github.com/lyangjyehaur/zutomayo-gallery"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-main transition-colors flex items-center gap-2 group opacity-50 hover:opacity-100"
                title={t("app.github_repo", "GitHub 儲存庫") + " (GitHub Repository)"}
              >
                <i className="hn hn-github text-sm" />
                <span className="flex flex-col leading-tight">
                  <span>{t("app.open_source", "開源專案")}</span>
                  <span className="text-[8px] opacity-60 normal-case">
                    Open Source Repository
                  </span>
                </span>
              </a>
            </div>

            <div className="opacity-30 text-center md:text-right flex flex-col leading-tight items-center md:items-end md:flex-1 md:basis-0">
              <span>
                {t("app.fan_made", "本專案為粉絲自製 所有媒體資源版權歸屬")} <a href="https://zutomayo.net" target="_blank" rel="noopener noreferrer" className="hover:text-main underline decoration-dashed underline-offset-2 transition-colors">ZUTOMAYO</a>
              </span>
              <span className="text-[8px] mt-1 opacity-60 normal-case">
                FAN_MADE_PROJECT MEDIA_COPYRIGHT_BELONGS_TO_ZUTOMAYO
              </span>
            </div>
          </div>
        </div>
      </footer>
  )
}
