UI Audit Screenshot Helper

This folder contains a small Playwright script to capture screenshots of the running frontend for manual audit and reporting.

Prerequisites

- Node.js installed
- From the repo root, run in PowerShell (Windows):

```powershell
cd frontend
npm install -D playwright
npx playwright install --with-deps
```

Usage

1. Start your frontend dev server (Vite). If Vite used a different port when it started, use that port (e.g. `5174`).
   Example (run from repo root):

```powershell
cd frontend
npm run dev
```

2. In a new terminal, from the repository root run:

```powershell
node tools\ui-audit\screenshot.js --port 5174 --out ./tools/ui-audit/screenshots
```

3. The script will visit a set of pages (Home, Image, Upload) and save PNG screenshots to the `--out` folder.

Options

- `--port` : port number where Vite is serving the app (default: 5173)
- `--out` : output folder for screenshots

Notes

- Playwright will launch a real browser to capture screenshots. If you prefer headless, the script uses headless by default.
- If you don't want to install Playwright, open these URLs in your browser and take screenshots manually:
  - `http://localhost:5174/` (Home)
  - `http://localhost:5174/photos/<example-slug>` (Image page)
  - `http://localhost:5174/upload` (Upload page)
