---
title: Handle Environment Variables
impact: LOW-MEDIUM
impactDescription: Ensures proper configuration across environments
tags: environment, configuration, dotenv, settings
---

## Handle Environment Variables

Use environment variables for configuration and load them properly with validation.

**Incorrect (missing validation):**

```typescript
const apiKey = process.env.API_KEY
// apiKey might be undefined, causing runtime errors
```

**Correct (with validation):**

```typescript
import 'dotenv/config'

function getEnvVar(name, defaultValue) {
  const value = process.env[name]
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value || defaultValue
}

const config = {
  apiKey: getEnvVar('API_KEY'),
  port: parseInt(getEnvVar('PORT', '3000'))
}
```

Reference: [dotenv](https://github.com/motdotla/dotenv)
