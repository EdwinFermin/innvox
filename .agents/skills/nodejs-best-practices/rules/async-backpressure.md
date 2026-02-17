---
title: Handle Backpressure in Streams
impact: MEDIUM
impactDescription: Prevents memory overflow in stream processing
tags: async, streams, backpressure, memory
---

## Handle Backpressure in Streams

Respect backpressure signals when writing to streams to prevent memory buildup.

**Incorrect (ignoring backpressure):**

```typescript
readableStream.on('data', (chunk) => {
  writableStream.write(chunk) // Ignores backpressure signal
})
```

**Correct (handling backpressure):**

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

Reference: [Node.js Streams](https://nodejs.org/api/stream.html#stream_backpressuring_in_streams)
