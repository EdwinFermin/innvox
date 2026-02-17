---
title: Use TypeScript Effectively
impact: LOW-MEDIUM
impactDescription: Reduces bugs and improves developer experience
tags: typescript, types, safety, quality
---

## Use TypeScript Effectively

Use TypeScript's type system to catch errors at compile time rather than runtime.

**Incorrect (loose typing):**

```typescript
function calculateTotal(items: any[]) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
// No type safety, errors at runtime
```

**Correct (strict typing):**

```typescript
interface OrderItem {
  id: string
  price: number
  quantity: number
}

function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
}
// Type-safe, errors at compile time
```

Reference: [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
