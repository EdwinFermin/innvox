---
title: Use Decorators Effectively
impact: MEDIUM-HIGH
impactDescription: Enables type-safe code reuse
tags: fastify, decorators, typescript, architecture
---

## Use Decorators Effectively

Decorators extend Fastify instances with custom properties and methods in a type-safe way.

**Incorrect (global variables):**

```typescript
let currentUser = null

app.addHook('preHandler', async (request, reply) => {
  currentUser = await authenticate(request.headers.authorization)
})

app.get('/profile', async () => {
  return currentUser // Not type-safe, prone to race conditions
})
```

**Correct (request decorators):**

```typescript
app.decorateRequest('currentUser', null)

app.addHook('preHandler', async (request, reply) => {
  request.currentUser = await authenticate(request.headers.authorization)
})

app.get('/profile', async (request, reply) => {
  return request.currentUser // Type-safe, request-scoped
})
```

Reference: [Fastify Decorators](https://fastify.dev/docs/latest/Reference/Decorators/)
