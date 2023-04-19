import { Serialized, TypedResponse } from "dumb-typed-response";

export const Router = <REST extends unknown[]>(): RouteBuilder<
  REST,
  never,
  Record<never, never>
> => {
  const routes: Route<REST>[] = [];

  const handle: FetchHandler<REST> = (request, ...rest) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    for (const route of routes) {
      const response = route(segments, request, rest);
      if (response !== null) return response;
    }
    return new Response("Not Found", { status: 404 });
  };

  const handler: ProxyHandler<RouteBuilder<REST, never, Record<never, never>>> =
    {
      get: <METHOD extends Method>(
        _: unknown,
        method: METHOD | "handle",
        proxy: ReturnType<typeof Router>
      ) => {
        if (method === "handle") {
          return handle;
        }

        return <PATTERN extends string>(
          pattern: string,
          h: RouteHandler<PATTERN, REST, any, unknown, unknown>,
          validator?: (value: unknown) => unknown
        ) => {
          const patternSegments = pattern.split("/");
          const route: Route<REST> = async (segments, request, rest) => {
            if (method !== "all" && request.method.toLowerCase() !== method)
              return null;

            const params = match(segments, patternSegments);
            if (params === null) return null;

            let j = undefined;
            if (validator) {
              try {
                j = await request.json().then(validator);
              } catch {
                return new Response("Bad Request", { status: 422 });
              }
            }
            return h({ request, params, value: j }, ...rest);
          };
          routes.push(route);
          return proxy;
        };
      },
    };

  return new Proxy(
    {} as RouteBuilder<REST, never, Record<never, never>>,
    handler
  );
};

const match = (
  segments: string[],
  pattern: string[]
): null | Record<string, string> => {
  if (pattern.length === 1 && pattern[0] === "*") {
    return { "*": segments.join("/") };
  }

  if (!pattern.includes("*") && segments.length !== pattern.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const p = pattern[i];
    if (p === "*") {
      params["*"] = segments.slice(i).join("/");
      return params;
    } else if (p[0] === ":") {
      params[p.slice(1)] = s;
    } else if (s !== p) {
      return null;
    }
  }

  return params;
};

export type Method =
  | "get"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "put"
  | "patch"
  | "head"
  | "all";

export type WorkerRouter<Env> = [Env, ExecutionContext];

export type RoutesOf<ROUTER extends RouteBuilder<any, string, any>> =
  ROUTER extends RouteBuilder<any, string, infer ROUTES> ? ROUTES : never;

const VALID = Symbol();
const UNUSED = Symbol();
const ERROR = Symbol();

type ValidatePattern<PATH extends string> = PATH extends "*"
  ? typeof VALID
  : PATH extends `/${infer SEGMENT}/${infer REST}`
  ? SEGMENT extends "*"
    ? RouterError<"Star pattern in wrong position">
    : SEGMENT extends ""
    ? RouterError<"Segment is empty">
    : REST extends ""
    ? RouterError<"Cannot end with slash">
    : ValidatePattern<`/${REST}`>
  : PATH extends `/${infer REST}`
  ? REST extends ""
    ? RouterError<"Cannot end with slash">
    : typeof VALID
  : RouterError<"Missing slash at start">;

type URLParameter<P extends string> = P extends `:${infer NAME}` ? NAME : never;

type URLParameters<PATTERN extends string> =
  PATTERN extends `/${infer SEGMENT}/${infer REST}`
    ? URLParameter<SEGMENT> | URLParameters<`/${REST}`>
    : PATTERN extends `/${infer SEGMENT}`
    ? URLParameter<SEGMENT>
    : PATTERN extends "*"
    ? "*"
    : PATTERN extends ""
    ? never
    : PATTERN extends `/*`
    ? "*"
    : never;

type ResponseAny =
  | TypedResponse<any, any, any>
  | Promise<TypedResponse<any, any, any>>
  | Response
  | Promise<Response>;

type FetchHandler<REST extends unknown[]> = (
  request: Request,
  ...rest: REST
) => Response | Promise<Response>;

type RouteHandler<
  PATTERN extends string,
  REST extends unknown[],
  RESPONSE extends ResponseAny,
  FROM,
  TO
> = (
  context: {
    request: Request;
    params: Record<URLParameters<PATTERN>, string>;
  } & (TO extends never ? Record<string, never> : { value: FROM }),
  ...rest: REST
) => RESPONSE;

type RouteBuilder<
  REST extends unknown[],
  USED_PATTERNS,
  ROUTES extends Record<any, any>
> = {
  [METHOD in Method]: RouteConstructor<METHOD, REST, USED_PATTERNS, ROUTES>;
} & {
  handle: FetchHandler<REST>;
};

type StringifyParams<T extends string> = T extends "*"
  ? string
  : T extends `/:${string}/${infer REST}`
  ? `/${StringifyParams<`/${REST}`>}`
  : T extends `/:${string}`
  ? `/`
  : T extends `/${infer T}/${infer REST}`
  ? T extends "*"
    ? never
    : `/${T}${StringifyParams<`/${REST}`>}`
  : T extends `/${infer T}`
  ? T extends "*"
    ? `/${string}`
    : `/${T}`
  : never;

type StringifyRoute<
  METHOD extends Method,
  PATTERN extends string
> = `${METHOD}${StringifyParams<PATTERN>}`;

type ValidateRoute<ROUTE, USED_PATTERNS> = Exclude<
  ROUTE,
  USED_PATTERNS
> extends never
  ? RouterError<"Overlapping pattern">
  : typeof VALID;

type RouteConstructor<
  METHOD extends Method,
  REST extends unknown[],
  USED_PATTERNS,
  ROUTES extends Record<any, any>
> = <
  PATTERN extends string,
  RESPONSE extends ResponseAny,
  FROM extends Serialized<any>,
  TO = typeof UNUSED
>(
  pattern: ValidatePattern<PATTERN> extends typeof VALID
    ? ValidateRoute<
        StringifyRoute<METHOD, PATTERN>,
        USED_PATTERNS
      > extends typeof VALID
      ? PATTERN
      : ValidateRoute<StringifyRoute<METHOD, PATTERN>, USED_PATTERNS>
    : ValidatePattern<PATTERN>,
  h: RouteHandler<PATTERN, REST, RESPONSE, FROM, TO>,
  ...validator: Exclude<
    METHOD,
    "get" | "head" | "all" | "options"
  > extends never
    ? []
    : TO extends typeof UNUSED
    ? []
    : [validator: (value: FROM) => TO]
) => RouteBuilder<
  REST,
  USED_PATTERNS | StringifyRoute<METHOD, PATTERN>,
  PATTERN extends "*"
    ? ROUTES
    : METHOD extends "all"
    ? ROUTES
    : Record<never, never> extends ROUTES
    ? Record<METHOD, RouterFunction<PATTERN, RESPONSE, FROM, TO>>
    : ROUTES & Record<METHOD, RouterFunction<PATTERN, RESPONSE, FROM, TO>>
>;

type RouterFunction<PATTERN extends string, RESPONSE, FROM, TO> = (
  url: PATTERN,
  ...init: Record<never, never> extends RouteParameters<PATTERN>
    ? TO extends typeof UNUSED
      ? [init?: Omit<RequestInit, "method">]
      : [
          init: {
            value: FROM;
          } & Omit<RequestInit, "method" | "body">
        ]
    : TO extends typeof UNUSED
    ? [init: { params: RouteParameters<PATTERN> } & Omit<RequestInit, "method">]
    : [
        init: {
          params: RouteParameters<PATTERN>;
          value: FROM;
        } & Omit<RequestInit, "method" | "body">
      ]
) => Promise<Awaited<RESPONSE>>;

type RouteParameters<PATTERN extends string> =
  PATTERN extends `/:${infer NAME}/${infer REST}`
    ? RouteParameters<`/${REST}`> & Record<NAME, string>
    : PATTERN extends `/:${infer NAME}`
    ? Record<NAME, string>
    : PATTERN extends `/${string}/${infer REST}`
    ? RouteParameters<`/${REST}`>
    : Record<string, never>;

type Route<REST extends unknown[]> = (
  segments: string[],
  request: Request,
  rest: REST
) => Response | Promise<Response> | null;

type RouterError<M = any> = {
  type: typeof ERROR;
  message: M;
};
