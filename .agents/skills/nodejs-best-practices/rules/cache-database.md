---
title: Cache Database Queries
impact: MEDIUM
impactDescription: Reduces database load and improves response times
tags: caching, database, performance, redis
---

## Cache Database Queries

Cache frequently accessed database queries to reduce database load.

**Incorrect (no query caching):**

```typescript
app.get('/popular-products', async (request, reply) => {
  // Expensive query runs on every request
  const products = await db.query(`
    SELECT * FROM products
    ORDER BY sales DESC
    LIMIT 10
  `)
  return products
})
```

**Correct (with query caching):**

```typescript
app.get('/popular-products', async (request, reply) => {
  const cacheKey = 'popular-products'
  let products = await redis.get(cacheKey)

  if (!products) {
    products = await db.query(`
      SELECT * FROM products
      ORDER BY sales DESC
      LIMIT 10
    `)
    await redis.setex(cacheKey, 300, JSON.stringify(products)) // 5 min TTL
  } else {
    products = JSON.parse(products)
  }

  return products
})
```

Reference: [Query Caching Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)
