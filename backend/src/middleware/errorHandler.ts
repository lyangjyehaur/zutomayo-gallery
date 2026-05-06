import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

// 自定義錯誤類
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 錯誤處理
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `路由 ${req.originalUrl} 不存在`,
    code: 'NOT_FOUND',
    statusCode: 404,
    requestId: (req as any).id,
  });
};

// 全局錯誤處理中間件
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isDev = process.env.NODE_ENV === 'development';
  const statusFromError = typeof (err as any)?.statusCode === 'number' ? (err as any).statusCode : undefined;
  const codeFromError = typeof (err as any)?.code === 'string' ? (err as any).code : undefined;
  
  // 默認錯誤響應
  let statusCode = 500;
  let message = '服務器內部錯誤';
  let code = 'INTERNAL_SERVER_ERROR';
  let details: unknown = undefined;
  
  // Zod 驗證錯誤
  if (err instanceof ZodError) {
    statusCode = 400;
    message = '輸入驗證失敗';
    code = 'VALIDATION_ERROR';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // 自定義應用錯誤
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.message;
    details = err.details;
  }
  // SyntaxError (JSON 解析錯誤)
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = '無效的 JSON 格式';
    code = 'INVALID_JSON';
  }
  // Sequelize 資料庫錯誤
  else if (err.name && String(err.name).startsWith('Sequelize')) {
    statusCode = 500;
    message = '資料庫查詢錯誤';
    code = 'DATABASE_ERROR';
  }
  else if (typeof statusFromError === 'number') {
    statusCode = statusFromError;
    if (codeFromError) code = codeFromError;
  }

  if (typeof codeFromError === 'string' && code === 'INTERNAL_SERVER_ERROR') {
    code = codeFromError;
  }
  
  // 記錄錯誤
  const reqLogger = (req as any).log || logger;
  reqLogger.error({
    err,
    requestId: (req as any).id,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: isDev ? err.stack : undefined,
  }, 'Unhandled error');
  
  // 發送響應
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    statusCode,
    requestId: (req as any).id,
    ...(details ? { details } : {}),
    ...(isDev && { 
      stack: err.stack,
      originalError: err.message,
    }),
  });
};

// 異步錯誤捕獲包裝器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
