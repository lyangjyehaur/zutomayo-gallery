import 'dotenv/config';
import express from 'express';
import { BUILD_INFO } from './build-info.js';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize';
import RedisStore from 'rate-limit-redis';
import mvRoutes from './routes/mv.routes.js';
import authRoutes from './routes/auth.routes.js';
import fanartRoutes from './routes/fanart.routes.js';
import stagingFanartRoutes from './routes/staging-fanart.routes.js';
import systemRoutes from './routes/system.routes.js';
import sitemapRoutes from './routes/sitemap.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import albumRoutes from './routes/album.routes.js';
import artistRoutes from './routes/artist.routes.js';
import adminSystemRoutes from './routes/admin-system.routes.js';
import publicAuthRoutes from './routes/public-auth.routes.js';
import submissionRoutes from './routes/submissions.routes.js';
import adminSubmissionRoutes from './routes/admin-submissions.routes.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { errorEventEmitter } from './services/error-events.service.js';
import { sequelize, AuthPasskey, AuthSetting } from './services/pg.service.js';
import { initGeoService } from './services/geo.service.js';
import { initRedis, redisClient, deleteKeysByPattern } from './services/redis.service.js';
import { initMeiliSearch, syncDataToMeili } from './services/meili.service.js';
import { initQueues, bullBoardAdapter } from './services/queue.service.js';
import { getSessionCookieOptions, getSessionMaxAgeMs, sessionCookieName } from './config/session.js';
import { httpLogger, logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 5010;
const isProduction = process.env.NODE_ENV === 'production';
const sessionMaxAgeMs = getSessionMaxAgeMs();
let useDbSessionStore = false;
let useRedisSessionStore = false;
let sessionStore: session.Store = new session.MemoryStore();

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

// CORS 配置 - 僅允許特定來源
import { getAllowedOrigins, resolveCorsOrigin } from './utils/cors.js';

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }
    
    if (resolveCorsOrigin(origin)) {
      callback(null, true);
    } else {
      logger.warn({ origin }, '[CORS] Blocked request from origin');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

app.use(httpLogger);

// 健康檢查 (放在 CORS 之前，允許本機 curl 等無 Origin 請求)
app.get('/health', (req, res) => res.json({
  success: true,
  status: 'ZTMY_SERVER_ALIVE',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  version: BUILD_INFO.version,
  buildNumber: BUILD_INFO.buildNumber,
  buildTime: BUILD_INFO.buildTime,
}));

await initRedis();

if (redisClient.isOpen) {
  const cleared = await deleteKeysByPattern('api-cache:*');
  if (cleared > 0) logger.info({ cleared }, '[Redis] API cache cleared on startup');
}

useRedisSessionStore = redisClient.isOpen && (isProduction || process.env.SESSION_STORE === 'redis');
useDbSessionStore = !useRedisSessionStore && (isProduction || process.env.SESSION_STORE === 'sequelize');

if (useRedisSessionStore) {
  const mod: any = await import('connect-redis');
  const Store: any = mod.RedisStore || mod.default || mod;
  sessionStore = new Store({
    client: redisClient,
    prefix: 'sess:',
  });
} else if (useDbSessionStore) {
  sessionStore = new (connectSessionSequelize(session.Store))({
    db: sequelize,
    tableName: 'sessions',
    expiration: sessionMaxAgeMs,
    checkExpirationInterval: Math.min(sessionMaxAgeMs, 15 * 60 * 1000),
  });
} else {
  sessionStore = new session.MemoryStore();
}

app.use(cors(corsOptions));
app.use(compression()); // 啟用 gzip/brotli 壓縮，大幅減少大型 JSON 的傳輸體積
// Session secret：生產環境必須設定 SESSION_SECRET，否則拒絕啟動
const sessionSecret = process.env.SESSION_SECRET || (!isProduction ? 'dev-session-secret' : undefined);
if (!sessionSecret) {
  logger.fatal('SESSION_SECRET environment variable is required in production');
  process.exit(1);
}

app.use(session({
  name: sessionCookieName,
  secret: sessionSecret,
  store: sessionStore,
  proxy: Boolean(app.get('trust proxy')),
  resave: false,
  saveUninitialized: false,
  cookie: getSessionCookieOptions(),
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const createRateLimitStore = (prefix?: string) => {
  if (!redisClient.isOpen) return undefined;
  try {
    return new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      ...(prefix ? { prefix } : {}),
    });
  } catch (e) {
    logger.warn({ err: e }, '[RateLimit] Failed to create Redis store, falling back to memory');
    return undefined;
  }
};

const apiRateLimitStore = createRateLimitStore();
const writeRateLimitStore = createRateLimitStore('rl:write:');
const authRateLimitStore = createRateLimitStore('rl:auth:');

// 請求限流 - 一般 API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 1000, // 每個 IP 1000 次請求
  standardHeaders: true,
  legacyHeaders: false,
  ...(apiRateLimitStore ? { store: apiRateLimitStore } : {}),
  message: {
    success: false,
    error: '請求過於頻繁，請稍後再試',
    retryAfter: 900,
  },
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
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 200, // 每個 IP 200 次寫入
  ...(writeRateLimitStore ? { store: writeRateLimitStore } : {}),
  message: {
    success: false,
    error: '寫入操作過於頻繁，請稍後再試',
  },
});

// 認證路由嚴格限流 - 防止暴力破解
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 20, // 每個 IP 20 次認證嘗試
  standardHeaders: true,
  legacyHeaders: false,
  ...(authRateLimitStore ? { store: authRateLimitStore } : {}),
  message: {
    success: false,
    error: '登入嘗試過於頻繁，請稍後再試',
  },
});

// 應用限流中間件
app.use('/api/', apiLimiter);

// 針對寫入路由套用 writeLimiter，但排除需要頻繁操作的 admin 路由
app.use('/api/', (req, res, next) => {
  // 放行驗證與探測相關的路由，避免卡住正常管理操作
  if (req.path.includes('/probe') || req.path.includes('/twitter-resolve')) {
    return next();
  }
  
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    writeLimiter(req, res, next);
  } else {
    next();
  }
});

// API 路由註冊
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/public-auth', authLimiter, publicAuthRoutes);
app.use('/api/mvs', mvRoutes);
app.use('/api/album', albumRoutes);
app.use('/api/artist', artistRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/fanarts', fanartRoutes);
app.use('/api/staging-fanarts', stagingFanartRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin/system', adminSystemRoutes);
app.use('/api/admin/submissions', adminSubmissionRoutes);

// 如果 bull-board 初始化成功，掛載可視化介面路由
if (bullBoardAdapter) {
  app.use('/api/admin/queues', bullBoardAdapter.getRouter());
  logger.info({ port: PORT }, 'BullMQ Dashboard mounted at /api/admin/queues');
}

// Sitemap
app.use('/api', sitemapRoutes);

// 404 處理 - 必須在所有路由之後
app.use(notFoundHandler);

// 全局錯誤處理 - 必須在最後
app.use(globalErrorHandler);

const initServices = async () => {
  try {
    await sequelize.authenticate();

    try {
      const { migrator } = await import('./scripts/migrate.js');
      await migrator.up();
      const { seedAdminRBAC } = await import('./seeds/admin.seed.js');
      await seedAdminRBAC();
      logger.info('Database migrations executed successfully');
    } catch (migErr) {
      logger.error({ err: migErr }, 'Migration failed during startup');
      errorEventEmitter.emitError({
        source: 'uncaught',
        message: `Migration failure: ${migErr instanceof Error ? migErr.message : String(migErr)}`,
        stack: migErr instanceof Error ? migErr.stack : undefined,
        details: { phase: 'migration' },
      });
    }

    const schemaMode = process.env.DB_SCHEMA_MODE || (isProduction ? 'safe' : 'alter');
    const allowAlter = schemaMode === 'alter';
    const skipSync = schemaMode === 'none';

    if (!skipSync) {
      if (allowAlter) {
        await AuthPasskey.sync({ alter: true });
        await AuthSetting.sync({ alter: true });
        const { syncModels } = await import('./models/index.js');
        await syncModels({ alter: true });
      } else {
        await AuthPasskey.sync();
        await AuthSetting.sync();
        const { syncModels } = await import('./models/index.js');
        await syncModels();
      }
    }

    if (useDbSessionStore && 'sync' in sessionStore && typeof (sessionStore as any).sync === 'function') {
      await (sessionStore as any).sync();
    }

    logger.info('PostgreSQL Database connected and schema initialization completed');

    await initMeiliSearch();
    await syncDataToMeili();
    initGeoService();
    logger.info('IP2Region DB initialized');

    await initQueues();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    logger.error({ err: error }, 'Failed to initialize services');
    errorEventEmitter.emitError({
      source: 'uncaught',
      message: `Startup failure: ${errMsg}`,
      stack: errStack,
      details: { phase: 'initServices' },
    });
    process.exit(1);
  }
};

await initServices();

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'ZTMY Backend running');
  logger.info({ env: process.env.NODE_ENV || 'development' }, 'Environment');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  errorEventEmitter.emitError({
    source: 'uncaught',
    message: err.message || 'Uncaught exception',
    stack: err.stack,
  });
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.fatal({ reason }, 'Unhandled rejection');
  errorEventEmitter.emitError({
    source: 'unhandled_rejection',
    message,
    stack,
  });
});
