# Repository Guidelines

## Project Structure & Module Organization
- `index.html` is the main entry point for the site.
- `404.html` provides the not-found page.
- `assets/` contains compiled CSS/JS bundles (hashed filenames); treat as build output.
- `novel/` contains static content pages and ebooks (HTML/EPUB/TXT).
- `tmp/` stores media artifacts used by pages.

## Build, Test, and Development Commands
No build or test tooling is checked into this repo. For local preview, use a static server:
```bash
# from repo root
python -m http.server 8000
```
Then open `http://localhost:8000/`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces in HTML (match `index.html`).
- Keep filenames lowercase and descriptive (e.g., `novel/12.html`).
- Do not edit hashed bundles in `assets/` by hand; rebuild through the original toolchain if needed.

## Testing Guidelines
No automated tests are present. If you add scripts later, document how to run them here and include any naming patterns (e.g., `*.spec.js`).

## Commit & Pull Request Guidelines
- Commit messages are short and descriptive (e.g., "Add files via upload"). Keep them focused on one change.
- PRs should include a clear description of the change, list affected paths, and attach screenshots for any visible UI/content updates.

## Configuration & Hosting Notes
- This repository appears to be a static site; deploy by serving the root directory.
- If you introduce a build pipeline, add the build output directory and update this guide.
