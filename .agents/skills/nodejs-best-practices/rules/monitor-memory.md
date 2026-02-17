---
title: Monitor Memory Usage
impact: LOW
impactDescription: Detects memory leaks early
tags: monitoring, memory, profiling, diagnostics
---

## Monitor Memory Usage

Monitor memory usage to detect leaks and optimize memory consumption.

**Correct (memory monitoring):**

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

Reference: [Node.js Memory Management](https://nodejs.org/api/process.html#processmemoryusage)
