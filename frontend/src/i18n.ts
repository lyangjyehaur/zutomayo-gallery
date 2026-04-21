import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
import zhHK from './locales/zh-HK.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import en from './locales/en.json';
import es from './locales/es.json';

i18n
  // 偵測用戶語言
  .use(LanguageDetector)
  // 將 i18n 實例傳遞給 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
      'zh-CN': { translation: zhCN },
      'zh-HK': { translation: zhHK },
      ja: { translation: ja },
      ko: { translation: ko },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'zh-TW', // 預設使用台灣繁體
    
    // 語言匹配策略
    supportedLngs: ['zh-TW', 'zh-CN', 'zh-HK', 'ja', 'ko', 'en', 'es'],
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React 已經安全防範 XSS
    },
  });

// 初始化時立刻設置一次
document.documentElement.lang = i18n.language || 'zh-TW';

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
