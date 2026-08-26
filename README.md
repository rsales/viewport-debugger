# Viewport Debugger

A lightweight Chrome extension for inspecting viewport dimensions while developing responsive websites.

## MVP

The first version displays the current CSS viewport size in real time:

- `window.innerWidth`
- `window.innerHeight`
- responsive breakpoint
- device pixel ratio
- enable/disable from the extension popup

The overlay is rendered inside a Shadow DOM so page styles do not interfere with the debugger.

## Stack

- Chrome Extension Manifest V3
- TypeScript
- Vue 3
- Vite
- CRXJS

## Requirements

- Node.js 20.19+ or a current Node.js LTS
- Google Chrome or another Chromium browser

## Development

Install dependencies:

```bash
npm install
```

Start Vite development mode:

```bash
npm run dev
```

Build the extension:

```bash
npm run build
```

Type-check the project:

```bash
npm run typecheck
```

## Load the extension in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated `dist` directory.
6. Open a website and resize the browser window.

The viewport indicator should update immediately.

## Roadmap

- [x] Viewport dimensions
- [x] Real-time resize updates
- [x] Breakpoint detection
- [x] Device pixel ratio
- [x] Enable/disable control
- [ ] Custom breakpoints
- [ ] Rulers
- [ ] Grid overlay
- [ ] Device presets
- [ ] Element inspector
- [ ] Spacing inspector
- [ ] Firefox support

## License

MIT
