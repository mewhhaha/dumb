import { assertType, describe, expect, test } from "vitest";
import {
  CallableDurableObject,
  DurableObjectNamespaceIs,
  body,
  callable,
  client,
  error,
  ok,
} from "./index";

const mockNamespace = <ClassDO extends CallableDurableObject>(
  obj: ClassDO
): DurableObjectNamespaceIs<ClassDO> => {
  const id: DurableObjectId = {
    toString: () => "id",
    equals(this: DurableObjectId, other: DurableObjectId) {
      return other.toString() === this.toString();
    },
  };

  const stub: DurableObjectStub = {
    id,
    fetch: async (input, init): Promise<Response> => {
      return obj.fetch(new Request(input.toString(), init as RequestInit));
    },
  };

  return {
    idFromName: () => id,
    idFromString: () => id,
    get: () => stub,
    newUniqueId: () => id,
    jurisdiction(this: DurableObjectNamespaceIs<ClassDO>) {
      return this;
    },
  };
};

describe("durable object", () => {
  test("can get ok", async () => {
    class DurableObject extends CallableDurableObject {
      @callable
      async f(value: "foo") {
        return ok(200, `${value}bar`);
      }
    }

    const obj = new DurableObject();

    const ns = mockNamespace(obj);

    const c = client(ns, "name");
    const response = await c.f("foo");
    const data = await response.json();

    assertType<"foobar">(data);
    expect(data).toBe("foobar");
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  test("can get error", async () => {
    class DurableObject extends CallableDurableObject {
      @callable
      async f(value: "foo") {
        return error(401, `${value}bar`);
      }
    }

    const obj = new DurableObject();

    const ns = mockNamespace(obj);

    const c = client(ns, "name");
    const response = await c.f("foo");
    const data = await response.json();

    assertType<"foobar">(data);
    expect(data).toBe("foobar");
    expect(response.status).toBe(401);
    expect(response.ok).toBe(false);
  });

  test("can get body error", async () => {
    class DurableObject extends CallableDurableObject {
      @callable
      async f(value: "foo") {
        return body(401, `${value}bar`);
      }
    }

    const obj = new DurableObject();

    const ns = mockNamespace(obj);

    const c = client(ns, "name");
    const response = await c.f("foo");
    const data = await response.text();

    assertType<unknown>(data);
    expect(data).toBe("foobar");
    expect(response.status).toBe(401);
    expect(response.ok).toBe(false);
  });

  test("can get body success", async () => {
    class DurableObject extends CallableDurableObject {
      @callable
      async f(value: "foo") {
        return body(200, `${value}bar`);
      }
    }

    const obj = new DurableObject();

    const ns = mockNamespace(obj);

    const c = client(ns, "name");
    const response = await c.f("foo");
    const data = await response.text();

    assertType<unknown>(data);
    expect(data).toBe("foobar");
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  const input = ["ok", "error"] as const;
  test.each(input)("can get ok and error mixed responses", async (v) => {
    class DurableObject extends CallableDurableObject {
      @callable
      async f(value: "ok" | "error") {
        if (value === "ok") return ok(201, "ok");
        return error(401, "error");
      }
    }

    const obj = new DurableObject();
    const ns = mockNamespace(obj);

    const c = client(ns, "name");
    const response = await c.f(v);
    assertType<() => Promise<"ok" | "error">>(response.json);

    if (response.ok) {
      expect(response.status).toBe(201);
      const data = await response.json();
      assertType<"ok">(data);
      expect(data).toBe("ok");
    } else {
      expect(response.status).toBe(401);
      const data = await response.json();
      assertType<"error">(data);
      expect(data).toBe("error");
    }
  });
});
