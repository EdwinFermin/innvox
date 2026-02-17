---
title: Implement Efficient Pagination
impact: CRITICAL
impactDescription: Prevents memory exhaustion and slow queries
tags: api, pagination, database, performance
---

## Implement Efficient Pagination

Pagination prevents memory exhaustion and slow queries by limiting result set size. Cursor-based pagination is more efficient than offset-based for large datasets.

**Incorrect (no pagination):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users', async (request, reply) => {
  // Returns ALL users - could be millions
  const users = await db.query('SELECT * FROM users')
  return users
})
// Memory usage grows unbounded, slow queries
```

**Correct (offset-based pagination):**

```typescript
app.get('/users', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    }
  }
}, async (request, reply) => {
  const { page, limit } = request.query
  const offset = (page - 1) * limit

  const [users, total] = await Promise.all([
    db.query('SELECT * FROM users LIMIT $1 OFFSET $2', [limit, offset]),
    db.query('SELECT COUNT(*) as count FROM users')
  ])

  return {
    data: users,
    pagination: {
      page,
      limit,
      total: total[0].count,
      totalPages: Math.ceil(total[0].count / limit)
    }
  }
})
```

**Better (cursor-based pagination):**

```typescript
app.get('/users', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        cursor: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    }
  }
}, async (request, reply) => {
  const { cursor, limit } = request.query

  // Cursor is the ID of the last item from previous page
  const query = cursor
    ? 'SELECT * FROM users WHERE id > $1 ORDER BY id LIMIT $2'
    : 'SELECT * FROM users ORDER BY id LIMIT $1'

  const params = cursor ? [cursor, limit] : [limit]
  const users = await db.query(query, params)

  const nextCursor = users.length === limit
    ? users[users.length - 1].id
    : null

  return {
    data: users,
    pagination: {
      nextCursor,
      hasMore: nextCursor !== null
    }
  }
})
```

**Avoid expensive COUNT queries:**

```typescript
// Instead of exact total (expensive)
const total = await db.query('SELECT COUNT(*) FROM users') // Slow on large tables

// Use hasMore flag (fast)
const users = await db.query('SELECT * FROM users LIMIT $1', [limit + 1])
const hasMore = users.length > limit
if (hasMore) users.pop() // Remove extra item

return {
  data: users,
  pagination: { hasMore }
}
```

Reference: [Pagination Best Practices](https://www.citusdata.com/blog/2016/03/30/five-ways-to-paginate/)
