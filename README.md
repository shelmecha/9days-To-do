# 9days To-do

> A to-do app where nothing carries over silently.

## The Problem

Most to-do apps let tasks quietly roll over from day to day, week to week, forever. Backlogs grow unchecked, and "someday" tasks live forever without ever being confronted. **9days To-do** takes a different approach: it enforces a **9-day lifecycle** for every task. Nothing lingers invisibly — you either finish it, consciously renew it, or let it go.

## Why This Matters (for OSS users & contributors)

- **Opinionated productivity mechanic** — a genuinely different take on task management, not another generic to-do clone.
- **Cross-platform** — runs as a web app (Vite + React) and as a native desktop app (Electron) on Windows.
- **Small, hackable codebase** — TypeScript + React, no heavy framework lock-in, easy to read end-to-end.
- **Good testing story** — unit tests (Vitest) and end-to-end tests (Playwright) already scaffolded.

If you like building focused, well-tested tools and enjoy debating opinionated productivity workflows, this is a fun project to dig into.

## Quickstart

```bash
# Clone
git clone https://github.com/shelmecha/9days-To-do.git
cd 9days-To-do

# Install dependencies
npm install

# Run the web app in dev mode
npm run dev

# Run as a desktop (Electron) app
npm run electron:dev
```

Open the app at the URL printed by Vite (typically `http://localhost:5173`).

### Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e
```

### Building a desktop release

```bash
npm run dist
```

This produces a portable Windows executable in the `release/` directory.

## Live Demo

A hosted web version is available at: https://9days-to-do.vercel.app

## Screenshots

_Coming soon — contributions with screenshots/GIFs are very welcome!_

## Roadmap

- [ ] Add screenshots/GIF walkthrough to README
- [ ] Task categories/tags
- [ ] Cloud sync / optional backend persistence
- [ ] macOS and Linux desktop builds
- [ ] Notifications when a task is nearing its 9-day expiry
- [ ] Accessibility pass (keyboard navigation, screen reader support)
- [ ] Localization / i18n support

See the [issues](https://github.com/shelmecha/9days-To-do/issues) for more granular tasks, including some tagged `good first issue`.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations.

## License

This project is licensed under the [MIT License](LICENSE).
