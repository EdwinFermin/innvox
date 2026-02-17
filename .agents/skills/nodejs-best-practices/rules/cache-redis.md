---
title: Implement Redis Caching
impact: MEDIUM
impactDescription: Enables shared caching across multiple servers
tags: caching, redis, distributed, performance
---

## Implement Redis Caching

Redis provides distributed caching for multi-server deployments with persistence and advanced features.

**Incorrect (no shared cache):**

```typescript
const localCache = new Map()

app.get('/config', async (request, reply) => {
  let config = localCache.get('config')
  if (!config) {
    config = await db.getConfig()
    localCache.set('config', config)
  }
  return config
})
// Each server has its own cache
```

**Correct (Redis cache):**

```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

app.get('/config', async (request, reply) => {
  let config = await redis.get('config')

  if (!config) {
    config = await db.getConfig()
    await redis.setex('config', 3600, JSON.stringify(config)) // 1 hour TTL
  } else {
    config = JSON.parse(config)
  }

  return config
})
// All servers share the same cache
```

Reference: [ioredis](https://github.com/luin/ioredis)
