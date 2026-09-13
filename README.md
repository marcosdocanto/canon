# Canon

[![npm version](https://img.shields.io/npm/v/canon-ds?color=B4309F&logo=npm)](https://www.npmjs.com/package/canon-ds)

**Connect Canon to your agent. Shape the design in Studio.**

Canon is an open-source design system for apps built with coding agents. It provides shared tokens, components, page layouts, a visual Studio and focused instructions that keep interface work consistent.

[Documentation and connection prompt](https://marcosdocanto.github.io/canon/) · [Explore the Studio](https://marcosdocanto.github.io/canon/preview.html) · [Contribute](CONTRIBUTING.md)

## Connect your agent

Paste this into your coding agent's conversation for a new or existing project:

```text
Use Canon as this project's design system.
Read and follow: https://marcosdocanto.github.io/canon/CONNECT.md
```

The agent installs Canon, imports the design, connects its generated CSS to the existing app and opens the project's Studio. You can customize the design before building the first screen or at any point later. Reconnecting preserves existing Canon definitions and their configured path. You do not need to describe the app again.

The public site is a catalog. Your editable Studio runs locally, and your design files stay in the project. The application uses generated CSS through its own frontend and deployment stack; Canon requires no hosted service at runtime. Node.js **22.18.0 or newer** is needed for Canon's build tools and Studio.

<details>
<summary>npm installation reference</summary>

For an npm release, the agent can install the package directly:

```sh
npm install --save-dev canon-ds
npx canon connect https://marcosdocanto.github.io/canon/CONNECT.md
npx canon studio --port 0 --open
```

Use the project's existing package manager. The connection procedure also supports the site's downloadable package when a registry release is unavailable, retaining that archive in the project for future installs.

</details>

## Use Studio

Explore the public component catalog and page layouts. In the Studio opened by your agent, use **Customize → Style** to change the visual direction, or click a component with the editor open to adjust its parts in **Inspect**. Choose an example and compare desktop/mobile layouts at Fit or 100%.

In a bound Studio, **Save** atomically updates the design source, generated CSS and installed agent references. MCP reads the new build on its next data request, so there is no sync or reload step to ask for. The app reflects CSS changes through its framework's normal reload or build. Use **Undo** to revert an edit and save again when needed.

Screen layout, routes and application behavior remain agent work; Save does not rewrite or deploy the app. For design-source edits made outside Studio, run `canon sync`.

## Contribute

Contributions to components, accessibility, performance, Studio, agent integrations and documentation are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), [component authoring](docs/AUTHORING.md) or [pattern authoring](docs/PATTERNS.md). Use an issue to report a reproducible problem or discuss a larger change, then open a focused pull request.

Canon is distributed under the [MIT license](LICENSE). You can use it in personal, commercial and closed-source applications, subject to the license terms. [Third-party notices](THIRD_PARTY_NOTICES.md) cover the included icon references and external assets. Maintainers follow the [release guide](docs/RELEASING.md).

<details>
<summary>Technical reference for agents and contributors</summary>

## How it stays consistent

1. **Shared definitions.** `design/tokens.json`, component specs and patterns generate CSS, docs, React and the gallery from the same source. `src/engine.js` runs in Node and in the browser editor.
2. **Focused agent context.** Start with `DESIGN.compact.md` and MCP's `design_rules`. Discover pieces with `search`, `list_components` or `list_patterns`; fetch only the required specs with `get_component` and `get_pattern`. Without MCP, read the relevant source JSON and sections of `DESIGN.md`.
3. **Installed references.** `canon connect` builds and installs managed blocks in `AGENTS.md` and `CLAUDE.md`, the Claude Code skill, Cursor rule, MCP configuration and optional lint hook, then records the design path in `.canon/project.json`. `--no-hooks` skips adding the hook; it does not remove an existing one.
4. **Code checks.** `canon lint` detects supported violations such as raw style values, Tailwind palette classes, unknown Canon classes and invalid prop values. `canon check` verifies a complete build, compiler version, source content and generated file hashes, then runs lint. Application tests and browser review cover the remaining delivery requirements.

## Generated files

With the default output directory, these files live in `design/dist/`:

| File | Purpose |
| --- | --- |
| `<prefix>.css` | Complete token, reset, component and pattern styles, ready for a prototype. |
| `tokens.css`, `base.css`, `components.css` | The same styles as separate layers. |
| `css/components/<slug>.css`, `css/patterns/<slug>.css` | Individual styles for explicit imports of the pieces used by a product. |
| `tailwind.theme.css`, `tailwind.preset.cjs` | Tailwind v4 and v3 themes mapped to the tokens. |
| `react/` | Typed React wrappers for components and their parts. |
| `tokens.dtcg.json` | Tokens in DTCG format. |
| `preview.html`, `docs.html` | Studio and the user guide. |
| `CONNECT.md` | Canon's setup procedure for agents connecting to a new or existing project. |
| `DESIGN.compact.md`, `DESIGN.md` | Focused agent reference and the complete specification. |
| `agents/` | Instructions, skill, rules and MCP configuration for installation. |
| `canon.lock.json` | The build manifest verified by `canon check`. |

For a product, the agent can import `tokens.css`, `base.css` and the individual component and pattern styles actually used, including components referenced by each pattern. This is an explicit integration choice; the agent should measure the resulting route rather than assume unused styles are automatically removed.

## Commands

These are reference commands for the agent. Run them in the application repository and use `--design` consistently if the source lives outside `design/`.

```text
canon connect <Studio URL|/full/snapshot.json> --root <project-root>
              [--design <existing-custom-path>] [--no-hooks]
canon init <name> [--preset canon|editorial|vera|clean|dark] [--prefix app]
                 [--brand '#B4309F'] [--font 'DM Sans'] [--design design]
canon build [--design design] [--only react,preview]
canon install [--design design] [--root .] [--no-hooks]
canon sync [--design design] [--root .] [--no-hooks]
canon studio --root <project-root> [--design design] [--port 0] [--open]
canon serve                                  # alias for studio
canon lint [paths…] [--design design] [--json] [--changed]
canon check [--design design] [--root .]
canon mcp [--design design]
canon add <component-slug> [--design design]
canon doctor [--design design]
canon presets
canon --help
canon --version
```

`connect` imports the saved snapshot from `./api/system` beside the connection document, or from a full local JSON path, only when the project has no configured design. Public sites hosted under a path such as `/canon/` retain that path. Otherwise the command reuses the source recorded in `.canon/project.json` without fetching or resetting it. For a legacy installation, discover its source and pass `--design`; never use `init` or a preset as fallback for a failed import.

`init` requires a name and builds automatically. Use `sync` after editing an existing source outside Studio; `init --force` intentionally resets its definitions. `add` imports a missing catalogue component. `hook` accepts the Claude Code edit event on stdin and is normally configured by `install`.

`canon mcp` runs over stdio and is started by the agent client. It refreshes data on the request after a successful build. Agents read the current installed references at the beginning of UI work. `canon lint src app` checks those paths; use the application's actual directories and confirm the report covers the changed files.

A build with `--only` selects optional generators while still generating CSS. Run a complete `canon build` before `canon check`. In CI, check versioned outputs directly; if outputs are generated in CI, build before checking.

## Local CLI reference

The compiler and CLI have zero runtime dependencies and require Node.js **22.18.0 or newer**. A source checkout uses Node's native TypeScript support; packaged versions run compiled JavaScript.

The Studio serves the connection procedure at `./CONNECT.md`, the saved snapshot at `./api/system` and an installable package at `./canon-package.tgz`. The public website exposes those files too. Registry releases use `canon-ds`; a retained archive also supports installations without registry access. A localhost URL works for an agent on the same computer. If the agent runs elsewhere, use the public URL or an address it can reach.

From a source checkout, invoke `node bin/canon.js` directly, or create a short command once:

```bash
npm link
canon --version
```

Then continue in the application's repository. Replace the checkout path when needed.

Presets are `canon` (default), `editorial`, `vera`, `clean` and `dark`. `canon presets` describes their visual directions. Seed options include `--brand`, `--action`, `--font`, `--radius`, `--base`, `--control`, `--canvas`, `--ink`, `--mono`, `--display`, `--shadow-tint`, `--neutral-hue`, `--neutral-chroma` and `--theme`.

Explicit seeds replace corresponding preset defaults. Deliberate token overrides live in `seeds.overrides`; defaults live in `seeds.presetOverrides`. Studio preserves hand-edited token values when changing unrelated seeds.

## What is in the catalog

- **Components** (`src/components/*.ts`, 90): actions (buttons, icon buttons, groups, close, social/app-store), forms (fields, inputs and groups, textarea, select, combobox, multi-select, checkbox, radio, switch, slider, segmented control, pin/number/tags inputs, date picker, color picker, file dropzone, rich text editor), navigation (sidebar family, topbar, header navigation, mobile header, tabs, breadcrumb, pagination, menu, command palette, stepper, page and section headers), data display (badge, badge group, tag, counter, avatar and groups, table, list, description list, stat/metrics, accordion, timeline, kanban, tree view, chart frame, rating, activity feed, messages, account card), feedback (alert, banner, toast, notification, progress bar and circle, spinner, skeleton, empty state, inline CTA, featured card), overlays (tooltip, popover, dialog, drawer), media (featured icon, media frame, carousel, video player, credit card), typography (kicker, prose, link, code, kbd).
- **Patterns** (`src/patterns/*.ts`): application layouts and pages only — app shell, form layout, dashboard, settings, list with detail drawer, inbox / chat / notification center, onboarding wizard, profile, files, calendar, dialog and drawer flows, phone-width screens, first-run and empty states, billing and checkout, audit log, roles and permissions, auth and error pages — each with 2–6 layout variants, rendered at desktop and 375px in the gallery.
- **Presets**: `canon` (default), `editorial`, `vera`, `clean`, `dark`.

## Authoring

Components live in `src/components/*.ts` as data (see `docs/AUTHORING.md`). Patterns (layouts, sections, pages) in `src/patterns/*.ts`. `canon init` copies them into a project's `design/` as JSON where they can be edited by hand or in the editor; `canon add <slug>` pulls a new catalog component into an existing project.

## Tests

```bash
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

`npm run test:ci` typechecks the source and runs both suites. `npm run build` prepares the compiled `lib/` runtime; `npm pack` runs it automatically. The packaging tests install the tarball in a temporary consumer and exercise the CLI without runtime dependencies.

</details>
