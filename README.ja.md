# ZUTOMAYO Gallery

ZUTOMAYO の MV 用イラスト資料を閲覧できるオンラインギャラリーと、データ管理用の管理画面を提供します。

[繁體中文](README.md) | [简体中文](README.zh-Hans.md) | [English](README.en.md) | [日本語](README.ja.md)

![Version](https://img.shields.io/badge/version-3.6.4-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac)

最終更新日：2026-05-05

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

本プロジェクトは、ZUTOMAYO MV の設定画を一覧できるギャラリーと、データ保守用の管理画面を提供します。フロントエンドは React + TypeScript、バックエンドは Express + TypeScript、主データベースは PostgreSQL（Sequelize + Umzug migrations）です。正式環境のライトボックスは現在 Fancybox を使用し、LightGallery は debug/検証ページのみに残しています。

---

## 主な機能

- 没入感のあるギャラリー体験: 正式機能では Fancybox を使用し、LightGallery は debug/検証ページのみ
- Masonry レイアウト: レスポンシブで、画像サイズに対応しやすい表示
- モダンで安全なログイン: WebAuthn / Passkeys による管理画面ログイン
- 管理と権限: RBAC と各種管理 API
- データ閲覧と編集: Monaco Editor ベースの管理ツール
- インタラクティブなコメント: Waline、カスタム Emoji、Reaction、Pageview 集計
- パフォーマンス最適化: React memo、遅延読み込み、Vite のチャンク分割

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|---|---:|---|
| [React](https://react.dev/) | 18.3 | UI フレームワーク |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 型安全性 |
| [Vite](https://vitejs.dev/) | 5.4.2 | ビルドツール |
| [Tailwind CSS](https://tailwindcss.com/) | 4.0 | スタイリング |
| [shadcn/ui](https://ui.shadcn.com/) | 4.2 | UI コンポーネントライブラリ |
| [Neobrutalism](https://www.neobrutalism.dev/) | - | デザインスタイル / テーマ |
| [Fancybox](https://fancyapps.com/fancybox/) | 6.1 | ライトボックス |
| [LightGallery](https://www.lightgalleryjs.com/) | 2.9 | ライトボックス（debug/検証用途） |
| [Masonry](https://masonry.desandro.com/) | 4.2 | グリッドレイアウト |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 4.7 | コードエディタ |
| [Waline](https://waline.js.org/) | 3.5.0 | コメントシステム |
| [Umami](https://umami.is/) | - | アクセス解析 |
| [React Router](https://reactrouter.com/) | 6.22 | ルーティング |
| [SWR](https://swr.vercel.app/) | 2.4 | データ取得 |

### バックエンド

| 技術 | バージョン | 用途 |
|---|---:|---|
| [Express](https://expressjs.com/) | 4.19 | Web フレームワーク |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 型安全性 |
| [PostgreSQL](https://www.postgresql.org/) | - | 主データベース |
| [Sequelize](https://sequelize.org/) | 6.37.8 | ORM |
| [Umzug](https://github.com/sequelize/umzug) | 3.8.0 | DB migrations |
| [Zod](https://zod.dev/) | 3.22 | 入力検証 |
| [probe-image-size](https://github.com/nodeca/probe-image-size) | 7.2 | 画像サイズ検出 |
| [Helmet](https://helmetjs.github.io/) | 7.1.0 | セキュリティヘッダ |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 7.1.5 | レート制限 |
| [CORS](https://github.com/expressjs/cors) | 2.8.5 | クロスオリジン対応 |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | 6.0.0 | パスワードハッシュ |
| [Redis](https://redis.io/) | - | セッション / レート制限 / キュー（任意） |
| [BullMQ](https://docs.bullmq.io/) | 5.76.2 | ジョブキュー（任意） |
| [Meilisearch](https://www.meilisearch.com/) | 0.57.0 | 検索（任意） |
| [@simplewebauthn/server](https://simplewebauthn.dev/) | 13.3 | WebAuthn (Passkeys) |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.9 | SQLite（レガシー / 移行スクリプト用途） |

---

## プロジェクト構成

```text
zutomayo-gallery/
├── frontend/                    # フロントエンドアプリ (React)
│   ├── public/                  # 静的資産 & 旧版 Vanilla JS 実装
│   ├── src/
│   │   ├── components/          # React コンポーネント
│   │   │   ├── ui/              # shadcn/ui コンポーネント
│   │   │   ├── FancyboxViewer.tsx # Fancybox ライトボックス
│   │   │   ├── MVCard.tsx       # MV カード
│   │   │   ├── MVDetailsModal.tsx # MV 詳細モーダル
│   │   │   └── WalineComments.tsx # コメントコンポーネント
│   │   ├── pages/               # ページコンポーネント (AdminPage, DebugGallery など)
│   │   ├── lib/                 # ユーティリティと型定義
│   │   ├── config/              # 設定ファイル
│   │   ├── hooks/               # カスタム Hooks
│   │   └── debug/               # 開発用デバッグコンポーネント
│   └── package.json
│
├── backend/                     # バックエンド API (Node.js)
│   ├── data/                    # ローカルデータ/キャッシュ/レガシー（ip2region、SQLite 旧ファイルなど）
│   ├── src/
│   │   ├── controllers/         # ルートコントローラ
│   │   ├── routes/              # API ルート
│   │   ├── services/            # ビジネスロジック
│   │   ├── validators/          # Zod バリデータ
│   │   ├── middleware/          # Express ミドルウェア
│   │   └── index.ts             # エントリポイント
│   └── package.json
│
├── image-hosting/               # （任意）独立した Next.js 画像ホスティングサービス
│   └── package.json
│
├── package.json                 # ルート workspace 設定
├── deploy.sh                    # サーバー自動デプロイスクリプト
└── README.md
```

---

## クイックスタート

### ワンクリック起動

**Windows**
- `start.bat` をダブルクリック
- あるいは `launch.bat` をダブルクリック（追加チェックあり）

**Linux / Mac**
- ターミナルで `./start.sh` を実行
- あるいは `npm run dev`

**コマンドライン**
- `npm run dev` で frontend と backend を同時起動
- `npm run start:frontend` で frontend のみ起動
- `npm run start:backend` で backend のみ起動

### 必要要件

- Node.js 20 LTS（`.nvmrc` を同梱。対応範囲は `>=20 <26`）
- npm 10+
- Git
- PostgreSQL（主データベース）
- Redis / Meilisearch（任意。未設定時は一部機能が自動的に縮退 / 無効化）

### インストール

```bash
# 1. ソースを取得
git clone https://github.com/lyangjyehaur/zutomayo-gallery.git
cd zutomayo-gallery

# 2. 方法 A: メインサイトの依存をまとめてインストール（推奨: root + frontend + backend）
npm run install:all

# CI / クリーン環境では lockfile ベースのインストールを利用可能
npm run ci:all

# 3. 方法 B: 個別にインストール
# ルート依存
npm install

# frontend 依存
npm --prefix frontend install --legacy-peer-deps

# backend 依存
npm --prefix backend install

# 任意: 独立画像ホスティングサービスの依存をインストール
npm run install:optional
```

### 開発モード

```bash
# 推奨
npm run dev
# frontend: http://localhost:5173
# backend:  http://localhost:5010

# 個別起動
npm run start:frontend
npm run start:backend

# build + test
npm run verify
```

### 本番ビルド

```bash
# frontend ビルド
cd frontend && npm run build

# backend ビルド
cd backend && npm run build
```

---

## 環境変数

まずテンプレートをコピーします。

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### フロントエンド (`frontend/.env`)

| 名前 | 説明 | 既定値 |
|---|---|---|
| `VITE_API_URL` | backend API の URL。frontend と backend を分離デプロイする場合は明示的に設定 | `/api/mvs` |
| `VITE_TWITTER_IMG_PROXY` | 任意の画像プロキシ / 高速化サービス | `https://img.ztmr.club` |
| `VITE_R2_DOMAIN` | 任意の Cloudflare R2 カスタムドメイン | `https://r2.dan.tw` |
| `VITE_WALINE_SERVER_URL` | 予約用。現在のコードは `https://comments.ztmr.club` を使用 | `https://wl.danndann.cn` |
| `VITE_UMAMI_SECONDARY_WEBSITE_ID` | 任意の commons Umami website ID | なし |
| `VITE_UMAMI_SECONDARY_HOST_URL` | 任意の commons Umami host URL | `https://gallery.ztmr.club/commons` |
| `VITE_UMAMI_SECONDARY_BASE_SCRIPT` | 任意の commons Umami base script path | `/commons` |

### バックエンド (`backend/.env`)

| 名前 | 説明 | 既定値 |
|---|---|---|
| `PORT` | サーバーポート | `5010` |
| `NODE_ENV` | 実行環境 (`development` / `production`) | `development` |
| `ALLOWED_ORIGINS` | 許可する CORS origin（カンマ区切り） | localhost 系 |
| `SESSION_SECRET` | Express session 署名キー。本番 (`production`) では必須で、未設定だと起動しません | なし |
| `ADMIN_PASSWORD` | 管理画面のパスワード（本番では変更を強く推奨） | `zutomayo` |
| `EXPECTED_ORIGIN` | WebAuthn の origin。frontend と一致させる必要あり | `http://localhost:5173` |
| `RP_ID` | WebAuthn の relying party ID。通常はサイトのドメイン名（プロトコルなし） | `EXPECTED_ORIGIN` から導出 |
| `IMGPROXY_URL` | Imgproxy サーバー URL | `https://img.ztmr.club` |
| `IMGPROXY_KEY` | Imgproxy 署名用の Hex key | なし |
| `IMGPROXY_SALT` | Imgproxy 署名用の Hex salt | なし |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | PostgreSQL 接続設定 | `backend/.env.example` を参照 |
| `R2_*` / `MEILI_*` / `REDIS_*` / `TWITTER_*` | 追加機能設定（画像ホスティング / 検索 / キャッシュ / クロール / 通知） | `backend/.env.example` を参照 |

---

## デプロイ

### デプロイ時の注意

1. バックエンドの `ADMIN_PASSWORD` は必ず変更してください。変更しないと未承認アクセスのリスクがあります。
2. 本番 (`production`) で backend を起動する前に `SESSION_SECRET` を必ず設定してください。未設定だと起動時に停止します。
3. Passkeys を使う場合は `EXPECTED_ORIGIN` と `RP_ID` を正しく設定し、HTTPS 環境で実行してください。
4. PostgreSQL は主データベースです。永続ストレージを確保してください。`backend/data/` はキャッシュやレガシーファイル用です。
5. frontend を Vercel / Netlify、backend を別ホストへ置く場合は `ALLOWED_ORIGINS` を適切に設定してください。
6. backend は `better-sqlite3` と `bcrypt` などのネイティブモジュールに依存するため、Linux サーバーには `python3` / `make` / `g++` などのビルド環境が必要です。

### オプション A: `deploy.sh`（サーバー向け推奨）

対話式の `deploy.sh` は、依存のインストール、frontend のビルド、PM2 による backend の起動 / 再起動、frontend 静的ファイルと backend データの自動バックアップをサポートします。

1. サーバー上で実行します。
   ```bash
   ./deploy.sh
   ```
2. 初回実行時に `deploy.conf` が生成されるので、以下のパスを調整します。
   - `FRONTEND_DEPLOY_PATH`: Nginx などの静的サイト配置ディレクトリ
   - `FRONTEND_BACKUP_PATH`: デプロイ前のバックアップ先
3. もう一度実行し、デプロイ対象（frontend / backend / 両方）を選びます。残りはスクリプトが処理します。
4. 初回デプロイ、またはスキーマ変更がある場合は migrations を実行します。
   ```bash
   cd backend && npm run migrate
   ```

### オプション B: `update.sh`（日常更新向け）

`update.sh` は `git pull`、依存のインストール、ビルド、migrations 実行、PM2 再起動を自動化します。

```bash
./update.sh
```

### オプション C: 手動分割デプロイ

- frontend: `npm run build:frontend` を実行し、`frontend/dist` を Vercel / Netlify / GitHub Pages などへ配置
- backend: `backend` を VPS や Render などの Node.js サーバーへ配置し、PostgreSQL 接続と `DB_*` を設定したうえで次を実行
  ```bash
  cd backend
  npm install
  npm run build
  npm run migrate
  npm start
  ```

### オプション D: Nginx 統合デプロイ

1. frontend の `dist` をビルドし、Nginx で静的配信します。
2. Nginx の `/api` を `http://localhost:5010` の backend に reverse proxy します。
3. backend は `pm2` または `systemd` で常駐させます。

---

## License

ファン活動および学習用途のみ。商用利用は行いません。

ZUTOMAYO に関する内容と権利は原作者に帰属します。
