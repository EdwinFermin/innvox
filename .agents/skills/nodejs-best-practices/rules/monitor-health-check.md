---
title: Implement Health Check Endpoints
impact: LOW
impactDescription: Enables reliable deployment and monitoring
tags: monitoring, health-check, kubernetes, reliability
---

## Implement Health Check Endpoints

Implement health check endpoints for load balancers and orchestration systems.

**Correct (health check endpoints):**

```typescript
app.get('/health', { logLevel: 'silent' }, async (request, reply) => {
  return { status: 'ok', timestamp: Date.now() }
})

app.get('/health/ready', async (request, reply) => {
  try {
    await db.query('SELECT 1')
    await redis.ping()
    return { status: 'ready', services: { database: 'up', redis: 'up' } }
  } catch (error) {
    return reply.code(503).send({ status: 'not ready', error: error.message })
  }
})

app.get('/health/live', async (request, reply) => {
  return { status: 'alive' }
})
```

Reference: [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
