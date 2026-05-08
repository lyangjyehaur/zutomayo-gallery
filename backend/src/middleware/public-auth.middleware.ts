import type { Request, Response, NextFunction } from 'express';

export const requirePublicUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session.publicUserId;
  if (!userId) {
    res.status(401).json({ success: false, error: '請先登入後再操作', code: 'PUBLIC_UNAUTHORIZED' });
    return;
  }
  next();
};

