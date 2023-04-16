import { Method } from "./router";

type FetcherOptions = {
  origin: string;
};

export const fetcher = <ROUTES extends Record<any, any>>(
  fetchBase: (url: string, init?: RequestInit) => Promise<Response>,
  { origin }: FetcherOptions
): FetcherRouter<ROUTES> => {
  const cleanOrigin = new URL(origin).origin;

  const handler: ProxyHandler<FetcherRouter<ROUTES>> = {
    get: <METHOD extends Method>(_: {}, method: METHOD | "fetch") => {
      if (method === "fetch") {
        return (path: `/${string}`, init: RequestInit) =>
          fetchBase(`${cleanOrigin}${path}`, init);
      }

      const fetchTyped = (
        path: `/${string}`,
        {
          params,
          ...init
        }: Omit<RequestInit, "method"> & {
          params?: Record<string, string>;
        } = {}
      ) => {
        const segments = path.split("/");
        const replacedPath = segments
          .map((segment) => {
            if (!segment.startsWith(":")) return segment;
            const value = params?.[segment.slice(1)];
            if (value === undefined) {
              throw new Error("Missing parameter " + segment);
            }
            return value;
          })
          .join("/");

        return fetchBase(`${cleanOrigin}${replacedPath}`, { method, ...init });
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
