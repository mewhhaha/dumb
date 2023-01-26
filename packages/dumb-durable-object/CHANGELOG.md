# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

...

## [0.0.2] - 2022-01-26

### Added

- `CHANGELOG.md` to track changes over time
- fields `repository`, `bugs` and `engines` to `package.json`

## [0.0.1] - 2022-01-22

### Added

- class `CallableDurableObject` which can be derived from 
- type `DurableObjectNamespaceIs<...>` which can be used to type a specific namespace from an object
- `client` function which can be used to create a client from a given `DurableObjectNamespaceIs<...>` to access the methods on the corresponding `CallableDurableObject`
- `ws` function which has some helper functions for setting up `WebSocket`s in a `DurableObject`