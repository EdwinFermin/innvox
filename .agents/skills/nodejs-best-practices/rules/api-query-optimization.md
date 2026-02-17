---
title: Optimize Database Queries
impact: CRITICAL
impactDescription: 10-1000× query performance improvement
tags: database, performance, queries, indexes
---

## Optimize Database Queries

Efficient queries reduce database load and API response times. Select only needed columns, use indexes, and avoid SELECT *.

**Incorrect (inefficient queries):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  // Selects ALL columns (wasteful)
  const result = await db.query('SELECT * FROM users WHERE id = $1', [request.params.id])

  // Returns only 3 fields, but fetched all
  return {
    name: result.rows[0].name,
    email: result.rows[0].email,
    createdAt: result.rows[0].created_at
  }
})

app.get('/posts', async (request, reply) => {
  // Missing index on created_at - full table scan
  const posts = await db.query('SELECT * FROM posts ORDER BY created_at DESC LIMIT 20')

  return posts.rows
})
```

**Correct (optimized queries):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users/:id', async (request, reply) => {
  // Select only needed columns
  const result = await db.query(
    'SELECT name, email, created_at FROM users WHERE id = $1',
    [request.params.id]
  )

  return result.rows[0]
})

app.get('/posts', async (request, reply) => {
  // Assumes index exists: CREATE INDEX idx_posts_created_at ON posts(created_at DESC)
  const posts = await db.query(`
    SELECT id, title, author_id, created_at
    FROM posts
    ORDER BY created_at DESC
    LIMIT 20
  `)

  return posts.rows
})
```

**Use covering indexes:**

```typescript
// Index that includes all columns needed for query
// CREATE INDEX idx_users_email_name ON users(email, name)

app.get('/users/by-email/:email', async (request, reply) => {
  // Query fully satisfied by index (no table access needed)
  const result = await db.query(
    'SELECT email, name FROM users WHERE email = $1',
    [request.params.email]
  )

  return result.rows[0]
})
```

**Avoid N+1 with joins:**

```typescript
// Incorrect - N+1 queries
app.get('/posts-with-authors', async (request, reply) => {
  const posts = await db.query('SELECT * FROM posts LIMIT 20')

  // N additional queries
  for (const post of posts.rows) {
    post.author = await db.query('SELECT * FROM users WHERE id = $1', [post.author_id])
  }

  return posts.rows
})

// Correct - Single join query
app.get('/posts-with-authors', async (request, reply) => {
  const result = await db.query(`
    SELECT
      p.id, p.title, p.content, p.created_at,
      u.id as author_id, u.name as author_name, u.email as author_email
    FROM posts p
    INNER JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC
    LIMIT 20
  `)

  return result.rows
})
```

**Use EXPLAIN to analyze queries:**

```typescript
// In development, check query performance
const result = await db.query(`
  EXPLAIN ANALYZE
  SELECT * FROM posts WHERE author_id = $1 ORDER BY created_at DESC
`, [authorId])

console.log(result.rows)
// Look for: Seq Scan (bad), Index Scan (good), execution time
```

Reference: [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
