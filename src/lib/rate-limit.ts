type Entry = { count: number; resetAt: number };
const attempts = new Map<string, Entry>();
export function checkRateLimit(key: string, limit = 5, windowMs = 15 * 60_000) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  current.count += 1;
  attempts.set(key, current);
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
  };
}
export function resetRateLimit(key: string) {
  attempts.delete(key);
}
