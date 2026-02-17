---
title: Handle Content Types Properly
impact: MEDIUM-HIGH
impactDescription: Enables efficient parsing of different content types
tags: fastify, content-type, parsing, multipart
---

## Handle Content Types Properly

Configure content type parsers for efficient handling of different request body formats.

**Incorrect (missing content type handling):**

```typescript
app.post('/upload', async (request, reply) => {
  // request.body is undefined for multipart/form-data
  const file = request.body.file
  return { uploaded: true }
})
```

**Correct (proper content type handling):**

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

Reference: [@fastify/multipart](https://github.com/fastify/fastify-multipart)
