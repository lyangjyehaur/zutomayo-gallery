import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mvRoutes from './routes/mv.routes.js';
import authRoutes from './routes/auth.routes.js';
import systemRoutes from './routes/system.routes.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initDB } from './services/db.service.js';

const app = express();
const PORT = process.env.PORT || 5010;

// 初始化資料庫
await initDB();

// CORS 配置 - 僅允許特定來源
const allowedOrigins = [
  'http://localhost:5173',      // Vite dev server
  'http://localhost:4173',      // Vite preview
  'http://localhost:3000',      // 常見開發端口
];

// 從環境變數讀取額外允許的域名
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // 允許無 origin 的請求（如移動應用或 curl）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-admin-password'],
  maxAge: 86400, // 24小時
};

// Helmet 安全標頭
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // 允許嵌入外部資源
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 請求限流 - 一般 API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 每個 IP 100 次請求
  message: {
    success: false,
    error: '請求過於頻繁，請稍後再試',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: '請求過於頻繁，請稍後再試',
      retryAfter: Math.ceil((req as any).rateLimit.resetTime.getTime() / 1000),
    });
  },
});

// 更嚴格的限流 - 寫入操作
const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 30, // 每個 IP 30 次寫入
  message: {
    success: false,
    error: '寫入操作過於頻繁，請稍後再試',
  },
});

// 應用限流中間件
app.use('/api/', apiLimiter);

// API 路由註冊
app.use('/api/auth', authRoutes);
app.use('/api/mvs', mvRoutes);
app.use('/api/system', systemRoutes);

// 健康檢查
app.get('/health', (req, res) => res.json({
  success: true,
  status: 'ZTMY_SERVER_ALIVE',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

// 404 處理 - 必須在所有路由之後
app.use(notFoundHandler);

// 全局錯誤處理 - 必須在最後
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`ZTMY Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});