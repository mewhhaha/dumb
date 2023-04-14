# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

...


## [0.0.23] - 2023-04-14

### Changed

- Added optional `request` parameter to `client` to pass on headers

## [0.0.22] - 2023-04-11

### Fixed

- Fixed `Serialized` type not accepting valid values
- Fixed `callable` not checking for serializable parameters
- Fixed `error` return type making `ok` into unknown

## [0.0.21] - 2023-04-10

### Fixed

- Fixed types for `OK` status

## [0.0.20] - 2023-04-10

### Changed

- Changed naming for not ok return type to be `ResponseNotOk` instead of `ResponseError`


## [0.0.19] - 2023-04-10

### Changed

- Changed `client` to return a response to be differentiated by `ok` instead of tuple
- Changed http status codes to be limited to valid status codes

### Added
- Added `body` response for 

## [0.0.18] - 2023-04-07

### Changed

- Changed `ok` to have its parameter be optional
- Changed tuple of `Result` to be undefined for non-existent values

## [0.0.17] - 2023-04-07

### Changed

- Changed `respond` to `ok`

## [0.0.16] - 2023-03-21

### Changed

- Changed `respond` and `error` to use `const` generics for more easily typing literals

## [0.0.15] - 2023-03-16

### Changed

- Changed protocol from `https` to `http` for dummy protocol

## [0.0.14] - 2023-03-16

### Changed

- Changed `typescript` version to `^5.0.2`

## [0.0.13] - 2023-03-15

### Fixed

- Fixed fetch in `CallableDurableObject` not picking up the proper method name.

## [0.0.12] - 2023-03-04

### Fixed

- Fixed types of `callable` to not shave off the first argument

## [0.0.11] - 2023-03-04

### Changed

- Changed `client` to not take `Request` as its first argument (instead use a dummy origin)

```tsx
const c = client(env.DO_EXAMPLE, id);
```

- Changed `callable` to not take `Request` as its first argument

```tsx
class DurableObjectExample extends CallableDurableObject {
  @callable
  helloWorld(name: string) {
    return respond(`Hello world, ${name}!`);
  }
}
```

## [0.0.10] - 2023-03-02

### Fixed

- Fixed `Record<_,_>` type not being serialized properly

## [0.0.9] - 2023-02-25

### Added

- Added `{ id: string }` option to name field for `client` for passing a string id.

## [0.0.8] - 2023-02-20

### Fixed

- Fixed `CHANGELOG.md` dates accidentally saying `2022` instead of `2023`.

### Removed

- Removed constructor setting `state` and `env` for `CallableDurableObject`.

## [0.0.7] - 2023-02-12

### Removed

- Removed `ws` function. It is moved to the `dumb-durable-websocket` package.

### Changed

- Changed path for callable objects to be under `/__dumb__/` to allow for other custom methods to be called.

## [0.0.6] - 2023-01-29

### Changed

- Changed canonical missing value for `value` and `error` from `undefined` to `null` so that the pattern can more reasily be replicated in other parts where there is a serialization boundary.

## [0.0.5] - 2023-01-28

### Changed

- Changed error value to reside in error, and instead have the undefined be the canonical value for success.

```tsx
const [value, error] = c.helloWorld("MY NAME");
if (error) {
  // value is undefined here
  // error has status + any value that was passed on in { value }
} else {
  // value is successful value here
  // error is undefined
}
```

## [0.0.4] - 2023-01-27

### Changed

- Changed result to be of a tuple of `[VALUE, ERROR]` instead of the previous object variant.

```tsx
// This allows you to quickly rename the value instead of having to do `{ value: name }`
const [value] = c.helloWorld("MY NAME");

// TypeScript is smart enough that when we check error, we can also validate what value is
const [value, error] = c.helloWorld("MY NAME");
if (error) {
  // value is error value here
} else {
  // value is successful value here
}
```

- Changed error be more opaque with the type `ResultError` which is an interface. Previously the return type would blow up because of all the HTTP status codes that were possible.

## [0.0.3] - 2023-01-27

### Fixed

- Fixed title in `README.md` to match package name.
- Fixed `CHANGELOG.md` formatting to prefix with `Added`, `Changed` and so on.
- Fixed `CHANGELOG.md` to have proper punctuation for list items.

### Changed

- Changed `typescript` to be of version `5.0.0`

### Added

- Added type called `Callable` that has the function signature which is required for class functions to match in order for the client to pick them up
- Added decorator called `@callable` that you can use to ensure the type signature of your function is correct.

```tsx
class DurableObjectExample extends CallableDurableObject {
  @callable // Decorator that ensures the type signature required for it to be callable
  helloWorld(_: Request, name: string) {
    if (name === "") {
      return error(422, { message: "Your name was empty!" });
    }
    return respond(`Hello world, ${name}!`);
  }
}
```

## [0.0.2] - 2023-01-26

### Added

- Added `CHANGELOG.md` to track changes over time.
- Added fields `repository`, `bugs` and `engines` to `package.json`.

## [0.0.1] - 2023-01-22

### Added

- Added class `CallableDurableObject` which can be derived from .
- Added type `DurableObjectNamespaceIs<...>` which can be used to type a specific namespace from an object.
- Added `client` function which can be used to create a client from a given `DurableObjectNamespaceIs<...>` to access the methods on the corresponding `CallableDurableObject`.
- Added `ws` function which has some helper functions for setting up `WebSocket`s in a `DurableObject`.
