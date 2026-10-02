# Moving to Canon 0.2

Version 0.2 connects installed component libraries to the full Canon design harness: generated agent instructions, design references, MCP, Library Studio and supported checks. The package remains `canon-ds`, the executable remains `canon`, and native projects keep their existing design source.

## Updating from 0.2.2

Run `npx canon-ds@latest setup` to install or update the Canon entry skill for your chosen agent. This copies the skill from the npm package; it does not initialize a project or modify its components or theme. You can choose project or global scope. Existing project-specific design references continue to use `npx canon sync`.

## Updating from 0.2.1

Update `canon-ds` to 0.2.2 or newer, run `npx canon sync`, and restart Studio and the agent’s Canon MCP process. Generated color utility examples now follow the actual Tailwind color aliases; typography and dimensions are no longer advertised as background colors. Configurations without readable color mappings retain guidance to inspect the installed components and Tailwind configuration. Your component source and theme are preserved. Sync also regenerates the marked Canon stories so application builds no longer require Storybook to be installed.

## Updating from 0.2.0

Update `canon-ds` to 0.2.1 or newer with your package manager, run `npx canon sync`, then restart the agent’s Canon MCP process and Studio. Library MCP now reads the real installed component inventory and theme on each request. Do not initialize or adopt again to upgrade.

The optional entry skill is available with `npx canon-ds@latest setup`. It orchestrates setup through local delivery; the generated `design-system` skill remains the project-specific contract. Existing bindings, components and theme values are preserved.

## Existing shadcn/ui application

Preserve your source in version control. Install the desired Canon release, then run `npx canon adopt` from the application root to review the plan. Run `npx canon adopt --apply` only when the plan targets the intended components and theme. Open `npx canon studio --port 0 --open`.

Adoption preserves the installed library and theme. Do not use `init --lib shadcn` as an upgrade command: initialization applies a preset. Already adopted projects can update Canon, run `npx canon sync`, and reopen Studio without adopting again.

## A new application

Create a framework app first, then run `npx canon init "My product" --lib shadcn` from that app. Canon installs a core component selection through the adapter and seeds its theme. Add other components individually with `npx canon add <slug>`.

## Editing and saving

Theme edits declared variables. Component editing changes supported base, variant and part styles in the installed source. Drafts appear in the local preview; Save writes source changes. The app updates through its own reload or build. The main Reset button only discards unsaved changes. **Reset ▾ → Full reset** prepares the current official shadcn defaults for your configured style and base color. Confirm **Restore defaults** to restore supported shared styles and declared theme colors/radius. Canon preserves application logic, fonts and custom tokens, checks for intervening edits, and saves previous files under `.canon/backups/library-reset/`. This requires internet access and is not a snapshot of a historical installed version. See the README for unsupported configurations.

The overview uses installed components with example content. It does not replace your product pages or promise coverage of every component state. Typography demonstrates project fonts; Canon does not install a font just because its family name is entered.

Unsupported dynamic source expressions remain read-only. Per-instance classes and variant overrides can take precedence over base or theme styles. Check the selected part and source before changing a global token to compensate for an override.

## Native projects

Continue using the configured `design/` path, JSON definitions and generated CSS. Updating the package does not convert a native project into shadcn/ui. See [the native reference](NATIVE.md). No native files need to be deleted to use this release.

## Before relying on a release

Run the app, edit a shared style in Studio, save, inspect the source diff and verify the result in the application. Check keyboard interaction and both themes. Run application tests separately from Canon's style checks. Existing upstream utility classes may produce lint findings and should be reviewed without automatically rewriting the library.
