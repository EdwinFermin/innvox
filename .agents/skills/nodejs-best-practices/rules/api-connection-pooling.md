---
title: Use Connection Pooling
impact: CRITICAL
impactDescription: 10-100× improvement in database performance
tags: database, performance, pooling, connections
---

## Use Connection Pooling

Connection pooling reuses database connections instead of creating new ones for each request, dramatically improving performance and resource usage.

**Incorrect (new connection per request):**

```typescript
import Fastify from 'fastify'
import { Client } from 'pg'

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  // Creates new connection for every request
  const client = new Client({
    host: 'localhost',
    database: 'mydb'
  })

  await client.connect() // ~50-100ms overhead

  const result = await client.query(
    'SELECT * FROM users WHERE id = $1',
    [request.params.id]
  )

  await client.end()

  return result.rows[0]
})
// 50-100ms connection overhead per request
```

**Correct (using connection pool):**

```typescript
import Fastify from 'fastify'
import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost',
  database: 'mydb',
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  // Reuses existing connection from pool
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [request.params.id]
  )

  return result.rows[0]
})
// ~1ms to get connection from pool
```

**Optimal pool sizing:**

```typescript
import { Pool } from 'pg'

const pool = new Pool({
  // Formula: ((core_count * 2) + effective_spindle_count)
  // For a 4-core machine with SSD: (4 * 2) + 1 = 9
  max: 10,

  // Minimum connections to maintain
  min: 2,

  // Close idle connections after 30s
  idleTimeoutMillis: 30000,

  // Timeout if can't get connection within 2s
  connectionTimeoutMillis: 2000,

  // Maximum lifetime of a connection (helps with connection rotation)
  maxLifetimeSeconds: 3600,
})
```

**Using Fastify plugin:**

```typescript
import Fastify from 'fastify'
import fastifyPostgres from '@fastify/postgres'

const app = Fastify()

await app.register(fastifyPostgres, {
  connectionString: 'postgres://user:pass@localhost/db',
  pool: {
    max: 10,
    idleTimeoutMillis: 30000
  }
})

app.get('/users/:id', async (request, reply) => {
  const client = await app.pg.connect()

  try {
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [request.params.id]
    )
    return result.rows[0]
  } finally {
    client.release()
  }
})
```

**Graceful shutdown:**

```typescript
async function closeGracefully(signal) {
  console.log(`Received ${signal}, closing database pool`)
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)
```

Reference: [node-postgres Pool](https://node-postgres.com/features/pooling)
