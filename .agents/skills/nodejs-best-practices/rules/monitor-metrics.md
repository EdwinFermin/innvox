---
title: Collect Application Metrics
impact: LOW
impactDescription: Enables performance monitoring and capacity planning
tags: monitoring, metrics, prometheus, observability
---

## Collect Application Metrics

Collect and expose application metrics for monitoring and alerting.

**Correct (Prometheus metrics):**

```typescript
import promClient from 'prom-client'

const register = new promClient.Register()

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})

register.registerMetric(httpRequestDuration)

app.addHook('onResponse', (request, reply, done) => {
  httpRequestDuration
    .labels(request.method, request.routerPath, reply.statusCode.toString())
    .observe(reply.getResponseTime() / 1000)
  done()
})

app.get('/metrics', async (request, reply) => {
  reply.type('text/plain')
  return await register.metrics()
})
```

Reference: [prom-client](https://github.com/siimon/prom-client)
