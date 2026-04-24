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
  MVMedia?: {
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
  images: MVMedia[];
  [key: string]: any;
}

export interface ArtistMeta {
  id?: string; // fallback for older format
  twitter?: string;
  hideId?: boolean;
  displayName?: string;
  profileUrl?: string;
  bio?: string;
  collaborations?: any[];
  instagram?: string;
  youtube?: string;
  pixiv?: string;
  tiktok?: string;
  website?: string;
}
