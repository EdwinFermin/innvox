---
title: Write Testable Code
impact: LOW-MEDIUM
impactDescription: Enables reliable automated testing
tags: testing, testability, quality, architecture
---

## Write Testable Code

Structure code to be easily testable by avoiding side effects and using dependency injection.

**Incorrect (hard to test):**

```typescript
async function processOrder(orderId) {
  const db = new Database()
  const order = await db.getOrder(orderId)
  await sendEmail(order.email)
  return order
}
// Hard to test - tightly coupled to database and email service
```

**Correct (testable):**

```typescript
async function processOrder(orderId, { database, emailService }) {
  const order = await database.getOrder(orderId)
  await emailService.send(order.email)
  return order
}

// In tests, inject mocks
const result = await processOrder(123, {
  database: mockDatabase,
  emailService: mockEmailService
})
```

Reference: [Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-2-testing-best-practices)
