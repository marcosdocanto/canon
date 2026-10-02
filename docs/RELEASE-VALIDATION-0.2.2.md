# Canon 0.2.2 acceptance record

Validated on 2026-10-02 with Node 24.16.0 and a separate Next.js 16.3.8 / React / TypeScript / Tailwind application. This was an executed application test, not only a review of the skill's instructions.

## New project

1. Created a fresh application with `create-next-app`, with no Canon or shadcn setup copied from another product.
2. Installed the public `canon-ds@0.2.1` package and ran `canon init "Canon validation todo" --lib shadcn`. This installed 15 actual shadcn components and generated the binding, references, agent instructions and client configuration.
3. Started the installed package's MCP server over stdio. Called `design_rules`, `list_components`, `get_component` for Button and Dialog, and `list_tokens`. The inventory returned this application's 15 components and actual `@/components/ui/*` imports.
4. Implemented a local todo app by composing those installed components. Data uses browser storage and is explicitly labeled as demonstration data.
5. Exercised the app in Chrome: empty-form validation, add, edit in Dialog, complete, filter, search with no results, delete, toast feedback and persistence after reload. Reviewed desktop and a 390-pixel viewport in light/dark modes.
6. Installed the packed 0.2.2 candidate and ran `canon sync`. The new instructions omit invented font/color utilities and the MCP reads the same corrected rules.
7. Used Studio to change the primary color and the body font, saved, inspected the CSS, and confirmed the Button preview and the app both computed the saved primary color as `rgb(24, 99, 75)` and used the same system sans font stack.
8. Ran the app's ESLint, TypeScript and production build. No Storybook installation or TypeScript exclusion was needed after the correction.

## Findings fixed in this release

- A CSS font variable previously became an invalid background utility in agent instructions. Explicit Tailwind color aliases now determine the examples. Unreadable mappings are not guessed.
- Generated stories previously imported optional Storybook types, breaking a fresh application's TypeScript build. Stories now use plain CSF objects. The Sonner recipe also preserves its light/dark type union.
- Library initialization now points to Studio and distinguishes it from the application server.

The regressions were reproduced before their fixes, including a TypeScript compilation regression for the generated Sonner story without Storybook installed.

## Checks and limits

- Canon: 381 unit/integration tests and 58 browser tests passed, plus typecheck, package release checks and site build.
- Application: ESLint and production build passed; Canon lint found no violations in the new application UI files.
- `canon check` confirmed current generated references, but reported nine arbitrary-utility findings in the unmodified upstream Checkbox, DropdownMenu, Switch, Tabs and Tooltip files. They were retained rather than rewriting shadcn merely to satisfy the linter.
- The scaffold's body-font variable was unresolved. Selecting an available system font in Studio corrected the shared source and both rendered surfaces. The Next-provided monospace variable remains unavailable in the standalone Studio preview, which explicitly reports that limitation.
- Prior component acceptance covered 61 installed entries, 58 editable component previews, and 273 source writeback targets. This does not claim coverage of every possible component prop, state or dynamic style expression.

The test application remains a local validation artifact. It was not published as another product or added to the npm package.
