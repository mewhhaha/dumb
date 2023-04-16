import { assertType, describe, expect, test } from "vitest";
import { Router, RoutesOf, WorkerRouter, fetcher } from "./index";
import { ExecutionContext } from "@cloudflare/workers-types";
import { error, ok } from "dumb-typed-response";

describe("Router", () => {
  const methods = [
    "get",
    "post",
    "put",
    "delete",
    "patch",
    "head",
    "options",
    "all",
  ] as const;

  test("typed get fetch", async () => {
    const router = Router().get("/a", () => {
      return ok(200, "foobar");
    });

    const fetchMock = async (url: string, init?: RequestInit) => {
      return router.handle(new Request(url, init));
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response = await f.get("/a");

    expect(response.status).toBe(200);
    expect(await response.json()).toBe("foobar");
  });

  test("typed post fetch", async () => {
    const router = Router().post("/a", () => {
      return ok(200, "foobar");
    });

    const fetchMock = async (url: string, init?: RequestInit) => {
      return router.handle(new Request(url, init));
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response = await f.post("/a");

    expect(response.status).toBe(200);
    expect(await response.json()).toBe("foobar");
  });

  test("typed get fetch with parameters", async () => {
    const router = Router().get(
      "/a/:param1/:param2",
      ({ params: { param1, param2 } }) => {
        return ok(200, param1 + param2);
      }
    );

    const fetchMock = async (url: string, init?: RequestInit) => {
      return router.handle(new Request(url, init));
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response = await f.get("/a/:param1/:param2", {
      params: { param1: "foo", param2: "bar" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toBe("foobar");
  });

  test("generic fetch", async () => {
    const router = Router().get(
      "/a/:param1/:param2",
      ({ params: { param1, param2 } }) => {
        return ok(200, param1 + param2);
      }
    );

    const fetchMock = async (url: string, init?: RequestInit) => {
      return router.handle(new Request(url, init));
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response = await f.fetch("/a/foo/bar");

    expect(response.status).toBe(200);
    expect(await response.json()).toBe("foobar");
  });
});
