---
title: Handle Async Errors Properly
impact: HIGH
impactDescription: Prevents unhandled promise rejections and crashes
tags: async, errors, promises, fastify
---

## Handle Async Errors Properly

Async errors must be caught and handled properly to prevent unhandled promise rejections that can crash your application.

**Incorrect (missing error handling):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users/:id', (request, reply) => {
  // Missing await - error won't be caught
  db.getUser(request.params.id).then(user => {
    reply.send(user)
  })
  // If db.getUser rejects, it's unhandled
})

app.post('/process', async (request, reply) => {
  const result = await processData(request.body)

  // Fire-and-forget - errors are unhandled
  sendNotification(result.userId)

  return result
})
```

**Correct (proper async error handling):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

// Use async/await for route handlers
app.get('/users/:id', async (request, reply) => {
  // Errors automatically caught by Fastify
  const user = await db.getUser(request.params.id)
  return user
})

app.post('/process', async (request, reply) => {
  const result = await processData(request.body)

  // Handle background operations properly
  sendNotification(result.userId).catch(err => {
    request.log.error({ err, userId: result.userId }, 'Failed to send notification')
  })

  return result
})
```

**Using try/catch for specific error handling:**

```typescript
app.post('/transfer', async (request, reply) => {
  const { fromAccountId, toAccountId, amount } = request.body

  try {
    await transferMoney(fromAccountId, toAccountId, amount)
    return { success: true }
  } catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return reply.code(400).send({
        error: 'Insufficient funds',
        balance: error.balance
      })
    }
    throw error // Re-throw unexpected errors
  }
})
```

**Promise.all error handling:**

```typescript
app.get('/dashboard', async (request, reply) => {
  try {
    const [users, posts, comments] = await Promise.all([
      db.getUsers(),
      db.getPosts(),
      db.getComments()
    ])

    return { users, posts, comments }
  } catch (error) {
    // If any promise rejects, all are abandoned
    throw error
  }
})

// Use Promise.allSettled for partial failures
app.get('/dashboard-resilient', async (request, reply) => {
  const results = await Promise.allSettled([
    db.getUsers(),
    db.getPosts(),
    db.getComments()
  ])

  return {
    users: results[0].status === 'fulfilled' ? results[0].value : [],
    posts: results[1].status === 'fulfilled' ? results[1].value : [],
    comments: results[2].status === 'fulfilled' ? results[2].value : []
  }
})
```

Reference: [Async/Await Error Handling](https://nodejs.org/dist/latest/docs/api/errors.html)
