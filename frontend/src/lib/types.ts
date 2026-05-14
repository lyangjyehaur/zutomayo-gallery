export interface MediaAnnotation {
  id: string;
  media_id: string;
  label: string;
  label_i18n?: Record<string, string>;
  x: number;
  y: number;
  style?: string;
  sort_order?: number;
}

export interface MVMedia {
  id?: string;
  type: string;
  media_type?: string;
  url: string;
  original_url?: string;
  thumbnail_url?: string;
  caption?: string;
  width?: number;
  height?: number;
  tags?: string[];
  group?: {
    id?: string;
    title?: string;
    source_url?: string;
    source_text?: string;
    author_name?: string;
    author_handle?: string;
    post_date?: string;
    status?: string;
  };
  usage?: string;
  order_index?: number;
  annotations?: MediaAnnotation[];
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
  name?: string;
  text?: string;
  lang?: string;
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
  heroVideo: string;
  autoLoadMore?: boolean;
  creators: MVCreator[];
  albums: MVAlbum[];
  keywords: MVKeyword[];
  images: MVMedia[];
  [key: string]: any;
}

export interface ArtistMeta {
  id?: string; // 通常用作 Twitter/X 帳號
  twitter?: string;
  hideId?: boolean;
  displayName?: string;
  profileUrl?: string; // 個人網站 (舊)
  website?: string; // 個人網站 (新)
  instagram?: string;
  youtube?: string;
  pixiv?: string;
  tiktok?: string;
  bio?: string;
  dataId?: string;
  collaborations?: MVMedia[];
}
