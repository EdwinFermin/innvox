---
title: Prevent N+1 Query Problems
impact: CRITICAL
impactDescription: Can cause 10-100× slower responses
tags: database, queries, joins, performance, dataloader
---

## Prevent N+1 Query Problems

Fetching related data in a loop creates N+1 queries (1 for parent, N for children), exponentially increasing database load.

**Incorrect (N+1 queries):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.get('/users-with-posts', async (request, reply) => {
  // 1 query for users
  const users = await db.query('SELECT * FROM users LIMIT 100')

  // N additional queries (one per user)
  const usersWithPosts = await Promise.all(
    users.rows.map(async (user) => {
      const posts = await db.query(
        'SELECT * FROM posts WHERE user_id = $1',
        [user.id]
      )
      return { ...user, posts: posts.rows }
    })
  )

  return usersWithPosts
})
// 1 + 100 = 101 queries for 100 users
```

**Correct (single JOIN query):**

```typescript
app.get('/users-with-posts', async (request, reply) => {
  // Single query with JOIN
  const result = await db.query(`
    SELECT
      u.id, u.name, u.email,
      json_agg(json_build_object(
        'id', p.id,
        'title', p.title,
        'content', p.content,
        'created_at', p.created_at
      )) as posts
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id
    GROUP BY u.id
    LIMIT 100
  `)

  return result.rows
})
// 1 query for 100 users with all their posts
```

**Alternative (batch query with IN clause):**

```typescript
app.get('/users-with-posts', async (request, reply) => {
  // 1 query for users
  const users = await db.query('SELECT * FROM users LIMIT 100')
  const userIds = users.rows.map(u => u.id)

  // 1 batch query for all posts
  const posts = await db.query(
    'SELECT * FROM posts WHERE user_id = ANY($1)',
    [userIds]
  )

  // Group posts by user_id
  const postsByUserId = posts.rows.reduce((acc, post) => {
    acc[post.user_id] = acc[post.user_id] || []
    acc[post.user_id].push(post)
    return acc
  }, {})

  // Attach posts to users
  const usersWithPosts = users.rows.map(user => ({
    ...user,
    posts: postsByUserId[user.id] || []
  }))

  return usersWithPosts
})
// 2 queries total instead of 101
```

**Using DataLoader (for GraphQL):**

```typescript
import DataLoader from 'dataloader'

const postLoader = new DataLoader(async (userIds) => {
  const posts = await db.query(
    'SELECT * FROM posts WHERE user_id = ANY($1)',
    [userIds]
  )

  // Group by user_id
  const postsByUserId = posts.rows.reduce((acc, post) => {
    acc[post.user_id] = acc[post.user_id] || []
    acc[post.user_id].push(post)
    return acc
  }, {})

  // Return posts in same order as userIds
  return userIds.map(id => postsByUserId[id] || [])
})

app.get('/users-with-posts', async (request, reply) => {
  const users = await db.query('SELECT * FROM users LIMIT 100')

  // Batches and caches queries automatically
  const usersWithPosts = await Promise.all(
    users.rows.map(async (user) => ({
      ...user,
      posts: await postLoader.load(user.id)
    }))
  )

  return usersWithPosts
})
```

Reference: [DataLoader](https://github.com/graphql/dataloader)
