---
title: Prevent Memory Leaks
impact: CRITICAL
impactDescription: Prevents crashes and degraded performance over time
tags: performance, memory, leaks, event-emitters
---

## Prevent Memory Leaks

Memory leaks cause gradual performance degradation and eventual crashes. Common sources are unclosed connections, event listeners, and closures.

**Incorrect (event listener leak):**

```typescript
import Fastify from 'fastify'
import { EventEmitter } from 'events'

const app = Fastify()
const events = new EventEmitter()

app.get('/subscribe', async (request, reply) => {
  // Listener never removed - leaks memory
  events.on('update', (data) => {
    console.log('Update received:', data)
  })

  return { subscribed: true }
})
// Each request adds a new listener that's never removed
```

**Correct (cleanup event listeners):**

```typescript
import Fastify from 'fastify'
import { EventEmitter } from 'events'

const app = Fastify()
const events = new EventEmitter()

app.get('/subscribe', async (request, reply) => {
  const handler = (data) => {
    console.log('Update received:', data)
  }

  events.on('update', handler)

  // Cleanup when connection closes
  request.raw.on('close', () => {
    events.off('update', handler)
  })

  return { subscribed: true }
})
```

**Incorrect (database connection leak):**

```typescript
app.get('/users/:id', async (request, reply) => {
  const connection = await pool.getConnection()

  // If query throws, connection is never released
  const user = await connection.query(
    'SELECT * FROM users WHERE id = ?',
    [request.params.id]
  )

  connection.release()
  return user
})
```

**Correct (ensure connection cleanup):**

```typescript
app.get('/users/:id', async (request, reply) => {
  const connection = await pool.getConnection()

  try {
    const user = await connection.query(
      'SELECT * FROM users WHERE id = ?',
      [request.params.id]
    )
    return user
  } finally {
    // Always release connection
    connection.release()
  }
})
```

**Incorrect (closure capturing large objects):**

```typescript
function createHandler(largeData) {
  // Closure captures largeData forever
  return async (request, reply) => {
    // Only uses a small part of largeData
    return { id: largeData.id }
  }
}

app.get('/data', createHandler(massiveObject))
```

**Correct (extract only what's needed):**

```typescript
function createHandler(largeData) {
  // Extract only the needed property
  const id = largeData.id

  return async (request, reply) => {
    // largeData can now be garbage collected
    return { id }
  }
}

app.get('/data', createHandler(massiveObject))
```

Reference: [Node.js Memory Leaks](https://nodejs.org/en/docs/guides/simple-profiling/)
