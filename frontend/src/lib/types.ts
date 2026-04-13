export interface MVImage {
  url: string;
  caption: string;
  richText?: string;
  alt?: string;
}

export interface MVItem {
  id: string;
  title: string;
  year: string;
  date: string;
  album: string[];
  artist: string;
  youtube: string;
  bilibili: string;
  description: string;
  images: MVImage[];
  coverImages: string[];
  keywords: string[];
}
