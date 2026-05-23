# ZUTOMAYO Gallery - 項目開發規範

## Git 忽略規則

### 忽略（不進 repo）

```
# Agent / 工具目錄
.hermes/
.omh/
.trae/
.merge-worktrees/
.workbuddy/
.cursor/

# Agent 導覽文件
memory.md
*-memory.md
agents.md
AGENTS.md
docs-index.md
CODE_WIKI.md

# 敏感配置
.env
.env.*
!.env.example
!*.env.production

# 測試產物
coverage/
__snapshots__/
*.lcov

# 常見 build 產物
dist/
build/
node_modules/
*.tsbuildinfo

# 系統文件
.DS_Store
**/.DS_Store
```

### 追蹤（進 repo）

- `.env.example` — 環境變數模板（無敏感值）
- `*.env.production` — 生產配置（僅含公開 URL）
- `.test.ts` / `.spec.ts` — 測試源碼
- `docs/` — 項目文檔

## 文件結構

```
項目根目錄/
├── docs/                  → 架構設計、系統文檔（外部參考）
├── scripts/               → 項目級腳本
├── src/
│   ├── controllers/       → 路由處理
│   ├── services/          → 業務邏輯
│   ├── models/            → 資料模型
│   ├── middleware/         → 中間件
│   ├── utils/             → 工具函數
│   └── scripts/           → CLI 腳本
├── README.md              → 項目說明
├── .env.example           → 環境變數模板
└── package.json
```

## 測試規範

- 測試源碼（`.test.ts`）→ 原地不動，正常 commit
- 測試產物 → gitignore
- 命名：統一用 `.test.ts`，不用 `.spec.ts`

## 命名規範

- 測試檔：`xxx.test.ts`
- 腳本檔：`kebab-case`
- 組件檔：`PascalCase.tsx`
- 工具檔：`camelCase.ts` 或 `kebab-case.ts`

## 環境變數

- 新增環境變數時，同步更新 `.env.example`
- 本地 `.env` 指向測試庫，不可直連生產資料庫
- 所有 `localStorage` / `sessionStorage` 存取都要包在 `try-catch`

## 注意事項

- 空目錄用 `.gitkeep` 保持結構
- 未經明確要求，不要 push changes
- 修改影響 behavior/API/schema 的改動，需同步更新 docs/
- 不要引入新的 state 管理庫（如 Redux/Zustand），沿用現有 patterns
- 不要隨意調整 `z-index`，遵循現有 layering

## 新項目初始化 Checklist

1. 建立 `.gitignore`（參考上方規則）
2. 建立 `.env.example`（列出所有環境變數）
3. 建立 `docs/` 目錄
4. 建立 `scripts/` 目錄
5. 確認 `README.md` 包含：項目說明、啟動方式、環境變數說明

## 本項目特殊規則

### 多語言 README

根目錄保留多語言版本：
- `README.md` — 主要（繁體中文）
- `README.en.md` — English
- `README.ja.md` — 日本語
- `README.zh-Hans.md` — 简体中文

### 圖片儲存

- 正式環境使用 Cloudflare R2
- 本地開發讀取正式 R2 圖片沒問題，但寫入腳本要注意

### 留言系統

- 使用 Waline，本地開發可留空 `VITE_WALINE_SERVER_URL`

### 版本管理

- 使用 `scripts/sync-version.mjs` 同步版本號
- `review-app/` 採用獨立版本號，不與主項目同步
