# Dumb Durable Object
This is a small package to ease the friction when communicating with a `Durable Object` binding. This package is under development and if you want to use it in any stable capacity I suggest you copy over the code and maintain it yourself. If you do any good improvements it'd be greatly appreciated if you can contribute back. There will likely be a lot of breaking packages when this package updates as it is in its infancy.

## Usage
This is a simple example using the library.

### Simple response
```ts
// In your worker most likely
class DurableObjectExample extends CallableDurableObject {
  @callable // Decorator that ensures the type signature required for it to be callable
  helloWorld(_: Request, name: string) {
    return respond(`Hello world, ${name}!`);
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
  const c = client(request, env.DO_EXAMPLE, id);
  const [value] = await c.helloWorld("MY NAME"); // Absence of error makes it easy deconstruct the value

  return new Response(value, { status: 200 });
}
```

### Error response
```ts
// In your worker most likely
class DurableObjectExample extends CallableDurableObject {
  @callable // Decorator that ensures the type signature required for it to be callable
  helloWorld(_: Request, name: string) {
    if (name === "") {
      return error(422, { message: "Your name was empty!" });
    }
    return respond(`Hello world, ${name}!`);
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
  const c = client(request, env.DO_EXAMPLE, id);
  const [value, error] = await c.helloWorld("MY NAME");

  // Since it might return an error we have to disambiguate
  if (error) {
    // value is of type { message: string }
    return new Response(value.message, { status: error.status }); // Notice we get the error value here
  }

  // value is of type string
  return new Response(value, { status: 200 }); // Notice we get the successful value here
}
```