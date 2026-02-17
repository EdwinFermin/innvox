---
title: Use Queues for Background Jobs
impact: MEDIUM
impactDescription: Enables reliable async job processing
tags: async, queues, bull, background-jobs
---

## Use Queues for Background Jobs

Use job queues for reliable background processing with retries, priorities, and monitoring.

**Incorrect (fire-and-forget):**

```typescript
app.post('/orders', async (request, reply) => {
  const order = await db.createOrder(request.body)

  // Fire-and-forget (unreliable)
  sendConfirmationEmail(order.email)
  updateInventory(order.items)

  return order
})
```

**Correct (using Bull queue):**

```typescript
import Queue from 'bull'

const emailQueue = new Queue('emails', process.env.REDIS_URL)
const inventoryQueue = new Queue('inventory', process.env.REDIS_URL)

app.post('/orders', async (request, reply) => {
  const order = await db.createOrder(request.body)

  // Add to queues (reliable, retriable)
  await emailQueue.add({ email: order.email, orderId: order.id })
  await inventoryQueue.add({ items: order.items })

  return order
})
```

Reference: [Bull](https://github.com/OptimalBits/bull)
