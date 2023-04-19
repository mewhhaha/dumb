# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

...

## [0.0.13] - 2023-04-20

### Added

- Added third parameter for a validator which will parse incoming `JSON` and also add a `value` property to the fetcher which has to be filled, and will subsequently be `JSON.stringify`-ied to the body.
- Re-export `dumb-typed-response`


## [0.0.10] - 2023-04-18

### Fixed

- Fixed illegal invocation for fetchers passed in

## [0.0.9] - 2023-04-17

### Added

- Added parameter for object that has fetch method to be passed to `fetcher`

## [0.0.6] - 2023-04-17

### Added

- Added `*` at end
- Added legible type errors on pattern issues for methods

### Fixed

- Fixed overlapping types

## [0.0.5] - 2023-04-17

### Added

- Added `sideEffects` set to `false` in `package.json`

## [0.0.3] - 2023-04-16
### Added

- Added `fetcher` method that can be injected with types from contstructed router for typed fetch calls
- Basic type errors for accidentally overlapping patterns when making routes

## [0.0.2] - 2023-04-10
### Changed

- Remove `trace` and `connect` from `Router` methods

## [0.0.1] - 2023-04-09
### Changed

- Added `Router` for most methods