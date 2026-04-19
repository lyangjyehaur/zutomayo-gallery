export interface MVImage {
  url: string;
  caption: string;
  richText?: string;
  alt?: string;
  width?: number;
  height?: number;
  tweetUrl?: string;
  thumbnail?: string;
  groupId?: string;
  [key: string]: any;
}

export interface MVKeyword {
  text: string;
  lang?: string;
  [key: string]: any;
}

export interface MVItem {
  id: string;
  title: string;
  year: string;
  date: string;
  album: string[];
  artist: string[]; // 支援多畫師
  youtube: string;
  bilibili: string;
  description: string;
  autoLoadMore?: boolean; // 是否開啟自動載入下一頁 (前台用)
  images: MVImage[];
  coverImages: string[];
  keywords: MVKeyword[];
  [key: string]: any;
}
