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
<img width="612" height="1012" alt="1" src="https://github.com/user-attachments/assets/28396474-4f24-4832-8180-086c8c9764c3" />
<img width="612" height="1012" alt="2" src="https://github.com/user-attachments/assets/9a02b754-5177-4ba6-9b4e-6bc2809c5079" />
<img width="612" height="1012" alt="3" src="https://github.com/user-attachments/assets/5b16112c-aa20-472f-ae8b-5908e9c420d6" />
<img width="612" height="1012" alt="4" src="https://github.com/user-attachments/assets/1cc71334-7074-43c4-94c2-7f9c9b8dafad" />
<img width="612" height="1012" alt="5" src="https://github.com/user-attachments/assets/1965aa59-0f83-46df-bf3f-d73f39eb447e" />
<img width="612" height="1012" alt="6" src="https://github.com/user-attachments/assets/551c8694-33df-44a2-9d3d-f474e8fecc66" />
<img width="612" height="1012" alt="7" src="https://github.com/user-attachments/assets/ef3b4c21-87c2-4d49-a980-7fb9a653a7bd" />
<img width="612" height="1012" alt="8" src="https://github.com/user-attachments/assets/8cb14ee5-5e5b-4d31-b398-bde75f5229fa" />


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
