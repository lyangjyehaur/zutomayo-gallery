export interface MVImage {
  id?: string;
  type: string;
  url: string;
  original_url?: string;
  thumbnail_url?: string;
  caption?: string;
  width?: number;
  height?: number;
  fanart_meta?: {
    tweet_url?: string;
    tweet_text?: string;
    tweet_author?: string;
    tweet_handle?: string;
    tweet_date?: string;
  };
  MVImage?: {
    usage: string;
    order_index: number;
  };
  [key: string]: any;
}

export interface MVCreator {
  id?: string;
  name: string;
  [key: string]: any;
}

export interface MVAlbum {
  id?: string;
  name: string;
  [key: string]: any;
}

export interface MVKeyword {
  id?: string;
  name: string;
  [key: string]: any;
}

export interface MVItem {
  id: string;
  title: string;
  year: string;
  date: string;
  youtube: string;
  bilibili: string;
  description: string;
  creators: MVCreator[];
  albums: MVAlbum[];
  keywords: MVKeyword[];
  images: MVImage[];
  [key: string]: any;
}
