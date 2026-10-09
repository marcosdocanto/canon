---
name: canon
description: Configure and use Canon as a project-owned design harness for coding agents, connecting design documents and skills to executable checks, browser evidence and current verification reports. Build or update the requested web product using its existing stack and optional library integrations. Use when the user asks to use Canon, connect Canon to an app, or create a product with the Canon design harness.
license: MIT
---

# Canon

Requires an agent with filesystem and terminal access and Node.js 22.18 or newer. Generic harness commands must be present in the installed CLI; inspect `canon --help`. Browser capture uses Playwright installed in the target web project. Network access is needed only for requested installations. MCP is optional with CLI and file-based fallbacks.

Carry out the requested product work. Canon connects the project's design documents and skills to explicit checks, browser captures and evidence reports. You implement the application's pages, data and behavior using its chosen framework and components. The generic harness has no shadcn prerequisite. Do not stop after installing Canon when the user asked for a working product.

This skill is the entry point, available before a project exists. Read project instructions and the context paths configured in `canon.config.json`. If the project also uses Canon's optional library integration, read its generated `DESIGN.compact.md` and project-specific `design-system` skill.

## Establish the project

Determine the intended product, target folder and requested depth from the conversation. Make routine implementation choices from the repository. Ask only for missing information that materially changes the work, such as an ambiguous target project or required external data. A generic setup-only request ends with a configured contract and a successful harness doctor inspection, with any missing requirements stated. Studio is relevant only when the requested setup includes the optional library integration. Setup does not authorize a redesign or a new application.

Inspect repository instructions, working-tree changes, package manager/lockfile, framework, routes, installed UI and existing verification scripts. Find the target application's `canon.config.json`. In a monorepo, work inside the intended application. If it also has `.canon/project.json`, inspect that separate design binding; an ancestor's binding is not proof that a child app has a configured harness.

For an explicitly requested new product, create a separate folder when requested and scaffold the framework before initializing Canon. Preserve the requested stack; otherwise choose based on the product needs and repository context. Keep an existing framework and UI library. Do not introduce React, Tailwind or shadcn merely to enable the harness. Browser scenarios exercise web applications; do not claim they verify native mobile interfaces.

For local prototypes, implement the agreed scope with clearly identified fixture data and persistence appropriate to the request. A request to build a product does not itself authorize paid services, production deployment or publishing a repository.

## Install or reuse Canon

Use the CLI from the same Canon distribution as this skill when available. Resolve this skill directory's real path (including symlinks) and check for `../../bin/canon.js` relative to it. If present, invoke that absolute file with Node for all Canon commands below. This keeps a development-checkout skill paired with its development CLI instead of accidentally running an older npm release. If the skill is a standalone installed copy, use the target project's installed Canon CLI and check that its help lists the required commands.

Check Node and the installed Canon version. Use the project's package manager and local CLI. Install `canon-ds` as a development dependency when missing; use a version exposing the required harness commands. For an unreleased development checkout, invoke its absolute `bin/canon.js` path with Node; do not claim npm latest includes unpublished commands. `--save-dev` / `-D` keeps Canon in development tooling; the deployed application consumes its own component source and theme.

The following examples use npm. Translate them to the existing package manager and run from the **target application root**. Quote paths containing spaces.

```sh
npm install --save-dev canon-ds
npx canon --version
```

## Configure the project verification contract

If the installed CLI exposes `canon harness`, use its generic verification contract in any supported web project. This does not require adopting shadcn, changing the framework or creating a native design directory. A configured contract is independent of `.canon/project.json`. Read the nearest `canon.config.json`, its actual document and skill paths, and the managed harness instructions; preserve project precedence.

For authorized setup, run `canon harness init` to inspect detected checks and references, then `canon harness init --apply`. Use an explicit `--url` only when the real application URL is known; initialization scaffolds `/` and never infers undocumented routes. Existing configuration is preserved. Edit it to list the actual check argv arrays, routes, viewports and required completion evidence. Do not manufacture empty passing checks. Missing documents, skills, browser dependencies or commands need an accurate error and resolution.

Run `canon harness doctor`, implement the task, then run `canon verify`. It executes the configured checks and captures declared browser scenarios. Read `canon report --json` or `canon report --format markdown`; a non-ready or stale result is not completion. Repair failures within the authorized scope and rerun verification after source/configuration changes and after the final commit when evidence must cover that commit. Attach the evidence and describe remaining coverage limits. Screenshots alone establish neither visual quality nor accessibility or interaction correctness.

Optional `canon harness mcp` exposes `harness_policy`, `harness_doctor` and `harness_report` without a design adapter. These tools are read-only; they do not execute arbitrary commands or mark work as passed. If MCP is unavailable, use the configuration and CLI reports directly. Keep existing library MCP and agent integrations intact.

For projects using only the generic harness, continue with their existing library and development tools. The library adoption and Studio steps below apply when the task uses Canon's supported design integration.

## Implement and deliver

Implement the requested flows with the project's real components, semantic styles and state. Follow the configured documents and relevant skills; do not replace their direction with generic library preferences. Exercise important interactions, error/empty states, keyboard behavior and narrow viewports in the running application.

Run the configured `canon verify` contract and read the current report. Fix failures caused by the work, rerun after changes and return the actual evidence paths, checks performed, remaining coverage limits and relevant local URLs. Distinguish fixture data from production integration. A setup-only result reports configuration and inspection without claiming a product was implemented or verification passed. Publish or deploy only within the user's authorization.

## Optional library integration

Use the following steps only when the task requests Canon's supported library inventory, design references or Studio editing. The current adapter supports shadcn/ui. Generic harness projects continue using their existing design tools; they do not need adoption, a generated design directory, library lint or Studio.

### Connect the library

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

### Use library agent context

Read `DESIGN.compact.md` and the installed Canon instructions. Discover the Canon tools exposed by the current agent, accounting for the host's tool-name prefix. When available:

1. Call `design_rules`.
2. Call `list_components` and check that the result describes this app's installed components and import paths.
3. Call `get_component` with the relevant `slug`, for example `{"slug":"button"}`. Use `list_tokens` or `get_token` for actual shared theme values.

Request only the details needed for the current screen. Source files remain authoritative for props, provider requirements and behavior; a static inventory cannot infer every dynamic prop.

Writing an MCP config does not mean the running agent has loaded it. If Canon is absent, the client needs a reload, or results are empty/stale or belong to another project, report that accurately. Check the configured CLI/design path, sync if needed and verify again. Continue independently using the matching `DESIGN.compact.md`, relevant `DESIGN.md` sections and installed component source. Do not claim tool calls that did not happen or substitute Canon's native catalog for the installed shadcn library.

MCP supplies design context and lint results. Run setup and development processes through terminal tools. It does not scaffold the application or save arbitrary application code.

### Reuse library components

Import components from the inventory's real paths. Use installed variants, parts and providers; compose them into the requested product. Do not copy an installed Button, Dialog, Sidebar or Chart into a lookalike implementation. For a required missing shadcn component, install only that component and refresh context:

```sh
npx canon add <slug>
npx canon sync
```

Use the project's semantic tokens, fonts and shared styles. Connect the real theme CSS through the framework's entry point. Library mode does not need a generated native Canon stylesheet. Do not invent a typography scale and describe it as the installed library's specification.

Implement the requested flows with real state: forms validate and save, search filters, dialogs open and close, and derived values follow the data. Reuse the actual Chart component for charts and the project's toast API for notifications. Apply provider and portal requirements from the installed code. Treat preview fixtures as examples, not application records or verified business facts.

### Refine shared library styles

Start or reuse a Studio process bound to this application, using the terminal's background-process mechanism. Capture the actual URL from its output; port `0` selects an available port.

```sh
npx canon studio --root <app-root> --port 0 --open
```

Studio is the design editor; start the application with its own development command as a separate process. Keep both URLs distinct.

Use Studio for supported shared theme, typography, base, variant and exported-part styles, following the project's ownership rules. Through an available browser tool, review the draft and save authorized changes to shared source; inspect the resulting source diff and application. If a required property is unsupported or no Studio UI access exists, state the specific limitation instead of inventing an MCP write tool or CLI style command.

A theme token affects components that reference it. Check explicit variant and per-instance overrides before compensating with global CSS. Read-only style expressions are not permission to replace the component's implementation.

**Reset** discards an unsaved draft. **Reset ▾ → Full reset** restores supported current upstream defaults, including saved style changes, after an in-app confirmation and backup. Use it only when the user requests that restoration; it is not part of ordinary setup or synchronization.

### Verify library edits

Run the application's relevant checks/build and Canon's checks. Capture existing lint findings before changing an adopted app when needed to distinguish them from new problems.

```sh
npx canon lint <changed-ui-files>
npx canon check
```

Fix failures caused by the work. If generated context is stale after source changes, run `npx canon sync` and recheck. Upstream shadcn arbitrary utilities may produce Canon lint findings: report those precisely rather than restyling the installed library merely to silence lint. A successful Canon check does not prove that a screen works.

Verify the requested flow in the running application, including relevant error/empty states, keyboard focus and a narrow viewport. Verify supported light/dark modes when changing shared styles. When saving a shared style, confirm it in both the actual component preview and an application use of that component.

Leave the requested local application available, and its project Studio when that library workflow was requested. Return the actual URLs, what works, checks performed, fixture/persistence scope, and any specific remaining limitation. For setup-only work, report the connection without claiming a product was built. Publish or deploy only within the user's authorization.
