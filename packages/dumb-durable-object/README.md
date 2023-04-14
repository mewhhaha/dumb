# Dumb Durable Object

This is a small package to ease the friction when communicating with a `Durable Object` binding. This package is under development and if you want to use it in any stable capacity I suggest you copy over the code and maintain it yourself. If you do any good improvements it'd be greatly appreciated if you can contribute back. There will likely be a lot of breaking packages when this package updates as it is in its infancy.

## Usage

This is a simple example using the library.

### Simple response

```ts
// In your worker most likely
class DurableObjectExample extends CallableDurableObject {
  @callable // Decorator that ensures the type signature required for it to be callable
  helloWorld(name: string) {
    return ok(200, `Hello world, ${name}!`);
  }
}

// In whoever is calling the worker, for example a pages function
type Env = {
  DO_EXAMPLE: DurableObjectNamespaceIs<DurableObjectExample>;
};

export async function onRequest({
  request,
  env,
}: {
  request: Request;
  env: Env;
}) {
  const id = "MY_DO_ID"; // Could also be a DurableObjectId
  const c = client(env.DO_EXAMPLE, id);
  const response = await c.helloWorld("MY NAME"); // Absence of error makes the json() function always the successful one

  const value = await response.json()

  return new Response(value, { status: 200 });
}
```

### Error response

```ts
// In your worker most likely
class DurableObjectExample extends CallableDurableObject {
  @callable // Decorator that ensures the type signature required for it to be callable
  helloWorld(name: string) {
    if (name === "") {
      return error(422, { message: "Your name was empty!" });
    }
    return ok(200, `Hello world, ${name}!`);
  }
}

// In whoever is calling the worker, for example a pages function
type Env = {
  DO_EXAMPLE: DurableObjectNamespaceIs<DurableObjectExample>;
};

export async function onRequest({
  request,
  env,
}: {
  request: Request;
  env: Env;
}) {
  const id = "MY_DO_ID"; // Could also be a DurableObjectId
  const c = client(env.DO_EXAMPLE, id);
  const response = await c.helloWorld("MY NAME");

  // Since it might return an error we have to disambiguate
  if (!response.ok) {
    const err = await response.json();
    // value is of type { message: string }
    return new Response(err.message, { status: response.status }); // Notice we get the error value here
  }

  const value = await response.json()
  // value is of type string
  return new Response(value, { status: response.status }); // Notice we get the successful value here
}
```
