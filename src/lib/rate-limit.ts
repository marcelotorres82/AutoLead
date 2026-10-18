type Entry = { count: number; resetAt: number };
const MAX_ENTRIES = 5_000;
const attempts = new Map<string, Entry>();

function pruneExpired(now: number) {
  if (attempts.size < 250) return;
  for (const [key, entry] of attempts.entries()) {
    if (entry.resetAt <= now) {
      attempts.delete(key);
    }
  }
  if (attempts.size >= MAX_ENTRIES) {
    const oldestKey = attempts.keys().next().value;
    if (oldestKey) attempts.delete(oldestKey);
  }
}

export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  return "local";
}

export function checkRateLimit(key: string, limit = 5, windowMs = 15 * 60_000) {
  const now = Date.now();
  pruneExpired(now);
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
