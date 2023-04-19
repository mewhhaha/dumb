import { Method } from "./router";

type FetcherOptions = {
  origin: string;
};

export const fetcher = <ROUTES extends Record<any, any>>(
  f: { fetch: (url: string, init?: RequestInit) => Promise<Response> },
  { origin }: FetcherOptions
): FetcherRouter<ROUTES> => {
  f.fetch;

  const cleanOrigin = new URL(origin).origin;
  const fetchGeneric = (path: `/${string}`, init: RequestInit) => {
    return f.fetch(`${cleanOrigin}${path}`, init);
  };

  const handler: ProxyHandler<FetcherRouter<ROUTES>> = {
    get: <METHOD extends Method>(_: unknown, method: METHOD | "fetch") => {
      if (method === "fetch") {
        return fetchGeneric;
      }

      const fetchTyped = (
        path: `/${string}`,
        {
          params,
          value,
          ...init
        }: Omit<RequestInit, "method"> & {
          params?: Record<string, string>;
          value?: unknown;
        } = {}
      ) => {
        const segments = path.split("/");
        const replacedPath = segments
          .map((segment) => {
            if (!segment.startsWith(":")) return segment;
            const v = params?.[segment.slice(1)];
            if (v === undefined) {
              throw new Error("Missing parameter " + segment);
            }
            return v;
          })
          .join("/");

        return f.fetch(`${cleanOrigin}${replacedPath}`, {
          method,
          body: value ? JSON.stringify(value) : undefined,
          ...init,
        });
      };

      return fetchTyped;
    },
  };

  return new Proxy({} as FetcherRouter<ROUTES>, handler);
};

type FetcherGeneric = (
  url: `/${string}`,
  init?: RequestInit
) => Promise<Response> | Response;

type FetcherRouter<ROUTES> = ROUTES & { fetch: FetcherGeneric };
