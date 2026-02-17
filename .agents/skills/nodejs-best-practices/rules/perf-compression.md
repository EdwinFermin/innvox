---
title: Implement Compression Strategies
impact: CRITICAL
impactDescription: Reduces bandwidth usage by 60-80%
tags: performance, compression, gzip, brotli
---

## Implement Compression Strategies

Response compression significantly reduces bandwidth usage and improves load times, especially for text-based content like JSON, HTML, and CSS.

**Incorrect (no compression):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/api/data', async (request, reply) => {
  const data = await getLargeDataset() // 500KB JSON

  return data
})
// Sends 500KB uncompressed over the network
```

**Correct (using @fastify/compress):**

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

Reference: [@fastify/compress](https://github.com/fastify/fastify-compress)
