import "@testing-library/jest-dom/vitest"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"

if (!i18n.isInitialized) {
  await i18n.use(initReactI18next).init({
    lng: "zh-TW",
    fallbackLng: "zh-TW",
    resources: {
      "zh-TW": { translation: {} },
    },
    interpolation: {
      escapeValue: false,
    },
  })
}
