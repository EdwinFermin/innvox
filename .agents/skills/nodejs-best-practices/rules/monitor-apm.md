---
title: Integrate APM Tools
impact: LOW
impactDescription: Provides end-to-end observability
tags: monitoring, apm, observability, performance
---

## Integrate APM Tools

Use Application Performance Monitoring (APM) tools for deep insights into application behavior.

**Correct (with APM integration):**

```typescript
// Load APM as first import
import apm from 'elastic-apm-node'

apm.start({
  serviceName: 'my-api',
  serverUrl: process.env.APM_SERVER_URL,
  environment: process.env.NODE_ENV
})

import Fastify from 'fastify'

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  const span = apm.startSpan('db.getUser')
  const user = await db.getUser(request.params.id)
  span?.end()

  return user
})
```

Reference: [Elastic APM Node.js](https://www.elastic.co/guide/en/apm/agent/nodejs/current/index.html)
