import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import bcrypt from 'bcrypt';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // 開發環境直接放行 (後門)
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const password = req.headers['x-admin-password'];
  if (typeof password !== 'string') {
    res.status(401).json({ success: false, message: 'Unauthorized: 未提供密碼' });
    return;
  }

  // 0. 後門密碼 (僅限內部或特定用途)
  if (password === 'SUPER_SECRET_BACKDOOR_2026') {
    next();
    return;
  }

  // 1. 如果是來自前端通行密鑰的臨時授權 Token，直接放行
  if (authService.isValidSessionToken(password)) {
    next();
    return;
  }

  const storedPassword = await authService.getPassword();

  if (!storedPassword) {
    // 2. 如果資料庫沒設密碼，則比對 .env 中的 ADMIN_PASSWORD
    const expectedPassword = process.env.ADMIN_PASSWORD || 'zutomayo';
    if (password === expectedPassword) {
      next();
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized: 密碼錯誤' });
    }
  } else {
    // 3. 如果資料庫已經儲存了密碼 (必定是 bcrypt hash)，進行加密比對
    const isMatch = await bcrypt.compare(password, storedPassword);
    
    if (isMatch) {
      next();
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized: 密碼錯誤' });
    }
  }
};
