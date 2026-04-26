import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PageNavigationProps {
  currentRoute: string;
  basePath: string;
}

export function PageNavigation({ currentRoute, basePath }: PageNavigationProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tabs = [
    { id: '/', label: t('nav.gallery', 'MV'), icon: 'hn-video-camera' },
    { id: '/albums', label: t('nav.appleMusicGallery', '專輯'), icon: 'hn-music' },
    { id: '/illustrators', label: t('nav.illustrators', '畫師'), icon: 'hn-user' },
    { id: '/fanart', label: t('nav.fanart', 'FANART'), icon: 'hn-image' },
  ];

  // We consider /favorites and /mv/:id as part of the MV Gallery
  const activeTab = currentRoute === '/illustrators' || currentRoute === '/fanart' || currentRoute === '/albums'
    ? currentRoute 
    : '/';

  return (
    <div className="w-full flex justify-center pt-6 pb-2 relative z-20 px-4">
      {/* 為了讓最右側的陰影與 active 狀態的位移不被截斷，增加 padding-right 與 padding-bottom */}
      <div className="flex flex-row overflow-x-auto overflow-y-hidden pb-8 pr-4 custom-scrollbar max-w-full">
        <div className="flex flex-row w-max mx-auto pl-2 pt-2">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(`${basePath}${tab.id === '/' ? '' : tab.id}`)}
                className={`relative flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 text-xs sm:text-sm md:text-base font-black tracking-wider md:tracking-widest uppercase transition-all duration-150 whitespace-nowrap shrink-0 group hover:translate-y-[4px] hover:translate-x-[4px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-[3px] md:border-4 border-black ${
                  index > 0 ? '-ml-[3px] md:-ml-1' : ''
                } ${
                  isActive 
                    ? 'bg-main text-black translate-y-[4px] translate-x-[4px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                    : 'bg-background text-foreground hover:bg-main hover:text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                }`}
                style={{
                  // 永遠確保右邊的按鈕層級比左邊高
                  zIndex: index + 10,
                }}
              >
                <i className={`hn ${tab.icon} text-sm sm:text-base md:text-lg ${isActive ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`}></i>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
