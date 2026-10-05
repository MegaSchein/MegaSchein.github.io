# Erik H. Stenersen · portfolio

Personal site for a QA Chapter Lead based in Luxembourg. Plain HTML, CSS and JavaScript, with no build step.

## What's on the page
- A hero that plays a test run, a skills ticker, and sections for Luup, experience and work beyond testing.
- A bug hunt: start it and five bugs are planted on the page for the visitor to find and file.
- A command palette (Ctrl or ⌘ + K), a light and dark theme, and a scroll progress bar.

## Run it locally
```sh
python3 -m http.server 4173
```
Then open http://localhost:4173.

## Tests
The Playwright suite checks the content, links, accessibility basics, the phone layout and every interactive feature. It also runs in GitHub Actions on each push.

```sh
npm install
npx playwright install chromium
npm test
```
