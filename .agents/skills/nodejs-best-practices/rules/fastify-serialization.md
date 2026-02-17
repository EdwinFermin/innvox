---
title: Optimize JSON Serialization
impact: MEDIUM-HIGH
impactDescription: 2-3× faster JSON serialization
tags: fastify, serialization, performance, schema
---

## Optimize JSON Serialization

Fastify uses `fast-json-stringify` for schema-based serialization, which is much faster than `JSON.stringify`.

**Incorrect (no response schema):**

```typescript
app.get('/users', async () => {
  const users = await db.getUsers()
  return users // Uses JSON.stringify (slow)
})
```

**Correct (with response schema):**

```typescript
app.get('/users', {
  schema: {
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' }
          }
        }
      }
    }
  }
}, async () => {
  const users = await db.getUsers()
  return users // Uses fast-json-stringify (fast)
})
```

Reference: [Fastify Serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
