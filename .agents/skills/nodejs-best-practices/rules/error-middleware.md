---
title: Centralize Error Handling
impact: HIGH
impactDescription: Ensures consistent error responses and logging
tags: error, middleware, fastify, consistency
---

## Centralize Error Handling

Centralized error handling ensures consistent error responses, proper logging, and prevents error details from leaking in production.

**Incorrect (scattered error handling):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  try {
    const user = await db.getUser(request.params.id)
    return user
  } catch (error) {
    // Inconsistent error handling
    return reply.code(500).send({ error: error.message })
  }
})

app.get('/posts/:id', async (request, reply) => {
  try {
    const post = await db.getPost(request.params.id)
    return post
  } catch (error) {
    // Different error format
    return reply.code(500).send({ message: 'Error fetching post' })
  }
})
```

**Correct (centralized error handler):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

// Custom error classes
class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.statusCode = 404
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = 400
  }
}

// Centralized error handler
app.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode || 500

  // Log error with context
  request.log.error({
    err: error,
    req: request,
    statusCode
  })

  // Send consistent error response
  reply.code(statusCode).send({
    error: {
      message: statusCode === 500 ? 'Internal Server Error' : error.message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  })
})

// Routes can now throw errors
app.get('/users/:id', async (request, reply) => {
  const user = await db.getUser(request.params.id)

  if (!user) {
    throw new NotFoundError('User not found')
  }

  return user
})

app.get('/posts/:id', async (request, reply) => {
  const post = await db.getPost(request.params.id)

  if (!post) {
    throw new NotFoundError('Post not found')
  }

  return post
})
```

Reference: [Fastify Error Handling](https://fastify.dev/docs/latest/Reference/Errors/)
