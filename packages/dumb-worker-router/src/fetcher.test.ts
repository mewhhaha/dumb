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

  test.skip("can't have validator for get, head, options, all ", async () => {
    Router()
      .get(
        "/get",
        () => ok(200),
        //@ts-expect-error
        (v) => v
      )
      .head(
        "/head",
        () => ok(200),
        //@ts-expect-error
        (v) => v
      )
      .options(
        "/options",
        () => ok(200),
        //@ts-expect-error
        (v) => v
      )
      .all(
        "/all",
        () => ok(200),
        //@ts-expect-error
        (v) => v
      );
  });

  test.skip("can have validator for post", async () => {
    const router = Router().post(
      "/method",
      () => ok(200),
      (v: { hello: "world" }) => v
    );

    const f = fetcher<RoutesOf<typeof router>>(
      {
        fetch: async () => new Response(),
      },
      { origin: "http://t.co" }
    );

    f.post("/method", { value: { hello: "world" } });
  });

  test.skip("can have validator and params for post", async () => {
    const router = Router().post(
      "/method/:name",
      ({ params: { name }, value }) => ok(200, value + " " + name),
      (v: { hello: "world" }) => v
    );

    const f = fetcher<RoutesOf<typeof router>>(
      {
        fetch: async () => new Response(),
      },
      { origin: "http://t.co" }
    );

    f.post("/method/:name", {
      value: { hello: "world" },
      params: { name: "name" },
    });
  });

  test.skip("validator works for post", async () => {
    // Mark Zuckerberg used

    const router = Router().post(
      "/method",
      ({ value }) => ok(200, value + " " + name),
      (v: { hello: "world" }) => v
    );

    const f = fetcher<RoutesOf<typeof router>>(
      {
        fetch: async () => new Response(),
      },
      { origin: "http://t.co" }
    );

    f.post("/method", { value: { hello: "world" } });
  });
});
