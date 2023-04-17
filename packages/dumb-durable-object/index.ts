import { Result, Serialized, TypedResponse } from "dumb-typed-response";

export type DurableObjectNamespaceIs<OBJECT extends CallableDurableObject> =
  DurableObjectNamespace & { __type?: OBJECT & never };

export type External<A extends Record<string, any>> = Extract<
  {
    [Key in keyof A]: A[Key] extends Callable<infer R, any>
      ? [R] extends [Serialized<R>]
        ? Key
        : never
      : never;
  }[Exclude<keyof A, keyof CallableDurableObject>],
  string
>;

export type Client<ClassDO extends Record<string, any>> = {
  readonly stub: DurableObjectStub;
  readonly request?: Request;
} & { readonly __type?: ClassDO & never } & {
  [Key in External<ClassDO>]: (
    ...args: Parameters<ClassDO[Key]>
  ) => Promise<
    Awaited<ReturnType<ClassDO[Key]>> extends TypedResponse<
      infer R,
      infer E,
      infer C
    >
      ? Result<TypedResponse<R, E, C>>
      : never
  >;
};

/**
 *
 * @example
 * ```tsx
 * const id = "MY_DO_ID";
 * const c = client(context.MY_DO, id);
 * const response = await c.f("value")
 * if (response.ok) {
 *   console.log(await response.json())
 * }
 * ```
 */
export const client = <ClassDO extends CallableDurableObject>(
  init:
    | DurableObjectNamespaceIs<ClassDO>
    | [DurableObjectNamespaceIs<ClassDO>, Request],
  name: string | DurableObjectId | { id: string }
): Client<ClassDO> => {
  const request = Array.isArray(init) ? init[1] : undefined;
  const ns = Array.isArray(init) ? init[0] : init;
  const stub = () => {
    if (typeof name === "string") return ns.get(ns.idFromName(name));
    if ("id" in name) return ns.get(ns.idFromString(name.id));
    return ns.get(name);
  };

  const handler: ProxyHandler<Client<ClassDO>> = {
    get: <Method extends External<ClassDO>>(
      obj: Client<ClassDO>,
      name: Method
    ) => {
      if (typeof name !== "string") {
        throw new Error("Unexpected symbol");
      }

      if (name === "stub") return obj.stub;

      return (
        ...args: Parameters<
          ClassDO[Method] extends (...args: any[]) => any
            ? ClassDO[Method]
            : never
        >
      ) => call(obj, name, ...args);
    },
  };
  return new Proxy(
    {
      stub: stub(),
      request,
    } as Client<ClassDO>,
    handler
  );
};

/**
 * @example
 * Functions that return values using `respond` or `error` will be picked up as a callable interface
 *
 * ```tsx
 * class DurableObjectExample extends CallableDurableObject {
 *  @callable
 *  f(value: string) {
 *    return ok(200, value)
 *  }
 * }
 * ```
 */
export class CallableDurableObject implements DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const [_, method, gargs] = url.pathname.split("/");
    const args = gargs
      ? JSON.parse(decodeURIComponent(gargs))
      : await request.json();

    // @ts-expect-error Here we go!
    return await this[method as keyof this](...args);
  }
}

export type Callable<
  ARGUMENTS extends any[],
  RESPONSE extends Promise<TypedResponse<any, any, any>>
> = (...args: Serialized<ARGUMENTS>) => RESPONSE;

/** decorator for functions in classes to ensure the type signature
 * matches that which is expected from the client
 * @example
 * The `callable` decorators are escaped with a backslash. Do not include that in your code.
 *
 * ```tsx
 *  \@callable
 *  notWorking(value: string) { // Gives error since it doesn't match the type
 *    return value
 *  }
 *
 *  \@callable
 *  working(value: string) { // Doesn't give error since it matches the type
 *    return ok(200, value)
 *  }
 * ```
 * */
export const callable = <const F extends Callable<any, any>>(
  originalMethod: F extends Callable<infer R, any>
    ? [R] extends [Serialized<R>]
      ? F
      : never
    : never,
  _: ClassMethodDecoratorContext
) => {
  return originalMethod;
};

/**
 *
 * @example
 * ```tsx
 * const id = "MY_DO_ID";
 * const c = client(context.MY_DO, id);
 * const value = await call(c, "f");
 * ```
 */
const call = async <
  ClassDO extends Record<string, any>,
  Method extends External<ClassDO>
>(
  { stub, request }: Client<ClassDO>,
  classMethod: Method,
  ...args: Parameters<ClassDO[Method]>
): Promise<
  Awaited<ReturnType<ClassDO[Method]>> extends infer T extends TypedResponse<
    any,
    any,
    any
  >
    ? Result<T>
    : never
> => {
  const method = request?.method ?? "POST";
  const headers = request?.headers ?? new Headers();
  const base = `${dummyOrigin}/${classMethod}`;
  const body = JSON.stringify(args);

  // Some requests require passing on the request as a GET-request like WebSocket upgrade
  if (method.toUpperCase() === "GET") {
    const encoded = encodeURIComponent(body);
    const req = new Request(`${base}/${encoded}`, { method, headers });

    // @ts-ignore
    return await stub.fetch(req);
  } else {
    const req = new Request(base, { method, headers, body });

    // @ts-ignore
    return await stub.fetch(req);
  }
};

const dummyOrigin = "http://dummy.com";
