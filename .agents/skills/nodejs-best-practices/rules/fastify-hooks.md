---
title: Optimize Hook Usage
impact: MEDIUM-HIGH
impactDescription: Improves request handling efficiency
tags: fastify, hooks, lifecycle, performance
---

## Optimize Hook Usage

Fastify hooks allow you to intercept the request lifecycle. Use them strategically to avoid performance overhead.

**Incorrect (blocking hooks):**

```typescript
app.addHook('onRequest', async (request, reply) => {
  // Expensive operation blocks every request
  const config = await loadConfigFromDatabase()
  request.config = config
})
```

**Correct (efficient hooks):**

```typescript
// Load config once at startup
const config = await loadConfig()

app.addHook('onRequest', async (request, reply) => {
  // Fast, non-blocking operation
  request.startTime = Date.now()
})

app.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime
  request.log.info({ duration, url: request.url })
})
```

Reference: [Fastify Hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
