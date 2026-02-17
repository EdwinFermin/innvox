---
title: Parallelize Independent Operations
impact: MEDIUM
impactDescription: 2-10× improvement in response time
tags: async, parallelization, promises, performance
---

## Parallelize Independent Operations

Execute independent async operations concurrently using `Promise.all()` to minimize total execution time.

**Incorrect (sequential execution):**

```typescript
app.get('/dashboard', async (request, reply) => {
  const users = await db.getUsers() // 100ms
  const posts = await db.getPosts() // 100ms
  const comments = await db.getComments() // 100ms
  return { users, posts, comments }
})
// Total: 300ms
```

**Correct (parallel execution):**

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

Reference: [Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
