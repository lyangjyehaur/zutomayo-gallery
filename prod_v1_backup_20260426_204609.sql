--
-- PostgreSQL database dump
--

\restrict mqlVRuhmao75kvgs9Bxi6hlWRsZuYmeCo028kvujDe2VaQaLYsPQ5Zf9AJ3z36v

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: albums; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.albums (
    id character varying(36) NOT NULL,
    name character varying(255),
    type character varying(255),
    hide_date boolean,
    apple_music_album_id character varying(36)
);


ALTER TABLE public.albums OWNER TO zutomayo_gallery;

--
-- Name: TABLE albums; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.albums IS '儲存 MV 收錄的實體或數位專輯資訊';


--
-- Name: COLUMN albums.id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.albums.id IS '專輯唯一識別碼';


--
-- Name: COLUMN albums.name; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.albums.name IS '專輯名稱';


--
-- Name: COLUMN albums.type; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.albums.type IS '專輯類別 (參考 sys_dictionaries: album_type)';


--
-- Name: COLUMN albums.hide_date; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.albums.hide_date IS '是否隱藏日期';


--
-- Name: COLUMN albums.apple_music_album_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.albums.apple_music_album_id IS '關聯至 apple_music_albums.id';


--
-- Name: apple_music_albums; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.apple_music_albums (
    id character varying(36) NOT NULL,
    collection_id character varying(255),
    album_name character varying(255),
    artist_name character varying(255),
    release_date timestamp with time zone,
    track_count integer,
    collection_type character varying(255),
    genre character varying(255),
    apple_region character varying(255),
    source_url character varying(255),
    r2_url character varying(255),
    is_lossless boolean DEFAULT false,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    is_hidden boolean DEFAULT false
);


ALTER TABLE public.apple_music_albums OWNER TO zutomayo_gallery;

--
-- Name: TABLE apple_music_albums; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.apple_music_albums IS '儲存從 Apple Music 抓取的高清封面與專輯元資料';


--
-- Name: COLUMN apple_music_albums.id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.id IS '唯一識別碼';


--
-- Name: COLUMN apple_music_albums.collection_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.collection_id IS 'Apple Music Collection ID';


--
-- Name: COLUMN apple_music_albums.album_name; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.album_name IS '專輯名稱';


--
-- Name: COLUMN apple_music_albums.artist_name; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.artist_name IS '歌手名稱';


--
-- Name: COLUMN apple_music_albums.release_date; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.release_date IS '發行日期';


--
-- Name: COLUMN apple_music_albums.track_count; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.track_count IS '收錄曲目數量';


--
-- Name: COLUMN apple_music_albums.collection_type; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.collection_type IS '集合類型 (Album/Single/EP)';


--
-- Name: COLUMN apple_music_albums.genre; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.genre IS '音樂類型';


--
-- Name: COLUMN apple_music_albums.apple_region; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.apple_region IS '來源區域代碼';


--
-- Name: COLUMN apple_music_albums.source_url; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.source_url IS 'Apple Music 原始高畫質圖片網址';


--
-- Name: COLUMN apple_music_albums.r2_url; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.r2_url IS 'R2 儲存桶中的圖片網址';


--
-- Name: COLUMN apple_music_albums.is_lossless; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.is_lossless IS '是否為極致無損版本 (-999)';


--
-- Name: COLUMN apple_music_albums.created_at; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.created_at IS '建立時間';


--
-- Name: COLUMN apple_music_albums.updated_at; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.updated_at IS '更新時間';


--
-- Name: COLUMN apple_music_albums.is_hidden; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.apple_music_albums.is_hidden IS '是否在時間軸中隱藏';


--
-- Name: artist_media; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.artist_media (
    artist_id character varying(36) NOT NULL,
    media_id character varying(36) NOT NULL
);


ALTER TABLE public.artist_media OWNER TO zutomayo_gallery;

--
-- Name: TABLE artist_media; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.artist_media IS '將特定媒體直接歸屬於特定畫師';


--
-- Name: COLUMN artist_media.artist_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artist_media.artist_id IS '關聯至 artists.id';


--
-- Name: COLUMN artist_media.media_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artist_media.media_id IS '關聯至 media.id';


--
-- Name: artists; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.artists (
    id character varying(36) NOT NULL,
    name character varying(255),
    twitter character varying(255),
    profile_url character varying(255),
    bio text,
    instagram character varying(255),
    youtube character varying(255),
    pixiv character varying(255),
    tiktok character varying(255),
    website character varying(255)
);


ALTER TABLE public.artists OWNER TO zutomayo_gallery;

--
-- Name: TABLE artists; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.artists IS '儲存參與 MV 製作或繪製二創圖的創作者資訊';


--
-- Name: COLUMN artists.id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.id IS '畫師唯一識別碼';


--
-- Name: COLUMN artists.name; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.name IS '畫師名稱';


--
-- Name: COLUMN artists.twitter; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.twitter IS '推特用戶名 (不含 @)';


--
-- Name: COLUMN artists.profile_url; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.profile_url IS '頭像網址';


--
-- Name: COLUMN artists.bio; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.bio IS '畫師簡介';


--
-- Name: COLUMN artists.instagram; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.instagram IS 'Instagram 帳號';


--
-- Name: COLUMN artists.youtube; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.youtube IS 'YouTube 頻道';


--
-- Name: COLUMN artists.pixiv; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.pixiv IS 'Pixiv ID';


--
-- Name: COLUMN artists.tiktok; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.tiktok IS 'TikTok 帳號';


--
-- Name: COLUMN artists.website; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.artists.website IS '個人網站';


--
-- Name: auth_passkeys; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.auth_passkeys (
    id character varying(255) NOT NULL,
    "publicKey" text,
    counter integer,
    transports jsonb,
    name character varying(255),
    "createdAt" timestamp with time zone
);


ALTER TABLE public.auth_passkeys OWNER TO zutomayo_gallery;

--
-- Name: auth_settings; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.auth_settings (
    key character varying(255) NOT NULL,
    value text
);


ALTER TABLE public.auth_settings OWNER TO zutomayo_gallery;

--
-- Name: keywords; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.keywords (
    id character varying(36) NOT NULL,
    name character varying(255),
    lang character varying(255) DEFAULT 'zh-Hant'::character varying
);


ALTER TABLE public.keywords OWNER TO zutomayo_gallery;

--
-- Name: TABLE keywords; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.keywords IS '儲存用於搜尋與分類的標籤 (多對多關聯以避免重複及實現全域標籤雲)';


--
-- Name: COLUMN keywords.id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.keywords.id IS '關鍵字唯一識別碼';


--
-- Name: COLUMN keywords.name; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.keywords.name IS '關鍵字內容';


--
-- Name: COLUMN keywords.lang; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.keywords.lang IS '關鍵字所屬語言 (如 zh-Hant, ja, en)';


--
-- Name: media; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.media (
    id character varying(36) NOT NULL,
    type character varying(255),
    media_type character varying(255) DEFAULT 'image'::character varying,
    url character varying(255),
    original_url character varying(255),
    thumbnail_url character varying(255),
    width integer,
    height integer,
    caption text,
    group_id character varying(36),
    created_at timestamp with time zone
);


ALTER TABLE public.media OWNER TO zutomayo_gallery;

--
-- Name: TABLE media; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.media IS '儲存系統中所有的媒體資源 (圖片、影片、GIF)';


--
-- Name: COLUMN media.id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.id IS '媒體唯一識別碼';


--
-- Name: COLUMN media.type; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.type IS '媒體分類 (cover, official, fanart)';


--
-- Name: COLUMN media.media_type; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.media_type IS '媒體格式類型 (image, video, gif)';


--
-- Name: COLUMN media.url; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.url IS '系統內實際使用的網址 (R2)';


--
-- Name: COLUMN media.original_url; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.original_url IS '媒體的原始來源網址 (唯一鍵)';


--
-- Name: COLUMN media.thumbnail_url; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.thumbnail_url IS '縮圖網址';


--
-- Name: COLUMN media.width; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.width IS '媒體寬度';


--
-- Name: COLUMN media.height; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.height IS '媒體高度';


--
-- Name: COLUMN media.caption; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.caption IS '媒體描述或圖說';


--
-- Name: COLUMN media.group_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.group_id IS '關聯至 media_groups.id';


--
-- Name: COLUMN media.created_at; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media.created_at IS '建立時間';


--
-- Name: media_groups; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.media_groups (
    id character varying(36) NOT NULL,
    title character varying(255),
    source_url character varying(255),
    source_text text,
    author_name character varying(255),
    author_handle character varying(255),
    post_date timestamp with time zone,
    status character varying(255) DEFAULT 'pending'::character varying
);


ALTER TABLE public.media_groups OWNER TO zutomayo_gallery;

--
-- Name: TABLE media_groups; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.media_groups IS '媒體分組資訊 (共用來源詮釋資料，如推文)';


--
-- Name: COLUMN media_groups.id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media_groups.id IS '分組唯一識別碼';


--
-- Name: COLUMN media_groups.title; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media_groups.title IS '分組標題 (可選)';


--
-- Name: COLUMN media_groups.source_url; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media_groups.source_url IS '來源網址 (如原始推文連結)';


--
-- Name: COLUMN media_groups.source_text; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media_groups.source_text IS '來源內容 (如推文內文)';


--
-- Name: COLUMN media_groups.author_name; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media_groups.author_name IS '來源作者顯示名稱';


--
-- Name: COLUMN media_groups.author_handle; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media_groups.author_handle IS '來源作者帳號 (如 @username)';


--
-- Name: COLUMN media_groups.post_date; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media_groups.post_date IS '發布時間';


--
-- Name: COLUMN media_groups.status; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.media_groups.status IS '審核狀態 (參考 sys_dictionaries: fanart_status)';


--
-- Name: mv_albums; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.mv_albums (
    mv_id character varying(255) NOT NULL,
    album_id character varying(36) NOT NULL,
    track_number integer
);


ALTER TABLE public.mv_albums OWNER TO zutomayo_gallery;

--
-- Name: TABLE mv_albums; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.mv_albums IS 'MV 與專輯的關聯';


--
-- Name: COLUMN mv_albums.mv_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_albums.mv_id IS '關聯至 mvs.id';


--
-- Name: COLUMN mv_albums.album_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_albums.album_id IS '關聯至 albums.id';


--
-- Name: COLUMN mv_albums.track_number; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_albums.track_number IS '歌曲在專輯中的音軌編號';


--
-- Name: mv_artists; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.mv_artists (
    mv_id character varying(255) NOT NULL,
    artist_id character varying(36) NOT NULL,
    role character varying(255)
);


ALTER TABLE public.mv_artists OWNER TO zutomayo_gallery;

--
-- Name: TABLE mv_artists; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.mv_artists IS 'MV 與畫師的關聯';


--
-- Name: COLUMN mv_artists.mv_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_artists.mv_id IS '關聯至 mvs.id';


--
-- Name: COLUMN mv_artists.artist_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_artists.artist_id IS '關聯至 artists.id';


--
-- Name: COLUMN mv_artists.role; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_artists.role IS '畫師在該 MV 中的職位 (如 Animator)';


--
-- Name: mv_keywords; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.mv_keywords (
    mv_id character varying(255) NOT NULL,
    keyword_id character varying(36) NOT NULL
);


ALTER TABLE public.mv_keywords OWNER TO zutomayo_gallery;

--
-- Name: TABLE mv_keywords; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.mv_keywords IS 'MV 與關鍵字的關聯';


--
-- Name: COLUMN mv_keywords.mv_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_keywords.mv_id IS '關聯至 mvs.id';


--
-- Name: COLUMN mv_keywords.keyword_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_keywords.keyword_id IS '關聯至 keywords.id';


--
-- Name: mv_media; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.mv_media (
    mv_id character varying(255) NOT NULL,
    media_id character varying(36) NOT NULL,
    usage character varying(255),
    order_index integer DEFAULT 0
);


ALTER TABLE public.mv_media OWNER TO zutomayo_gallery;

--
-- Name: TABLE mv_media; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.mv_media IS '定義媒體在特定 MV 中的角色與排序';


--
-- Name: COLUMN mv_media.mv_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_media.mv_id IS '關聯至 mvs.id';


--
-- Name: COLUMN mv_media.media_id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_media.media_id IS '關聯至 media.id';


--
-- Name: COLUMN mv_media.usage; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_media.usage IS '媒體用途 (cover, gallery)';


--
-- Name: COLUMN mv_media.order_index; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mv_media.order_index IS '顯示順序';


--
-- Name: mvs; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.mvs (
    id character varying(255) NOT NULL,
    title character varying(255),
    year character varying(4),
    date timestamp with time zone,
    youtube character varying(255),
    bilibili character varying(255),
    description text
);


ALTER TABLE public.mvs OWNER TO zutomayo_gallery;

--
-- Name: TABLE mvs; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.mvs IS '儲存 MV 核心資訊';


--
-- Name: COLUMN mvs.id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mvs.id IS 'MV 唯一識別碼 (slug)';


--
-- Name: COLUMN mvs.title; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mvs.title IS 'MV 標題';


--
-- Name: COLUMN mvs.year; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mvs.year IS '發布年份';


--
-- Name: COLUMN mvs.date; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mvs.date IS '發布日期';


--
-- Name: COLUMN mvs.youtube; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mvs.youtube IS 'YouTube 影片 ID';


--
-- Name: COLUMN mvs.bilibili; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mvs.bilibili IS 'Bilibili BV 號';


--
-- Name: COLUMN mvs.description; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.mvs.description IS '影片說明或備註';


--
-- Name: sys_announcements; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.sys_announcements (
    id character varying(36) NOT NULL,
    content text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.sys_announcements OWNER TO zutomayo_gallery;

--
-- Name: TABLE sys_announcements; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.sys_announcements IS '首頁公告表 (獨立於系統配置)';


--
-- Name: COLUMN sys_announcements.id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_announcements.id IS '公告唯一識別碼';


--
-- Name: COLUMN sys_announcements.content; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_announcements.content IS '公告內容 (支援 Markdown 或純文字)';


--
-- Name: COLUMN sys_announcements.is_active; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_announcements.is_active IS '是否啟用/顯示';


--
-- Name: COLUMN sys_announcements.created_at; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_announcements.created_at IS '建立時間';


--
-- Name: COLUMN sys_announcements.updated_at; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_announcements.updated_at IS '最後更新時間';


--
-- Name: sys_configs; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.sys_configs (
    key character varying(255) NOT NULL,
    value jsonb,
    description text,
    updated_at timestamp with time zone
);


ALTER TABLE public.sys_configs OWNER TO zutomayo_gallery;

--
-- Name: TABLE sys_configs; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.sys_configs IS '全局配置表，系統所有的全局配置皆存於此';


--
-- Name: COLUMN sys_configs.key; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_configs.key IS '配置鍵名';


--
-- Name: COLUMN sys_configs.value; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_configs.value IS '配置內容 (JSON 格式)';


--
-- Name: COLUMN sys_configs.description; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_configs.description IS '配置說明';


--
-- Name: COLUMN sys_configs.updated_at; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_configs.updated_at IS '最後更新時間';


--
-- Name: sys_dictionaries; Type: TABLE; Schema: public; Owner: zutomayo_gallery
--

CREATE TABLE public.sys_dictionaries (
    id character varying(20) NOT NULL,
    category character varying(255),
    code character varying(255),
    label character varying(255),
    description text,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.sys_dictionaries OWNER TO zutomayo_gallery;

--
-- Name: TABLE sys_dictionaries; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON TABLE public.sys_dictionaries IS '全局字典表，存放不同表的 type 或 status 代表的意思';


--
-- Name: COLUMN sys_dictionaries.id; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_dictionaries.id IS '字典唯一識別碼 (簡短 ID，如 NanoID 或自訂代碼)';


--
-- Name: COLUMN sys_dictionaries.category; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_dictionaries.category IS '字典分類 (如 album_type, image_type)';


--
-- Name: COLUMN sys_dictionaries.code; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_dictionaries.code IS '代碼值 (如 full, fanart)';


--
-- Name: COLUMN sys_dictionaries.label; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_dictionaries.label IS '顯示名稱 (如 完整專輯, 二創圖)';


--
-- Name: COLUMN sys_dictionaries.description; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_dictionaries.description IS '詳細說明';


--
-- Name: COLUMN sys_dictionaries.sort_order; Type: COMMENT; Schema: public; Owner: zutomayo_gallery
--

COMMENT ON COLUMN public.sys_dictionaries.sort_order IS '排序權重';


--
-- Data for Name: albums; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.albums (id, name, type, hide_date, apple_music_album_id) FROM stdin;
uPDUTnP5rvR6S7-0	ぐされ	\N	\N	\N
d7L_zQaG2v1brzmr	今は今で誓いは笑みで	\N	\N	\N
Jq9zo8DmIuX0KK0g	伸び仕草懲りて暇乞い	\N	\N	\N
vZqqupt2jyIfVMRi	形藻土	\N	\N	\N
abCVmITGcauJccCF	朗らかな皮膚とて不服	\N	\N	\N
Bor8z3FlL2xN5m4K	正しい偽りからの起床	\N	\N	\N
QBTA6vPoXSRBVFj9	沈香学	\N	\N	\N
_qlhXzOVa_PeYiMe	潜潜話	\N	\N	\N
mIWLLTOIuZfe82HI	聯動	\N	t	\N
q8Dm5ywHYtJivS4R	虚仮の一念海馬に託す	\N	\N	\N
\.


--
-- Data for Name: apple_music_albums; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.apple_music_albums (id, collection_id, album_name, artist_name, release_date, track_count, collection_type, genre, apple_region, source_url, r2_url, is_lossless, created_at, updated_at, is_hidden) FROM stdin;
_5i1QiyM6ELcwRHB	1688968525	沈香学	ずっと真夜中でいいのに。	2023-06-07 07:00:00+00	13	Album	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/94/5b/c5/945bc557-1eb6-bb02-900b-7a7b6e93aa9d/23UMGIM47498.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/1688968525.png	t	2026-04-25 06:43:50.198+00	2026-04-26 00:51:20.201+00	f
KDDmLjDPGyB2Z7qt	1619144230	ZUTOMAYO's Playlist for Indonesia, Vol. 2 - EP	ZUTOMAYO	2022-04-22 07:00:00+00	6	Album	J-Pop	id	https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/f0/30/c9/f030c927-9435-b11d-8b6a-0104bbb99685/22UMGIM39857.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Indonesia_Vol_2_EP.png	t	2026-04-25 06:53:00.601+00	2026-04-26 00:51:20.384+00	t
GCsBnGQ5AJId9qKz	1619144322	ZUTOMAYO's Playlist for Mainland China, Vol. 2 - EP	ZUTOMAYO	2022-04-22 07:00:00+00	6	Album	J-Pop	cn	https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/cc/c4/da/ccc4da63-3de9-5087-78b5-41b6f79fa911/22UMGIM39865.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Mainland_China_Vol_2_EP.png	t	2026-04-25 08:42:30.465+00	2026-04-26 00:51:20.416+00	t
y1TLQxxhlCO783VY	1619144262	ZUTOMAYO's Playlist for Philippines, Vol. 2 - EP	ZUTOMAYO	2022-04-22 07:00:00+00	6	Album	J-Pop	ph	https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2e/28/7f/2e287f20-3a47-759c-c1d8-a3ebba02a3cd/22UMGIM39854.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Philippines_Vol_2_EP.png	t	2026-04-25 06:53:31.325+00	2026-04-26 00:51:20.446+00	t
aQKytEH9Bdv7lHjA	1619144059	ZUTOMAYO's Playlist for Taiwan, Vol. 2 - EP	ZUTOMAYO	2022-04-22 07:00:00+00	6	Album	日本流行樂	tw	https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/9d/77/d4/9d77d428-f055-c40e-828c-f1dd1334341c/22UMGIM39863.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Taiwan_Vol_2_EP.png	t	2026-04-25 06:53:46.838+00	2026-04-26 00:51:20.475+00	t
NfMYYvcuU6vfW-Qa	1619144472	ZUTOMAYO's Playlist for Thailand, Vol. 2 - EP	ZUTOMAYO	2022-04-22 07:00:00+00	6	Album	J-Pop	th	https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/4b/5e/f0/4b5ef040-9880-30fd-a358-728c55a40430/22UMGIM39861.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Thailand_Vol_2_EP.png	t	2026-04-25 06:53:54.399+00	2026-04-26 00:51:20.505+00	t
NCqTvIhjr7pQbc7A	1620160130	ZUTOMAYO's Playlist for U.S. Vol.2 - EP	ZUTOMAYO	2022-04-22 07:00:00+00	6	Album	J-Pop	us	https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/43/4b/ca/434bca4a-ccc4-9f81-5796-cf7d3e121c33/22UMGIM39867.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_U_S_Vol_2_EP.png	t	2026-04-25 06:54:12.025+00	2026-04-26 00:51:20.534+00	t
jHh0ZGgeiKwxZpB6	1582221484	ZUTOMAYO's Playlist for Indonesia - EP	ZUTOMAYO	2021-08-27 07:00:00+00	6	Album	J-Pop	id	https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/37/a5/9b/37a59b8f-3b21-28c1-8e91-83a6e909e320/21UMGIM83799.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Indonesia_EP.png	t	2026-04-25 06:53:08.496+00	2026-04-26 00:51:20.656+00	t
tK9lo5qgpHqj5zRw	1582222069	ZUTOMAYO's Playlist for Philippines - EP	ZUTOMAYO	2021-08-27 07:00:00+00	6	Album	J-Pop	ph	https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/84/59/2a/84592a41-3d9e-5510-26cb-4f0ebaacee63/21UMGIM83797.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Philippines_EP.png	t	2026-04-25 06:53:23.778+00	2026-04-26 00:51:20.686+00	t
qQQwfTL4JshPZy4c	1582224601	ZUTOMAYO's Playlist for Taiwan - EP	ZUTOMAYO	2021-08-27 07:00:00+00	6	Album	日本流行樂	tw	https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/03/9a/5f/039a5f73-fa70-a958-2b3c-19fb7b24fd51/21UMGIM83795.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Taiwan_EP.png	t	2026-04-25 06:53:39.368+00	2026-04-26 00:51:20.717+00	t
WNkwyhB6ud0WgOyH	1686875512	不法侵入	ずっと真夜中でいいのに。	2023-05-15 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/68/22/c0/6822c00b-74df-f1e7-8f12-6e1b2a78abee/23UMGIM47310.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/INTRUSION_Single.png	t	2026-04-25 06:50:24.468+00	2026-04-26 00:51:20.231+00	f
8Wx2bCcYmJwD91Cb	1642916641	夏枯れ	ずっと真夜中でいいのに。	2022-09-15 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/c8/25/eb/c825ebc6-39ef-1209-6c66-2cbeb946ff19/22UMGIM87370.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Summer_Slack_Single.png	t	2026-04-25 06:51:33.432+00	2026-04-26 00:51:20.322+00	f
_ZW-_Pob1ER7Hhac	1641695834	消えてしまいそうです	ずっと真夜中でいいのに。	2022-09-08 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/12/1d/ae/121daea5-6f2d-0451-d136-209711662d57/22UMGIM87369.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Blush_Single.png	t	2026-04-25 06:52:40.437+00	2026-04-26 00:51:20.351+00	f
08HrrkgyPwGgWOAe	1616088538	ミラーチューン	ずっと真夜中でいいのに。	2022-04-07 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/97/db/ca/97dbcacc-3e21-045e-d4ec-40469517e898/22UMGIM26951.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Mirror_Tune_Single.png	t	2026-04-25 06:51:27.293+00	2026-04-26 00:51:20.565+00	f
j1XdIfLuDVwBl5A7	1596281552	猫リセット	ずっと真夜中でいいのに。	2021-12-02 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/0a/6f/0b/0a6f0b98-3f39-2f7b-33d1-ad7f5aa05b01/21UM1IM43418.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Neko_Reset_Single.png	t	2026-04-25 06:50:18.043+00	2026-04-26 00:51:20.625+00	f
d3zBcIKCu5jiDq03	1657388363	綺羅キラー (feat. Mori Calliope)	ずっと真夜中でいいのに。	2022-12-15 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/5a/e8/cf/5ae8cf42-25d1-d2ea-153c-584bb1857b14/22UM1IM36015.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Kira_Killer_feat_Mori_Calliope_Single.png	t	2026-04-25 06:50:02.308+00	2026-04-26 00:51:20.261+00	f
I1dE_TCx7MXtKI_O	1649264702	残機	ずっと真夜中でいいのに。	2022-10-19 07:00:00+00	1	Single	J-Pop	jp	https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/67/9f/91/679f9186-53d0-7181-b5ed-a3ba8272c794/22UM1IM09345.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Time_Left_Single.png	t	2026-04-25 06:51:41.24+00	2026-04-26 00:51:20.291+00	f
YOC1halUy8h1ogQy	1749173257	ZUTOMAYO - 2024 한국 특별판	ZUTOMAYO	2024-06-03 07:00:00+00	33	Special Edition	J-Pop	kr	https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/d2/e5/27/d2e52743-2b63-7825-c02a-88aa0827c192/24UMGIM60212.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_2024_Korea_Edition_KR.png	t	2026-04-25 06:53:15.044+00	2026-04-26 00:51:20.079+00	f
I8M3YSz2DrSLhMg_	1729853078	ZUTOMAYO - 2024 中国特别版	ZUTOMAYO	2024-02-14 08:00:00+00	32	Special Edition	J-Pop	cn	https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/25/e9/b7/25e9b7b6-f2fe-a333-2176-de9a5d868d1d/24UMGIM13783.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_2024_CN.png	t	2026-04-25 08:42:14.207+00	2026-04-26 00:51:20.171+00	f
FtnD33UyCgIXCzkG	1607082967	伸び仕草懲りて暇乞い	ずっと真夜中でいいのに。	2022-02-16 08:00:00+00	6	EP	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/9f/7e/5b/9f7e5b57-dac7-e0a5-14af-2566bf017fc6/22UMGIM03998.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Nobi_Shigusa_Korite_Itomagoi_EP.png	t	2026-04-25 06:50:14.366+00	2026-04-26 00:51:20.595+00	f
0FlF5vCh5whub3Zy	1582226387	ZUTOMAYO's Playlist for Thailand - EP	ZUTOMAYO	2021-08-27 07:00:00+00	6	Album	J-Pop	th	https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/86/72/f3/8672f302-559a-832e-d3fb-b0d856260b0a/21UMGIM83796.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Thailand_EP.png	t	2026-04-25 06:54:03.713+00	2026-04-26 00:51:20.747+00	t
wK4-8WUmvfN8aTtM	1582226676	ZUTOMAYO's Playlist for U.S. - EP	ZUTOMAYO	2021-08-27 07:00:00+00	6	Album	J-Pop	us	https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/56/e5/44/56e54400-30d1-708a-6f8a-ca7036537671/21UMGIM83798.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_U_S_EP.png	t	2026-04-25 06:54:07.977+00	2026-04-26 00:51:20.786+00	t
Ne9fcNNyQqsktPfX	1582219490	ZUTOMAYO’s Playlist for Mainland China - EP	ZUTOMAYO	2021-08-27 07:00:00+00	6	Album	J-Pop	cn	https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/65/c6/dd/65c6dd7b-7847-a1a1-2798-f7e86f05a229/21UMGIM83793.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_s_Playlist_for_Mainland_China_EP.png	t	2026-04-25 08:42:22.069+00	2026-04-26 00:51:20.817+00	t
AA406hHCQ5djYD6a	1548835870	ぐされ	ずっと真夜中でいいのに。	2021-02-10 08:00:00+00	14	Album	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/2c/26/0d/2c260db7-824c-af80-d6c1-fb30b3124a14/21UMGIM00896.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Gusare.png	t	2026-04-25 06:50:52.959+00	2026-04-26 00:51:20.969+00	f
daJTUGhekVjE8kkR	1851385243	有心論	ずっと真夜中でいいのに。	2025-11-19 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/05/1b/8b/051b8b98-80ce-ddd3-5e4d-c9279656b531/25UM1IM76053.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Yushinron_Single.png	t	2026-04-25 06:52:04.994+00	2026-04-26 00:51:19.757+00	f
RxiC8BhdoglQnUci	1573520396	ばかじゃないのに	ずっと真夜中でいいのに。	2021-07-04 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/30/e4/ab/30e4ab2f-cef9-c844-a6f6-b488a69bd7f8/21UMGIM55999.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Stay_Foolish_Single.png	t	2026-04-25 06:50:32.352+00	2026-04-26 00:51:20.847+00	f
kcrCSS_cFSVH5Zx0	1570795386	あいつら全員同窓会	ずっと真夜中でいいのに。	2021-06-18 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/d6/57/e2/d657e297-1bd1-423d-9062-b4cf4e554d2b/21UMGIM47219.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Inside_Joke_Single.png	t	2026-04-25 06:51:08.151+00	2026-04-26 00:51:20.879+00	f
7n9gOemkPtCQqMrS	1462837856	正義	ずっと真夜中でいいのに。	2019-05-22 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/3f/f4/49/3ff44975-1255-b076-6ac9-19d86f39abd3/19UMGIM30910.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Seigi_Single.png	t	2026-04-25 06:51:36.912+00	2026-04-26 00:51:21.209+00	f
WgsbuEBFpXuejTwi	1428083643	秒針を噛む	ずっと真夜中でいいのに。	2018-08-30 07:00:00+00	1	Single	J-Pop	jp	https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/38/2c/03/382c0375-11db-242e-4bf0-4e2e31380d74/00602567952343.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Byoushinwo_Kamu_Single.png	t	2026-04-25 06:52:29.975+00	2026-04-26 00:51:21.327+00	f
fxAWp7C7pU4xvsVu	1555410262	秒針を噛む - From THE FIRST TAKE	ずっと真夜中でいいのに。	2021-03-05 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/b7/66/ed/b766ed18-1e4d-442c-64f9-01d46e8cd2d0/21UMGIM15294.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Byoushinwo_Kamu_From_The_First_Take_Single.png	t	2026-04-25 06:49:38.769+00	2026-04-26 00:51:20.94+00	f
rBowI30ywB43g9Br	1556551740	正しくなれない - From THE FIRST TAKE	ずっと真夜中でいいのに。	2021-03-17 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/3e/db/0d/3edb0dcb-ffc3-0321-395c-fbd1cda4afb6/21UMGIM15296.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Can_t_Be_Right_From_The_First_Take_Single.png	t	2026-04-25 06:51:49.056+00	2026-04-26 00:51:20.91+00	f
GrilGBRfn4UY6D00	1881609986	形藻土	ずっと真夜中でいいのに。	2026-03-25 07:00:00+00	18	Album	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ad/2a/19/ad2a1985-1499-5d04-b11d-8cdf6dd6e599/26UMGIM24458.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/KEISOUDO.png	t	2026-04-25 06:49:30.855+00	2026-04-26 00:51:19.662+00	f
XsPbO3n-rrZaj0ZX	1813833250	クリームで会いにいけますか	ずっと真夜中でいいのに。	2025-05-22 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/0a/3c/75/0a3c75bb-b239-e926-4ce0-7c26febd534a/25UMGIM62240.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/CREAM_Single.png	t	2026-04-25 06:50:46.35+00	2026-04-26 00:51:19.849+00	f
6DQFRvJIRAjWDRP2	1869186094	メディアノーチェ	ずっと真夜中でいいのに。	2026-01-29 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/93/f5/3e/93f53e85-320d-931f-b2ce-ca88a0bbadd7/26UMGIM00769.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Medianoche_Single.png	t	2026-04-25 06:51:01.941+00	2026-04-26 00:51:19.726+00	f
1MQUpHGHUPMCVVfj	1746027589	嘘じゃない	ずっと真夜中でいいのに。	2024-05-23 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/71/14/23/71142361-f947-ea96-8ec0-47375d373f83/24UMGIM42945.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Truth_In_Lies_Single.png	t	2026-04-25 06:52:08.787+00	2026-04-26 00:51:20.14+00	f
zAC3CQuXPUun3fcJ	1806044916	微熱魔	ずっと真夜中でいいのに。	2025-04-18 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/27/59/fe/2759fe0b-3091-0089-c438-d95f8f2e1462/25UMGIM46984.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Warmthaholic_Single.png	t	2026-04-25 06:50:07.71+00	2026-04-26 00:51:19.88+00	f
4Sd3TSfuqeDf-uYm	1817596286	形	ずっと真夜中でいいのに。	2025-06-12 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/d5/9a/f6/d59af66d-c805-8137-3b10-606d850acf34/25UMGIM76056.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Pain_Give_Form_Single.png	t	2026-04-25 06:49:49.43+00	2026-04-26 00:51:19.818+00	f
XYGetykB6THTcQxI	1840129493	永遠深夜万博「名巧は愚なるが如し」	ずっと真夜中でいいのに。	2025-09-24 07:00:00+00	24	Live	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/fd/1c/6f/fd1c6f49-741c-61ea-585c-367162b9746f/25UM1IM24272.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/MIDNIGHT_FOREVER_EXPO_MEIKO_WA_GUNARUGA_GOTOSHI_Live.png	t	2026-04-25 06:51:18.529+00	2026-04-26 00:51:19.787+00	f
kqxrUcnhPmmtd_d6	1883661771	ZUTOMAYO - 2026 Special Edition	ZUTOMAYO	2026-03-13 07:00:00+00	10	Special Edition	摇滚	cn	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/d3/ff/2d/d3ff2dd5-2c7a-f627-e52b-eba2c660d1a0/26UMGIM27572.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_2026_Special_Edition.png	t	2026-04-25 06:52:52.542+00	2026-04-26 00:51:19.696+00	f
0JWcl6DP9fz2pvUe	1749172962	ZUTOMAYO - 2024 香港特別版	ZUTOMAYO	2024-06-03 07:00:00+00	33	Special Edition	日本流行樂	hk	https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/97/de/cd/97decd66-8627-b389-e6ae-d0405467245a/24UMGIM60215.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/ZUTOMAYO_2024_HK.png	t	2026-04-25 06:52:44.374+00	2026-04-26 00:51:20.109+00	f
zUiNL75LZfvmJLzx	1748771422	Blues in the Closet	ずっと真夜中でいいのに。	2024-06-06 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/22/2d/e3/222de3d6-7738-239c-7bb3-6b492d321c6e/24UMGIM42946.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Blues_in_the_Closet_Single.png	t	2026-04-25 06:52:17.389+00	2026-04-26 00:51:20.049+00	f
VkQ_3XzZYTEAo-Ij	1763157328	海馬成長痛	ずっと真夜中でいいのに。	2024-08-29 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/8b/1c/f0/8b1cf040-0a56-b541-7212-c234528fe27d/24UMGIM85892.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Hippocampal_Pain_Single.png	t	2026-04-25 06:52:21.514+00	2026-04-26 00:51:20.004+00	f
PH_YyBbMGlt0oIRb	1790588887	シェードの埃は延長	ずっと真夜中でいいのに。	2025-01-21 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/04/df/09/04df099f-311e-1d97-9ce7-8b8755f58ecc/24UM1IM43445.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/SHADE_Single.png	t	2026-04-25 06:49:34.713+00	2026-04-26 00:51:19.911+00	f
Zomma5CPpRmPZTAE	1769114247	本格中華喫茶・愛のペガサス ～羅武の香辛龍～	ずっと真夜中でいいのに。	2024-09-25 07:00:00+00	28	Live	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/68/0e/4c/680e4cc3-00ff-5373-ef07-752b40a2c3c0/24UMGIM95338.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/AUTHENTIC_CHINESE_KISSA_Ai_no_Pegasus_SPICY_DRAGON_OF_LOVE.png	t	2026-04-25 06:50:58.632+00	2026-04-26 00:51:19.974+00	f
DRhg5ljnTw3-n0Wf	1770242092	虚仮の一念海馬に託す	ずっと真夜中でいいのに。	2024-10-23 07:00:00+00	6	EP	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/1e/86/f9/1e86f9db-204f-d5dc-04a9-c456df0b6a89/24UM1IM02203.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Koke_no_ichinen_Kaiba_ni_takusu_EP.png	t	2026-04-25 06:50:42.684+00	2026-04-26 00:51:19.942+00	f
b_oqvf68OtC1qpXp	1481464093	潜潜話	ずっと真夜中でいいのに。	2019-10-30 07:00:00+00	13	Album	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/b7/fe/4c/b7fe4cb4-fb88-578c-d58d-f650043ff298/19UMGIM82675.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Hisohiso_Banashi.png	t	2026-04-25 06:49:45.795+00	2026-04-26 00:51:21.15+00	f
JrxF1lwByAaA0stJ	1543162290	正しくなれない	ずっと真夜中でいいのに。	2020-12-17 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/fa/22/7e/fa227e7a-a1dd-5631-be96-e7e896daaa18/20UM1IM11050.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Can_t_Be_Right_Single.png	t	2026-04-25 06:52:13.763+00	2026-04-26 00:51:20.999+00	f
V4hjmZS8nobDJ1L8	1438584985	脳裏上のクラッカー	ずっと真夜中でいいのに。	2018-10-02 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/99/24/d7/9924d7a9-a53a-8292-9ee5-8414fc9676fe/00602577169069.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Nouriueno_Cracker_Single.png	t	2026-04-25 06:52:35.664+00	2026-04-26 00:51:21.298+00	f
CyNMma1daKIJFW4x	1452721875	眩しいDNAだけ	ずっと真夜中でいいのに。	2019-02-27 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/3b/6f/0e/3b6f0e8b-fab9-e871-f994-7f296e477ec0/00602577451720.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Mabushii_DNA_Dake_Single.png	t	2026-04-25 06:49:57.407+00	2026-04-26 00:51:21.239+00	f
Q7QRgwByF9q-AUB_	1511078937	お勉強しといてよ	ずっと真夜中でいいのに。	2020-05-15 07:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ce/35/01/ce350155-d538-e9dd-c01a-3af6c1a94bfe/20UMGIM31118.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Obenkyou_Shitoiteyo_Single.png	t	2026-04-25 06:43:45.118+00	2026-04-26 00:51:21.121+00	f
ACkYKtCNSj9_CfFp	1536572611	暗く黒く	ずっと真夜中でいいのに。	2020-11-03 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/c7/81/1a/c7811a2e-9e2a-407d-e195-0b91477962e9/20UMGIM91599.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Darken_Single.png	t	2026-04-25 06:52:25.565+00	2026-04-26 00:51:21.058+00	f
gzrPn4326htT20Ot	1540258076	勘ぐれい	ずっと真夜中でいいのに。	2020-11-27 08:00:00+00	1	Single	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/18/8c/11/188c1145-de45-99ec-3214-627212c1283e/20UM1IM01424.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Hunch_Gray_Single.png	t	2026-04-25 06:49:25.184+00	2026-04-26 00:51:21.028+00	f
r1uwDTfVodHswc69	1440133774	正しい偽りからの起床	ずっと真夜中でいいのに。	2018-11-14 08:00:00+00	6	EP	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/19/07/13/1907134a-ffe1-c31a-ab6b-18bba8575dd4/00602577195488.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Tadashii_Itsuwarikarano_Kishou_EP.png	t	2026-04-25 06:51:45.295+00	2026-04-26 00:51:21.268+00	f
5H8VP342xd0L68Jq	1464108327	今は今で誓いは笑みで	ずっと真夜中でいいのに。	2019-06-12 07:00:00+00	6	EP	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/f7/20/47/f72047ef-3944-2b5b-25b5-3979f5ac2aef/19UMGIM30912.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Imawa_Imade_Chikaiwa_Emide_EP.png	t	2026-04-25 06:51:23.584+00	2026-04-26 00:51:21.179+00	f
mBT4Ai4giZcM_Kkp	1522244018	朗らかな皮膚とて不服	ずっと真夜中でいいのに。	2020-08-05 07:00:00+00	6	EP	ロック	jp	https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/86/84/fc/8684fcc1-debe-ee04-18c8-99a111b96038/20UMGIM52165.rgb.jpg/10000x10000-999.png	https://r2.dan.tw/covers/zutomayo/Hogarakana_Hifutote_Fufuku_EP.png	t	2026-04-25 06:49:53.919+00	2026-04-26 00:51:21.091+00	f
\.


--
-- Data for Name: artist_media; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.artist_media (artist_id, media_id) FROM stdin;
RmtKtzeraxdkdhnZ	Nw1RDO9P02Vw8Qws
RmtKtzeraxdkdhnZ	uHnpAqBA1jaAi0H8
RmtKtzeraxdkdhnZ	YEijExvBI_3yobk2
RmtKtzeraxdkdhnZ	XjYt72HMdmzSSgyk
\.


--
-- Data for Name: artists; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.artists (id, name, twitter, profile_url, bio, instagram, youtube, pixiv, tiktok, website) FROM stdin;
QE4JV27h05ZQRro7	notai	\N	\N	\N	\N	\N	\N	\N	\N
RbNFIZ4ecTrcM92Z	のをか	\N	\N	\N	\N	\N	\N	\N	\N
K3KVGFC2No9fBJQs	石田祐康	\N	\N	\N	\N	\N	\N	\N	\N
D3t3xtROCoubaQi2	三皷梨菜	\N	\N	\N	\N	\N	\N	\N	\N
Vj56t8u12q9eg_B0	YP	\N	\N	\N	\N	\N	\N	\N	\N
qOLdZTNFKsK1GGoQ	sakiyama	\N	\N	\N	\N	\N	\N	\N	\N
QA8NJYRnN6hnSXnt	しの	\N	\N	\N	\N	\N	\N	\N	\N
_1cwF5-kgLXvctcI	すとレ	\N	\N	\N	\N	\N	\N	\N	\N
KoE1-60xXKKS_hQr	革蝉	\N	\N	\N	\N	\N	\N	\N	\N
9z4L5nhmLjANyHto	ジノ	\N	\N	\N	\N	\N	\N	\N	\N
ex6Z8Noialbsnzqf	Waboku	\N	\N	\N	\N	\N	\N	\N	\N
ehDXy8I-KuLkuqZq	はなぶし	\N	\N	\N	\N	\N	\N	\N	\N
z29cCP6RG2OqNmQE	安田現象	\N	\N	\N	\N	\N	\N	\N	\N
34XbBTibb0STDXRO	こむぎこ2000	\N	\N	\N	\N	\N	\N	\N	\N
327XL29c6Sa5CYwj	えいりな刃物	\N	\N	\N	\N	\N	\N	\N	\N
l-sIlWtwwfryBHLz	未知	\N	\N	\N	\N	\N	\N	\N	\N
RmtKtzeraxdkdhnZ	TV♡CHANY	@tvchany_	https://www.tvchany.com/	TVCHANY，現居瑞士的越南插畫家。創作風格受日本文化、時尚與遊戲影響，作品多以超現實氛圍呈現，致力於描繪異世界背景下的角色故事。	tvchany	https://www.youtube.com/channel/UC8F5ng2hQyuxDnzg7k-eTQg	https://www.pixiv.net/users/8090482	@tvchany_	https://www.tvchany.com/
J2F9B2qgyUJp_8Gy	G子	@G2_1112	\N	\N	\N	\N	\N	\N	\N
xd6TgubINllED7x1	ゴル	@goru_777	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: auth_passkeys; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.auth_passkeys (id, "publicKey", counter, transports, name, "createdAt") FROM stdin;
\.


--
-- Data for Name: auth_settings; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.auth_settings (key, value) FROM stdin;
\.


--
-- Data for Name: keywords; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.keywords (id, name, lang) FROM stdin;
2tf8X1VfXupe9WaH	Nareai Serve	en
lRdd6HpfCwYNJuhV	Nareai Sa-bu	en
lZkQy7XDxCtsJmLE	迎合發球	zh-Hant
qA6cNJJz4WbNYbZP	迎合发球	zh-Hans
NwQKUNEZ8zpBUwQA	串通一气发球	zh-Hans
Eg3m1ThXwLD_04a6	친숙한 서브	ko
x3xKaxgARKi8g_AW	나레아이 서브	ko
f-zkGZTIH26WB31r	壁櫥中的藍調	zh-Hant
Lm22Yt2O-E2pjGDu	衣櫥中的藍調	zh-Hant
V1JujBcBdvYKu_Wa	壁橱中的蓝调	zh-Hans
nmoUERiOUwNWi9rg	好きでも嫌いなあまのじゃく	ja
OqQP-RqxBlRNriDr	好きあま	ja
acVI_7DDZmB6Ad39	我的鬼女孩	zh-Hant
HV7wQaN8Zfghfj8Y	Pain Give Form	en
TdXwc_GJSr50omPh	Katachi	en
lLK6rsa4G1yqyJYt	형태	ko
2X2mGctDbM1xOSrh	카타치	ko
PHmVglMT0HBKqEfS	ドールハウス	ja
DYVe7aKqTzYLbtHi	人偶之家	zh-Hans
ziMdwZ9Ki1ZpncWn	Blush	en
SMuDyWVLq5dxm5QA	Kiete Shimaisou Desu	en
mTWWJQlr2dI__PhY	就快消失了	zh-Hant
ubIV1FUl0slQdAl7	好像快要消失一般	zh-Hans
dd2g5F7aaxeOWB0S	사라져버릴 것 같아요	ko
ADaSdbVVwNTzEfDg	키에테시마이소오데스	ko
KaeU5-HxqaAEaOCf	雨を告げる漂流団地	ja
lNs4pK2Wz30GH8cT	漂流団地	ja
D-O2q_JUSAMJExt_	漂流家园	zh-Hans
MvAEq9hbJNSMwNsV	Summer Slack	en
MOPjI7hDhmE7C_pX	Natsugare	en
0vwoU9-18LDF-3AQ	夏日枯落	zh-Hant
tyT7Lprzr_8NwMgT	靡靡盛夏	zh-Hans
VCIvFhH0txl_lozL	여름철	ko
RNuEP3i34r5VJDpu	나츠가레	ko
E0_6he9pjps8-2_T	Neko Reset	en
Ecw5ZPNwpuTOogLp	Neko Risetto	en
ilnueAHgaRE1sltb	貓咪重置	zh-Hant
v-05PcSxzxG8VzjA	猫重置	zh-Hans
mueVNGHsGO9rQjWd	고양이 리셋	ko
LlHQRl35XtVgRmkw	네코리셋토	ko
1iVlinP52WNmcfEE	Kansaete Kuyashiiwa	en
AHA787pe6qyXyDMa	直覺敏銳還真遺憾	zh-Hant
JM_Yye2d1VwdM38W	直觉敏锐而不甘	zh-Hans
6wxinz_qDmk2Wdx2	直觉如此敏锐真令人懊恼啊	zh-Hans
7sjdJhPqwikjF3Ta	감이 좋아서 분해	ko
OhpcOemniXAh06BE	칸가 사에테 쿠야시이와	ko
C6oZDtceUZ7hNG1i	One's Mind	en
EFybMikeb37K-gOL	Mune No Kemuri	en
khw8NPevwYqxPgKb	胸口的煙霧	zh-Hant
QQaw3qvHkl1Lv5k5	胸之煙	zh-Hant
WVvrslDjFoubkmt1	焚心如火	zh-Hans
p5bCh5rxyc69sR_U	胸之烟	zh-Hans
BAOqN4t7k_3rM5IL	胸烟	zh-Hans
f2RBIAtcOCAWxdpy	마음의 연기	ko
DEUTrCemGvFuAlzu	무네노 케무리	ko
3GihFW3eGBeTSE8U	Dear. Mr"F"	en
iGNCy1Z_nYU1kqwK	親愛的F先生	zh-Hant
VOf080KOm92i9hVh	亲爱的F先生	zh-Hans
kU44urCrK1KNfRYy	Konnakoto Soudou	en
GpkyeLMflzYTyW_G	像這樣的騷動	zh-Hant
b3Ymb-9exdVllhhH	这种事骚动	zh-Hans
jlIqIHni71Eb2nLs	이런 일 소동	ko
y7BqnYCIgb4rYaBO	콘나 코토 소오토오	ko
LaSyqcCHBBEd7_J_	Kettobashita Moufu	en
zeeT_DL2A7Pyjbne	踢飛的毛毯	zh-Hant
RSn5MYuNP-o0kvRF	一脚踢飞的毛毯	zh-Hans
zuszFtnX0k30rx3I	걷어차버린 담요	ko
w-o9PEjuXIKZrDjZ	켓토바시타 모오후	ko
gEEpe5m-AZJkKwvC	Mabushii DNA Dake	en
ryjltc3X9MMRQ99C	如此耀眼的DNA	zh-Hant
pV0VHrrEkjZ9nbdt	只是耀眼的DNA	zh-Hans
L9QmZUxoDr-xdikN	눈부신 DNA뿐	ko
utueviPC1IDdz27T	마부시이 디엔에이 다케	ko
lwvx8ylWTeAAqnZP	Humanoid	en
4llnWdrV6auJ4YbQ	類人類	zh-Hant
NfJxcM38Z25ehKdX	类人类	zh-Hans
HHfyvOAe6VGbNMaE	휴머노이드	ko
nqrkf7kpU8LW75lY	Seigi	en
nzRsJLq1uMd_jpyP	Justice	en
pUBQFEYEv0Kn_ACC	正义	zh-Hans
Iz3CYkFz1guky4pu	정의	ko
PUmsuaQCYCcsm2UW	세이기	ko
QKRLfvuqPz1ZTKwX	FASTENING	en
K7UuaVdcOJuBED7e	Teiketsu Bolt	en
MkTt2ne2s5vZCGYY	Teiketsu Boruto	en
oEmchzejw6st5UA_	低血壓螺栓	zh-Hant
L0Nbzgs7NF4Ureui	低血螺栓	zh-Hans
wS5WHkKQnK1T1xeN	저혈 볼트	ko
YzUYja2PhIO13W_8	테이케쓰 보루토	ko
N7waWi2YhTVS7Uya	ズトラ王	ja
L8tDwUXRrIYnKJev	拉麵	zh-Hant
QxsD1JrvE_S_jzfH	日清拉王	zh-Hant
HR4EntpYZUp1Fwnd	拉面	zh-Hans
x6pSqQMa63ywA7GB	He And Me	en
5su-2J62PG9_n_Av	火腿	zh-Hant
Hg-2AU-pmxHDOr0n	Hippocampal Pain P3R	en
W_X8SdHpXmIsHE3Z	Kaiba Seichoutsu P3R	en
uRRQdVfKsCdSi0fm	女神异闻录３ Reload	zh-Hans
XmsfF_6xHtozt38e	女神異聞錄３ Reload	zh-Hant
k1SLFk3iDR1t_JiH	海马成长痛 P3R	zh-Hans
u_t2IoLnp2bXiATW	CREAM	en
EtAWosaUXelONgxO	Cream De Aini Ikemasuka	en
6GHM8zwyddETVYuk	Kuri-mude Aini Ikemasuka	en
ev-6oY9NPlrsyJmt	可以到奶油中見面嗎	zh-Hant
TWzUsvRIdWCuk38t	能以奶油之身相见吗	zh-Hans
kG_ubUWu2vICfhgp	크림으로 만나러 갈 수 있나요	ko
iJNv0yGSNOP9ZJkA	쿠리무데 아이니 이케마스카	ko
RnI2J3J5vx42hDX1	Nouriueno Cracker	en
j0VPzgbMJ_-AS1uE	Nouriueno Kurakka-	en
xoZLoGHrfbX0hmLC	腦海裡的彩炮	zh-Hant
VyLcvkeH-8PRccg_	腦內的拉炮	zh-Hans
gTI5P-0eIX3i1RMf	脑海中的礼花	zh-Hans
OchGktp8ro2P1ND-	뇌리 위의 크래커	ko
d4CNbZqM4MtDGaCi	노우리 우에노 쿠랏카	ko
wqqPOTscU04F08c8	Haze Haseru Haterumade	en
HDqb_KY7hWYA-Fy7	蝦虎翱游直至盡頭	zh-Hant
PyZoPxKd9Npwon_t	虾虎遨游直至尽头	zh-Hans
GoSePGLBzIW-OXVU	八驰果	zh-Hans
REBtirf3YubPqDch	망둥이 달린다 끝까지	ko
P0Feu2wbGju3an-G	하제 하세루 하테루마데	ko
6wBrsfk-ESDTCZcQ	Inemuri Enseitai	en
XsrvRfPhBOxw7Jfx	假寐遠征隊	zh-Hant
w5T5Kz8Bj5uexw-h	Truth In Lies	en
WoPqu-E8iXbA7iPb	Uso Janai	en
Begmim9kUTxue0wq	不是謊言	zh-Hant
2iCYJQT_HFXJchfT	并非谎言	zh-Hans
Gs2FA14zqz3oPlXm	不是谎言	zh-Hans
GmfdG2s-cNZg-7Oq	乌索	zh-Hans
vCsX0895EdZOunsc	거짓이 아니야	ko
hrjxknGNkoYUfRPO	우소쟈나이	ko
M6kWT6a74LggZYYb	Time Left	en
Elr5shaZZFoqAWbE	Zanki	en
IuB3il81g-G9GeLW	餘命數	zh-Hant
XbO9fB26877wKCti	殘機	zh-Hant
-WIk21RW2jwQOBaH	残机	zh-Hans
Du0gGSh7Ug38QVxu	잔기	ko
vYZ7NE_YlOBDyhVk	잔키	ko
qQSVLdMA5BGN_7-i	チェンソーマン	ja
6-Pg9rQ9JxX9_ii1	chainsawman	en
d_y-8Dpk6oPx_PLk	电锯人	zh-Hans
pzcgHBweiqCfTUbD	Warmthaholic	en
XB0wBSZxQ-mtocdp	Binetsuma	en
5_8XH2nUIpceF2no	微热魔	zh-Hans
cF4bf5raAzLWsR9y	미열마	ko
9MG1072Xuapso56A	비네츠마	ko
EQFJrpAhAwIUNQTb	阿波連さんははかれない	ja
eOFlm32gkAcjD2mL	Medianoche	en
b4g8eMF3kAqC-KwM	午夜	zh-Hant
M_2WKmQYb3fXxLmy	메디아노체	ko
H5yeHv5eETOtQK66	ultra soul	en
3e0TN30QRnKJldF3	ultra tamashii	en
M9AB809x6uJR35Oq	urutora tamashii	en
sBy17hGM5hxHaaN3	ultra灵魂	zh-Hans
KXUXr_XZQpvEgxDh	ultra靈魂	zh-Hant
lmr1p0JnW6LUtuoW	奧特魂	zh-Hans
aVt4Yb-VeFQfGtaA	超魂	zh-Hant
Em0sfvPAb2mig5ma	ultra혼	ko
hQxMmmOvEAD27TAf	우루토라 타마시이	ko
5GkLQ_XNT687J359	DARKEN	en
7aWlWIIZfWWqIr4O	Kuraku Kuroku	en
wNh0gTRhcq5xOVu3	Crack Clock	en
Kj82wvfwO2k6Nl9p	幽暗漆黑	zh-Hant
D1vd4dsUOiKKkWvU	昏暗漆黑	zh-Hans
ERM840B2O8ALXjhr	乌漆墨黑	zh-Hans
V4Mg750yG2vVMR2O	어둡게 검게	ko
hTrZEsvNeaaW9Wam	쿠라쿠 쿠로쿠	ko
Qto4_Jb5hsGtiBAt	さんかく窓の外側は夜	ja
lRjrVO5EYntL6t7J	Hippocampal Pain	en
VovZbCn3vYaNAGbb	Kaiba Seichoutsu	en
EA1r0CN-W8mZEPGz	海马成长痛	zh-Hans
P_-0gB4WcBdcrkxU	海马生长痛	zh-Hans
6hIYp6nF7nNdqZEX	해마성장통	ko
3-hxwMNhY_SIjdpB	카이바 세이쵸오 쓰	ko
rLtXzJkFEVZwRjWR	MIRROR TUNE	en
EZbCh8qJKxs_OiTA	鏡中旋律	zh-Hant
cpv8JfCvXML-Zjpo	鏡像調	zh-Hant
C7EYKXRcQxxEhKiX	镜像调	zh-Hans
2_-mSSgveT1n1AV0	米拉兔	zh-Hans
y4f32hJyaSRlPVZ4	미러 튠	ko
QOEsU5_TK9YYrAL5	Stay Foolish	en
5GxzaZggodq5dJCK	Baka Janai Noni	en
jwDLK7IcegBaMN3F	又不是笨蛋	zh-Hant
_hKDZ2tHU6S_17cp	其实心知肚明	zh-Hans
e2TvLZTUfkH-v8q-	虚心若愚	zh-Hans
dy535OB3guSk7Y5M	바보가 아닌데도	ko
VL2wmOw21yJt4xe6	바카쟈 나이노니	ko
Su7mUNbvL5V_1d2w	Hanaichi Monnme	en
_tJ43AyX1ABwl-8n	花一两	zh-Hans
rLd70sVvHazMBgmY	花15	zh-Hans
kSkh5vwUea7ytmc3	하나이치몬메	ko
Eqnzha5FU4FTzr4r	Can’t Be Right	en
fxmrrc19xP96WMft	Tadashiku Narenai	en
oI43xNICz9F-NzGz	無法走上正確的路	zh-Hant
8H0L4YF6sVKDL0Mf	无法成为正确	zh-Hans
pJ7PrAIraj5sFZts	올바르게 될 수 없어	ko
SUV7cLKyOdehWwrZ	타다시쿠 나레나이	ko
e3Eso2LuyPvu2TOl	約束のネバーランド	ja
jkVMsw5H7gjr2MW1	約ネバ	ja
z5IwTX7AQnFcb1VU	KUZURI	en
NIjbGyA5dqWJhtfk	Kuzuri Nen	en
4GckIgRZUhPTO3-v	廢物理念	zh-Hant
3bkWypPVb5Mi3kEt	狼獾理念	zh-Hans
uL332kjYTU1yTRV4	족제비 이념	ko
jxKJLaMtuaipc0a_	쿠즈리넨	ko
Q44KCvv4BZQnWQCO	Byoushinwo Kamu	en
GTDwZGENN1J3Gxz6	啃咬秒針	zh-Hant
u51Zjt9Hj4RWhmOA	噬咬秒針	zh-Hant
63_faP6Dpf99zO9a	咬住秒針	zh-Hant
_mVYOXQaGkuYOkeJ	咬住秒针	zh-Hans
ktTLAFENmAImTaai	초침을 깨물다	ko
SIBr62_7Nfg5onpt	뵤우신오 카무	ko
vYbBPeTMW8Ywtv4d	燈球	zh-Hant
CM25Cwp6txn5y1PK	灯球	zh-Hans
t37b42WEKaJ-WjXJ	米拉波	zh-Hans
jfFeytmTBZHktE3z	미라보	ko
51qyr_2z16HA1LWV	ダンダダン	ja
XNrOkJxHNSd5UutA	Dandadan	en
UKsnm-L1-EeYHWyQ	當噠當	zh-Hant
cFGdkXkvcoxUl-8B	超自然武裝	zh-Hant
Zb7wAc-nCdkWtLvF	膽大黨	zh-Hant
dZpO8HngjNuKH-0x	胆大党	zh-Hans
WETKK1yLJat6dTs-	高速婆婆	zh-Hans
Kc5MeCHfI1IFJEhT	SHADE	en
JrW8BDmf7mijaaDX	Shade No Hokori Wa Enchou	en
Kef96WGxiJ1XdRNZ	She-do No Hokori Wa Enchou	en
-M334rEg4NMYiOeU	遮陽簾上的灰塵不斷積累	zh-Hant
2d94b05EEi3u8xAw	遮阳帘上尘埃堆积	zh-Hans
iGRKXFehqUlX2_gh	쉐이드 커튼 위 먼지는 쌓이는 중	ko
ZLRdefZP9FUQAv8S	셰에도노 호코리와 엔쵸오	ko
EoVxNolZA6jSAhXt	Kira Killer	en
DCRJomlEcaT4FTtf	綺羅殺手	zh-Hant
ZC8M2psBbTEVeGK3	绮罗杀手	zh-Hans
GJQbvT7LTiB06iOC	美丽闪耀	zh-Hans
9tyG34L3XcFLOvcZ	키라 킬러	ko
oIPEHl7weOgE_sH-	키라 키라	ko
Px2NaoyNTyMpBEQd	Inside Joke	en
r9yy8Bpazqgt7bxm	Aitsura Zenin Dousoukai	en
yN1clHN9o2HZsii-	那些傢伙的同學會	zh-Hant
-edLly6YszAToRoO	同窗會	zh-Hant
Xf6O0A7mI2DpAIfh	那些家伙们的校友会	zh-Hans
JqRlle0I3Tik0h_q	同学会	zh-Hans
PcwdJc_kMdOVo5t3	同窗会	zh-Hans
Fz3PyLTwFJfX1iFH	저 녀석들 전원 동창회	ko
yhk_ctKdJMeCajBG	아이츠라 젠인 도오소오카이	ko
TRMS_mnwq0OP8USZ	Yomosugara	en
NeRnlONRFMlDn0ih	徹夜	zh-Hant
ZCfkjDtaLEf-af16	彻夜徘徊	zh-Hans
CSOZm6ovJUjbatQM	通宵	zh-Hans
kthffS1btnnmEccp	밤새도록	ko
uMysQVy5DQzMUqvh	요모스가라	ko
vko9BLIh5vcSnxzb	QUILT	en
rJBpXYi1mvqokm9C	Sode No Kiruto	en
UeCFbs-Pqb1Rp6cJ	袖口拼布	zh-Hant
Krc8GR66BIR5vrKp	袖中棉绒	zh-Hans
qiIc7IHJDmriAGhb	소매의 퀼트	ko
S94mLbWkgcP0yshT	소데노키루토	ko
56DYpWpnYHTlDbBB	ホームステイ	ja
OLZKmdDSlvh1Edw0	HOMESTAY	en
2WfmQsuo04OFc7VT	借来的100天	zh-Hans
wXDm-CDR90iEOcLX	Intrusion	en
dXbJ51EgrrB3Nukj	Fuhoushinnyuu	en
P-N5kIfCrdrMLi27	非法入侵	zh-Hans
ctrv8-hg3nWAIoBi	불법침입	ko
zc7136LwvhRoXln9	후호신뉴	ko
WN7858JugnA4JZZY	STUDY ME	en
OYOv5snRSAXX6gay	Obenkyou Shitoiteyo	en
RMhfFY2ctwevt300	去讀書吧	zh-Hant
6uoRgPsU2VRdiJLT	得好好学习喔	zh-Hans
TSYddlEmVP23r5OA	要好好学习一下喔	zh-Hans
R7_RFt57nz1pFli6	学着理解我的感情啊	zh-Hans
4EG1dTxLW0YeMFdW	勉强	zh-Hans
NwIHMr_OXG1snnQZ	공부해 둬	ko
c1R4Gih8iA4uTRJz	오벤쿄오 시토이테요	ko
8_IpzdBKXdAGNT_S	Hunch Gray	en
MzTrSBZz_UDV94ql	Kan Gray	en
8Gi1rmzeU1WgteWh	Kan Gurei	en
wFwM70HrxXiQqdby	灰色直覺	zh-Hant
wJ9urUT6GurSNPjY	灰心感	zh-Hans
LojcrL3qM5Mm2lo1	蹦蹦蹦	zh-Hans
3JC9_oJtbWsbxJ0V	감 그레이	ko
4bk5FVAuIvqVuxcd	칸구레이	ko
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.media (id, type, media_type, url, original_url, thumbnail_url, width, height, caption, group_id, created_at) FROM stdin;
GvDFtmu3hepgMIcI	cover	image	https://i.ytimg.com/vi/bIW0n36TUSQ/maxresdefault.jpg	https://i.ytimg.com/vi/bIW0n36TUSQ/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:52.912+00
1OS7yDDfNK8UMWMx	cover	image	https://i.ytimg.com/vi/bIW0n36TUSQ/maxres1.jpg	https://i.ytimg.com/vi/bIW0n36TUSQ/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:53.07+00
bNCu1EgDd1eAGcht	cover	image	https://i.ytimg.com/vi/bIW0n36TUSQ/maxres2.jpg	https://i.ytimg.com/vi/bIW0n36TUSQ/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:53.226+00
N5xIde7vQtSYRxJm	cover	image	https://i.ytimg.com/vi/bIW0n36TUSQ/maxres3.jpg	https://i.ytimg.com/vi/bIW0n36TUSQ/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:53.383+00
rM_ZmF19XpxNPi_B	cover	image	https://i.ytimg.com/vi/E8RMWLoAsa0/maxresdefault.jpg	https://i.ytimg.com/vi/E8RMWLoAsa0/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:55.372+00
nwxt9v2xpECRurPx	cover	image	https://i.ytimg.com/vi/E8RMWLoAsa0/maxres1.jpg	https://i.ytimg.com/vi/E8RMWLoAsa0/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:55.529+00
bLNpI-a_kiosqxVQ	cover	image	https://i.ytimg.com/vi/E8RMWLoAsa0/maxres2.jpg	https://i.ytimg.com/vi/E8RMWLoAsa0/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:55.685+00
7YVbmqfKOFF0skRt	cover	image	https://i.ytimg.com/vi/E8RMWLoAsa0/maxres3.jpg	https://i.ytimg.com/vi/E8RMWLoAsa0/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:55.843+00
nO-pRVQrj1CsiAVV	official	image	https://r2.dan.tw/mvs/blues-in-the-closet/5751d3f004e50741609dba49b01699d9.jpg	https://pbs.twimg.com/media/GPT94EzbAAAb9n4?format=jpg&name=large	\N	2048	1520		\N	2026-04-25 02:31:56.064+00
aHxklt2VNxlqPgjI	official	image	https://r2.dan.tw/mvs/blues-in-the-closet/af896c04a954f7b6cf86f19650a26967.jpg	https://pbs.twimg.com/media/GPYbwqxasAAeat-?format=jpg&name=large	\N	2048	1522		\N	2026-04-25 02:31:56.28+00
HBGzx9TdJgoI2QKr	official	image	https://r2.dan.tw/mvs/blues-in-the-closet/9933a16fac54aac3277e64b2b042ee36.jpg	https://pbs.twimg.com/media/GPdp27Da4AAHGVi?format=jpg&name=large	\N	1545	2048	背景	\N	2026-04-25 02:31:56.495+00
PQ7Wdevgb3jiv28u	official	image	https://r2.dan.tw/mvs/blues-in-the-closet/28ec4d42b179ad10b192a988fdb6b5fc.jpg	https://pbs.twimg.com/media/GbYlu8LbIAAb8Ag?format=jpg&name=large	\N	1528	2048	隨筆	\N	2026-04-25 02:31:56.705+00
QBuelQP1EMF7YBT9	official	image	https://r2.dan.tw/mvs/blues-in-the-closet/9fd3ee1a418d070e9d9425c0ab6b3c65.jpg	https://pbs.twimg.com/media/HBXHRNWb0AAsFI8?format=jpg&name=large	\N	1191	1684	卡牌	\N	2026-04-25 02:31:56.925+00
IDE7DyvjiFDeCvpe	cover	image	https://i.ytimg.com/vi/6eFajRiOrpY/maxresdefault.jpg	https://i.ytimg.com/vi/6eFajRiOrpY/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:58.964+00
bwFtH2cNg5Xk-0xk	cover	image	https://i.ytimg.com/vi/6eFajRiOrpY/maxres1.jpg	https://i.ytimg.com/vi/6eFajRiOrpY/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:59.121+00
Z-12RALpDJLOTt59	cover	image	https://i.ytimg.com/vi/6eFajRiOrpY/maxres2.jpg	https://i.ytimg.com/vi/6eFajRiOrpY/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:59.281+00
JK5FsKnHowecLqqT	cover	image	https://i.ytimg.com/vi/6eFajRiOrpY/maxres3.jpg	https://i.ytimg.com/vi/6eFajRiOrpY/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:31:59.439+00
naUKPDHWCoI-xGo1	official	image	https://r2.dan.tw/mvs/pain-give-form/18546619c8132a9827117023334c3ae8.jpg	https://pbs.twimg.com/media/GtHao8KXIAAhVju?format=jpg&name=large	\N	1522	1076	MVACA	\N	2026-04-25 02:31:59.659+00
eKAg2I3qRVh-r9L-	official	image	https://r2.dan.tw/mvs/pain-give-form/4e25797a45ec7507dfd61629bbdb227e.jpg	https://pbs.twimg.com/media/GtHao8HXwAAhaEK?format=jpg&name=large	\N	1522	1076	MVACA	\N	2026-04-25 02:31:59.901+00
eYovBosPg8wmuGy-	official	image	https://r2.dan.tw/mvs/pain-give-form/16deb11a698c32136c60439d1bb1f4d7.jpg	https://pbs.twimg.com/media/GtHao8LXQAAIRxK?format=jpg&name=large	\N	1522	1076	MVACA	\N	2026-04-25 02:32:00.136+00
dKJY58S_MB9PS_Tj	official	image	https://r2.dan.tw/mvs/pain-give-form/52e1fa42aabcaff45e6b9af9f9d43a3a.jpg	https://pbs.twimg.com/media/GtN0P5OaEAAIE0k?format=jpg&name=large	\N	2048	1448	staff	\N	2026-04-25 02:32:00.352+00
VzsZzSmUVHMbKp1U	official	image	https://r2.dan.tw/mvs/pain-give-form/bc701fa8ed635d6434f66d459d8bb157.jpg	https://pbs.twimg.com/media/GtN0-CDaUAAZHiI?format=jpg&name=large	\N	1522	1076	設定	\N	2026-04-25 02:32:00.567+00
XolruHKO0PO-r3HW	official	image	https://r2.dan.tw/mvs/pain-give-form/7e6fa974f09702777dfd58d4572ca6ff.jpg	https://pbs.twimg.com/media/GtN0-CDa4AASpcF?format=jpg&name=large	\N	1522	1076	設定	\N	2026-04-25 02:32:00.814+00
oQUpApvxEgc1mHQ7	official	image	https://r2.dan.tw/mvs/pain-give-form/505f75960ff08be26fa03c6e52c42c2a.jpg	https://pbs.twimg.com/media/GtN0-CYbMAIeHfy?format=jpg&name=large	\N	1522	1076	設定	\N	2026-04-25 02:32:01.03+00
tHB_7iNG11bmZqyb	official	image	https://r2.dan.tw/mvs/pain-give-form/988f25788b7821afc55f41024e1d70d9.jpg	https://pbs.twimg.com/media/GtQFqFjbcAAlee9?format=jpg&name=4096x4096	\N	2048	1448		\N	2026-04-25 02:32:01.244+00
TZFCjJgsu0x_0Ta9	official	image	https://r2.dan.tw/mvs/pain-give-form/cc97218982cf4639f511d74054a2ae9a.jpg	https://pbs.twimg.com/media/GtQFqsJbIAAIBmy?format=jpg&name=4096x4096	\N	2048	1448		\N	2026-04-25 02:32:01.466+00
0_5Fm6iU8hiOrrbb	official	image	https://r2.dan.tw/mvs/pain-give-form/8f69e78deea4cfb357e287d03f09cefa.jpg	https://pbs.twimg.com/media/G1n87_7bIAAI_dA?format=jpg&name=4096x4096	\N	2048	1448		\N	2026-04-25 02:32:01.682+00
WFQO9ZbTm6TAbDBS	official	image	https://r2.dan.tw/mvs/pain-give-form/0d92b54746678029d8e7bbb016d3b855.jpg	https://pbs.twimg.com/media/G1n88m_acAAkz-M?format=jpg&name=4096x4096	\N	2048	1448		\N	2026-04-25 02:32:01.902+00
mgNfoA-s6rxfpOmn	official	image	https://r2.dan.tw/mvs/pain-give-form/b37f6adcd00b9d28c5eacee35cf956b4.jpg	https://pbs.twimg.com/media/G1n8-GubUAAzDef?format=jpg&name=4096x4096	\N	2048	1448		\N	2026-04-25 02:32:02.122+00
UW8Ag7Py7TN2VQOf	official	image	https://r2.dan.tw/mvs/pain-give-form/9c6e6b359d8dee8a6aefed747d766310.jpg	https://pbs.twimg.com/media/G1n8_JGaQAASwhu?format=jpg&name=4096x4096	\N	2048	1448		\N	2026-04-25 02:32:02.339+00
tcDjy-fmSo7zj2Fd	official	image	https://r2.dan.tw/mvs/pain-give-form/e6361e8f3861c6bf15f5adb323924529.jpg	https://pbs.twimg.com/media/GtHapanXAAAXdkS?format=jpg&name=large	\N	1522	1076	原案ACA	\N	2026-04-25 02:32:02.556+00
O6YyT-OVzQrFCUEA	official	image	https://r2.dan.tw/mvs/pain-give-form/2ce42ca9fc0fc8e52bad645577d9718e.jpg	https://pbs.twimg.com/media/GtHapamXUAA0Ige?format=jpg&name=large	\N	1522	1076	原案ACA	\N	2026-04-25 02:32:02.776+00
YG-gQAOAgLHqDRmV	official	image	https://r2.dan.tw/mvs/pain-give-form/fcaa04b42a352b5b736e702b31a0f479.jpg	https://pbs.twimg.com/media/GtHapa2WUAE4qQo?format=jpg&name=large	\N	1522	1076	原案ACA	\N	2026-04-25 02:32:02.997+00
FTHLHPVxSfUDwtKD	official	image	https://r2.dan.tw/mvs/pain-give-form/c973965d34cdacba62f975b10d184239.jpg	https://pbs.twimg.com/media/GtHgITRbAAA-Kaw?format=jpg&name=large	\N	1920	1080		\N	2026-04-25 02:32:03.215+00
jdmpLTRwm0cufc-T	official	image	https://r2.dan.tw/mvs/pain-give-form/5cd317421f26c63e5ff828cb5b164de9.jpg	https://pbs.twimg.com/media/GtPg3itaoAAu2WN?format=jpg&name=4096x4096	\N	2048	1448		\N	2026-04-25 02:32:03.437+00
5_11mDTpXYXUOeTo	official	image	https://r2.dan.tw/mvs/pain-give-form/5a02993250be2bbfb605a3f42a6b382d.jpg	https://pbs.twimg.com/media/GtPnk0faAAAWWRj?format=jpg&name=4096x4096	\N	2048	1448		\N	2026-04-25 02:32:03.658+00
PVMxg6BgsK8Fh84t	official	image	https://r2.dan.tw/mvs/pain-give-form/6fa86b37240c5319ffcf55514e4513ed.jpg	https://pbs.twimg.com/media/GtPn8xzaYAA0O1n?format=jpg&name=4096x4096	\N	2048	1633		\N	2026-04-25 02:32:03.877+00
0z9ADBJsmbizFTAR	official	image	https://r2.dan.tw/mvs/pain-give-form/8513bf37bb36885ca16b74124990f7b5.jpg	https://pbs.twimg.com/media/GtQEYE3akAEkVWv?format=jpg&name=4096x4096	\N	2048	1448		\N	2026-04-25 02:32:04.098+00
3sPuYd6R83Uv95er	official	image	https://r2.dan.tw/mvs/pain-give-form/7bfe44a8b1ecce12fcd84e5db3b38cc0.jpg	https://pbs.twimg.com/media/GtQRFQhacAAjodR?format=jpg&name=4096x4096	\N	2048	1306		\N	2026-04-25 02:32:04.318+00
ZJ-Ip6AOXaaITbsk	official	image	https://r2.dan.tw/mvs/pain-give-form/3202ec93667ea4270263d6cb19e7c516.jpg	https://pbs.twimg.com/media/GtQRGBVaYAAL7ov?format=jpg&name=4096x4096	\N	2048	1306		\N	2026-04-25 02:32:04.543+00
rIE0FPLUhbDq0L7B	official	image	https://r2.dan.tw/mvs/pain-give-form/da36dad728e28623cab161437c9cf0f6.jpg	https://pbs.twimg.com/media/GtQRG7laoAA4RUx?format=jpg&name=4096x4096	\N	2048	1307		\N	2026-04-25 02:32:04.761+00
n9j71OgsCKTtNRH_	official	image	https://r2.dan.tw/mvs/pain-give-form/d3a5aadbfb9cd0537204cdabcb5beb24.jpg	https://pbs.twimg.com/media/GtQRH2hbsAAopaT?format=jpg&name=4096x4096	\N	1994	2048		\N	2026-04-25 02:32:04.978+00
-edmRFrICw2iE3H7	official	image	https://r2.dan.tw/mvs/pain-give-form/ad75753aa7d74176460dc40948322d28.jpg	https://pbs.twimg.com/media/GtQmf3MbIAALUTq?format=jpg&name=4096x4096	\N	2048	1306	背景	\N	2026-04-25 02:32:05.196+00
htoQU98FLgL9tdas	official	image	https://r2.dan.tw/mvs/pain-give-form/e5d0a179f06734f05e6643f89ec6f00f.jpg	https://pbs.twimg.com/media/GtQnMiFbMAEJiX4?format=jpg&name=4096x4096	\N	2048	1306	背景	\N	2026-04-25 02:32:05.417+00
tu5goDJ_5NNhbBqd	official	image	https://r2.dan.tw/mvs/pain-give-form/99ce6e4e2b34837d314c701e6debc525.jpg	https://pbs.twimg.com/media/GtRELfubMAAcl69?format=jpg&name=4096x4096	\N	2048	1191	圖	\N	2026-04-25 02:32:05.632+00
NfyLUMEJvQIvyx_W	official	image	https://r2.dan.tw/mvs/pain-give-form/0758dd68c0ec16431532f59e70d4d314.png	https://pbs.twimg.com/media/GtRPOERbMAA_Xk1?format=png&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:05.854+00
lO1GRjSW6vhavNI9	official	image	https://r2.dan.tw/mvs/pain-give-form/8f57bf80949a7d87faea41e68a80cdcc.jpg	https://pbs.twimg.com/media/GtRen40bMAcD-7q?format=jpg&name=4096x4096	\N	1273	2048	背景	\N	2026-04-25 02:32:06.078+00
sggGbcy-5-UhKAQJ	official	image	https://r2.dan.tw/mvs/pain-give-form/e72b74e9ec01285a74603413fb3c5844.jpg	https://pbs.twimg.com/media/GtUsr4MbwAAwH9e?format=jpg&name=4096x4096	\N	2048	1448	草圖	\N	2026-04-25 02:32:06.298+00
NdsUhPlhBA4hiKAv	official	image	https://r2.dan.tw/mvs/pain-give-form/eb21a4abd0e4504118babb43fc3da234.jpg	https://pbs.twimg.com/media/GtUxZSkbMAEpERl?format=jpg&name=4096x4096	\N	2048	1448	草圖	\N	2026-04-25 02:32:06.512+00
JbDJdliEZljsUP1O	official	image	https://r2.dan.tw/mvs/pain-give-form/8d13f134de3acae689c857cb1232e145.jpg	https://pbs.twimg.com/media/GtV0IokbMAI1HHz?format=jpg&name=4096x4096	\N	2048	1306	背景	\N	2026-04-25 02:32:06.728+00
IJVwsDf0HpzUsbzh	official	image	https://r2.dan.tw/mvs/pain-give-form/b543b1b81f693c12fc486326f6c81f3f.jpg	https://pbs.twimg.com/media/GtV0LlWbMAUfBXh?format=jpg&name=4096x4096	\N	2048	1306	背景	\N	2026-04-25 02:32:06.951+00
41B_KKy9zqkydLqK	official	image	https://r2.dan.tw/mvs/pain-give-form/b72f8c930a57692db84d4a13b0912a55.jpg	https://pbs.twimg.com/media/GtV0i0FbMAACisp?format=jpg&name=4096x4096	\N	2048	1306	背景	\N	2026-04-25 02:32:07.171+00
Rsa9pIpaHC4y-KwQ	official	image	https://r2.dan.tw/mvs/pain-give-form/b7a2e2ec1f3f9925aad2a0aa5cf2c18f.jpg	https://pbs.twimg.com/media/GtV06b0bsAAi4SN?format=jpg&name=4096x4096	\N	2048	1306	背景	\N	2026-04-25 02:32:07.385+00
JGZtSHzA9lbzJGoP	official	image	https://r2.dan.tw/mvs/pain-give-form/98532c88ead5f0c04177ecc193b1c03a.jpg	https://pbs.twimg.com/media/GtbhCgDbEAAFR3Q?format=jpg&name=4096x4096	\N	1417	2048	圖	\N	2026-04-25 02:32:07.599+00
7czibaRiG24ztjQF	official	image	https://r2.dan.tw/mvs/pain-give-form/668f1549b074aa6894ce788ef9d63cca.jpg	https://pbs.twimg.com/media/G1n8QJCagAA-h7p?format=jpg&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:07.814+00
D_sHMuj0Rma1VqE1	official	image	https://r2.dan.tw/mvs/pain-give-form/755c332ebc26d4c157f754f7d0820304.jpg	https://pbs.twimg.com/media/G1n8R9HbMAA2ajK?format=jpg&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:08.046+00
Iz_KJZsX2pK_kWAh	official	image	https://r2.dan.tw/mvs/pain-give-form/e03a9a6548bc9891d9a2ea1a7579e725.jpg	https://pbs.twimg.com/media/G1n8TZ1bMAA6P_K?format=jpg&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:08.26+00
oXLT_NgE_2d3kGEo	official	image	https://r2.dan.tw/mvs/pain-give-form/4f5868c0f721b7e586dfb781971a59c2.jpg	https://pbs.twimg.com/media/G1n8VJ8bAAAcs9I?format=jpg&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:08.5+00
ojAfW5U0D6ezFnGT	official	image	https://r2.dan.tw/mvs/pain-give-form/ebe0ddc8a2962aaa1c5c16c6be8ae2ec.jpg	https://pbs.twimg.com/media/G1n9MkuboAAnKut?format=jpg&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:08.712+00
n2g7fqnfozS01VGC	official	image	https://r2.dan.tw/mvs/pain-give-form/b24f61f9d18816268c5a435728d486ac.jpg	https://pbs.twimg.com/media/G1n9NHKa4AAwShV?format=jpg&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:08.926+00
TT95KWZjEEv78X8G	official	image	https://r2.dan.tw/mvs/pain-give-form/002858c996f4296ab8d632f201506e8e.jpg	https://pbs.twimg.com/media/G1n9OaAakAAGW64?format=jpg&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:09.167+00
edUfRMkm4_3KGYfQ	official	image	https://r2.dan.tw/mvs/pain-give-form/7c2e973d692c9680ba680a64ffa21b36.jpg	https://pbs.twimg.com/media/G1n9X67aEAA8DLv?format=jpg&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:09.384+00
IVljgPWj7GKMqHDC	official	image	https://r2.dan.tw/mvs/pain-give-form/316da5d52e5fade9705438c4fa79e8a2.jpg	https://pbs.twimg.com/media/G1n9bBnbcAAwg0T?format=jpg&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:09.6+00
N6AuFskBRioSSN-X	official	image	https://r2.dan.tw/mvs/pain-give-form/b44c0fc341496c6bcf825899eb9bed3b.jpg	https://pbs.twimg.com/media/G4vv0MKaQAAML4A?format=jpg&name=4096x4096	\N	1642	2048	圖	\N	2026-04-25 02:32:09.815+00
zbh1N-Kg0iBC0xYa	official	image	https://r2.dan.tw/mvs/pain-give-form/4dca4ca7e08898a46467c6da39546410.jpg	https://pbs.twimg.com/media/G7Z9On0b0AYF-7D?format=jpg&name=4096x4096	\N	2048	1584	設定	\N	2026-04-25 02:32:10.036+00
LUBeye_9JrlJGjCr	official	image	https://r2.dan.tw/mvs/pain-give-form/0fe70122f7206cc08092e09b7234f1a4.jpg	https://pbs.twimg.com/media/GtPrxicbcAAErDt?format=jpg&name=4096x4096	\N	1536	2048	賀圖	\N	2026-04-25 02:32:10.254+00
6Jd4fpRZCCoifAHg	official	image	https://r2.dan.tw/mvs/pain-give-form/b948723e53b1ea268ccad1cd20a7ac97.png	https://pbs.twimg.com/media/GtP-FuOaAAAE0do?format=png&name=4096x4096	\N	1536	2048	圖	\N	2026-04-25 02:32:10.472+00
hyIPcN-uQ9V5Sygd	official	image	https://r2.dan.tw/mvs/pain-give-form/1601ee4c7af3496ed24a2d0cf0648d4a.png	https://pbs.twimg.com/media/GtUGdyCbMAgEGhn?format=png&name=4096x4096	\N	2048	1448	MVnira重複	\N	2026-04-25 02:32:10.689+00
xISoZKVConfHK7QX	official	image	https://r2.dan.tw/mvs/pain-give-form/84186fc99f3280138f62b95a51f6d6c4.png	https://pbs.twimg.com/media/GtZbXnlb0AA93Wy?format=png&name=4096x4096	\N	2048	1448	MVrani重複	\N	2026-04-25 02:32:10.904+00
I2TkfIRPovlO4PlC	official	image	https://r2.dan.tw/mvs/pain-give-form/6cf270577353783bd553eee604f3cbfb.png	https://pbs.twimg.com/media/Gv5bDzNa4AA_tcy?format=png&name=4096x4096	\N	2048	1448	MVrani吸血鬼	\N	2026-04-25 02:32:11.127+00
CUb4LyRc3LUjEPhf	official	image	https://r2.dan.tw/mvs/pain-give-form/ee825df6dee1b006858974733fdf39b9.jpg	https://pbs.twimg.com/media/Gv5bFe4XgAAeTSk?format=jpg&name=4096x4096	\N	2048	1448	MVrani吸血鬼	\N	2026-04-25 02:32:11.344+00
HdMOlRzgAIH_6P4n	official	image	https://r2.dan.tw/mvs/pain-give-form/5d56881fd89a45ae146dd79e93407500.jpg	https://pbs.twimg.com/media/Gv5bkGeWAAA6_Is?format=jpg&name=4096x4096	\N	2048	1448	MVnira小重複	\N	2026-04-25 02:32:11.567+00
Jpmvuus1eR78MOx9	official	image	https://r2.dan.tw/mvs/pain-give-form/a1982b07b83d2fae1b752ccbf4be355f.jpg	https://pbs.twimg.com/media/Gv5brqKWUAAiZy0?format=jpg&name=4096x4096	\N	2048	1448	MVrani小重複	\N	2026-04-25 02:32:11.787+00
OcPiwawBSw-0bE3s	official	image	https://r2.dan.tw/mvs/pain-give-form/34b49d9215e6c0cf93a523ed517214cd.png	https://pbs.twimg.com/media/Gv5cYsdXsAAxsHX?format=png&name=4096x4096	\N	2048	1448	設定	\N	2026-04-25 02:32:12.015+00
8FVkIMax_oGIx8PU	official	image	https://r2.dan.tw/mvs/pain-give-form/586543bad65a9da31f453bcdc13dc79c.jpg	https://pbs.twimg.com/media/G0HvsREbUAEKP3w?format=jpg&name=4096x4096	\N	1536	2048	1000萬播放賀圖	\N	2026-04-25 02:32:12.232+00
l8Bk3GCeRIZAsmsx	official	image	https://r2.dan.tw/mvs/pain-give-form/1180341b4bfd0c8c63e62822ac5be8f1.png	https://pbs.twimg.com/media/HEzptQRbMAAUC_X?format=png&name=large	\N	800	1300	ultra魂	\N	2026-04-25 02:32:12.451+00
Zp9gXzfCqoN5SQpr	cover	image	https://i.ytimg.com/vi/OxcnK1s2Fww/maxresdefault.jpg	https://i.ytimg.com/vi/OxcnK1s2Fww/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:15.122+00
IJCUR9cEzd10FBuh	cover	image	https://i.ytimg.com/vi/OxcnK1s2Fww/maxres1.jpg	https://i.ytimg.com/vi/OxcnK1s2Fww/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:15.274+00
VpRiOmBsVg1Crw0I	cover	image	https://i.ytimg.com/vi/OxcnK1s2Fww/maxres2.jpg	https://i.ytimg.com/vi/OxcnK1s2Fww/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:15.426+00
I7744GVxaQbbPyzc	cover	image	https://i.ytimg.com/vi/OxcnK1s2Fww/maxres3.jpg	https://i.ytimg.com/vi/OxcnK1s2Fww/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:15.579+00
NWdsxc2mhdwbxnxX	cover	image	https://i.ytimg.com/vi/Nmemc-b6cdU/maxresdefault.jpg	https://i.ytimg.com/vi/Nmemc-b6cdU/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:17.936+00
YSCicxg-x19nAPgI	cover	image	https://i.ytimg.com/vi/Nmemc-b6cdU/maxres1.jpg	https://i.ytimg.com/vi/Nmemc-b6cdU/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:18.091+00
hsVzr6dRQpR5bULI	cover	image	https://i.ytimg.com/vi/Nmemc-b6cdU/maxres2.jpg	https://i.ytimg.com/vi/Nmemc-b6cdU/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:18.245+00
MK0-sYWu8ID2tlmI	cover	image	https://i.ytimg.com/vi/Nmemc-b6cdU/maxres3.jpg	https://i.ytimg.com/vi/Nmemc-b6cdU/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:18.399+00
7DIKvLcQ6jviJDkf	official	image	https://r2.dan.tw/mvs/summer-slack/239476b186658ba1eb7d63ea9a79dd23.jpg	https://pbs.twimg.com/media/Fcs57quaEAELSo9?format=jpg&name=medium	\N	1200	674		\N	2026-04-25 02:32:18.619+00
CARsPBHOkxmA7m0u	official	image	https://r2.dan.tw/mvs/summer-slack/0767b41a367ea652f4c0cf5c151ed34f.jpg	https://pbs.twimg.com/media/Fcs57qeaAAImkyF?format=jpg&name=medium	\N	1200	674		\N	2026-04-25 02:32:18.837+00
WWi_O9r2UoWr6GWp	official	image	https://r2.dan.tw/mvs/summer-slack/9d12757c5c2e2af523e978ac5c8a74d2.jpg	https://pbs.twimg.com/media/Fcs57qZaAAEB9C9?format=jpg&name=medium	\N	1200	674		\N	2026-04-25 02:32:19.051+00
tr1wKNQBpKtN5VvK	cover	image	https://i.ytimg.com/vi/Sfz5TpCRSiI/maxresdefault.jpg	https://i.ytimg.com/vi/Sfz5TpCRSiI/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:21.256+00
z5C2XiQGwk9cmNWl	cover	image	https://i.ytimg.com/vi/Sfz5TpCRSiI/maxres1.jpg	https://i.ytimg.com/vi/Sfz5TpCRSiI/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:21.411+00
EXtEEsDizOgyE0tI	cover	image	https://i.ytimg.com/vi/Sfz5TpCRSiI/maxres2.jpg	https://i.ytimg.com/vi/Sfz5TpCRSiI/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:21.567+00
sZctoXxfwg3ZRbMd	cover	image	https://i.ytimg.com/vi/Sfz5TpCRSiI/maxres3.jpg	https://i.ytimg.com/vi/Sfz5TpCRSiI/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:21.729+00
t2tKe0Q2KjRZBKfY	official	image	https://r2.dan.tw/mvs/neko-reset/329b0c8e04a7ba646c0844ebd91a6c95.jpg	https://pbs.twimg.com/media/Fi9vQmjaMAAWoBU?format=jpg&name=large	\N	2048	1450		\N	2026-04-25 02:32:21.948+00
axpuXMfjs2SyRxQI	official	image	https://r2.dan.tw/mvs/neko-reset/2f86b3a5a74613ef032eb7f0fee4886b.jpg	https://pbs.twimg.com/media/Fi9vQmiaMAAadFr?format=jpg&name=large	\N	2048	1450		\N	2026-04-25 02:32:22.167+00
82jQbfuP_Fj7Dacx	official	image	https://r2.dan.tw/mvs/neko-reset/c29720e0e0e34fec21ebfe3cedd9947d.jpg	https://pbs.twimg.com/media/Fi9vQmhaEAA1I9A?format=jpg&name=large	\N	2048	1266		\N	2026-04-25 02:32:22.385+00
cTZITAbkTgt1MAFg	official	image	https://r2.dan.tw/mvs/neko-reset/508348120096f199339efe685c6d94b5.jpg	https://pbs.twimg.com/media/FMM7s3uaMAMsAXj?format=jpg&name=large	\N	2048	1252		\N	2026-04-25 02:32:22.599+00
hNsy989UTmW7L9mJ	official	image	https://r2.dan.tw/mvs/neko-reset/905c13c6015cac7ee6cb3044a42b20c9.jpg	https://pbs.twimg.com/media/Fx24mLQaAAIV-py?format=jpg&name=large	\N	1264	2048	5周年	\N	2026-04-25 02:32:22.814+00
XgBFBrapoZra6z_8	official	image	https://r2.dan.tw/mvs/neko-reset/3a0142284d2dcb99453419da34d39cf8.jpg	https://pbs.twimg.com/media/FFtxHBzX0AA8nCA.jpg	https://pbs.twimg.com/media/FFtxHBzX0AA8nCA.jpg	1083	859		\N	2026-04-25 02:32:23.027+00
wKe88A2F-vYbGwSD	cover	image	https://i.ytimg.com/vi/4QePrv24TBU/maxresdefault.jpg	https://i.ytimg.com/vi/4QePrv24TBU/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:25.191+00
rbghRRDmRT9lJM0s	cover	image	https://i.ytimg.com/vi/4QePrv24TBU/maxres1.jpg	https://i.ytimg.com/vi/4QePrv24TBU/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:25.353+00
upyco_j3mBoVPLjF	cover	image	https://i.ytimg.com/vi/4QePrv24TBU/maxres2.jpg	https://i.ytimg.com/vi/4QePrv24TBU/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:25.505+00
F2u7fRhb5Kvveswc	cover	image	https://i.ytimg.com/vi/4QePrv24TBU/maxres3.jpg	https://i.ytimg.com/vi/4QePrv24TBU/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:25.66+00
C2fTz8nNRXF1D3aT	official	image	https://r2.dan.tw/mvs/kansaete-kuyashiiwa/5c10761fda95747049d92af992c640f7.jpg	https://pbs.twimg.com/media/Exi9VQUUUAEM1bt?format=jpg&name=large	\N	1920	1080		\N	2026-04-25 02:32:25.88+00
6AmyhJG1FxKWl-OQ	official	image	https://r2.dan.tw/mvs/kansaete-kuyashiiwa/48193e3bf4cf14ad591f74de94dbc7e9.jpg	https://pbs.twimg.com/media/Exog827U4AIv_cP?format=jpg&name=large	\N	1920	1080		\N	2026-04-25 02:32:26.096+00
F9KUkSupoIpLd-QH	cover	image	https://i.ytimg.com/vi/wQPgM-9LatM/maxresdefault.jpg	https://i.ytimg.com/vi/wQPgM-9LatM/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:28.835+00
6f4fQrGjHOw5JX6R	cover	image	https://i.ytimg.com/vi/wQPgM-9LatM/maxres1.jpg	https://i.ytimg.com/vi/wQPgM-9LatM/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:29.01+00
xzADBZMQJ7V5EV50	cover	image	https://i.ytimg.com/vi/wQPgM-9LatM/maxres2.jpg	https://i.ytimg.com/vi/wQPgM-9LatM/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:29.166+00
iPksJrRVmE6IWa69	cover	image	https://i.ytimg.com/vi/wQPgM-9LatM/maxres3.jpg	https://i.ytimg.com/vi/wQPgM-9LatM/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:29.32+00
9r8TYZTjWy0kg3T_	official	image	https://r2.dan.tw/mvs/ones-mind/1031f0e5285a3f8855ca5c786219653e.jpg	https://pbs.twimg.com/media/EtyM7SFVcAACkA9?format=jpg&name=large	\N	2048	1448		\N	2026-04-25 02:32:29.545+00
9ZuxQXINPtlTm9jF	cover	image	https://i.ytimg.com/vi/Qw-FSw7d2zE/maxresdefault.jpg	https://i.ytimg.com/vi/Qw-FSw7d2zE/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:30.791+00
4ZaXWtdlrzu8IHt_	cover	image	https://i.ytimg.com/vi/Qw-FSw7d2zE/maxres1.jpg	https://i.ytimg.com/vi/Qw-FSw7d2zE/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:30.946+00
db5FWcJuNjMFDv0K	cover	image	https://i.ytimg.com/vi/Qw-FSw7d2zE/maxres2.jpg	https://i.ytimg.com/vi/Qw-FSw7d2zE/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:31.107+00
eIF1Occ55kWhxUvE	cover	image	https://i.ytimg.com/vi/Qw-FSw7d2zE/maxres3.jpg	https://i.ytimg.com/vi/Qw-FSw7d2zE/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:31.263+00
inbtZLBs8GJIxPAK	cover	image	https://i.ytimg.com/vi/mlA-Z7zSLHU/maxresdefault.jpg	https://i.ytimg.com/vi/mlA-Z7zSLHU/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:32.947+00
A62tb-yGIaLuhNCl	cover	image	https://i.ytimg.com/vi/mlA-Z7zSLHU/maxres1.jpg	https://i.ytimg.com/vi/mlA-Z7zSLHU/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:33.128+00
D1a9l-waAh0jLLEx	cover	image	https://i.ytimg.com/vi/mlA-Z7zSLHU/maxres2.jpg	https://i.ytimg.com/vi/mlA-Z7zSLHU/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:33.283+00
wVYcflXOYXQNVRgc	cover	image	https://i.ytimg.com/vi/mlA-Z7zSLHU/maxres3.jpg	https://i.ytimg.com/vi/mlA-Z7zSLHU/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:33.439+00
Pe5zKXC8koZcoERq	cover	image	https://i.ytimg.com/vi/iyCRK5WfFOI/maxresdefault.jpg	https://i.ytimg.com/vi/iyCRK5WfFOI/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:35.159+00
blVNTPsuVxgzo5jq	cover	image	https://i.ytimg.com/vi/iyCRK5WfFOI/maxres1.jpg	https://i.ytimg.com/vi/iyCRK5WfFOI/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:35.319+00
PS5_RADg_LUOeFOK	cover	image	https://i.ytimg.com/vi/iyCRK5WfFOI/maxres2.jpg	https://i.ytimg.com/vi/iyCRK5WfFOI/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:35.473+00
19gJG8eQswLMkfAi	cover	image	https://i.ytimg.com/vi/iyCRK5WfFOI/maxres3.jpg	https://i.ytimg.com/vi/iyCRK5WfFOI/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:35.628+00
_BwSSSUIpoj5oLKs	cover	image	https://i.ytimg.com/vi/VJy8qZ77bpE/sddefault.jpg	https://i.ytimg.com/vi/VJy8qZ77bpE/sddefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:37.416+00
iQWtr91eMPs8WRoM	cover	image	https://i.ytimg.com/vi/VJy8qZ77bpE/maxres1.jpg	https://i.ytimg.com/vi/VJy8qZ77bpE/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:37.57+00
j-s0Mwqj_zVV0c_F	cover	image	https://i.ytimg.com/vi/VJy8qZ77bpE/maxres2.jpg	https://i.ytimg.com/vi/VJy8qZ77bpE/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:37.724+00
BvaleRw-GfymTwpW	cover	image	https://i.ytimg.com/vi/VJy8qZ77bpE/maxres3.jpg	https://i.ytimg.com/vi/VJy8qZ77bpE/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:37.879+00
5xeEfFaL1PqqpoYa	cover	image	https://i.ytimg.com/vi/GAB26GgJ8V8/maxresdefault.jpg	https://i.ytimg.com/vi/GAB26GgJ8V8/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:39.481+00
tx5Zty3UpDcpDTFJ	cover	image	https://i.ytimg.com/vi/GAB26GgJ8V8/maxres1.jpg	https://i.ytimg.com/vi/GAB26GgJ8V8/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:39.637+00
hSKwkTD0OK26En7U	cover	image	https://i.ytimg.com/vi/GAB26GgJ8V8/maxres2.jpg	https://i.ytimg.com/vi/GAB26GgJ8V8/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:39.791+00
4Za2xHkgm9uAZmNy	cover	image	https://i.ytimg.com/vi/GAB26GgJ8V8/maxres3.jpg	https://i.ytimg.com/vi/GAB26GgJ8V8/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:39.945+00
VKeuYhxaz_MtBAge	cover	image	https://i.ytimg.com/vi/7kUbX4DoZoc/maxresdefault.jpg	https://i.ytimg.com/vi/7kUbX4DoZoc/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:41.745+00
7X5llgkJEuqLayDZ	cover	image	https://i.ytimg.com/vi/7kUbX4DoZoc/maxres1.jpg	https://i.ytimg.com/vi/7kUbX4DoZoc/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:41.901+00
kUFNobaudz-Hvjw5	cover	image	https://i.ytimg.com/vi/7kUbX4DoZoc/maxres2.jpg	https://i.ytimg.com/vi/7kUbX4DoZoc/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:42.058+00
OZI99wrvBoX9w-2S	cover	image	https://i.ytimg.com/vi/7kUbX4DoZoc/maxres3.jpg	https://i.ytimg.com/vi/7kUbX4DoZoc/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:42.218+00
II2dtby6dWdk1bip	official	image	https://r2.dan.tw/mvs/seigi/10842dd09076b5db3c095a5e34a16989.jpg	https://pbs.twimg.com/media/GqbMatMWwAAdVGM?format=jpg&name=large	\N	892	1264	6周年	\N	2026-04-25 02:32:42.435+00
iPQqC5BoZaHMXGM2	cover	image	https://i.ytimg.com/vi/COll6PdtI5w/maxresdefault.jpg	https://i.ytimg.com/vi/COll6PdtI5w/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:44.815+00
ieIltQHNhK2VHP3B	cover	image	https://i.ytimg.com/vi/COll6PdtI5w/maxres1.jpg	https://i.ytimg.com/vi/COll6PdtI5w/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:44.965+00
dYWFKCqte9BLf6Jl	cover	image	https://i.ytimg.com/vi/COll6PdtI5w/maxres2.jpg	https://i.ytimg.com/vi/COll6PdtI5w/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:45.116+00
kzwZ0u3V2hG-ETpd	cover	image	https://i.ytimg.com/vi/COll6PdtI5w/maxres3.jpg	https://i.ytimg.com/vi/COll6PdtI5w/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:45.27+00
aXJBDttKR65jVJDl	official	image	https://r2.dan.tw/mvs/fastening/102a543ae0d1c2ca7aff31b28756d785.jpg	https://pbs.twimg.com/media/GwhiDTqasAA0wXH?format=jpg&name=large	\N	1268	1808	5周年	\N	2026-04-25 02:32:45.514+00
2pKLjAitD1_AjV9j	cover	image	https://i.ytimg.com/vi/a55s94rdoWs/maxresdefault.jpg	https://i.ytimg.com/vi/a55s94rdoWs/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:47.005+00
A9XQPohU6L1lKvfU	cover	image	https://i.ytimg.com/vi/a55s94rdoWs/maxres1.jpg	https://i.ytimg.com/vi/a55s94rdoWs/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:47.159+00
U_5CBP6eJPOu5j7p	cover	image	https://i.ytimg.com/vi/a55s94rdoWs/maxres2.jpg	https://i.ytimg.com/vi/a55s94rdoWs/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:47.314+00
d9EQdGZMV8EHotAU	cover	image	https://i.ytimg.com/vi/a55s94rdoWs/maxres3.jpg	https://i.ytimg.com/vi/a55s94rdoWs/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:47.475+00
j7KnVBRmXYGaJrWs	official	image	https://r2.dan.tw/mvs/zutorao/2e96794cae09a0a6063730aabf6ea322.jpg	https://pbs.twimg.com/media/GiPu8r7XYAAt7rj.jpg	https://pbs.twimg.com/media/GiPu8r7XYAAt7rj.jpg	1100	1086		\N	2026-04-25 02:32:47.69+00
SxEfwDrOhAlDf7QI	official	image	https://r2.dan.tw/mvs/zutorao/99d1b371e0b7cefda4dfbb8b93bd9f4b.jpg	https://pbs.twimg.com/media/Gh5oPBoXQAAwsyv.jpg	https://pbs.twimg.com/media/Gh5oPBoXQAAwsyv.jpg	1620	2048		\N	2026-04-25 02:32:47.905+00
qr2qRtkzMhMWSxtE	official	image	https://r2.dan.tw/mvs/zutorao/b28302af2c0b663da4321d2b4056b9de.jpg	https://pbs.twimg.com/media/GiTy-fYW8AA9igy?format=jpg&name=4096x4096	\N	1896	2048		\N	2026-04-25 02:32:48.12+00
jJVZghtpMAqueIHf	official	image	https://r2.dan.tw/mvs/zutorao/30bc3233a309470b42420487888b2fb2.jpg	https://pbs.twimg.com/media/GiTy-fgXoAAgSwN?format=jpg&name=4096x4096	\N	1896	2048		\N	2026-04-25 02:32:48.335+00
2kCtkV0GtxQ2tBaw	cover	image	https://i.ytimg.com/vi/ouLndhBRL4w/maxresdefault.jpg	https://i.ytimg.com/vi/ouLndhBRL4w/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:49.262+00
jhJKXxs6BQzzttmQ	cover	image	https://i.ytimg.com/vi/ouLndhBRL4w/maxres1.jpg	https://i.ytimg.com/vi/ouLndhBRL4w/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:49.421+00
5nsLK57QoSvrOZRf	cover	image	https://i.ytimg.com/vi/ouLndhBRL4w/maxres2.jpg	https://i.ytimg.com/vi/ouLndhBRL4w/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:49.575+00
iuRAZNALA3xOeX_r	cover	image	https://i.ytimg.com/vi/ouLndhBRL4w/maxres3.jpg	https://i.ytimg.com/vi/ouLndhBRL4w/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:49.728+00
fnY5FmPFItX3-8DQ	official	image	https://r2.dan.tw/mvs/ham/2735bf28d7fa5194f577c40efd89d1e8.jpg	https://pbs.twimg.com/media/EfG0SqfU0AEQ0HW?format=jpg&name=large	\N	1920	1080		\N	2026-04-25 02:32:49.95+00
q8x2QNR9kQ4IQAe4	official	image	https://r2.dan.tw/mvs/ham/353aa72d2371641b91a926eb750096ba.jpg	https://pbs.twimg.com/media/EkDgGlGVoAc_U5q?format=jpg&name=large	\N	1300	830	100萬	\N	2026-04-25 02:32:50.393+00
jzAuZN5beavN91wK	cover	image	https://i.ytimg.com/vi/E0N8LzuM6qI/maxresdefault.jpg	https://i.ytimg.com/vi/E0N8LzuM6qI/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:06.134+00
zOrsqejGEKWNjFsM	official	image	https://r2.dan.tw/mvs/ham/687779610622904fc876b33e5322f0ce.jpg	https://pbs.twimg.com/media/E345QoOVkAA9ZAg?format=jpg&name=large	\N	1775	1131	500萬	\N	2026-04-25 02:32:50.608+00
NTP1abbd9yi3Pier	official	image	https://r2.dan.tw/mvs/ham/cea2a338764b24c98ef672388ad9289d.jpg	https://pbs.twimg.com/media/FT6aYnbUUAAjZrQ?format=jpg&name=large	\N	1560	2047	圖	\N	2026-04-25 02:32:50.826+00
wB-sDTKV2igDXPBs	official	image	https://r2.dan.tw/mvs/ham/5f047d3b533453c4fbab9e4f76851ca2.jpg	https://pbs.twimg.com/media/FdQ301UUYAAzxH7?format=jpg&name=medium	\N	816	1175	卡牌	\N	2026-04-25 02:32:51.044+00
jtT9rcd1pZ0pqZ-h	official	image	https://r2.dan.tw/mvs/ham/0e1e4a7c0812f42ea837df2e5885545d.jpg	https://pbs.twimg.com/media/FdQ301VVUAAD1Y7?format=jpg&name=medium	\N	825	1173	卡牌	\N	2026-04-25 02:32:51.267+00
4x5j4UIDkaxsM3sY	official	image	https://r2.dan.tw/mvs/ham/f73045e50c06e91a8806f2904efbf479.jpg	https://pbs.twimg.com/media/Fx24izJacAAkqGQ?format=jpg&name=large	\N	1264	2048	5周年	\N	2026-04-25 02:32:51.488+00
0TfKkM7B-SaV5gam	official	image	https://r2.dan.tw/mvs/ham/2eae88e8fa56bc67bc6b86b1c76670f9.jpg	https://pbs.twimg.com/media/F3PkHW4bUAAE-aD?format=jpg&name=large	\N	1461	1923	3周年	\N	2026-04-25 02:32:51.704+00
fc548VdbDtUb9ZUt	official	image	https://r2.dan.tw/mvs/ham/8e64df8d0344e6614c46c2d819d79321.jpg	https://pbs.twimg.com/media/GyEfT0GbQAAx1JA?format=jpg&name=large	\N	1500	1920	5周年	\N	2026-04-25 02:32:51.919+00
UxyVX3AiMEqnfKvi	cover	image	https://i.ytimg.com/vi/3ytqnteXfjw/maxresdefault.jpg	https://i.ytimg.com/vi/3ytqnteXfjw/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:54.083+00
LoY6VuWgwQoQX3Q4	cover	image	https://i.ytimg.com/vi/3ytqnteXfjw/maxres1.jpg	https://i.ytimg.com/vi/3ytqnteXfjw/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:54.239+00
O7APvOZIpImV48vN	cover	image	https://i.ytimg.com/vi/3ytqnteXfjw/maxres2.jpg	https://i.ytimg.com/vi/3ytqnteXfjw/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:54.396+00
SWtJAj7aBzYRimBi	cover	image	https://i.ytimg.com/vi/3ytqnteXfjw/maxres3.jpg	https://i.ytimg.com/vi/3ytqnteXfjw/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:54.55+00
_QtEomfoXjJN67AM	official	image	https://r2.dan.tw/mvs/hippocampal-pain-p3r/3e301132f188d9c5b1fd0d0c1777b31c.jpg	https://pbs.twimg.com/media/HBgIWpQbUAAVrBX?format=jpg&name=large	\N	1920	1080	設定圖1	\N	2026-04-25 02:32:54.764+00
rZzz_LSDTUpzOp9g	official	image	https://r2.dan.tw/mvs/hippocampal-pain-p3r/c3dafa040c27a9898e8ee7e63ae085dc.jpg	https://pbs.twimg.com/media/HBgIXCabwAA9Uew?format=jpg&name=large	\N	1920	1080	設定圖2	\N	2026-04-25 02:32:54.977+00
ZdK1py13TqAaIRN_	official	image	https://r2.dan.tw/mvs/hippocampal-pain-p3r/ea31fab40d26600f57b833477086faf3.jpg	https://pbs.twimg.com/media/HBgIXawbUAYYqfh?format=jpg&name=large	\N	1920	1080	設定圖3	\N	2026-04-25 02:32:55.195+00
JllBMjJSpN7GUpUT	official	image	https://r2.dan.tw/mvs/hippocampal-pain-p3r/9b2af722ecaaf9e0e273c9a718d5c454.jpg	https://pbs.twimg.com/media/HBgIX4_bIAAnr6y?format=jpg&name=large	\N	1920	1080	設定圖4	\N	2026-04-25 02:32:55.41+00
t5AKnDsh7heG-1Fy	cover	image	https://i.ytimg.com/vi/JQ2913bVo30/maxresdefault.jpg	https://i.ytimg.com/vi/JQ2913bVo30/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:57.597+00
V682RYbyrSCQ-SVk	cover	image	https://i.ytimg.com/vi/JQ2913bVo30/maxres1.jpg	https://i.ytimg.com/vi/JQ2913bVo30/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:57.752+00
KkI-bEicM5BYCaeN	cover	image	https://i.ytimg.com/vi/JQ2913bVo30/maxres2.jpg	https://i.ytimg.com/vi/JQ2913bVo30/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:57.906+00
2dwOm90YhpcgUSVf	cover	image	https://i.ytimg.com/vi/JQ2913bVo30/maxres3.jpg	https://i.ytimg.com/vi/JQ2913bVo30/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:32:58.06+00
KYljH6xziiCQ8rHO	official	image	https://r2.dan.tw/mvs/cream/29d16ae28d1a51cb94ef1152f8effa6c.jpg	https://pbs.twimg.com/media/GreQiqxbsAA_fbz?format=jpg&name=large	\N	2048	1448	設定圖1	\N	2026-04-25 02:32:58.274+00
W0jpD3PLNm4Zxid5	official	image	https://r2.dan.tw/mvs/cream/94793d0194958392d3e8bbf2082e4c93.jpg	https://pbs.twimg.com/media/GreQiqzbsAA1uF1?format=jpg&name=large	\N	2048	1448	設定圖2	\N	2026-04-25 02:32:58.487+00
IQ3yvJv8SswNIvTb	official	image	https://r2.dan.tw/mvs/cream/27fbf51e4ae5a458c23c916a9c49a377.jpg	https://pbs.twimg.com/media/GreQiqxa4AA0-Mr?format=jpg&name=large	\N	2048	1448	設定圖2	\N	2026-04-25 02:32:58.707+00
dX403mkGza6-wULB	official	image	https://r2.dan.tw/mvs/cream/e69c144c7c0002e86080133d1daa0a6e.jpg	https://pbs.twimg.com/media/GrjVxcoWQAApxdr?format=jpg&name=4096x4096	\N	1447	2048	海報	\N	2026-04-25 02:32:58.923+00
MyiKLs-231HB89cb	official	image	https://r2.dan.tw/mvs/cream/d643c8c927d7f6b66882cc7c3fd8febd.jpg	https://pbs.twimg.com/media/GsiK0emWUAA0iBT.jpg	https://pbs.twimg.com/media/GsiK0emWUAA0iBT.jpg	1640	2048	ZTMY 7周年	\N	2026-04-25 02:32:59.136+00
QaOixPJAzYJlG9bs	cover	image	https://i.ytimg.com/vi/3iAXclHlTTg/sddefault.jpg	https://i.ytimg.com/vi/3iAXclHlTTg/sddefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:01.454+00
ssTfGw9ialHn9b9w	cover	image	https://i.ytimg.com/vi/3iAXclHlTTg/maxres1.jpg	https://i.ytimg.com/vi/3iAXclHlTTg/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:01.609+00
eFx4jJCmJFsRcQiw	cover	image	https://i.ytimg.com/vi/3iAXclHlTTg/maxres2.jpg	https://i.ytimg.com/vi/3iAXclHlTTg/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:01.764+00
0Z-9O5RCKsE0ewwJ	cover	image	https://i.ytimg.com/vi/3iAXclHlTTg/maxres3.jpg	https://i.ytimg.com/vi/3iAXclHlTTg/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:01.918+00
zYJEFydRDVc48lWq	official	image	https://r2.dan.tw/mvs/nouriueno-cracker/ce58e9e43b1f1f97d0ab16903a376c30.jpg	https://pbs.twimg.com/media/Gju7PEWacAIqD3E.jpg	https://pbs.twimg.com/media/Gju7PEWacAIqD3E.jpg	1500	895		\N	2026-04-25 02:33:02.136+00
kXUH1GyC8Su5q-ce	official	image	https://r2.dan.tw/mvs/nouriueno-cracker/a9bb9346eda4e48cbe064904f92622ec.jpg	https://pbs.twimg.com/media/GZmsBpUaEAAuWFU.jpg	https://pbs.twimg.com/media/GZmsBpUaEAAuWFU.jpg	1449	2048		\N	2026-04-25 02:33:02.351+00
IN-jPCkhr82_NaI5	cover	image	https://i.ytimg.com/vi/ElnxZtiBDvs/maxresdefault.jpg	https://i.ytimg.com/vi/ElnxZtiBDvs/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:04.278+00
khB-PRcn4C_U0nuC	cover	image	https://i.ytimg.com/vi/ElnxZtiBDvs/maxres1.jpg	https://i.ytimg.com/vi/ElnxZtiBDvs/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:04.433+00
RwQnSaqPhUc_ahYD	cover	image	https://i.ytimg.com/vi/ElnxZtiBDvs/maxres2.jpg	https://i.ytimg.com/vi/ElnxZtiBDvs/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:04.588+00
o1Rq7FgbPlyjSFPX	cover	image	https://i.ytimg.com/vi/ElnxZtiBDvs/maxres3.jpg	https://i.ytimg.com/vi/ElnxZtiBDvs/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:04.745+00
WgFT715k65zA0YE7	official	image	https://r2.dan.tw/mvs/haze-haseru-haterumade/30007604d15fa405af7d54103a7f15f6.jpg	https://pbs.twimg.com/media/GaKoQc8bgAAIrtk.jpg	https://pbs.twimg.com/media/GaKoQc8bgAAIrtk.jpg	2048	1578	5周年	\N	2026-04-25 02:33:04.969+00
cOE-tezOkzLdWOpd	official	image	https://r2.dan.tw/mvs/haze-haseru-haterumade/a6ee4665f5f624e560fdb688163066f0.jpg	https://pbs.twimg.com/media/GZmsCnEbsAAzWx0.jpg	https://pbs.twimg.com/media/GZmsCnEbsAAzWx0.jpg	1449	2048		\N	2026-04-25 02:33:05.192+00
jeXbDXBVIvSSyG9C	cover	image	https://i.ytimg.com/vi/E0N8LzuM6qI/maxres1.jpg	https://i.ytimg.com/vi/E0N8LzuM6qI/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:06.289+00
blIBlWFK777ghSxO	cover	image	https://i.ytimg.com/vi/E0N8LzuM6qI/maxres2.jpg	https://i.ytimg.com/vi/E0N8LzuM6qI/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:06.444+00
GspK_51BiFMAX6tQ	cover	image	https://i.ytimg.com/vi/E0N8LzuM6qI/maxres3.jpg	https://i.ytimg.com/vi/E0N8LzuM6qI/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:06.6+00
Mt91mIJys5riWKdX	cover	image	https://i.ytimg.com/vi/GfDXqY-V0EY/maxresdefault.jpg	https://i.ytimg.com/vi/GfDXqY-V0EY/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:09.62+00
AiThmypB5Lk31aS1	cover	image	https://i.ytimg.com/vi/GfDXqY-V0EY/maxres1.jpg	https://i.ytimg.com/vi/GfDXqY-V0EY/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:09.776+00
M84Lo3ZSCCRsgCZs	cover	image	https://i.ytimg.com/vi/GfDXqY-V0EY/maxres2.jpg	https://i.ytimg.com/vi/GfDXqY-V0EY/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:09.934+00
ZBzN619fgvXkQHvL	cover	image	https://i.ytimg.com/vi/GfDXqY-V0EY/maxres3.jpg	https://i.ytimg.com/vi/GfDXqY-V0EY/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:10.088+00
v7h8tzfePiNEVNZs	official	image	https://r2.dan.tw/mvs/truth-in-lies/a4f14fa11f3824c00f5044efc7ba1b1d.jpg	https://pbs.twimg.com/media/GrOTK1QXQAAyeVL.jpg	https://pbs.twimg.com/media/GrOTK1QXQAAyeVL.jpg	2048	1536		\N	2026-04-25 02:33:10.305+00
tlow-EMuiCTmc21K	official	image	https://r2.dan.tw/mvs/truth-in-lies/07a6603624b92118fc240a4d22e475de.jpg	https://pbs.twimg.com/media/GrOTK1eWwAApUFS.jpg	https://pbs.twimg.com/media/GrOTK1eWwAApUFS.jpg	1466	2048		\N	2026-04-25 02:33:10.52+00
pqmXAnskr4Ai9bBQ	official	image	https://r2.dan.tw/mvs/truth-in-lies/b887e5ca9124d098f60b739e45cd12b7.jpg	https://pbs.twimg.com/media/GePE6RVbAAAjGsc.jpg	https://pbs.twimg.com/media/GePE6RVbAAAjGsc.jpg	1466	2048		\N	2026-04-25 02:33:10.734+00
2l1VsLlmYEd6F6ne	official	image	https://r2.dan.tw/mvs/truth-in-lies/fee256e958fa82a58f99bfb2e4675635.jpg	https://pbs.twimg.com/media/GeGoM3BakAACVd4.jpg	https://pbs.twimg.com/media/GeGoM3BakAACVd4.jpg	1024	768		\N	2026-04-25 02:33:10.95+00
yjez15XgefHm6dNy	official	image	https://r2.dan.tw/mvs/truth-in-lies/9d0979a42061064e88c976cb37503101.jpg	https://pbs.twimg.com/media/GeGoM2_akAM1W0C.jpg	https://pbs.twimg.com/media/GeGoM2_akAM1W0C.jpg	1024	768		\N	2026-04-25 02:33:11.176+00
wC7zNIg_o5tX-Ayh	official	image	https://r2.dan.tw/mvs/truth-in-lies/6ccfc8497803df014e436366f88a67e8.jpg	https://pbs.twimg.com/media/GeGoM2_bYAAtSz5.jpg	https://pbs.twimg.com/media/GeGoM2_bYAAtSz5.jpg	1024	768		\N	2026-04-25 02:33:11.4+00
fOPUybRi-OfJN2BT	official	image	https://r2.dan.tw/mvs/truth-in-lies/fb25e309d94ca1226c9ca3f15522eaaa.jpg	https://pbs.twimg.com/media/GeGoM3AakAIsM0j.jpg	https://pbs.twimg.com/media/GeGoM3AakAIsM0j.jpg	1448	2048		\N	2026-04-25 02:33:11.622+00
QMAl-jIq187ikWPm	official	image	https://r2.dan.tw/mvs/truth-in-lies/488c217bc62623f98aef4cccc39b0d87.jpg	https://pbs.twimg.com/media/GdyI2yMa8AA4cUB.jpg	https://pbs.twimg.com/media/GdyI2yMa8AA4cUB.jpg	744	1185		\N	2026-04-25 02:33:11.835+00
MBSEp_rvrgARwA5v	official	image	https://r2.dan.tw/mvs/truth-in-lies/949c8b1fdc102924d0e62786800a1995.jpg	https://pbs.twimg.com/media/GcQu2ZgaIAA2zYk.jpg	https://pbs.twimg.com/media/GcQu2ZgaIAA2zYk.jpg	744	1185		\N	2026-04-25 02:33:12.058+00
YyDWuvRy1vaH4EAN	official	image	https://r2.dan.tw/mvs/truth-in-lies/5a56850125190af2bd9d3ae81e587f91.jpg	https://pbs.twimg.com/media/GOVaSLgaEAAIBv8.jpg	https://pbs.twimg.com/media/GOVaSLgaEAAIBv8.jpg	2048	1536		\N	2026-04-25 02:33:12.275+00
6upc01zVWW-hdjUp	official	image	https://r2.dan.tw/mvs/truth-in-lies/ed8b6b5ea44fe42061e9138a76bfa7eb.jpg	https://pbs.twimg.com/media/GOVaSLla0AAqbqy.jpg	https://pbs.twimg.com/media/GOVaSLla0AAqbqy.jpg	2048	1430		\N	2026-04-25 02:33:12.489+00
hcQ3Iz_E3BGQgkns	official	image	https://r2.dan.tw/mvs/truth-in-lies/6c20f8f6038978e9299c0d259a91fa3b.jpg	https://pbs.twimg.com/media/GOVaSLsa0AANw3c.jpg	https://pbs.twimg.com/media/GOVaSLsa0AANw3c.jpg	2048	1536		\N	2026-04-25 02:33:12.703+00
3g9m2qLVaWKZNowU	official	image	https://r2.dan.tw/mvs/truth-in-lies/fe0c56295dcbe243dc954bf8bc41e746.jpg	https://pbs.twimg.com/media/GOVaSLrbkAAcn9r.jpg	https://pbs.twimg.com/media/GOVaSLrbkAAcn9r.jpg	2048	1536		\N	2026-04-25 02:33:12.923+00
fckn_ZICzlDE43sF	official	image	https://r2.dan.tw/mvs/truth-in-lies/2a1c4ebb01602ac9d3e8dd44b7dc5969.jpg	https://pbs.twimg.com/media/GOUDBggbAAAz1Qq.jpg	https://pbs.twimg.com/media/GOUDBggbAAAz1Qq.jpg	2048	1536		\N	2026-04-25 02:33:13.141+00
LgncfV6Yw2YMuf8R	official	image	https://r2.dan.tw/mvs/truth-in-lies/610eb5c305bb87c3a26bc7b8a272c150.jpg	https://pbs.twimg.com/media/GOUDBgbasAAMs0-.jpg	https://pbs.twimg.com/media/GOUDBgbasAAMs0-.jpg	2048	1536		\N	2026-04-25 02:33:13.363+00
tX4E8dWr0ZJ92Bvt	official	image	https://r2.dan.tw/mvs/truth-in-lies/3f30dfb26271ca072cba463d854cfb6d.jpg	https://pbs.twimg.com/media/GOUDBgiboAAN1Hw.jpg	https://pbs.twimg.com/media/GOUDBgiboAAN1Hw.jpg	2048	1536		\N	2026-04-25 02:33:13.579+00
PjEha4WNBI1y-3oC	official	image	https://r2.dan.tw/mvs/truth-in-lies/71deafe11e962c6e7ad91e4f83d175bf.jpg	https://pbs.twimg.com/media/GOUDBggaAAA71f6.jpg	https://pbs.twimg.com/media/GOUDBggaAAA71f6.jpg	2048	1536		\N	2026-04-25 02:33:13.796+00
9QKFzKwOyozr3KSU	official	image	https://r2.dan.tw/mvs/truth-in-lies/eb66269a2de5e34ce3d0aab7372febc5.jpg	https://pbs.twimg.com/media/GOLrhxBaEAA1nOy?format=jpg&name=large	\N	2048	1536		\N	2026-04-25 02:33:14.017+00
GHjwDiAEyk1t6V_E	official	image	https://r2.dan.tw/mvs/truth-in-lies/cd7865b49da7bc93df5fadb2b600d585.jpg	https://pbs.twimg.com/media/GOP-1wAaYAArfPY?format=jpg&name=large	\N	2048	1536		\N	2026-04-25 02:33:14.234+00
CGIzBc-waAJUDaGG	cover	image	https://i.ytimg.com/vi/6OC92oxs4gA/maxresdefault.jpg	https://i.ytimg.com/vi/6OC92oxs4gA/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:17.126+00
7Kijg1uZXXm_q1XC	cover	image	https://i.ytimg.com/vi/6OC92oxs4gA/maxres1.jpg	https://i.ytimg.com/vi/6OC92oxs4gA/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:17.282+00
5bLqKH4gNpdceC1j	cover	image	https://i.ytimg.com/vi/6OC92oxs4gA/maxres2.jpg	https://i.ytimg.com/vi/6OC92oxs4gA/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:17.436+00
exbv_DBwpBaq0n-J	cover	image	https://i.ytimg.com/vi/6OC92oxs4gA/maxres3.jpg	https://i.ytimg.com/vi/6OC92oxs4gA/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:17.59+00
JxYcnwAzVfcZJMTS	official	image	https://r2.dan.tw/mvs/time-left/3ecca61186292ff05ace8ad5cf78e5dc.jpg	https://pbs.twimg.com/media/FflMKHXVsAAlaJa?format=jpg&name=large	\N	1523	1077		\N	2026-04-25 02:33:17.805+00
ZNaLxe1pNZuJE3MK	official	image	https://r2.dan.tw/mvs/time-left/2c5400902db77f067a44da79c061a144.jpg	https://pbs.twimg.com/media/GaWw7uIW8AAcyAl.jpg	https://pbs.twimg.com/media/GaWw7uIW8AAcyAl.jpg	1060	1500	2周年	\N	2026-04-25 02:33:18.021+00
EHkuMxmvsgaNrJbS	official	image	https://r2.dan.tw/mvs/time-left/50bb94a1ac22fa669c0b6d8991495f58.jpg	https://pbs.twimg.com/media/GJNGaiaW0AAt029.jpg	https://pbs.twimg.com/media/GJNGaiaW0AAt029.jpg	1456	2000		\N	2026-04-25 02:33:18.251+00
S1UGVZS9T59rGb2f	official	image	https://r2.dan.tw/mvs/time-left/5e9a896db9681204941c142f7e36e8e3.jpg	https://pbs.twimg.com/media/F84i1w2W8AAfx3J.jpg	https://pbs.twimg.com/media/F84i1w2W8AAfx3J.jpg	1447	2048		\N	2026-04-25 02:33:18.464+00
g8mdk1I6xzNak4jd	official	image	https://r2.dan.tw/mvs/time-left/473890614872da76976a095d428bcdaa.jpg	https://pbs.twimg.com/media/F7SJaPZWEAAjbcF.jpg	https://pbs.twimg.com/media/F7SJaPZWEAAjbcF.jpg	1110	1394	2000萬	\N	2026-04-25 02:33:18.679+00
ko8CMj9xiC4PKOAS	official	image	https://r2.dan.tw/mvs/time-left/314479b8afd11c928a865931afb4e3e7.jpg	https://pbs.twimg.com/media/Fxx5qK0XsAA5RFh.jpg	https://pbs.twimg.com/media/Fxx5qK0XsAA5RFh.jpg	1352	2048		\N	2026-04-25 02:33:18.896+00
poVQr8exo4HSaiMK	official	image	https://r2.dan.tw/mvs/time-left/2db97d1313d42a6f78867c946dadd466.jpg	https://pbs.twimg.com/media/FxsMM1YXgAA074e.jpg	https://pbs.twimg.com/media/FxsMM1YXgAA074e.jpg	1087	1480		\N	2026-04-25 02:33:19.115+00
550RkwUsySha7bJf	official	image	https://r2.dan.tw/mvs/time-left/73e675948e6e7058fea660e2e474de1b.jpg	https://pbs.twimg.com/media/FlJn_msXoAI-S6W.jpg	https://pbs.twimg.com/media/FlJn_msXoAI-S6W.jpg	1744	2048		\N	2026-04-25 02:33:19.33+00
qRVgPzurxCUmax0l	official	image	https://r2.dan.tw/mvs/time-left/74789f9b29054dad76f4bd328bc38220.jpg	https://pbs.twimg.com/media/FfxRhDLXEAEq1CV.jpg	https://pbs.twimg.com/media/FfxRhDLXEAEq1CV.jpg	1447	2048		\N	2026-04-25 02:33:19.55+00
X6YZBJhST1KbK9le	official	image	https://r2.dan.tw/mvs/time-left/b683cf6663af8e94e059d40cb6ba1eb9.jpg	https://pbs.twimg.com/media/G3sQjgFXMAAxDYe.jpg	https://pbs.twimg.com/media/G3sQjgFXMAAxDYe.jpg	1422	2000		\N	2026-04-25 02:33:19.769+00
gm0poVH8h4BwyPZu	official	image	https://r2.dan.tw/mvs/time-left/956cc1541e89917f9af76867b14c6e39.jpg	https://pbs.twimg.com/media/G4bXPXJXAAA4vjo.jpg	https://pbs.twimg.com/media/G4bXPXJXAAA4vjo.jpg	1060	1468		\N	2026-04-25 02:33:20.016+00
fcfvfff9SAvAGOr2	official	image	https://r2.dan.tw/mvs/time-left/fd3b3bddf60778ffda02327d53a6620f.jpg	https://pbs.twimg.com/media/G4bWZStWwAAI_Ll.jpg	https://pbs.twimg.com/media/G4bWZStWwAAI_Ll.jpg	1336	1346		\N	2026-04-25 02:33:20.238+00
WCV-Zwlk7sPEOdK-	cover	image	https://i.ytimg.com/vi/plpVOHqh3lA/maxresdefault.jpg	https://i.ytimg.com/vi/plpVOHqh3lA/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:22.187+00
OZhkAL1WV9GMdbWr	cover	image	https://i.ytimg.com/vi/plpVOHqh3lA/maxres1.jpg	https://i.ytimg.com/vi/plpVOHqh3lA/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:22.342+00
wndpyL7o0uS-0Ow0	cover	image	https://i.ytimg.com/vi/plpVOHqh3lA/maxres2.jpg	https://i.ytimg.com/vi/plpVOHqh3lA/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:22.501+00
fyv_SnV4Pnv22Fxn	cover	image	https://i.ytimg.com/vi/plpVOHqh3lA/maxres3.jpg	https://i.ytimg.com/vi/plpVOHqh3lA/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:22.655+00
hcTKBiVTxrVA2DfZ	official	image	https://r2.dan.tw/mvs/warmthaholic/7fe2c0e3004ca364914d90c5261cc3ee.jpg	https://pbs.twimg.com/media/GozktwnaoAIpUS1?format=jpg&name=large	\N	2048	1616	設定圖	\N	2026-04-25 02:33:22.871+00
8v5YnKKNGj2to2lJ	official	image	https://r2.dan.tw/mvs/warmthaholic/edd562dc341df8723b524ced8afcdec9.jpg	https://pbs.twimg.com/media/G9-KDFqbcAEft7F?format=jpg&name=large	\N	1476	2048	1000萬	\N	2026-04-25 02:33:23.092+00
Z0IGMgP73mpoJGxV	official	image	https://r2.dan.tw/mvs/warmthaholic/8a9984be5ae9a814c912d3f5e14bb1b2.jpg	https://pbs.twimg.com/media/GpTFq0XbYAEiPwT.jpg	https://pbs.twimg.com/media/GpTFq0XbYAEiPwT.jpg	2048	1448	背景	\N	2026-04-25 02:33:23.307+00
AhfO9g7E3QFnbUuQ	official	image	https://r2.dan.tw/mvs/warmthaholic/bd60043d5b2b347262cb620b97d930ca.jpg	https://pbs.twimg.com/media/GpTFq0ebYAMUbgQ.jpg	https://pbs.twimg.com/media/GpTFq0ebYAMUbgQ.jpg	1136	1136		\N	2026-04-25 02:33:23.523+00
CyZrxjKIpt89DaXT	official	image	https://r2.dan.tw/mvs/warmthaholic/3c00bd97227a9135fb680558f8c73561.jpg	https://pbs.twimg.com/media/GpTFq0bbYAEKMf6.jpg	https://pbs.twimg.com/media/GpTFq0bbYAEKMf6.jpg	1783	1318		\N	2026-04-25 02:33:23.742+00
rRYMxebh54CaiuB5	fanart	image	https://r2.dan.tw/mvs/warmthaholic/021233190497fa685cbdf613f657c994.jpg	https://pbs.twimg.com/media/HGHs4XOawAMR_Di.jpg	https://pbs.twimg.com/media/HGHs4XOawAMR_Di.jpg	\N	\N		-6DYmiNKbZMd1zf6	2026-04-25 02:33:23.962+00
w4goKlYAXsQxboYF	fanart	image	https://r2.dan.tw/mvs/warmthaholic/8337565f3bf2939e54487acfae5b2585.jpg	https://pbs.twimg.com/media/HGHaDZEagAA3bf7.jpg	https://pbs.twimg.com/media/HGHaDZEagAA3bf7.jpg	\N	\N		tAp-QIs973CuPWOg	2026-04-25 02:33:24.342+00
mT_ri6rgqI747xfs	cover	image	https://i.ytimg.com/vi/sBpITQ7oXxM/maxresdefault.jpg	https://i.ytimg.com/vi/sBpITQ7oXxM/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:25.674+00
QfwO56ZD4c8imfUH	cover	image	https://i.ytimg.com/vi/sBpITQ7oXxM/maxres1.jpg	https://i.ytimg.com/vi/sBpITQ7oXxM/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:25.83+00
AMhIAn_-liOndaUx	cover	image	https://i.ytimg.com/vi/sBpITQ7oXxM/maxres2.jpg	https://i.ytimg.com/vi/sBpITQ7oXxM/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:25.995+00
e24o0zqjY7PYntt0	cover	image	https://i.ytimg.com/vi/sBpITQ7oXxM/maxres3.jpg	https://i.ytimg.com/vi/sBpITQ7oXxM/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:26.152+00
Z2vD3GxNC1FHTS3B	official	image	https://r2.dan.tw/mvs/medianoche/6721061aef942d2375b0de93b4ede7fc.png	https://pbs.twimg.com/media/HCe8McjasAADKPm.png	https://pbs.twimg.com/media/HCe8McjasAADKPm.png	385	589	1千萬播放賀圖	\N	2026-04-25 02:33:26.813+00
8Hbx0B5jVypeJdfL	official	image	https://r2.dan.tw/mvs/medianoche/7dd14396739a613a3dc62072a85ba828.jpg	https://pbs.twimg.com/media/G_WVbYcXAAA8drg?format=jpg&name=large	\N	1754	1240	設定圖1	\N	2026-04-25 02:33:27.034+00
GVI94oQjgYC3lKiY	official	image	https://r2.dan.tw/mvs/medianoche/a0043d7e348da516a5c242e904995f4e.jpg	https://pbs.twimg.com/media/G_bXBtxXEAEDbWs?format=jpg&name=large	\N	1754	1240	設定圖2	\N	2026-04-25 02:33:27.251+00
qaCsmXRURM9W0VOJ	official	image	https://r2.dan.tw/mvs/medianoche/3868f043b98be16270dc75becc2c4b6a.jpg	https://pbs.twimg.com/media/G_q07s1bAAQanV3?format=jpg&name=large	\N	1754	1240	設定圖3	\N	2026-04-25 02:33:27.479+00
phMGqQ6wRp_PRYVC	official	image	https://r2.dan.tw/mvs/medianoche/41773566db5241c6cb1b4418b4ca73be.jpg	https://pbs.twimg.com/media/G_q07sya8AAK9De?format=jpg&name=large	\N	1754	1240	設定圖4	\N	2026-04-25 02:33:27.696+00
GjVWQwVW3RBYdTfi	official	image	https://r2.dan.tw/mvs/medianoche/e5534413f1a9c5887ea28b6f8fe1ccb4.jpg	https://pbs.twimg.com/media/G_q07s0bAAEbeaT?format=jpg&name=large	\N	1754	1240	設定圖5	\N	2026-04-25 02:33:27.917+00
OMlKCntPEg5TPPgo	official	image	https://r2.dan.tw/mvs/medianoche/e0d4f4bf0df8c3b644139f037c69186e.png	https://pbs.twimg.com/media/G_1HI8aXEAAys90?format=png&name=4096x4096	\N	1448	2048	海報	\N	2026-04-25 02:33:28.131+00
kQJz_6PuJllwrlVQ	official	image	https://r2.dan.tw/mvs/medianoche/fdef6e5d599b27ad28e2ef9915fa0ca0.png	https://pbs.twimg.com/media/HAZmVcEXcAAnQGZ?format=png&name=medium	\N	1035	1035	未使用1	\N	2026-04-25 02:33:28.349+00
XgV1-GHuPdnLowZf	official	image	https://r2.dan.tw/mvs/medianoche/319bc0649bf61f88c7d1692308c19e4b.png	https://pbs.twimg.com/media/HAZmHxIWkAABttZ?format=png&name=small	\N	665	627	未使用2	\N	2026-04-25 02:33:28.566+00
YsAYU4QxyBo5iFkT	official	image	https://r2.dan.tw/mvs/medianoche/c3407ea8c6814581484d84829a8b0d09.png	https://pbs.twimg.com/media/HAZmIRvWAAI7Q4p?format=png&name=4096x4096	\N	2048	1274	未使用3	\N	2026-04-25 02:33:28.783+00
5wrgnaQ8_M5QlpIW	official	image	https://r2.dan.tw/mvs/medianoche/7d740acfc0219bc7868283198ffe5d9b.jpg	https://pbs.twimg.com/media/HBHu0Pbb0AAwphG?format=jpg&name=900x900	\N	744	895	情人節賀圖	\N	2026-04-25 02:33:29.012+00
IPHz_lHUYBo8CgOE	fanart	image	https://r2.dan.tw/mvs/medianoche/71321f56aa4dce5b68d1a95281dd0a9b.jpg	https://pbs.twimg.com/media/HE6ZYAnagAEJO4w.jpg	https://pbs.twimg.com/media/HE6ZYAnagAEJO4w.jpg	\N	\N		vfiTBtE7T0mbpPSr	2026-04-25 02:33:29.234+00
R5KxoFLtawx4_zmG	cover	image	https://i.ytimg.com/vi/lpg5nhWapjU/maxresdefault.jpg	https://i.ytimg.com/vi/lpg5nhWapjU/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:32.15+00
8Pw5RBqYYllASX90	cover	image	https://i.ytimg.com/vi/lpg5nhWapjU/maxres1.jpg	https://i.ytimg.com/vi/lpg5nhWapjU/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:32.311+00
fKPWJz0j4beKHpFb	cover	image	https://i.ytimg.com/vi/lpg5nhWapjU/maxres2.jpg	https://i.ytimg.com/vi/lpg5nhWapjU/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:32.469+00
WjKcBeonqIZXVrnt	cover	image	https://i.ytimg.com/vi/lpg5nhWapjU/maxres3.jpg	https://i.ytimg.com/vi/lpg5nhWapjU/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:32.627+00
5pJO982w3ruKRPFV	official	image	https://r2.dan.tw/mvs/ultra-soul/9aed0ccee974f064e2fcdf9fb427aefb.jpg	https://pbs.twimg.com/media/HEy5zIiagAA7Iqi?format=jpg&name=large	\N	2048	1335	設定圖 晝Nira & 夜Nira	\N	2026-04-25 02:33:32.848+00
43mCAYgMQ8Z79IJe	official	image	https://r2.dan.tw/mvs/ultra-soul/922e237e3a7cb580fabdbfa484d77634.jpg	https://pbs.twimg.com/media/HEy5zIdb0AACPvc?format=jpg&name=large	\N	2048	1482	設定圖 Gray君	\N	2026-04-25 02:33:33.067+00
o8b0j5pd2ETvlIMH	official	image	https://r2.dan.tw/mvs/ultra-soul/efbecd70be9e2235a497c7c808fd6f42.jpg	https://pbs.twimg.com/media/HEz4z83bsAAm_Hy?format=jpg&name=large	\N	1614	1594	賀圖1	\N	2026-04-25 02:33:33.282+00
KOCL9GBbSo3YBaEe	official	image	https://r2.dan.tw/mvs/ultra-soul/aea6eea7fe36f8061eb9aaf327af70da.jpg	https://pbs.twimg.com/media/HEzgxNPaUAAqHHB?format=jpg&name=large	\N	1500	1476	賀圖2	\N	2026-04-25 02:33:33.496+00
qOxk5IYdffS9d-ja	official	image	https://r2.dan.tw/mvs/ultra-soul/d8d2bc961196fd67a0f019048d56f99f.jpg	https://pbs.twimg.com/media/HEzm8HsaUAASOfl.jpg	https://pbs.twimg.com/media/HEzm8HsaUAASOfl.jpg	1160	740		\N	2026-04-25 02:33:34.372+00
D9r2FVQvyBDOVVRd	official	image	https://r2.dan.tw/mvs/ultra-soul/eca7f0566893d9655baab647912ed85e.jpg	https://pbs.twimg.com/media/HEzm8HtbQAEriHC.jpg	https://pbs.twimg.com/media/HEzm8HtbQAEriHC.jpg	1160	740		\N	2026-04-25 02:33:34.589+00
cJP68VIXFQoBddYR	official	image	https://r2.dan.tw/mvs/ultra-soul/b7935a4a37077e4548a4a732b8e6849b.jpg	https://pbs.twimg.com/media/HEzm8HoaEAAOr5Y.jpg	https://pbs.twimg.com/media/HEzm8HoaEAAOr5Y.jpg	1160	740		\N	2026-04-25 02:33:34.847+00
eaTU7q8oYt_ekpc8	official	image	https://r2.dan.tw/mvs/ultra-soul/14c83d58a0e504e5b4f5d6ff450754cf.jpg	https://pbs.twimg.com/media/HEzm8HwakAAP0Bu.jpg	https://pbs.twimg.com/media/HEzm8HwakAAP0Bu.jpg	1160	740		\N	2026-04-25 02:33:35.067+00
QAGw3flYeXHvkhT-	official	image	https://r2.dan.tw/mvs/ultra-soul/cfe29c1ef292d001083a1bddf0148eee.jpg	https://pbs.twimg.com/media/HE0BH9PakAAQ-Mg.jpg	https://pbs.twimg.com/media/HE0BH9PakAAQ-Mg.jpg	1920	1080		\N	2026-04-25 02:33:35.288+00
CGYTFXRJ1DgHl9kK	official	image	https://r2.dan.tw/mvs/ultra-soul/ae4853762398c02f06050538e2a9233f.jpg	https://pbs.twimg.com/media/HE0BH9QbAAALlyG.jpg	https://pbs.twimg.com/media/HE0BH9QbAAALlyG.jpg	1740	1110		\N	2026-04-25 02:33:35.507+00
XV9_v3VsMmBEIqS8	official	image	https://r2.dan.tw/mvs/ultra-soul/86d45f64cf131484e83ea1ade3a6a998.jpg	https://pbs.twimg.com/media/HE0BH9LaMAE6jzi.jpg	https://pbs.twimg.com/media/HE0BH9LaMAE6jzi.jpg	1740	1110		\N	2026-04-25 02:33:35.725+00
mJsZh0O6LCslDzqA	official	image	https://r2.dan.tw/mvs/ultra-soul/b85635d0476993116d9a67ff145a7ccc.jpg	https://pbs.twimg.com/media/HE0BS5PaIAATfkd.jpg	https://pbs.twimg.com/media/HE0BS5PaIAATfkd.jpg	1740	1110		\N	2026-04-25 02:33:35.941+00
Z96ZzjyUyGBvsZpY	official	image	https://r2.dan.tw/mvs/ultra-soul/545b520afb32007d1bce3f0b6fda10ce.jpg	https://pbs.twimg.com/media/HE0BS5caAAAxCUd.jpg	https://pbs.twimg.com/media/HE0BS5caAAAxCUd.jpg	1740	1110		\N	2026-04-25 02:33:36.171+00
1OsaajrDh5q6R9ln	official	image	https://r2.dan.tw/mvs/ultra-soul/14a7398a86f2c4551c6d68ae9187f8bd.jpg	https://pbs.twimg.com/media/HE0BS5ObcAE1kuJ.jpg	https://pbs.twimg.com/media/HE0BS5ObcAE1kuJ.jpg	1740	1110		\N	2026-04-25 02:33:36.391+00
iVYhkiFo81dZP-Lo	official	image	https://r2.dan.tw/mvs/ultra-soul/173c8825f93daf8fec01f16e5523a742.jpg	https://pbs.twimg.com/media/HE0Bi8IawAAnYrl.jpg	https://pbs.twimg.com/media/HE0Bi8IawAAnYrl.jpg	1740	1110		\N	2026-04-25 02:33:36.605+00
mOLZdEHsAffZESA-	official	image	https://r2.dan.tw/mvs/ultra-soul/9baf6368d3c03af3e21571a5389ac919.jpg	https://pbs.twimg.com/media/HE0Bi8KaIAACK4a.jpg	https://pbs.twimg.com/media/HE0Bi8KaIAACK4a.jpg	1740	1110		\N	2026-04-25 02:33:36.827+00
Vuek4wVHMNltq-eF	official	image	https://r2.dan.tw/mvs/ultra-soul/acb434fbe93c3e2c372d455459d45018.jpg	https://pbs.twimg.com/media/HE0Bi8MbMAAwTla.jpg	https://pbs.twimg.com/media/HE0Bi8MbMAAwTla.jpg	1740	1110		\N	2026-04-25 02:33:37.045+00
Vdaey1CFMdoFAMK4	official	image	https://r2.dan.tw/mvs/ultra-soul/0d6d969367971fc318d57189028ad294.jpg	https://pbs.twimg.com/media/HE0Bi8IbQAATRmM.jpg	https://pbs.twimg.com/media/HE0Bi8IbQAATRmM.jpg	1740	1110		\N	2026-04-25 02:33:37.262+00
OUXZOOn6LxXySCNz	official	image	https://r2.dan.tw/mvs/ultra-soul/456c31970a0346c8640e2d02677f0ad1.jpg	https://pbs.twimg.com/media/HE0CBBkaAAAuj4Q.jpg	https://pbs.twimg.com/media/HE0CBBkaAAAuj4Q.jpg	1740	1110		\N	2026-04-25 02:33:37.483+00
H3JxYY5n6erngJoI	official	image	https://r2.dan.tw/mvs/ultra-soul/32de301caaf0270d743b426c61d8ec04.jpg	https://pbs.twimg.com/media/HE0CBBlacAASoQo.jpg	https://pbs.twimg.com/media/HE0CBBlacAASoQo.jpg	1740	1110		\N	2026-04-25 02:33:37.701+00
BPlZ2KHfbkv7sv2Y	official	image	https://r2.dan.tw/mvs/ultra-soul/994af2a53cb470a4759a76dd1f15efba.jpg	https://pbs.twimg.com/media/HE0CBBsbcAAUX07.jpg	https://pbs.twimg.com/media/HE0CBBsbcAAUX07.jpg	1740	1110		\N	2026-04-25 02:33:37.921+00
RbTXgAfffTGZAL9i	official	image	https://r2.dan.tw/mvs/ultra-soul/93fb0533b1487a8a4ea9425732006323.jpg	https://pbs.twimg.com/media/HE0CNAIbUAAjaHO.jpg	https://pbs.twimg.com/media/HE0CNAIbUAAjaHO.jpg	1740	1110		\N	2026-04-25 02:33:38.145+00
-7mfK2XGVRD5OUnI	cover	image	https://i.ytimg.com/vi/IeyCdm9WwXM/maxres1.jpg	https://i.ytimg.com/vi/IeyCdm9WwXM/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:34.243+00
BT46VrwA2HyGVybT	official	image	https://r2.dan.tw/mvs/ultra-soul/3b478c9c74659848ed85b6917f6ca021.jpg	https://pbs.twimg.com/media/HE0CNAHbwAEusWV.jpg	https://pbs.twimg.com/media/HE0CNAHbwAEusWV.jpg	1740	1110		\N	2026-04-25 02:33:38.36+00
raNlLPVVucmH3wfv	official	image	https://r2.dan.tw/mvs/ultra-soul/22a8a944face851ee1f1dd6082b01cec.jpg	https://pbs.twimg.com/media/HE0CM__akAEruS5.jpg	https://pbs.twimg.com/media/HE0CM__akAEruS5.jpg	1740	1110		\N	2026-04-25 02:33:38.574+00
aS_bUIDw1Ke8bGfx	official	image	https://r2.dan.tw/mvs/ultra-soul/a422d6150366f23c713daa6b63ce252f.jpg	https://pbs.twimg.com/media/HE0CNAFbcAAXQpd.jpg	https://pbs.twimg.com/media/HE0CNAFbcAAXQpd.jpg	1740	1110		\N	2026-04-25 02:33:38.794+00
u2HRAJ08lZu-ByWm	official	image	https://r2.dan.tw/mvs/ultra-soul/fc01a0c11436d17a822d9e14948ee196.jpg	https://pbs.twimg.com/media/HE0CX8rbMAAljUX.jpg	https://pbs.twimg.com/media/HE0CX8rbMAAljUX.jpg	1740	1110		\N	2026-04-25 02:33:39.008+00
isHoP6cEjTwwPfgm	official	image	https://r2.dan.tw/mvs/ultra-soul/fbc01dd0e6c6d24b8d8b2eeb73425cc7.jpg	https://pbs.twimg.com/media/HE0CX8yaAAAHR7e.jpg	https://pbs.twimg.com/media/HE0CX8yaAAAHR7e.jpg	1740	1110		\N	2026-04-25 02:33:39.226+00
LAOWof655W2FHX6o	official	image	https://r2.dan.tw/mvs/ultra-soul/a6fe421dad15bf1c9abeebd568ec6719.jpg	https://pbs.twimg.com/media/HE0CX8ybYAA97Tb.jpg	https://pbs.twimg.com/media/HE0CX8ybYAA97Tb.jpg	1740	1110		\N	2026-04-25 02:33:39.441+00
xZ-BvdChtvtWJEHe	official	image	https://r2.dan.tw/mvs/ultra-soul/72bce849ca0d6e823b64948a3a0c2564.jpg	https://pbs.twimg.com/media/HE0CX8sbEAA_KjN.jpg	https://pbs.twimg.com/media/HE0CX8sbEAA_KjN.jpg	1740	1110		\N	2026-04-25 02:33:39.659+00
dRH5uFXrUsWLyujE	official	image	https://r2.dan.tw/mvs/ultra-soul/7fc6ef8575b43f3a23c2c625d73cfa4e.jpg	https://pbs.twimg.com/media/HE0ClVSbEAAVJ9e.jpg	https://pbs.twimg.com/media/HE0ClVSbEAAVJ9e.jpg	1740	1110		\N	2026-04-25 02:33:39.876+00
2a_8AvmJ0frecGBB	official	image	https://r2.dan.tw/mvs/ultra-soul/a4f51c5d62730fe84b199c40934405f3.jpg	https://pbs.twimg.com/media/HE0ClVPaQAEbJSM.jpg	https://pbs.twimg.com/media/HE0ClVPaQAEbJSM.jpg	1740	1110		\N	2026-04-25 02:33:40.095+00
KxQMlOqKSqV9Ej9w	official	image	https://r2.dan.tw/mvs/ultra-soul/2eeff3ed905f6751d93b2bbf9dc31010.jpg	https://pbs.twimg.com/media/HE0ClVRbgAAE9wo.jpg	https://pbs.twimg.com/media/HE0ClVRbgAAE9wo.jpg	1740	1110		\N	2026-04-25 02:33:40.309+00
sdRivsYt8GPWTHXf	official	image	https://r2.dan.tw/mvs/ultra-soul/20c79c2c5a905d7b1d5052b6455bee1a.jpg	https://pbs.twimg.com/media/HE0ClV7aIAAyATm.jpg	https://pbs.twimg.com/media/HE0ClV7aIAAyATm.jpg	1740	1110		\N	2026-04-25 02:33:40.534+00
PG__fPv9Z8yoElOj	official	image	https://r2.dan.tw/mvs/ultra-soul/1628405f26d6577a386ab90582312683.jpg	https://pbs.twimg.com/media/HE0Cw_bb0AEg1mf.jpg	https://pbs.twimg.com/media/HE0Cw_bb0AEg1mf.jpg	1740	1110		\N	2026-04-25 02:33:40.754+00
PKsAPr9CT3GWeNZf	official	image	https://r2.dan.tw/mvs/ultra-soul/32aefbbdd34a7c29da75e640f6cdc7b5.jpg	https://pbs.twimg.com/media/HE0Cw_Ub0AAdz1S.jpg	https://pbs.twimg.com/media/HE0Cw_Ub0AAdz1S.jpg	1740	1110		\N	2026-04-25 02:33:40.968+00
ZR9i1CaC4cUNXLSv	official	image	https://r2.dan.tw/mvs/ultra-soul/0f67552493880fe59dd7acf807744795.jpg	https://pbs.twimg.com/media/HE0Cw_JbEAAcSvk.jpg	https://pbs.twimg.com/media/HE0Cw_JbEAAcSvk.jpg	1740	1110		\N	2026-04-25 02:33:41.184+00
SBql_kOHyJsO4ycC	official	image	https://r2.dan.tw/mvs/ultra-soul/b549e76d33d9709777ec8c5be0fb6401.jpg	https://pbs.twimg.com/media/HE0Cw_La8AALz8Q.jpg	https://pbs.twimg.com/media/HE0Cw_La8AALz8Q.jpg	1740	1110		\N	2026-04-25 02:33:41.429+00
-f7Zil6-TdmP4bT3	official	image	https://r2.dan.tw/mvs/ultra-soul/0b82b195623d5294991d5dbee4ec2a41.jpg	https://pbs.twimg.com/media/HE0C9zPaMAAxvHc.jpg	https://pbs.twimg.com/media/HE0C9zPaMAAxvHc.jpg	1740	1110		\N	2026-04-25 02:33:41.647+00
Fc-6-J1ZRD-pHVN6	official	image	https://r2.dan.tw/mvs/ultra-soul/60ff48e38ed14ac2ac6f5a7da5d5e2c0.jpg	https://pbs.twimg.com/media/HE0C9zVbQAA61At.jpg	https://pbs.twimg.com/media/HE0C9zVbQAA61At.jpg	1740	1110		\N	2026-04-25 02:33:41.872+00
Ihgu-XFYgwO12tCd	official	image	https://r2.dan.tw/mvs/ultra-soul/36ad62a217da490d186b6fa80c287f22.jpg	https://pbs.twimg.com/media/HE0C90jaMAAjEOH.jpg	https://pbs.twimg.com/media/HE0C90jaMAAjEOH.jpg	1740	1110		\N	2026-04-25 02:33:42.092+00
HwVPdBjImB8wJkfl	official	image	https://r2.dan.tw/mvs/ultra-soul/5b13f73b48566f094bfafab434129a8d.jpg	https://pbs.twimg.com/media/HE0C9zMbQAAc14d.jpg	https://pbs.twimg.com/media/HE0C9zMbQAAc14d.jpg	1740	1110		\N	2026-04-25 02:33:42.314+00
fs8qp0pC_UJoYVF3	official	image	https://r2.dan.tw/mvs/ultra-soul/0a4c93e1f945c5ae453763f4a78fbf83.jpg	https://pbs.twimg.com/media/HE0DQcra4AE6kIi.jpg	https://pbs.twimg.com/media/HE0DQcra4AE6kIi.jpg	1740	1110		\N	2026-04-25 02:33:42.531+00
SwBf_TBFeYret3pc	official	image	https://r2.dan.tw/mvs/ultra-soul/ee0a838b04f2b2da9e8987778820a629.jpg	https://pbs.twimg.com/media/HE0DQcoagAAX_kD.jpg	https://pbs.twimg.com/media/HE0DQcoagAAX_kD.jpg	1740	1496		\N	2026-04-25 02:33:42.748+00
GbE9FVDnayJltSzW	official	image	https://r2.dan.tw/mvs/ultra-soul/d6cf75ce46f3aafa55f60a24a67124c3.jpg	https://pbs.twimg.com/media/HE0DQc0akAA8vTi.jpg	https://pbs.twimg.com/media/HE0DQc0akAA8vTi.jpg	1740	1496		\N	2026-04-25 02:33:42.963+00
GhA9qkaHAToYEnm3	official	image	https://r2.dan.tw/mvs/ultra-soul/dc18ec97133ed589cdcf60e25a4434f4.jpg	https://pbs.twimg.com/media/HE0DQc7aIAA3Xuc.jpg	https://pbs.twimg.com/media/HE0DQc7aIAA3Xuc.jpg	1740	1110		\N	2026-04-25 02:33:43.18+00
hop3LULyBf1GUYD6	official	image	https://r2.dan.tw/mvs/ultra-soul/158441659a6e72c2ee4a65a3f692517b.jpg	https://pbs.twimg.com/media/HE0DgKpa8AApkdG.jpg	https://pbs.twimg.com/media/HE0DgKpa8AApkdG.jpg	1440	810		\N	2026-04-25 02:33:43.396+00
40G4zF5tWGy7F9KO	official	image	https://r2.dan.tw/mvs/ultra-soul/1470b42ab894cbba3d599e3130b180d3.jpg	https://pbs.twimg.com/media/HE0DgKvaIAAPmFN.jpg	https://pbs.twimg.com/media/HE0DgKvaIAAPmFN.jpg	1440	810		\N	2026-04-25 02:33:43.62+00
2-K3bCogYhWDwVqZ	official	image	https://r2.dan.tw/mvs/ultra-soul/ca423e596625ed63aaf7900c79ef4d0c.jpg	https://pbs.twimg.com/media/HE0DgK7aEAASXRh.jpg	https://pbs.twimg.com/media/HE0DgK7aEAASXRh.jpg	1440	810		\N	2026-04-25 02:33:43.84+00
R8sVZ-92aUbvON7q	official	image	https://r2.dan.tw/mvs/ultra-soul/a2aabddd27fd69e40194efaa9e215a62.jpg	https://pbs.twimg.com/media/HE0DgKpbYAAxuMn.jpg	https://pbs.twimg.com/media/HE0DgKpbYAAxuMn.jpg	1440	810		\N	2026-04-25 02:33:44.087+00
HH7SgjtO34OKvHA4	official	image	https://r2.dan.tw/mvs/ultra-soul/790065ae1cbb59d3578929260f080ccd.jpg	https://pbs.twimg.com/media/HE0DqpKa0AAuuKh.jpg	https://pbs.twimg.com/media/HE0DqpKa0AAuuKh.jpg	1440	810		\N	2026-04-25 02:33:44.302+00
C5LvYh48TaydcEgw	official	image	https://r2.dan.tw/mvs/ultra-soul/36fd73185c4792c94dfebb7495dc2430.jpg	https://pbs.twimg.com/media/HE0DqpWbAAAMSbT.jpg	https://pbs.twimg.com/media/HE0DqpWbAAAMSbT.jpg	1440	810		\N	2026-04-25 02:33:44.514+00
KAYUvGQc1KSoKam_	official	image	https://r2.dan.tw/mvs/ultra-soul/4127cbd269a404433cb73710219f99e6.jpg	https://pbs.twimg.com/media/HFWpUOga8AEHmFH.jpg	https://pbs.twimg.com/media/HFWpUOga8AEHmFH.jpg	1254	1254		\N	2026-04-25 02:33:44.725+00
TyWImVgp0oLQNit4	fanart	image	https://r2.dan.tw/mvs/ultra-soul/21490bc9e5e58327a1cecbf0a1f7e7b2.jpg	https://pbs.twimg.com/media/HFsxvoVa0AAVQSX.jpg	https://pbs.twimg.com/media/HFsxvoVa0AAVQSX.jpg	\N	\N		TTP8tirhLv-2Pb0i	2026-04-25 02:33:44.943+00
6B6Kc3CTPK0JsJS7	fanart	image	https://r2.dan.tw/mvs/ultra-soul/406e88339f35eff2e71916cc73868cf4.jpg	https://pbs.twimg.com/media/HFESRvZaoAAw42s.jpg	https://pbs.twimg.com/media/HFESRvZaoAAw42s.jpg	\N	\N		8THSjco1HePx77dk	2026-04-25 02:33:45.311+00
XtOZTJ-MjB7yfaUR	fanart	image	https://r2.dan.tw/mvs/ultra-soul/66572bdd2ee86647aa8b1992cfeeb2d5.jpg	https://pbs.twimg.com/media/HE8gyeeaAAAQPRL.jpg	https://pbs.twimg.com/media/HE8gyeeaAAAQPRL.jpg	\N	\N		VhMszXJUoWTPvv7d	2026-04-25 02:33:45.681+00
PVDHs01rJ88lrTMp	fanart	image	https://r2.dan.tw/mvs/ultra-soul/88f01f97911c4d087f40009285794b3b.jpg	https://pbs.twimg.com/media/HE6D_TqaUAAeYHE.jpg	https://pbs.twimg.com/media/HE6D_TqaUAAeYHE.jpg	\N	\N		jVmJzIERd2pUCOsq	2026-04-25 02:33:46.061+00
2FbajTSE5CooMGDN	fanart	image	https://r2.dan.tw/mvs/ultra-soul/a44fd11ec61ced6de946810d1940a98b.jpg	https://pbs.twimg.com/media/HE5x7DNaAAAXhqg.jpg	https://pbs.twimg.com/media/HE5x7DNaAAAXhqg.jpg	\N	\N		nP8fj_LdWsHqobFN	2026-04-25 02:33:46.433+00
XFv_D_dNwLkzDzG1	fanart	image	https://r2.dan.tw/mvs/ultra-soul/89054ab223aafc0b5f13cc3165366318.jpg	https://pbs.twimg.com/media/HE4ofzKb0AAbdmu.jpg	https://pbs.twimg.com/media/HE4ofzKb0AAbdmu.jpg	\N	\N		cOk3nn7nI3VApk4Y	2026-04-25 02:33:46.803+00
Rjxza3getIbmDg86	cover	image	https://i.ytimg.com/vi/dcOwj-QE_ZE/maxresdefault.jpg	https://i.ytimg.com/vi/dcOwj-QE_ZE/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:49.623+00
hArjOnOsV4DL0jwF	cover	image	https://i.ytimg.com/vi/dcOwj-QE_ZE/maxres1.jpg	https://i.ytimg.com/vi/dcOwj-QE_ZE/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:49.786+00
snoC-incrJ1GUtOq	cover	image	https://i.ytimg.com/vi/dcOwj-QE_ZE/maxres2.jpg	https://i.ytimg.com/vi/dcOwj-QE_ZE/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:49.951+00
UmT6KeD5NzVahBKR	cover	image	https://i.ytimg.com/vi/dcOwj-QE_ZE/maxres3.jpg	https://i.ytimg.com/vi/dcOwj-QE_ZE/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:50.119+00
wRUA_IQ-zCXqKo7H	official	image	https://r2.dan.tw/mvs/darken/ca59c44d8bc8600e2929838abce59f13.jpg	https://pbs.twimg.com/media/Gds2-k_XwAA5Lto.jpg	https://pbs.twimg.com/media/Gds2-k_XwAA5Lto.jpg	744	1185		\N	2026-04-25 02:33:50.567+00
pAb0SRJVqZXHl8ja	official	image	https://r2.dan.tw/mvs/darken/281392dce24666cb4b4510c0dc4ce4a8.jpg	https://pbs.twimg.com/media/Gds2-kTaIAA-pl_.jpg	https://pbs.twimg.com/media/Gds2-kTaIAA-pl_.jpg	744	1185		\N	2026-04-25 02:33:50.803+00
WezVWNkhS6WZ8WI6	official	image	https://r2.dan.tw/mvs/darken/1234bb1810879fd18d9a16ba0bb4f444.jpg	https://pbs.twimg.com/media/GcLpuBxasAIvlYh.jpg	https://pbs.twimg.com/media/GcLpuBxasAIvlYh.jpg	744	1185		\N	2026-04-25 02:33:51.089+00
lRjTwSt4vjpxPXRi	official	image	https://r2.dan.tw/mvs/darken/83efd80002b8d62b604d253f97cf32c8.jpg	https://pbs.twimg.com/media/GcLpuBuasAESvFA.jpg	https://pbs.twimg.com/media/GcLpuBuasAESvFA.jpg	1185	744		\N	2026-04-25 02:33:51.309+00
IKFTf7_djKmx5aXX	official	image	https://r2.dan.tw/mvs/darken/1a235b1cf34f2d98977c89471135c417.jpg	https://pbs.twimg.com/media/Ex9i9DAU8AA-GCs.jpg	https://pbs.twimg.com/media/Ex9i9DAU8AA-GCs.jpg	2048	2048		\N	2026-04-25 02:33:51.525+00
Jz4XpkwDaoUVnnEp	official	image	https://r2.dan.tw/mvs/darken/24c70e87877907ce0943957b5d11312f.jpg	https://pbs.twimg.com/media/Ex9i9DBVcAEPYef.jpg	https://pbs.twimg.com/media/Ex9i9DBVcAEPYef.jpg	2048	2048		\N	2026-04-25 02:33:51.75+00
YfBkt-COAEreYo1n	official	image	https://r2.dan.tw/mvs/darken/80dc86430825e7544bb0d5631728dc75.jpg	https://pbs.twimg.com/media/Ex9i9C-UUAggk11.jpg	https://pbs.twimg.com/media/Ex9i9C-UUAggk11.jpg	1640	1640		\N	2026-04-25 02:33:51.968+00
3kfFdQaIKEc9KPNS	official	image	https://r2.dan.tw/mvs/darken/cdb1bb5ce66f0e47a68adba550cafba6.jpg	https://pbs.twimg.com/media/Ex9i9C-VcAoZrUD.jpg	https://pbs.twimg.com/media/Ex9i9C-VcAoZrUD.jpg	1564	1564		\N	2026-04-25 02:33:52.185+00
aJ2vXHmdQXSofXvu	official	image	https://r2.dan.tw/mvs/darken/9a4c72b55a1167abbfcc1f8fefc752f1.jpg	https://pbs.twimg.com/media/EsQNKsrUwAI0UDo.jpg	https://pbs.twimg.com/media/EsQNKsrUwAI0UDo.jpg	2048	1448		\N	2026-04-25 02:33:52.43+00
S9Hc0TThpGHs1vh8	official	image	https://r2.dan.tw/mvs/darken/5de6e667768bc658e8ebe29727edd452.jpg	https://pbs.twimg.com/media/EsQNKstVgAAYtBT.jpg	https://pbs.twimg.com/media/EsQNKstVgAAYtBT.jpg	2048	1448		\N	2026-04-25 02:33:52.646+00
NI-zaZFD0njuV1cW	official	image	https://r2.dan.tw/mvs/darken/17c00dc02ca9425621a04e731cd83575.jpg	https://pbs.twimg.com/media/EsQNKutUwAExK9w.jpg	https://pbs.twimg.com/media/EsQNKutUwAExK9w.jpg	2048	1448		\N	2026-04-25 02:33:52.864+00
Gy08X3xtzuOzblFh	official	image	https://r2.dan.tw/mvs/darken/eb1ef73078b62953db5a2dac60817a50.jpg	https://pbs.twimg.com/media/EsQNKvAVcAEo7d_.jpg	https://pbs.twimg.com/media/EsQNKvAVcAEo7d_.jpg	2048	1448		\N	2026-04-25 02:33:53.084+00
VpCUWfBg9Axlv-Cg	official	image	https://r2.dan.tw/mvs/darken/7777e5355052b4e882506e398d1cb808.jpg	https://pbs.twimg.com/media/EsOKYVbVcAAC1C8.jpg	https://pbs.twimg.com/media/EsOKYVbVcAAC1C8.jpg	2048	1448		\N	2026-04-25 02:33:53.303+00
kvPzF51yNC6vgDnQ	official	image	https://r2.dan.tw/mvs/darken/1a3a8290005e4e52567b5a928d09243e.jpg	https://pbs.twimg.com/media/EsOKYVaVgAECNWY.jpg	https://pbs.twimg.com/media/EsOKYVaVgAECNWY.jpg	2048	1448		\N	2026-04-25 02:33:53.519+00
J75L12R2vwPOItwL	official	image	https://r2.dan.tw/mvs/darken/8f2b2b9250dade5bca092da92a897f7b.jpg	https://pbs.twimg.com/media/EsOKYXOU0AA3BDE.jpg	https://pbs.twimg.com/media/EsOKYXOU0AA3BDE.jpg	2048	1448		\N	2026-04-25 02:33:53.739+00
GelVwGax-Q7KR7FA	official	image	https://r2.dan.tw/mvs/darken/b501bfab42c043a5d5b7f72f638528e6.jpg	https://pbs.twimg.com/media/EsOKYafVEAEFV48.jpg	https://pbs.twimg.com/media/EsOKYafVEAEFV48.jpg	2048	1448		\N	2026-04-25 02:33:53.956+00
jE-UaHrxIVgKl4BI	official	image	https://r2.dan.tw/mvs/darken/9bfa4be04a0708ce9a2d23c489965ad9.jpg	https://pbs.twimg.com/media/ErxLPsxU0AEacIV?format=jpg&name=large	\N	2048	1448		\N	2026-04-25 02:33:54.173+00
8WP8bVmpkQwxGu98	cover	image	https://i.ytimg.com/vi/PLG2Uexyi9s/maxresdefault.jpg	https://i.ytimg.com/vi/PLG2Uexyi9s/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:56.866+00
W8BrSWtJOTRBCsmm	cover	image	https://i.ytimg.com/vi/PLG2Uexyi9s/maxres1.jpg	https://i.ytimg.com/vi/PLG2Uexyi9s/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:57.021+00
vANwbG-Xky-B7_1k	cover	image	https://i.ytimg.com/vi/PLG2Uexyi9s/maxres2.jpg	https://i.ytimg.com/vi/PLG2Uexyi9s/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:57.176+00
1VyH72wnAPqIGD5_	cover	image	https://i.ytimg.com/vi/PLG2Uexyi9s/maxres3.jpg	https://i.ytimg.com/vi/PLG2Uexyi9s/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:33:57.331+00
6EhX5ip_lIyOZC19	official	image	https://r2.dan.tw/mvs/hippocampal-pain/fc39949d78381a77fbefc9d2d3dd680f.jpg	https://pbs.twimg.com/media/HBW626MWQAAPnYg.jpg	https://pbs.twimg.com/media/HBW626MWQAAPnYg.jpg	815	1110	卡牌	\N	2026-04-25 02:33:57.55+00
4HhCCJ_JI9bpnfVg	official	image	https://r2.dan.tw/mvs/hippocampal-pain/7f22965bd90634c6d0372adaa89c8465.png	https://pbs.twimg.com/media/GzsF-LhWIAEqKcr.png	https://pbs.twimg.com/media/GzsF-LhWIAEqKcr.png	937	951		\N	2026-04-25 02:33:57.764+00
uyJAgSoTOypd2_EJ	official	image	https://r2.dan.tw/mvs/hippocampal-pain/c9afa25f120e45ecb7357eb3412f9d6c.png	https://pbs.twimg.com/media/GxrFA4CWgAE7TvA.png	https://pbs.twimg.com/media/GxrFA4CWgAE7TvA.png	359	595	1千萬	\N	2026-04-25 02:33:58.205+00
FYKyeV-YhXPCj_da	official	image	https://r2.dan.tw/mvs/hippocampal-pain/72a1b701686600a3cf5c3a651f695297.jpg	https://pbs.twimg.com/media/GWEGOfnWYAAsN0S?format=jpg&name=large	\N	1593	1126		\N	2026-04-25 02:33:58.423+00
fhOeJh7wcSe0vteu	official	image	https://r2.dan.tw/mvs/hippocampal-pain/fb88c72d3335ef211bc487b0f16d174f.jpg	https://pbs.twimg.com/media/GWEGOe_boAAUEsR?format=jpg&name=large	\N	1593	1126		\N	2026-04-25 02:33:58.64+00
u9KypGKsXF3hU_4n	official	image	https://r2.dan.tw/mvs/hippocampal-pain/557687c8a53f6742ed4fbd1eb209799d.jpg	https://pbs.twimg.com/media/GWPNrVPWgAE6tCm?format=jpg&name=large	\N	1593	1126		\N	2026-04-25 02:33:58.853+00
uJPda_gDbr5_uEPc	official	image	https://r2.dan.tw/mvs/hippocampal-pain/2826639aa70ba555ccaa82e8e1533185.jpg	https://pbs.twimg.com/media/GWEGOfCbkAE6lNi?format=jpg&name=large	\N	1593	1126		\N	2026-04-25 02:33:59.069+00
Wk67pPkQNPMtSV9R	official	image	https://r2.dan.tw/mvs/hippocampal-pain/a1b5fd4a59990b5080bb0c9ebe37fe74.jpg	https://pbs.twimg.com/media/GWJlFYUXIAARV8P.jpg	https://pbs.twimg.com/media/GWJlFYUXIAARV8P.jpg	1446	2048	海報	\N	2026-04-25 02:33:59.714+00
fzWAVKTpXhzcwaC0	fanart	image	https://r2.dan.tw/mvs/hippocampal-pain/9989045c103e1cf220d422f2ff16eef8.jpg	https://pbs.twimg.com/media/HFso3JnaMAApL3a.jpg	https://pbs.twimg.com/media/HFso3JnaMAApL3a.jpg	\N	\N		epVMkj7_OybUsNR2	2026-04-25 02:34:00.159+00
VnB6QTrX5om0rU1g	cover	image	https://i.ytimg.com/vi/BVvvUGP0MFw/maxresdefault.jpg	https://i.ytimg.com/vi/BVvvUGP0MFw/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:02.273+00
VKiwZgnwCNwobN0_	cover	image	https://i.ytimg.com/vi/BVvvUGP0MFw/maxres1.jpg	https://i.ytimg.com/vi/BVvvUGP0MFw/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:02.432+00
TIhakPCNHfCds9W0	cover	image	https://i.ytimg.com/vi/BVvvUGP0MFw/maxres2.jpg	https://i.ytimg.com/vi/BVvvUGP0MFw/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:02.587+00
O6rspnjgYqSa9xQF	cover	image	https://i.ytimg.com/vi/BVvvUGP0MFw/maxres3.jpg	https://i.ytimg.com/vi/BVvvUGP0MFw/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:02.741+00
HBSM1XiG5yVrtTYR	official	image	https://r2.dan.tw/mvs/mirror-tune/983f857d56f2cb237aa9b377c1b0e066.jpg	https://pbs.twimg.com/media/HE2krOxWgAALcbE.jpg	https://pbs.twimg.com/media/HE2krOxWgAALcbE.jpg	1748	1832	4周年	\N	2026-04-25 02:34:02.961+00
XRyKUUf2uNQ5QI4O	official	image	https://r2.dan.tw/mvs/mirror-tune/c03523456b8c92720b4499b80d4b7294.jpg	https://pbs.twimg.com/media/Gn8FYEHWMAAj37f.jpg	https://pbs.twimg.com/media/Gn8FYEHWMAAj37f.jpg	1952	2048	3	\N	2026-04-25 02:34:03.178+00
8R99YX00KADlpCPW	official	image	https://r2.dan.tw/mvs/mirror-tune/afaa58886e540f9bd9983a5364832829.jpg	https://pbs.twimg.com/media/GmWPLbgWMAIjnuJ.jpg	https://pbs.twimg.com/media/GmWPLbgWMAIjnuJ.jpg	1433	1498		\N	2026-04-25 02:34:03.394+00
SnHFqJhqeFZVgR4f	official	image	https://r2.dan.tw/mvs/mirror-tune/b1b0f4ce69c936a67bd44af96f17013f.jpg	https://pbs.twimg.com/media/GKj_40aXQAEofrc.jpg	https://pbs.twimg.com/media/GKj_40aXQAEofrc.jpg	1003	1500	2周年	\N	2026-04-25 02:34:03.637+00
Oy2_MVIgZ2lz_O2H	official	image	https://r2.dan.tw/mvs/mirror-tune/cbd2d240a25a79fdfd808e462858b345.jpg	https://pbs.twimg.com/media/Fxx5rhaWwAA1UQu.jpg	https://pbs.twimg.com/media/Fxx5rhaWwAA1UQu.jpg	1546	2048		\N	2026-04-25 02:34:04.082+00
ygEcwwXlvrHsyzvR	official	image	https://r2.dan.tw/mvs/mirror-tune/e0aeccb5c136866ca988186fdbfcb781.jpg	https://pbs.twimg.com/media/FxsMLp6WwAI_nvo.jpg	https://pbs.twimg.com/media/FxsMLp6WwAI_nvo.jpg	1087	1480		\N	2026-04-25 02:34:04.297+00
VNXTFecQyDzeQ0wZ	official	image	https://r2.dan.tw/mvs/mirror-tune/694209aab65274f15035b47ac8424191.jpg	https://pbs.twimg.com/media/FtEhyCiXsAA_a91.jpg	https://pbs.twimg.com/media/FtEhyCiXsAA_a91.jpg	1158	2000		\N	2026-04-25 02:34:04.518+00
1Lnp6LM1hBBewF_A	official	image	https://r2.dan.tw/mvs/mirror-tune/ea1f2e1edf274cfd61f5d001fa3a7616.jpg	https://pbs.twimg.com/media/FPvPgmFXsAYxfEE.jpg	https://pbs.twimg.com/media/FPvPgmFXsAYxfEE.jpg	1447	2048		\N	2026-04-25 02:34:05.406+00
xBeU-uaUmy2rDmDu	official	image	https://r2.dan.tw/mvs/mirror-tune/47e554f06139cc667258d9e804d815cd.jpg	https://pbs.twimg.com/media/FPqmKAKX0AAcjzf.jpg	https://pbs.twimg.com/media/FPqmKAKX0AAcjzf.jpg	1408	1963		\N	2026-04-25 02:34:05.626+00
noxulWur3ZSbELOR	official	image	https://r2.dan.tw/mvs/mirror-tune/d44320aed0ecdbcf195f4b3a6b63ac5b.jpg	https://pbs.twimg.com/media/FPlf3oZX0Accn7c.jpg	https://pbs.twimg.com/media/FPlf3oZX0Accn7c.jpg	1313	1897		\N	2026-04-25 02:34:05.842+00
FcPv3zhIQQR9eU14	official	image	https://r2.dan.tw/mvs/mirror-tune/be2908f8f833c7101be13365804b6e28.jpg	https://pbs.twimg.com/media/FPhEd2aXoAcf8G9.jpg	https://pbs.twimg.com/media/FPhEd2aXoAcf8G9.jpg	1396	1872		\N	2026-04-25 02:34:06.056+00
wwDiF3tUWfP5zZ7H	official	image	https://r2.dan.tw/mvs/mirror-tune/0eff8b68f8de18c21813875d8989a5d3.jpg	https://pbs.twimg.com/media/FPk_YxrVQAQl8j-?format=jpg&name=large	\N	2048	1448		\N	2026-04-25 02:34:06.273+00
jyQ0kBrzVbUfoLkv	official	image	https://r2.dan.tw/mvs/mirror-tune/ed9491f390de709ddac75cc70ad7147f.jpg	https://pbs.twimg.com/media/FPp7YEnVcAQ7JCw?format=jpg&name=large	\N	2048	1448		\N	2026-04-25 02:34:06.491+00
sjJ8zobDZalHZF-c	official	image	https://r2.dan.tw/mvs/mirror-tune/9c3ca252cbc92f509f3bc822f2779ee6.jpg	https://pbs.twimg.com/media/FPtfU3NVcAQelb7?format=jpg&name=large	\N	2048	1448		\N	2026-04-25 02:34:06.709+00
FwaKUybuDI-cmlAN	fanart	image	https://r2.dan.tw/mvs/mirror-tune/ad4edf0a3c82b0a4e00092c3c6ceddb3.jpg	https://pbs.twimg.com/media/HFg8Z2CaQAA_Cjj.jpg	https://pbs.twimg.com/media/HFg8Z2CaQAA_Cjj.jpg	\N	\N		m61rubOHLQud3n49	2026-04-25 02:34:06.932+00
5N1voYVA6KG_pCzW	fanart	image	https://r2.dan.tw/mvs/mirror-tune/0513f017fc4238bb9b487ff0df529907.jpg	https://pbs.twimg.com/media/HFOzbBgbMAAHQk_.jpg	https://pbs.twimg.com/media/HFOzbBgbMAAHQk_.jpg	\N	\N		2N1Wdj-5yjLkl6gs	2026-04-25 02:34:07.322+00
717JOWN3uXa6rHEg	cover	image	https://i.ytimg.com/vi/YgmFIVOR1-I/maxresdefault.jpg	https://i.ytimg.com/vi/YgmFIVOR1-I/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:10.027+00
VqMb8BxzZX7dwd2J	cover	image	https://i.ytimg.com/vi/YgmFIVOR1-I/maxres1.jpg	https://i.ytimg.com/vi/YgmFIVOR1-I/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:10.185+00
d1EkvrH3J9n_51NZ	cover	image	https://i.ytimg.com/vi/YgmFIVOR1-I/maxres2.jpg	https://i.ytimg.com/vi/YgmFIVOR1-I/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:10.34+00
5PIf-VM1BixCIENm	cover	image	https://i.ytimg.com/vi/YgmFIVOR1-I/maxres3.jpg	https://i.ytimg.com/vi/YgmFIVOR1-I/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:10.494+00
3r9JhEbEPrdMGhVp	official	image	https://r2.dan.tw/mvs/stay-foolish/338343aee069a1df1d02439afe334f1a.jpg	https://pbs.twimg.com/media/E5C9CsqVUAc8WSQ?format=jpg&name=large	\N	2048	1448		\N	2026-04-25 02:34:10.712+00
HKFcf39KvXwGT4xn	official	image	https://r2.dan.tw/mvs/stay-foolish/8876c151d6ce74be3ac770f957bbbc5e.jpg	https://pbs.twimg.com/media/E5aywrQVoAYVu7j?format=jpg&name=large	\N	2048	1448		\N	2026-04-25 02:34:10.929+00
ENIqgjPR9-wiJBp2	official	image	https://r2.dan.tw/mvs/stay-foolish/35cbed42f2956ff71f338e7703c6f4e1.jpg	https://pbs.twimg.com/media/GuzGjjBWEAARZYL.jpg	https://pbs.twimg.com/media/GuzGjjBWEAARZYL.jpg	1544	2048	4	\N	2026-04-25 02:34:11.145+00
G8z3ivYPZWgtjxcj	official	image	https://r2.dan.tw/mvs/stay-foolish/29bfab9ce0bbf60b1fa3eecfd306ea51.jpg	https://pbs.twimg.com/media/GRpcClHXUAAL1og.jpg	https://pbs.twimg.com/media/GRpcClHXUAAL1og.jpg	936	1732	3周年	\N	2026-04-25 02:34:11.36+00
rlo3Td0F2FJmVugL	official	image	https://r2.dan.tw/mvs/stay-foolish/a9b24df7e8efc3fed3c08c334b921e1e.jpg	https://pbs.twimg.com/media/F0JPnNXWwAMtY3S.jpg	https://pbs.twimg.com/media/F0JPnNXWwAMtY3S.jpg	1253	2048		\N	2026-04-25 02:34:11.576+00
CJpFxHarnPCqu2xI	official	image	https://r2.dan.tw/mvs/stay-foolish/b4bda39d992b38cff7ccc39c299b2189.jpg	https://pbs.twimg.com/media/Fxx5riwXoAEacus.jpg	https://pbs.twimg.com/media/Fxx5riwXoAEacus.jpg	1332	1544	5周年	\N	2026-04-25 02:34:11.797+00
nzGGt4jdV0mc1aXU	official	image	https://r2.dan.tw/mvs/stay-foolish/70df6c87cd892832684e4f5cfa3ffa3e.jpg	https://pbs.twimg.com/media/FsPVSQpX0AEq94A.jpg	https://pbs.twimg.com/media/FsPVSQpX0AEq94A.jpg	1477	2000		\N	2026-04-25 02:34:12.016+00
3K5xc5KEi-NAinR8	official	image	https://r2.dan.tw/mvs/stay-foolish/9c56baa82c808aa442931d0cc2f1e115.jpg	https://pbs.twimg.com/media/FWwH_59WQAAyyXG.jpg	https://pbs.twimg.com/media/FWwH_59WQAAyyXG.jpg	1447	2048		\N	2026-04-25 02:34:12.233+00
pcznGIbZqLzawR1B	official	image	https://r2.dan.tw/mvs/stay-foolish/cd39d82eee97c5642868887e2b81259c.jpg	https://pbs.twimg.com/media/E_1ZXi4UYAcKYJa.jpg	https://pbs.twimg.com/media/E_1ZXi4UYAcKYJa.jpg	1382	1000	500	\N	2026-04-25 02:34:12.451+00
Q2vG9IoVja-IuzUl	official	image	https://r2.dan.tw/mvs/stay-foolish/195fd4d50ac9bb410ab3d85e8895294f.png	https://pbs.twimg.com/media/E9PS4bBXsAE5cP2.png	https://pbs.twimg.com/media/E9PS4bBXsAE5cP2.png	831	800		\N	2026-04-25 02:34:12.668+00
srdYH0p0InDRSju0	cover	image	https://i.ytimg.com/vi/H88kps8X4Mk/maxresdefault.jpg	https://i.ytimg.com/vi/H88kps8X4Mk/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:14.316+00
h7ZPQlvhRaVwpVts	cover	image	https://i.ytimg.com/vi/H88kps8X4Mk/maxres1.jpg	https://i.ytimg.com/vi/H88kps8X4Mk/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:14.468+00
RTliKQF8lnXpgk6y	cover	image	https://i.ytimg.com/vi/H88kps8X4Mk/maxres2.jpg	https://i.ytimg.com/vi/H88kps8X4Mk/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:14.623+00
EJ60TqbM3KawI4Jv	cover	image	https://i.ytimg.com/vi/H88kps8X4Mk/maxres3.jpg	https://i.ytimg.com/vi/H88kps8X4Mk/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:14.803+00
EqMlJBEe-bOPFYGS	official	image	https://r2.dan.tw/mvs/hanaichi-monnme/4c6b55cde8104c959871af78d27d6b2d.jpg	https://pbs.twimg.com/media/FyBHQ9ragAEyQdn?format=jpg&name=large	\N	1375	1193		\N	2026-04-25 02:34:15.014+00
XpI4MD75NiJ-NL5y	official	image	https://r2.dan.tw/mvs/hanaichi-monnme/365f6bc4015d629641c5020ac1cac67e.jpg	https://pbs.twimg.com/media/Fyd8TvwaAAEgV1p?format=jpg&name=large	\N	1220	1342		\N	2026-04-25 02:34:15.241+00
IasfXCTfklORL4Qr	official	image	https://r2.dan.tw/mvs/hanaichi-monnme/6da3740974935ae408232223d7a74c14.jpg	https://pbs.twimg.com/media/Fyd8TvqakAIgVqK?format=jpg&name=large	\N	1014	1354		\N	2026-04-25 02:34:15.461+00
lEqio9uM3UrMD0oC	official	image	https://r2.dan.tw/mvs/hanaichi-monnme/8a0877ac81f0298a9bdb9b95314bc365.jpg	https://pbs.twimg.com/media/Gsmxst7aAAAMgth?format=jpg&name=large	\N	1047	1549	2周年	\N	2026-04-25 02:34:15.675+00
4JWgT_6Z7F__x27u	official	image	https://r2.dan.tw/mvs/hanaichi-monnme/b186fcf558287aaa838a813f41eb2b0d.jpg	https://pbs.twimg.com/media/HD7e9WCbwAAI19W?format=jpg&name=large	\N	1458	2048	圖	\N	2026-04-25 02:34:15.895+00
P_G6aKzqfnRST2Vj	cover	image	https://i.ytimg.com/vi/258qUAI7rck/maxresdefault.jpg	https://i.ytimg.com/vi/258qUAI7rck/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:18.347+00
p0WOreGln9plsvaF	cover	image	https://i.ytimg.com/vi/258qUAI7rck/maxres1.jpg	https://i.ytimg.com/vi/258qUAI7rck/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:18.503+00
0B3mCiBaxYBHhC2F	cover	image	https://i.ytimg.com/vi/258qUAI7rck/maxres2.jpg	https://i.ytimg.com/vi/258qUAI7rck/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:18.664+00
bUlYi84zJv5F4eLu	cover	image	https://i.ytimg.com/vi/258qUAI7rck/maxres3.jpg	https://i.ytimg.com/vi/258qUAI7rck/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:18.824+00
2ntznqRSa0RwxnRV	official	image	https://r2.dan.tw/mvs/cant-be-right/429a18f622848fb7f1b5513406fdde5f.jpg	https://pbs.twimg.com/media/EpQP3FbVgAcp95B?format=jpg&name=large	\N	1408	792		\N	2026-04-25 02:34:19.043+00
B98QvW42devHEMAw	official	image	https://r2.dan.tw/mvs/cant-be-right/fac60bce02565ee1dfc2c9b0a7905365.jpg	https://pbs.twimg.com/media/EpQP3FZU0AEmZjf?format=jpg&name=large	\N	1408	792		\N	2026-04-25 02:34:19.269+00
EwZebiE-k6vjQCjF	official	image	https://r2.dan.tw/mvs/cant-be-right/f7a4d3bd572f58a6c2a8c316a86cc11b.jpg	https://pbs.twimg.com/media/EpQP3FdVoAAPoI0?format=jpg&name=large	\N	1408	792		\N	2026-04-25 02:34:19.492+00
htoJOnIqtuDbtQ9a	cover	image	https://i.ytimg.com/vi/ut889MZ9yNo/maxresdefault.jpg	https://i.ytimg.com/vi/ut889MZ9yNo/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:21.564+00
Y8akJerXOP2idnCM	cover	image	https://i.ytimg.com/vi/ut889MZ9yNo/maxres1.jpg	https://i.ytimg.com/vi/ut889MZ9yNo/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:21.723+00
QlaDxHFhIPEkygnK	cover	image	https://i.ytimg.com/vi/ut889MZ9yNo/maxres2.jpg	https://i.ytimg.com/vi/ut889MZ9yNo/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:21.878+00
xljGbWcRaXXA5N0m	cover	image	https://i.ytimg.com/vi/ut889MZ9yNo/maxres3.jpg	https://i.ytimg.com/vi/ut889MZ9yNo/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:22.035+00
98iyjGoxqe81GBpT	official	image	https://r2.dan.tw/mvs/kuzuri/2204cae3cf833ee659f284c8533b468d.jpg	https://pbs.twimg.com/media/GaaPthSaIAEFjK3?format=jpg&name=large	\N	2048	1044		\N	2026-04-25 02:34:22.25+00
FTVSFsao2y7qeQtF	official	image	https://r2.dan.tw/mvs/kuzuri/a0018b54424e52670bb86c43774e7f91.jpg	https://pbs.twimg.com/media/Gaj_oO0bYAAwrFc?format=jpg&name=large	\N	2048	1044		\N	2026-04-25 02:34:22.465+00
x8QY1nkHGwo-1-HU	official	image	https://r2.dan.tw/mvs/kuzuri/9225bcbeae250d29a2c2c20aed956713.jpg	https://pbs.twimg.com/media/Gaj_oO0bAAANfZC?format=jpg&name=large	\N	2048	1044		\N	2026-04-25 02:34:22.677+00
t-CdEhylonLAIhxN	official	image	https://r2.dan.tw/mvs/kuzuri/0b3cba9ed25a65cc46082042f31248fe.jpg	https://pbs.twimg.com/media/GbscHzzbsAAWoMw.jpg	https://pbs.twimg.com/media/GbscHzzbsAAWoMw.jpg	1920	1080	300萬	\N	2026-04-25 02:34:22.892+00
755PcmODAf496Wl1	official	image	https://r2.dan.tw/mvs/kuzuri/2b2f1dca2a716927903a7111d60943f6.jpg	https://pbs.twimg.com/media/GbscKr2a8AA8_Yk.jpg	https://pbs.twimg.com/media/GbscKr2a8AA8_Yk.jpg	1920	1080		\N	2026-04-25 02:34:23.114+00
uaMB5DujtF6_PRB1	official	image	https://r2.dan.tw/mvs/kuzuri/c59123eb9f8545d8aec0a2137241a33a.jpg	https://pbs.twimg.com/media/GbscMkebYAAsw7q.jpg	https://pbs.twimg.com/media/GbscMkebYAAsw7q.jpg	1920	1080		\N	2026-04-25 02:34:23.338+00
HP4bbdQCCGj6jZxe	official	image	https://r2.dan.tw/mvs/kuzuri/497ff5c1681eb0c1bfc3a0c11cc9fa6a.jpg	https://pbs.twimg.com/media/GbscPtaaYAAOr2W.jpg	https://pbs.twimg.com/media/GbscPtaaYAAOr2W.jpg	1920	1080		\N	2026-04-25 02:34:23.562+00
AQ1u4kF0Dffr5l6I	official	image	https://r2.dan.tw/mvs/kuzuri/14dabe6a6d512b915166c64dbda5419f.jpg	https://pbs.twimg.com/media/Gap-n9NasAATnaX.jpg	https://pbs.twimg.com/media/Gap-n9NasAATnaX.jpg	1000	607	背景	\N	2026-04-25 02:34:23.779+00
e8My9PnuSrXyKrSm	official	image	https://r2.dan.tw/mvs/kuzuri/e7fa365c061d318aac23037e8f2fc3ba.jpg	https://pbs.twimg.com/media/Gap-qK-aEAATwjC.jpg	https://pbs.twimg.com/media/Gap-qK-aEAATwjC.jpg	1000	591		\N	2026-04-25 02:34:24+00
hPa337eWg6BOA5oU	official	image	https://r2.dan.tw/mvs/kuzuri/f7d823dac3133abbaf47ebe37321105f.jpg	https://pbs.twimg.com/media/Gap-qLRbMAA7tQk.jpg	https://pbs.twimg.com/media/Gap-qLRbMAA7tQk.jpg	1000	625		\N	2026-04-25 02:34:24.224+00
NnCoR7WgqdSWEebQ	official	image	https://r2.dan.tw/mvs/kuzuri/74723b2a82502e888fa5b2ccbcbfd112.jpg	https://pbs.twimg.com/media/Gap-qLRaoAAlj-8.jpg	https://pbs.twimg.com/media/Gap-qLRaoAAlj-8.jpg	1000	746		\N	2026-04-25 02:34:24.442+00
wmOQElw-dKVC6Qbo	official	image	https://r2.dan.tw/mvs/kuzuri/f0ccf200535cd110dacaec15b8b9e3df.jpg	https://pbs.twimg.com/media/Gak-IxFaIAAvW3P.jpg	https://pbs.twimg.com/media/Gak-IxFaIAAvW3P.jpg	1200	1500		\N	2026-04-25 02:34:24.657+00
WyQZZ5EnabfB85xc	official	image	https://r2.dan.tw/mvs/kuzuri/e5a9b9ae780e9d27ead4387bd0d048ef.jpg	https://pbs.twimg.com/media/GakflOAaYAAOsp1.jpg	https://pbs.twimg.com/media/GakflOAaYAAOsp1.jpg	1660	2048		\N	2026-04-25 02:34:24.881+00
LhRafkm_CogY6krL	cover	image	https://i.ytimg.com/vi/GJI4Gv7NbmE/maxresdefault.jpg	https://i.ytimg.com/vi/GJI4Gv7NbmE/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:27.245+00
VxWR-h_XpYDP-IkF	cover	image	https://i.ytimg.com/vi/GJI4Gv7NbmE/maxres1.jpg	https://i.ytimg.com/vi/GJI4Gv7NbmE/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:27.398+00
Va05B_qfHpP6MAL2	cover	image	https://i.ytimg.com/vi/GJI4Gv7NbmE/maxres2.jpg	https://i.ytimg.com/vi/GJI4Gv7NbmE/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:27.561+00
2hg1uRynTpd52J-w	cover	image	https://i.ytimg.com/vi/GJI4Gv7NbmE/maxres3.jpg	https://i.ytimg.com/vi/GJI4Gv7NbmE/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:27.714+00
BPGGsGInrHYjFcHu	official	image	https://r2.dan.tw/mvs/byoushinwo-kamu/f671e97f413a1c899a6c67be89593452.jpg	https://pbs.twimg.com/media/GZmsA1FbEAAumnu.jpg	https://pbs.twimg.com/media/GZmsA1FbEAAumnu.jpg	1449	2048		\N	2026-04-25 02:34:27.938+00
fbRtyQ4qyQ55UXvk	official	image	https://r2.dan.tw/mvs/byoushinwo-kamu/5ffe4521c0b8160b7be564fa5e80f5aa.png	https://pbs.twimg.com/media/GZM9xkTa0AA7Fuk.png	https://pbs.twimg.com/media/GZM9xkTa0AA7Fuk.png	700	978		\N	2026-04-25 02:34:28.155+00
47aSrur_E7DDrL_b	official	image	https://r2.dan.tw/mvs/byoushinwo-kamu/b9b8f73b6091c4bc2f28bbc7cb25a570.png	https://pbs.twimg.com/media/GZM9xkVaUAA0ToG.png	https://pbs.twimg.com/media/GZM9xkVaUAA0ToG.png	700	978		\N	2026-04-25 02:34:28.382+00
l6Jy0tMWEgKTezII	cover	image	https://i.ytimg.com/vi/I88PrE-KUPk/maxresdefault.jpg	https://i.ytimg.com/vi/I88PrE-KUPk/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:29.958+00
tT3_MG45__KC-UhQ	cover	image	https://i.ytimg.com/vi/I88PrE-KUPk/maxres1.jpg	https://i.ytimg.com/vi/I88PrE-KUPk/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:30.115+00
gKirulDDIwAIjioO	cover	image	https://i.ytimg.com/vi/I88PrE-KUPk/maxres2.jpg	https://i.ytimg.com/vi/I88PrE-KUPk/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:30.278+00
LhOBaO7ofbOEExtT	cover	image	https://i.ytimg.com/vi/I88PrE-KUPk/maxres3.jpg	https://i.ytimg.com/vi/I88PrE-KUPk/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:30.439+00
8KAtgV6zx1a9fHTJ	official	image	https://r2.dan.tw/mvs/milabo/7734a53e03acca3df05c1ac6a913f691.jpg	https://pbs.twimg.com/media/Ecj0hvWU8A8VZ1J?format=jpg&name=large	\N	1280	1280		\N	2026-04-25 02:34:30.662+00
rJWslclrvIdH4Rxx	official	image	https://r2.dan.tw/mvs/milabo/ff0c887eccec54b30a91fbbc86398474.jpg	https://pbs.twimg.com/media/Ecj0hvmUwAU7fOq?format=jpg&name=large	\N	1920	1920		\N	2026-04-25 02:34:30.877+00
ZJ6hmiXUwm8W0J_c	official	image	https://r2.dan.tw/mvs/milabo/56e5b2eda6009ed59e7146c1fa4abd64.jpg	https://pbs.twimg.com/media/GZ7P5Zjb0AINuqs.jpg	https://pbs.twimg.com/media/GZ7P5Zjb0AINuqs.jpg	1017	1500	3000萬	\N	2026-04-25 02:34:31.099+00
-CRYfpn0a-d2Ui4c	official	image	https://r2.dan.tw/mvs/milabo/f9a3aecf30507bc45d3d9340c9efb188.jpg	https://pbs.twimg.com/media/GZmsDWSbIAA7IMZ.jpg	https://pbs.twimg.com/media/GZmsDWSbIAA7IMZ.jpg	1449	2048		\N	2026-04-25 02:34:31.324+00
QRyurvYpMf7IEQpr	official	image	https://r2.dan.tw/mvs/milabo/166a55b024f7035532886c784bd2c209.jpg	https://pbs.twimg.com/media/GSWx3KRW0AAT_j7.jpg	https://pbs.twimg.com/media/GSWx3KRW0AAT_j7.jpg	1139	2000		\N	2026-04-25 02:34:31.541+00
C531LwXms4kkhbjq	cover	image	https://i.ytimg.com/vi/IeyCdm9WwXM/maxresdefault.jpg	https://i.ytimg.com/vi/IeyCdm9WwXM/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:34.091+00
lTc6PzoGM2EJ9i_c	cover	image	https://i.ytimg.com/vi/IeyCdm9WwXM/maxres2.jpg	https://i.ytimg.com/vi/IeyCdm9WwXM/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:34.401+00
e7FH7p5bzn6gY2MB	cover	image	https://i.ytimg.com/vi/IeyCdm9WwXM/maxres3.jpg	https://i.ytimg.com/vi/IeyCdm9WwXM/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:34.56+00
ePWnEYjgzuaahQ0Q	official	image	https://r2.dan.tw/mvs/taidada/39bf9ac3eeca32aa68214779d371a6ae.jpg	https://pbs.twimg.com/media/GeBnQ18a0AI0piI?format=jpg&name=large	\N	2048	1258		\N	2026-04-25 02:34:34.782+00
mfagLL4iWUtnjYpJ	official	image	https://r2.dan.tw/mvs/taidada/310fb64b6b4beda794dde18a76727d35.jpg	https://pbs.twimg.com/media/Gfpk17IaUAAcVEV?format=jpg&name=large	\N	1399	1922	圖	\N	2026-04-25 02:34:34.998+00
gwXfZj19JjR47kwx	official	image	https://r2.dan.tw/mvs/taidada/b0b27c97ce550712e3c3ef22de80a399.jpg	https://pbs.twimg.com/media/G1POz65bQAAWkxN?format=jpg&name=large	\N	1838	2048	4000萬	\N	2026-04-25 02:34:35.223+00
dBhPhzTGDENo8cFN	official	image	https://r2.dan.tw/mvs/taidada/c081c24fd9e9cd2d3c408ccd04eb2226.jpg	https://pbs.twimg.com/media/G7Y3oc-b0AIGlMR?format=jpg&name=medium	\N	972	958	1周年	\N	2026-04-25 02:34:35.451+00
3ycAJ9cEeBD2mZOA	official	image	https://r2.dan.tw/mvs/taidada/6cbb4c22653928bec198dc4621aeaed4.jpg	https://pbs.twimg.com/media/HBXHRNlaAAA-j9Q?format=jpg&name=large	\N	1190	1683	卡牌	\N	2026-04-25 02:34:35.671+00
ie7QUdh4N5VZBKwg	official	image	https://r2.dan.tw/mvs/taidada/ed0e35feb4605614f894e35b1e64c14d.jpg	https://pbs.twimg.com/media/HBXHRNXbcAYI8hl?format=jpg&name=large	\N	1191	1684	卡牌	\N	2026-04-25 02:34:35.888+00
asBSIbj87UVFk3Ig	official	image	https://r2.dan.tw/mvs/taidada/d581eb8f37b6004b7082d94df6d19d35.jpg	https://pbs.twimg.com/media/HBgwb4PaQAAHQJI?format=jpg&name=medium	\N	700	975	卡牌	\N	2026-04-25 02:34:36.106+00
uVlBebQRn_cSB9_W	fanart	image	https://r2.dan.tw/mvs/taidada/32df6558f2a0b6b6851a754fae1b42eb.jpg	https://pbs.twimg.com/media/HF_M6QpbcAAryEN.jpg	https://pbs.twimg.com/media/HF_M6QpbcAAryEN.jpg	\N	\N		0wGp6biUerwJZMuX	2026-04-25 02:34:36.762+00
wie3CrdhtF_gGwkm	cover	image	https://i.ytimg.com/vi/zjEMFuj23B4/maxresdefault.jpg	https://i.ytimg.com/vi/zjEMFuj23B4/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:39.118+00
TM0yEyTNCSkUUujD	cover	image	https://i.ytimg.com/vi/zjEMFuj23B4/maxres1.jpg	https://i.ytimg.com/vi/zjEMFuj23B4/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:39.275+00
CsvmfpJYdX4rLDk8	cover	image	https://i.ytimg.com/vi/zjEMFuj23B4/maxres2.jpg	https://i.ytimg.com/vi/zjEMFuj23B4/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:39.431+00
2xL-ulPgGz9fQv6x	cover	image	https://i.ytimg.com/vi/zjEMFuj23B4/maxres3.jpg	https://i.ytimg.com/vi/zjEMFuj23B4/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:39.588+00
b49cpKJ5FIO2ni0z	official	image	https://r2.dan.tw/mvs/shade/cd5c6570090e72e86ba2362533a2ec10.jpg	https://pbs.twimg.com/media/Gp7VJoZa8AANZYJ?format=jpg&name=large	\N	2048	1860	設定圖	\N	2026-04-25 02:34:39.813+00
7029ufze2ss1Tzzs	official	image	https://r2.dan.tw/mvs/shade/69e047b920098225181c52a0044f7074.jpg	https://pbs.twimg.com/media/Gp7VJoZaYAABaUD?format=jpg&name=large	\N	2048	1378	設定圖	\N	2026-04-25 02:34:40.034+00
tlK3WeiJNeHs6dZo	official	image	https://r2.dan.tw/mvs/shade/2f0613c34795b4dacdcca19388ecc394.jpg	https://pbs.twimg.com/media/Gp7VJocawAM6OCe?format=jpg&name=large	\N	1215	2048	設定圖	\N	2026-04-25 02:34:40.255+00
upNK-2YgRVjzKwJ5	official	image	https://r2.dan.tw/mvs/shade/a5d5077f2498cb4245d04fedac200908.jpg	https://pbs.twimg.com/media/Gp7VJoHawAQjGLe?format=jpg&name=large	\N	2048	1497	設定圖	\N	2026-04-25 02:34:40.47+00
SUNa8kJ1AhsGEir1	official	image	https://r2.dan.tw/mvs/shade/df1cdec394f34022e9d41ba0377be86a.jpg	https://pbs.twimg.com/media/Gk9OWQSXEAEoEXl?format=jpg&name=large	\N	1559	1049	ACA	\N	2026-04-25 02:34:40.685+00
2ib1BM5HSpSuk7NQ	official	image	https://r2.dan.tw/mvs/shade/1f573212c75e8f98af7dc69c2d01f7f6.jpg	https://pbs.twimg.com/media/Gk9OWPybQAECLjj?format=jpg&name=large	\N	1559	1050	ACA	\N	2026-04-25 02:34:40.902+00
-ZdN_wZXxBJxOIQu	official	image	https://r2.dan.tw/mvs/shade/61501d0aaef00b9a099582a5b7f09864.jpg	https://pbs.twimg.com/media/Gkyoe_8aAAAPHxA?format=jpg&name=large	\N	1342	1219	ACA	\N	2026-04-25 02:34:41.119+00
reHHd12Ez6cMg7BX	official	image	https://r2.dan.tw/mvs/shade/1d0647eeea9c35c0c14634afa666488c.jpg	https://pbs.twimg.com/media/Gk4DFTUbgAAFY8-?format=jpg&name=large	\N	1920	1080	線稿	\N	2026-04-25 02:34:41.336+00
bJtl5G4P3q57BGDI	official	image	https://r2.dan.tw/mvs/shade/6d675bbf06c0332193be40d3720f0787.jpg	https://pbs.twimg.com/media/Gll0K7laoAAlpuP?format=jpg&name=large	\N	2048	1686	塗鴉	\N	2026-04-25 02:34:41.565+00
Vflp56LG54syC8yI	official	image	https://r2.dan.tw/mvs/shade/538ae24e991f351c60ff48ee785eee76.jpg	https://pbs.twimg.com/media/Gll0K7uaoAATQ-Y?format=jpg&name=large	\N	1661	1274	塗鴉	\N	2026-04-25 02:34:41.793+00
fiY86XTT0ytvGsIF	official	image	https://r2.dan.tw/mvs/shade/ca649f7e103be38fc74db30fb0cf34a9.jpg	https://pbs.twimg.com/media/Gl6V0_pakAASjrA?format=jpg&name=large	\N	1576	2048	圖	\N	2026-04-25 02:34:42.013+00
qsxIxjv_LIqfbXX1	official	image	https://r2.dan.tw/mvs/shade/bbf027881c27e2071316d740804e9e0c.jpg	https://pbs.twimg.com/media/HBW6RjwbcAAGGwB?format=jpg&name=large	\N	1406	2048	卡牌	\N	2026-04-25 02:34:42.23+00
s9VEs9NgAFHBIAjl	official	image	https://r2.dan.tw/mvs/shade/37ade3520e62920b7b41c87b84962243.jpg	https://pbs.twimg.com/media/HBW6RjtagAACYgy?format=jpg&name=large	\N	1406	2048	卡牌	\N	2026-04-25 02:34:42.446+00
_INYuTH21rdJaAf7	official	image	https://r2.dan.tw/mvs/shade/8c4be5d7f58cf77a7abdfd8d9014e024.jpg	https://pbs.twimg.com/media/HCc2O7bbIAAiggJ?format=jpg&name=large	\N	1424	2048	1周年	\N	2026-04-25 02:34:42.662+00
kQslIwyH2oQ8yDpC	official	image	https://r2.dan.tw/mvs/shade/7065ba5e2bcf925cf0a367c39449cde1.jpg	https://pbs.twimg.com/media/Gk4KkyKXcAAhukW?format=jpg&name=large	\N	1329	1727	圖	\N	2026-04-25 02:34:42.878+00
o3b8cbsOrtLBq98o	cover	image	https://i.ytimg.com/vi/e5LaKxJVeVI/maxresdefault.jpg	https://i.ytimg.com/vi/e5LaKxJVeVI/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:44.839+00
hTwvPzW_qTtmSQq9	cover	image	https://i.ytimg.com/vi/e5LaKxJVeVI/maxres1.jpg	https://i.ytimg.com/vi/e5LaKxJVeVI/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:44.994+00
y6mj5ihKsmqDnCT1	cover	image	https://i.ytimg.com/vi/e5LaKxJVeVI/maxres2.jpg	https://i.ytimg.com/vi/e5LaKxJVeVI/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:45.147+00
_thTR_QypRfi57qZ	cover	image	https://i.ytimg.com/vi/e5LaKxJVeVI/maxres3.jpg	https://i.ytimg.com/vi/e5LaKxJVeVI/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:45.301+00
lM-WS4jmPYksz28c	official	image	https://r2.dan.tw/mvs/kira-killer/520000c6c9a0d95df2bf091d0359bed7.jpg	https://pbs.twimg.com/media/FkGIAJLUUAAflBF?format=jpg&name=large	\N	2048	1152		\N	2026-04-25 02:34:45.515+00
EF-mkImeFfUWyVQl	official	image	https://r2.dan.tw/mvs/kira-killer/9c585d5a70598443ac4ec97b957000fb.jpg	https://pbs.twimg.com/media/FkGIAJQUYAYSZgz?format=jpg&name=large	\N	2048	1152		\N	2026-04-25 02:34:45.729+00
Yc15WKEZJ1WMhuVp	official	image	https://r2.dan.tw/mvs/kira-killer/f09b2d57a072b6eece7dc13153b5ffb0.jpg	https://pbs.twimg.com/media/Fp3S6t2aIAAtXhg?format=jpg&name=large	\N	1452	2048		\N	2026-04-25 02:34:45.949+00
foN9deo7dMc-K4-K	official	image	https://r2.dan.tw/mvs/kira-killer/376dfd893be868305f2f52022fd734d2.jpg	https://pbs.twimg.com/media/FxXaPgnaMAEMXIX?format=jpg&name=large	\N	1446	2048	女僕Kira卡牌	\N	2026-04-25 02:34:46.168+00
ML7LRYvDnmxutBCI	official	image	https://r2.dan.tw/mvs/kira-killer/700e9e70ad22ca74e18f5bd1fe48f784.jpg	https://pbs.twimg.com/media/HBlufJOaoAAphsu?format=jpg&name=large	\N	1451	2048	卡牌	\N	2026-04-25 02:34:46.388+00
jf5RIx7qhUSmkmz7	cover	image	https://i.ytimg.com/vi/ZUwaudw8ht0/maxresdefault.jpg	https://i.ytimg.com/vi/ZUwaudw8ht0/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:49.22+00
yLDq24FYlnxQquqa	cover	image	https://i.ytimg.com/vi/ZUwaudw8ht0/maxres1.jpg	https://i.ytimg.com/vi/ZUwaudw8ht0/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:49.376+00
A7aaUl2SGZriAkG-	cover	image	https://i.ytimg.com/vi/ZUwaudw8ht0/maxres2.jpg	https://i.ytimg.com/vi/ZUwaudw8ht0/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:49.531+00
_APTHO9JixcefnaG	cover	image	https://i.ytimg.com/vi/ZUwaudw8ht0/maxres3.jpg	https://i.ytimg.com/vi/ZUwaudw8ht0/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:49.729+00
gVht_ndAd1AsCwrM	official	image	https://r2.dan.tw/mvs/inside-joke/97a13e900a64507effe3af282c21cf85.jpg	https://pbs.twimg.com/media/E31vLBCVIAMtr2M?format=jpg&name=large	\N	1884	870		\N	2026-04-25 02:34:49.944+00
ofPQcQynWBBsv4_E	official	image	https://r2.dan.tw/mvs/inside-joke/48e6949ecdc836950ca446166542067f.jpg	https://pbs.twimg.com/media/E31vLBEVgAAPLt2?format=jpg&name=medium	\N	1163	1172		\N	2026-04-25 02:34:50.162+00
MAzRDIRe8VZJFYzi	cover	image	https://i.ytimg.com/vi/rsjaFk0Z5es/maxresdefault.jpg	https://i.ytimg.com/vi/rsjaFk0Z5es/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:52.156+00
GA5yc149j01vECiH	cover	image	https://i.ytimg.com/vi/rsjaFk0Z5es/maxres1.jpg	https://i.ytimg.com/vi/rsjaFk0Z5es/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:52.311+00
E4WdbD_gtdvsSAPY	cover	image	https://i.ytimg.com/vi/rsjaFk0Z5es/maxres2.jpg	https://i.ytimg.com/vi/rsjaFk0Z5es/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:52.465+00
W1jxXfohChVVQZ3l	cover	image	https://i.ytimg.com/vi/rsjaFk0Z5es/maxres3.jpg	https://i.ytimg.com/vi/rsjaFk0Z5es/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:52.628+00
U8O1x2k_tn-_mRpd	official	image	https://r2.dan.tw/mvs/yomosugara/587c7b8763159584061afe4ea7dc007c.jpg	https://pbs.twimg.com/media/HConbgFawAIDMcz?format=jpg&name=large	\N	2048	1640	設定圖1	\N	2026-04-25 02:34:52.844+00
FZop6lX7Vz9YRnyQ	official	image	https://r2.dan.tw/mvs/yomosugara/e889f4e87451431f0290298544df280a.jpg	https://pbs.twimg.com/media/HConbgUaYAATHRq?format=jpg&name=large	\N	2048	1640	設定圖2	\N	2026-04-25 02:34:53.063+00
b0oV4-8msSaxYbzZ	official	image	https://r2.dan.tw/mvs/yomosugara/3d9529474897b24b6adeabf5895ba9ac.jpg	https://pbs.twimg.com/media/HConbgGawAEa1G-?format=jpg&name=large	\N	2048	1640	設定圖3	\N	2026-04-25 02:34:53.279+00
0-fwBYLmKTN2qtDG	cover	image	https://i.ytimg.com/vi/9PnCSI8ndws/maxresdefault.jpg	https://i.ytimg.com/vi/9PnCSI8ndws/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:56.134+00
S1PE186qsr6WAmmE	cover	image	https://i.ytimg.com/vi/9PnCSI8ndws/maxres1.jpg	https://i.ytimg.com/vi/9PnCSI8ndws/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:56.298+00
xddhcwqs0HMQRv0Y	cover	image	https://i.ytimg.com/vi/9PnCSI8ndws/maxres2.jpg	https://i.ytimg.com/vi/9PnCSI8ndws/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:56.452+00
apSskV-FH0chEJrO	cover	image	https://i.ytimg.com/vi/9PnCSI8ndws/maxres3.jpg	https://i.ytimg.com/vi/9PnCSI8ndws/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:56.607+00
ajhS2JphMmo3PvFj	official	image	https://r2.dan.tw/mvs/quilt/9fd37cc5a51500ae0e1a9eff0b93e022.jpg	https://pbs.twimg.com/media/FLeuoklVcAI22SP?format=jpg&name=large	\N	2048	1064		\N	2026-04-25 02:34:56.828+00
DBUHRs4BoIzoyR4a	official	image	https://r2.dan.tw/mvs/quilt/78b165d59bc25a3dfed034420793fc2c.jpg	https://pbs.twimg.com/media/FLt0WFFaAAQYQP1?format=jpg&name=large	\N	2048	1064		\N	2026-04-25 02:34:57.048+00
OHN1mV1Di8Wmw3B2	official	image	https://r2.dan.tw/mvs/quilt/3274d4abeceb9c9040dd8c9c5943643a.jpg	https://pbs.twimg.com/media/FLt0WFFaAAExc6h?format=jpg&name=large	\N	2048	1064		\N	2026-04-25 02:34:57.266+00
GIo8LNgm_uI2Pxwe	official	image	https://r2.dan.tw/mvs/quilt/873899e208e901775ed288476c1e853d.jpg	https://pbs.twimg.com/media/FLt0WHTakAUFP65?format=jpg&name=large	\N	2048	1064		\N	2026-04-25 02:34:57.486+00
dNIU231skiGtHuyW	cover	image	https://i.ytimg.com/vi/SAdkxVFyAyc/maxresdefault.jpg	https://i.ytimg.com/vi/SAdkxVFyAyc/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:59.162+00
14xehpNyeiVUHJ63	cover	image	https://i.ytimg.com/vi/SAdkxVFyAyc/maxres1.jpg	https://i.ytimg.com/vi/SAdkxVFyAyc/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:59.319+00
nZTabfMPp6jzeYOP	cover	image	https://i.ytimg.com/vi/SAdkxVFyAyc/maxres2.jpg	https://i.ytimg.com/vi/SAdkxVFyAyc/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:59.486+00
SYG3w7CluJ0C3eqh	cover	image	https://i.ytimg.com/vi/SAdkxVFyAyc/maxres3.jpg	https://i.ytimg.com/vi/SAdkxVFyAyc/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:34:59.643+00
0Mrk12U0ph3R327E	official	image	https://r2.dan.tw/mvs/intrusion/41443418c129d11812b26af8ce3fa1a5.jpg	https://pbs.twimg.com/media/FwGJOICaQAYnvNg?format=jpg&name=large	\N	2048	1204		\N	2026-04-25 02:34:59.858+00
ezFeKQDwBMqA3Bc_	official	image	https://r2.dan.tw/mvs/intrusion/85c6d963c99958a2f768d9ed5fbaff63.jpg	https://pbs.twimg.com/media/FwJEmiIacAAIY4I?format=jpg&name=large	\N	2048	1204		\N	2026-04-25 02:35:00.073+00
IFw71zLpfiw0qAJ4	official	image	https://r2.dan.tw/mvs/intrusion/a090a1982c8b2621a818e23dc80dd3db.jpg	https://pbs.twimg.com/media/GLM8fLQbgAApTxn?format=jpg&name=large	\N	1043	1391	JK Nira	\N	2026-04-25 02:35:00.29+00
iLLTr1OtdbGfRNez	official	image	https://r2.dan.tw/mvs/intrusion/16f5251caefe160a009c54769b0c7c0c.jpg	https://pbs.twimg.com/media/Fx24pQCagAA9Epz?format=jpg&name=large	\N	1264	2048	5周年	\N	2026-04-25 02:35:00.534+00
q1OTfTT57Em56non	official	image	https://r2.dan.tw/mvs/intrusion/d3ade16956e2e963e83d4addedfc1d5a.jpg	https://pbs.twimg.com/media/GPIqbAXagAIFZgg?format=jpg&name=large	\N	1462	2048	Nira初設	\N	2026-04-25 02:35:00.749+00
xd5VwFaDxrnPhQzP	official	image	https://r2.dan.tw/mvs/intrusion/f2182ed280b44921b1d058b82dbdb3e6.jpg	https://pbs.twimg.com/media/Gq8BzimaAAIafqK?format=jpg&name=large	\N	1071	1349	2周年	\N	2026-04-25 02:35:00.971+00
jiZGvLRkTtxHIjZr	cover	image	https://i.ytimg.com/vi/Atvsg_zogxo/maxresdefault.jpg	https://i.ytimg.com/vi/Atvsg_zogxo/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:35:04.018+00
5a_buFqEpmqRrNA2	cover	image	https://i.ytimg.com/vi/Atvsg_zogxo/maxres1.jpg	https://i.ytimg.com/vi/Atvsg_zogxo/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:35:04.173+00
tjN8Hxxu6LEXVhkG	cover	image	https://i.ytimg.com/vi/Atvsg_zogxo/maxres2.jpg	https://i.ytimg.com/vi/Atvsg_zogxo/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:35:04.327+00
yyLQCqD02yPpPaAZ	cover	image	https://i.ytimg.com/vi/Atvsg_zogxo/maxres3.jpg	https://i.ytimg.com/vi/Atvsg_zogxo/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:35:04.485+00
CVNc9e_HYEX7AgKq	official	image	https://r2.dan.tw/mvs/study-me/b029e530a46447455354849a34685bb7.jpg	https://pbs.twimg.com/media/EXKzv4fVcAEIth3?format=jpg&name=large	\N	1526	1074		\N	2026-04-25 02:35:04.703+00
wiRAQSa_ngWVM3Q9	official	image	https://r2.dan.tw/mvs/study-me/8d542b20e3b58655a72e019c5fbe370e.jpg	https://pbs.twimg.com/media/EXurwcgVAAA66TE?format=jpg&name=large	\N	1526	1075		\N	2026-04-25 02:35:04.918+00
g4uqhefebGFNDxll	official	image	https://r2.dan.tw/mvs/study-me/d725229c4ee721f212bd915aed1ff52d.jpg	https://pbs.twimg.com/media/Gd3UpXZa0AAxISm.jpg	https://pbs.twimg.com/media/Gd3UpXZa0AAxISm.jpg	744	1185		\N	2026-04-25 02:35:05.133+00
99mukfnxaruYAf5U	official	image	https://r2.dan.tw/mvs/study-me/a654d966d95709676c8852ae4db185e0.jpg	https://pbs.twimg.com/media/GcVWFeJbkAEAHMA.jpg	https://pbs.twimg.com/media/GcVWFeJbkAEAHMA.jpg	744	1185		\N	2026-04-25 02:35:05.351+00
0L-vnpn0Md0y4wh2	official	image	https://r2.dan.tw/mvs/study-me/ebbfea3b8a3dd3d9f43eacc53a9017b3.jpg	https://pbs.twimg.com/media/GG7wI50bAAAtVEJ.jpg	https://pbs.twimg.com/media/GG7wI50bAAAtVEJ.jpg	2048	1535		\N	2026-04-25 02:35:05.57+00
816iW1xkW_7-0Y_L	official	image	https://r2.dan.tw/mvs/study-me/cf467c482859d46a4661b308aa573004.jpg	https://pbs.twimg.com/media/F6rajIza0AAtZPN.jpg	https://pbs.twimg.com/media/F6rajIza0AAtZPN.jpg	2048	2048		\N	2026-04-25 02:35:05.787+00
x7HGa8uY1N5jPEHD	official	image	https://r2.dan.tw/mvs/study-me/2baa5af359cea0ae739805e541b2eab4.jpg	https://pbs.twimg.com/media/F3PFpJsbgAAVRjP.jpg	https://pbs.twimg.com/media/F3PFpJsbgAAVRjP.jpg	1152	2048		\N	2026-04-25 02:35:06.003+00
FnLoqlirY_9GaalO	official	image	https://r2.dan.tw/mvs/study-me/3e4798c98c1c19d6408ee9ac84f0995e.jpg	https://pbs.twimg.com/media/F3PFpdUbkAEtme_.jpg	https://pbs.twimg.com/media/F3PFpdUbkAEtme_.jpg	1155	1155		\N	2026-04-25 02:35:06.223+00
opvumdo0ZKzfUeO5	official	image	https://r2.dan.tw/mvs/study-me/c83df0e95756f5e57c1b14f400f05de0.jpg	https://pbs.twimg.com/media/FwGOSfEaMAAj3r8.jpg	https://pbs.twimg.com/media/FwGOSfEaMAAj3r8.jpg	1482	2048		\N	2026-04-25 02:35:06.44+00
V2rIIGpd5kYck9IG	official	image	https://r2.dan.tw/mvs/study-me/44efde6120b5d315dd61fa58ea48afb3.jpg	https://pbs.twimg.com/media/FdfkfbEVEAE6S6q.jpg	https://pbs.twimg.com/media/FdfkfbEVEAE6S6q.jpg	1536	2048		\N	2026-04-25 02:35:06.659+00
NfgWyvOXdwbcIFXI	official	image	https://r2.dan.tw/mvs/study-me/5c01df392f7ae714dbba242c64918acc.jpg	https://pbs.twimg.com/media/FdVeHiCakAAu1HS.jpg	https://pbs.twimg.com/media/FdVeHiCakAAu1HS.jpg	1308	2048	卡牌	\N	2026-04-25 02:35:06.879+00
M651WNZ_bAndO5md	official	image	https://r2.dan.tw/mvs/study-me/cccda85ab29471da556684673327ec71.jpg	https://pbs.twimg.com/media/FMsjd-UacAIGOzd.jpg	https://pbs.twimg.com/media/FMsjd-UacAIGOzd.jpg	1502	2048		\N	2026-04-25 02:35:07.099+00
toI66XiAoRqMnCTX	official	image	https://r2.dan.tw/mvs/study-me/f20e2fc36159e3f913ec5bd64cc637ca.jpg	https://pbs.twimg.com/media/FMsjd-XacAILqtq.jpg	https://pbs.twimg.com/media/FMsjd-XacAILqtq.jpg	1548	2048		\N	2026-04-25 02:35:07.318+00
0771wVTtkIcN1Dsm	official	image	https://r2.dan.tw/mvs/study-me/0d238abdf9d8123b07ac59ecc9241912.jpg	https://pbs.twimg.com/media/FMsjd-ZaMAEtm0x.jpg	https://pbs.twimg.com/media/FMsjd-ZaMAEtm0x.jpg	1920	1080		\N	2026-04-25 02:35:07.544+00
s6zqUCWUhMsStiXh	official	image	https://r2.dan.tw/mvs/study-me/fa24cde6ce02990e666f7b9b4ed2cc04.jpg	https://pbs.twimg.com/media/E7S4P3yVEAArhmf.jpg	https://pbs.twimg.com/media/E7S4P3yVEAArhmf.jpg	1536	2048		\N	2026-04-25 02:35:07.775+00
Xa9FrX2qeAib3uOW	official	image	https://r2.dan.tw/mvs/study-me/4eaa0354e58b3bcb885710172947017b.jpg	https://pbs.twimg.com/media/EsYEgh8U4AE86tp.jpg	https://pbs.twimg.com/media/EsYEgh8U4AE86tp.jpg	1152	2048		\N	2026-04-25 02:35:07.995+00
bQjwr_NQ7TmeCTRy	official	image	https://r2.dan.tw/mvs/study-me/052d267ca2a55c9020bfcab02334d5f1.jpg	https://pbs.twimg.com/media/EsYEgh7UwAAQ1L3.jpg	https://pbs.twimg.com/media/EsYEgh7UwAAQ1L3.jpg	1155	1155		\N	2026-04-25 02:35:08.213+00
RRaJ49YSiKOSgJ-d	fanart	image	https://r2.dan.tw/mvs/darken/66a5c961cf33fdd020d120c4d25e9fd5.jpg	https://pbs.twimg.com/media/HF8eV4abgAAUbNt.jpg	https://pbs.twimg.com/media/HF8eV4abgAAUbNt.jpg	\N	\N		ML_9gDcpx6jp8JHO	2026-04-25 02:33:54.391+00
omrLUL-dFGsSFBvZ	cover	image	https://i.ytimg.com/vi/ugpywe34_30/maxresdefault.jpg	https://i.ytimg.com/vi/ugpywe34_30/maxresdefault.jpg	\N	\N	\N	\N	\N	2026-04-25 02:35:10.921+00
tpQEA_6WVqIfyJ0u	cover	image	https://i.ytimg.com/vi/ugpywe34_30/maxres1.jpg	https://i.ytimg.com/vi/ugpywe34_30/maxres1.jpg	\N	\N	\N	\N	\N	2026-04-25 02:35:11.075+00
iIps9-aRQJH2Odqj	cover	image	https://i.ytimg.com/vi/ugpywe34_30/maxres2.jpg	https://i.ytimg.com/vi/ugpywe34_30/maxres2.jpg	\N	\N	\N	\N	\N	2026-04-25 02:35:11.232+00
7W1JZJ-rePnsTc44	cover	image	https://i.ytimg.com/vi/ugpywe34_30/maxres3.jpg	https://i.ytimg.com/vi/ugpywe34_30/maxres3.jpg	\N	\N	\N	\N	\N	2026-04-25 02:35:11.393+00
bmHxtjShm7jKZ_8e	official	image	https://r2.dan.tw/mvs/hunch-gray/8297cc2e199759fd961df641c90a9228.jpg	https://pbs.twimg.com/media/EoNhUnaVgAA1RZR?format=jpg&name=large	\N	2048	988		\N	2026-04-25 02:35:11.615+00
F2wm8JD3kw-YxA89	official	image	https://r2.dan.tw/mvs/hunch-gray/fa20f6989ede49214c4e388e863f9834.jpg	https://pbs.twimg.com/media/FdU4ZNdagAAhHyS?format=jpg&name=large	\N	1446	2048	卡牌	\N	2026-04-25 02:35:11.83+00
vIZ0OQrB1U2P9_vm	fanart	image	https://r2.dan.tw/mvs/hunch-gray/16331813bcc92160273048ab8c9d061a.jpg	https://pbs.twimg.com/media/HF3v_l_aUAA_8vh.jpg	https://pbs.twimg.com/media/HF3v_l_aUAA_8vh.jpg	\N	\N		uAJXaEAO0QTMmX68	2026-04-25 02:35:12.047+00
6STi3pVtOlefSBsg	fanart	image	https://pbs.twimg.com/media/HGrOLghbYAAAv5L.jpg	https://pbs.twimg.com/media/HGrOLghbYAAAv5L.jpg	https://pbs.twimg.com/media/HGrOLghbYAAAv5L.jpg	\N	\N	\N	S6k-MGCpxc0AJ-Jz	2026-04-25 04:00:42.85+00
noWr00N_C5_CIPMz	fanart	image	https://pbs.twimg.com/media/HGrOLglb0AANsEJ.jpg	https://pbs.twimg.com/media/HGrOLglb0AANsEJ.jpg	https://pbs.twimg.com/media/HGrOLglb0AANsEJ.jpg	\N	\N	\N	S6k-MGCpxc0AJ-Jz	2026-04-25 04:00:42.887+00
XjYt72HMdmzSSgyk	collaboration	video	https://video.twimg.com/tweet_video/FP2N2F4WQBAwWh_.mp4	https://video.twimg.com/tweet_video/FP2N2F4WQBAwWh_.mp4	https://pbs.twimg.com/tweet_video_thumb/FP2N2F4WQBAwWh_.jpg	\N	\N	\N	\N	2026-04-25 02:35:24.431+00
Nw1RDO9P02Vw8Qws	collaboration	image	https://pbs.twimg.com/media/FSKeYebXMAIFXs_.jpg	https://pbs.twimg.com/media/FSKeYebXMAIFXs_.jpg	https://pbs.twimg.com/media/FSKeYebXMAIFXs_.jpg	\N	\N	\N	\N	2026-04-25 02:35:23.746+00
uHnpAqBA1jaAi0H8	collaboration	image	https://pbs.twimg.com/media/FUVoI9bXwAMgqgB.jpg	https://pbs.twimg.com/media/FUVoI9bXwAMgqgB.jpg	https://pbs.twimg.com/media/FUVoI9bXwAMgqgB.jpg	\N	\N	\N	\N	2026-04-25 02:35:23.987+00
YEijExvBI_3yobk2	collaboration	image	https://pbs.twimg.com/media/FgbzpDiXwAAcwfK.jpg	https://pbs.twimg.com/media/FgbzpDiXwAAcwfK.jpg	https://pbs.twimg.com/media/FgbzpDiXwAAcwfK.jpg	\N	\N	\N	\N	2026-04-25 02:35:24.203+00
XN-KB_JHaXZgCnw7	fanart	image	https://pbs.twimg.com/media/HGmQhPJa0AAQ96C.jpg	https://pbs.twimg.com/media/HGmQhPJa0AAQ96C.jpg	https://pbs.twimg.com/media/HGmQhPJa0AAQ96C.jpg	\N	\N	\N	9F7SMeWf3XRaz3Xz	2026-04-25 04:01:20.972+00
1ut-v5BKRJy3QqJX	fanart	image	https://pbs.twimg.com/card_img/2045412825632534528/PC9Fr_U0?format=jpg&name=800x419	https://pbs.twimg.com/card_img/2045412825632534528/PC9Fr_U0?format=jpg&name=800x419	\N	\N	\N	\N	KY331gxO2OSWvEe6	2026-04-25 04:02:00.443+00
719X8w77PFt4W0Ke	fanart	image	https://pbs.twimg.com/media/HGHmse7a0AAadjg.jpg	https://pbs.twimg.com/media/HGHmse7a0AAadjg.jpg	https://pbs.twimg.com/media/HGHmse7a0AAadjg.jpg	\N	\N	\N	oQ-EpHTdZvooqGxU	2026-04-25 04:02:38.542+00
AKtGRGCm3BJapVBd	fanart	video	https://r2.dan.tw/fanarts/videos/cc9a8119fbb58eb1e1ff2fdd8a91446e.mp4	https://video.twimg.com/amplify_video/2041894781899698177/vid/avc1/1918x1078/hic9B1JW3DwHPEDF.mp4	https://pbs.twimg.com/amplify_video_thumb/2041894781899698177/img/kq-BcjBjWtqYQxuI.jpg	\N	\N	\N	YeYNN2qmOEyZhsqP	2026-04-25 04:03:24.701+00
-dbphiXNqQndlxb_	fanart	image	https://pbs.twimg.com/media/HFZEfFXa8AA73RJ.jpg	https://pbs.twimg.com/media/HFZEfFXa8AA73RJ.jpg	https://pbs.twimg.com/media/HFZEfFXa8AA73RJ.jpg	\N	\N	\N	YeYNN2qmOEyZhsqP	2026-04-25 04:03:24.736+00
ccKw3CNs-xYDBSjN	fanart	image	https://r2.dan.tw/fanarts/ba03f6acb7de8cf47f5888d583114441.jpg	https://pbs.twimg.com/media/HGwNmqPbMAAZYmh.jpg	https://pbs.twimg.com/media/HGwNmqPbMAAZYmh.jpg	\N	\N	\N	Vt_iLMut0__p-Cjh	2026-04-25 15:00:08.435+00
hlvnNtbgusM8zs9G	official	video	https://video.twimg.com/ext_tw_video/1400710788315111426/pu/vid/1060x720/A1nNjmp_Urr8ifjM.mp4	https://video.twimg.com/ext_tw_video/1400710788315111426/pu/vid/1060x720/A1nNjmp_Urr8ifjM.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1400710788315111426/pu/img/tBonONs-cC13I1q-.jpg	1060	720		\N	2026-04-25 02:32:50.176+00
pnuH778qOqTypEQE	official	video	https://video.twimg.com/tweet_video/E8gHOX7VUAQNp9J.mp4	https://video.twimg.com/tweet_video/E8gHOX7VUAQNp9J.mp4	https://pbs.twimg.com/tweet_video_thumb/E8gHOX7VUAQNp9J.jpg	1092	1367	1周年	\N	2026-04-25 02:32:52.135+00
0XMz_uZAAFMQu8rG	official	video	https://video.twimg.com/tweet_video/GUswj3rbEAEFN4a.mp4	https://video.twimg.com/tweet_video/GUswj3rbEAEFN4a.mp4	https://pbs.twimg.com/tweet_video_thumb/GUswj3rbEAEFN4a.jpg	1920	1080	4周年	\N	2026-04-25 02:32:52.352+00
fEXrHOQWhFPx_DwN	official	video	https://video.twimg.com/amplify_video/2032132669195370500/vid/avc1/854x1280/A8wIsf5UEQYPNJaS.mp4	https://video.twimg.com/amplify_video/2032132669195370500/vid/avc1/854x1280/A8wIsf5UEQYPNJaS.mp4	https://pbs.twimg.com/amplify_video_thumb/2032132669195370500/img/qfF-lh3W7sXbcr8A.jpg	854	1280		\N	2026-04-25 02:33:26.371+00
SqTpLByAsTomP2E0	official	video	https://video.twimg.com/amplify_video/2029200350171820032/vid/avc1/720x1280/O__zgwQlblLEYSVJ.mp4	https://video.twimg.com/amplify_video/2029200350171820032/vid/avc1/720x1280/O__zgwQlblLEYSVJ.mp4	https://pbs.twimg.com/amplify_video_thumb/2029200350171820032/img/S6ZL82sjzVt2gfIn.jpg	720	1280		\N	2026-04-25 02:33:26.592+00
SM_rM3SrGB4ASGTI	official	video	https://video.twimg.com/amplify_video/2039258285896007680/vid/avc1/1280x720/x2HXj2Gnhv_w-Qgh.mp4	https://video.twimg.com/amplify_video/2039258285896007680/vid/avc1/1280x720/x2HXj2Gnhv_w-Qgh.mp4	https://pbs.twimg.com/amplify_video_thumb/2039258285896007680/img/ltGB1eAMhC7YxkmD.jpg	1280	720		\N	2026-04-25 02:33:33.715+00
gpdJ_sr3R5nrZ6LU	official	video	https://video.twimg.com/amplify_video/2039258317000941568/vid/avc1/1280x720/2f1j5PNOif0OWCw7.mp4	https://video.twimg.com/amplify_video/2039258317000941568/vid/avc1/1280x720/2f1j5PNOif0OWCw7.mp4	https://pbs.twimg.com/amplify_video_thumb/2039258317000941568/img/coRjQvUNNIrOk73V.jpg	1280	720		\N	2026-04-25 02:33:33.934+00
JwnVzlm5UruQE5XY	official	video	https://video.twimg.com/amplify_video/2039258337024634880/vid/avc1/1280x720/bktn1m2DaM10cE_l.mp4	https://video.twimg.com/amplify_video/2039258337024634880/vid/avc1/1280x720/bktn1m2DaM10cE_l.mp4	https://pbs.twimg.com/amplify_video_thumb/2039258337024634880/img/PDMMIaXr84w3C_0d.jpg	1280	720		\N	2026-04-25 02:33:34.153+00
e7KFfGGMp7n3UP0G	official	video	https://video.twimg.com/amplify_video/1866825485575131137/vid/avc1/876x720/yo3f3PPjWaWE375e.mp4	https://video.twimg.com/amplify_video/1866825485575131137/vid/avc1/876x720/yo3f3PPjWaWE375e.mp4	https://pbs.twimg.com/amplify_video_thumb/1866825485575131137/img/pNa2pp28v6fS8S2S.jpg	876	720		\N	2026-04-25 02:33:50.349+00
5fZxRnkGc7Wezr7v	official	video	https://video.twimg.com/ext_tw_video/1961423292692045824/pu/vid/avc1/920x720/-4_H8yUAruii6Yxi.mp4	https://video.twimg.com/ext_tw_video/1961423292692045824/pu/vid/avc1/920x720/-4_H8yUAruii6Yxi.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1961423292692045824/pu/img/6RKtJUSbl8bW2Dnk.jpg	920	720	1周年	\N	2026-04-25 02:33:57.984+00
LVtf1qdVZ8uelSXj	official	video	https://video.twimg.com/ext_tw_video/1835702858055905280/pu/vid/avc1/720x756/Z6YJY3TVF5e726zo.mp4	https://video.twimg.com/ext_tw_video/1835702858055905280/pu/vid/avc1/720x756/Z6YJY3TVF5e726zo.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1835702858055905280/pu/img/XnTxj4BoGbm3bOtF.jpg	720	756	500萬	\N	2026-04-25 02:33:59.284+00
ZhCT7fseJGT2U16P	official	video	https://video.twimg.com/ext_tw_video/1830671884939104258/pu/vid/avc1/1218x704/N41MlUM8nS7Bi7Pk.mp4	https://video.twimg.com/ext_tw_video/1830671884939104258/pu/vid/avc1/1218x704/N41MlUM8nS7Bi7Pk.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1830671884939104258/pu/img/NCP7-kQN7zDMWXCS.jpg	1218	704		\N	2026-04-25 02:33:59.497+00
5rgtyaYA95TcrGmh	official	video	https://video.twimg.com/ext_tw_video/1829135018150490112/pu/vid/avc1/720x1018/CCyRemBpLZSPZrlv.mp4	https://video.twimg.com/ext_tw_video/1829135018150490112/pu/vid/avc1/720x1018/CCyRemBpLZSPZrlv.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1829135018150490112/pu/img/XysaOkc9vV30qrLE.jpg	720	1018		\N	2026-04-25 02:33:59.936+00
1sFnrMfGfH74HC2J	official	video	https://video.twimg.com/ext_tw_video/1665340350163034121/pu/vid/1280x720/NNlzfqt_O7eNGGwy.mp4	https://video.twimg.com/ext_tw_video/1665340350163034121/pu/vid/1280x720/NNlzfqt_O7eNGGwy.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1665340350163034121/pu/img/qe2_7X0fvFB74G7d.jpg	1280	720		\N	2026-04-25 02:34:03.859+00
XzAelLpRPccXaMJ-	official	video	https://video.twimg.com/ext_tw_video/1599512414772502530/pu/vid/720x720/ttP9KANa3PFMHTgq.mp4	https://video.twimg.com/ext_tw_video/1599512414772502530/pu/vid/720x720/ttP9KANa3PFMHTgq.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1599512414772502530/pu/img/nBYgxyRUJpkvjkeh.jpg	720	720		\N	2026-04-25 02:34:04.736+00
bjB3_a9vCQmDqJj0	official	video	https://video.twimg.com/ext_tw_video/1529908929743970304/pu/vid/1280x720/6gP1aKQDZ5AN5yJy.mp4	https://video.twimg.com/ext_tw_video/1529908929743970304/pu/vid/1280x720/6gP1aKQDZ5AN5yJy.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1529908929743970304/pu/img/UGpqrKAFflcDo8By.jpg	1280	720		\N	2026-04-25 02:34:04.956+00
ajyqZpnBIzcUd1NR	official	video	https://video.twimg.com/ext_tw_video/1518666447563669515/pu/vid/1280x720/mY8RB8AhrA-AOlL6.mp4	https://video.twimg.com/ext_tw_video/1518666447563669515/pu/vid/1280x720/mY8RB8AhrA-AOlL6.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1518666447563669515/pu/img/6zPuyOX43H4E3xEM.jpg	1280	720		\N	2026-04-25 02:34:05.183+00
K28TPrRSXeDzfeJX	official	video	https://video.twimg.com/tweet_video/E6CkGHqXMAEmd7o.mp4	https://video.twimg.com/tweet_video/E6CkGHqXMAEmd7o.mp4	https://pbs.twimg.com/tweet_video_thumb/E6CkGHqXMAEmd7o.jpg	899	716		\N	2026-04-25 02:34:12.886+00
NcS0WFcp0VJ4m0U-	official	video	https://video.twimg.com/tweet_video/GH-t8KObsAAkKOT.mp4	https://video.twimg.com/tweet_video/GH-t8KObsAAkKOT.mp4	https://pbs.twimg.com/tweet_video_thumb/GH-t8KObsAAkKOT.jpg	700	650		\N	2026-04-25 02:34:31.757+00
QNH9aR20KOBZMesH	official	video	https://video.twimg.com/ext_tw_video/1866075372544258048/pu/vid/avc1/1280x720/WezQm-yMX6NnbSJ4.mp4	https://video.twimg.com/ext_tw_video/1866075372544258048/pu/vid/avc1/1280x720/WezQm-yMX6NnbSJ4.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1866075372544258048/pu/img/DPw-pL5Y02e47FWK.jpg	1280	720		\N	2026-04-25 02:34:36.322+00
C9tz49pS2-aGFf_t	official	video	https://video.twimg.com/ext_tw_video/1868939766861119490/pu/vid/avc1/744x720/p_yZ4VOmCJVXNXPz.mp4	https://video.twimg.com/ext_tw_video/1868939766861119490/pu/vid/avc1/744x720/p_yZ4VOmCJVXNXPz.mp4	https://pbs.twimg.com/ext_tw_video_thumb/1868939766861119490/pu/img/uIucnkljzAQkjlqi.jpg	744	720		\N	2026-04-25 02:34:36.542+00
opW6X8mHUhByRAvx	official	video	https://video.twimg.com/tweet_video/FwVB-gUaUAAqGVF.mp4	https://video.twimg.com/tweet_video/FwVB-gUaUAAqGVF.mp4	https://pbs.twimg.com/tweet_video_thumb/FwVB-gUaUAAqGVF.jpg	1920	1080		\N	2026-04-25 02:35:01.19+00
yoG1N83d9esr4nVn	fanart	image	https://r2.dan.tw/fanarts/021233190497fa685cbdf613f657c994.jpg	https://pbs.twimg.com/media/HGHs4XOawAMR_Di.jpg	https://pbs.twimg.com/media/HGHs4XOawAMR_Di.jpg	\N	\N	\N	lzvlBsmESttRHYQ6	2026-04-25 17:00:02.758+00
NDrbnVVvhMijGtFY	fanart	image	https://r2.dan.tw/fanarts/8337565f3bf2939e54487acfae5b2585.jpg	https://pbs.twimg.com/media/HGHaDZEagAA3bf7.jpg	https://pbs.twimg.com/media/HGHaDZEagAA3bf7.jpg	\N	\N	\N	5ZBeTCPe0eo5145B	2026-04-25 17:00:04.517+00
rueGltd03PEpIcvG	fanart	image	https://r2.dan.tw/fanarts/32df6558f2a0b6b6851a754fae1b42eb.jpg	https://pbs.twimg.com/media/HF_M6QpbcAAryEN.jpg	https://pbs.twimg.com/media/HF_M6QpbcAAryEN.jpg	\N	\N	\N	v04mXMVuvFZioLJA	2026-04-25 17:00:06.279+00
p-bZ82HlPkZeR9vY	fanart	image	https://r2.dan.tw/fanarts/66a5c961cf33fdd020d120c4d25e9fd5.jpg	https://pbs.twimg.com/media/HF8eV4abgAAUbNt.jpg	https://pbs.twimg.com/media/HF8eV4abgAAUbNt.jpg	\N	\N	\N	e3oZ1hYhvukBanVR	2026-04-25 17:00:14.35+00
e5jDMGYoa95ZvvqW	fanart	image	https://r2.dan.tw/fanarts/16331813bcc92160273048ab8c9d061a.jpg	https://pbs.twimg.com/media/HF3v_l_aUAA_8vh.jpg	https://pbs.twimg.com/media/HF3v_l_aUAA_8vh.jpg	\N	\N	\N	cRq1Dx8bAN_TpvL3	2026-04-25 17:00:16.121+00
RAkjeMTuDZJBME9o	fanart	image	https://r2.dan.tw/fanarts/9989045c103e1cf220d422f2ff16eef8.jpg	https://pbs.twimg.com/media/HFso3JnaMAApL3a.jpg	https://pbs.twimg.com/media/HFso3JnaMAApL3a.jpg	\N	\N	\N	G1is1GyerPtnS3-O	2026-04-25 17:00:19.725+00
U3DMfbYh5PdMnFhf	fanart	image	https://r2.dan.tw/fanarts/ad4edf0a3c82b0a4e00092c3c6ceddb3.jpg	https://pbs.twimg.com/media/HFg8Z2CaQAA_Cjj.jpg	https://pbs.twimg.com/media/HFg8Z2CaQAA_Cjj.jpg	\N	\N	\N	JUCqnKVfywVoKg1W	2026-04-25 17:00:21.677+00
OExPRqGSG-jPgpNA	fanart	image	https://r2.dan.tw/fanarts/0513f017fc4238bb9b487ff0df529907.jpg	https://pbs.twimg.com/media/HFOzbBgbMAAHQk_.jpg	https://pbs.twimg.com/media/HFOzbBgbMAAHQk_.jpg	\N	\N	\N	Lh1DGOV53BAN-QEt	2026-04-25 17:00:23.392+00
wEeoyzkfUI7tA8b6	fanart	image	https://r2.dan.tw/fanarts/406e88339f35eff2e71916cc73868cf4.jpg	https://pbs.twimg.com/media/HFESRvZaoAAw42s.jpg	https://pbs.twimg.com/media/HFESRvZaoAAw42s.jpg	\N	\N	\N	GRe9-SjL_OFb22HB	2026-04-25 17:00:25.227+00
D9lTm02SDueTUr9g	fanart	image	https://r2.dan.tw/fanarts/fbe863b427116c0de73867777309f830.jpg	https://pbs.twimg.com/media/HFCEyMga0AAaPao.jpg	https://pbs.twimg.com/media/HFCEyMga0AAaPao.jpg	\N	\N	\N	eIxPKWDc6qC-2SjA	2026-04-25 17:00:27.06+00
lo8Mo5WAXc7fhZwn	fanart	video	https://r2.dan.tw/fanarts/videos/d07b021090bfd98d7708a7bc53d08265.mp4	https://video.twimg.com/amplify_video/2037525647636176896/vid/avc1/3840x2160/9ln5iKWr7ZSmAaGV.mp4	https://r2.dan.tw/fanarts/videos/thumbs/f1c6844485d63791a3f4a966254fb580.jpg	\N	\N	\N	EpoypTwD_R_JRwjO	2026-04-25 17:00:31.198+00
7Fuj09REpSGuliY0	fanart	image	https://r2.dan.tw/fanarts/4517895d739b85d393c00b945d4a4660.jpg	https://pbs.twimg.com/media/HEa-yAJaYAAKXaw.jpg	https://pbs.twimg.com/media/HEa-yAJaYAAKXaw.jpg	\N	\N	\N	EpoypTwD_R_JRwjO	2026-04-25 17:00:31.233+00
W6fICVEtvuvWmS2r	fanart	image	https://r2.dan.tw/fanarts/66572bdd2ee86647aa8b1992cfeeb2d5.jpg	https://pbs.twimg.com/media/HE8gyeeaAAAQPRL.jpg	https://pbs.twimg.com/media/HE8gyeeaAAAQPRL.jpg	\N	\N	\N	iMs31WLaCVZnX4Zp	2026-04-25 17:00:33.006+00
V8ix3qh8Cdiu9906	fanart	image	https://r2.dan.tw/fanarts/71321f56aa4dce5b68d1a95281dd0a9b.jpg	https://pbs.twimg.com/media/HE6ZYAnagAEJO4w.jpg	https://pbs.twimg.com/media/HE6ZYAnagAEJO4w.jpg	\N	\N	\N	Q8ZxP5Sl6YHAJDbP	2026-04-25 17:00:35.053+00
oyo6E7WAPAeMk6bt	fanart	image	https://r2.dan.tw/fanarts/88f01f97911c4d087f40009285794b3b.jpg	https://pbs.twimg.com/media/HE6D_TqaUAAeYHE.jpg	https://pbs.twimg.com/media/HE6D_TqaUAAeYHE.jpg	\N	\N	\N	Hb3YuaMhDfh-eznH	2026-04-25 17:00:36.872+00
s9bdxa-bAUvChL80	fanart	image	https://r2.dan.tw/fanarts/a44fd11ec61ced6de946810d1940a98b.jpg	https://pbs.twimg.com/media/HE5x7DNaAAAXhqg.jpg	https://pbs.twimg.com/media/HE5x7DNaAAAXhqg.jpg	\N	\N	\N	qksN84QOXoxrpjML	2026-04-25 17:00:38.663+00
GdY-0V_Gwltgj_PN	fanart	image	https://r2.dan.tw/fanarts/89054ab223aafc0b5f13cc3165366318.jpg	https://pbs.twimg.com/media/HE4ofzKb0AAbdmu.jpg	https://pbs.twimg.com/media/HE4ofzKb0AAbdmu.jpg	\N	\N	\N	FKMnGDGKdsI1Phqz	2026-04-25 17:00:40.529+00
LCISiuM2kiIsrARF	fanart	image	https://r2.dan.tw/fanarts/2043a614b8279f4955441720d1086e4b.jpg	https://pbs.twimg.com/media/HEzJQINbYAAV4WJ.jpg	https://pbs.twimg.com/media/HEzJQINbYAAV4WJ.jpg	\N	\N	\N	tLc817fncKa1wh43	2026-04-25 17:00:44.682+00
\.


--
-- Data for Name: media_groups; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.media_groups (id, title, source_url, source_text, author_name, author_handle, post_date, status) FROM stdin;
-6DYmiNKbZMd1zf6	\N	https://x.com/i/status/2045176169226748198	#ずとまよファンアート	umi	uu_ztmy	2026-04-17 16:22:50+00	organized
tAp-QIs973CuPWOg	\N	https://x.com/i/status/2045155462627344878	微熱魔 🎂1周年 \n #ずとまよファンアート	めち🍨♡にら埋め㌠	CREAM___ZTMY	2026-04-17 15:00:34+00	organized
vfiTBtE7T0mbpPSr	\N	https://x.com/i/status/2039736323972686082	🏹  Medianoche 🥀\n#ずとまよファンアート	こもも	komottyan0_0	2026-04-02 16:06:50+00	organized
TTP8tirhLv-2Pb0i	\N	https://x.com/i/status/2043281569864147291	#ずとまよファンアート\n\nTVアニメ『ZUTOMAYO CARD -THE BATTLE BEGINS-』\n████年4月より放送開始★\n\n☀️一期OPテーマ🌙\nずっと真夜中でいいのに。\n『ultra魂』\n\n言い切った正義に、答えなんてない！	ryo9	ryo9_	2026-04-12 10:54:23+00	organized
8THSjco1HePx77dk	\N	https://x.com/i/status/2040432210151661774	🧡💙\n#ultra魂　\n #ずとまよファンアート	あぁる	a1dblan	2026-04-04 14:12:02+00	organized
VhMszXJUoWTPvv7d	\N	https://x.com/i/status/2039885212977709192	ultra魂\n#ずとまよファンアート	とまと🎖️	tomatoztmy	2026-04-03 01:58:28+00	organized
jVmJzIERd2pUCOsq	\N	https://x.com/i/status/2039712813703409980	#ずとまよファンアート\n🌙ultra魂🌟	果て	h4t_es4n	2026-04-02 14:33:25+00	organized
nP8fj_LdWsHqobFN	\N	https://x.com/i/status/2039692946061295638	★★★森羅万象★★★\n#ずとまよファンアート\n#ultra魂	にぃはち	tachikuramean	2026-04-02 13:14:28+00	organized
cOk3nn7nI3VApk4Y	\N	https://x.com/i/status/2039612975284449753	⭐️ultra魂⭐️\n#ずとまよファンアート	あんず	Nachi_o0	2026-04-02 07:56:42+00	organized
ML_9gDcpx6jp8JHO	\N	https://x.com/i/status/2044386126375608825	#ずとまよファンアート\n#ピギーワン	さじこ。	_saziko	2026-04-15 12:03:30+00	organized
epVMkj7_OybUsNR2	\N	https://x.com/i/status/2043271791670665303	海馬 \n #ずとまよファンアート	とかげ	tokage_6666	2026-04-12 10:15:31+00	organized
m61rubOHLQud3n49	\N	https://x.com/i/status/2042448855523061901	ﾐﾗﾁｭ\n\n #ずとまよファンアート	とかげ	tokage_6666	2026-04-10 03:45:28+00	organized
2N1Wdj-5yjLkl6gs	\N	https://x.com/i/status/2041172337828274209	#ずとまよファンアート\nミラーチューン4周年おめでとうござます‼️✨🔫	ぬぺ	Nupeee_ZT	2026-04-06 15:13:03+00	organized
0wGp6biUerwJZMuX	\N	https://x.com/i/status/2044578062709498067	人類なんだしー♪\n #ずとまよファンアート #TAIDADA	猫震🐈🫨	byoshin_catalog	2026-04-16 00:46:11+00	organized
uAJXaEAO0QTMmX68	\N	https://x.com/i/status/2044053686813634918	#ずとまよファンアート\n\nぶーーーーーーーーーん！(ﾄﾞﾔ顔 )(コラボ発表おめでとうございます)	朝a.s.a🧟🦀城ﾎ①②	noDES_program	2026-04-14 14:02:30+00	organized
S6k-MGCpxc0AJ-Jz	\N	https://x.com/zutomayo/status/2047675683154133410	ずとまよおおさか\nありがとよおおお\n新しいギターかき鳴らし\n切った髪振り乱してきたよおお	ACAねこスキル (ずっと真夜中でいいのに。)	zutomayo	2026-04-24 13:55:01+00	unorganized
9F7SMeWf3XRaz3Xz	\N	https://x.com/zutomayo/status/2047609164630048861	RT @zutomayo_staff: ヤマハ発動機xずっと真夜中でいいのに。\n「Fazzio」 展示中　　#名巧音楽館	ACAねこスキル (ずっと真夜中でいいのに。)	zutomayo	2026-04-24 09:30:42+00	unorganized
KY331gxO2OSWvEe6	\N	https://x.com/zutomayo/status/2045331490264019082	RT @zutomayo_staff: 【LIVE】　#ゾンクラ\n横浜・神戸公演 一般発売\nチケット一般先着受付開始\n↓詳細\nhttps://zutomayo.net/intense2/\n✴︎Overseas residents are also able to apply	ACAねこスキル (ずっと真夜中でいいのに。)	zutomayo	2026-04-18 02:40:02+00	unorganized
oQ-EpHTdZvooqGxU	\N	https://x.com/zutomayo/status/2045169370679447666	zombie crab labo in singapore \narigato lah ~.’\nI go makan chilli crab already…wkwk	ACAねこスキル (ずっと真夜中でいいのに。)	zutomayo	2026-04-17 15:55:50+00	unorganized
YeYNN2qmOEyZhsqP	\N	https://x.com/zutomayo/status/2041894874459599133	難度★★★★ 嘘じゃない\nジンジャーさん、がんばったよ	ACAねこスキル (ずっと真夜中でいいのに。)	zutomayo	2026-04-08 15:04:09+00	unorganized
Vt_iLMut0__p-Cjh	\N	https://x.com/zutomayo/status/2048026894193606863	大阪ゾンクラ爆烈でした\nあいよーーーー(aiyoh)	ACAねこスキル (ずっと真夜中でいいのに。)	zutomayo	2026-04-25 13:10:36+00	unorganized
lzvlBsmESttRHYQ6	\N	https://x.com/zutomayo_art/status/2046447079107809350	RT @uu_ztmy: #ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-21 04:32:59+00	unorganized
5ZBeTCPe0eo5145B	\N	https://x.com/zutomayo_art/status/2046447028788765105	RT @CREAM___ZTMY: 微熱魔 🎂1周年 \n #ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-21 04:32:47+00	unorganized
v04mXMVuvFZioLJA	\N	https://x.com/zutomayo_art/status/2046446716573086097	RT @byoshin_catalog: 人類なんだしー♪\n #ずとまよファンアート #TAIDADA	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-21 04:31:33+00	unorganized
e3oZ1hYhvukBanVR	\N	https://x.com/zutomayo_art/status/2046446385164370231	RT @_saziko: #ずとまよファンアート\n#ピギーワン	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-21 04:30:14+00	unorganized
cRq1Dx8bAN_TpvL3	\N	https://x.com/zutomayo_art/status/2044299390047924564	RT @noDES_program: #ずとまよファンアート\n\nぶーーーーーーーーーん！(ﾄﾞﾔ顔 )(コラボ発表おめでとうございます)	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:18:50+00	unorganized
G1is1GyerPtnS3-O	\N	https://x.com/zutomayo_art/status/2044298892704133460	RT @tokage_6666: 海馬 \n #ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:16:51+00	unorganized
JUCqnKVfywVoKg1W	\N	https://x.com/zutomayo_art/status/2044298566018146314	RT @tokage_6666: ﾐﾗﾁｭ\n\n #ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:15:34+00	unorganized
Lh1DGOV53BAN-QEt	\N	https://x.com/zutomayo_art/status/2044297459023949983	RT @Nupeee_ZT: #ずとまよファンアート\nミラーチューン4周年おめでとうござます‼️✨🔫	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:11:10+00	unorganized
GRe9-SjL_OFb22HB	\N	https://x.com/zutomayo_art/status/2044297110376591854	RT @a1dblan: 🧡💙\n#ultra魂　\n #ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:09:46+00	unorganized
eIxPKWDc6qC-2SjA	\N	https://x.com/zutomayo_art/status/2044296855056724220	RT @junk1603: つままれシリーズまとめ最新版です　やっと追いついた\n#ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:08:46+00	unorganized
EpoypTwD_R_JRwjO	\N	https://x.com/zutomayo_art/status/2044296641344381259	RT @Appgle_ztmy: ZUTOMAYO INTENSE II\n坐・ZOMBIE CRAB LABO\n横浜！\n\n#ゾンクラ\n#ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:07:55+00	unorganized
iMs31WLaCVZnX4Zp	\N	https://x.com/zutomayo_art/status/2044296265392152737	RT @tomatoztmy: ultra魂\n#ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:06:25+00	unorganized
Q8ZxP5Sl6YHAJDbP	\N	https://x.com/zutomayo_art/status/2044296115370242311	RT @komottyan0_0: 🏹  Medianoche 🥀\n#ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:05:49+00	unorganized
Hb3YuaMhDfh-eznH	\N	https://x.com/zutomayo_art/status/2044296055043568107	RT @h4t_es4n: #ずとまよファンアート\n🌙ultra魂🌟	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:05:35+00	unorganized
qksN84QOXoxrpjML	\N	https://x.com/zutomayo_art/status/2044295778676719767	RT @tachikuramean: ★★★森羅万象★★★\n#ずとまよファンアート\n#ultra魂	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:04:29+00	unorganized
FKMnGDGKdsI1Phqz	\N	https://x.com/zutomayo_art/status/2044295467257999670	RT @Nachi_o0: ⭐️ultra魂⭐️\n#ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 06:03:15+00	unorganized
tLc817fncKa1wh43	\N	https://x.com/zutomayo_art/status/2044294614535012817	RT @a1dblan: メディアノーチェ❤️‍🔥\n#ずとまよファンアート	ずとまよ絵描き隊(公式)	zutomayo_art	2026-04-15 05:59:51+00	unorganized
\.


--
-- Data for Name: mv_albums; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.mv_albums (mv_id, album_id, track_number) FROM stdin;
nareai-serve	QBTA6vPoXSRBVFj9	0
blues-in-the-closet	q8Dm5ywHYtJivS4R	0
pain-give-form	vZqqupt2jyIfVMRi	0
blush	QBTA6vPoXSRBVFj9	0
summer-slack	QBTA6vPoXSRBVFj9	0
neko-reset	Jq9zo8DmIuX0KK0g	0
neko-reset	QBTA6vPoXSRBVFj9	0
kansaete-kuyashiiwa	d7L_zQaG2v1brzmr	0
kansaete-kuyashiiwa	_qlhXzOVa_PeYiMe	0
ones-mind	uPDUTnP5rvR6S7-0	0
dear-mr-f	_qlhXzOVa_PeYiMe	0
konnakoto-soudou	_qlhXzOVa_PeYiMe	0
kettobashita-moufu	_qlhXzOVa_PeYiMe	0
mabushii-dna-dake	d7L_zQaG2v1brzmr	0
mabushii-dna-dake	_qlhXzOVa_PeYiMe	0
humanoid	Bor8z3FlL2xN5m4K	0
humanoid	_qlhXzOVa_PeYiMe	0
seigi	d7L_zQaG2v1brzmr	0
seigi	_qlhXzOVa_PeYiMe	0
fastening	abCVmITGcauJccCF	0
fastening	uPDUTnP5rvR6S7-0	0
zutorao	mIWLLTOIuZfe82HI	0
ham	abCVmITGcauJccCF	0
hippocampal-pain-p3r	mIWLLTOIuZfe82HI	0
cream	vZqqupt2jyIfVMRi	0
nouriueno-cracker	Bor8z3FlL2xN5m4K	0
nouriueno-cracker	_qlhXzOVa_PeYiMe	0
haze-haseru-haterumade	_qlhXzOVa_PeYiMe	0
inemuri-enseitai	_qlhXzOVa_PeYiMe	0
truth-in-lies	q8Dm5ywHYtJivS4R	0
truth-in-lies	vZqqupt2jyIfVMRi	0
time-left	QBTA6vPoXSRBVFj9	0
warmthaholic	vZqqupt2jyIfVMRi	0
medianoche	vZqqupt2jyIfVMRi	0
ultra-soul	vZqqupt2jyIfVMRi	0
darken	uPDUTnP5rvR6S7-0	0
hippocampal-pain	q8Dm5ywHYtJivS4R	0
hippocampal-pain	vZqqupt2jyIfVMRi	0
mirror-tune	QBTA6vPoXSRBVFj9	0
stay-foolish	Jq9zo8DmIuX0KK0g	0
stay-foolish	QBTA6vPoXSRBVFj9	0
hanaichi-monnme	QBTA6vPoXSRBVFj9	0
cant-be-right	uPDUTnP5rvR6S7-0	0
kuzuri	q8Dm5ywHYtJivS4R	0
kuzuri	vZqqupt2jyIfVMRi	0
byoushinwo-kamu	Bor8z3FlL2xN5m4K	0
byoushinwo-kamu	_qlhXzOVa_PeYiMe	0
milabo	abCVmITGcauJccCF	0
milabo	uPDUTnP5rvR6S7-0	0
taidada	q8Dm5ywHYtJivS4R	0
taidada	vZqqupt2jyIfVMRi	0
shade	vZqqupt2jyIfVMRi	0
kira-killer	QBTA6vPoXSRBVFj9	0
inside-joke	Jq9zo8DmIuX0KK0g	0
inside-joke	QBTA6vPoXSRBVFj9	0
yomosugara	vZqqupt2jyIfVMRi	0
quilt	Jq9zo8DmIuX0KK0g	0
quilt	QBTA6vPoXSRBVFj9	0
intrusion	QBTA6vPoXSRBVFj9	0
study-me	abCVmITGcauJccCF	0
study-me	uPDUTnP5rvR6S7-0	0
hunch-gray	uPDUTnP5rvR6S7-0	0
\.


--
-- Data for Name: mv_artists; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.mv_artists (mv_id, artist_id, role) FROM stdin;
nareai-serve	QE4JV27h05ZQRro7	unknown
blues-in-the-closet	xd6TgubINllED7x1	unknown
pain-give-form	RbNFIZ4ecTrcM92Z	unknown
blush	K3KVGFC2No9fBJQs	unknown
summer-slack	D3t3xtROCoubaQi2	unknown
neko-reset	Vj56t8u12q9eg_B0	unknown
kansaete-kuyashiiwa	qOLdZTNFKsK1GGoQ	unknown
ones-mind	QA8NJYRnN6hnSXnt	unknown
dear-mr-f	_1cwF5-kgLXvctcI	unknown
konnakoto-soudou	qOLdZTNFKsK1GGoQ	unknown
kettobashita-moufu	KoE1-60xXKKS_hQr	unknown
mabushii-dna-dake	qOLdZTNFKsK1GGoQ	unknown
humanoid	qOLdZTNFKsK1GGoQ	unknown
seigi	KoE1-60xXKKS_hQr	unknown
fastening	KoE1-60xXKKS_hQr	unknown
zutorao	RmtKtzeraxdkdhnZ	unknown
ham	xd6TgubINllED7x1	unknown
hippocampal-pain-p3r	9z4L5nhmLjANyHto	unknown
cream	RmtKtzeraxdkdhnZ	unknown
nouriueno-cracker	ex6Z8Noialbsnzqf	unknown
haze-haseru-haterumade	ex6Z8Noialbsnzqf	unknown
inemuri-enseitai	ex6Z8Noialbsnzqf	unknown
truth-in-lies	ehDXy8I-KuLkuqZq	unknown
time-left	RmtKtzeraxdkdhnZ	unknown
warmthaholic	xd6TgubINllED7x1	unknown
medianoche	RmtKtzeraxdkdhnZ	unknown
ultra-soul	J2F9B2qgyUJp_8Gy	unknown
darken	ehDXy8I-KuLkuqZq	unknown
hippocampal-pain	RmtKtzeraxdkdhnZ	unknown
mirror-tune	RmtKtzeraxdkdhnZ	unknown
stay-foolish	RmtKtzeraxdkdhnZ	unknown
hanaichi-monnme	KoE1-60xXKKS_hQr	unknown
cant-be-right	z29cCP6RG2OqNmQE	unknown
kuzuri	ex6Z8Noialbsnzqf	unknown
byoushinwo-kamu	ex6Z8Noialbsnzqf	unknown
milabo	ex6Z8Noialbsnzqf	unknown
taidada	xd6TgubINllED7x1	unknown
shade	KoE1-60xXKKS_hQr	unknown
kira-killer	34XbBTibb0STDXRO	unknown
inside-joke	327XL29c6Sa5CYwj	unknown
yomosugara	xd6TgubINllED7x1	unknown
quilt	J2F9B2qgyUJp_8Gy	unknown
intrusion	xd6TgubINllED7x1	unknown
study-me	ehDXy8I-KuLkuqZq	unknown
hunch-gray	34XbBTibb0STDXRO	unknown
\.


--
-- Data for Name: mv_keywords; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.mv_keywords (mv_id, keyword_id) FROM stdin;
nareai-serve	2tf8X1VfXupe9WaH
nareai-serve	lRdd6HpfCwYNJuhV
nareai-serve	lZkQy7XDxCtsJmLE
nareai-serve	qA6cNJJz4WbNYbZP
nareai-serve	NwQKUNEZ8zpBUwQA
nareai-serve	Eg3m1ThXwLD_04a6
nareai-serve	x3xKaxgARKi8g_AW
blues-in-the-closet	f-zkGZTIH26WB31r
blues-in-the-closet	Lm22Yt2O-E2pjGDu
blues-in-the-closet	V1JujBcBdvYKu_Wa
blues-in-the-closet	nmoUERiOUwNWi9rg
blues-in-the-closet	OqQP-RqxBlRNriDr
blues-in-the-closet	acVI_7DDZmB6Ad39
pain-give-form	HV7wQaN8Zfghfj8Y
pain-give-form	TdXwc_GJSr50omPh
pain-give-form	lLK6rsa4G1yqyJYt
pain-give-form	2X2mGctDbM1xOSrh
pain-give-form	PHmVglMT0HBKqEfS
pain-give-form	DYVe7aKqTzYLbtHi
blush	ziMdwZ9Ki1ZpncWn
blush	SMuDyWVLq5dxm5QA
blush	mTWWJQlr2dI__PhY
blush	ubIV1FUl0slQdAl7
blush	dd2g5F7aaxeOWB0S
blush	ADaSdbVVwNTzEfDg
blush	KaeU5-HxqaAEaOCf
blush	lNs4pK2Wz30GH8cT
blush	D-O2q_JUSAMJExt_
summer-slack	MvAEq9hbJNSMwNsV
summer-slack	MOPjI7hDhmE7C_pX
summer-slack	0vwoU9-18LDF-3AQ
summer-slack	tyT7Lprzr_8NwMgT
summer-slack	VCIvFhH0txl_lozL
summer-slack	RNuEP3i34r5VJDpu
summer-slack	KaeU5-HxqaAEaOCf
summer-slack	lNs4pK2Wz30GH8cT
summer-slack	D-O2q_JUSAMJExt_
neko-reset	E0_6he9pjps8-2_T
neko-reset	Ecw5ZPNwpuTOogLp
neko-reset	ilnueAHgaRE1sltb
neko-reset	v-05PcSxzxG8VzjA
neko-reset	mueVNGHsGO9rQjWd
neko-reset	LlHQRl35XtVgRmkw
kansaete-kuyashiiwa	1iVlinP52WNmcfEE
kansaete-kuyashiiwa	AHA787pe6qyXyDMa
kansaete-kuyashiiwa	JM_Yye2d1VwdM38W
kansaete-kuyashiiwa	6wxinz_qDmk2Wdx2
kansaete-kuyashiiwa	7sjdJhPqwikjF3Ta
kansaete-kuyashiiwa	OhpcOemniXAh06BE
ones-mind	C6oZDtceUZ7hNG1i
ones-mind	EFybMikeb37K-gOL
ones-mind	khw8NPevwYqxPgKb
ones-mind	QQaw3qvHkl1Lv5k5
ones-mind	WVvrslDjFoubkmt1
ones-mind	p5bCh5rxyc69sR_U
ones-mind	BAOqN4t7k_3rM5IL
ones-mind	f2RBIAtcOCAWxdpy
ones-mind	DEUTrCemGvFuAlzu
dear-mr-f	3GihFW3eGBeTSE8U
dear-mr-f	iGNCy1Z_nYU1kqwK
dear-mr-f	VOf080KOm92i9hVh
konnakoto-soudou	kU44urCrK1KNfRYy
konnakoto-soudou	GpkyeLMflzYTyW_G
konnakoto-soudou	b3Ymb-9exdVllhhH
konnakoto-soudou	jlIqIHni71Eb2nLs
konnakoto-soudou	y7BqnYCIgb4rYaBO
kettobashita-moufu	LaSyqcCHBBEd7_J_
kettobashita-moufu	zeeT_DL2A7Pyjbne
kettobashita-moufu	RSn5MYuNP-o0kvRF
kettobashita-moufu	zuszFtnX0k30rx3I
kettobashita-moufu	w-o9PEjuXIKZrDjZ
mabushii-dna-dake	gEEpe5m-AZJkKwvC
mabushii-dna-dake	ryjltc3X9MMRQ99C
mabushii-dna-dake	pV0VHrrEkjZ9nbdt
mabushii-dna-dake	L9QmZUxoDr-xdikN
mabushii-dna-dake	utueviPC1IDdz27T
humanoid	lwvx8ylWTeAAqnZP
humanoid	4llnWdrV6auJ4YbQ
humanoid	NfJxcM38Z25ehKdX
humanoid	HHfyvOAe6VGbNMaE
seigi	nqrkf7kpU8LW75lY
seigi	nzRsJLq1uMd_jpyP
seigi	pUBQFEYEv0Kn_ACC
seigi	Iz3CYkFz1guky4pu
seigi	PUmsuaQCYCcsm2UW
fastening	QKRLfvuqPz1ZTKwX
fastening	K7UuaVdcOJuBED7e
fastening	MkTt2ne2s5vZCGYY
fastening	oEmchzejw6st5UA_
fastening	L0Nbzgs7NF4Ureui
fastening	wS5WHkKQnK1T1xeN
fastening	YzUYja2PhIO13W_8
zutorao	N7waWi2YhTVS7Uya
zutorao	L8tDwUXRrIYnKJev
zutorao	QxsD1JrvE_S_jzfH
zutorao	HR4EntpYZUp1Fwnd
ham	x6pSqQMa63ywA7GB
ham	5su-2J62PG9_n_Av
hippocampal-pain-p3r	Hg-2AU-pmxHDOr0n
hippocampal-pain-p3r	W_X8SdHpXmIsHE3Z
hippocampal-pain-p3r	uRRQdVfKsCdSi0fm
hippocampal-pain-p3r	XmsfF_6xHtozt38e
hippocampal-pain-p3r	k1SLFk3iDR1t_JiH
cream	u_t2IoLnp2bXiATW
cream	EtAWosaUXelONgxO
cream	6GHM8zwyddETVYuk
cream	ev-6oY9NPlrsyJmt
cream	TWzUsvRIdWCuk38t
cream	kG_ubUWu2vICfhgp
cream	iJNv0yGSNOP9ZJkA
nouriueno-cracker	RnI2J3J5vx42hDX1
nouriueno-cracker	j0VPzgbMJ_-AS1uE
nouriueno-cracker	xoZLoGHrfbX0hmLC
nouriueno-cracker	VyLcvkeH-8PRccg_
nouriueno-cracker	gTI5P-0eIX3i1RMf
nouriueno-cracker	OchGktp8ro2P1ND-
nouriueno-cracker	d4CNbZqM4MtDGaCi
haze-haseru-haterumade	wqqPOTscU04F08c8
haze-haseru-haterumade	HDqb_KY7hWYA-Fy7
haze-haseru-haterumade	PyZoPxKd9Npwon_t
haze-haseru-haterumade	GoSePGLBzIW-OXVU
haze-haseru-haterumade	REBtirf3YubPqDch
haze-haseru-haterumade	P0Feu2wbGju3an-G
inemuri-enseitai	6wBrsfk-ESDTCZcQ
inemuri-enseitai	XsrvRfPhBOxw7Jfx
truth-in-lies	w5T5Kz8Bj5uexw-h
truth-in-lies	WoPqu-E8iXbA7iPb
truth-in-lies	Begmim9kUTxue0wq
truth-in-lies	2iCYJQT_HFXJchfT
truth-in-lies	Gs2FA14zqz3oPlXm
truth-in-lies	GmfdG2s-cNZg-7Oq
truth-in-lies	vCsX0895EdZOunsc
truth-in-lies	hrjxknGNkoYUfRPO
truth-in-lies	nmoUERiOUwNWi9rg
truth-in-lies	OqQP-RqxBlRNriDr
truth-in-lies	acVI_7DDZmB6Ad39
time-left	M6kWT6a74LggZYYb
time-left	Elr5shaZZFoqAWbE
time-left	IuB3il81g-G9GeLW
time-left	XbO9fB26877wKCti
time-left	-WIk21RW2jwQOBaH
time-left	Du0gGSh7Ug38QVxu
time-left	vYZ7NE_YlOBDyhVk
time-left	qQSVLdMA5BGN_7-i
time-left	6-Pg9rQ9JxX9_ii1
time-left	d_y-8Dpk6oPx_PLk
warmthaholic	pzcgHBweiqCfTUbD
warmthaholic	XB0wBSZxQ-mtocdp
warmthaholic	5_8XH2nUIpceF2no
warmthaholic	cF4bf5raAzLWsR9y
warmthaholic	9MG1072Xuapso56A
warmthaholic	EQFJrpAhAwIUNQTb
medianoche	eOFlm32gkAcjD2mL
medianoche	b4g8eMF3kAqC-KwM
medianoche	M_2WKmQYb3fXxLmy
ultra-soul	H5yeHv5eETOtQK66
ultra-soul	3e0TN30QRnKJldF3
ultra-soul	M9AB809x6uJR35Oq
ultra-soul	sBy17hGM5hxHaaN3
ultra-soul	KXUXr_XZQpvEgxDh
ultra-soul	lmr1p0JnW6LUtuoW
ultra-soul	aVt4Yb-VeFQfGtaA
ultra-soul	Em0sfvPAb2mig5ma
ultra-soul	hQxMmmOvEAD27TAf
darken	5GkLQ_XNT687J359
darken	7aWlWIIZfWWqIr4O
darken	wNh0gTRhcq5xOVu3
darken	Kj82wvfwO2k6Nl9p
darken	D1vd4dsUOiKKkWvU
darken	ERM840B2O8ALXjhr
darken	V4Mg750yG2vVMR2O
darken	hTrZEsvNeaaW9Wam
darken	Qto4_Jb5hsGtiBAt
hippocampal-pain	lRjrVO5EYntL6t7J
hippocampal-pain	VovZbCn3vYaNAGbb
hippocampal-pain	EA1r0CN-W8mZEPGz
hippocampal-pain	P_-0gB4WcBdcrkxU
hippocampal-pain	6hIYp6nF7nNdqZEX
hippocampal-pain	3-hxwMNhY_SIjdpB
mirror-tune	rLtXzJkFEVZwRjWR
mirror-tune	EZbCh8qJKxs_OiTA
mirror-tune	cpv8JfCvXML-Zjpo
mirror-tune	C7EYKXRcQxxEhKiX
mirror-tune	2_-mSSgveT1n1AV0
mirror-tune	y4f32hJyaSRlPVZ4
stay-foolish	QOEsU5_TK9YYrAL5
stay-foolish	5GxzaZggodq5dJCK
stay-foolish	jwDLK7IcegBaMN3F
stay-foolish	_hKDZ2tHU6S_17cp
stay-foolish	e2TvLZTUfkH-v8q-
stay-foolish	dy535OB3guSk7Y5M
stay-foolish	VL2wmOw21yJt4xe6
hanaichi-monnme	Su7mUNbvL5V_1d2w
hanaichi-monnme	_tJ43AyX1ABwl-8n
hanaichi-monnme	rLd70sVvHazMBgmY
hanaichi-monnme	kSkh5vwUea7ytmc3
cant-be-right	Eqnzha5FU4FTzr4r
cant-be-right	fxmrrc19xP96WMft
cant-be-right	oI43xNICz9F-NzGz
cant-be-right	8H0L4YF6sVKDL0Mf
cant-be-right	pJ7PrAIraj5sFZts
cant-be-right	SUV7cLKyOdehWwrZ
cant-be-right	e3Eso2LuyPvu2TOl
cant-be-right	jkVMsw5H7gjr2MW1
kuzuri	z5IwTX7AQnFcb1VU
kuzuri	NIjbGyA5dqWJhtfk
kuzuri	4GckIgRZUhPTO3-v
kuzuri	3bkWypPVb5Mi3kEt
kuzuri	uL332kjYTU1yTRV4
kuzuri	jxKJLaMtuaipc0a_
byoushinwo-kamu	Q44KCvv4BZQnWQCO
byoushinwo-kamu	GTDwZGENN1J3Gxz6
byoushinwo-kamu	u51Zjt9Hj4RWhmOA
byoushinwo-kamu	63_faP6Dpf99zO9a
byoushinwo-kamu	_mVYOXQaGkuYOkeJ
byoushinwo-kamu	ktTLAFENmAImTaai
byoushinwo-kamu	SIBr62_7Nfg5onpt
milabo	vYbBPeTMW8Ywtv4d
milabo	CM25Cwp6txn5y1PK
milabo	t37b42WEKaJ-WjXJ
milabo	jfFeytmTBZHktE3z
taidada	51qyr_2z16HA1LWV
taidada	XNrOkJxHNSd5UutA
taidada	UKsnm-L1-EeYHWyQ
taidada	cFGdkXkvcoxUl-8B
taidada	Zb7wAc-nCdkWtLvF
taidada	dZpO8HngjNuKH-0x
taidada	WETKK1yLJat6dTs-
shade	Kc5MeCHfI1IFJEhT
shade	JrW8BDmf7mijaaDX
shade	Kef96WGxiJ1XdRNZ
shade	-M334rEg4NMYiOeU
shade	2d94b05EEi3u8xAw
shade	iGRKXFehqUlX2_gh
shade	ZLRdefZP9FUQAv8S
kira-killer	EoVxNolZA6jSAhXt
kira-killer	DCRJomlEcaT4FTtf
kira-killer	ZC8M2psBbTEVeGK3
kira-killer	GJQbvT7LTiB06iOC
kira-killer	9tyG34L3XcFLOvcZ
kira-killer	oIPEHl7weOgE_sH-
inside-joke	Px2NaoyNTyMpBEQd
inside-joke	r9yy8Bpazqgt7bxm
inside-joke	yN1clHN9o2HZsii-
inside-joke	-edLly6YszAToRoO
inside-joke	Xf6O0A7mI2DpAIfh
inside-joke	JqRlle0I3Tik0h_q
inside-joke	PcwdJc_kMdOVo5t3
inside-joke	Fz3PyLTwFJfX1iFH
inside-joke	yhk_ctKdJMeCajBG
yomosugara	TRMS_mnwq0OP8USZ
yomosugara	NeRnlONRFMlDn0ih
yomosugara	ZCfkjDtaLEf-af16
yomosugara	CSOZm6ovJUjbatQM
yomosugara	kthffS1btnnmEccp
yomosugara	uMysQVy5DQzMUqvh
quilt	vko9BLIh5vcSnxzb
quilt	rJBpXYi1mvqokm9C
quilt	UeCFbs-Pqb1Rp6cJ
quilt	Krc8GR66BIR5vrKp
quilt	qiIc7IHJDmriAGhb
quilt	S94mLbWkgcP0yshT
quilt	56DYpWpnYHTlDbBB
quilt	OLZKmdDSlvh1Edw0
quilt	2WfmQsuo04OFc7VT
intrusion	wXDm-CDR90iEOcLX
intrusion	dXbJ51EgrrB3Nukj
intrusion	P-N5kIfCrdrMLi27
intrusion	ctrv8-hg3nWAIoBi
intrusion	zc7136LwvhRoXln9
study-me	WN7858JugnA4JZZY
study-me	OYOv5snRSAXX6gay
study-me	RMhfFY2ctwevt300
study-me	6uoRgPsU2VRdiJLT
study-me	TSYddlEmVP23r5OA
study-me	R7_RFt57nz1pFli6
study-me	4EG1dTxLW0YeMFdW
study-me	NwIHMr_OXG1snnQZ
study-me	c1R4Gih8iA4uTRJz
hunch-gray	8_IpzdBKXdAGNT_S
hunch-gray	MzTrSBZz_UDV94ql
hunch-gray	8Gi1rmzeU1WgteWh
hunch-gray	wFwM70HrxXiQqdby
hunch-gray	wJ9urUT6GurSNPjY
hunch-gray	LojcrL3qM5Mm2lo1
hunch-gray	3JC9_oJtbWsbxJ0V
hunch-gray	4bk5FVAuIvqVuxcd
\.


--
-- Data for Name: mv_media; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.mv_media (mv_id, media_id, usage, order_index) FROM stdin;
nareai-serve	GvDFtmu3hepgMIcI	cover	0
nareai-serve	1OS7yDDfNK8UMWMx	cover	1
nareai-serve	bNCu1EgDd1eAGcht	cover	2
nareai-serve	N5xIde7vQtSYRxJm	cover	3
blues-in-the-closet	rM_ZmF19XpxNPi_B	cover	0
blues-in-the-closet	nwxt9v2xpECRurPx	cover	1
blues-in-the-closet	bLNpI-a_kiosqxVQ	cover	2
blues-in-the-closet	7YVbmqfKOFF0skRt	cover	3
blues-in-the-closet	nO-pRVQrj1CsiAVV	gallery	0
blues-in-the-closet	aHxklt2VNxlqPgjI	gallery	1
blues-in-the-closet	HBGzx9TdJgoI2QKr	gallery	2
blues-in-the-closet	PQ7Wdevgb3jiv28u	gallery	3
blues-in-the-closet	QBuelQP1EMF7YBT9	gallery	4
pain-give-form	IDE7DyvjiFDeCvpe	cover	0
pain-give-form	bwFtH2cNg5Xk-0xk	cover	1
pain-give-form	Z-12RALpDJLOTt59	cover	2
pain-give-form	JK5FsKnHowecLqqT	cover	3
pain-give-form	naUKPDHWCoI-xGo1	gallery	0
pain-give-form	eKAg2I3qRVh-r9L-	gallery	1
pain-give-form	eYovBosPg8wmuGy-	gallery	2
pain-give-form	dKJY58S_MB9PS_Tj	gallery	3
pain-give-form	VzsZzSmUVHMbKp1U	gallery	4
pain-give-form	XolruHKO0PO-r3HW	gallery	5
pain-give-form	oQUpApvxEgc1mHQ7	gallery	6
pain-give-form	tHB_7iNG11bmZqyb	gallery	7
pain-give-form	TZFCjJgsu0x_0Ta9	gallery	8
pain-give-form	0_5Fm6iU8hiOrrbb	gallery	9
pain-give-form	WFQO9ZbTm6TAbDBS	gallery	10
pain-give-form	mgNfoA-s6rxfpOmn	gallery	11
pain-give-form	UW8Ag7Py7TN2VQOf	gallery	12
pain-give-form	tcDjy-fmSo7zj2Fd	gallery	13
pain-give-form	O6YyT-OVzQrFCUEA	gallery	14
pain-give-form	YG-gQAOAgLHqDRmV	gallery	15
pain-give-form	FTHLHPVxSfUDwtKD	gallery	16
pain-give-form	jdmpLTRwm0cufc-T	gallery	17
pain-give-form	5_11mDTpXYXUOeTo	gallery	18
pain-give-form	PVMxg6BgsK8Fh84t	gallery	19
pain-give-form	0z9ADBJsmbizFTAR	gallery	20
pain-give-form	3sPuYd6R83Uv95er	gallery	21
pain-give-form	ZJ-Ip6AOXaaITbsk	gallery	22
pain-give-form	rIE0FPLUhbDq0L7B	gallery	23
pain-give-form	n9j71OgsCKTtNRH_	gallery	24
pain-give-form	-edmRFrICw2iE3H7	gallery	25
pain-give-form	htoQU98FLgL9tdas	gallery	26
pain-give-form	tu5goDJ_5NNhbBqd	gallery	27
pain-give-form	NfyLUMEJvQIvyx_W	gallery	28
pain-give-form	lO1GRjSW6vhavNI9	gallery	29
pain-give-form	sggGbcy-5-UhKAQJ	gallery	30
pain-give-form	NdsUhPlhBA4hiKAv	gallery	31
pain-give-form	JbDJdliEZljsUP1O	gallery	32
pain-give-form	IJVwsDf0HpzUsbzh	gallery	33
pain-give-form	41B_KKy9zqkydLqK	gallery	34
pain-give-form	Rsa9pIpaHC4y-KwQ	gallery	35
pain-give-form	JGZtSHzA9lbzJGoP	gallery	36
pain-give-form	7czibaRiG24ztjQF	gallery	37
pain-give-form	D_sHMuj0Rma1VqE1	gallery	38
pain-give-form	Iz_KJZsX2pK_kWAh	gallery	39
pain-give-form	oXLT_NgE_2d3kGEo	gallery	40
pain-give-form	ojAfW5U0D6ezFnGT	gallery	41
pain-give-form	n2g7fqnfozS01VGC	gallery	42
pain-give-form	TT95KWZjEEv78X8G	gallery	43
pain-give-form	edUfRMkm4_3KGYfQ	gallery	44
pain-give-form	IVljgPWj7GKMqHDC	gallery	45
pain-give-form	N6AuFskBRioSSN-X	gallery	46
pain-give-form	zbh1N-Kg0iBC0xYa	gallery	47
pain-give-form	LUBeye_9JrlJGjCr	gallery	48
pain-give-form	6Jd4fpRZCCoifAHg	gallery	49
pain-give-form	hyIPcN-uQ9V5Sygd	gallery	50
pain-give-form	xISoZKVConfHK7QX	gallery	51
pain-give-form	I2TkfIRPovlO4PlC	gallery	52
pain-give-form	CUb4LyRc3LUjEPhf	gallery	53
pain-give-form	HdMOlRzgAIH_6P4n	gallery	54
pain-give-form	Jpmvuus1eR78MOx9	gallery	55
pain-give-form	OcPiwawBSw-0bE3s	gallery	56
pain-give-form	8FVkIMax_oGIx8PU	gallery	57
pain-give-form	l8Bk3GCeRIZAsmsx	gallery	58
blush	Zp9gXzfCqoN5SQpr	cover	0
blush	IJCUR9cEzd10FBuh	cover	1
blush	VpRiOmBsVg1Crw0I	cover	2
blush	I7744GVxaQbbPyzc	cover	3
summer-slack	NWdsxc2mhdwbxnxX	cover	0
summer-slack	YSCicxg-x19nAPgI	cover	1
summer-slack	hsVzr6dRQpR5bULI	cover	2
summer-slack	MK0-sYWu8ID2tlmI	cover	3
summer-slack	7DIKvLcQ6jviJDkf	gallery	0
summer-slack	CARsPBHOkxmA7m0u	gallery	1
summer-slack	WWi_O9r2UoWr6GWp	gallery	2
neko-reset	tr1wKNQBpKtN5VvK	cover	0
neko-reset	z5C2XiQGwk9cmNWl	cover	1
neko-reset	EXtEEsDizOgyE0tI	cover	2
neko-reset	sZctoXxfwg3ZRbMd	cover	3
neko-reset	t2tKe0Q2KjRZBKfY	gallery	0
neko-reset	axpuXMfjs2SyRxQI	gallery	1
neko-reset	82jQbfuP_Fj7Dacx	gallery	2
neko-reset	cTZITAbkTgt1MAFg	gallery	3
neko-reset	hNsy989UTmW7L9mJ	gallery	4
neko-reset	XgBFBrapoZra6z_8	gallery	5
kansaete-kuyashiiwa	wKe88A2F-vYbGwSD	cover	0
kansaete-kuyashiiwa	rbghRRDmRT9lJM0s	cover	1
kansaete-kuyashiiwa	upyco_j3mBoVPLjF	cover	2
kansaete-kuyashiiwa	F2u7fRhb5Kvveswc	cover	3
kansaete-kuyashiiwa	C2fTz8nNRXF1D3aT	gallery	0
kansaete-kuyashiiwa	6AmyhJG1FxKWl-OQ	gallery	1
ones-mind	F9KUkSupoIpLd-QH	cover	0
ones-mind	6f4fQrGjHOw5JX6R	cover	1
ones-mind	xzADBZMQJ7V5EV50	cover	2
ones-mind	iPksJrRVmE6IWa69	cover	3
ones-mind	9r8TYZTjWy0kg3T_	gallery	0
dear-mr-f	9ZuxQXINPtlTm9jF	cover	0
dear-mr-f	4ZaXWtdlrzu8IHt_	cover	1
dear-mr-f	db5FWcJuNjMFDv0K	cover	2
dear-mr-f	eIF1Occ55kWhxUvE	cover	3
konnakoto-soudou	inbtZLBs8GJIxPAK	cover	0
konnakoto-soudou	A62tb-yGIaLuhNCl	cover	1
konnakoto-soudou	D1a9l-waAh0jLLEx	cover	2
konnakoto-soudou	wVYcflXOYXQNVRgc	cover	3
kettobashita-moufu	Pe5zKXC8koZcoERq	cover	0
kettobashita-moufu	blVNTPsuVxgzo5jq	cover	1
kettobashita-moufu	PS5_RADg_LUOeFOK	cover	2
kettobashita-moufu	19gJG8eQswLMkfAi	cover	3
mabushii-dna-dake	_BwSSSUIpoj5oLKs	cover	0
mabushii-dna-dake	iQWtr91eMPs8WRoM	cover	1
mabushii-dna-dake	j-s0Mwqj_zVV0c_F	cover	2
mabushii-dna-dake	BvaleRw-GfymTwpW	cover	3
humanoid	5xeEfFaL1PqqpoYa	cover	0
humanoid	tx5Zty3UpDcpDTFJ	cover	1
humanoid	hSKwkTD0OK26En7U	cover	2
humanoid	4Za2xHkgm9uAZmNy	cover	3
seigi	VKeuYhxaz_MtBAge	cover	0
seigi	7X5llgkJEuqLayDZ	cover	1
seigi	kUFNobaudz-Hvjw5	cover	2
seigi	OZI99wrvBoX9w-2S	cover	3
seigi	II2dtby6dWdk1bip	gallery	0
fastening	iPQqC5BoZaHMXGM2	cover	0
fastening	ieIltQHNhK2VHP3B	cover	1
fastening	dYWFKCqte9BLf6Jl	cover	2
fastening	kzwZ0u3V2hG-ETpd	cover	3
fastening	aXJBDttKR65jVJDl	gallery	0
zutorao	2pKLjAitD1_AjV9j	cover	0
zutorao	A9XQPohU6L1lKvfU	cover	1
zutorao	U_5CBP6eJPOu5j7p	cover	2
zutorao	d9EQdGZMV8EHotAU	cover	3
zutorao	j7KnVBRmXYGaJrWs	gallery	0
zutorao	SxEfwDrOhAlDf7QI	gallery	1
zutorao	qr2qRtkzMhMWSxtE	gallery	2
zutorao	jJVZghtpMAqueIHf	gallery	3
ham	2kCtkV0GtxQ2tBaw	cover	0
ham	jhJKXxs6BQzzttmQ	cover	1
ham	5nsLK57QoSvrOZRf	cover	2
ham	iuRAZNALA3xOeX_r	cover	3
ham	fnY5FmPFItX3-8DQ	gallery	0
ham	hlvnNtbgusM8zs9G	gallery	1
ham	q8x2QNR9kQ4IQAe4	gallery	2
ham	zOrsqejGEKWNjFsM	gallery	3
ham	NTP1abbd9yi3Pier	gallery	4
ham	wB-sDTKV2igDXPBs	gallery	5
ham	jtT9rcd1pZ0pqZ-h	gallery	6
ham	4x5j4UIDkaxsM3sY	gallery	7
ham	0TfKkM7B-SaV5gam	gallery	8
ham	fc548VdbDtUb9ZUt	gallery	9
ham	pnuH778qOqTypEQE	gallery	10
ham	0XMz_uZAAFMQu8rG	gallery	11
hippocampal-pain-p3r	UxyVX3AiMEqnfKvi	cover	0
hippocampal-pain-p3r	LoY6VuWgwQoQX3Q4	cover	1
hippocampal-pain-p3r	O7APvOZIpImV48vN	cover	2
hippocampal-pain-p3r	SWtJAj7aBzYRimBi	cover	3
hippocampal-pain-p3r	_QtEomfoXjJN67AM	gallery	0
hippocampal-pain-p3r	rZzz_LSDTUpzOp9g	gallery	1
hippocampal-pain-p3r	ZdK1py13TqAaIRN_	gallery	2
hippocampal-pain-p3r	JllBMjJSpN7GUpUT	gallery	3
cream	t5AKnDsh7heG-1Fy	cover	0
cream	V682RYbyrSCQ-SVk	cover	1
cream	KkI-bEicM5BYCaeN	cover	2
cream	2dwOm90YhpcgUSVf	cover	3
cream	KYljH6xziiCQ8rHO	gallery	0
cream	W0jpD3PLNm4Zxid5	gallery	1
cream	IQ3yvJv8SswNIvTb	gallery	2
cream	dX403mkGza6-wULB	gallery	3
cream	MyiKLs-231HB89cb	gallery	4
nouriueno-cracker	QaOixPJAzYJlG9bs	cover	0
nouriueno-cracker	ssTfGw9ialHn9b9w	cover	1
nouriueno-cracker	eFx4jJCmJFsRcQiw	cover	2
nouriueno-cracker	0Z-9O5RCKsE0ewwJ	cover	3
nouriueno-cracker	zYJEFydRDVc48lWq	gallery	0
nouriueno-cracker	kXUH1GyC8Su5q-ce	gallery	1
haze-haseru-haterumade	IN-jPCkhr82_NaI5	cover	0
haze-haseru-haterumade	khB-PRcn4C_U0nuC	cover	1
haze-haseru-haterumade	RwQnSaqPhUc_ahYD	cover	2
haze-haseru-haterumade	o1Rq7FgbPlyjSFPX	cover	3
haze-haseru-haterumade	WgFT715k65zA0YE7	gallery	0
haze-haseru-haterumade	cOE-tezOkzLdWOpd	gallery	1
inemuri-enseitai	jzAuZN5beavN91wK	cover	0
inemuri-enseitai	jeXbDXBVIvSSyG9C	cover	1
inemuri-enseitai	blIBlWFK777ghSxO	cover	2
inemuri-enseitai	GspK_51BiFMAX6tQ	cover	3
truth-in-lies	Mt91mIJys5riWKdX	cover	0
truth-in-lies	AiThmypB5Lk31aS1	cover	1
truth-in-lies	M84Lo3ZSCCRsgCZs	cover	2
truth-in-lies	ZBzN619fgvXkQHvL	cover	3
truth-in-lies	v7h8tzfePiNEVNZs	gallery	0
truth-in-lies	tlow-EMuiCTmc21K	gallery	1
truth-in-lies	pqmXAnskr4Ai9bBQ	gallery	2
truth-in-lies	2l1VsLlmYEd6F6ne	gallery	3
truth-in-lies	yjez15XgefHm6dNy	gallery	4
truth-in-lies	wC7zNIg_o5tX-Ayh	gallery	5
truth-in-lies	fOPUybRi-OfJN2BT	gallery	6
truth-in-lies	QMAl-jIq187ikWPm	gallery	7
truth-in-lies	MBSEp_rvrgARwA5v	gallery	8
truth-in-lies	YyDWuvRy1vaH4EAN	gallery	9
truth-in-lies	6upc01zVWW-hdjUp	gallery	10
truth-in-lies	hcQ3Iz_E3BGQgkns	gallery	11
truth-in-lies	3g9m2qLVaWKZNowU	gallery	12
truth-in-lies	fckn_ZICzlDE43sF	gallery	13
truth-in-lies	LgncfV6Yw2YMuf8R	gallery	14
truth-in-lies	tX4E8dWr0ZJ92Bvt	gallery	15
truth-in-lies	PjEha4WNBI1y-3oC	gallery	16
truth-in-lies	9QKFzKwOyozr3KSU	gallery	17
truth-in-lies	GHjwDiAEyk1t6V_E	gallery	18
time-left	CGIzBc-waAJUDaGG	cover	0
time-left	7Kijg1uZXXm_q1XC	cover	1
time-left	5bLqKH4gNpdceC1j	cover	2
time-left	exbv_DBwpBaq0n-J	cover	3
time-left	JxYcnwAzVfcZJMTS	gallery	0
time-left	ZNaLxe1pNZuJE3MK	gallery	1
time-left	EHkuMxmvsgaNrJbS	gallery	2
time-left	S1UGVZS9T59rGb2f	gallery	3
time-left	g8mdk1I6xzNak4jd	gallery	4
time-left	ko8CMj9xiC4PKOAS	gallery	5
time-left	poVQr8exo4HSaiMK	gallery	6
time-left	550RkwUsySha7bJf	gallery	7
time-left	qRVgPzurxCUmax0l	gallery	8
time-left	X6YZBJhST1KbK9le	gallery	9
time-left	gm0poVH8h4BwyPZu	gallery	10
time-left	fcfvfff9SAvAGOr2	gallery	11
warmthaholic	WCV-Zwlk7sPEOdK-	cover	0
warmthaholic	OZhkAL1WV9GMdbWr	cover	1
warmthaholic	wndpyL7o0uS-0Ow0	cover	2
warmthaholic	fyv_SnV4Pnv22Fxn	cover	3
warmthaholic	hcTKBiVTxrVA2DfZ	gallery	0
warmthaholic	8v5YnKKNGj2to2lJ	gallery	1
warmthaholic	Z0IGMgP73mpoJGxV	gallery	2
warmthaholic	AhfO9g7E3QFnbUuQ	gallery	3
warmthaholic	CyZrxjKIpt89DaXT	gallery	4
warmthaholic	rRYMxebh54CaiuB5	gallery	5
warmthaholic	w4goKlYAXsQxboYF	gallery	6
medianoche	mT_ri6rgqI747xfs	cover	0
medianoche	QfwO56ZD4c8imfUH	cover	1
medianoche	AMhIAn_-liOndaUx	cover	2
medianoche	e24o0zqjY7PYntt0	cover	3
medianoche	fEXrHOQWhFPx_DwN	gallery	0
medianoche	SqTpLByAsTomP2E0	gallery	1
medianoche	Z2vD3GxNC1FHTS3B	gallery	2
medianoche	8Hbx0B5jVypeJdfL	gallery	3
medianoche	GVI94oQjgYC3lKiY	gallery	4
medianoche	qaCsmXRURM9W0VOJ	gallery	5
medianoche	phMGqQ6wRp_PRYVC	gallery	6
medianoche	GjVWQwVW3RBYdTfi	gallery	7
medianoche	OMlKCntPEg5TPPgo	gallery	8
medianoche	kQJz_6PuJllwrlVQ	gallery	9
medianoche	XgV1-GHuPdnLowZf	gallery	10
medianoche	YsAYU4QxyBo5iFkT	gallery	11
medianoche	5wrgnaQ8_M5QlpIW	gallery	12
medianoche	IPHz_lHUYBo8CgOE	gallery	13
ultra-soul	R5KxoFLtawx4_zmG	cover	0
ultra-soul	8Pw5RBqYYllASX90	cover	1
ultra-soul	fKPWJz0j4beKHpFb	cover	2
ultra-soul	WjKcBeonqIZXVrnt	cover	3
ultra-soul	5pJO982w3ruKRPFV	gallery	0
ultra-soul	43mCAYgMQ8Z79IJe	gallery	1
ultra-soul	o8b0j5pd2ETvlIMH	gallery	2
ultra-soul	KOCL9GBbSo3YBaEe	gallery	3
ultra-soul	SM_rM3SrGB4ASGTI	gallery	4
ultra-soul	gpdJ_sr3R5nrZ6LU	gallery	5
ultra-soul	JwnVzlm5UruQE5XY	gallery	6
ultra-soul	qOxk5IYdffS9d-ja	gallery	7
ultra-soul	D9r2FVQvyBDOVVRd	gallery	8
ultra-soul	cJP68VIXFQoBddYR	gallery	9
ultra-soul	eaTU7q8oYt_ekpc8	gallery	10
ultra-soul	QAGw3flYeXHvkhT-	gallery	11
ultra-soul	CGYTFXRJ1DgHl9kK	gallery	12
ultra-soul	XV9_v3VsMmBEIqS8	gallery	13
ultra-soul	mJsZh0O6LCslDzqA	gallery	14
ultra-soul	Z96ZzjyUyGBvsZpY	gallery	15
ultra-soul	1OsaajrDh5q6R9ln	gallery	16
ultra-soul	iVYhkiFo81dZP-Lo	gallery	17
ultra-soul	mOLZdEHsAffZESA-	gallery	18
ultra-soul	Vuek4wVHMNltq-eF	gallery	19
ultra-soul	Vdaey1CFMdoFAMK4	gallery	20
ultra-soul	OUXZOOn6LxXySCNz	gallery	21
ultra-soul	H3JxYY5n6erngJoI	gallery	22
ultra-soul	BPlZ2KHfbkv7sv2Y	gallery	23
ultra-soul	RbTXgAfffTGZAL9i	gallery	24
ultra-soul	BT46VrwA2HyGVybT	gallery	25
ultra-soul	raNlLPVVucmH3wfv	gallery	26
ultra-soul	aS_bUIDw1Ke8bGfx	gallery	27
ultra-soul	u2HRAJ08lZu-ByWm	gallery	28
ultra-soul	isHoP6cEjTwwPfgm	gallery	29
ultra-soul	LAOWof655W2FHX6o	gallery	30
ultra-soul	xZ-BvdChtvtWJEHe	gallery	31
ultra-soul	dRH5uFXrUsWLyujE	gallery	32
ultra-soul	2a_8AvmJ0frecGBB	gallery	33
ultra-soul	KxQMlOqKSqV9Ej9w	gallery	34
ultra-soul	sdRivsYt8GPWTHXf	gallery	35
ultra-soul	PG__fPv9Z8yoElOj	gallery	36
ultra-soul	PKsAPr9CT3GWeNZf	gallery	37
ultra-soul	ZR9i1CaC4cUNXLSv	gallery	38
ultra-soul	SBql_kOHyJsO4ycC	gallery	39
ultra-soul	-f7Zil6-TdmP4bT3	gallery	40
ultra-soul	Fc-6-J1ZRD-pHVN6	gallery	41
ultra-soul	Ihgu-XFYgwO12tCd	gallery	42
ultra-soul	HwVPdBjImB8wJkfl	gallery	43
ultra-soul	fs8qp0pC_UJoYVF3	gallery	44
ultra-soul	SwBf_TBFeYret3pc	gallery	45
ultra-soul	GbE9FVDnayJltSzW	gallery	46
ultra-soul	GhA9qkaHAToYEnm3	gallery	47
ultra-soul	hop3LULyBf1GUYD6	gallery	48
ultra-soul	40G4zF5tWGy7F9KO	gallery	49
ultra-soul	2-K3bCogYhWDwVqZ	gallery	50
ultra-soul	R8sVZ-92aUbvON7q	gallery	51
ultra-soul	HH7SgjtO34OKvHA4	gallery	52
ultra-soul	C5LvYh48TaydcEgw	gallery	53
ultra-soul	KAYUvGQc1KSoKam_	gallery	54
ultra-soul	TyWImVgp0oLQNit4	gallery	55
ultra-soul	6B6Kc3CTPK0JsJS7	gallery	56
ultra-soul	XtOZTJ-MjB7yfaUR	gallery	57
ultra-soul	PVDHs01rJ88lrTMp	gallery	58
ultra-soul	2FbajTSE5CooMGDN	gallery	59
ultra-soul	XFv_D_dNwLkzDzG1	gallery	60
darken	Rjxza3getIbmDg86	cover	0
darken	hArjOnOsV4DL0jwF	cover	1
darken	snoC-incrJ1GUtOq	cover	2
darken	UmT6KeD5NzVahBKR	cover	3
darken	e7KFfGGMp7n3UP0G	gallery	0
darken	wRUA_IQ-zCXqKo7H	gallery	1
darken	pAb0SRJVqZXHl8ja	gallery	2
darken	WezVWNkhS6WZ8WI6	gallery	3
darken	lRjTwSt4vjpxPXRi	gallery	4
darken	IKFTf7_djKmx5aXX	gallery	5
darken	Jz4XpkwDaoUVnnEp	gallery	6
darken	YfBkt-COAEreYo1n	gallery	7
darken	3kfFdQaIKEc9KPNS	gallery	8
darken	aJ2vXHmdQXSofXvu	gallery	9
darken	S9Hc0TThpGHs1vh8	gallery	10
darken	NI-zaZFD0njuV1cW	gallery	11
darken	Gy08X3xtzuOzblFh	gallery	12
darken	VpCUWfBg9Axlv-Cg	gallery	13
darken	kvPzF51yNC6vgDnQ	gallery	14
darken	J75L12R2vwPOItwL	gallery	15
darken	GelVwGax-Q7KR7FA	gallery	16
darken	jE-UaHrxIVgKl4BI	gallery	17
darken	RRaJ49YSiKOSgJ-d	gallery	18
hippocampal-pain	8WP8bVmpkQwxGu98	cover	0
hippocampal-pain	W8BrSWtJOTRBCsmm	cover	1
hippocampal-pain	vANwbG-Xky-B7_1k	cover	2
hippocampal-pain	1VyH72wnAPqIGD5_	cover	3
hippocampal-pain	6EhX5ip_lIyOZC19	gallery	0
hippocampal-pain	4HhCCJ_JI9bpnfVg	gallery	1
hippocampal-pain	5fZxRnkGc7Wezr7v	gallery	2
hippocampal-pain	uyJAgSoTOypd2_EJ	gallery	3
hippocampal-pain	FYKyeV-YhXPCj_da	gallery	4
hippocampal-pain	fhOeJh7wcSe0vteu	gallery	5
hippocampal-pain	u9KypGKsXF3hU_4n	gallery	6
hippocampal-pain	uJPda_gDbr5_uEPc	gallery	7
hippocampal-pain	LVtf1qdVZ8uelSXj	gallery	8
hippocampal-pain	ZhCT7fseJGT2U16P	gallery	9
hippocampal-pain	Wk67pPkQNPMtSV9R	gallery	10
hippocampal-pain	5rgtyaYA95TcrGmh	gallery	11
hippocampal-pain	fzWAVKTpXhzcwaC0	gallery	12
mirror-tune	VnB6QTrX5om0rU1g	cover	0
mirror-tune	VKiwZgnwCNwobN0_	cover	1
mirror-tune	TIhakPCNHfCds9W0	cover	2
mirror-tune	O6rspnjgYqSa9xQF	cover	3
mirror-tune	HBSM1XiG5yVrtTYR	gallery	0
mirror-tune	XRyKUUf2uNQ5QI4O	gallery	1
mirror-tune	8R99YX00KADlpCPW	gallery	2
mirror-tune	SnHFqJhqeFZVgR4f	gallery	3
mirror-tune	1sFnrMfGfH74HC2J	gallery	4
mirror-tune	Oy2_MVIgZ2lz_O2H	gallery	5
mirror-tune	ygEcwwXlvrHsyzvR	gallery	6
mirror-tune	VNXTFecQyDzeQ0wZ	gallery	7
mirror-tune	XzAelLpRPccXaMJ-	gallery	8
mirror-tune	bjB3_a9vCQmDqJj0	gallery	9
mirror-tune	ajyqZpnBIzcUd1NR	gallery	10
mirror-tune	1Lnp6LM1hBBewF_A	gallery	11
mirror-tune	xBeU-uaUmy2rDmDu	gallery	12
mirror-tune	noxulWur3ZSbELOR	gallery	13
mirror-tune	FcPv3zhIQQR9eU14	gallery	14
mirror-tune	wwDiF3tUWfP5zZ7H	gallery	15
mirror-tune	jyQ0kBrzVbUfoLkv	gallery	16
mirror-tune	sjJ8zobDZalHZF-c	gallery	17
mirror-tune	FwaKUybuDI-cmlAN	gallery	18
mirror-tune	5N1voYVA6KG_pCzW	gallery	19
stay-foolish	717JOWN3uXa6rHEg	cover	0
stay-foolish	VqMb8BxzZX7dwd2J	cover	1
stay-foolish	d1EkvrH3J9n_51NZ	cover	2
stay-foolish	5PIf-VM1BixCIENm	cover	3
stay-foolish	3r9JhEbEPrdMGhVp	gallery	0
stay-foolish	HKFcf39KvXwGT4xn	gallery	1
stay-foolish	ENIqgjPR9-wiJBp2	gallery	2
stay-foolish	G8z3ivYPZWgtjxcj	gallery	3
stay-foolish	rlo3Td0F2FJmVugL	gallery	4
stay-foolish	CJpFxHarnPCqu2xI	gallery	5
stay-foolish	nzGGt4jdV0mc1aXU	gallery	6
stay-foolish	3K5xc5KEi-NAinR8	gallery	7
stay-foolish	pcznGIbZqLzawR1B	gallery	8
stay-foolish	Q2vG9IoVja-IuzUl	gallery	9
stay-foolish	K28TPrRSXeDzfeJX	gallery	10
hanaichi-monnme	srdYH0p0InDRSju0	cover	0
hanaichi-monnme	h7ZPQlvhRaVwpVts	cover	1
hanaichi-monnme	RTliKQF8lnXpgk6y	cover	2
hanaichi-monnme	EJ60TqbM3KawI4Jv	cover	3
hanaichi-monnme	EqMlJBEe-bOPFYGS	gallery	0
hanaichi-monnme	XpI4MD75NiJ-NL5y	gallery	1
hanaichi-monnme	IasfXCTfklORL4Qr	gallery	2
hanaichi-monnme	lEqio9uM3UrMD0oC	gallery	3
hanaichi-monnme	4JWgT_6Z7F__x27u	gallery	4
cant-be-right	P_G6aKzqfnRST2Vj	cover	0
cant-be-right	p0WOreGln9plsvaF	cover	1
cant-be-right	0B3mCiBaxYBHhC2F	cover	2
cant-be-right	bUlYi84zJv5F4eLu	cover	3
cant-be-right	2ntznqRSa0RwxnRV	gallery	0
cant-be-right	B98QvW42devHEMAw	gallery	1
cant-be-right	EwZebiE-k6vjQCjF	gallery	2
kuzuri	htoJOnIqtuDbtQ9a	cover	0
kuzuri	Y8akJerXOP2idnCM	cover	1
kuzuri	QlaDxHFhIPEkygnK	cover	2
kuzuri	xljGbWcRaXXA5N0m	cover	3
kuzuri	98iyjGoxqe81GBpT	gallery	0
kuzuri	FTVSFsao2y7qeQtF	gallery	1
kuzuri	x8QY1nkHGwo-1-HU	gallery	2
kuzuri	t-CdEhylonLAIhxN	gallery	3
kuzuri	755PcmODAf496Wl1	gallery	4
kuzuri	uaMB5DujtF6_PRB1	gallery	5
kuzuri	HP4bbdQCCGj6jZxe	gallery	6
kuzuri	AQ1u4kF0Dffr5l6I	gallery	7
kuzuri	e8My9PnuSrXyKrSm	gallery	8
kuzuri	hPa337eWg6BOA5oU	gallery	9
kuzuri	NnCoR7WgqdSWEebQ	gallery	10
kuzuri	wmOQElw-dKVC6Qbo	gallery	11
kuzuri	WyQZZ5EnabfB85xc	gallery	12
byoushinwo-kamu	LhRafkm_CogY6krL	cover	0
byoushinwo-kamu	VxWR-h_XpYDP-IkF	cover	1
byoushinwo-kamu	Va05B_qfHpP6MAL2	cover	2
byoushinwo-kamu	2hg1uRynTpd52J-w	cover	3
byoushinwo-kamu	BPGGsGInrHYjFcHu	gallery	0
byoushinwo-kamu	fbRtyQ4qyQ55UXvk	gallery	1
byoushinwo-kamu	47aSrur_E7DDrL_b	gallery	2
milabo	l6Jy0tMWEgKTezII	cover	0
milabo	tT3_MG45__KC-UhQ	cover	1
milabo	gKirulDDIwAIjioO	cover	2
milabo	LhOBaO7ofbOEExtT	cover	3
milabo	8KAtgV6zx1a9fHTJ	gallery	0
milabo	rJWslclrvIdH4Rxx	gallery	1
milabo	ZJ6hmiXUwm8W0J_c	gallery	2
milabo	-CRYfpn0a-d2Ui4c	gallery	3
milabo	QRyurvYpMf7IEQpr	gallery	4
milabo	NcS0WFcp0VJ4m0U-	gallery	5
taidada	C531LwXms4kkhbjq	cover	0
taidada	-7mfK2XGVRD5OUnI	cover	1
taidada	lTc6PzoGM2EJ9i_c	cover	2
taidada	e7FH7p5bzn6gY2MB	cover	3
taidada	ePWnEYjgzuaahQ0Q	gallery	0
taidada	mfagLL4iWUtnjYpJ	gallery	1
taidada	gwXfZj19JjR47kwx	gallery	2
taidada	dBhPhzTGDENo8cFN	gallery	3
taidada	3ycAJ9cEeBD2mZOA	gallery	4
taidada	ie7QUdh4N5VZBKwg	gallery	5
taidada	asBSIbj87UVFk3Ig	gallery	6
taidada	QNH9aR20KOBZMesH	gallery	7
taidada	C9tz49pS2-aGFf_t	gallery	8
taidada	uVlBebQRn_cSB9_W	gallery	9
shade	wie3CrdhtF_gGwkm	cover	0
shade	TM0yEyTNCSkUUujD	cover	1
shade	CsvmfpJYdX4rLDk8	cover	2
shade	2xL-ulPgGz9fQv6x	cover	3
shade	b49cpKJ5FIO2ni0z	gallery	0
shade	7029ufze2ss1Tzzs	gallery	1
shade	tlK3WeiJNeHs6dZo	gallery	2
shade	upNK-2YgRVjzKwJ5	gallery	3
shade	SUNa8kJ1AhsGEir1	gallery	4
shade	2ib1BM5HSpSuk7NQ	gallery	5
shade	-ZdN_wZXxBJxOIQu	gallery	6
shade	reHHd12Ez6cMg7BX	gallery	7
shade	bJtl5G4P3q57BGDI	gallery	8
shade	Vflp56LG54syC8yI	gallery	9
shade	fiY86XTT0ytvGsIF	gallery	10
shade	qsxIxjv_LIqfbXX1	gallery	11
shade	s9VEs9NgAFHBIAjl	gallery	12
shade	_INYuTH21rdJaAf7	gallery	13
shade	kQslIwyH2oQ8yDpC	gallery	14
kira-killer	o3b8cbsOrtLBq98o	cover	0
kira-killer	hTwvPzW_qTtmSQq9	cover	1
kira-killer	y6mj5ihKsmqDnCT1	cover	2
kira-killer	_thTR_QypRfi57qZ	cover	3
kira-killer	lM-WS4jmPYksz28c	gallery	0
kira-killer	EF-mkImeFfUWyVQl	gallery	1
kira-killer	Yc15WKEZJ1WMhuVp	gallery	2
kira-killer	foN9deo7dMc-K4-K	gallery	3
kira-killer	ML7LRYvDnmxutBCI	gallery	4
inside-joke	jf5RIx7qhUSmkmz7	cover	0
inside-joke	yLDq24FYlnxQquqa	cover	1
inside-joke	A7aaUl2SGZriAkG-	cover	2
inside-joke	_APTHO9JixcefnaG	cover	3
inside-joke	gVht_ndAd1AsCwrM	gallery	0
inside-joke	ofPQcQynWBBsv4_E	gallery	1
yomosugara	MAzRDIRe8VZJFYzi	cover	0
yomosugara	GA5yc149j01vECiH	cover	1
yomosugara	E4WdbD_gtdvsSAPY	cover	2
yomosugara	W1jxXfohChVVQZ3l	cover	3
yomosugara	U8O1x2k_tn-_mRpd	gallery	0
yomosugara	FZop6lX7Vz9YRnyQ	gallery	1
yomosugara	b0oV4-8msSaxYbzZ	gallery	2
quilt	0-fwBYLmKTN2qtDG	cover	0
quilt	S1PE186qsr6WAmmE	cover	1
quilt	xddhcwqs0HMQRv0Y	cover	2
quilt	apSskV-FH0chEJrO	cover	3
quilt	ajhS2JphMmo3PvFj	gallery	0
quilt	DBUHRs4BoIzoyR4a	gallery	1
quilt	OHN1mV1Di8Wmw3B2	gallery	2
quilt	GIo8LNgm_uI2Pxwe	gallery	3
intrusion	dNIU231skiGtHuyW	cover	0
intrusion	14xehpNyeiVUHJ63	cover	1
intrusion	nZTabfMPp6jzeYOP	cover	2
intrusion	SYG3w7CluJ0C3eqh	cover	3
intrusion	0Mrk12U0ph3R327E	gallery	0
intrusion	ezFeKQDwBMqA3Bc_	gallery	1
intrusion	IFw71zLpfiw0qAJ4	gallery	2
intrusion	iLLTr1OtdbGfRNez	gallery	3
intrusion	q1OTfTT57Em56non	gallery	4
intrusion	xd5VwFaDxrnPhQzP	gallery	5
intrusion	opW6X8mHUhByRAvx	gallery	6
study-me	jiZGvLRkTtxHIjZr	cover	0
study-me	5a_buFqEpmqRrNA2	cover	1
study-me	tjN8Hxxu6LEXVhkG	cover	2
study-me	yyLQCqD02yPpPaAZ	cover	3
study-me	CVNc9e_HYEX7AgKq	gallery	0
study-me	wiRAQSa_ngWVM3Q9	gallery	1
study-me	g4uqhefebGFNDxll	gallery	2
study-me	99mukfnxaruYAf5U	gallery	3
study-me	0L-vnpn0Md0y4wh2	gallery	4
study-me	816iW1xkW_7-0Y_L	gallery	5
study-me	x7HGa8uY1N5jPEHD	gallery	6
study-me	FnLoqlirY_9GaalO	gallery	7
study-me	opvumdo0ZKzfUeO5	gallery	8
study-me	V2rIIGpd5kYck9IG	gallery	9
study-me	NfgWyvOXdwbcIFXI	gallery	10
study-me	M651WNZ_bAndO5md	gallery	11
study-me	toI66XiAoRqMnCTX	gallery	12
study-me	0771wVTtkIcN1Dsm	gallery	13
study-me	s6zqUCWUhMsStiXh	gallery	14
study-me	Xa9FrX2qeAib3uOW	gallery	15
study-me	bQjwr_NQ7TmeCTRy	gallery	16
study-me	RRaJ49YSiKOSgJ-d	gallery	17
hunch-gray	omrLUL-dFGsSFBvZ	cover	0
hunch-gray	tpQEA_6WVqIfyJ0u	cover	1
hunch-gray	iIps9-aRQJH2Odqj	cover	2
hunch-gray	7W1JZJ-rePnsTc44	cover	3
hunch-gray	bmHxtjShm7jKZ_8e	gallery	0
hunch-gray	F2wm8JD3kw-YxA89	gallery	1
hunch-gray	vIZ0OQrB1U2P9_vm	gallery	2
\.


--
-- Data for Name: mvs; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.mvs (id, title, year, date, youtube, bilibili, description) FROM stdin;
nareai-serve	馴れ合いサーブ	2023	2023-08-20 00:00:00+00	bIW0n36TUSQ	BV19u4y1Q7Ha	
blues-in-the-closet	Blues in the Closet	2024	2024-06-06 00:00:00+00	E8RMWLoAsa0	BV13f421X711	映画『好きでも嫌いなあまのじゃく』挿入歌\n\nLyrics - ACAね\nMusic - ACAね、Kenichiro Nishihara\nArrangement - Kenichiro Nishihara, ZTMY\nVocal - ACAね\nBass - Yoshikuni Tsuyuzaki\nFlute - Takumi Matsumura\n\nMV – ゴル\n  / goru_777  
pain-give-form	形	2025	2025-06-12 00:00:00+00	6eFajRiOrpY	BV1TWkTBuEhW	監督・コンテ演出・総作画監督・キャラクターデザイン - \nのをか（STUDIO NOWOKA）\n\nキャラクター原案・世界観設定・背景美術 - \n背景部（こちら背景部！）\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100kai Outo, ZTMY\nDrums - Yoshihiro Kawamura\nBass - Ryosuke Nikamoto\nGuitar - Yuya Komoguchi\nPiano - Yuki Kishida\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira\nSound Director - Kohei Matsumoto
blush	消えてしまいそうです	2022	2022-09-08 00:00:00+00	OxcnK1s2Fww	BV1V14y1Q7np	映画『雨を告げる漂流団地』主題歌\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Jumpei Kamiya \nBass - Ryosuke Nikamoto\nPiano - Yuki Kishida\nGuitar - Yuya Komoguchi\nTrumpet - Tatsuhiko Yoshizawa\nTrombone - Nobuhide Handa\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV\nAnimation – STUDIO COLORIDO\nDirector – Hiroyasu Ishida\nEditor – Ryota Kinami\nAssistant Editor – Aozora Maeda
summer-slack	夏枯れ	2022	2022-09-15 00:00:00+00	Nmemc-b6cdU	BV1AW4y1976t	映画『雨を告げる漂流団地』挿入歌\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Jumpei Kamiya \nBass - Takashi Adachi\nGuitar - Yuya Komoguchi\nTrumpet - Tatsuhiko Yoshizawa\nTrombone - Nobuhide Handa\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\n\nAnimation\nDirection：Rina Mitsuzumi\nProduction：Hyperbole Inc.\nCharacter Design / Main Animator：niL\nAnimator：Naoki Arata\nBackground Artists：Smartile / Yasutada Kato / Akemi Konno / Mayuko Rokuro / Miyuki Onodera / NaohiroYuki\nCG / Motion graphics：Naoya Nishikubo / Cafuu(Argument)\nComposite / edit：Rina Mitsuzumi\nDesigner：2ndbase\nPaint：Big Owl tdX 、SAS\nProduction Assistant：Konomi Ishii、Hiroki Hayatsu\nAnimation Producer：Hibiki Saito\nSpecial Thanks：Toshiyuki Yamashita、津田、しまりすゆきち、はまふぐ 、Erika Nishihara\nProduction Cooperation：STUDIO COLORIDO
neko-reset	猫リセット	2021	2021-12-02 00:00:00+00	Sfz5TpCRSiI	BV1iz4y1E7JA	Lyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Jumpei Kamiya\nBass - Ryosuke Nikamoto\nPiano - Yuki Kishida\nGuitar - 100kai Outo\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\n＜Music Video＞\n監督：YP\nプロデューサー：tete\n3DCG・コンポジター：涌井 嶺\nアニメーションコンポジター：ミハシ\nリリックモーション：Yota\n実写撮影・照明：yansuKIM\n実写撮影アシスタント：黒沢航大\nプロップスタイリスト：tete\n\n撮影協力：P.A.M\n制作プロダクション：YURUPPE inc.\n\nアニメーション制作：G子 / ligton / sakiyama / がーこ / グレンズそう / ゴル / そゐち / 革蝉 / 擬態するメタ（しまぐち ニケ, Bivi） / 津田 / 二十日\n\nキャラクターデザイン：G子（新聞配達員） / ligton（コンビニ店員） / sakiyama（バーテンダー） / グレンズそう（タクシードライバー） / ゴル（パン屋） / そゐち（エンジニア） / 革蝉（看護師） / しまぐち ニケ（アニメーター） / 津田（ジャーナリスト） / 二十日（交通誘導員）\nタイトルロゴデザイン：がーこ\n\nクリエイティブエージェンシー：CAMBR\n企画・プロデュース：飯寄雄麻\nプロジェクトマネージャー：野村正太\nプロダクションコーディネーター：奥山紘子\nプロダクションマネージャー：尾之内麻里\n\n制作協力：ヒャクマンボルト\n企画協力：Indeed\n\n「真夜中の仕事でいいのに。」\nhttps://jp.indeed.com/cm/ztmy\n
kansaete-kuyashiiwa	勘冴えて悔しいわ	2021	2021-03-30 00:00:00+00	4QePrv24TBU	BV1pv411H7zX	チャンネル100万登録記念で制作したスピンオフ的MV\n\nLyrics & Vocal - ACAね\nMusic - ACAね, ラムシーニ\nArrangement - ラムシーニ, 100回嘔吐, ZTMY\nPiano - Jun☆Murayama\nDrums - Yoshihiro Kawamura\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV - sakiyama
ones-mind	胸の煙	2021	2021-02-10 00:00:00+00	wQPgM-9LatM	BV1xy4y1M7wW	Lyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Yoshihiro Kawamura\nBass - 100kai Outo\nGuitar - Hiroomi Shitara\nPiano - Jun☆Murayama\nStrings - Yoshida Uchu Strings\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV - Shino @cozy_ashfilm
dear-mr-f	Dear. Mr「F」	2019	2019-10-29 00:00:00+00	Qw-FSw7d2zE	BV1JZ4y1N7Xa	Lyrics & Music & Vocal : ACAね\nPiano & Arrangement : Jun☆Murayama\nIllustration & Animation : すとレ
konnakoto-soudou	こんなこと騒動	2019	2019-10-08 00:00:00+00	mlA-Z7zSLHU	BV1bt4y1q7rk	Lyrics & Music & Vocal : ACAね\nArrangement : 100回嘔吐\nIllustration & Animation : sakiyama
kettobashita-moufu	蹴っ飛ばした毛布	2019	2019-09-26 00:00:00+00	iyCRK5WfFOI	BV1YA411E7Ns	Lyrics & Music & Vocal : ACAね\nArrangement : 100回嘔吐\nIllustration & Animation : 革蝉
mabushii-dna-dake	眩しいDNAだけ	2019	2019-02-04 00:00:00+00	VJy8qZ77bpE	BV1E541187FY	Lyrics & Music & Vocal : ACAね\nArrangement : ぬゆり\nIllustration & Animation : sakiyama\n\nオフボーカル こちらでDLできます\nhttps://piapro.jp/t/bUsK
humanoid	ヒューマノイド	2018	2018-11-06 00:00:00+00	GAB26GgJ8V8	BV1TV411m7Fv	Lyrics & Music & Vocal : ACAね\nArrangement : 関口晶大, ラムシーニ, Naoki Itai(MUSIC FOR MUSIC)\nIllustration & Animation : sakiyama\nMovie : notai\n\nオフボーカル こちらでDLできます\nhttps://piapro.jp/t/PuCh
seigi	正義	2019	2019-05-08 00:00:00+00	7kUbX4DoZoc	BV1Dh411X7b9	Lyrics & Music & Vocal : ACAね\nArrangement : Singo Kubota（Jazzin’park）\nIllustration & Animation : 革蝉\n\nオフボーカル こちらでDLできます\nhttps://piapro.jp/t/yilc
fastening	低血ボルト	2020	2020-07-23 00:00:00+00	COll6PdtI5w	BV1Xv411k7ni	Lyrics & Music & Vocal - ACAね\nArrangement - 関口晶大, 出口遼, ZTMY\nAdditional Arrangement - 黒川陽介, Art Neco\nLeft Piano - Jun☆Murayama\nRight Piano - Nao Nishimura\nDrums - Yoshihiro Kawamura\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMusic Video\nAnimation – 革蝉 (@aozukikawasemi)
zutorao	深夜のラーメンまじ犯罪	2025	2025-01-22 00:00:00+00	a55s94rdoWs	BV1wmfhYEEou	深夜のラーメンまじ犯罪 #ズトラ王
ham	Ham	2020	2020-08-11 00:00:00+00	ouLndhBRL4w	BV1Pi4y1g7Ub	Lyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nPiano - Nao Nishimura\nDrums – Toshiyuki Takao\nBass – Kenshi Takimoto\nGuitar - Takayuki "Kojiro" Sasaki\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMusic Video\nAnimation – ゴル
hippocampal-pain-p3r	海馬成長痛 × Mass Destruction -Reload-	2026	2026-02-01 00:00:00+00	3ytqnteXfjw	BV1EZFPzFEPz	「ずっと真夜中でいいのに。」の人気曲「海馬成長痛」と、\n『ペルソナ３ リロード』の人気曲「Mass Destruction -Reload-」をマッシュアップした楽曲が登場！\n公式タイアップのために描き下ろされたオリジナルアニメーションと合わせて、ぜひお楽しみください。\n\n推出將「ZUTOMAYO（永遠是深夜有多好）」大受歡迎的曲目「海馬成長痛 」與《P3R》廣受喜愛的曲目「Mass Destruction -Reload-」混搭的樂曲。\n還請務必搭配專為本次合作所製作的原創動畫，一同暢享其中的樂趣。
cream	クリームで会いにいけますか	2025	2025-05-22 00:00:00+00	JQ2913bVo30	BV12skTBqEJJ	・『週刊情報チャージ！チルシル』テーマソング\n・みんなのうた～ひろがれ！いろとりどり 5 月新曲\n\n\n＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝\nMV Animation - TV♡CHANY\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100kai Outo, ZTMY\nDrums - Fumihiro Ibuki\nBass - Takashi Adachi\nGuitar - Yuya Komoguchi\nPiano/Keyboards - Yuki Kishida\nStrings - Yu Manabe Strings\nTrumpet - Hajime Gushiken, Yusuke Sase\nTrombone - Keita Harigai\nSaxophone - Yu Kuga\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira\nSound Director - Kohei Matsumoto
nouriueno-cracker	脳裏上のクラッカー	2018	2018-10-02 00:00:00+00	3iAXclHlTTg	BV1g5411j7d4	Lyrics & Music & Vocal : ACAね\nArrangement : 100回嘔吐 \nAnimation : Waboku\n\nオフボーカル こちらでDLできます\nhttps://piapro.jp/t/1n92
haze-haseru-haterumade	ハゼ馳せる果てるまで	2019	2019-10-18 00:00:00+00	ElnxZtiBDvs	BV1uV411y7Nc	Lyrics & Music & Vocal : ACAね\nArrangement : ぬゆり\nIllustration & Animation : Waboku\n\nオフボーカル こちらでDLできます\nhttps://piapro.jp/t/jKb7
inemuri-enseitai	居眠り遠征隊 (アニメED風)	2024	2024-06-03 00:00:00+00	E0N8LzuM6qI	BV1P7421o7BD	アニメーターWabokuさんが今まで担当してくれたMVをまとめたアニメエンディング風な動画をつくってくれました\n\n\nWaboku (@waboku2015)
truth-in-lies	嘘じゃない	2024	2024-05-23 00:00:00+00	GfDXqY-V0EY	BV1Nt421T7eo	一時的ではない\nわたしにとっては全てが思い出で\nドリーミーな現実で、確信で儚くて\nだめだった\n\n映画『好きでも嫌いなあまのじゃく』主題歌\n\nLyrics & Music - ACAね\nArrangement - 100回嘔吐, ZTMY\nVocal - ACAね\nDrums - Fumihiro Ibuki\nBass - Ryosuke Nikamoto\nPiano - Yuki Kishida\nGuitar - Yuya Komoguchi\nStrings - Yu Manabe Strings\n\nMV – はなぶし\n  / hanabushi_  
time-left	残機	2022	2022-10-20 00:00:00+00	6OC92oxs4gA	BV1UM4y1a7cK	TVアニメ『チェンソーマン』第２話エンディング・テーマ\n\nLyrics & Music - ACAね\nArrangement - 100回嘔吐, ZTMY\nVocal, Guitar - ACAね\nDrums - Yoshihiro Kawamura\nBass - Ryosuke Nikamoto\nGuitar, Piano - 100kai Outo\nStrings - Yu Manabe Strings\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV – TV♡CHANY\n\nオフボーカル こちらでDLできます\nhttps://piapro.jp/t/-2im
warmthaholic	微熱魔	2025	2025-04-18 00:00:00+00	plpVOHqh3lA	BV1kYkTBwEWX	TVアニメ『阿波連さんははかれない season2』オープニングテーマ\n\nIllustration & Animation - ゴル\nComposite - Meri\n\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Fumihiro Ibuki\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nPiano - Yuki Kishida\nStrings - Yu Manabe Strings\nOther Instrumental - 100kai Outo, ACAね\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira\nSound Director - Kohei Matsumoto
medianoche	メディアノーチェ	2026	2026-01-29 00:00:00+00	sBpITQ7oXxM	BV1r1zfBPEEJ	MV Animation - TV♡CHANY\n\nLyrics & Music & Vocal & Tap Percussion - ACAね\nArrangement - 100kai Outo, ZTMY\nDrums - Jumpei Kamiya\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nOther Instrumental - 100kai Outo, ACAね\nRec & Mix Engineer - Tomoya Nakamura\nMastering Engineer - Takeo Kira\nSound Director - Kohei Matsumoto
ultra-soul	ultra魂	2026	2026-04-01 00:00:00+00	lpg5nhWapjU	BV1yq9LBDENq	90年代の名作 TVアニメ「ZUTOMAYO CARD -THE BATTLE BEGINS-」一期\nOPテーマ「ultra魂」クレジット有り映像です\n\n辛いラーメンが大好き、おっちょこちょいで勝気な主人公・昼にら。成績優秀で内気なクールヒロイン・夜にら。性格は正反対、だけどふたりは幼い頃からの大親友！\n\nところがある日、クラスメイトのグレイくんが、世界の時計を止めようと暗躍する謎の組織「暗黒魂（あんこくたましい）」の一員だと知ってしまう。\nしかしそれが、すべてのはじまりだった・・・！\n昼にらと夜にらは“美少女カード戦士”として、世界の平和を守る戦いへと巻き込まれていく！\n\n世界の運命を握る「クロノス」とは何なのか。\n「暗黒魂」を陰で操る裏組織「灰版電機工業(株)」の真の目的とは――。\n\n言い切った正義に、答えなんてない。\nだからこそ、自分の目で真実を見つけるしかない。\n持ち前のウルトラたましいで秒針を先へと進めるんだ！\n\n皆んなも一緒に〜〜\n森羅万象(しんらばんしょう)！\n\n※TVアニメの予定はありません。エイプリルフールです。むしろ常時募集しています。\n\n※ズトマヨカードというカードゲームは本当にあります。\nZUTOMAYO CARD \nhttps://zutomayocard.net\n\n＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝\n監督 - G子\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nRecorded by Tomoya Nakamura\nMixing Engineer: Tomoya Nakamura\nMastering Engineer: Takeo Kira\nSound Editor: Kohei Matsumoto\n\n\n\n90 年代名作 TV 動畫《ZUTOMAYO CARD -THE BATTLE BEGINS-》第一期\nOP 主題曲「ultra 魂」附字幕版影像\n\n最喜歡辛辣拉麵、冒冒失失卻不服輸的主角・昼にら（晝 Nira ）。成績優異且內向文靜的高冷女主角・夜にら（夜 Nira ）。兩人的性格截然不同，卻是從小到大最好的朋友！\n\n然而就在某一天，她們發現同學 Gray 君竟然是企圖停止世界時鐘的謎之組織「暗黑魂」的一員。\n而這，正是一切的開端⋯⋯！\n小晝與小夜化身為「美少女卡牌戰士」，就此被捲入守護世界和平的戰鬥之中！\n\n掌握世界命運的「柯羅諾斯（Chronos）」究竟是什麼？\n在背後操縱「暗黑魂」的幕後組織「灰版電機工業(株)」真正的目的又是——。\n\n那些口口聲聲說出的正義，從來就沒有標準答案。\n正因如此，只能用自己的雙眼去尋找真相。\n用那與生俱來的 Ultra 靈魂，讓秒針繼續前進吧！\n\n大家也一起來～～\n森羅萬象（Shinrabansho）！\n\n[!NOTE]\n※ 目前沒有預定製作 TV 動畫。這是愚人節企劃。不如說我們隨時都在招募（合作機會）。\n\n※ 「ZUTOMAYO CARD」這款卡片遊戲是真的存在的。\nZUTOMAYO CARD： https://zutomayocard.net\n\n製作團隊（Credits）\n監督 - G子\n\n作詞 & 作曲 & 演唱 - ACAね\n\n編曲 - 100回嘔吐, ZTMY\n\n錄音 - Tomoya Nakamura\n\n混音工程師 - Tomoya Nakamura\n\n母帶後期處理工程師 - Takeo Kira\n\n音效編輯 - Kohei Matsumoto
darken	暗く黒く	2021	2021-01-20 00:00:00+00	dcOwj-QE_ZE	BV1Uy4y1n7Wi	映画『さんかく窓の外側は夜』主題歌\n\nLyrics & Music & Vocal - ACAね\nArrangement –100回嘔吐, ZTMY\nKeyboards - Jun☆Murayama\nDrums - Yoshihiro Kawamura\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nStrings – Yu Manabe Strings\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV – はなぶし‪@KUNGFUPIGGY_‬ \n\nぴあぷろにさりげなくインストあげました\nhttps://piapro.jp/t/4HxQ
hippocampal-pain	海馬成長痛	2024	2024-08-29 00:00:00+00	PLG2Uexyi9s	BV1AWsVewER7	Lyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Jumpei Kamiya\nBass - Ryosuke Nikamoto\nGuitar - Yuya Komoguchi\nTrumpet - Yohchi Masago\nTrombone - Nobuhide Handa\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira\nSound Director - Kohei Matsumoto\n\nMV Animation - TV♡CHANY\n   / @tvchany  \nColor Assistant - barbiche
mirror-tune	ミラーチューン	2022	2022-04-07 00:00:00+00	BVvvUGP0MFw	BV1ZM4y1a7qJ	Lyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Jumpei Kamiya\nBass - Ryosuke Nikamoto\nGuitar - Yuya Komoguchi\nSaxophone - Ryoji Ihara\nStrings - Yu Manabe Strings\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV – TV♡CHANY
stay-foolish	ばかじゃないのに	2021	2021-07-04 00:00:00+00	YgmFIVOR1-I	BV1iW4y1f7nh	アニメーションスタジオ・MAPPA『10th Anniversary Movie』コラボ楽曲\n\n\nLyrics & Music & Vocal - ACAね\nArrangement - ZTMY, 100kai Outo, Shun Aratame(HANO), Tatsuya Yano\nPiano - Jun☆Murayama\nDrums - Yoshihiro Kawamura\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nStrings - Uchu Yoshida Strings\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira\nSound Direction - Kohei Matsumoto\n\nMV – TV♡CHANY
hanaichi-monnme	花一匁	2023	2023-06-04 00:00:00+00	H88kps8X4Mk	BV1tW4y1R7Tk	Lyrics & Music - ACA ね\nArrangement - 100 回嘔吐, ZTMY\nDrums - Jumpei Kamiya\nBass - Ryosuke Nikamoto\nPiano - Yuki Kishida\nGuitar - Yuya Komoguchi\nTrumpet - Tatsuhiko Yoshizawa\nTrombone - Nobuhide Handa\nSaxophone – Kazuya Hashimoto\n\nMV – 革蝉
cant-be-right	正しくなれない	2020	2020-12-15 00:00:00+00	258qUAI7rck	BV1GK411G7vv	映画『約束のネバーランド』主題歌\n\nLyrics & Music & Vocal - ACAね\nArrangement – 久保田真悟(Jazzin’park), 100回嘔吐, ZTMY\nPiano – Nao Nishimura\nDrums - Yoshihiro Kawamura\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nStrings – Yu Manabe Strings\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV - 安田現象\n\nオフボーカル こちらでDLできます\nhttps://piapro.jp/t/7HZM\n
kuzuri	クズリ念	2024	2024-10-23 00:00:00+00	ut889MZ9yNo	BV1WyD3YgE71	MV Animation - Waboku　https://linktr.ee/waboku2015\n2D Animator - Satomi Tena, Minomi, uiu, urara, Osakana, GBnmsn\n2D Graphicer - Karan Koron, nagum\n2D Paintor - Osakana\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Jumpei Kamiya\nBass - Takashi Adachi\nGuitar - Yuya Komoguchi\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira\nSound Director - Kohei Matsumoto
byoushinwo-kamu	秒針を噛む	2018	2018-06-04 00:00:00+00	GJI4Gv7NbmE	BV1kK4y1879k	はじめまして。”ずっと真夜中でいいのに。”のACAね です。\nTwitter：  / zutomayo    作りました。フォロー喜びます。\nこれから動画アップしていきたいと思います。\nアレンジは ぬゆりさん、映像はWabokuさんです。\n\nLyrics & Vocal : ACAね\nMusic :  ACAね×ぬゆり\nArrangement : ぬゆり\nAnimation  : Waboku\n\nオフボーカル こちらでDLできます\nhttp://piapro.jp/t/B_hn
milabo	MILABO	2020	2020-07-13 00:00:00+00	I88PrE-KUPk	BV1Ry4y1y7pJ	Lyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nKeyboards - Nao Nishimura\nDrums - Yasushi Fukumori\nBass - Ryosuke Nikamoto\nGuitar - Sho Ogawa\nViolin,Viola – Wasei Suma\nStrings Arrange - Singo Kubota(Jazzin’park)\nBrass Arrange - 100kai Outo, Singo Kubta(Jazzin’park)\nAdditional Arrangement – Takayuki Ishikura\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira\nSound Direction - Kohei Matsumoto\n\nMusic Video\nAnimation - Waboku (@waboku2015)\n\nオフボーカル こちらでDLできます\nhttps://piapro.jp/t/sruu\n
taidada	TAIDADA	2024	2024-12-05 00:00:00+00	IeyCdm9WwXM	BV1gqifYJE23	TVアニメ「ダンダダン」Endingが好きなのでMAD MVを作成しました\nRespect ターボババア\n\nOff Vocal [Inst] FREE DL : https://piapro.jp/t/1Mpp\n\nLyrics & Music & Vocal - ACAね\nArrangement - 煮ル果実, 100回嘔吐, ZTMY\nDrums - Yoshihiro Kawamura\nBass - Takashi Adachi\nGuitar - Yuya Komoguchi\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira\nSound Director - Kohei Matsumoto\n\nMV\n監督 - ゴル\nキャラクターデザイン - ゴル\nアニメーター - UOZA, 大文字のあーる, kawa, 神多洋, mamitopic, ゴル, 野渡ひい, もこた\n美術 - DEPPA, ゴル\n撮影 - アズマ\nプロデューサー - tete\nSpecial Thanks - 龍幸伸, サイエンスSARU, 集英社・ダンダダン製作委員会\n\n元ネタ\nTVアニメ「ダンダダン」エンディング映像\n   • TVアニメ「ダンダダン」エンディング映像｜ずっと真夜中でいいのに。「TAIDADA」  
shade	シェードの埃は延長	2025	2025-02-28 00:00:00+00	zjEMFuj23B4	BV1sB9EYMEh8	フジテレビ系ドラマ『アイシー～瞬間記憶捜査・柊班～』主題歌\n\nMusic Video Director & Animation &Character Design - 革蝉\nComposit - がーこ\nAnimation Assistant - がーこ,ゴル\nColoring Assistant - 052,ちろき.ユメノサキ\n\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Yoshihiro Kawamura\nBass - Yoshikuni Tsuyuzaki\nPiano - Yuki Kishida\nGuitar - Takayuki “Kojiro” Sasaki\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira\nSound Director - Kohei Matsumoto
kira-killer	綺羅キラー (feat. Mori Calliope)	2022	2022-12-15 00:00:00+00	e5LaKxJVeVI	BV1qu411W7vU	2022 Spotify Holiday TVCMソング\n\nLyrics - ACAね, Mori Calliope\nMusic - ACAね\nArrangement - 100回嘔吐, ZTMY\n\nVocal, Guitar, Electric Fan Harp - ACAね\nRap - Mori Calliope ‪@MoriCalliope‬ \nDrums - Fumihiro Ibuki \nBass - Ryosuke Nikamoto\nGuitar, Piano - 100kai Outo\nTsugaru-Shamisen - Yutaka Oyama\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV – こむぎこ2000
inside-joke	あいつら全員同窓会	2021	2021-06-18 00:00:00+00	ZUwaudw8ht0	BV1ti421S7eU	・オンラインRPG 『PSO2 ニュージェネシス』コラボ楽曲\n・Spotifyブランド/ プレミアムTVCMソング\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Norihide Saji\nBass - Ryosuke Nikamoto\nGuitar - Hiroomi Shitara\nStrings - Uchu Yoshida Strings\nChorus - 100kai Outo\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV – えいりな刃物\n\nあいつら全員同窓会[オフボーカル]\nhttps://piapro.jp/t/lvaL
yomosugara	よもすがら	2026	2026-03-05 00:00:00+00	rsjaFk0Z5es	BV1T1PyzNE1R	監督 - ゴル\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Fumihiro Ibuki\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nOpen Reel - Haruka Yoshida [Open Reel Ensemble]\nOpen Reel - Masaru Yoshida [Open Reel Ensemble]\nAdditional Instrumentation - 100kai Outo, ACAne\nRecording & Mix Engineer - Tomoya Nakamura\nMastering Engineer - Takeo Kira\nSound Director - Kohei Matsumoto
quilt	袖のキルト	2022	2022-02-16 00:00:00+00	9PnCSI8ndws	BV1Xm4y1i7ux	Amazon Original映画『HOMESTAY（ホームステイ）』主題歌\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nDrums - Jumpei Kamiya\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nKeyboards - 100kai Outo\nStrings - Yu Manabe Strings\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n\nMV - G子\n
intrusion	不法侵入	2023	2023-05-15 00:00:00+00	SAdkxVFyAyc	BV1bk4y1p7Jz	Lyrics & Music - ACAね\nArrangement - 100回嘔吐, ZTMY\nVocal - ACAね\nDrums - Fumihiro Ibuki\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nGuitar, Key - 100kai Outo\n\nMV – ゴル\n\nABEMA『今日、好きになりました。』主題歌
study-me	お勉強しといてよ	2020	2020-05-14 00:00:00+00	Atvsg_zogxo	BV1py4y1r7hi	Arrangement - 矢野達也, 100回嘔吐, ZTMY\nKeyboards - Nao Nishimura\nDrums - Yasushi Fukumori\nBass - Ryosuke Nikamoto\nGuitar - Sho Ogawa\nStrings - Yu Manabe Strings\nRec & Mix Engineer - Toru Matake\nDirection - Kohei Matsumoto\n\nMusic Video\nIllustration & Animation \n・はなぶし　  / hanabushi_  \n・ヨツベ　  / yotube  \n\nオフボーカル こちらでDLできます\nhttps://piapro.jp/t/5w24
hunch-gray	勘ぐれい	2020	2020-12-01 00:00:00+00	ugpywe34_30	BV1364y1f7ry	不可逆性SNSミステリー『Project:;COLD』主題歌\n\nLyrics & Music & Vocal - ACAね\nArrangement - 100回嘔吐, ZTMY\nKeyboards - Yuki Kishida\nDrums - Yoshihiro Kawamura\nBass - Ryosuke Nikamoto\nGuitar - Takayuki "Kojiro" Sasaki\nRec & Mix Engineer - Toru Matake\nMastering Engineer - Takeo Kira \nSound Direction - Kohei Matsumoto\n
\.


--
-- Data for Name: sys_announcements; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.sys_announcements (id, content, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sys_configs; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.sys_configs (key, value, description, updated_at) FROM stdin;
maintenance_mode	"false"	\N	2026-04-25 02:35:25.452+00
maintenance_eta	"2026-04-23T17:00"	\N	2026-04-25 02:35:25.517+00
maintenance_type	"data"	\N	2026-04-25 02:35:25.659+00
showAutoAlbumDate	"true"	\N	2026-04-25 02:35:25.722+00
announcements	["[SYSTEM_UPDATE] V3.1 核心升級完成，絕讚公開中！", "[ARCHIVE_SYNC] MV 資料庫已重新構建，支援深度檢索。", "[WARNING] 建議將環境切換至「永遠深夜」模式以獲得最佳視覺體驗。", "[STATUS] 日々研磨爆裂中… 感謝您的持續支持，歡迎分享與擴散。", "[INFO] 正在努力完善內容… 勘誤、捉蟲或有體驗改善建議歡迎點擊右下角反饋按鈕回報。"]	\N	2026-04-25 02:35:25.783+00
\.


--
-- Data for Name: sys_dictionaries; Type: TABLE DATA; Schema: public; Owner: zutomayo_gallery
--

COPY public.sys_dictionaries (id, category, code, label, description, sort_order) FROM stdin;
\.


--
-- Name: albums albums_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_pkey PRIMARY KEY (id);


--
-- Name: apple_music_albums apple_music_albums_collection_id_key; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.apple_music_albums
    ADD CONSTRAINT apple_music_albums_collection_id_key UNIQUE (collection_id);


--
-- Name: apple_music_albums apple_music_albums_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.apple_music_albums
    ADD CONSTRAINT apple_music_albums_pkey PRIMARY KEY (id);


--
-- Name: artist_media artist_media_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.artist_media
    ADD CONSTRAINT artist_media_pkey PRIMARY KEY (artist_id, media_id);


--
-- Name: artists artists_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_pkey PRIMARY KEY (id);


--
-- Name: auth_passkeys auth_passkeys_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.auth_passkeys
    ADD CONSTRAINT auth_passkeys_pkey PRIMARY KEY (id);


--
-- Name: auth_settings auth_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.auth_settings
    ADD CONSTRAINT auth_settings_pkey PRIMARY KEY (key);


--
-- Name: keywords keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.keywords
    ADD CONSTRAINT keywords_pkey PRIMARY KEY (id);


--
-- Name: media_groups media_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.media_groups
    ADD CONSTRAINT media_groups_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: mv_albums mv_albums_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_albums
    ADD CONSTRAINT mv_albums_pkey PRIMARY KEY (mv_id, album_id);


--
-- Name: mv_artists mv_artists_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_artists
    ADD CONSTRAINT mv_artists_pkey PRIMARY KEY (mv_id, artist_id);


--
-- Name: mv_keywords mv_keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_keywords
    ADD CONSTRAINT mv_keywords_pkey PRIMARY KEY (mv_id, keyword_id);


--
-- Name: mv_media mv_media_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_media
    ADD CONSTRAINT mv_media_pkey PRIMARY KEY (mv_id, media_id);


--
-- Name: mvs mvs_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mvs
    ADD CONSTRAINT mvs_pkey PRIMARY KEY (id);


--
-- Name: sys_announcements sys_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.sys_announcements
    ADD CONSTRAINT sys_announcements_pkey PRIMARY KEY (id);


--
-- Name: sys_configs sys_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.sys_configs
    ADD CONSTRAINT sys_configs_pkey PRIMARY KEY (key);


--
-- Name: sys_dictionaries sys_dictionaries_pkey; Type: CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.sys_dictionaries
    ADD CONSTRAINT sys_dictionaries_pkey PRIMARY KEY (id);


--
-- Name: apple_music_albums_collection_id; Type: INDEX; Schema: public; Owner: zutomayo_gallery
--

CREATE UNIQUE INDEX apple_music_albums_collection_id ON public.apple_music_albums USING btree (collection_id);


--
-- Name: keywords_name_lang; Type: INDEX; Schema: public; Owner: zutomayo_gallery
--

CREATE UNIQUE INDEX keywords_name_lang ON public.keywords USING btree (name, lang);


--
-- Name: sys_dictionaries_category_code; Type: INDEX; Schema: public; Owner: zutomayo_gallery
--

CREATE UNIQUE INDEX sys_dictionaries_category_code ON public.sys_dictionaries USING btree (category, code);


--
-- Name: albums albums_apple_music_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_apple_music_album_id_fkey FOREIGN KEY (apple_music_album_id) REFERENCES public.apple_music_albums(id) ON UPDATE CASCADE;


--
-- Name: artist_media artist_media_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.artist_media
    ADD CONSTRAINT artist_media_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: artist_media artist_media_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.artist_media
    ADD CONSTRAINT artist_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media media_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.media_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mv_albums mv_albums_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_albums
    ADD CONSTRAINT mv_albums_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mv_albums mv_albums_mv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_albums
    ADD CONSTRAINT mv_albums_mv_id_fkey FOREIGN KEY (mv_id) REFERENCES public.mvs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mv_artists mv_artists_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_artists
    ADD CONSTRAINT mv_artists_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mv_artists mv_artists_mv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_artists
    ADD CONSTRAINT mv_artists_mv_id_fkey FOREIGN KEY (mv_id) REFERENCES public.mvs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mv_keywords mv_keywords_keyword_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_keywords
    ADD CONSTRAINT mv_keywords_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.keywords(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mv_keywords mv_keywords_mv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_keywords
    ADD CONSTRAINT mv_keywords_mv_id_fkey FOREIGN KEY (mv_id) REFERENCES public.mvs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mv_media mv_media_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_media
    ADD CONSTRAINT mv_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mv_media mv_media_mv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zutomayo_gallery
--

ALTER TABLE ONLY public.mv_media
    ADD CONSTRAINT mv_media_mv_id_fkey FOREIGN KEY (mv_id) REFERENCES public.mvs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO zutomayo_gallery;


--
-- PostgreSQL database dump complete
--

\unrestrict mqlVRuhmao75kvgs9Bxi6hlWRsZuYmeCo028kvujDe2VaQaLYsPQ5Zf9AJ3z36v

