---
title: Follow RESTful Design Principles
impact: CRITICAL
impactDescription: Ensures API consistency and predictability
tags: api, rest, http, design
---

## Follow RESTful Design Principles

RESTful APIs use HTTP methods semantically and resource-based URLs for consistent, intuitive interfaces.

**Incorrect (non-RESTful design):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

// Non-semantic endpoints
app.post('/getUserById', async (request, reply) => {
  const { userId } = request.body
  return await db.getUser(userId)
})

app.post('/deleteUser', async (request, reply) => {
  const { userId } = request.body
  await db.deleteUser(userId)
  return { success: true }
})

app.post('/updateUserEmail', async (request, reply) => {
  const { userId, email } = request.body
  await db.updateUser(userId, { email })
  return { success: true }
})
```

**Correct (RESTful design):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

// GET for retrieving resources
app.get('/users/:id', async (request, reply) => {
  const user = await db.getUser(request.params.id)
  if (!user) {
    return reply.code(404).send({ error: 'User not found' })
  }
  return user
})

// POST for creating resources
app.post('/users', async (request, reply) => {
  const user = await db.createUser(request.body)
  return reply.code(201).send(user)
})

// PUT for full updates
app.put('/users/:id', async (request, reply) => {
  const user = await db.updateUser(request.params.id, request.body)
  if (!user) {
    return reply.code(404).send({ error: 'User not found' })
  }
  return user
})

// PATCH for partial updates
app.patch('/users/:id', async (request, reply) => {
  const user = await db.partialUpdateUser(request.params.id, request.body)
  if (!user) {
    return reply.code(404).send({ error: 'User not found' })
  }
  return user
})

// DELETE for removing resources
app.delete('/users/:id', async (request, reply) => {
  const deleted = await db.deleteUser(request.params.id)
  if (!deleted) {
    return reply.code(404).send({ error: 'User not found' })
  }
  return reply.code(204).send()
})
```

**Status code guidelines:**

```typescript
// 200 OK - Successful GET, PUT, PATCH
// 201 Created - Successful POST
// 204 No Content - Successful DELETE
// 400 Bad Request - Invalid input
// 401 Unauthorized - Missing/invalid auth
// 403 Forbidden - Insufficient permissions
// 404 Not Found - Resource doesn't exist
// 409 Conflict - Resource conflict
// 500 Internal Server Error - Server error
```

Reference: [REST API Tutorial](https://restfulapi.net/)
