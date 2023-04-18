import { assertType, describe, expect, test } from "vitest";
import { Router, RoutesOf, fetcher } from "./index";
import { ok } from "dumb-typed-response";

describe("Router", () => {
  test("typed get fetch", async () => {
    const router = Router().get("/a", () => {
      return ok(200, "foobar");
    });

    const fetchMock = {
      fetch: async (url: string, init?: RequestInit) => {
        return router.handle(new Request(url, init));
      },
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

    const fetchMock = {
      fetch: async (url: string, init?: RequestInit) => {
        return router.handle(new Request(url, init));
      },
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

    const fetchMock = {
      fetch: async (url: string, init?: RequestInit) => {
        return router.handle(new Request(url, init));
      },
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response = await f.get("/a/:param1/:param2", {
      params: { param1: "foo", param2: "bar" },
    });

    const value = await response.json();
    assertType<string>(value);

    expect(response.status).toBe(200);
    expect(value).toBe("foobar");
  });

  test("generic fetch", async () => {
    const router = Router().get(
      "/a/:param1/:param2",
      ({ params: { param1, param2 } }) => {
        return ok(200, param1 + param2);
      }
    );

    const fetchMock = {
      fetch: async (url: string, init?: RequestInit) => {
        return router.handle(new Request(url, init));
      },
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response = await f.fetch("/a/foo/bar");

    expect(response.status).toBe(200);
    expect(await response.json()).toBe("foobar");
  });

  test("typed get fetch several paths", async () => {
    const router = Router()
      .get("/a/:param1/:param2", ({ params: { param1, param2 } }) => {
        return ok(200, param1 + param2);
      })
      .get("/a/:param1", ({ params: { param1 } }) => {
        return ok(200, param1);
      });

    const fetchMock = {
      fetch: async (url: string, init?: RequestInit) => {
        return router.handle(new Request(url, init));
      },
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response1 = await f.get("/a/:param1/:param2", {
      params: { param1: "foo", param2: "bar" },
    });

    const response2 = await f.get("/a/:param1", {
      params: { param1: "foo" },
    });

    expect(response1.status).toBe(200);
    expect(await response1.json()).toBe("foobar");
    expect(response2.status).toBe(200);
    expect(await response2.json()).toBe("foo");
  });
});
