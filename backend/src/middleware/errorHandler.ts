import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// 自定義錯誤類
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
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
  
  // 默認錯誤響應
  let statusCode = 500;
  let message = '服務器內部錯誤';
  let details: unknown = undefined;
  
  // Zod 驗證錯誤
  if (err instanceof ZodError) {
    statusCode = 400;
    message = '輸入驗證失敗';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // 自定義應用錯誤
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // SyntaxError (JSON 解析錯誤)
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = '無效的 JSON 格式';
  }
  
  // 記錄錯誤
  console.error('[Global Error]:', {
    message: err.message,
    stack: isDev ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  
  // 發送響應
  res.status(statusCode).json({
    success: false,
    error: message,
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
