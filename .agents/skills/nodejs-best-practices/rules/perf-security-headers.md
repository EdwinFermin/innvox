---
title: Implement Essential Security Headers
impact: CRITICAL
impactDescription: Prevents XSS, clickjacking, MIME attacks
tags: security, headers, helmet, fastify
---

## Implement Essential Security Headers

Security headers protect against common web vulnerabilities like XSS, clickjacking, and MIME-type sniffing attacks.

**Incorrect (no security headers):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/api/users', async (request, reply) => {
  return { users: await getUsers() }
})
// Missing: CSP, X-Frame-Options, X-Content-Type-Options, etc.
```

**Correct (using @fastify/helmet):**

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

Reference: [@fastify/helmet](https://github.com/fastify/fastify-helmet)
