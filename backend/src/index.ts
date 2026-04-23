import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mvRoutes from './routes/mv.routes.js';
import authRoutes from './routes/auth.routes.js';
import systemRoutes from './routes/system.routes.js';
import fanartRoutes from './routes/fanart.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sequelize } from './services/pg.service.js';
import { initGeoService } from './services/geo.service.js';
import { TwitterMonitorService } from './services/twitter-monitor.service.js';

const app = express();
const PORT = process.env.PORT || 5010;

// 信任反向代理（如 Nginx），這樣 express-rate-limit 才能獲取到正確的真實客戶端 IP
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === 'true') {
  app.set('trust proxy', true);
} else if (trustProxy && !isNaN(Number(trustProxy))) {
  app.set('trust proxy', Number(trustProxy));
} else if (trustProxy) {
  app.set('trust proxy', trustProxy);
} else {
  app.set('trust proxy', false);
}

// 初始化服務
try {
  await sequelize.authenticate();
  console.log('PostgreSQL Database connected');
  initGeoService();
  console.log('IP2Region DB initialized');
  
  // 啟動 Twitter 監聽服務
  TwitterMonitorService.start();
} catch (error) {
  console.error('Failed to initialize services:', error);
}

// CORS 配置 - 僅允許特定來源
const allowedOrigins = [
  'http://localhost:5173',      // Vite dev server
  'http://localhost:4173',      // Vite preview
  'http://localhost:3000',      // 常見開發端口
  'https://mv.ztmr.club',       // 你的正式環境前端網域
];

// 從環境變數讀取額外允許的域名
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
}

const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // 允許無 origin 的請求（如移動應用或 curl）
    if (!origin) {
      // 在生產環境中，只有特定的內部路由允許無 Origin 請求
      if (isProduction && !allowedOrigins.includes('*')) {
        return callback(null, true); // 放行無 Origin 的請求，讓其他中介軟體或路由去處理授權
      }
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
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

// 健康檢查 (放在 CORS 之前，允許本機 curl 等無 Origin 請求)
app.get('/health', (req, res) => res.json({
  success: true,
  status: 'ZTMY_SERVER_ALIVE',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 請求限流 - 一般 API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 1000, // 每個 IP 1000 次請求
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
  windowMs: 15 * 60 * 1000, // 15 分鐘 (原為 1 小時)
  max: 200, // 每個 IP 200 次寫入 (原為 30 次)
  message: {
    success: false,
    error: '寫入操作過於頻繁，請稍後再試',
  },
});

// 應用限流中間件
app.use('/api/', apiLimiter);

// 針對寫入路由套用 writeLimiter，但排除需要頻繁操作的 admin 路由
app.use('/api/', (req, res, next) => {
  // 放行驗證與探測相關的路由，避免卡住正常管理操作
  if (req.path.includes('/verify-admin') || req.path.includes('/probe') || req.path.includes('/twitter-resolve')) {
    return next();
  }
  
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    writeLimiter(req, res, next);
  } else {
    next();
  }
});

// API 路由註冊
app.use('/api/auth', authRoutes);
app.use('/api/mvs', mvRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/fanarts', fanartRoutes);
app.use('/api/webhook', webhookRoutes);

// 404 處理 - 必須在所有路由之後
app.use(notFoundHandler);

// 全局錯誤處理 - 必須在最後
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`ZTMY Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});