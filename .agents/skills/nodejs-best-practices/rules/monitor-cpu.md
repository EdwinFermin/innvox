---
title: Profile CPU Usage
impact: LOW
impactDescription: Identifies performance bottlenecks
tags: monitoring, cpu, profiling, performance
---

## Profile CPU Usage

Profile CPU usage to identify performance bottlenecks and optimize hot paths.

**Correct (CPU profiling):**

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

Reference: [Clinic.js](https://clinicjs.org/)
