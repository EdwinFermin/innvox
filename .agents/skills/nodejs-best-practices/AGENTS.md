# Node.js Best Practices

**Version 1.0.0**  
Nearform  
January 2026

> **Note:**  
> This document is mainly for agents and LLMs to follow when maintaining,  
> generating, or refactoring Node.js and Fastify applications. Humans  
> may also find it useful, but guidance here is optimized for automation  
> and consistency by AI-assisted workflows.

---

## Abstract

Comprehensive guide for Node.js and Fastify applications, designed for AI agents and LLMs. Contains 48 rules across 8 categories, prioritized by impact from critical (performance & security, API design) to incremental (monitoring & diagnostics). Each rule includes detailed explanations, real-world examples comparing incorrect vs. correct implementations, and specific impact metrics to guide automated refactoring and code generation.

---

## Table of Contents

1. [Performance & Security](#1-performance-&-security) — **CRITICAL**
   - 1.1 [Detect and Prevent Event Loop Blocking](#11-detect-and-prevent-event-loop-blocking)
   - 1.2 [Implement Compression Strategies](#12-implement-compression-strategies)
   - 1.3 [Implement Essential Security Headers](#13-implement-essential-security-headers)
   - 1.4 [Prevent Memory Leaks](#14-prevent-memory-leaks)
   - 1.5 [Use Streams for Large Payloads](#15-use-streams-for-large-payloads)
   - 1.6 [Validate and Sanitize All Inputs](#16-validate-and-sanitize-all-inputs)
2. [API Design & Database](#2-api-design-&-database) — **CRITICAL**
   - 2.1 [Follow RESTful Design Principles](#21-follow-restful-design-principles)
   - 2.2 [Handle Transactions Properly](#22-handle-transactions-properly)
   - 2.3 [Implement Efficient Pagination](#23-implement-efficient-pagination)
   - 2.4 [Optimize Database Queries](#24-optimize-database-queries)
   - 2.5 [Prevent N+1 Query Problems](#25-prevent-n1-query-problems)
   - 2.6 [Use Connection Pooling](#26-use-connection-pooling)
3. [Error Handling & Logging](#3-error-handling-&-logging) — **HIGH**
   - 3.1 [Centralize Error Handling](#31-centralize-error-handling)
   - 3.2 [Don't Leak Sensitive Data in Errors](#32-dont-leak-sensitive-data-in-errors)
   - 3.3 [Handle Async Errors Properly](#33-handle-async-errors-properly)
   - 3.4 [Handle Unhandled Rejections](#34-handle-unhandled-rejections)
   - 3.5 [Log Requests Efficiently](#35-log-requests-efficiently)
   - 3.6 [Use Structured Logging](#36-use-structured-logging)
4. [Fastify Optimization](#4-fastify-optimization) — **MEDIUM-HIGH**
   - 4.1 [Design Reusable Plugins](#41-design-reusable-plugins)
   - 4.2 [Handle Content Types Properly](#42-handle-content-types-properly)
   - 4.3 [Optimize Hook Usage](#43-optimize-hook-usage)
   - 4.4 [Optimize JSON Serialization](#44-optimize-json-serialization)
   - 4.5 [Use Decorators Effectively](#45-use-decorators-effectively)
   - 4.6 [Use JSON Schema Validation](#46-use-json-schema-validation)
5. [Async Patterns](#5-async-patterns) — **MEDIUM**
   - 5.1 [Handle Async Errors Gracefully](#51-handle-async-errors-gracefully)
   - 5.2 [Handle Backpressure in Streams](#52-handle-backpressure-in-streams)
   - 5.3 [Implement Rate Limiting](#53-implement-rate-limiting)
   - 5.4 [Parallelize Independent Operations](#54-parallelize-independent-operations)
   - 5.5 [Set Timeouts for Operations](#55-set-timeouts-for-operations)
   - 5.6 [Use Queues for Background Jobs](#56-use-queues-for-background-jobs)
6. [Caching & State](#6-caching-&-state) — **MEDIUM**
   - 6.1 [Cache Database Queries](#61-cache-database-queries)
   - 6.2 [Implement Cache Invalidation](#62-implement-cache-invalidation)
   - 6.3 [Implement Redis Caching](#63-implement-redis-caching)
   - 6.4 [Use HTTP Caching Headers](#64-use-http-caching-headers)
   - 6.5 [Use In-Memory LRU Caching](#65-use-in-memory-lru-caching)
   - 6.6 [Use Stale-While-Revalidate Pattern](#66-use-stale-while-revalidate-pattern)
7. [Code Organization](#7-code-organization) — **LOW-MEDIUM**
   - 7.1 [Handle Environment Variables](#71-handle-environment-variables)
   - 7.2 [Manage Configuration Properly](#72-manage-configuration-properly)
   - 7.3 [Organize Code by Feature](#73-organize-code-by-feature)
   - 7.4 [Use Dependency Injection](#74-use-dependency-injection)
   - 7.5 [Use TypeScript Effectively](#75-use-typescript-effectively)
   - 7.6 [Write Testable Code](#76-write-testable-code)
8. [Monitoring & Diagnostics](#8-monitoring-&-diagnostics) — **LOW**
   - 8.1 [Collect Application Metrics](#81-collect-application-metrics)
   - 8.2 [Implement Distributed Tracing](#82-implement-distributed-tracing)
   - 8.3 [Implement Health Check Endpoints](#83-implement-health-check-endpoints)
   - 8.4 [Integrate APM Tools](#84-integrate-apm-tools)
   - 8.5 [Monitor Memory Usage](#85-monitor-memory-usage)
   - 8.6 [Profile CPU Usage](#86-profile-cpu-usage)

---

## 1. Performance & Security

**Impact: CRITICAL**

Performance and security are top priorities. Blocking the event loop, missing security headers, or memory leaks can severely impact application reliability and user trust.

### 1.1 Detect and Prevent Event Loop Blocking

**Impact: CRITICAL (Can cause 100ms-1s+ request delays)**

The Node.js event loop must remain responsive. Synchronous CPU-intensive operations block all concurrent requests, causing cascading delays.

**Incorrect: blocks event loop for all users**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.post('/process', async (request, reply) => {
  const data = request.body.data

  // Synchronous processing blocks event loop
  const result = data.map(item => {
    return expensiveCalculation(item) // 100ms each
  })

  return { result }
})
```

**Correct: offload to worker thread**

```typescript
import Fastify from 'fastify'
import { Worker } from 'worker_threads'

const app = Fastify()

app.post('/process', async (request, reply) => {
  const data = request.body.data

  // Offload to worker thread
  const result = await new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', {
      workerData: data
    })
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with code ${code}`))
    })
  })

  return { result }
})
```

**Detection with blocked-at:**

```typescript
import blocked from 'blocked-at'

blocked((time, stack) => {
  console.log(`Blocked for ${time}ms, operation started here:`, stack)
}, { threshold: 50 }) // Alert if blocked > 50ms
```

Reference: [https://nodejs.org/en/docs/guides/dont-block-the-event-loop/](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)

### 1.2 Implement Compression Strategies

**Impact: CRITICAL (Reduces bandwidth usage by 60-80%)**

Response compression significantly reduces bandwidth usage and improves load times, especially for text-based content like JSON, HTML, and CSS.

**Incorrect: no compression**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/api/data', async (request, reply) => {
  const data = await getLargeDataset() // 500KB JSON

  return data
})
// Sends 500KB uncompressed over the network
```

**Correct: using @fastify/compress**

```typescript
import Fastify from 'fastify'
import compress from '@fastify/compress'

const app = Fastify()

await app.register(compress, {
  global: true,
  threshold: 1024, // Only compress responses > 1KB
  encodings: ['gzip', 'deflate', 'br'] // Support brotli, gzip, deflate
})

app.get('/api/data', async (request, reply) => {
  const data = await getLargeDataset() // 500KB JSON

  return data
})
// Sends ~100KB compressed (80% reduction)
```

**Selective compression:**

```typescript
import Fastify from 'fastify'
import compress from '@fastify/compress'

const app = Fastify()

await app.register(compress, {
  global: false, // Opt-in per route
  threshold: 1024,
})

// Compress large JSON responses
app.get('/api/large-data', {
  compress: true
}, async (request, reply) => {
  return await getLargeDataset()
})

// Don't compress already-compressed data
app.get('/api/image', async (request, reply) => {
  const image = await getImage() // Already compressed (JPEG, PNG)
  reply.type('image/jpeg')
  return image
})
```

**Brotli for static assets:**

```typescript
import Fastify from 'fastify'
import compress from '@fastify/compress'

const app = Fastify()

await app.register(compress, {
  encodings: ['br', 'gzip'],
  brotliOptions: {
    params: {
      // Higher quality for static assets (0-11)
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11
    }
  }
})

// Pre-compress static assets at build time for best performance
app.get('/app.js', async (request, reply) => {
  const acceptEncoding = request.headers['accept-encoding']

  if (acceptEncoding?.includes('br')) {
    reply.type('application/javascript')
    reply.header('Content-Encoding', 'br')
    return fs.createReadStream('./public/app.js.br')
  }

  return fs.createReadStream('./public/app.js')
})
```

Reference: [https://github.com/fastify/fastify-compress](https://github.com/fastify/fastify-compress)

### 1.3 Implement Essential Security Headers

**Impact: CRITICAL (Prevents XSS, clickjacking, MIME attacks)**

Security headers protect against common web vulnerabilities like XSS, clickjacking, and MIME-type sniffing attacks.

**Incorrect: no security headers**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/api/users', async (request, reply) => {
  return { users: await getUsers() }
})
// Missing: CSP, X-Frame-Options, X-Content-Type-Options, etc.
```

**Correct: using @fastify/helmet**

```typescript
import Fastify from 'fastify'
import helmet from '@fastify/helmet'

const app = Fastify()

// Apply security headers
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})

app.get('/api/users', async (request, reply) => {
  return { users: await getUsers() }
})
```

**Custom security headers:**

```typescript
app.addHook('onSend', async (request, reply) => {
  reply.header('X-Frame-Options', 'DENY')
  reply.header('X-Content-Type-Options', 'nosniff')
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  reply.header('Permissions-Policy', 'geolocation=(), microphone=()')
})
```

Reference: [https://github.com/fastify/fastify-helmet](https://github.com/fastify/fastify-helmet)

### 1.4 Prevent Memory Leaks

**Impact: CRITICAL (Prevents crashes and degraded performance over time)**

Memory leaks cause gradual performance degradation and eventual crashes. Common sources are unclosed connections, event listeners, and closures.

**Incorrect: event listener leak**

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

**Correct: cleanup event listeners**

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

**Incorrect: database connection leak**

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

**Correct: ensure connection cleanup**

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

**Incorrect: closure capturing large objects**

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

**Correct: extract only what's needed**

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

Reference: [https://nodejs.org/en/docs/guides/simple-profiling/](https://nodejs.org/en/docs/guides/simple-profiling/)

### 1.5 Use Streams for Large Payloads

**Impact: CRITICAL (Reduces memory usage by 10-100×)**

Streams process data incrementally, reducing memory usage and enabling faster responses for large files or datasets.

**Incorrect: loads entire file into memory**

```typescript
import Fastify from 'fastify'
import { readFile } from 'fs/promises'

const app = Fastify()

app.get('/download/:filename', async (request, reply) => {
  const { filename } = request.params

  // Loads entire 1GB file into memory
  const content = await readFile(`./files/${filename}`)

  reply.type('application/octet-stream')
  return content
})
// Memory usage: ~1GB per concurrent request
```

**Correct: streams the file**

```typescript
import Fastify from 'fastify'
import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'

const app = Fastify()

app.get('/download/:filename', async (request, reply) => {
  const { filename } = request.params

  const stream = createReadStream(`./files/${filename}`)

  reply.type('application/octet-stream')
  return reply.send(stream)
})
// Memory usage: ~64KB per concurrent request
```

**Streaming with backpressure handling:**

```typescript
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'

app.get('/process-large-file', async (request, reply) => {
  const input = createReadStream('./input.json')
  const output = reply.raw

  // Transform stream with backpressure handling
  const transform = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      const processed = processChunk(chunk)
      callback(null, processed)
    }
  })

  reply.type('application/json')
  await pipeline(input, transform, output)
})
```

**Streaming large database queries:**

```typescript
import { Readable } from 'stream'

app.get('/export-users', async (request, reply) => {
  const query = db.query('SELECT * FROM users')

  // Stream rows instead of loading all into memory
  const stream = Readable.from(query)

  reply.type('text/csv')
  reply.header('Content-Disposition', 'attachment; filename=users.csv')

  return reply.send(stream)
})
```

Reference: [https://nodejs.org/api/stream.html](https://nodejs.org/api/stream.html)

### 1.6 Validate and Sanitize All Inputs

**Impact: CRITICAL (Prevents injection attacks and data corruption)**

Input validation prevents SQL injection, NoSQL injection, and malformed data from reaching your application logic.

**Incorrect: no validation**

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

**Correct: Fastify schema validation**

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

Reference: [https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)

---

## 2. API Design & Database

**Impact: CRITICAL**

Proper API design and database optimization prevent scalability issues and ensure fast response times. Connection pooling and query optimization are essential.

### 2.1 Follow RESTful Design Principles

**Impact: CRITICAL (Ensures API consistency and predictability)**

RESTful APIs use HTTP methods semantically and resource-based URLs for consistent, intuitive interfaces.

**Incorrect: non-RESTful design**

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

**Correct: RESTful design**

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

Reference: [https://restfulapi.net/](https://restfulapi.net/)

### 2.2 Handle Transactions Properly

**Impact: CRITICAL (Prevents data corruption and ensures consistency)**

Transactions ensure data consistency by grouping related operations into atomic units. Use them for any multi-step database operations.

**Incorrect: no transaction**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.post('/transfer', async (request, reply) => {
  const { fromAccountId, toAccountId, amount } = request.body

  // Deduct from source account
  await db.query(
    'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
    [amount, fromAccountId]
  )

  // If this fails, money is lost!
  await db.query(
    'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
    [amount, toAccountId]
  )

  return { success: true }
})
// If second query fails, data is corrupted
```

**Correct: using transaction**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.post('/transfer', async (request, reply) => {
  const { fromAccountId, toAccountId, amount } = request.body

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Deduct from source account
    const from = await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2 RETURNING balance',
      [amount, fromAccountId]
    )

    // Check for insufficient funds
    if (from.rows[0].balance < 0) {
      throw new Error('Insufficient funds')
    }

    // Add to destination account
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toAccountId]
    )

    await client.query('COMMIT')

    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})
```

**Transaction isolation levels:**

```typescript
app.post('/update-inventory', async (request, reply) => {
  const client = await pool.connect()

  try {
    // Set isolation level for read consistency
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ')

    const inventory = await client.query(
      'SELECT quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
      [productId]
    )

    if (inventory.rows[0].quantity < requestedQuantity) {
      throw new Error('Insufficient inventory')
    }

    await client.query(
      'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
      [requestedQuantity, productId]
    )

    await client.query('COMMIT')

    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})
```

**Nested transactions: savepoints**

```typescript
app.post('/complex-operation', async (request, reply) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // First operation
    await client.query('INSERT INTO orders (user_id) VALUES ($1)', [userId])

    // Create savepoint
    await client.query('SAVEPOINT order_items')

    try {
      // Multiple item insertions
      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
          [orderId, item.productId, item.quantity]
        )
      }
    } catch (error) {
      // Rollback to savepoint (keeps order, removes items)
      await client.query('ROLLBACK TO SAVEPOINT order_items')
      throw error
    }

    await client.query('COMMIT')

    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})
```

**Using Prisma transactions:**

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

app.post('/transfer', async (request, reply) => {
  const { fromAccountId, toAccountId, amount } = request.body

  await prisma.$transaction(async (tx) => {
    // All operations in this callback are transactional
    const from = await tx.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } }
    })

    if (from.balance < 0) {
      throw new Error('Insufficient funds')
    }

    await tx.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } }
    })
  })

  return { success: true }
})
```

Reference: [https://www.postgresql.org/docs/current/tutorial-transactions.html](https://www.postgresql.org/docs/current/tutorial-transactions.html)

### 2.3 Implement Efficient Pagination

**Impact: CRITICAL (Prevents memory exhaustion and slow queries)**

Pagination prevents memory exhaustion and slow queries by limiting result set size. Cursor-based pagination is more efficient than offset-based for large datasets.

**Incorrect: no pagination**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users', async (request, reply) => {
  // Returns ALL users - could be millions
  const users = await db.query('SELECT * FROM users')
  return users
})
// Memory usage grows unbounded, slow queries
```

**Correct: offset-based pagination**

```typescript
app.get('/users', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    }
  }
}, async (request, reply) => {
  const { page, limit } = request.query
  const offset = (page - 1) * limit

  const [users, total] = await Promise.all([
    db.query('SELECT * FROM users LIMIT $1 OFFSET $2', [limit, offset]),
    db.query('SELECT COUNT(*) as count FROM users')
  ])

  return {
    data: users,
    pagination: {
      page,
      limit,
      total: total[0].count,
      totalPages: Math.ceil(total[0].count / limit)
    }
  }
})
```

**Better: cursor-based pagination**

```typescript
app.get('/users', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        cursor: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    }
  }
}, async (request, reply) => {
  const { cursor, limit } = request.query

  // Cursor is the ID of the last item from previous page
  const query = cursor
    ? 'SELECT * FROM users WHERE id > $1 ORDER BY id LIMIT $2'
    : 'SELECT * FROM users ORDER BY id LIMIT $1'

  const params = cursor ? [cursor, limit] : [limit]
  const users = await db.query(query, params)

  const nextCursor = users.length === limit
    ? users[users.length - 1].id
    : null

  return {
    data: users,
    pagination: {
      nextCursor,
      hasMore: nextCursor !== null
    }
  }
})
```

**Avoid expensive COUNT queries:**

```typescript
// Instead of exact total (expensive)
const total = await db.query('SELECT COUNT(*) FROM users') // Slow on large tables

// Use hasMore flag (fast)
const users = await db.query('SELECT * FROM users LIMIT $1', [limit + 1])
const hasMore = users.length > limit
if (hasMore) users.pop() // Remove extra item

return {
  data: users,
  pagination: { hasMore }
}
```

Reference: [https://www.citusdata.com/blog/2016/03/30/five-ways-to-paginate/](https://www.citusdata.com/blog/2016/03/30/five-ways-to-paginate/)

### 2.4 Optimize Database Queries

**Impact: CRITICAL (10-1000× query performance improvement)**

Efficient queries reduce database load and API response times. Select only needed columns, use indexes, and avoid SELECT *.

**Incorrect: inefficient queries**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  // Selects ALL columns (wasteful)
  const result = await db.query('SELECT * FROM users WHERE id = $1', [request.params.id])

  // Returns only 3 fields, but fetched all
  return {
    name: result.rows[0].name,
    email: result.rows[0].email,
    createdAt: result.rows[0].created_at
  }
})

app.get('/posts', async (request, reply) => {
  // Missing index on created_at - full table scan
  const posts = await db.query('SELECT * FROM posts ORDER BY created_at DESC LIMIT 20')

  return posts.rows
})
```

**Correct: optimized queries**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  // Select only needed columns
  const result = await db.query(
    'SELECT name, email, created_at FROM users WHERE id = $1',
    [request.params.id]
  )

  return result.rows[0]
})

app.get('/posts', async (request, reply) => {
  // Assumes index exists: CREATE INDEX idx_posts_created_at ON posts(created_at DESC)
  const posts = await db.query(`
    SELECT id, title, author_id, created_at
    FROM posts
    ORDER BY created_at DESC
    LIMIT 20
  `)

  return posts.rows
})
```

**Use covering indexes:**

```typescript
// Index that includes all columns needed for query
// CREATE INDEX idx_users_email_name ON users(email, name)

app.get('/users/by-email/:email', async (request, reply) => {
  // Query fully satisfied by index (no table access needed)
  const result = await db.query(
    'SELECT email, name FROM users WHERE email = $1',
    [request.params.email]
  )

  return result.rows[0]
})
```

**Avoid N+1 with joins:**

```typescript
// Incorrect - N+1 queries
app.get('/posts-with-authors', async (request, reply) => {
  const posts = await db.query('SELECT * FROM posts LIMIT 20')

  // N additional queries
  for (const post of posts.rows) {
    post.author = await db.query('SELECT * FROM users WHERE id = $1', [post.author_id])
  }

  return posts.rows
})

// Correct - Single join query
app.get('/posts-with-authors', async (request, reply) => {
  const result = await db.query(`
    SELECT
      p.id, p.title, p.content, p.created_at,
      u.id as author_id, u.name as author_name, u.email as author_email
    FROM posts p
    INNER JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC
    LIMIT 20
  `)

  return result.rows
})
```

**Use EXPLAIN to analyze queries:**

```typescript
// In development, check query performance
const result = await db.query(`
  EXPLAIN ANALYZE
  SELECT * FROM posts WHERE author_id = $1 ORDER BY created_at DESC
`, [authorId])

console.log(result.rows)
// Look for: Seq Scan (bad), Index Scan (good), execution time
```

Reference: [https://www.postgresql.org/docs/current/performance-tips.html](https://www.postgresql.org/docs/current/performance-tips.html)

### 2.5 Prevent N+1 Query Problems

**Impact: CRITICAL (Can cause 10-100× slower responses)**

Fetching related data in a loop creates N+1 queries (1 for parent, N for children), exponentially increasing database load.

**Incorrect: N+1 queries**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users-with-posts', async (request, reply) => {
  // 1 query for users
  const users = await db.query('SELECT * FROM users LIMIT 100')

  // N additional queries (one per user)
  const usersWithPosts = await Promise.all(
    users.rows.map(async (user) => {
      const posts = await db.query(
        'SELECT * FROM posts WHERE user_id = $1',
        [user.id]
      )
      return { ...user, posts: posts.rows }
    })
  )

  return usersWithPosts
})
// 1 + 100 = 101 queries for 100 users
```

**Correct: single JOIN query**

```typescript
app.get('/users-with-posts', async (request, reply) => {
  // Single query with JOIN
  const result = await db.query(`
    SELECT
      u.id, u.name, u.email,
      json_agg(json_build_object(
        'id', p.id,
        'title', p.title,
        'content', p.content,
        'created_at', p.created_at
      )) as posts
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id
    GROUP BY u.id
    LIMIT 100
  `)

  return result.rows
})
// 1 query for 100 users with all their posts
```

**Alternative: batch query with IN clause**

```typescript
app.get('/users-with-posts', async (request, reply) => {
  // 1 query for users
  const users = await db.query('SELECT * FROM users LIMIT 100')
  const userIds = users.rows.map(u => u.id)

  // 1 batch query for all posts
  const posts = await db.query(
    'SELECT * FROM posts WHERE user_id = ANY($1)',
    [userIds]
  )

  // Group posts by user_id
  const postsByUserId = posts.rows.reduce((acc, post) => {
    acc[post.user_id] = acc[post.user_id] || []
    acc[post.user_id].push(post)
    return acc
  }, {})

  // Attach posts to users
  const usersWithPosts = users.rows.map(user => ({
    ...user,
    posts: postsByUserId[user.id] || []
  }))

  return usersWithPosts
})
// 2 queries total instead of 101
```

**Using DataLoader: for GraphQL**

```typescript
import DataLoader from 'dataloader'

const postLoader = new DataLoader(async (userIds) => {
  const posts = await db.query(
    'SELECT * FROM posts WHERE user_id = ANY($1)',
    [userIds]
  )

  // Group by user_id
  const postsByUserId = posts.rows.reduce((acc, post) => {
    acc[post.user_id] = acc[post.user_id] || []
    acc[post.user_id].push(post)
    return acc
  }, {})

  // Return posts in same order as userIds
  return userIds.map(id => postsByUserId[id] || [])
})

app.get('/users-with-posts', async (request, reply) => {
  const users = await db.query('SELECT * FROM users LIMIT 100')

  // Batches and caches queries automatically
  const usersWithPosts = await Promise.all(
    users.rows.map(async (user) => ({
      ...user,
      posts: await postLoader.load(user.id)
    }))
  )

  return usersWithPosts
})
```

Reference: [https://github.com/graphql/dataloader](https://github.com/graphql/dataloader)

### 2.6 Use Connection Pooling

**Impact: CRITICAL (10-100× improvement in database performance)**

Connection pooling reuses database connections instead of creating new ones for each request, dramatically improving performance and resource usage.

**Incorrect: new connection per request**

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

**Correct: using connection pool**

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

Reference: [https://node-postgres.com/features/pooling](https://node-postgres.com/features/pooling)

---

## 3. Error Handling & Logging

**Impact: HIGH**

Robust error handling and structured logging enable effective debugging and monitoring in production environments.

### 3.1 Centralize Error Handling

**Impact: HIGH (Ensures consistent error responses and logging)**

Centralized error handling ensures consistent error responses, proper logging, and prevents error details from leaking in production.

**Incorrect: scattered error handling**

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

**Correct: centralized error handler**

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

Reference: [https://fastify.dev/docs/latest/Reference/Errors/](https://fastify.dev/docs/latest/Reference/Errors/)

### 3.2 Don't Leak Sensitive Data in Errors

**Impact: HIGH (Prevents security vulnerabilities and data exposure)**

Error messages and stack traces can expose sensitive information like database schemas, file paths, API keys, and internal implementation details.

**Incorrect: leaks sensitive data**

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

**Correct: safe error responses**

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

Reference: [https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)

### 3.3 Handle Async Errors Properly

**Impact: HIGH (Prevents unhandled promise rejections and crashes)**

Async errors must be caught and handled properly to prevent unhandled promise rejections that can crash your application.

**Incorrect: missing error handling**

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

**Correct: proper async error handling**

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

Reference: [https://nodejs.org/dist/latest/docs/api/errors.html](https://nodejs.org/dist/latest/docs/api/errors.html)

### 3.4 Handle Unhandled Rejections

**Impact: HIGH (Prevents application crashes from unhandled promises)**

Unhandled promise rejections can crash your Node.js application. Always handle them gracefully with proper logging and recovery.

**Incorrect: no rejection handler**

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

**Correct: global rejection handler**

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

Reference: [https://nodejs.org/api/process.html#event-unhandledrejection](https://nodejs.org/api/process.html#event-unhandledrejection)

### 3.5 Log Requests Efficiently

**Impact: HIGH (Enables debugging and monitoring without performance impact)**

Request logging enables debugging and monitoring, but excessive logging can impact performance. Log strategically and exclude noisy endpoints.

**Incorrect: excessive or missing logging**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.addHook('onRequest', async (request, reply) => {
  // Logs every field, including large bodies
  console.log('Request:', JSON.stringify({
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body, // Can be very large!
    query: request.query
  }))
})

app.get('/health', async () => {
  // Health checks logged on every request (noisy)
  return { status: 'ok' }
})
```

**Correct: efficient request logging**

```typescript
import Fastify from 'fastify'

const app = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          path: request.routerPath,
          parameters: request.params,
          headers: {
            host: request.headers.host,
            userAgent: request.headers['user-agent'],
            referer: request.headers.referer
          },
          remoteAddress: request.ip,
        }
      },
      res(response) {
        return {
          statusCode: response.statusCode,
        }
      }
    }
  }
})

// Exclude noisy endpoints from logging
app.get('/health', {
  logLevel: 'silent'
}, async () => {
  return { status: 'ok' }
})

app.get('/metrics', {
  logLevel: 'silent'
}, async () => {
  return getMetrics()
})
```

**Log response times:**

```typescript
app.addHook('onResponse', async (request, reply) => {
  const responseTime = reply.getResponseTime()

  // Only log slow requests
  if (responseTime > 1000) {
    request.log.warn({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime
    }, 'Slow request detected')
  }
})
```

**Add request IDs for tracing:**

```typescript
import { randomUUID } from 'crypto'

app.addHook('onRequest', async (request, reply) => {
  // Use existing request ID or generate new one
  const requestId = request.headers['x-request-id'] || randomUUID()

  request.id = requestId
  reply.header('x-request-id', requestId)

  // Create child logger with request ID
  request.log = request.log.child({ requestId })
})

app.get('/users/:id', async (request, reply) => {
  // All logs automatically include requestId
  request.log.info({ userId: request.params.id }, 'Fetching user')

  const user = await db.getUser(request.params.id)
  return user
})
```

**Sample requests in high-traffic scenarios:**

```typescript
let requestCount = 0

app.addHook('onRequest', async (request, reply) => {
  requestCount++

  // Log only 1% of requests
  if (requestCount % 100 === 0) {
    request.log.info({
      method: request.method,
      url: request.url,
      sample: true
    }, 'Sampled request')
  }
})
```

Reference: [https://fastify.dev/docs/latest/Reference/Logging/](https://fastify.dev/docs/latest/Reference/Logging/)

### 3.6 Use Structured Logging

**Impact: HIGH (Enables efficient log querying and alerting)**

Structured logging (JSON format) enables efficient searching, filtering, and alerting in production log aggregators like CloudWatch, Elasticsearch, or Datadog.

**Incorrect: string concatenation**

```typescript
import Fastify from 'fastify'

const app = Fastify({ logger: true })

app.get('/users/:id', async (request, reply) => {
  const userId = request.params.id
  console.log('Fetching user with ID: ' + userId)

  const user = await db.getUser(userId)
  console.log('User found: ' + user.name + ', email: ' + user.email)

  return user
})
// Output: "Fetching user with ID: 123"
// Cannot easily query by userId or filter by operation
```

**Correct: structured logging with Pino**

```typescript
import Fastify from 'fastify'

const app = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.ip,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  },
})

app.get('/users/:id', async (request, reply) => {
  const userId = request.params.id

  request.log.info({ userId, operation: 'fetch_user' }, 'Fetching user')

  const user = await db.getUser(userId)

  request.log.info({
    userId,
    userName: user.name,
    operation: 'user_found'
  }, 'User retrieved successfully')

  return user
})
// Output: {"level":30,"time":1674000000000,"userId":"123","operation":"fetch_user","msg":"Fetching user"}
```

**Add correlation IDs:**

```typescript
import { randomUUID } from 'crypto'

app.addHook('onRequest', async (request, reply) => {
  request.id = request.headers['x-request-id'] || randomUUID()
  request.log = request.log.child({ requestId: request.id })
})

app.get('/users/:id', async (request, reply) => {
  request.log.info({ userId: request.params.id }, 'Fetching user')
  // All logs include requestId for tracing across services
})
```

**Redact sensitive data:**

```typescript
const app = Fastify({
  logger: {
    redact: ['req.headers.authorization', 'password', 'creditCard'],
    level: 'info',
  },
})

app.post('/users', async (request, reply) => {
  // Password field automatically redacted from logs
  request.log.info({ body: request.body }, 'Creating user')

  const user = await db.createUser(request.body)
  return user
})
```

Reference: [https://github.com/pinojs/pino](https://github.com/pinojs/pino)

---

## 4. Fastify Optimization

**Impact: MEDIUM-HIGH**

Fastify-specific patterns leverage the framework's performance benefits through schema validation, hooks, and plugins.

### 4.1 Design Reusable Plugins

**Impact: MEDIUM-HIGH (Improves code reusability and modularity)**

Fastify plugins enable code reuse and proper encapsulation. Use `fastify-plugin` to expose decorators to parent scope.

**Incorrect: tightly coupled code**

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

**Correct: plugin-based architecture**

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

Reference: [https://fastify.dev/docs/latest/Reference/Plugins/](https://fastify.dev/docs/latest/Reference/Plugins/)

### 4.2 Handle Content Types Properly

**Impact: MEDIUM-HIGH (Enables efficient parsing of different content types)**

Configure content type parsers for efficient handling of different request body formats.

**Incorrect: missing content type handling**

```typescript
app.post('/upload', async (request, reply) => {
  // request.body is undefined for multipart/form-data
  const file = request.body.file
  return { uploaded: true }
})
```

**Correct: proper content type handling**

```typescript
import multipart from '@fastify/multipart'

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

app.post('/upload', async (request, reply) => {
  const data = await request.file()

  const buffer = await data.toBuffer()

  await saveFile(data.filename, buffer)

  return { uploaded: true, filename: data.filename }
})
```

Reference: [https://github.com/fastify/fastify-multipart](https://github.com/fastify/fastify-multipart)

### 4.3 Optimize Hook Usage

**Impact: MEDIUM-HIGH (Improves request handling efficiency)**

Fastify hooks allow you to intercept the request lifecycle. Use them strategically to avoid performance overhead.

**Incorrect: blocking hooks**

```typescript
app.addHook('onRequest', async (request, reply) => {
  // Expensive operation blocks every request
  const config = await loadConfigFromDatabase()
  request.config = config
})
```

**Correct: efficient hooks**

```typescript
// Load config once at startup
const config = await loadConfig()

app.addHook('onRequest', async (request, reply) => {
  // Fast, non-blocking operation
  request.startTime = Date.now()
})

app.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime
  request.log.info({ duration, url: request.url })
})
```

Reference: [https://fastify.dev/docs/latest/Reference/Hooks/](https://fastify.dev/docs/latest/Reference/Hooks/)

### 4.4 Optimize JSON Serialization

**Impact: MEDIUM-HIGH (2-3× faster JSON serialization)**

Fastify uses `fast-json-stringify` for schema-based serialization, which is much faster than `JSON.stringify`.

**Incorrect: no response schema**

```typescript
app.get('/users', async () => {
  const users = await db.getUsers()
  return users // Uses JSON.stringify (slow)
})
```

**Correct: with response schema**

```typescript
app.get('/users', {
  schema: {
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' }
          }
        }
      }
    }
  }
}, async () => {
  const users = await db.getUsers()
  return users // Uses fast-json-stringify (fast)
})
```

Reference: [https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)

### 4.5 Use Decorators Effectively

**Impact: MEDIUM-HIGH (Enables type-safe code reuse)**

Decorators extend Fastify instances with custom properties and methods in a type-safe way.

**Incorrect: global variables**

```typescript
let currentUser = null

app.addHook('preHandler', async (request, reply) => {
  currentUser = await authenticate(request.headers.authorization)
})

app.get('/profile', async () => {
  return currentUser // Not type-safe, prone to race conditions
})
```

**Correct: request decorators**

```typescript
app.decorateRequest('currentUser', null)

app.addHook('preHandler', async (request, reply) => {
  request.currentUser = await authenticate(request.headers.authorization)
})

app.get('/profile', async (request, reply) => {
  return request.currentUser // Type-safe, request-scoped
})
```

Reference: [https://fastify.dev/docs/latest/Reference/Decorators/](https://fastify.dev/docs/latest/Reference/Decorators/)

### 4.6 Use JSON Schema Validation

**Impact: MEDIUM-HIGH (10-20× faster than runtime validation libraries)**

Fastify's built-in JSON schema validation is extremely fast and provides automatic request/response validation and serialization.

**Incorrect: runtime validation**

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

**Correct: JSON schema validation**

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

Reference: [https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)

---

## 5. Async Patterns

**Impact: MEDIUM**

Effective async/await usage prevents waterfalls, handles backpressure, and ensures resilient concurrent operations.

### 5.1 Handle Async Errors Gracefully

**Impact: MEDIUM (Ensures resilient error recovery)**

Use Promise.allSettled() when you need partial results even if some operations fail.

**Incorrect: all-or-nothing**

```typescript
const results = await Promise.all([
  fetchUserData(),
  fetchAnalytics(),
  fetchNotifications()
])
// If any fails, all results are lost
```

**Correct: partial results**

```typescript
const results = await Promise.allSettled([
  fetchUserData(),
  fetchAnalytics(),
  fetchNotifications()
])

return {
  userData: results[0].status === 'fulfilled' ? results[0].value : null,
  analytics: results[1].status === 'fulfilled' ? results[1].value : null,
  notifications: results[2].status === 'fulfilled' ? results[2].value : []
}
```

Reference: [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)

### 5.2 Handle Backpressure in Streams

**Impact: MEDIUM (Prevents memory overflow in stream processing)**

Respect backpressure signals when writing to streams to prevent memory buildup.

**Incorrect: ignoring backpressure**

```typescript
readableStream.on('data', (chunk) => {
  writableStream.write(chunk) // Ignores backpressure signal
})
```

**Correct: handling backpressure**

```typescript
readableStream.on('data', (chunk) => {
  const canContinue = writableStream.write(chunk)
  if (!canContinue) {
    readableStream.pause()
  }
})

writableStream.on('drain', () => {
  readableStream.resume()
})
```

Reference: [https://nodejs.org/api/stream.html#stream_backpressuring_in_streams](https://nodejs.org/api/stream.html#stream_backpressuring_in_streams)

### 5.3 Implement Rate Limiting

**Impact: MEDIUM (Protects against abuse and ensures fair resource allocation)**

Rate limiting prevents API abuse and ensures fair resource distribution among clients.

**Incorrect: no rate limiting**

```typescript
app.post('/api/send-email', async (request, reply) => {
  await sendEmail(request.body)
  return { sent: true }
})
// Vulnerable to abuse
```

**Correct: with rate limiting**

```typescript
import rateLimit from '@fastify/rate-limit'

await app.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: '15 minutes'
})

app.post('/api/send-email', async (request, reply) => {
  await sendEmail(request.body)
  return { sent: true }
})
```

Reference: [https://github.com/fastify/fastify-rate-limit](https://github.com/fastify/fastify-rate-limit)

### 5.4 Parallelize Independent Operations

**Impact: MEDIUM (2-10× improvement in response time)**

Execute independent async operations concurrently using `Promise.all()` to minimize total execution time.

**Incorrect: sequential execution**

```typescript
app.get('/dashboard', async (request, reply) => {
  const users = await db.getUsers() // 100ms
  const posts = await db.getPosts() // 100ms
  const comments = await db.getComments() // 100ms
  return { users, posts, comments }
})
// Total: 300ms
```

**Correct: parallel execution**

```typescript
app.get('/dashboard', async (request, reply) => {
  const [users, posts, comments] = await Promise.all([
    db.getUsers(),
    db.getPosts(),
    db.getComments()
  ])
  return { users, posts, comments }
})
// Total: 100ms
```

Reference: [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)

### 5.5 Set Timeouts for Operations

**Impact: MEDIUM (Prevents hanging requests and resource exhaustion)**

Set appropriate timeouts for external operations to prevent hanging requests.

**Incorrect: no timeout**

```typescript
app.get('/external-data', async (request, reply) => {
  // Can hang indefinitely if external API is slow
  const data = await fetch('https://external-api.com/data')
  return data.json()
})
```

**Correct: with timeout**

```typescript
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

app.get('/external-data', async (request, reply) => {
  const data = await fetchWithTimeout('https://external-api.com/data', 5000)
  return data
})
```

Reference: [https://developer.mozilla.org/en-US/docs/Web/API/AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

### 5.6 Use Queues for Background Jobs

**Impact: MEDIUM (Enables reliable async job processing)**

Use job queues for reliable background processing with retries, priorities, and monitoring.

**Incorrect: fire-and-forget**

```typescript
app.post('/orders', async (request, reply) => {
  const order = await db.createOrder(request.body)

  // Fire-and-forget (unreliable)
  sendConfirmationEmail(order.email)
  updateInventory(order.items)

  return order
})
```

**Correct: using Bull queue**

```typescript
import Queue from 'bull'

const emailQueue = new Queue('emails', process.env.REDIS_URL)
const inventoryQueue = new Queue('inventory', process.env.REDIS_URL)

app.post('/orders', async (request, reply) => {
  const order = await db.createOrder(request.body)

  // Add to queues (reliable, retriable)
  await emailQueue.add({ email: order.email, orderId: order.id })
  await inventoryQueue.add({ items: order.items })

  return order
})
```

Reference: [https://github.com/OptimalBits/bull](https://github.com/OptimalBits/bull)

---

## 6. Caching & State

**Impact: MEDIUM**

Caching strategies reduce database load and improve response times through in-memory and distributed caching.

### 6.1 Cache Database Queries

**Impact: MEDIUM (Reduces database load and improves response times)**

Cache frequently accessed database queries to reduce database load.

**Incorrect: no query caching**

```typescript
app.get('/popular-products', async (request, reply) => {
  // Expensive query runs on every request
  const products = await db.query(`
    SELECT * FROM products
    ORDER BY sales DESC
    LIMIT 10
  `)
  return products
})
```

**Correct: with query caching**

```typescript
app.get('/popular-products', async (request, reply) => {
  const cacheKey = 'popular-products'
  let products = await redis.get(cacheKey)

  if (!products) {
    products = await db.query(`
      SELECT * FROM products
      ORDER BY sales DESC
      LIMIT 10
    `)
    await redis.setex(cacheKey, 300, JSON.stringify(products)) // 5 min TTL
  } else {
    products = JSON.parse(products)
  }

  return products
})
```

Reference: [https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)

### 6.2 Implement Cache Invalidation

**Impact: MEDIUM (Ensures data consistency while maintaining performance)**

Invalidate cached data when the underlying data changes to prevent stale data issues.

**Incorrect: stale cache**

```typescript
const cache = new Map()

app.put('/products/:id', async (request, reply) => {
  await db.updateProduct(request.params.id, request.body)
  return { updated: true }
})
// Cache is not invalidated, returns stale data
```

**Correct: with invalidation**

```typescript
app.put('/products/:id', async (request, reply) => {
  await db.updateProduct(request.params.id, request.body)

  // Invalidate cache
  cache.delete(`product:${request.params.id}`)
  await redis.del(`product:${request.params.id}`)

  return { updated: true }
})
```

Reference: [https://www.cloudflare.com/learning/cdn/what-is-cache-invalidation/](https://www.cloudflare.com/learning/cdn/what-is-cache-invalidation/)

### 6.3 Implement Redis Caching

**Impact: MEDIUM (Enables shared caching across multiple servers)**

Redis provides distributed caching for multi-server deployments with persistence and advanced features.

**Incorrect: no shared cache**

```typescript
const localCache = new Map()

app.get('/config', async (request, reply) => {
  let config = localCache.get('config')
  if (!config) {
    config = await db.getConfig()
    localCache.set('config', config)
  }
  return config
})
// Each server has its own cache
```

**Correct: Redis cache**

```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

app.get('/config', async (request, reply) => {
  let config = await redis.get('config')

  if (!config) {
    config = await db.getConfig()
    await redis.setex('config', 3600, JSON.stringify(config)) // 1 hour TTL
  } else {
    config = JSON.parse(config)
  }

  return config
})
// All servers share the same cache
```

Reference: [https://github.com/luin/ioredis](https://github.com/luin/ioredis)

### 6.4 Use HTTP Caching Headers

**Impact: MEDIUM (Reduces server load and bandwidth usage)**

HTTP caching headers enable client and CDN caching, reducing server load.

**Incorrect: no caching headers**

```typescript
app.get('/products/:id', async (request, reply) => {
  const product = await db.getProduct(request.params.id)
  return product
})
```

**Correct: with caching headers**

```typescript
app.get('/products/:id', async (request, reply) => {
  const product = await db.getProduct(request.params.id)

  reply.header('Cache-Control', 'public, max-age=300, s-maxage=600')
  reply.header('ETag', generateETag(product))

  return product
})
```

Reference: [https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

### 6.5 Use In-Memory LRU Caching

**Impact: MEDIUM (10-100× faster than database queries)**

LRU (Least Recently Used) caches provide fast access to frequently used data while managing memory efficiently.

**Incorrect: no caching**

```typescript
app.get('/products/:id', async (request, reply) => {
  // Database query on every request
  const product = await db.query('SELECT * FROM products WHERE id = $1', [request.params.id])
  return product
})
```

**Correct: LRU cache**

```typescript
import { LRUCache } from 'lru-cache'

const productCache = new LRUCache({
  max: 500, // Maximum 500 items
  ttl: 1000 * 60 * 5, // 5 minutes
})

app.get('/products/:id', async (request, reply) => {
  const productId = request.params.id
  let product = productCache.get(productId)

  if (!product) {
    product = await db.query('SELECT * FROM products WHERE id = $1', [productId])
    productCache.set(productId, product)
  }

  return product
})
```

Reference: [https://github.com/isaacs/node-lru-cache](https://github.com/isaacs/node-lru-cache)

### 6.6 Use Stale-While-Revalidate Pattern

**Impact: MEDIUM (Provides instant responses while updating in background)**

Serve stale cache entries immediately while refreshing them in the background.

**Correct: stale-while-revalidate**

```typescript
async function getWithSWR(key, fetcher, ttl = 300) {
  const cached = await redis.get(key)
  const staleTime = await redis.get(`${key}:stale`)

  if (cached) {
    // Check if stale
    if (Date.now() > parseInt(staleTime)) {
      // Refresh in background
      fetcher().then(data => redis.setex(key, ttl, JSON.stringify(data)))
    }
    return JSON.parse(cached)
  }

  const data = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(data))
  await redis.setex(`${key}:stale`, ttl / 2, Date.now() + (ttl / 2 * 1000))
  return data
}
```

Reference: [https://web.dev/stale-while-revalidate/](https://web.dev/stale-while-revalidate/)

---

## 7. Code Organization

**Impact: LOW-MEDIUM**

Well-organized code improves maintainability, testability, and team collaboration.

### 7.1 Handle Environment Variables

**Impact: LOW-MEDIUM (Ensures proper configuration across environments)**

Use environment variables for configuration and load them properly with validation.

**Incorrect: missing validation**

```typescript
const apiKey = process.env.API_KEY
// apiKey might be undefined, causing runtime errors
```

**Correct: with validation**

```typescript
import 'dotenv/config'

function getEnvVar(name, defaultValue) {
  const value = process.env[name]
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value || defaultValue
}

const config = {
  apiKey: getEnvVar('API_KEY'),
  port: parseInt(getEnvVar('PORT', '3000'))
}
```

Reference: [https://github.com/motdotla/dotenv](https://github.com/motdotla/dotenv)

### 7.2 Manage Configuration Properly

**Impact: LOW-MEDIUM (Ensures security and environment-specific settings)**

Centralize configuration and validate it at startup to catch errors early.

**Incorrect: scattered config**

```typescript
const dbHost = process.env.DB_HOST || 'localhost'
const dbPort = parseInt(process.env.DB_PORT) || 5432
// Config scattered throughout codebase
```

**Correct: centralized config**

```typescript
import { z } from 'zod'

const configSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string().min(8)
  }),
  server: z.object({
    port: z.number().default(3000)
  })
})

const config = configSchema.parse({
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    password: process.env.DB_PASSWORD
  },
  server: {
    port: parseInt(process.env.PORT)
  }
})

export default config
```

Reference: [https://12factor.net/config](https://12factor.net/config)

### 7.3 Organize Code by Feature

**Impact: LOW-MEDIUM (Improves maintainability and scalability)**

Organize code by feature/domain rather than by technical layer for better maintainability.

**Incorrect: layer-based organization**

```typescript
src/
├── controllers/
│   ├── userController.js
│   └── orderController.js
├── services/
│   ├── userService.js
│   └── orderService.js
└── models/
    ├── User.js
    └── Order.js
```

**Correct: feature-based organization**

```typescript
src/
├── users/
│   ├── user.controller.js
│   ├── user.service.js
│   ├── user.model.js
│   └── user.routes.js
└── orders/
    ├── order.controller.js
    ├── order.service.js
    ├── order.model.js
    └── order.routes.js
```

Reference: [https://softwareengineering.stackexchange.com/questions/338597/folder-by-type-or-folder-by-feature](https://softwareengineering.stackexchange.com/questions/338597/folder-by-type-or-folder-by-feature)

### 7.4 Use Dependency Injection

**Impact: LOW-MEDIUM (Improves testability and decoupling)**

Use dependency injection to decouple components and improve testability.

**Incorrect: tight coupling**

```typescript
class UserService {
  async getUser(id) {
    // Tightly coupled to specific database implementation
    const db = new PostgresDatabase()
    return await db.query('SELECT * FROM users WHERE id = $1', [id])
  }
}
```

**Correct: dependency injection**

```typescript
class UserService {
  constructor(database) {
    this.db = database
  }

  async getUser(id) {
    return await this.db.query('SELECT * FROM users WHERE id = $1', [id])
  }
}

// In tests, inject mock database
const userService = new UserService(mockDatabase)
```

Reference: [https://nodejs.dev/en/learn/dependency-injection/](https://nodejs.dev/en/learn/dependency-injection/)

### 7.5 Use TypeScript Effectively

**Impact: LOW-MEDIUM (Reduces bugs and improves developer experience)**

Use TypeScript's type system to catch errors at compile time rather than runtime.

**Incorrect: loose typing**

```typescript
function calculateTotal(items: any[]) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
// No type safety, errors at runtime
```

**Correct: strict typing**

```typescript
interface OrderItem {
  id: string
  price: number
  quantity: number
}

function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
}
// Type-safe, errors at compile time
```

Reference: [https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

### 7.6 Write Testable Code

**Impact: LOW-MEDIUM (Enables reliable automated testing)**

Structure code to be easily testable by avoiding side effects and using dependency injection.

**Incorrect: hard to test**

```typescript
async function processOrder(orderId) {
  const db = new Database()
  const order = await db.getOrder(orderId)
  await sendEmail(order.email)
  return order
}
// Hard to test - tightly coupled to database and email service
```

**Correct: testable**

```typescript
async function processOrder(orderId, { database, emailService }) {
  const order = await database.getOrder(orderId)
  await emailService.send(order.email)
  return order
}

// In tests, inject mocks
const result = await processOrder(123, {
  database: mockDatabase,
  emailService: mockEmailService
})
```

Reference: [https://github.com/goldbergyoni/nodebestpractices#-2-testing-best-practices](https://github.com/goldbergyoni/nodebestpractices#-2-testing-best-practices)

---

## 8. Monitoring & Diagnostics

**Impact: LOW**

Monitoring and diagnostics enable proactive issue detection and performance optimization in production.

### 8.1 Collect Application Metrics

**Impact: LOW (Enables performance monitoring and capacity planning)**

Collect and expose application metrics for monitoring and alerting.

**Correct: Prometheus metrics**

```typescript
import promClient from 'prom-client'

const register = new promClient.Register()

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})

register.registerMetric(httpRequestDuration)

app.addHook('onResponse', (request, reply, done) => {
  httpRequestDuration
    .labels(request.method, request.routerPath, reply.statusCode.toString())
    .observe(reply.getResponseTime() / 1000)
  done()
})

app.get('/metrics', async (request, reply) => {
  reply.type('text/plain')
  return await register.metrics()
})
```

Reference: [https://github.com/siimon/prom-client](https://github.com/siimon/prom-client)

### 8.2 Implement Distributed Tracing

**Impact: LOW (Enables request tracing across microservices)**

Implement distributed tracing to track requests across multiple services.

**Correct: OpenTelemetry tracing**

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify'

const provider = new NodeTracerProvider()
provider.register()

registerInstrumentations({
  instrumentations: [
    new FastifyInstrumentation()
  ]
})

import Fastify from 'fastify'

const app = Fastify()

app.addHook('onRequest', async (request, reply) => {
  // Trace ID automatically propagated
  request.log.info({ traceId: request.id }, 'Request started')
})

app.get('/users/:id', async (request, reply) => {
  // Automatically traced
  const user = await db.getUser(request.params.id)
  return user
})
```

Reference: [https://opentelemetry.io/docs/instrumentation/js/](https://opentelemetry.io/docs/instrumentation/js/)

### 8.3 Implement Health Check Endpoints

**Impact: LOW (Enables reliable deployment and monitoring)**

Implement health check endpoints for load balancers and orchestration systems.

**Correct: health check endpoints**

```typescript
app.get('/health', { logLevel: 'silent' }, async (request, reply) => {
  return { status: 'ok', timestamp: Date.now() }
})

app.get('/health/ready', async (request, reply) => {
  try {
    await db.query('SELECT 1')
    await redis.ping()
    return { status: 'ready', services: { database: 'up', redis: 'up' } }
  } catch (error) {
    return reply.code(503).send({ status: 'not ready', error: error.message })
  }
})

app.get('/health/live', async (request, reply) => {
  return { status: 'alive' }
})
```

Reference: [https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

### 8.4 Integrate APM Tools

**Impact: LOW (Provides end-to-end observability)**

Use Application Performance Monitoring (APM) tools for deep insights into application behavior.

**Correct: with APM integration**

```typescript
// Load APM as first import
import apm from 'elastic-apm-node'

apm.start({
  serviceName: 'my-api',
  serverUrl: process.env.APM_SERVER_URL,
  environment: process.env.NODE_ENV
})

import Fastify from 'fastify'

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  const span = apm.startSpan('db.getUser')
  const user = await db.getUser(request.params.id)
  span?.end()

  return user
})
```

Reference: [https://www.elastic.co/guide/en/apm/agent/nodejs/current/index.html](https://www.elastic.co/guide/en/apm/agent/nodejs/current/index.html)

### 8.5 Monitor Memory Usage

**Impact: LOW (Detects memory leaks early)**

Monitor memory usage to detect leaks and optimize memory consumption.

**Correct: memory monitoring**

```typescript
app.get('/metrics/memory', async (request, reply) => {
  const usage = process.memoryUsage()

  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    external: Math.round(usage.external / 1024 / 1024) + ' MB'
  }
})

// Alert if memory usage exceeds threshold
setInterval(() => {
  const usage = process.memoryUsage()
  const heapUsedMB = usage.heapUsed / 1024 / 1024

  if (heapUsedMB > 500) {
    console.warn(`High memory usage: ${heapUsedMB.toFixed(2)} MB`)
  }
}, 60000)
```

Reference: [https://nodejs.org/api/process.html#processmemoryusage](https://nodejs.org/api/process.html#processmemoryusage)

### 8.6 Profile CPU Usage

**Impact: LOW (Identifies performance bottlenecks)**

Profile CPU usage to identify performance bottlenecks and optimize hot paths.

**Correct: CPU profiling**

```typescript
import v8Profiler from 'v8-profiler-next'

app.post('/admin/profile/start', async (request, reply) => {
  v8Profiler.startProfiling('CPU', true)
  return { started: true }
})

app.post('/admin/profile/stop', async (request, reply) => {
  const profile = v8Profiler.stopProfiling('CPU')

  profile.export((error, result) => {
    if (!error) {
      fs.writeFileSync('profile.cpuprofile', result)
      profile.delete()
    }
  })

  return { completed: true }
})

// Or use clinic.js for production profiling
// npm install -g clinic
// clinic doctor -- node app.js
```

Reference: [https://clinicjs.org/](https://clinicjs.org/)

---

## References

1. [https://nodejs.org/docs](https://nodejs.org/docs)
2. [https://fastify.dev](https://fastify.dev)
3. [https://github.com/pinojs/pino](https://github.com/pinojs/pino)
4. [https://github.com/luin/ioredis](https://github.com/luin/ioredis)
5. [https://github.com/isaacs/node-lru-cache](https://github.com/isaacs/node-lru-cache)
6. [https://github.com/OptimalBits/bull](https://github.com/OptimalBits/bull)
7. [https://www.npmjs.com/package/helmet](https://www.npmjs.com/package/helmet)
8. [https://clinicjs.org](https://clinicjs.org)
9. [https://github.com/graphql/dataloader](https://github.com/graphql/dataloader)
