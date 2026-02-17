---
title: Use Stale-While-Revalidate Pattern
impact: MEDIUM
impactDescription: Provides instant responses while updating in background
tags: caching, stale-while-revalidate, performance
---

## Use Stale-While-Revalidate Pattern

Serve stale cache entries immediately while refreshing them in the background.

**Correct (stale-while-revalidate):**

```typescript
async function getWithSWR(key, fetcher, ttl = 300) {
  const cached = await redis.get(key)
  const staleTime = await redis.get(`${key}:stale`)

  if (cached) {
    // Check if stale
    if (Date.now() > parseInt(staleTime)) {
      // Refresh in background
      fetcher().then(data => redis.setex(key, ttl, JSON.stringify(data)))
    }
    return JSON.parse(cached)
  }

  const data = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(data))
  await redis.setex(`${key}:stale`, ttl / 2, Date.now() + (ttl / 2 * 1000))
  return data
}
```

Reference: [Stale-While-Revalidate](https://web.dev/stale-while-revalidate/)
