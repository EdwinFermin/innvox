---
title: Implement Rate Limiting
impact: MEDIUM
impactDescription: Protects against abuse and ensures fair resource allocation
tags: async, rate-limiting, security, fastify
---

## Implement Rate Limiting

Rate limiting prevents API abuse and ensures fair resource distribution among clients.

**Incorrect (no rate limiting):**

```typescript
app.post('/api/send-email', async (request, reply) => {
  await sendEmail(request.body)
  return { sent: true }
})
// Vulnerable to abuse
```

**Correct (with rate limiting):**

```typescript
import rateLimit from '@fastify/rate-limit'

await app.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: '15 minutes'
})

app.post('/api/send-email', async (request, reply) => {
  await sendEmail(request.body)
  return { sent: true }
})
```

Reference: [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit)
