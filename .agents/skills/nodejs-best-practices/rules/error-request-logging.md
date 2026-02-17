---
title: Log Requests Efficiently
impact: HIGH
impactDescription: Enables debugging and monitoring without performance impact
tags: logging, requests, performance, observability
---

## Log Requests Efficiently

Request logging enables debugging and monitoring, but excessive logging can impact performance. Log strategically and exclude noisy endpoints.

**Incorrect (excessive or missing logging):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.addHook('onRequest', async (request, reply) => {
  // Logs every field, including large bodies
  console.log('Request:', JSON.stringify({
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body, // Can be very large!
    query: request.query
  }))
})

app.get('/health', async () => {
  // Health checks logged on every request (noisy)
  return { status: 'ok' }
})
```

**Correct (efficient request logging):**

```typescript
import Fastify from 'fastify'

const app = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          path: request.routerPath,
          parameters: request.params,
          headers: {
            host: request.headers.host,
            userAgent: request.headers['user-agent'],
            referer: request.headers.referer
          },
          remoteAddress: request.ip,
        }
      },
      res(response) {
        return {
          statusCode: response.statusCode,
        }
      }
    }
  }
})

// Exclude noisy endpoints from logging
app.get('/health', {
  logLevel: 'silent'
}, async () => {
  return { status: 'ok' }
})

app.get('/metrics', {
  logLevel: 'silent'
}, async () => {
  return getMetrics()
})
```

**Log response times:**

```typescript
app.addHook('onResponse', async (request, reply) => {
  const responseTime = reply.getResponseTime()

  // Only log slow requests
  if (responseTime > 1000) {
    request.log.warn({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime
    }, 'Slow request detected')
  }
})
```

**Add request IDs for tracing:**

```typescript
import { randomUUID } from 'crypto'

app.addHook('onRequest', async (request, reply) => {
  // Use existing request ID or generate new one
  const requestId = request.headers['x-request-id'] || randomUUID()

  request.id = requestId
  reply.header('x-request-id', requestId)

  // Create child logger with request ID
  request.log = request.log.child({ requestId })
})

app.get('/users/:id', async (request, reply) => {
  // All logs automatically include requestId
  request.log.info({ userId: request.params.id }, 'Fetching user')

  const user = await db.getUser(request.params.id)
  return user
})
```

**Sample requests in high-traffic scenarios:**

```typescript
let requestCount = 0

app.addHook('onRequest', async (request, reply) => {
  requestCount++

  // Log only 1% of requests
  if (requestCount % 100 === 0) {
    request.log.info({
      method: request.method,
      url: request.url,
      sample: true
    }, 'Sampled request')
  }
})
```

Reference: [Fastify Logging](https://fastify.dev/docs/latest/Reference/Logging/)
