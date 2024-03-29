import {
  ResponseNotOk,
  Serialized,
  TypedResponse,
  error,
} from "dumb-typed-response";

const VALID = Symbol();
const UNUSED = Symbol();
const ERROR = Symbol();

export const Router = <REST extends unknown[]>(): RouteBuilder<
  REST,
  never,
  Record<never, never>
> => {
  const routes: Route<REST>[] = [];

  const handle: FetchHandler<REST> = async (request, ...rest) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    for (const route of routes) {
      try {
        const response = await route(segments, request, rest);
        if (response !== null) {
          return response;
        }
      } catch (err) {
        if (err instanceof Error) {
          return new Response(err.message, { status: 500 });
        }
        return new Response(null, { status: 500 });
      }
    }

    return new Response(null, { status: 500 });
  };

  const handler: ProxyHandler<RouteBuilder<REST, never, Record<never, never>>> =
    {
      get: <METHOD extends Method>(
        _: unknown,
        property: METHOD | "handle",
        proxy: ReturnType<typeof Router>
      ) => {
        if (property === "handle") {
          return handle;
        }

        return <PATTERN extends string>(
          pattern: string,
          h: RouteHandler<PATTERN, REST, any, unknown>,
          validator?: (value: unknown) => unknown
        ) => {
          const patternSegments = pattern.split("/");
          const route: Route<REST> = async (segments, request, rest) => {
            if (
              property !== "all" &&
              request.method.toLowerCase() !== property
            ) {
              return null;
            }

            const params = match(segments, patternSegments);
            if (params === null) {
              return null;
            }

            let j = undefined;
            if (validator) {
              try {
                j = await request.json().then(validator);
              } catch (err) {
                if (err instanceof Error) {
                  return error(422, err.message);
                }
                return error(422);
              }
            }
            return h({ request, params, value: j }, ...rest);
          };
          routes.push(route);
          return proxy;
        };
      },
    };

  return new Proxy({} as any, handler);
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

export type HttpMethod =
  | "get"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "put"
  | "patch"
  | "head";

export type Method = HttpMethod | "all";

export type WorkerRouter<Env> = [Env, ExecutionContext];

export type RoutesOf<ROUTER extends RouteBuilder<any, string, any>> =
  ROUTER extends RouteBuilder<any, string, infer ROUTES> ? ROUTES : never;

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

type URLParameters<PATTERN extends string> = PATTERN extends "*"
  ? "*"
  : PATTERN extends ""
  ? never
  : PATTERN extends `/*`
  ? "*"
  : PATTERN extends `/${infer SEGMENT}/${infer REST}`
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
  RESPONSE extends ResponseAny,
  TO
> = (
  context: {
    request: Request;
    params: Record<URLParameters<PATTERN>, string>;
  } & (TO extends typeof UNUSED ? Record<never, never> : { value: TO }),
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
  : T extends `/${infer SEGMENT}/${infer REST}`
  ? `/${SEGMENT}${StringifyParams<`/${REST}`>}`
  : T extends `/${infer SEGMENT}`
  ? SEGMENT extends "*"
    ? `/${string}`
    : `/${SEGMENT}`
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
  TO extends Serialized<any> = typeof UNUSED
>(
  pattern: ValidatePattern<PATTERN> extends typeof VALID
    ? ValidateRoute<
        StringifyRoute<METHOD, PATTERN>,
        USED_PATTERNS
      > extends typeof VALID
      ? PATTERN
      : ValidateRoute<StringifyRoute<METHOD, PATTERN>, USED_PATTERNS>
    : ValidatePattern<PATTERN>,
  h: RouteHandler<PATTERN, REST, RESPONSE, TO>,
  ...rest: Exclude<METHOD, "get" | "head" | "all" | "options"> extends never
    ? []
    : [validator?: (value: unknown) => TO]
) => RouteBuilder<
  REST,
  USED_PATTERNS | StringifyRoute<METHOD, PATTERN>,
  PATTERN extends "*"
    ? ROUTES
    : METHOD extends "all"
    ? ROUTES
    : IsEmpty<ROUTES> extends true
    ? Record<METHOD, RouterFunction<PATTERN, RESPONSE, TO>>
    : ROUTES & Record<METHOD, RouterFunction<PATTERN, RESPONSE, TO>>
>;

type RouterFunction<PATTERN extends string, RESPONSE, TO> = (
  url: PATTERN,
  ...init: TO extends typeof UNUSED
    ? IsEmpty<RouteParameters<PATTERN>> extends true
      ? [init?: Omit<RequestInit, "method">]
      : [
          init: {
            params: RouteParameters<PATTERN>;
          } & Omit<RequestInit, "method">
        ]
    : [
        init: IsEmpty<RouteParameters<PATTERN>> extends true
          ? { value: TO } & Omit<RequestInit, "method" | "body">
          : { params: RouteParameters<PATTERN>; value: TO } & Omit<
              RequestInit,
              "method" | "body"
            >
      ]
) => Promise<
  Awaited<
    RESPONSE | (TO extends typeof UNUSED ? never : ResponseNotOk<string, 422>)
  >
>;

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

type IsEmpty<T> = Record<never, never> extends T ? true : false;
