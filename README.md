# Canon

[![npm version](https://img.shields.io/npm/v/canon-ds?color=B4309F&logo=npm)](https://www.npmjs.com/package/canon-ds)

**The configurable design harness for coding agents.**

Canon records how a web project uses design context, skills, checks and browser evidence. A project-owned `canon.config.json` connects those sources to the coding agent, declares executable verification requirements, and produces reports tied to the source and configuration that were checked.

Keep your framework, component library and development tools. Your coding agent implements the product using the project's instructions; Canon executes the configured checks and collects evidence for review. The CLI requires Node.js 22.18 or newer, and browser capture uses the target project's Playwright installation.

An optional library integration adds component inventory, design references and Studio editing. Its current adapter supports shadcn/ui. That adapter and Canon's native generated catalog remain separate capabilities; neither is required by the configurable harness.

[Harness guide](docs/HARNESS.md) · [Library documentation](https://marcosdocanto.github.io/canon/docs.html) · [Migration guide](docs/MIGRATION-0.2.md) · [Contribute](CONTRIBUTING.md)

## From setup to verified delivery

1. **Record the project context.** Reference the actual product/design documents and skills the agent should follow. Existing project instructions retain their authority.
2. **Configure verification.** Declare check commands, application routes, viewports and the evidence required for completion.
3. **Build with the agent.** Use the project's existing framework, components and development process to implement the requested change.
4. **Run the contract.** `canon verify` executes checks and captures the configured browser scenarios. Resolve failures within the task's scope and rerun after changes.
5. **Review current evidence.** `canon report` revalidates source/configuration freshness and artifact hashes. Use its Markdown report and artifacts in review.

Screenshots record rendered output; they do not automatically establish visual quality, accessibility or interaction correctness. Add the project's relevant tests as checks and review the actual UI.

## Configure a project

**Development checkout:** the configurable harness commands below are implemented on this working branch. The npm version badge does not imply they are already published. Use `node /absolute/path/to/canon/bin/canon.js` in place of `npx canon` when testing this checkout; check the installed CLI's `--help` before using a published version.

```sh
npx canon harness init                         # preview detected checks and context
npx canon harness init --apply                # create canon.config.json and agent context
npx canon harness doctor
npx canon verify
npx canon report --format markdown
```

Edit `canon.config.json` to use the project's actual document and skill paths, check commands and completion requirements. Initialization preserves an existing configuration and updates a dedicated block in `AGENTS.md` and `CLAUDE.md`. Pass a known `--url` to scaffold root-route captures; configure additional routes explicitly. No design directory or library adoption is required.

The generic commands are `harness init`, `harness doctor`, `verify`, `report` and the optional read-only `harness mcp` server. Existing `canon check` and `canon doctor` retain their design-library responsibilities. See [the harness guide](docs/HARNESS.md) for the schema, browser setup, exit codes, MCP and CI/PR evidence.

## Use with your coding agent

Install the Canon entry skill from the CLI version you intend to use:

```sh
npx canon setup
```

Choose your agent and project or global scope in the installer, then reload its session if needed. In Codex, invoke `$canon`. For an existing application, ask:

> Use Canon to configure this project's design context, checks and browser evidence. Preserve its framework, components and theme.

For a new product, describe the intended app and any stack constraints. The agent creates the requested application, configures its verification contract, implements the work and returns evidence. Canon does not choose shadcn as a prerequisite.

`setup` installs the entry skill included in that Canon version, using the Skills installer to select agents and scope. It copies the files so removing npm's cache does not break the skill. It does not initialize or modify your app. Run it again to update the installed skill; updates are not automatic.

For non-interactive installation, use `npx canon setup --agent codex --yes` (current directory) or add `--global` (all projects). `--root <directory>` targets an existing folder. `--yes` requires an explicit agent. Run `npx canon setup --help` for details.

Installing the `canon-ds` development dependency alone does not install the entry skill into an agent. The entry skill is also separate from the project-specific `design-system` skill generated by the optional library integration.

## Optional library integration

Use this workflow when you want Canon to inventory or edit a supported installed library. It generates design references and library MCP context and provides visual editing through Studio. The current library adapter supports **shadcn/ui**; other projects can use the generic harness with their existing design tools.

For an existing shadcn/ui project, ask the agent to connect the library while preserving its components and theme. Adoption preserves the installed source; already connected projects reuse their Canon binding. For an explicitly requested new shadcn/ui application, the agent can initialize the library and build with its installed components.

The Library Studio interface is built with React and shadcn/ui controls. Its JavaScript and Tailwind CSS are bundled with the CLI, so the editor works offline without adding runtime dependencies to your project. Studio chrome uses its own neutral theme; the preview uses your library's editable theme.

### Library workflow

1. **Connect the library.** Adopt an existing shadcn/ui project without reseeding its theme, or initialize a library in a new framework app.
2. **Install context.** Canon creates or updates its managed block in `AGENTS.md` and `CLAUDE.md`, preserving unrelated instructions. It generates `DESIGN.compact.md`, `DESIGN.md`, a Claude skill and Cursor rule, and configures Canon MCP for supported clients.
3. **Build with the agent.** Start from the compact reference and use MCP to retrieve relevant rules and component details. In library mode, MCP reads the actual installed inventory and declared theme on each request. Reuse installed components and theme tokens.
4. **Refine in Studio.** Inspect real components and preview supported style changes before saving.
5. **Save and sync.** Save updates shared source and generated references. The app reloads through its framework. Use `canon sync` after external design edits.
6. **Check the result.** Run Canon’s checks, review the actual UI, and run the application’s own tests. Optional Claude edit hooks provide lint feedback; they are not enforcement or a guarantee of correctness.

See [the generated-file map](https://marcosdocanto.github.io/canon/docs.html#files) for exact paths and ownership. Generated reference files are replaced on refresh; put custom instructions outside the managed AGENTS.md/CLAUDE.md block. `--no-hooks` skips adding the optional hook, without removing an existing one.

### Library Studio

Canon can edit an installed component library directly. The current adapter supports **shadcn/ui**. Start inside your application repository:

```sh
npm install --save-dev canon-ds
npx canon adopt                  # review the adoption plan
npx canon adopt --apply          # preserve the installed components and theme
npx canon studio --port 0 --open
```

`--save-dev` (or `-D`) keeps Canon in development dependencies; your deployed app uses its own component source and theme.

For a new library in a framework application, use `npx canon init "My product" --lib shadcn` instead of adoption. Initialization installs a core selection when needed and applies a Canon preset; adoption preserves your existing theme. Add one component at a time with `npx canon add <slug>`.

**Theme** composes installed components into an overview. **Typography** shows type samples and project font configuration; it is not an installed Typography component. **Components** renders the project's actual React source with examples. The preview chrome switches light/dark, mobile/desktop, and interaction/inspection. No Storybook server is required for this live preview.

Select a component or inspect its rendered parts. The inspector edits supported base classes, variant values, defaults, and static exported-part class literals. Theme controls edit declared CSS variables. Unsupported dynamic expressions and application behavior remain read-only with an explanation.

Draft changes compile in memory. **Save** writes supported changes to the project's actual shared theme and component source. **Reset** discards the unsaved draft. Applications importing those components receive saved styles through their normal development reload or next build. Canon does not deploy your application.

**Reset ▾ → Full reset** restores the current official shadcn defaults for the style and base color in `components.json`: light/dark theme colors, radius, editable variants and component-part styles. Review the affected components and confirm **Restore defaults** to apply. This requires internet access; it is not a historical snapshot of the version originally installed. Project fonts, custom tokens, application logic and custom/read-only components are preserved. Canon saves the previous files with a `manifest.json` under `.canon/backups/library-reset/`, regenerates design references, and refuses the reset if files changed after review. No files are changed on cancellation or preparation failure. Legacy HSL themes, prefixed utilities, RTL layouts and translucent menus require matching defaults and are currently refused rather than reset incorrectly. Registry icon templates currently support Lucide.

A concurrent source change triggers a conflict instead of silently overwriting the file. Reload and reapply the intended changes. Source content outside the supported style edits is preserved. Use `canon sync` after external changes, `canon lint` for supported style checks, and `canon check` for build consistency. Component examples are compositions; they do not guarantee every possible prop, behavior, or state is represented.

See the [library guide](https://marcosdocanto.github.io/canon/docs.html#library). The public catalog and `canon connect` flow use Canon's **native** generated design mode; use `adopt` for an existing shadcn/ui project.

### Library source of truth

| Area | Source of truth |
| --- | --- |
| Theme colors, radius and declared font tokens | Your project’s theme CSS. |
| Component base styles, variants and parts | Your installed component source. |
| Overview and individual previews | Compositions of those installed components. |
| Routes, page layout, data and business logic | Your application code. |
| Coding-agent context | References generated from the project’s design. |

The Theme overview is a selection of examples, not a claim that every installed component appears on one page. The component menu reflects the detected library inventory. Typography samples demonstrate project fonts; installing or loading a new font remains an application concern.

### Editing shared styles

- **Theme:** edit shared colors, including separate sidebar and chart tokens, for light and dark appearances.
- **Typography:** edit the declared font families available to the project.
- **Components:** inspect a base, variant or part, and edit supported shared styles.
- **Save:** write to source; your application picks up changes through its development reload or next build.
- **Reset:** discard the unsaved draft, without reverting previously saved source.

An explicit component or instance override can take precedence over a theme token. Canon preserves those source choices. Chart series follow the token or value configured by the project; they are not universally forced to primary.

### Library commands

```sh
npx canon adopt                  # inspect an existing library
npx canon adopt --apply          # connect it without reseeding the theme
npx canon init "My product" --lib shadcn  # initialize in a new framework app
npx canon studio --port 0 --open
npx canon add accordion          # install one component
npx canon sync                   # refresh after external source edits
npx canon lint                   # supported style checks
npx canon check                  # build consistency and lint
npx canon --help
```

Lint can flag arbitrary utilities in upstream components. Review findings against the installed source; a lint finding alone does not justify replacing a library’s intended styles. Application behavior still needs its own tests and browser verification.

## Native catalog

Existing native projects continue to use their JSON definitions and generated CSS. See the [native reference](docs/NATIVE.md). Adopting a shadcn library is a separate operation; upgrading Canon does not automatically migrate a native project.

## Contribute and release

Read [CONTRIBUTING.md](CONTRIBUTING.md) for source locations and validation. See the [0.2 migration guide](docs/MIGRATION-0.2.md), [changelog](CHANGELOG.md), and [release guide](docs/RELEASING.md).

Canon is [MIT licensed](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md). The npm package remains `canon-ds` and the command remains `canon`.
