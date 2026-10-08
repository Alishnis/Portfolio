# Portfolio

Personal portfolio site for Alisher Romankul, a first-year CS student at City University of Hong Kong: hand-written HTML, CSS and vanilla JavaScript, no frameworks and no build step.

<!-- TODO(owner): add a screenshot (e.g. docs/screenshot.png) and the live URL once the site is deployed. -->

## Features

- Single-page layout with four sections: selected work, practice (LeetCode stats and tech stack), about and contact.
- Seven project entries, each linking to its GitHub repo and, where available, a live demo and a demo video.
- Animated hero: a canvas flow field of connected points that reacts to the cursor.
- Project thumbnails drawn procedurally on `<canvas>` from seeded random numbers, so they are deterministic and need no image files.
- LeetCode "elevation profile": an SVG terrain chart generated in JS from Perlin-style noise, with band thickness proportional to the Easy/Medium/Hard counts.
- Scroll-reveal animations, active-section nav highlighting and a count-up number.
- Automatic light/dark theme via `prefers-color-scheme`; respects `prefers-reduced-motion`.

## Architecture

Three files do all the work, loaded directly by the browser:

| File | Role |
| --- | --- |
| `index.html` | All content and markup (project cards, stats, about, contact). |
| `styles.css` | Design tokens (CSS variables), layout, light/dark themes. |
| `main.js` | One IIFE: hero canvas animation, thumbnail painters, terrain chart, IntersectionObserver-based reveal / nav spy, theme refresh. |

The only external requests at runtime are Google Fonts (Space Grotesk, JetBrains Mono, Instrument Serif) and the outbound links.

## Tech stack

HTML5, CSS3 (custom properties, `clamp()`), vanilla JavaScript (Canvas 2D, SVG, IntersectionObserver). Tests use Node's built-in `node:test`; CI runs on GitHub Actions.

## Quick start

No install is required; the site is static. From the repo root:

```bash
python3 -m http.server 8000   # or: npm start
# then open http://localhost:8000
```

Opening `index.html` directly in a browser also works.

## Configuration

None. There are no environment variables, API keys or build settings.

## Project structure

```
.
├── index.html            # page content
├── styles.css            # styles and themes
├── main.js               # interactivity and canvas/SVG rendering
├── favicon.svg
├── tests/site.test.js    # smoke tests
├── package.json          # scripts only; no dependencies
└── .github/workflows/ci.yml
```

## Testing

Requires Node 18+ (no `npm install` needed, there are no dependencies).

```bash
npm run lint   # syntax check of main.js
npm test       # 7 smoke tests
```

The tests check that `main.js` parses, local links/assets exist, ids are unique and anchors resolve, every id used by `main.js` exists in the HTML, each project thumbnail type has a drawing routine, external links use https and `rel="noopener"`, and the LeetCode numbers in the HTML and JS agree.

## Limitations

- Content is hard-coded in `index.html`; changing a project or stat means editing HTML (and the terrain constants in `main.js` for LeetCode counts).
- LeetCode counts are static numbers, not fetched live.
- No résumé link yet (there is a TODO comment in `index.html`).
- Tests are static checks; there is no browser/visual or accessibility test suite.
- Fonts load from Google Fonts, so the page falls back to system fonts offline.

## Author's role

Written by Alisher Romankul (sole committer in git history). TODO(owner): note whether the design was built from a template or inspiration.

## License

[MIT](LICENSE)
