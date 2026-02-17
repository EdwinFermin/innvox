---
title: Organize Code by Feature
impact: LOW-MEDIUM
impactDescription: Improves maintainability and scalability
tags: architecture, organization, structure, modularity
---

## Organize Code by Feature

Organize code by feature/domain rather than by technical layer for better maintainability.

**Incorrect (layer-based organization):**

```
src/
├── controllers/
│   ├── userController.js
│   └── orderController.js
├── services/
│   ├── userService.js
│   └── orderService.js
└── models/
    ├── User.js
    └── Order.js
```

**Correct (feature-based organization):**

```
src/
├── users/
│   ├── user.controller.js
│   ├── user.service.js
│   ├── user.model.js
│   └── user.routes.js
└── orders/
    ├── order.controller.js
    ├── order.service.js
    ├── order.model.js
    └── order.routes.js
```

Reference: [Feature-Based Organization](https://softwareengineering.stackexchange.com/questions/338597/folder-by-type-or-folder-by-feature)
