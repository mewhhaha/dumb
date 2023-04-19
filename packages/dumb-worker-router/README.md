# Dumb Worker Router
This is a small package to ease the friction when setting up a router for a `Cloudflare Worker`. The syntax is very similar to [`itty-router`](https://github.com/kwhitley/itty-router), but doesn't have as much functionality. But typings are good. 🔥

This package includes mainly a `Router` function that creates a router and a `fetcher` function that allows you to create a typed fetcher on the other side.

## Server-client example with URL params
This example shows setting up a `get` route in a worker and then calling it using a route in `Pages functions` function.

This example uses URL parameters which are written using the `:paramName` syntax, and will be appropriately typed in the `params` object.

```tsx
// worker
import { Router, RoutesOf, ok } from 'dumb-worker-router';

const router = Router().get("/foo/:bar", ({ params: { bar } }) =>
  ok(200, `hello ${bar}`)
);

export type WorkerRoutes = RoutesOf<typeof router>;

export default {
  fetch: router.handle,
};

// client
import { WorkerRoutes } from 'worker' // <- wherever your worker is

type Env = {
  SERVICE_WORKER: { fetch: typeof fetch };
};

const onRequest = async ({ env }) => {
  const f = fetcher<WorkerRoutes>(env.SERVICE_WORKER, {
    origin: "http://my-worker.service",
  });

  const response = f("/foo/:bar", { params: { bar: "world" }});
  console.log(await response.json()) // Outputs "hello world"
  
  ...
};
```

## Server-client example with validator
This example example shows setting up a `post` route with a validator in a worker and then calling it using a route in `Pages functions` function. 

This example uses a validator which, if present, will parse incoming `JSON` and output it in the `value` property. When using the `fetcher` it will be required to pass the appropriate value in the `value` property.

```tsx
// worker
import z from 'zod';
import { Router, RoutesOf, ok } from 'dumb-worker-router';

const validator = z.object({ bar: z.literal("world") })

const router = Router().post("/foo", ({ value }) =>
  ok(200, `hello ${value}`),
  validator.parse
);

export type WorkerRoutes = RoutesOf<typeof router>;

export default {
  fetch: router.handle,
};

// client
import { WorkerRoutes } from 'worker' // <- wherever your worker is

type Env = {
  SERVICE_WORKER: { fetch: typeof fetch };
};

const onRequest = async ({ env }) => {
  const f = fetcher<WorkerRoutes>(env.SERVICE_WORKER, {
    origin: "http://my-worker.service",
  });

  const response = f("/foo", { value: { bar: "world" }});
  console.log(await response.json()) // Outputs "hello world"
  
  ...
};
```
