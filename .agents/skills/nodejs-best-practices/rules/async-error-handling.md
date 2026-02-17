---
title: Handle Async Errors Gracefully
impact: MEDIUM
impactDescription: Ensures resilient error recovery
tags: async, errors, promises, resilience
---

## Handle Async Errors Gracefully

Use Promise.allSettled() when you need partial results even if some operations fail.

**Incorrect (all-or-nothing):**

```typescript
const results = await Promise.all([
  fetchUserData(),
  fetchAnalytics(),
  fetchNotifications()
])
// If any fails, all results are lost
```

**Correct (partial results):**

```typescript
const results = await Promise.allSettled([
  fetchUserData(),
  fetchAnalytics(),
  fetchNotifications()
])

return {
  userData: results[0].status === 'fulfilled' ? results[0].value : null,
  analytics: results[1].status === 'fulfilled' ? results[1].value : null,
  notifications: results[2].status === 'fulfilled' ? results[2].value : []
}
```

Reference: [Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
