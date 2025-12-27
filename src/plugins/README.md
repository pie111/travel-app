# Plugins Directory

This directory contains all the ElysiaJS plugins for the application, organized by functionality.

## What is a Plugin?

In ElysiaJS, a plugin is a separate Elysia instance that can be composed into the main application. Plugins allow you to:

- **Decouple functionality** into smaller, reusable parts
- **Share routes, state, and decorators** across your application
- **Organize code** by feature or domain
- **Enable type-safe composition** with automatic type inference

## Structure

```
src/plugins/
├── health.ts     # Health check endpoints
├── cars.ts       # Car management API
└── README.md     # This file
```

## Creating a New Plugin

### 1. Create a plugin file

```typescript
// src/plugins/myfeature.ts
import { Elysia, t } from 'elysia';

export const myFeaturePlugin = new Elysia({ prefix: '/api/myfeature' })
    .get('/', () => ({
        message: 'My feature',
    }))
    .post('/', ({ body }) => ({
        message: 'Created',
        data: body,
    }), {
        body: t.Object({
            name: t.String(),
        }),
    });
```

### 2. Register in the main app

In `index.ts`, import and use your plugin:

```typescript
import { myFeaturePlugin } from './src/plugins/myfeature';

const app = new Elysia()
    .use(myFeaturePlugin)
    .listen(3000);
```

## Plugin Features

### Prefix

Use the `prefix` option to automatically prepend a path to all routes:

```typescript
new Elysia({ prefix: '/api/users' })
    .get('/', () => 'List users')      // GET /api/users
    .get('/:id', () => 'Get user')     // GET /api/users/:id
```

### Type Validation

Use Elysia's built-in type system for request validation:

```typescript
import { Elysia, t } from 'elysia';

new Elysia()
    .post('/user', ({ body }) => body, {
        body: t.Object({
            name: t.String(),
            age: t.Number(),
            email: t.String({ format: 'email' }),
        }),
    });
```

### Grouping Routes

Group related routes together:

```typescript
new Elysia()
    .group('/user', (app) => app
        .post('/sign-in', () => 'Sign in')
        .post('/sign-up', () => 'Sign up')
        .get('/profile', () => 'Profile')
    );
```

### Decorators

Share utilities across your plugin:

```typescript
new Elysia()
    .decorate('db', database)
    .get('/users', ({ db }) => db.users.findMany());
```

### State Management

Share mutable state:

```typescript
new Elysia()
    .state('counter', 0)
    .get('/count', ({ store }) => store.counter)
    .post('/increment', ({ store }) => ++store.counter);
```

## Best Practices

1. **One plugin per feature**: Keep plugins focused on a single domain
2. **Use prefixes**: Organize your API with consistent prefixes
3. **Validate inputs**: Always use type validation for request bodies and params
4. **Export as const**: Export plugins as named constants for better tree-shaking
5. **Document your endpoints**: Add JSDoc comments to explain what each route does
6. **Handle errors gracefully**: Use `set.status` to return appropriate HTTP status codes

## Example Plugins

### Health Plugin (`health.ts`)
- `GET /health` - Liveness probe
- `GET /health/ready` - Readiness probe

### Cars Plugin (`cars.ts`)
- `GET /api/cars` - List all cars
- `GET /api/cars/:id` - Get car by ID
- `POST /api/cars` - Create a new car
- `PUT /api/cars/:id` - Update a car
- `DELETE /api/cars/:id` - Delete a car

## Resources

- [ElysiaJS Documentation](https://elysiajs.com)
- [Plugin Guide](https://elysiajs.com/essential/plugin.html)
- [Type Validation](https://elysiajs.com/validation/overview.html)
