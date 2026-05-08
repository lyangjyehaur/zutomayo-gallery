import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { errorEventEmitter } from '../services/error-events.service.js';

const USER_MESSAGE_MAP: Record<string, string> = {
  INVALID_CREDENTIALS: '帳號或密碼錯誤，請重新輸入',
  USERNAME_PASSWORD_REQUIRED: '請輸入帳號和密碼',
  Unauthorized: '請先登入後再操作',
  NO_FIELDS_TO_UPDATE: '沒有可更新的資料',
  INVALID_PREFERENCES: '通知偏好設定格式不正確',
  NO_VALID_PREFERENCES: '沒有有效的通知偏好設定',
  Forbidden: '您沒有權限執行此操作',
  'No active challenge': '認證階段已過期，請重新操作',
  'No active authentication session': '認證階段已過期，請重新操作',
  'Passkey authentication failed': 'Passkey 驗證失敗，請重試',
  'Passkey registration verification failed': 'Passkey 註冊驗證失敗，請重試',
  'Passkey requires re-registration': 'Passkey 需要重新註冊，請使用密碼登入',
  INVALID_EMAIL: '請輸入有效的電子郵件地址',
  MAIL_SEND_FAILED: '郵件發送失敗，請稍後再試',
  MAIL_NOT_CONFIGURED: '郵件服務尚未設定',
  TOKEN_NOT_FOUND: '驗證連結無效',
  TOKEN_PURPOSE_INVALID: '驗證連結類型不正確',
  TOKEN_USED: '此驗證連結已使用過',
  TOKEN_EXPIRED: '驗證連結已過期，請重新請求',
  USER_NOT_FOUND: '找不到使用者，請重新登入',
  PUBLIC_UNAUTHORIZED: '請先登入後再操作',
  EMAIL_ALREADY_REGISTERED: '此電子郵件已註冊，請直接登入',
  PASSWORD_NOT_SET: '此帳號尚未設定密碼，請使用魔法連結登入',
  EMAIL_NOT_VERIFIED: '電子郵件尚未驗證，請先完成驗證',
  'Not authenticated': '請先登入後再操作',
  'Missing required fields': '缺少必要的訂閱資訊',
  'Failed to subscribe': '推播訂閱失敗，請稍後再試',
  'Missing endpoint': '缺少推播端點資訊',
  'Failed to unsubscribe': '取消訂閱失敗，請稍後再試',
  'VAPID not configured': '推播服務尚未設定',
  'Error log not found': '找不到此錯誤記錄',
  'ids is required': '請提供要處理的錯誤記錄 ID',
  'url is required': '請提供圖片網址',
  'Webhook not configured': 'Webhook 服務尚未設定',
  'Invalid webhook token': 'Webhook 權杖無效',
  'Failed to send Bark notification': '通知發送失敗',
  'Internal server error': '系統暫時發生錯誤，請稍後再試',
  'Group not found': '找不到此媒體群組',
  'Media not found': '找不到此媒體',
  TARGET_REQUIRED: '請指定合併目標',
  'source_url is required': '請提供來源網址',
  'Only tweet-source media can be assigned here': '僅推文來源的媒體可在此指派',
  '無法生成認證選項': '無法為此帳號生成認證選項，請確認帳號名稱正確',
};

function toUserMessage(machineCode: string): string {
  if (USER_MESSAGE_MAP[machineCode]) return USER_MESSAGE_MAP[machineCode];
  if (machineCode in USER_MESSAGE_MAP) return USER_MESSAGE_MAP[machineCode];
  return machineCode;
}

// 自定義錯誤類
export class AppError extends Error {
  public userMessage: string;

  constructor(
    public statusCode: number,
    message: string,
    userMessage?: string,
    public isOperational = true,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.userMessage = userMessage || toUserMessage(message);
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
  let message = '系統暫時發生錯誤，請稍後再試';
  let code = 'INTERNAL_SERVER_ERROR';
  let details: unknown = undefined;
  
  // Zod 驗證錯誤
  if (err instanceof ZodError) {
    statusCode = 400;
    message = '輸入資料格式不正確，請檢查後重試';
    code = 'VALIDATION_ERROR';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // 自定義應用錯誤
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.userMessage || toUserMessage(err.message);
    code = err.message;
    details = err.details;
  }
  // SyntaxError (JSON 解析錯誤)
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = '請求格式不正確，請重試';
    code = 'INVALID_JSON';
  }
  // Sequelize 資料庫錯誤
  else if (err.name && String(err.name).startsWith('Sequelize')) {
    statusCode = 500;
    message = '系統暫時發生錯誤，請稍後再試';
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

  errorEventEmitter.emitError({
    source: 'request',
    message,
    stack: err.stack,
    statusCode,
    code,
    method: req.method,
    url: req.originalUrl,
    requestId: (req as any).id,
    ip: req.ip,
    details,
  });

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
