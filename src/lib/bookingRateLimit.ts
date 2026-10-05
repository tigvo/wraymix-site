type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      retryAfterSeconds: number;
    };

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

const globalForBookingRateLimit = globalThis as typeof globalThis & {
  bookingRateLimitStore?: Map<string, RateLimitEntry>;
};

const store =
  globalForBookingRateLimit.bookingRateLimitStore ??
  new Map<string, RateLimitEntry>();

globalForBookingRateLimit.bookingRateLimitStore = store;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    null
  );
}

export function checkBookingRateLimit(request: Request): RateLimitResult {
  const ip = getClientIp(request);

  // IPが取得できない環境（ローカル等）では誤ブロックを避ける。
  if (!ip) {
    return {
      allowed: true,
    };
  }

  const now = Date.now();

  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }

  const current = store.get(ip);

  if (!current || current.resetAt <= now) {
    store.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return {
      allowed: true,
    };
  }

  if (current.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      ),
    };
  }

  current.count += 1;

  return {
    allowed: true,
  };
}
