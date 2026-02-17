---
title: Use Dependency Injection
impact: LOW-MEDIUM
impactDescription: Improves testability and decoupling
tags: architecture, dependency-injection, testing, patterns
---

## Use Dependency Injection

Use dependency injection to decouple components and improve testability.

**Incorrect (tight coupling):**

```typescript
class UserService {
  async getUser(id) {
    // Tightly coupled to specific database implementation
    const db = new PostgresDatabase()
    return await db.query('SELECT * FROM users WHERE id = $1', [id])
  }
}
```

**Correct (dependency injection):**

```typescript
class UserService {
  constructor(database) {
    this.db = database
  }

  async getUser(id) {
    return await this.db.query('SELECT * FROM users WHERE id = $1', [id])
  }
}

// In tests, inject mock database
const userService = new UserService(mockDatabase)
```

Reference: [Dependency Injection in Node.js](https://nodejs.dev/en/learn/dependency-injection/)
