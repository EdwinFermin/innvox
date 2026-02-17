---
title: Implement Distributed Tracing
impact: LOW
impactDescription: Enables request tracing across microservices
tags: monitoring, tracing, observability, microservices
---

## Implement Distributed Tracing

Implement distributed tracing to track requests across multiple services.

**Correct (OpenTelemetry tracing):**

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify'

const provider = new NodeTracerProvider()
provider.register()

registerInstrumentations({
  instrumentations: [
    new FastifyInstrumentation()
  ]
})

import Fastify from 'fastify'

const app = Fastify()

app.addHook('onRequest', async (request, reply) => {
  // Trace ID automatically propagated
  request.log.info({ traceId: request.id }, 'Request started')
})

app.get('/users/:id', async (request, reply) => {
  // Automatically traced
  const user = await db.getUser(request.params.id)
  return user
})
```

Reference: [OpenTelemetry](https://opentelemetry.io/docs/instrumentation/js/)
