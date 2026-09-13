# Connect Canon to the current project

You are connecting the saved Canon design from this Studio to the user's current project. Complete the connection in the current repository, integrate the generated styles with its existing UI stack, then open the Studio bound to that project. The user does not need to describe the application again.

## 1. Inspect and preserve the project

Read repository instructions and identify the project root, framework, package manager, shared UI, style entry points and available checks. Preserve existing work, routes, behavior, data and design definitions. Connecting Canon does not authorize recreating the app, redesigning its screens or migrating the whole interface.

Look for `.canon/project.json` first. It records the Canon design already bound to this project. For a legacy installation without that file, locate its existing `system.json` and use that directory as `--design <existing-path>` when connecting. Do not choose a new default path over an existing Canon source.

## 2. Make the CLI available

Reuse the project's existing Canon installation or a Canon checkout already available to the agent. Otherwise:

1. Use Node.js 22.18.0 or newer. Prepare required dependencies with the project's package manager.
2. If you read this document over HTTP, resolve `./canon-package.tgz` beside the URL from which you loaded it, preserving its scheme, host, port and directory. For example, `/canon/CONNECT.md` uses `/canon/canon-package.tgz`. Download that package into `.canon/canon-ds.tgz` in the project.
3. Install the retained local file as a development dependency. With npm, run `npm install --save-dev ./.canon/canon-ds.tgz`; use the equivalent with the project's existing package manager. Keep the archive so future installs do not depend on the original Studio.
4. Verify the local CLI with `npx --no-install canon --version` or the package manager's local binary command. Use that invocation below. Do not assume a public registry package or invent a download URL.

If you read this as a local file, use the available CLI, checkout or package archive. Locate the Canon source (`system.json`, `tokens.json`, components and patterns) above the generated documentation and start a source Studio with `canon studio --design <source-directory> --port 0` in the background. Use its verified URL for connection below. If a full saved snapshot JSON is already available, its local path also works. If neither source nor package is accessible, request an accessible Studio address or the missing package/source. A localhost address on another computer is not reachable by a remote agent.

## 3. Connect the saved design

Run this from the application repository, substituting the exact project root and connection source:

```text
canon connect <Studio-URL-or-full-snapshot-JSON-path> --root <project-root> [--design <existing-custom-path>] [--no-hooks]
```

Use the URL from which this document was loaded when it came from Studio. The command imports the saved snapshot from `./api/system` beside that Studio's connection document only when the project has no configured Canon source. If `.canon/project.json` already binds the project, it automatically reuses that design. For a legacy installation, pass the existing path with `--design`; the new binding will record it.

The command builds the source, installs current references and records `.canon/project.json`. On reconnect it must preserve the project's later token, component, pattern, prefix and path changes without fetching or resetting them. If snapshot download, parsing or validation fails, stop and report the error. Never substitute `canon init`, a preset or catalogue defaults for the failed import.

Read `DESIGN.compact.md` and the Canon blocks in `AGENTS.md` or `CLAUDE.md` at the beginning of UI work. They are the current project instructions. When MCP is available, call `design_rules` once and retrieve only the component, pattern and token specifications needed for the task. MCP refreshes its data on the next request after a successful build; the user does not need a sync or reload prompt.

## 4. Integrate the application

Connect Canon's generated CSS and, where useful, wrappers through the existing framework's real style and application entry points. A connection-only request still requires the application to consume the generated stylesheet; verify that import or link in the running app without redesigning screens. Reuse stable components, avoid duplicate CSS and inspect global resets or theme rules before applying them broadly.

If the folder has no application or style entry point, do not scaffold one just to demonstrate Canon. Report that the design and references are connected, and that stylesheet consumption awaits an application task.

Adopt Canon only in UI the user asks to create or change. Product routes, screen layout, behavior and data remain application work. Reusable tokens and visual component definitions belong in the configured Canon source. For source edits made by an agent outside Studio, run `canon sync --root <project-root>` and include `--design <custom-path>` for a legacy unbound setup. Never patch generated files.

The app uses its local generated CSS through the framework's normal development reload or build. It does not depend on the original Studio after the first import, and Studio Save does not rewrite application HTML, routes or behavior or deploy the app.

## 5. Open the project's Studio and verify

Start or reuse this command as a background process:

```text
canon studio --root <project-root> --port 0 --open
```

Capture the assigned local URL, verify it responds and leave the process running. This bound Studio edits the project's saved Canon source. Save atomically updates the design files, generated CSS and installed agent references; the application sees CSS changes through its normal reload/build.

Run `canon check --root <project-root>` and applicable repository checks. For changed UI files, run `canon lint <changed-files> --root <project-root>` and inspect affected screens in the browser. Distinguish pre-existing failures from new issues.

Return the verified project Studio URL, the design path, the application stylesheet entry point, the checks run and any real limitation. If there is an active UI task, continue it using the current references and verify its application preview too.
