---
title: Handle Transactions Properly
impact: CRITICAL
impactDescription: Prevents data corruption and ensures consistency
tags: database, transactions, acid, consistency
---

## Handle Transactions Properly

Transactions ensure data consistency by grouping related operations into atomic units. Use them for any multi-step database operations.

**Incorrect (no transaction):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.post('/transfer', async (request, reply) => {
  const { fromAccountId, toAccountId, amount } = request.body

  // Deduct from source account
  await db.query(
    'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
    [amount, fromAccountId]
  )

  // If this fails, money is lost!
  await db.query(
    'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
    [amount, toAccountId]
  )

  return { success: true }
})
// If second query fails, data is corrupted
```

**Correct (using transaction):**

```typescript
import Fastify from 'fastify'

const app = Fastify()

app.post('/transfer', async (request, reply) => {
  const { fromAccountId, toAccountId, amount } = request.body

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Deduct from source account
    const from = await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2 RETURNING balance',
      [amount, fromAccountId]
    )

    // Check for insufficient funds
    if (from.rows[0].balance < 0) {
      throw new Error('Insufficient funds')
    }

    // Add to destination account
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toAccountId]
    )

    await client.query('COMMIT')

    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})
```

**Transaction isolation levels:**

```typescript
app.post('/update-inventory', async (request, reply) => {
  const client = await pool.connect()

  try {
    // Set isolation level for read consistency
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ')

    const inventory = await client.query(
      'SELECT quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
      [productId]
    )

    if (inventory.rows[0].quantity < requestedQuantity) {
      throw new Error('Insufficient inventory')
    }

    await client.query(
      'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
      [requestedQuantity, productId]
    )

    await client.query('COMMIT')

    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})
```

**Nested transactions (savepoints):**

```typescript
app.post('/complex-operation', async (request, reply) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // First operation
    await client.query('INSERT INTO orders (user_id) VALUES ($1)', [userId])

    // Create savepoint
    await client.query('SAVEPOINT order_items')

    try {
      // Multiple item insertions
      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
          [orderId, item.productId, item.quantity]
        )
      }
    } catch (error) {
      // Rollback to savepoint (keeps order, removes items)
      await client.query('ROLLBACK TO SAVEPOINT order_items')
      throw error
    }

    await client.query('COMMIT')

    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})
```

**Using Prisma transactions:**

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

app.post('/transfer', async (request, reply) => {
  const { fromAccountId, toAccountId, amount } = request.body

  await prisma.$transaction(async (tx) => {
    // All operations in this callback are transactional
    const from = await tx.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } }
    })

    if (from.balance < 0) {
      throw new Error('Insufficient funds')
    }

    await tx.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } }
    })
  })

  return { success: true }
})
```

Reference: [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
