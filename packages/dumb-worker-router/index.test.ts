import { assertType, describe, expect, test } from "vitest";
import { Router, WorkerRouter } from "./index";
import { ExecutionContext } from "@cloudflare/workers-types";

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

  test.each(methods)("%s matches", async (method) => {
    const router = Router()[method](
      "/foo",
      () => new Response(method, { status: 200 })
    );

    const response = await router.handle(
      new Request("http://t.co/foo", { method })
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(method);
  });

  test.each(methods)("%s doesn't match", async (method) => {
    const router = Router()[method](
      "/foo",
      () => new Response(method, { status: 200 })
    );

    const response = await router.handle(
      new Request("http://t.co/bar", { method })
    );
    expect(response.status).toBe(404);
    expect(await response.text()).not.toBe(method);
  });

  test("matches first of several", async () => {
    const router = Router()
      .get("/foo", () => new Response("foo", { status: 200 }))
      .get("/bar", () => new Response("bar", { status: 200 }));

    const response = await router.handle(new Request("http://t.co/foo"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("foo");
  });

  test("matches second of several", async () => {
    const router = Router()
      .get("/foo", () => new Response("foo", { status: 200 }))
      .get("/bar", () => new Response("bar", { status: 200 }));

    const response = await router.handle(new Request("http://t.co/bar"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("bar");
  });

  test("matches catch all", async () => {
    const router = Router()
      .get("/foo", () => new Response("foo", { status: 200 }))
      .all("*", () => new Response("bar", { status: 200 }));

    const response = await router.handle(new Request("http://t.co/bar"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("bar");
  });

  test("matches method catch all", async () => {
    const router = Router().get(
      "*",
      () => new Response("bar", { status: 200 })
    );

    const response = await router.handle(new Request("http://t.co/foo"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("bar");
  });

  test("doesn't match method catch all", async () => {
    const router = Router().get(
      "*",
      () => new Response("bar", { status: 200 })
    );

    const response = await router.handle(
      new Request("http://t.co/foo", { method: "post" })
    );

    expect(response.status).toBe(404);
    expect(await response.text()).not.toBe("bar");
  });

  test("parses params", async () => {
    const router = Router().get(
      "/get/:foo/:bar",
      ({ params }) => new Response(params.foo + params.bar, { status: 200 })
    );

    const response = await router.handle(
      new Request("http://t.co/get/foo/bar")
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("foobar");
  });

  test("parses catchall param", async () => {
    const router = Router().get(
      "*",
      ({ params }) => new Response(params["*"], { status: 200 })
    );

    const response = await router.handle(
      new Request("http://t.co/get/foo/bar")
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("/get/foo/bar");
  });

  test("passes on rest types", async () => {
    const s = Symbol();
    Router<WorkerRouter<typeof s>>().get("*", ({ params }, env, ctx) => {
      assertType<ExecutionContext>(ctx);
      assertType<typeof s>(env);
      return new Response(params["*"], { status: 200 });
    });
  });

  test("passes on rest arguments", async () => {
    const a = "a";
    const b = "b";
    const router = Router<[typeof a, typeof b]>().get("*", (_, a, b) => {
      return new Response(a + b, { status: 200 });
    });
    const response = await router.handle(
      new Request("http://t.co/get/foo/bar"),
      "a",
      "b"
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ab");
  });
});
