---
title: Implement Cache Invalidation
impact: MEDIUM
impactDescription: Ensures data consistency while maintaining performance
tags: caching, invalidation, consistency, performance
---

## Implement Cache Invalidation

Invalidate cached data when the underlying data changes to prevent stale data issues.

**Incorrect (stale cache):**

```typescript
const cache = new Map()

app.put('/products/:id', async (request, reply) => {
  await db.updateProduct(request.params.id, request.body)
  return { updated: true }
})
// Cache is not invalidated, returns stale data
```

**Correct (with invalidation):**

```typescript
app.put('/products/:id', async (request, reply) => {
  await db.updateProduct(request.params.id, request.body)

  // Invalidate cache
  cache.delete(`product:${request.params.id}`)
  await redis.del(`product:${request.params.id}`)

  return { updated: true }
})
```

Reference: [Cache Invalidation Strategies](https://www.cloudflare.com/learning/cdn/what-is-cache-invalidation/)
