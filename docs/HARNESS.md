# Configurable verification harness

Canon can execute a project's declared checks and capture its running web application without a shadcn adapter or generated design directory. The configuration is project-owned, versioned JSON. Existing `canon check`, `canon doctor`, library adoption and Studio retain their design-library responsibilities.

## Initialize and inspect

Run from the target application root with Node.js 22.18 or newer and Canon installed locally:

```sh
npx canon harness init
npx canon harness init --apply
npx canon harness doctor
```

Initialization previews by default. It detects existing package scripts named `typecheck`, `lint`, `test` and `build`, and existing `PRODUCT.md`, `DESIGN.md`, `DESIGN.compact.md`, `CONTRIBUTING.md` and design-system skill files. It selects npm, pnpm, Yarn or Bun from `packageManager` or the existing lockfile, defaulting to npm. Review the commands and ensure they terminate: watch-mode tests need explicit non-watch arguments. Initialization does not execute those scripts. An empty configuration is a starting point, not a ready verification result.

Pass an explicit application URL to scaffold desktop and mobile captures of `/`:

```sh
npx canon harness init --url http://localhost:3000 --apply
```

Canon does not guess application routes, a development port or a start command. `--apply` creates `canon.config.json` only when absent. An existing file is preserved. It also updates a dedicated `canon:harness` block in `AGENTS.md` and `CLAUDE.md`, preserving unrelated instructions and existing Canon library blocks, and ignores `/.canon/runs/` in Git. Reapply after editing context paths to refresh those references. All destinations and managed markers are checked before one rollback-capable write batch; linked destinations and malformed or duplicate markers are rejected. These operations do not install dependencies or replace the design system.

`--root <path>` selects the discovery start directory. Verification finds the closest `canon.config.json` within the application boundary; discovery is independent of `.canon/project.json` and its design binding. In a monorepo, initialize each intended application explicitly.

## Contract

```json
{
  "schemaVersion": 1,
  "context": {
    "documents": ["PRODUCT.md", "DESIGN.md"],
    "skills": [".agents/skills/project-design/SKILL.md"]
  },
  "checks": [
    {
      "id": "typecheck",
      "command": ["npm", "run", "typecheck"],
      "timeoutMs": 120000
    },
    {
      "id": "ui-tests",
      "command": ["npm", "run", "test:ui"],
      "cwd": ".",
      "timeoutMs": 120000
    }
  ],
  "app": {
    "url": "http://localhost:3000",
    "start": ["npm", "run", "dev"],
    "readyTimeoutMs": 30000
  },
  "scenarios": [
    {
      "id": "home",
      "path": "/",
      "readySelector": "main",
      "colorScheme": "light",
      "viewports": [
        { "name": "desktop", "width": 1440, "height": 900 },
        { "name": "mobile", "width": 390, "height": 844 }
      ]
    }
  ],
  "completion": {
    "requiredChecks": ["typecheck", "ui-tests"],
    "requiredScenarios": ["home"]
  }
}
```

Use only real files, commands and routes belonging to your application. Documents and skills are paths to files relative to the project root. IDs and viewport names use letters, numbers, underscores or hyphens. Commands are argument arrays, run without an implicit shell. A check's `cwd` stays inside the project. `app` is optional when there are no scenarios; `app.start`, `readySelector` and `colorScheme` are optional. Every configured check and scenario is attempted; the completion lists identify the evidence required for readiness. At least one requirement is necessary.

The harness reads the policy and references; it does not interpret prose into executable checks. It does not invoke a model, implement a change, or retry a repair loop. Your agent follows the project's skills and fixes failures within the task's authorization, then reruns verification.

## Browser setup and behavior

For browser scenarios, install `playwright` or `@playwright/test` in the **target project** and explicitly install Chromium through that project's local Playwright CLI. For example, when using npm:

```sh
npm install --save-dev playwright
npx playwright install chromium
```

Canon resolves the target project's installation first. A source checkout can fall back to Canon's own development dependency for contributor testing; the distributed runtime has no browser fallback and never installs browsers silently. `harness doctor` checks local browser availability, but does not launch the browser or execute application checks.

Configured checks run before browser capture. `app.start` manages the server for captures only; a check that needs a running server must manage that lifecycle itself or use an already running server. Verification then probes `app.url`. Any HTTP response establishes an existing server, which is reused and left running; an HTTP error fails the relevant scenario without starting a competing process. Each capture records its URL and whether its server was external or managed by Canon. Otherwise, the optional `app.start` process is started, awaited and stopped by Canon when capture ends. Without a start command, an unreachable application fails capture. On POSIX systems the owned process group is stopped; Windows cleanup is limited to the direct child process.

Each route and viewport uses an isolated browser context. Capture waits for page load, the optional visible selector and font readiness, bounded by `app.readyTimeoutMs` (30 seconds by default). It uses the configured light/dark color scheme, reduced motion, UTC and English locale, and disables screenshot animations. A navigation failure, HTTP error, uncaught page error, missing selector or browser failure produces failed evidence. Review screenshots for application errors that return HTTP 200 without throwing. Authentication, scripted user interactions, seeded data and visual baselines are not configured by this schema; run your saved Playwright tests as checks for those flows.

Screenshots demonstrate only that configured pages were captured. They are not visual regression verdicts, accessibility audits or proof that user interactions work. Supply dedicated project checks for those requirements. External services and a reused running server are not cryptographically tied to local source.

## Execute and read evidence

```sh
npx canon verify
npx canon verify --json
npx canon report
npx canon report <run-id> --json
npx canon report <run-id> --format markdown
npx canon report <run-id> --format html
```

Runs are stored under `.canon/runs/<run-id>/`, with JSON, Markdown, HTML, command output, screenshots and an artifact hash manifest. `report` defaults to the latest run and revalidates it against current source, configuration and artifact bytes. A source/configuration change, removed or modified artifact, or missing required result prevents readiness. Rerun `verify` after a commit: the recorded Git revision is part of the source identity. Verification also checks for source changes during execution.

In Git projects, source identity includes tracked files and nonignored untracked files, plus configured context and configuration. Ignored application inputs and external state are outside this coverage unless referenced as context. Without Git, common generated directories are excluded from the filesystem snapshot. Hashes catch accidental edits; local reports are not signed attestations against a malicious writer.

| State | Meaning |
| --- | --- |
| Check `passed` | The recorded command exited successfully. |
| Check `failed`, `error`, `timeout`, `cancelled` | The command failed, could not execute, exceeded its deadline, or was interrupted. |
| Capture `captured` | A screenshot file was produced and hashed; no visual verdict is implied. |
| Capture `failed` | Browser evidence could not be collected. |
| `ready: true` | Configured completion requirements have valid evidence for the recorded source. |
| `ready: false` | Requirements, configuration, execution or evidence are insufficient. |
| `stale: true` | Recorded evidence no longer matches current inputs or artifacts. |

`harness init` exits 0 on successful preview/apply; `harness doctor` exits 0 when its inspection succeeds and 1 on configuration/dependency problems. `verify` and `report` exit 0 only for ready evidence and 1 for a non-ready/stale result or operational error. Invalid subcommands or output formats exit 2. `--json` writes the result to stdout on a completed operation; fatal errors are written to stderr. Neither `canon check` nor a successful doctor result substitutes for `verify`.

## Agent MCP integration

`canon harness mcp --root /absolute/path/to/app` starts a newline-delimited stdio MCP server independent of a design adapter. Tools are read-only:

- `harness_policy`: configured context, checks, scenarios and completion policy.
- `harness_doctor`: inspect configuration and local browser availability.
- `harness_report`: latest report, or `{ "runId": "..." }`, with freshness revalidation.

Register a separate server entry with your client's supported configuration, preserving existing entries. For a client using `.mcp.json`, an entry can use your local binary:

```json
{
  "mcpServers": {
    "canon-harness": {
      "command": "/absolute/path/to/app/node_modules/.bin/canon",
      "args": ["harness", "mcp", "--root", "/absolute/path/to/app"]
    }
  }
}
```

Initialization does not change MCP settings. Reload the client when required. MCP cannot run arbitrary checks or write a pass claim; execute `canon verify` through the terminal and retrieve its report. Existing library MCP remains available alongside the harness server.

## CI and PR evidence

Commit the reviewed configuration. Install locked dependencies and required browsers explicitly in CI. Always run verification for the checked-out commit; do not reuse an earlier local ready report after committing.

```yaml
name: Canon verification
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx canon harness doctor
      - run: npx canon verify
      - name: Prepare review evidence
        if: always()
        run: npx canon report --format markdown > "$RUNNER_TEMP/canon-evidence.md"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: canon-evidence
          path: |
            .canon/runs/
            ${{ runner.temp }}/canon-evidence.md
```

Omit the browser installation step for contracts without scenarios. Configure a start command or provide the app server through your CI workflow. Attach the artifact and use the generated Markdown as a PR evidence section; its relative links resolve inside the run directory, so link the uploaded artifact when pasting into a PR. Creating the report does not post a comment, publish screenshots or merge the PR. Store exported evidence outside source paths so report generation itself does not change the next source snapshot.
