# Contributing to 9days To-do

Thanks for your interest in contributing! This document outlines how to get started.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies: `npm install`
3. Run the app locally: `npm run dev` (web) or `npm run electron:dev` (desktop)
4. Create a new branch for your change: `git checkout -b my-feature`

## Development Workflow

- Write TypeScript/React following the existing code style in `src/`.
- Add or update tests when you change behavior:
  - Unit tests: `npm run test` (Vitest)
  - End-to-end tests: `npm run test:e2e` (Playwright)
- Make sure `npm run build` succeeds (this also runs `tsc --noEmit`) before opening a PR.

## Submitting Changes

1. Commit your changes with clear, descriptive commit messages.
2. Push your branch to your fork.
3. Open a pull request against `main`, filling out the PR template.
4. Link any related issues in your PR description (e.g. `Closes #12`).
5. Be responsive to review feedback — small, focused PRs are easiest to review and merge quickly.

## Reporting Bugs / Requesting Features

Please use the issue templates:

- **Bug report** — for something that isn't working as expected.
- **Feature request** — for new ideas or enhancements.

Check existing issues first to avoid duplicates. Issues labeled `good first issue` are a great place to start if you're new to the project.

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Questions?

Open a [discussion](https://github.com/shelmecha/9days-To-do/discussions) or an issue — we're happy to help.
