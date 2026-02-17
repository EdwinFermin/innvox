---
title: Use In-Memory LRU Caching
impact: MEDIUM
impactDescription: 10-100× faster than database queries
tags: caching, lru, performance, memory
---

## Use In-Memory LRU Caching

LRU (Least Recently Used) caches provide fast access to frequently used data while managing memory efficiently.

**Incorrect (no caching):**

```typescript
app.get('/products/:id', async (request, reply) => {
  // Database query on every request
  const product = await db.query('SELECT * FROM products WHERE id = $1', [request.params.id])
  return product
})
```

**Correct (LRU cache):**

```typescript
import { LRUCache } from 'lru-cache'

const productCache = new LRUCache({
  max: 500, // Maximum 500 items
  ttl: 1000 * 60 * 5, // 5 minutes
})

app.get('/products/:id', async (request, reply) => {
  const productId = request.params.id
  let product = productCache.get(productId)

  if (!product) {
    product = await db.query('SELECT * FROM products WHERE id = $1', [productId])
    productCache.set(productId, product)
  }

  return product
})
```

Reference: [lru-cache](https://github.com/isaacs/node-lru-cache)
