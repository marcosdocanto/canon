# Changelog

## 0.2.3 — 2026-10-02

- Added `npx canon-ds@latest setup`: install the bundled Canon entry skill with agent and scope selection, without a GitHub repository in the command.
- Skill installation uses durable copies, supports explicit agents and project/global scope, and leaves application components and theme untouched. Run setup again to update the skill.
- The homepage, guide and README now give existing shadcn/ui projects and new applications distinct, equally visible starting paths.

## 0.2.2 — 2026-10-02

- Agent instructions and Studio autocomplete now derive color utility names from explicit Tailwind color mappings, preserving aliases and excluding font, spacing, radius and shadow variables. When mappings are unavailable, instructions point to the project configuration instead of inventing utilities.
- Sidebar border and ring mappings now use the matching utility families.
- Generated CSF stories no longer require Storybook types in application builds; the Sonner example preserves its supported theme union.
- New library initialization points to Studio and explains that the application runs separately.

## 0.2.1 — 2026-10-02

- Added the distributable `canon` entry skill: project setup, shadcn adoption, agent context, implementation, Studio, verification and local delivery.
- Included the skill in npm and downloadable archives; updated the homepage and documentation with skill-first onboarding and a manual setup path.
- Fixed library MCP to return actual installed components, imports, source and declared theme values, refreshing on every request instead of reading the native catalog.
- Library MCP lint suggestions now use project tokens; library pattern limitations are explicit and resource reads are restricted to advertised resources.
- Adoption now describes the existing project design without inheriting Canon preset fonts or art-direction claims.

## 0.2.0 — 2026-10-02

Canon is a design harness for coding agents. Version 0.2 connects an installed component library to managed AGENTS.md instructions, design references, MCP tools, Library Studio and design checks, with shadcn/ui as the current adapter.

- React/shadcn Library Studio with actual project-source previews, theme and typography controls, and base, variant and part editing.
- Inspection and interaction modes, desktop/mobile and light/dark previews, and an overview composed from installed components.
- In-memory draft edits and supported source write-back with concurrent-change detection.
- Reset dropdown with a confirmed full reset to official shadcn defaults, automatic backups, source conflict checks and regenerated agent references.
- Updated project homepage, library-first documentation, npm metadata and contributor guidance.
- Separate sidebar and chart theme controls; sidebar colors appear near the top of Theme.
- Native generated-catalog workflow retained and documented separately.

See [migration notes](docs/MIGRATION-0.2.md) for existing libraries, new applications and native projects.
