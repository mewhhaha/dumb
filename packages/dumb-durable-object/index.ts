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

type HttpStatus1XX = 100 | 101 | 102 | 103;
type HttpStatus2XX = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;
type HttpStatus3XX = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
type HttpStatus4XX =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451;

type HttpStatus5XX =
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 510
  | 511;

export type HttpStatusAny =
  | HttpStatus1XX
  | HttpStatus2XX
  | HttpStatus3XX
  | HttpStatus4XX
  | HttpStatus5XX;

export type HttpStatusError = HttpStatus4XX | HttpStatus5XX;
export type HttpStatusOther = HttpStatus1XX | HttpStatus2XX;
export type HttpStatusOk = HttpStatus2XX;

export type TypedResponse<VALUE, ERROR, CODE> = Response & {
  __t: VALUE;
  __e: ERROR;
  __c: CODE;
};

export const ok = <const CODE extends HttpStatusOk, const VALUE = null>(
  status: CODE,
  value?: VALUE,
  response?: Omit<ResponseInit, "status">
): TypedResponse<Serialized<VALUE>, never, CODE> =>
  new Response(JSON.stringify(value ?? null), {
    status,
    ...response,
  }) as unknown as TypedResponse<Serialized<VALUE>, never, CODE>;

export const body = <const CODE extends HttpStatusAny>(
  status: CODE,
  value?: BodyInit,
  response?: Omit<ResponseInit, "status">
): CODE extends HttpStatusOk
  ? TypedResponse<unknown, never, CODE>
  : TypedResponse<never, unknown, CODE> =>
  new Response(value, {
    status,
    ...response,
  }) as unknown as CODE extends HttpStatusOk
    ? TypedResponse<unknown, never, CODE>
    : TypedResponse<never, unknown, CODE>;

export const error = <
  const CODE extends HttpStatusError,
  const VALUE,
  const ERROR = CODE
>(
  status: CODE,
  value?: ERROR,
  response?: Omit<ResponseInit, "status">
): TypedResponse<Serialized<VALUE>, ERROR, CODE> =>
  new Response(JSON.stringify(value ?? status), {
    status,
    ...response,
  }) as unknown as TypedResponse<Serialized<VALUE>, ERROR, CODE>;

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
    Awaited<ReturnType<ClassDO[Key]>> extends TypedResponse<
      infer R,
      infer E,
      infer C
    >
      ? Result<R, E, C>
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
  ERROR = any,
  CODE = any
> = (
  ...args: ARGUMENTS
) =>
  | TypedResponse<VALUE, ERROR, CODE>
  | Promise<TypedResponse<VALUE, ERROR, CODE>>;

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
export const callable = <const F extends Callable>(
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
  Awaited<ReturnType<ClassDO[Method]>> extends TypedResponse<
    infer R,
    infer E,
    infer C
  >
    ? Result<R, E, C>
    : never
> => {
  const response = await stub.fetch(`${dummyOrigin}/${method}`, {
    body: JSON.stringify(args),
    method: "post",
  });

  // @ts-ignore
  return response;
};

type ResponseOk<VALUE, STATUS> = Omit<Response, "json" | "status" | "ok"> & {
  status: STATUS;
  ok: true;
  json: () => Promise<VALUE>;
};

type ResponseNotOk<ERROR, STATUS> = Omit<Response, "json" | "status" | "ok"> & {
  status: STATUS;
  ok: false;
  json: () => Promise<ERROR>;
};

export type Result<R, E, C> = [E] extends [never]
  ? ResponseOk<R, C>
  : [R] extends [never]
  ? ResponseNotOk<E, C>
  :
      | ResponseOk<R, Extract<C, HttpStatusOk>>
      | ResponseNotOk<E, Extract<C, HttpStatusOther>>;

const dummyOrigin = "http://dummy.com";
