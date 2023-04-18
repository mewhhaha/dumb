import { TypedResponse } from "dumb-typed-response";

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
          h: RouteHandler<PATTERN, REST, any>
        ) => {
          const patternSegments = pattern.split("/");
          const route: Route<REST> = (segments, request, rest) => {
            if (method !== "all" && request.method.toLowerCase() !== method)
              return null;

            const params = match(segments, patternSegments);
            if (params === null) return null;

            return h({ request, params }, ...rest);
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

type ValidatePattern<PATH extends string> = PATH extends "*"
  ? never
  : PATH extends `/${infer SEGMENT}/${infer REST}`
  ? SEGMENT extends "*"
    ? TypeError<"Star pattern in wrong position">
    : SEGMENT extends ""
    ? TypeError<"Segment is empty">
    : REST extends ""
    ? TypeError<"Cannot end with slash">
    : ValidatePattern<`/${REST}`>
  : PATH extends `/${infer REST}`
  ? REST extends ""
    ? TypeError<"Cannot end with slash">
    : never
  : TypeError<"Missing slash at start">;

type URLParameter<P extends string> = P extends `:${infer NAME}` ? NAME : never;

type URLParameters<PATTERN extends string> = PATTERN extends "*"
  ? "*"
  : PATTERN extends ""
  ? never
  : PATTERN extends `/*`
  ? "*"
  : PATTERN extends `/${infer SEGMENT extends string}/${infer REST extends string}`
  ? URLParameter<SEGMENT> | URLParameters<`/${REST}`>
  : PATTERN extends `/${infer SEGMENT}`
  ? URLParameter<SEGMENT>
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
  RESPONSE extends ResponseAny
> = (
  context: {
    request: Request;
    params: Record<URLParameters<PATTERN>, string>;
  },
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
  ? TypeError<"Overlapping pattern">
  : never;

type RouteConstructor<
  METHOD extends Method,
  REST extends unknown[],
  USED_PATTERNS,
  ROUTES extends Record<any, any>
> = <PATTERN extends string, RESPONSE extends ResponseAny>(
  pattern: ValidatePattern<PATTERN> extends never
    ? ValidateRoute<
        StringifyRoute<METHOD, PATTERN>,
        USED_PATTERNS
      > extends never
      ? PATTERN
      : ValidateRoute<StringifyRoute<METHOD, PATTERN>, USED_PATTERNS>
    : ValidatePattern<PATTERN>,
  h: RouteHandler<PATTERN, REST, RESPONSE>
) => RouteBuilder<
  REST,
  USED_PATTERNS | StringifyRoute<METHOD, PATTERN>,
  PATTERN extends "*"
    ? ROUTES
    : METHOD extends "all"
    ? ROUTES
    : Record<never, never> extends ROUTES
    ? Record<METHOD, RouterFunction<PATTERN, RESPONSE>>
    : ROUTES & Record<METHOD, RouterFunction<PATTERN, RESPONSE>>
>;

type RouterFunction<PATTERN extends string, RESPONSE> = (
  url: PATTERN,
  ...init: Record<never, never> extends RouteParameters<PATTERN>
    ? [init?: Omit<RequestInit, "method">]
    : [init: { params: RouteParameters<PATTERN> } & Omit<RequestInit, "method">]
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

interface TypeError<M = any> {
  __message: M & never;
}
