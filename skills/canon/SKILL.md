---
name: canon
description: Build or update a working product with Canon and shadcn/ui, from project setup and library adoption through MCP-guided component reuse, shared design editing, validation and local delivery. Use when the user asks to use Canon, connect Canon to an app, or create a product with the Canon design harness.
license: MIT
---

# Canon

Requires an agent with filesystem and terminal access. Node.js 22.18 or newer; Canon 0.2.1 or newer for library MCP. Network access for installation; a browser for visual verification. MCP is optional with a file-based fallback.

Carry out the requested product work. Canon inventories the installed UI library, provides design context and edits shared styles. You implement the application's pages, data and behavior using those real components. Do not stop after installing Canon when the user asked for a working product.

This skill is the entry point, available before a project exists. After connection, also read the project's generated `AGENTS.md` and `DESIGN.compact.md`; its `design-system` skill contains the project-specific design contract.

## Establish the project

Determine the intended product, target folder and requested depth from the conversation. Make routine implementation choices from the repository. Ask only for missing information that materially changes the work, such as an ambiguous target project or required external data. A setup-only request ends with a verified connection and Studio; it does not authorize a redesign or a new application.

Inspect repository instructions, working-tree changes, package manager/lockfile, framework, routes, installed UI, global CSS and `components.json`. Check the target's own `.canon/project.json` for its design path and adapter. In a monorepo, work inside the intended application; an ancestor's Canon binding is not proof that a child app is configured.

For an explicitly requested new product, create a separate folder when requested and scaffold the framework before initializing Canon. Preserve a specified stack; otherwise choose a suitable React setup with TypeScript and Tailwind from the official framework and shadcn guidance. Do not replace an incompatible existing stack or UI library merely to enable Canon. The supported library adapter is currently **shadcn/ui**.

For local prototypes, implement the agreed scope with clearly identified fixture data and persistence appropriate to the request. A request to build a product does not itself authorize paid services, production deployment or publishing a repository.

## Connect the design harness

Check Node and the installed Canon version. Use the project's package manager and local CLI. Install `canon-ds` as a development dependency when missing; update releases older than 0.2.1 when the task requires library MCP. `--save-dev` / `-D` keeps Canon in development tooling; the deployed application consumes its own component source and theme.

The following examples use npm. Translate them to the existing package manager and run from the **target application root**. Quote paths containing spaces.

```sh
npm install --save-dev canon-ds
npx canon --version
```

Choose the path that matches the source:

| Project state | Action |
| --- | --- |
| Already connected to Canon with the shadcn adapter | Reuse its recorded design directory. Run `npx canon sync` when references need refreshing. Do not initialize again. |
| shadcn is installed, Canon is not connected | Run `npx canon adopt`, inspect the plan and paths, then `npx canon adopt --apply` within the authorized setup scope. Adoption preserves installed components and theme. |
| New React/Tailwind app without shadcn | Run `npx canon init "Product name" --lib shadcn`. This installs the adapter's core component selection and applies a Canon theme preset. It is initialization, not a preservation or upgrade command. |
| User explicitly wants stock shadcn or has an existing theme to preserve | Set up shadcn using its official CLI and current framework instructions, then use `canon adopt`. Do not apply a Canon preset over that theme. |
| Existing native Canon binding or another library | Preserve the current design source. Follow its installed instructions for native work; explain the adapter limitation if the request requires migrating libraries. Do not convert it silently. |

Use `--design <existing-path>` and `--root <app-root>` where needed. Check `npx canon --help` for the installed CLI rather than inventing flags or commands. Resolve a failed setup from its actual error; do not use `--force`, full reset, deletion of design files or reinitialization as generic recovery.

`adopt --apply`, library initialization and `sync` generate project references and agent integration. Verify the project's own binding and that `AGENTS.md` / `CLAUDE.md`, `DESIGN.compact.md`, `DESIGN.md` and supported client configuration were written. Existing unrelated instructions must remain intact. `--no-hooks` skips adding the optional Claude hook; it does not remove an existing one.

## Verify and use the agent context

Read `DESIGN.compact.md` and the installed Canon instructions. Discover the Canon tools exposed by the current agent, accounting for the host's tool-name prefix. When available:

1. Call `design_rules`.
2. Call `list_components` and check that the result describes this app's installed components and import paths.
3. Call `get_component` with the relevant `slug`, for example `{"slug":"button"}`. Use `list_tokens` or `get_token` for actual shared theme values.

Request only the details needed for the current screen. Source files remain authoritative for props, provider requirements and behavior; a static inventory cannot infer every dynamic prop.

Writing an MCP config does not mean the running agent has loaded it. If Canon is absent, the client needs a reload, or results are empty/stale or belong to another project, report that accurately. Check the configured CLI/design path, sync if needed and verify again. Continue independently using the matching `DESIGN.compact.md`, relevant `DESIGN.md` sections and installed component source. Do not claim tool calls that did not happen or substitute Canon's native catalog for the installed shadcn library.

MCP supplies design context and lint results. Run setup and development processes through terminal tools. It does not scaffold the application or save arbitrary application code.

## Implement by reuse

Import components from the inventory's real paths. Use installed variants, parts and providers; compose them into the requested product. Do not copy an installed Button, Dialog, Sidebar or Chart into a lookalike implementation. For a required missing shadcn component, install only that component and refresh context:

```sh
npx canon add <slug>
npx canon sync
```

Use the project's semantic tokens, fonts and shared styles. Connect the real theme CSS through the framework's entry point. Library mode does not need a generated native Canon stylesheet. Do not invent a typography scale and describe it as the installed library's specification.

Implement the requested flows with real state: forms validate and save, search filters, dialogs open and close, and derived values follow the data. Reuse the actual Chart component for charts and the project's toast API for notifications. Apply provider and portal requirements from the installed code. Treat preview fixtures as examples, not application records or verified business facts.

## Refine the shared design

Start or reuse a Studio process bound to this application, using the terminal's background-process mechanism. Capture the actual URL from its output; port `0` selects an available port.

```sh
npx canon studio --root <app-root> --port 0 --open
```

Studio is the design editor; start the application with its own development command as a separate process. Keep both URLs distinct.

Use Studio for supported shared theme, typography, base, variant and exported-part styles, following the project's ownership rules. Through an available browser tool, review the draft and save authorized changes to shared source; inspect the resulting source diff and application. If a required property is unsupported or no Studio UI access exists, state the specific limitation instead of inventing an MCP write tool or CLI style command.

A theme token affects components that reference it. Check explicit variant and per-instance overrides before compensating with global CSS. Read-only style expressions are not permission to replace the component's implementation.

**Reset** discards an unsaved draft. **Reset ▾ → Full reset** restores supported current upstream defaults, including saved style changes, after an in-app confirmation and backup. Use it only when the user requests that restoration; it is not part of ordinary setup or synchronization.

## Verify and deliver

Run the application's relevant checks/build and Canon's checks. Capture existing lint findings before changing an adopted app when needed to distinguish them from new problems.

```sh
npx canon lint <changed-ui-files>
npx canon check
```

Fix failures caused by the work. If generated context is stale after source changes, run `npx canon sync` and recheck. Upstream shadcn arbitrary utilities may produce Canon lint findings: report those precisely rather than restyling the installed library merely to silence lint. A successful Canon check does not prove that a screen works.

Verify the requested flow in the running application, including relevant error/empty states, keyboard focus and a narrow viewport. Verify supported light/dark modes when changing shared styles. When saving a shared style, confirm it in both the actual component preview and an application use of that component.

Leave the requested local application and its project Studio available. Return the actual URLs, what works, checks performed, fixture/persistence scope, and any specific remaining limitation. For setup-only work, report the connection without claiming a product was built. Publish or deploy only within the user's authorization.
