---
title: Validate and Sanitize All Inputs
impact: CRITICAL
impactDescription: Prevents injection attacks and data corruption
tags: security, validation, fastify, schema
---

## Validate and Sanitize All Inputs

Input validation prevents SQL injection, NoSQL injection, and malformed data from reaching your application logic.

**Incorrect (no validation):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.post('/api/users', async (request, reply) => {
  const { email, age } = request.body

  // Direct use without validation - vulnerable to injection
  await db.query(`INSERT INTO users (email, age) VALUES ('${email}', ${age})`)

  return { success: true }
})
```

**Correct (Fastify schema validation):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.post('/api/users', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'age'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          maxLength: 255
        },
        age: {
          type: 'integer',
          minimum: 0,
          maximum: 150
        }
      },
      additionalProperties: false
    }
  }
}, async (request, reply) => {
  // Input is now validated and type-safe
  const { email, age } = request.body

  // Use parameterized queries to prevent SQL injection
  await db.query(
    'INSERT INTO users (email, age) VALUES ($1, $2)',
    [email, age]
  )

  return { success: true }
})
```

**Using Zod for validation:**

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email().max(255),
  age: z.number().int().min(0).max(150),
})

app.post('/api/users', async (request, reply) => {
  const validated = userSchema.parse(request.body)

  await db.query(
    'INSERT INTO users (email, age) VALUES ($1, $2)',
    [validated.email, validated.age]
  )

  return { success: true }
})
```

Reference: [Fastify Validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
