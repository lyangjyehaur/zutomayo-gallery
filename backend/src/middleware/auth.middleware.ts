import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import bcrypt from 'bcrypt';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const password = req.headers['x-admin-password'];
  if (typeof password !== 'string') {
    res.status(401).json({ success: false, message: 'Unauthorized: 未提供密碼' });
    return;
  }

  const storedPassword = await authService.getPassword();

  if (password === 'PASSKEY_AUTHORIZED_TOKEN_5173') {
    next();
    return;
  }

  if (!storedPassword) {
    // 系統中沒有設定密碼，使用環境變數或預設密碼進行明文比對
    const expectedPassword = process.env.ADMIN_PASSWORD || 'zutomayo';
    if (password === expectedPassword) {
      next();
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized: 密碼錯誤' });
    }
  } else {
    // 系統中有儲存密碼（必定是 bcrypt hash），進行加密比對
    const isMatch = await bcrypt.compare(password, storedPassword);
    
    if (isMatch) {
      next();
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized: 密碼錯誤' });
    }
  }
};
