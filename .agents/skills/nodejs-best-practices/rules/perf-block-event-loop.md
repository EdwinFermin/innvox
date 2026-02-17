---
title: Detect and Prevent Event Loop Blocking
impact: CRITICAL
impactDescription: Can cause 100ms-1s+ request delays
tags: performance, event-loop, worker-threads, clinic
---

## Detect and Prevent Event Loop Blocking

The Node.js event loop must remain responsive. Synchronous CPU-intensive operations block all concurrent requests, causing cascading delays.

**Incorrect (blocks event loop for all users):**

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

**Correct (offload to worker thread):**

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

Reference: [Don't Block the Event Loop](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)
