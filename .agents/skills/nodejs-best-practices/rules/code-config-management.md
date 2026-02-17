---
title: Manage Configuration Properly
impact: LOW-MEDIUM
impactDescription: Ensures security and environment-specific settings
tags: configuration, environment, security, settings
---

## Manage Configuration Properly

Centralize configuration and validate it at startup to catch errors early.

**Incorrect (scattered config):**

```typescript
const dbHost = process.env.DB_HOST || 'localhost'
const dbPort = parseInt(process.env.DB_PORT) || 5432
// Config scattered throughout codebase
```

**Correct (centralized config):**

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

Reference: [Node.js Configuration Best Practices](https://12factor.net/config)
