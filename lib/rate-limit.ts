const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 8;
const LOCK_MS = 30 * 60 * 1000;

type Bucket = { count: number; resetAt: number; blockUntil?: number };
const store = new Map<string, Bucket>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const bucket = store.get(key);

  if (bucket?.blockUntil && now < bucket.blockUntil) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.blockUntil - now };
  }

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= LIMIT) {
    bucket.blockUntil = now + LOCK_MS;
    store.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterMs: LOCK_MS };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return { allowed: true, remaining: LIMIT - bucket.count, retryAfterMs: 0 };
}

export function clearRateLimit(key: string) {
  store.delete(key);
}
