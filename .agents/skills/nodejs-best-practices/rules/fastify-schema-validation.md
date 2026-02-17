---
title: Use JSON Schema Validation
impact: MEDIUM-HIGH
impactDescription: 10-20× faster than runtime validation libraries
tags: fastify, validation, schema, performance
---

## Use JSON Schema Validation

Fastify's built-in JSON schema validation is extremely fast and provides automatic request/response validation and serialization.

**Incorrect (runtime validation):**

```typescript
import Fastify from 'fastify'
import { z } from 'zod'

const app = Fastify()

app.post('/users', async (request, reply) => {
  // Runtime validation on every request
  const schema = z.object({
    email: z.string().email(),
    age: z.number().min(0).max(150)
  })

  const validated = schema.parse(request.body) // Slow
  return await db.createUser(validated)
})
```

**Correct (JSON schema validation):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'age'],
      properties: {
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0, maximum: 150 }
      },
      additionalProperties: false
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          age: { type: 'integer' }
        }
      }
    }
  }
}, async (request, reply) => {
  // Body is already validated and type-safe
  const user = await db.createUser(request.body)
  return reply.code(201).send(user)
})
```

Reference: [Fastify Validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
