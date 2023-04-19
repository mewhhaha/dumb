# Dumb Worker Router
This is a small package to ease the friction when setting up a router for a `Cloudflare Worker`. The syntax is very similar to [`itty-router`](https://github.com/kwhitley/itty-router), but doesn't have as much functionality. But typings are good. 🔥

## Smallest example
```tsx
import { Router } from 'dumb-router';

const router = Router().get("/foo", 
        () => new Response(null, { status: 200 })
    )

export default {
  fetch: router.handle
}
```

## With Cloudflare environment and execution context
```tsx
import { Router, WorkerRouter } from 'dumb-router';

type Env = { foo: KVNamespace }

const router = Router<WorkerRouter<Env>>().get("/foo", 
        (_, env, ctx) => new Response(null, { status: 200 })
        //   ^    ^ `env` will have type `Env` and `ctx` will have type `ExecutionContext` 
    )

export default {
  fetch: router.handle
}
```

## With typed parameter
```tsx
import { Router } from 'dumb-router';

const router = Router().get("/foo/:bar", 
        ({ params }) => new Response(null, { status: 200 })
        //    ^ will have type { bar: string }
    )

export default {
  fetch: router.handle
}
```

## Using typed fetcher
```tsx
import { Router } from 'dumb-router';

const router = Router().get("/foo/:bar", 
        () => ok(200, "hello")
    )

export type Routes = RoutesOf<typeof Router>

export default {
  fetch: router.handle
}

// In client file
import { Routes } from ...

const f = fetcher<Routes>({ fetch }, { origin: "http://something.com" })

const response = await f.get("/foo/:bar", { params: { bar: "my-cool-param" }})
                     // ^ This is all typed from routes

```




