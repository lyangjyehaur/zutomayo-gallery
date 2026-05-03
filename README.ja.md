# ZUTOMAYO Gallery

ZUTOMAYO の MV 設定画（イラスト）を整理・閲覧するためのオンラインギャラリーと、データを管理するための管理画面を提供します。

[繁體中文](README.md) | [简体中文](README.zh-Hans.md) | [English](README.en.md) | 日本語

![Version](https://img.shields.io/badge/version-3.6.2-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac)

最終更新日：2026-05-03

---

## 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [技術スタック](#技術スタック)
- [プロジェクト構成](#プロジェクト構成)
- [クイックスタート](#クイックスタート)
- [環境変数](#環境変数)
- [デプロイ](#デプロイ)

---

## 概要

本プロジェクトは、ZUTOMAYO MV の設定画を一覧できるギャラリーと、管理画面によるデータメンテナンスを提供します。フロントエンドは React + TypeScript、バックエンドは Express + TypeScript。主データベースは PostgreSQL（Sequelize + Umzug migrations）です。ライトボックスの正式機能は現在 Fancybox を使用し、LightGallery は debug/検証ページ向けにのみ残しています。

---

## 主な機能

- ギャラリー体験：Fancybox（LightGallery は debug/検証ページ向け）
- Masonry レイアウト：レスポンシブな瀑布流表示
- 管理者認証：WebAuthn（Passkeys）
- 管理と権限：RBAC と管理用 API
- コメント：Waline（カスタム絵文字、リアクション、Pageview）
- パフォーマンス：メモ化・遅延読み込み・Vite の分割

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|---|---:|---|
| React | 18.3 | UI |
| TypeScript | 5.3 | 型安全 |
| Vite | 5.4.2 | ビルド |
| Tailwind CSS | 4.0 | スタイル |
| shadcn/ui | 4.2 | UI コンポーネント |
| Fancybox | 6.1 | ライトボックス |
| LightGallery | 2.9 | ライトボックス（debug/検証用途） |
| Masonry | 4.2 | レイアウト |
| Monaco Editor | 4.7 | 管理画面エディタ |
| Waline | 3.5.0 | コメント |
| React Router | 6.22 | ルーティング |
| SWR | 2.4 | データ取得 |

### バックエンド

| 技術 | バージョン | 用途 |
|---|---:|---|
| Express | 4.19.2 | API |
| TypeScript | 5.3.3 | 型安全 |
| PostgreSQL | - | 主 DB |
| Sequelize | 6.37.8 | ORM |
| Umzug | 3.8.0 | Migrations |
| Zod | 3.22.4 | バリデーション |
| Helmet | 7.1.0 | セキュリティ |
| express-rate-limit | 7.1.5 | レート制限 |
| bcrypt | 6.0.0 | パスワードハッシュ |
| Redis | - | 任意（セッション/制限/キュー） |
| BullMQ | 5.76.2 | 任意（ジョブキュー） |
| Meilisearch | 0.57.0 | 任意（検索） |
| @simplewebauthn/server | 13.3 | WebAuthn |
| better-sqlite3 | 12.9 | レガシー/移行スクリプト用途 |

---

## プロジェクト構成

```text
zutomayo-gallery/
├── frontend/                    # Vite + React
├── backend/                     # Express API（PostgreSQL）
│   ├── data/                    # ローカルキャッシュ/レガシー（ip2region、sqlite バックアップ等）
│   └── src/
├── image-hosting/               # （任意）Next.js の独立画像ホスティング
├── deploy.sh                    # VPS 用の対話式デプロイスクリプト
├── update.sh                    # 差分更新スクリプト（pull/build/migrate/reload）
└── README.md
```

---

## クイックスタート

### 必要要件

- Node.js >= 18
- npm または pnpm
- Git
- PostgreSQL（主 DB）
- Redis / Meilisearch（任意。未設定の場合は一部機能が自動的に無効化/簡易化されます）

### インストール

```bash
git clone https://github.com/lyangjyehaur/zutomayo-gallery.git
cd zutomayo-gallery
npm run install:all
```

### 開発

```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:5010
```

---

## 環境変数

例ファイルをコピー：

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### フロントエンド（`frontend/.env`）

| 変数 | 説明 | 既定値 |
|---|---|---|
| `VITE_API_URL` | `/api/mvs` を含む API URL（リバースプロキシ利用時は既定でOK） | `/api/mvs` |
| `VITE_TWITTER_IMG_PROXY` | 任意：画像プロキシ | `https://img.ztmr.club` |
| `VITE_R2_DOMAIN` | 任意：Cloudflare R2 カスタムドメイン | `https://r2.dan.tw` |
| `VITE_WALINE_SERVER_URL` | 予約。現状コードは `https://comments.ztmr.club` を使用 | `https://wl.danndann.cn` |

### バックエンド（`backend/.env`）

| 変数 | 説明 | 既定値 |
|---|---|---|
| `PORT` | API ポート | `5010` |
| `ADMIN_PASSWORD` | 管理者パスワード（本番は変更推奨） | `zutomayo` |
| `ALLOWED_ORIGINS` | CORS 設定 | localhost values |
| `EXPECTED_ORIGIN` / `RP_ID` | WebAuthn 設定 | dev defaults |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | PostgreSQL 接続 | `backend/.env.example` 参照 |
| `R2_*` / `MEILI_*` / `REDIS_*` / `TWITTER_*` | 任意の拡張設定 | `backend/.env.example` 参照 |

---

## デプロイ

### Option A: `deploy.sh`（VPS 推奨）

```bash
./deploy.sh
```

初回実行時に `deploy.conf` が生成されます（`FRONTEND_DEPLOY_PATH` / `FRONTEND_BACKUP_PATH` など）。

初回デプロイやスキーマ更新がある場合は migrations を実行：

```bash
cd backend && npm run migrate
```

### Option B: `update.sh`（日常更新）

```bash
./update.sh
```

---

## License

本プロジェクトはファン活動・学習目的のみ。商用利用は行いません。
