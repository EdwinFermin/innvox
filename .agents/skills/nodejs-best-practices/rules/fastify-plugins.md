---
title: Design Reusable Plugins
impact: MEDIUM-HIGH
impactDescription: Improves code reusability and modularity
tags: fastify, plugins, architecture, encapsulation
---

## Design Reusable Plugins

Fastify plugins enable code reuse and proper encapsulation. Use `fastify-plugin` to expose decorators to parent scope.

**Incorrect (tightly coupled code):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

// Database logic mixed with routes
app.get('/users', async (request, reply) => {
  const client = new DatabaseClient(process.env.DB_URL)
  await client.connect()
  const users = await client.query('SELECT * FROM users')
  await client.disconnect()
  return users
})
```

**Correct (plugin-based architecture):**

```typescript
import Fastify from 'fastify'
import fp from 'fastify-plugin'

// Database plugin
const dbPlugin = fp(async (fastify, options) => {
  const client = new DatabaseClient(options.url)
  await client.connect()

  fastify.decorate('db', client)

  fastify.addHook('onClose', async () => {
    await client.disconnect()
  })
})

const app = Fastify()

await app.register(dbPlugin, { url: process.env.DB_URL })

// Routes use the decorated db instance
app.get('/users', async (request, reply) => {
  const users = await request.server.db.query('SELECT * FROM users')
  return users
})
```

Reference: [Fastify Plugins](https://fastify.dev/docs/latest/Reference/Plugins/)
