---
title: Use Streams for Large Payloads
impact: CRITICAL
impactDescription: Reduces memory usage by 10-100×
tags: performance, streams, memory, backpressure
---

## Use Streams for Large Payloads

Streams process data incrementally, reducing memory usage and enabling faster responses for large files or datasets.

**Incorrect (loads entire file into memory):**

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

**Correct (streams the file):**

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

Reference: [Node.js Streams](https://nodejs.org/api/stream.html)
