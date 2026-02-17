---
title: Use Structured Logging
impact: HIGH
impactDescription: Enables efficient log querying and alerting
tags: logging, pino, observability, structured
---

## Use Structured Logging

Structured logging (JSON format) enables efficient searching, filtering, and alerting in production log aggregators like CloudWatch, Elasticsearch, or Datadog.

**Incorrect (string concatenation):**

```typescript
import Fastify from 'fastify'

const app = Fastify({ logger: true })

app.get('/users/:id', async (request, reply) => {
  const userId = request.params.id
  console.log('Fetching user with ID: ' + userId)

  const user = await db.getUser(userId)
  console.log('User found: ' + user.name + ', email: ' + user.email)

  return user
})
// Output: "Fetching user with ID: 123"
// Cannot easily query by userId or filter by operation
```

**Correct (structured logging with Pino):**

```typescript
import Fastify from 'fastify'

const app = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.ip,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  },
})

app.get('/users/:id', async (request, reply) => {
  const userId = request.params.id

  request.log.info({ userId, operation: 'fetch_user' }, 'Fetching user')

  const user = await db.getUser(userId)

  request.log.info({
    userId,
    userName: user.name,
    operation: 'user_found'
  }, 'User retrieved successfully')

  return user
})
// Output: {"level":30,"time":1674000000000,"userId":"123","operation":"fetch_user","msg":"Fetching user"}
```

**Add correlation IDs:**

```typescript
import { randomUUID } from 'crypto'

app.addHook('onRequest', async (request, reply) => {
  request.id = request.headers['x-request-id'] || randomUUID()
  request.log = request.log.child({ requestId: request.id })
})

app.get('/users/:id', async (request, reply) => {
  request.log.info({ userId: request.params.id }, 'Fetching user')
  // All logs include requestId for tracing across services
})
```

**Redact sensitive data:**

```typescript
const app = Fastify({
  logger: {
    redact: ['req.headers.authorization', 'password', 'creditCard'],
    level: 'info',
  },
})

app.post('/users', async (request, reply) => {
  // Password field automatically redacted from logs
  request.log.info({ body: request.body }, 'Creating user')

  const user = await db.createUser(request.body)
  return user
})
```

Reference: [Pino Logger](https://github.com/pinojs/pino)
