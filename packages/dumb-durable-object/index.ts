export type Serialized<T> = T extends string | null | number | boolean
  ? T
  : T extends Date
  ? string
  : T extends null
  ? null
  : T extends (...args: any[]) => any
  ? never
  : T extends (infer R)[]
  ? Serialized<R>[]
  : T extends Record<infer TK, unknown>
  ? {
      [Key in TK]: Serialized<T[Key]>;
    }
  : never;

export type TypedResponse<VALUE, ERROR> = Response & { __t: VALUE; __e: ERROR };

export const respond = <VALUE>(
  value: VALUE
): TypedResponse<Serialized<VALUE>, never> =>
  new Response(JSON.stringify(value)) as unknown as TypedResponse<
    Serialized<VALUE>,
    never
  >;

export const error = <VALUE, ERROR>(
  status: HttpsStatusCode<4 | 5>,
  value: ERROR
): TypedResponse<Serialized<VALUE>, ERROR> =>
  new Response(value ? JSON.stringify(value) : null, {
    status,
  }) as unknown as TypedResponse<Serialized<VALUE>, ERROR>;

export type DurableObjectNamespaceIs<ClassDO extends CallableDurableObject> =
  DurableObjectNamespace & { __type?: ClassDO & never };

export type External<A extends Record<string, any>> = Extract<
  {
    [Key in keyof A]: A[Key] extends Callable<infer R>
      ? [R] extends [Serialized<R>]
        ? Key
        : never
      : never;
  }[Exclude<keyof A, keyof CallableDurableObject>],
  string
>;

export type Client<ClassDO extends Record<string, any>> = {
  readonly request: { url: string; headers: Headers };
  readonly stub: DurableObjectStub;
} & { readonly __type?: ClassDO & never } & {
  [Key in External<ClassDO>]: (
    ...args: Tail<Parameters<ClassDO[Key]>>
  ) => Promise<
    Awaited<ReturnType<ClassDO[Key]>> extends TypedResponse<infer R, infer E>
      ? Result<R, E>
      : never
  >;
};

/**
 *
 * @example
 * ```tsx
 * const id = "MY_DO_ID";
 * const c = client(request, context.MY_DO, id);
 * const value = await c.f("value")
 * ```
 */
export const client = <ClassDO extends CallableDurableObject>(
  request: { url: string; headers: Headers },
  ns: DurableObjectNamespaceIs<ClassDO>,
  name: string | DurableObjectId
): Client<ClassDO> => {
  const stub =
    typeof name === "string" ? ns.get(ns.idFromName(name)) : ns.get(name);

  const handler: ProxyHandler<Client<ClassDO>> = {
    get: <Method extends External<ClassDO>>(
      obj: Client<ClassDO>,
      name: Method
    ) => {
      if (typeof name !== "string") {
        throw new Error("Unexpected symbol");
      }

      if (name === "stub") return obj.stub;
      if (name === "request") return obj.request;

      return (
        ...args: Tail<
          Parameters<
            ClassDO[Method] extends (...args: any[]) => any
              ? ClassDO[Method]
              : never
          >
        >
      ) => call(obj, name, ...args);
    },
  };
  return new Proxy(
    {
      request,
      stub,
    } as Client<ClassDO>,
    handler
  );
};

export type Tail<T> = T extends [any, ...infer Rest] ? Rest : never;

/**
 * @example
 * Functions that return values using `respond` or `error` will be picked up as a callable interface
 *
 * ```tsx
 * class DurableObjectExample extends CallableDurableObject {
 *  @callable
 *  f(_: Request, value: string) {
 *    return respond(value)
 *  }
 * }
 * ```
 */
export class CallableDurableObject implements DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const [method] = url.pathname.split("/").slice(1);
    const args = await request.json();

    // @ts-expect-error Here we go!
    return await this[method](request, ...args);
  }
}

export type Callable<
  ARGUMENTS extends any[] = any[],
  VALUE = any,
  ERROR = any
> = (
  request: Request,
  ...args: ARGUMENTS
) => TypedResponse<VALUE, ERROR> | Promise<TypedResponse<VALUE, ERROR>>;

/** decorator for functions in classes to ensure the type signature
 * matches that which is expected from the client
 * @example
 * The `callable` decorators are escaped with a backslash. Do not include that in your code.
 *
 * ```tsx
 *  \@callable
 *  notWorking(_: string, value: string) { // Gives error since it doesn't match the type
 *    return respond(value)
 *  }
 *
 *  \@callable
 *  working(_: Request, value: string) { // Doesn't give error since it matches the type
 *    return respond(value)
 *  }
 * ```
 * */
export const callable = <F extends Callable>(
  originalMethod: F,
  _: ClassMethodDecoratorContext
) => {
  return originalMethod;
};

/**
 *
 * @example
 * ```tsx
 * const id = "MY_DO_ID";
 * const c = client(request, context.MY_DO, id);
 * const value = await call(c, "f");
 * ```
 */
const call = async <
  ClassDO extends Record<string, any>,
  Method extends External<ClassDO>
>(
  { stub, request }: Client<ClassDO>,
  method: Method,
  ...args: Tail<Parameters<ClassDO[Method]>>
): Promise<
  Awaited<ReturnType<ClassDO[Method]>> extends TypedResponse<infer R, infer E>
    ? Result<R, E>
    : never
> => {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  const origin = new URL(request.url).origin;
  const response = await stub.fetch(`${origin}/${method}`, {
    body: JSON.stringify(args),
    method: "post",
    headers: headers,
  });

  if (!response.ok) {
    // @ts-ignore
    return [null, { value: await response.json(), status: response.status }];
  }

  // @ts-ignore
  return [await response.json(), null];
};

export interface ResultError<E> {
  value: E;
  status: HttpsStatusCode<4 | 5>;
}

export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type HttpsStatusCode<D extends 2 | 3 | 4 | 5> =
  `${D}${Digit}${Digit}` extends `${infer N extends number}` ? N : never;

export type Result<R, E> = [E] extends [never]
  ? [success: R, error: null]
  : [success: R, error: null] | [failure: null, error: ResultError<E>];
