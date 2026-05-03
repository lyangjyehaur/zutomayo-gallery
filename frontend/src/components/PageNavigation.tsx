import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PageNavigationProps {
  currentRoute: string;
  basePath: string;
}

export function PageNavigation({ currentRoute, basePath }: PageNavigationProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tabs = [
    { id: '/', label: t('nav.gallery', 'MV'), icon: 'hn-video-camera' },
    { id: '/albums', label: t('nav.appleMusicGallery', '專輯'), icon: 'hn-music' },
    { id: '/illustrators', label: t('nav.illustrators', '畫師'), icon: 'hn-user' },
    { id: '/fanart', label: t('nav.fanart', 'FANART'), icon: 'hn-image' },
    { id: '/submit', label: t('nav.submit', '投稿'), icon: 'hn-edit' },
  ];

  // We consider /favorites and /mv/:id as part of the MV Gallery
  const activeTabId = currentRoute === '/illustrators' || currentRoute === '/fanart' || currentRoute === '/albums' || currentRoute === '/submit'
    ? currentRoute 
    : '/';
    
  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];

  return (
    <div className="w-full flex justify-center pt-4 md:pt-6 pb-2 relative z-50 px-4">
      
      {/* --- Desktop View (Original Neo-Brutalist Tabs) --- */}
      <div className="hidden md:flex flex-row overflow-visible pb-8 pr-4 max-w-full">
        <div className="flex flex-row w-max mx-auto pl-2 pt-2">
          {tabs.map((tab, index) => {
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(`${basePath}${tab.id === '/' ? '' : tab.id}`)}
                className={`relative flex items-center justify-center gap-2 px-6 py-4 text-base font-black tracking-widest uppercase transition-all duration-150 whitespace-nowrap shrink-0 group hover:translate-y-[4px] hover:translate-x-[4px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-4 border-black ${
                  index > 0 ? '-ml-1' : ''
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
                <i className={`hn ${tab.icon} text-lg ${isActive ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`}></i>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Mobile View (Brutalist Dropdown) --- */}
      <div className="md:hidden w-full max-w-[400px] mx-auto pb-6 relative" ref={menuRef}>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`w-full relative flex items-center justify-between gap-2 px-4 py-3.5 text-sm font-black tracking-wider uppercase transition-all duration-150 border-[3px] border-black bg-main text-black ${
            isMobileMenuOpen 
              ? 'translate-y-[4px] translate-x-[4px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
              : 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
          }`}
          style={{ zIndex: 60 }}
        >
          <div className="flex items-center gap-2.5">
            <i className={`hn ${activeTab.icon} text-base animate-pulse`}></i>
            {activeTab.label}
          </div>
          {/* Arrow Icon that rotates when open */}
          <div className={`transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-180' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </button>
        
        {/* Dropdown Menu Items */}
        <div 
          className={`absolute top-full left-0 right-0 mt-3 border-[3px] border-black bg-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col transition-all duration-200 origin-top ${
            isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
          style={{ zIndex: 50 }}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTabId === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate(`${basePath}${tab.id === '/' ? '' : tab.id}`);
                }}
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-black tracking-wider uppercase transition-colors duration-150 ${
                  isActive 
                    ? 'bg-foreground text-background' 
                    : 'bg-background text-foreground hover:bg-main hover:text-black'
                } ${
                  index !== tabs.length - 1 ? 'border-b-[3px] border-black' : ''
                }`}
              >
                <i className={`hn ${tab.icon} text-base ${isActive ? 'animate-pulse' : ''}`}></i>
                <span className="flex-1 text-left">{tab.label}</span>
                {isActive && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
