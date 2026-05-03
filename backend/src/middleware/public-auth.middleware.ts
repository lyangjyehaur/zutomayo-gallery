import type { Request, Response, NextFunction } from 'express';

export const requirePublicUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.session as any)?.publicUserId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'PUBLIC_UNAUTHORIZED' });
    return;
  }
  next();
};

