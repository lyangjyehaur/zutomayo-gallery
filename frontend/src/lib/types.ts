export interface MVImage {
  url: string;
  caption: string;
  richText?: string;
  alt?: string;
  width?: number;
  height?: number;
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
  images: MVImage[];
  coverImages: string[];
  keywords: MVKeyword[];
  [key: string]: any;
}
