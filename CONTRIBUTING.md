# Contributing to Canon

Canon helps people build applications with coding agents using shared design tokens, components, page patterns and focused instructions. Contributions can improve the catalog, accessibility, generated output, Studio, agent integrations, tests or documentation.

For a small fix, open a focused pull request. For a new API, integration or substantial catalog addition, describe the application use case in an issue first so the proposed scope is easy to review. Agent-assisted contributions are welcome; the contributor is responsible for understanding and verifying the result.

## Set up a checkout

Fork and clone this repository, then run these commands from its root. Use **Node.js 22.18 or newer** and npm.

```sh
npm ci
npx playwright install chromium
npm run test:ci
```

On Linux, Playwright may also need system libraries; use `npx playwright install --with-deps chromium` in an environment where you can install them.

`npm run test:ci` runs TypeScript checking, the Node test suite and the Chromium browser suite. During development, use the relevant command:

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check source types without emitting files. |
| `npm test` | Run the Node tests, including CLI and package integration tests. |
| `npm run test:browser` | Run Studio and preview tests in Chromium. |
| `node --test tests/engine.test.ts` | Run one test file while changing that area. |
| `npm run build` | Compile the distributable runtime into `lib/`. |

The checkout CLI runs current source with `node bin/canon.js`; it does not require a global installation. `npm run build` compiles Canon itself. `node bin/canon.js build --design <path>` generates a design's CSS, references and previews.

## Find the right source

| Location | Responsibility |
| --- | --- |
| [`src/types.ts`](src/types.ts) | Component, pattern, token and design schemas. |
| [`src/tokens/`](src/tokens/) | Token generation, presets and seed handling; shared token logic is in `base.js`. |
| [`src/components/`](src/components/) | Component specifications and shared style fragments. See [Authoring components](docs/AUTHORING.md). |
| [`src/patterns/`](src/patterns/) | Application layouts and pages. See [Authoring patterns](docs/PATTERNS.md). |
| [`src/engine.js`](src/engine.js) | Token resolution and CSS generation shared by Node and Studio. |
| [`src/generators/`](src/generators/) | CSS exports, React wrappers, previews, documentation and agent references. |
| [`src/cli.ts`](src/cli.ts), [`src/system.ts`](src/system.ts), [`src/build.ts`](src/build.ts) | Commands, design loading and validation, and artifact generation. |
| [`src/editor.js`](src/editor.js), [`src/serve.ts`](src/serve.ts) | Studio editing and its local server. |
| [`src/connect.ts`](src/connect.ts), [`src/install.ts`](src/install.ts), [`src/mcp.ts`](src/mcp.ts), [`src/lint.ts`](src/lint.ts) | Project connections, agent setup, MCP tools and design checks. |
| [`tests/`](tests/), [`scripts/`](scripts/) | Behavior tests, browser tests and package tooling. |

Edit the source that owns the behavior. `lib/` and a design's `dist/` are generated output. A project's `design/components/*.json` and `design/patterns/*.json` are copies of the catalog created at initialization; changing them does not change the repository catalog.

## Preview in a temporary workspace

Use a new generated design for contribution work. Never use a personal or customer design as a fixture. These commands are for a POSIX shell, run from the repository root:

```sh
CANON_REVIEW_DIR="$(mktemp -d "${TMPDIR:-/tmp}/canon-review.XXXXXX")"
node bin/canon.js init "Contributor review" --preset canon --prefix review --design "$CANON_REVIEW_DIR/design"
node bin/canon.js doctor --design "$CANON_REVIEW_DIR/design"
node bin/canon.js studio --root "$CANON_REVIEW_DIR" --design "$CANON_REVIEW_DIR/design" --port 0 --open
```

The server prints its localhost URL and opens Studio. Stop it with Ctrl+C. Studio saves remain inside this temporary design. The `review` prefix also exposes accidental hardcoded `cn-` references.

After changing catalog specs or token defaults, stop the server and run this block again to create a fresh snapshot. Building an existing design does not reimport the catalog. To review only generator changes, rebuild the temporary design with `node bin/canon.js build --design "$CANON_REVIEW_DIR/design"` and refresh Studio.

Review the changed examples in light and dark themes, at desktop and phone widths, and with keyboard navigation. Include before/after screenshots for visual changes and describe any interaction checks. Generated preview HTML is a reference; it does not supply application routing, data loading or full widget behavior.

## What makes a useful contribution

- Solve a concrete application task. Explain when an agent should choose a component, prop or pattern, including its limits and related alternatives.
- Use semantic tokens, shared control sizing and composite type styles. Verify custom prefixes, themes and responsive layouts; avoid encoding one preset's colors or measurements in a spec.
- Provide complete markup for each meaningful structure or state. A matrix that changes a `data-*` attribute cannot demonstrate a different navigation hierarchy, drawer flow or keyboard interaction.
- Use native controls where possible, visible focus, accessible names and correct state attributes. Document behavior the consuming application must implement, such as focus management, dismissal or async errors.
- Keep agent context focused. Update the underlying specs and generators so CSS, React, docs and MCP stay consistent. Avoid copying the entire catalog into instructions.
- Test observable behavior for code changes and regressions. A test should fail for the reported problem and pass with the fix. Documentation-only changes can use link and command checks instead of adding tests.

## Submit a pull request

Describe the problem, resulting behavior and how you verified it. For code or catalog changes, run `npm run test:ci` before requesting review and report any failure or unavailable check accurately. Fix or explain new validation warnings. Include migration guidance when changing an existing schema, prop, token or generated interface.

Keep the diff focused and include only relevant source, tests and documentation. Review generated or agent-written changes yourself, and remove personal data from examples, logs and screenshots. Use the issue and pull request templates to make the change reproducible and reviewable.
