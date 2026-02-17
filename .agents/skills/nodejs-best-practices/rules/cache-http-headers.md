---
title: Use HTTP Caching Headers
impact: MEDIUM
impactDescription: Reduces server load and bandwidth usage
tags: caching, http, headers, performance
---

## Use HTTP Caching Headers

HTTP caching headers enable client and CDN caching, reducing server load.

**Incorrect (no caching headers):**

```typescript
app.get('/products/:id', async (request, reply) => {
  const product = await db.getProduct(request.params.id)
  return product
})
```

**Correct (with caching headers):**

```typescript
app.get('/products/:id', async (request, reply) => {
  const product = await db.getProduct(request.params.id)

  reply.header('Cache-Control', 'public, max-age=300, s-maxage=600')
  reply.header('ETag', generateETag(product))

  return product
})
```

Reference: [HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
