# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Changed result to be of a tuple of `[VALUE, ERROR]` instead of the previous object variant.
```tsx
// This allows you to quickly rename the value instead of having to do `{ value: name }`
const [value] = c.helloWorld("MY NAME")

// TypeScript is smart enough that when we check error, we can also validate what value is
const [value, error] = c.helloWorld("MY NAME")
if (error) {
  // value is error value here
} else {
  // value is successful value here
}
```
- Changed error be more opaque with the type `ResultError` which is an interface. Previously the return type would blow up because of all the HTTP status codes that were possible.

## [0.0.3] - 2022-01-27

### Changed

- Changed title in `README.md` to match package name.
- Changed `CHANGELOG.md` formatting to prefix with `Added`, `Changed` and so on.
- Changed `CHANGELOG.md` to have proper punctuation for list items.
- Changed `typescript` to be of version `5.0.0`

### Added
- Added type called `Callable` that has the function signature which is required for class functions to match in order for the client to pick them up
- Added decorator called `@callable` that you can use to ensure the type signature of your function is correct.
```tsx
class DurableObjectExample extends CallableDurableObject {
  @callable  // Decorator that ensures the type signature required for it to be callable
  helloWorld(_: Request, name: string) {
    if (name === "") {
      return error(422, { message: "Your name was empty!" });
    }
    return respond(`Hello world, ${name}!`);
  }
}
```


## [0.0.2] - 2022-01-26

### Added

- Added `CHANGELOG.md` to track changes over time.
- Added fields `repository`, `bugs` and `engines` to `package.json`.

## [0.0.1] - 2022-01-22

### Added

- Added class `CallableDurableObject` which can be derived from .
- Added type `DurableObjectNamespaceIs<...>` which can be used to type a specific namespace from an object.
- Added `client` function which can be used to create a client from a given `DurableObjectNamespaceIs<...>` to access the methods on the corresponding `CallableDurableObject`.
- Added `ws` function which has some helper functions for setting up `WebSocket`s in a `DurableObject`.