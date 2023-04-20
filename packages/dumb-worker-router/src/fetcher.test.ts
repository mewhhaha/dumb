import { assertType, describe, expect, test } from "vitest";
import { Router, RoutesOf, fetcher } from "./index";
import { ok } from "dumb-typed-response";
import z from "zod";
import { type } from "arktype";

describe("Fetcher", () => {
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
        // @ts-expect-error
        (v) => v
      )
      .head(
        "/head",
        () => ok(200),
        // @ts-expect-error
        (v) => v
      )
      .options(
        "/options",
        () => ok(200),
        // @ts-expect-error
        (v) => v
      )
      .all(
        "/all",
        () => ok(200),
        // @ts-expect-error
        (v) => v
      );
  });

  test.skip("can have zod validator for post", async () => {
    const validator = z.object({ hello: z.literal("world") });

    const router = Router().post("/method", () => ok(200), validator.parse);

    const f = fetcher<RoutesOf<typeof router>>(
      {
        fetch: async () => new Response(),
      },
      { origin: "http://t.co" }
    );

    f.post("/method", { value: { hello: "world" } });
  });

  test.skip("can have zod validator and params for post", async () => {
    const validator = z.object({ hello: z.literal("world") });

    const router = Router().post(
      "/method/:name",
      ({ params: { name }, value }) => ok(200, value + " " + name),
      validator.parse
    );

    const fetchMock = {
      fetch: async (url: string, init?: RequestInit) => {
        return router.handle(new Request(url, init));
      },
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    f.post("/method/:name", {
      value: { hello: "world" },
      params: { name: "name" },
    });
  });

  test("zod validator works for post request", async () => {
    const validator = z.object({ hello: z.literal("world") });

    const router = Router().post(
      "/method",
      ({ value }) => ok(200, value.hello),
      validator.parse
    );

    const fetchMock = {
      fetch: async (url: string, init?: RequestInit) => {
        return router.handle(new Request(url, init));
      },
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response = await f.post("/method", { value: { hello: "world" } });
    if (response.ok) {
      const value = await response.json();
      assertType<"world">(value);
      expect(value).toBe("world");
    } else {
      assertType<unknown>(await response.json());
    }
  });

  test("zod validator returns 422 for invalid request", async () => {
    const validator = z.object({ hello: z.number().min(1) });

    const router = Router().post(
      "/method",
      ({ value }) => ok(200, value.hello),
      validator.parse
    );

    const fetchMock = {
      fetch: async (url: string, init?: RequestInit) => {
        return router.handle(new Request(url, init));
      },
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response = await f.post("/method", { value: { hello: 0 } });
    if (response.ok) {
      assertType<number>(await response.json());
    } else {
      const value = await response.json();
      assertType<unknown>(value);
      expect(JSON.parse(value)[0].code).toBe("too_small");
    }
  });

  test("arktype validator works for post request", async () => {
    const arktype = type({ hello: "'world'" });
    const validator = (v: unknown) => {
      const data = arktype(v).data;
      if (data === undefined) {
        throw new Error("invalid");
      }
      return data;
    };

    const router = Router().post(
      "/method",
      ({ value }) => ok(200, value.hello),
      validator
    );

    const fetchMock = {
      fetch: async (url: string, init?: RequestInit) => {
        return router.handle(new Request(url, init));
      },
    };

    const f = fetcher<RoutesOf<typeof router>>(fetchMock, {
      origin: "http://t.co",
    });

    const response = await f.post("/method", { value: { hello: "world" } });

    if (response.ok) {
      const value = await response.json();
      assertType<"world">(value);
      expect(value).toBe("world");
    } else {
      assertType<unknown>(await response.json());
    }
  });

  test.skip("can't use non-serializable types", async () => {
    const validator = z.object({
      hello: z.string().transform((_) => new Map()),
    });

    // @ts-expect-error
    Router().post("/method", ({ value }) => ok(200, value.hello), validator);
  });

  test("returns 422 when validation fails", async () => {
    const router = Router().post(
      "/method",
      ({ value }) => ok(200, value),
      (v: unknown) => {
        if (typeof v !== "string") {
          throw new Error("invalid");
        }
        return v;
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

    // This should never happen, but if it does it's a 422
    // @ts-expect-error
    const response = await f.post("/method", { value: {} });
    expect(response.status).toBe(422);
  });
});
