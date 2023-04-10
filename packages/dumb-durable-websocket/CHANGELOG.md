# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

...
## [0.0.5] - 2023-04-10

### Changed

- Changed `connect` to `accept`
- Changed `accept` to return the other WebSocket instead of the response

## [0.0.4] - 2023-04-10

### Changed

- Changed `connect` to take a callback that provides the socket instead of specifiying every callback
- Changed `WebSocketServer` to `WebSocketPool`

## [0.0.3] - 2023-04-07

### Changed

- Changed `connect` to not check headers

## [0.0.2] - 2023-03-16

### Changed

- Changed `typescript` version to `^5.0.2`

## [0.0.1] - 2022-02-12

### Added

- Added `ws` function which has some helper functions for setting up `WebSocket`s in a `DurableObject`.
