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

export type Path = `/${string}` | "*";

export type ValidPattern<P extends Path> = P extends "*"
  ? true
  : P extends `/${infer SEGMENT}/${infer REST}`
  ? SEGMENT extends "*"
    ? false
    : ValidPattern<`/${REST}`>
  : true;

export type URLParameter<P extends string> = P extends `:${infer NAME}`
  ? NAME
  : never;

export type URLParameters<PATTERN extends Path> = PATTERN extends "*"
  ? "*"
  : PATTERN extends ""
  ? never
  : PATTERN extends `/${infer SEGMENT extends string}/${infer REST extends string}`
  ? URLParameter<SEGMENT> | URLParameters<`/${REST}`>
  : PATTERN extends `/${infer SEGMENT}`
  ? URLParameter<SEGMENT>
  : never;

export type FetchHandler<REST extends unknown[]> = (
  request: Request,
  ...rest: REST
) => Response | Promise<Response>;

export type RouteHandler<PATTERN extends Path, REST extends unknown[]> = (
  context: {
    request: Request;
    params: Record<URLParameters<PATTERN>, string>;
  },
  ...rest: REST
) => Response | Promise<Response>;

export type RouteBuilder<REST extends unknown[]> = Record<
  Method,
  RouteConstructor<REST>
> & {
  handle: FetchHandler<REST>;
};

export type RouteConstructor<REST extends unknown[]> = <PATTERN extends Path>(
  pattern: [ValidPattern<PATTERN>] extends [true] ? PATTERN : never,
  h: RouteHandler<PATTERN, REST>
) => RouteBuilder<REST>;

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

export type WorkerRouter<Env> = [Env, ExecutionContext];

export type Route<REST extends unknown[]> = (
  segments: string[],
  request: Request,
  rest: REST
) => Response | Promise<Response> | null;

export const Router = <REST extends unknown[]>(): RouteBuilder<REST> => {
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

  const handler: ProxyHandler<RouteBuilder<REST>> = {
    get: <METHOD extends Method>(
      _: {},
      method: METHOD | "handle",
      proxy: ReturnType<typeof Router>
    ) => {
      if (method === "handle") {
        return handle;
      }

      return <PATTERN extends Path>(
        pattern: [ValidPattern<PATTERN>] extends [true] ? PATTERN : never,
        h: RouteHandler<PATTERN, REST>
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

  return new Proxy({} as RouteBuilder<REST>, handler);
};
