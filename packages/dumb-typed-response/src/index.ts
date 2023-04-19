export type ISODateString =
  `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;

export type UndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type UndefinedOptional<T> = Omit<T, UndefinedKeys<T>> &
  Partial<Pick<T, UndefinedKeys<T>>>;

export type SerializedObject<T> = UndefinedOptional<{
  [K in keyof T]: Serialized<T[K]>;
}>;

export type SerializedArray<T> = Array<T> extends Array<infer U>
  ? Array<Serialized<U>>
  : never;

export type Serialized<T> = T extends Date
  ? ISODateString
  : T extends (...args: any[]) => any
  ? undefined
  : T extends symbol
  ? undefined
  : T extends Map<any, any>
  ? Record<never, never>
  : T extends Set<any>
  ? Record<never, never>
  : T extends Array<infer U>
  ? SerializedArray<U>
  : T extends object
  ? SerializedObject<T>
  : T;

export type HttpStatus1XX = 100 | 101 | 102 | 103;
export type HttpStatus2XX =
  | 200
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 207
  | 208
  | 226;
export type HttpStatus3XX = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
export type HttpStatus4XX =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451;

export type HttpStatus5XX =
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 510
  | 511;

export type HttpStatusAny =
  | HttpStatus1XX
  | HttpStatus2XX
  | HttpStatus3XX
  | HttpStatus4XX
  | HttpStatus5XX;

export type HttpStatusError = HttpStatus4XX | HttpStatus5XX;
export type HttpStatusOther = HttpStatus1XX | HttpStatus2XX;
export type HttpStatusOk = HttpStatus2XX;

export type TypedResponse<VALUE, ERROR, CODE> =
  | (CODE extends HttpStatusOk ? ResponseOk<VALUE, CODE> : never)
  | (CODE extends Exclude<HttpStatusAny, HttpStatusOk>
      ? ResponseNotOk<ERROR, CODE>
      : never);

export const ok = <const CODE extends HttpStatusOk, const VALUE = null>(
  status: CODE,
  value?: VALUE,
  response?: Omit<ResponseInit, "status">
): TypedResponse<Serialized<VALUE>, never, CODE> =>
  new Response(JSON.stringify(value ?? null), {
    status,
    headers: { "Content-Type": "application/json", ...response?.headers },
    ...response,
  }) as unknown as TypedResponse<Serialized<VALUE>, never, CODE>;

export const body = <const CODE extends HttpStatusAny>(
  status: CODE,
  value?: BodyInit | null,
  response?: Omit<ResponseInit, "status">
): CODE extends HttpStatusOk
  ? TypedResponse<unknown, never, CODE>
  : TypedResponse<never, unknown, CODE> =>
  new Response(value, {
    status,
    ...response,
  }) as unknown as CODE extends HttpStatusOk
    ? TypedResponse<unknown, never, CODE>
    : TypedResponse<never, unknown, CODE>;

export const error = <const CODE extends HttpStatusError, const ERROR = CODE>(
  status: CODE,
  value?: ERROR,
  response?: Omit<ResponseInit, "status">
): TypedResponse<never, Serialized<ERROR>, CODE> =>
  new Response(JSON.stringify(value ?? status), {
    status,
    headers: { "Content-Type": "application/json", ...response?.headers },
    ...response,
  }) as unknown as TypedResponse<never, Serialized<ERROR>, CODE>;

export type ResponseOk<VALUE, STATUS> = Omit<
  Response,
  "json" | "status" | "ok"
> & {
  status: STATUS;
  ok: true;
  json: () => Promise<VALUE>;
};

export type ResponseNotOk<ERROR, STATUS> = Omit<
  Response,
  "json" | "status" | "ok"
> & {
  status: STATUS;
  ok: false;
  json: () => Promise<ERROR>;
};
