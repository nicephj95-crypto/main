import type { Request, Response, NextFunction } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  // 만료된 버킷 주기적 정리 (메모리 누수 방어)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 10 * 60 * 1000); // 10분마다
  cleanupInterval.unref(); // 프로세스 종료를 막지 않음

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (current.count >= options.max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message: options.message });
    }

    current.count += 1;
    buckets.set(key, current);
    return next();
  };
}

