---
title: Handle Unhandled Rejections
impact: HIGH
impactDescription: Prevents application crashes from unhandled promises
tags: promises, errors, process, graceful-shutdown
---

## Handle Unhandled Rejections

Unhandled promise rejections can crash your Node.js application. Always handle them gracefully with proper logging and recovery.

**Incorrect (no rejection handler):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.listen({ port: 3000 })

// Background task without error handling
setInterval(async () => {
  // If this throws, it's unhandled and will crash the app
  await syncDataWithExternalAPI()
}, 60000)
```

**Correct (global rejection handler):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)

  // Log to error tracking service
  errorTracker.captureException(reason)

  // Don't exit immediately - allow in-flight requests to complete
  // But set a flag to prevent new requests
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)

  // Log to error tracking service
  errorTracker.captureException(error)

  // Gracefully shutdown
  gracefulShutdown()
})

// Background task with proper error handling
setInterval(async () => {
  try {
    await syncDataWithExternalAPI()
  } catch (error) {
    console.error('Background sync failed:', error)
    // Handle error but don't crash
  }
}, 60000)

app.listen({ port: 3000 })
```

**Graceful shutdown:**

```typescript
async function gracefulShutdown(signal = 'SIGTERM') {
  console.log(`Received ${signal}, starting graceful shutdown`)

  // Stop accepting new connections
  await app.close()

  // Close database connections
  await db.end()

  // Close other resources
  await redis.quit()

  console.log('Graceful shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
```

**Properly handle async operations:**

```typescript
// Incorrect - fire and forget
app.post('/users', async (request, reply) => {
  const user = await db.createUser(request.body)

  // This can fail silently
  sendWelcomeEmail(user.email)

  return user
})

// Correct - handle or await
app.post('/users', async (request, reply) => {
  const user = await db.createUser(request.body)

  // Option 1: Await the operation
  await sendWelcomeEmail(user.email)

  // Option 2: Handle errors explicitly
  sendWelcomeEmail(user.email).catch(err => {
    request.log.error({ err, userId: user.id }, 'Failed to send welcome email')
  })

  return user
})
```

Reference: [Node.js Process Events](https://nodejs.org/api/process.html#event-unhandledrejection)
