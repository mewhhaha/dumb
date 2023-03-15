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
  : T extends Record<any, unknown>
  ? {
      [KEY in keyof T]: Serialized<T[KEY]>;
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
  readonly stub: DurableObjectStub;
} & { readonly __type?: ClassDO & never } & {
  [Key in External<ClassDO>]: (
    ...args: Parameters<ClassDO[Key]>
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
 * const c = client(context.MY_DO, id);
 * const value = await c.f("value")
 * ```
 */
export const client = <ClassDO extends CallableDurableObject>(
  ns: DurableObjectNamespaceIs<ClassDO>,
  name: string | DurableObjectId | { id: string }
): Client<ClassDO> => {
  const stub =
    typeof name === "string"
      ? ns.get(ns.idFromName(name))
      : "id" in name
      ? ns.get(ns.idFromString(name.id))
      : ns.get(name);

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
      stub,
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
 *    return respond(value)
 *  }
 * }
 * ```
 */
export class CallableDurableObject implements DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = url.pathname.slice("/".length);
    const args = await request.json();

    // @ts-expect-error Here we go!
    return await this[method](...args);
  }
}

export type Callable<
  ARGUMENTS extends any[] = any[],
  VALUE = any,
  ERROR = any
> = (
  ...args: ARGUMENTS
) => TypedResponse<VALUE, ERROR> | Promise<TypedResponse<VALUE, ERROR>>;

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
 * const c = client(context.MY_DO, id);
 * const value = await call(c, "f");
 * ```
 */
const call = async <
  ClassDO extends Record<string, any>,
  Method extends External<ClassDO>
>(
  { stub }: Client<ClassDO>,
  method: Method,
  ...args: Parameters<ClassDO[Method]>
): Promise<
  Awaited<ReturnType<ClassDO[Method]>> extends TypedResponse<infer R, infer E>
    ? Result<R, E>
    : never
> => {
  const response = await stub.fetch(`${dummyOrigin}/${method}`, {
    body: JSON.stringify(args),
    method: "post",
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

const dummyOrigin = "https://dummy.com";
