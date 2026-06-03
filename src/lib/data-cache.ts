const cache = new Map<string, { data: any; timestamp: number }>();
const DEFAULT_TTL = 30000; // 30s

export function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DEFAULT_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedData(key: string, data: any, ttl = DEFAULT_TTL) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}
