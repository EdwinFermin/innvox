---
title: Don't Leak Sensitive Data in Errors
impact: HIGH
impactDescription: Prevents security vulnerabilities and data exposure
tags: security, errors, sensitive-data, production
---

## Don't Leak Sensitive Data in Errors

Error messages and stack traces can expose sensitive information like database schemas, file paths, API keys, and internal implementation details.

**Incorrect (leaks sensitive data):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  try {
    const user = await db.query(
      'SELECT * FROM users WHERE id = $1 AND api_key = $2',
      [request.params.id, process.env.DB_API_KEY]
    )
    return user.rows[0]
  } catch (error) {
    // Exposes database schema, file paths, and stack trace
    return reply.code(500).send({
      error: error.message,
      stack: error.stack,
      query: error.query // Might contain API keys!
    })
  }
})
```

**Correct (safe error responses):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.setErrorHandler((error, request, reply) => {
  // Log full error internally
  request.log.error({
    err: error,
    req: {
      method: request.method,
      url: request.url,
      params: request.params
    }
  })

  // Send safe error to client
  const statusCode = error.statusCode || 500
  const isProduction = process.env.NODE_ENV === 'production'

  reply.code(statusCode).send({
    error: {
      message: isProduction && statusCode === 500
        ? 'Internal Server Error'
        : error.message,
      statusCode,
      // Only include stack in development
      ...((!isProduction) && { stack: error.stack })
    }
  })
})

app.get('/users/:id', async (request, reply) => {
  const user = await db.getUser(request.params.id)

  if (!user) {
    throw new Error('User not found')
  }

  return user
})
```

**Filter sensitive fields from logs:**

```typescript
const app = Fastify({
  logger: {
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        'apiKey',
        'creditCard',
        'ssn'
      ],
      remove: true // Remove entirely instead of replacing with [Redacted]
    }
  }
})
```

**Sanitize database errors:**

```typescript
class DatabaseError extends Error {
  constructor(originalError) {
    super('Database operation failed')
    this.name = 'DatabaseError'
    this.statusCode = 500

    // Log original error internally, don't expose to client
    if (process.env.NODE_ENV !== 'production') {
      this.originalMessage = originalError.message
    }
  }
}

app.get('/users/:id', async (request, reply) => {
  try {
    const user = await db.getUser(request.params.id)
    return user
  } catch (error) {
    throw new DatabaseError(error)
  }
})
```

Reference: [OWASP Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
