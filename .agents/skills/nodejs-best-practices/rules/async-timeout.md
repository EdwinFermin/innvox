---
title: Set Timeouts for Operations
impact: MEDIUM
impactDescription: Prevents hanging requests and resource exhaustion
tags: async, timeout, reliability, performance
---

## Set Timeouts for Operations

Set appropriate timeouts for external operations to prevent hanging requests.

**Incorrect (no timeout):**

```typescript
app.get('/external-data', async (request, reply) => {
  // Can hang indefinitely if external API is slow
  const data = await fetch('https://external-api.com/data')
  return data.json()
})
```

**Correct (with timeout):**

```typescript
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

app.get('/external-data', async (request, reply) => {
  const data = await fetchWithTimeout('https://external-api.com/data', 5000)
  return data
})
```

Reference: [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
