# Authoring components

A catalog component is a TypeScript module in `src/components/<slug>.ts` that exports a `ComponentSpec`. The authoritative schema is [`src/types.ts`](../src/types.ts); validation lives in [`src/system.ts`](../src/system.ts). Specs generate CSS, React wrappers, previews and agent references from the same data.

Start with a component that has similar anatomy: [`button.ts`](../src/components/button.ts), [`input.ts`](../src/components/input.ts) or [`card.ts`](../src/components/card.ts). Import types with `import type { ComponentSpec } from '../types.ts'`. Keep the filename and unique kebab-case `slug` aligned, with a camelCase export name.

## Discovery and schema

[`src/components/index.ts`](../src/components/index.ts) discovers modules in its own directory with the same extension as itself: `.ts` in a checkout and `.mjs` in the compiled package. It skips `index` and filenames starting with `_`, then collects exported objects with `slug` and `anatomy` fields. Use one component spec per file; keep shared helpers in `_shared.ts` or another `_` module. No manual registration is needed. Edit `DOC_ORDER` only when an intentional documentation order is useful; unlisted slugs appear alphabetically after listed ones in their category.

| Field | Authoring contract |
| --- | --- |
| `name`, `slug`, `category` | Clear identity and an existing `ComponentSpec` category. |
| `description`, `usage` | Explain what it does, when to choose it and which alternatives fit other tasks. |
| `anatomy` | Include `root` and every styled part, its suggested element, purpose and optionality. |
| `props` | List supported values, a valid default and the meaning of each value. |
| `states` | Describe each styled interaction state, its root selector suffix and how markup or native interaction activates it. |
| `base`, `variants` | Declare styles by anatomy part. Give every prop value a corresponding variant block; an empty block is valid when base styles suffice. |
| `compound` | Optional rules for combinations of supported prop values. |
| `examples`, `recipes` | At least one complete example; add examples for meaningful variants and states, and optional compositions with other components. |
| `rules`, `a11y`, `related` | Concrete usage rules, accessibility responsibilities and existing related component slugs. |
| `extraCss` | Optional selectors or rules the style block model cannot express. |

Use `'@states': { focus: { root: { ... } } }` inside a style block for state overrides. An anatomy or prop change also affects generated React and agent documentation, so review those outputs.

## Selectors and prefixes

| Spec concept | Generated selector with the default prefix |
| --- | --- |
| Root | `.cn-<slug>` |
| Part | `.cn-<slug> .cn-<slug>__<part>` |
| Prop value | `.cn-<slug>[data-<prop>="<value>"]` |
| State | Root plus `states[name].selector`, followed by the part selector when needed. |
| Compound | Root plus each matching `data-*` attribute. |

Use `cn-` in authored HTML, CSS, custom properties and animation names. The shared engine replaces it with the design prefix, including in state selectors and declaration values. Use `{token.path}` inside style declarations and `extraCss`; in HTML attributes or inline SVG, use `var(--cn-token-path)` where a CSS value is needed.

## Tokens and visual consistency

[`src/tokens/base.js`](../src/tokens/base.js) defines token generation; [`src/tokens/presets.ts`](../src/tokens/presets.ts) and [`src/tokens/canon-preset.ts`](../src/tokens/canon-preset.ts) apply preset choices. Refer to those sources and the generated `tokens.json` for the complete token set.

- Prefer semantic colors such as `{color.bg-surface}`, `{color.fg-muted}`, `{color.border-control}` and `{color.border-control-hover}`. Introduce a primitive color reference only when a semantic role does not cover the use case.
- Use `CONTROL[size]` from [`_shared.ts`](../src/components/_shared.ts) for matching height, padding, font, icon size, gap and radius. Controls use `{radius.control}`; use the role tokens `{radius.card}`, `{radius.panel}` and `{radius.overlay}` where appropriate, and `{radius.full}` for pills. The general radius scale is available for details with a different role.
- Use `typeStyle('body-md')` or another composite style. It includes family, size, weight, line height, letter spacing and text transform. Control font sizes come from `CONTROL[size].font`.
- Reuse `RESET_BUTTON`, focus and transition fragments, `STATE`, `SIZE_PROP`, `ex` and `ICON` where they fit. Apply a visible focus treatment with `:focus-visible` and preserve any border or shadow layers it must accompany.
- Use spacing, border, shadow and motion tokens. Structural literals such as `0`, `100%`, `auto`, `flex`, `1fr`, `currentColor` and token-based `calc()` values are appropriate. Explain any fixed detail that the token scale cannot express.

Keep the default design restrained: clear hierarchy, fine separators and deliberate use of depth. Express visual decisions through tokens so presets can retune them. Do not hardcode control radii, add decorative effects or introduce a component-local token scale to approximate one screenshot.

## Examples and behavior

Write realistic English product content. Each example must render on its own with complete anatomy and explicit relevant `data-*` values. Give IDs a component/example-specific prefix so labels and descriptions remain associated when examples share a document. Use local or inline assets with descriptive alternatives; mark decorative icons `aria-hidden="true"`.

Show variants that change anatomy with their actual markup: a dual navigation header needs both tiers, and an icon-only control needs an accessible name. Small controls can use the preview's comparison matrix, but attribute substitution does not create missing structure. Prefer a few purposeful examples over every possible cosmetic combination.

Specs are serializable style and markup contracts. Generated React components are thin wrappers; they do not provide complete widget behavior. Document required keyboard operation, focus management, selection, dismissal and async state transitions in `a11y` and `rules`. Native disabled controls should be disabled; `aria-disabled` alone does not prevent activation. A static open-state example demonstrates appearance, not a working dialog or menu.

Overlay panels should remain contained in the preview. Put backdrop and positioning layers in separate, documented classes when needed, and demonstrate open/closed and placement states using the component's actual contract. Avoid fixed elements that cover Studio itself.

## Verify the contribution

Follow [the temporary preview workflow](../CONTRIBUTING.md#preview-in-a-temporary-workspace), then run `npm run test:ci` from the checkout. Reinitialize a fresh temporary design after changing catalog source; rebuilding an old snapshot does not import the new spec.

Check validation output, generated CSS and React, the relevant `DESIGN.md` section, and every authored example. Review light/dark themes, a custom prefix, phone widths and keyboard focus. Fix or explain new warnings; structural validation cannot prove accessibility or application behavior. Include screenshots and the checks performed in the pull request.
