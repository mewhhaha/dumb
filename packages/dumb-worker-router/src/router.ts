import { TypedResponse } from "dumb-typed-response";

export const Router = <REST extends unknown[]>(): RouteBuilder<
  REST,
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

  const handler: ProxyHandler<RouteBuilder<REST, Record<never, never>>> = {
    get: <METHOD extends Method>(
      _: {},
      method: METHOD | "handle",
      proxy: ReturnType<typeof Router>
    ) => {
      if (method === "handle") {
        return handle;
      }

      return <PATTERN extends Path>(
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

  return new Proxy({} as RouteBuilder<REST, Record<never, never>>, handler);
};

const match = (
  segments: string[],
  pattern: string[]
): null | Record<string, string> => {
  if (pattern.length === 1 && pattern[0] === "*") {
    return { "*": segments.join("/") };
  }
  if (segments.length !== pattern.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const p = pattern[i];
    if (p[0] === ":") {
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

export type RoutesOf<ROUTER extends RouteBuilder<any, any>> =
  ROUTER extends RouteBuilder<any, infer ROUTES> ? ROUTES : never;

type Path = `/${string}` | "*";

type ValidPattern<PATH extends Path> = PATH extends "*"
  ? true
  : PATH extends `/${infer SEGMENT}/${infer REST}`
  ? SEGMENT extends "*"
    ? false
    : ValidPattern<`/${REST}`>
  : true;

type URLParameter<P extends string> = P extends `:${infer NAME}` ? NAME : never;

type URLParameters<PATTERN extends Path> = PATTERN extends "*"
  ? "*"
  : PATTERN extends ""
  ? never
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
  PATTERN extends Path,
  REST extends unknown[],
  RESPONSE extends ResponseAny
> = (
  context: {
    request: Request;
    params: Record<URLParameters<PATTERN>, string>;
  },
  ...rest: REST
) => RESPONSE;

type RouteBuilder<REST extends unknown[], ROUTES extends Record<any, any>> = {
  [METHOD in Method]: RouteConstructor<METHOD, REST, ROUTES>;
} & {
  handle: FetchHandler<REST>;
};

type FunctionPattern<T> = T extends (path: infer P, ...rest: any[]) => any
  ? P
  : never;

type StringifyParams<T extends string> = T extends "*"
  ? "*"
  : T extends `/:${string}/${infer REST}`
  ? `/${string}${StringifyParams<`/${REST}`>}`
  : T extends `/:${string}`
  ? `/${string}`
  : T extends `/${infer T}/${infer REST}`
  ? `/${T}${StringifyParams<`/${REST}`>}`
  : T extends `/${infer T}`
  ? `/${T}`
  : never;

type StringifyRoute<KEY extends keyof ROUTE, ROUTE> = `${KEY extends string
  ? KEY
  : never}${FunctionPattern<ROUTE[KEY]> extends string
  ? StringifyParams<FunctionPattern<ROUTE[KEY]>>
  : never}`;

type StringifyMethods<ROUTES extends Record<any, any>> = {
  [KEY in keyof ROUTES]: StringifyRoute<KEY, ROUTES>;
}[keyof ROUTES];

type HasRoute<
  ROUTE extends Record<any, any>,
  ROUTES extends Record<any, any>
> = Record<never, never> extends ROUTES
  ? false
  : StringifyMethods<ROUTE> extends StringifyMethods<ROUTES>
  ? true
  : false;

type RouteConstructor<
  METHOD extends Method,
  REST extends unknown[],
  ROUTES extends Record<any, any>
> = <PATTERN extends Path, RESPONSE extends ResponseAny>(
  pattern: ValidPattern<PATTERN> extends true
    ? HasRoute<
        Record<METHOD, RouterFunction<PATTERN, RESPONSE>>,
        ROUTES
      > extends true
      ? never
      : PATTERN
    : never,
  h: RouteHandler<PATTERN, REST, RESPONSE>
) => RouteBuilder<
  REST,
  PATTERN extends "*"
    ? ROUTES
    : METHOD extends "all"
    ? ROUTES
    : [ROUTES] extends [Record<never, never>]
    ? Record<METHOD, RouterFunction<PATTERN, RESPONSE>>
    : ROUTES & Record<METHOD, RouterFunction<PATTERN, RESPONSE>>
>;

type RouterFunction<PATTERN extends string, RESPONSE> = (
  url: PATTERN,
  ...init: Record<never, never> extends RouteParameters<PATTERN>
    ? [init?: Omit<RequestInit, "method">]
    : [init: { params: RouteParameters<PATTERN> } & Omit<RequestInit, "method">]
) => Promise<RESPONSE>;

type RouteParameters<PATTERN extends string> =
  PATTERN extends `/:${infer NAME}/${infer REST}`
    ? RouteParameters<`/${REST}`> & Record<NAME, string>
    : PATTERN extends `/:${infer NAME}`
    ? Record<NAME, string>
    : PATTERN extends `/${string}/${infer REST}`
    ? RouteParameters<`/${REST}`>
    : {};

type Route<REST extends unknown[]> = (
  segments: string[],
  request: Request,
  rest: REST
) => Response | Promise<Response> | null;
