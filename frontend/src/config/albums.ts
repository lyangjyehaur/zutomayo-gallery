// 專輯分類配置 (用來控制首頁下拉選單的排序與分組)
export const ALBUM_CATEGORIES: Record<string, { label: { zh: string; en: string }; order: number; items: string[] }> = {
  mini: {
    label: { zh: "迷你專輯", en: "MINI ALBUM" },
    order: 1,
    items: [
      "虚仮の一念海馬に託す",
      "伸び仕草懲りて暇乞い",
      "朗らかな皮膚とて不服",
      "今は今で誓いは笑みで",
      "正しい偽りからの起床"
    ],
  },
  full: {
    label: { zh: "完整專輯", en: "FULL ALBUM" },
    order: 2,
    items: ["形藻土", "沈香学", "ぐされ", "潜潜話"],
  },
  single: {
    label: { zh: "單曲 / 其他", en: "SINGLE / OTHERS" },
    order: 3,
    items: [], // 未在上方列表中的都會被自動歸類到這裡
  }
};
