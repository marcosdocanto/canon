import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

/** Composite type style as a CSS declaration string for extraCss. */
const ts = (name: string) => Object.entries(typeStyle(name)).map(([p, v]) => `${p}: ${v};`).join(' ');

export const prose: ComponentSpec = {
  name: 'Prose',
  slug: 'prose',
  category: 'typography',
  description: 'Container for long-form text (help articles, agent reports, release notes, legal): sets the reading measure and styles every HTML element inside it — headings, paragraphs, lists, quotes, code, tables — from the type scale, so markdown output looks right without classes.',
  usage: 'Wrap any block of rendered markdown or editorial HTML in it. Not for UI text (labels, descriptions, table cells), which uses the type utilities directly, and not for forms.',
  anatomy: [
    { part: 'root', element: 'article', description: 'The container. Max width 65ch, default text color, base font from size. Every element inside is styled by tag; the only class you may add inside is .cn-kicker above a heading.' },
  ],
  props: {
    size: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Base text size. sm = body-sm with headings one step smaller (side panels, drawers, tooltips of an article); md = body-md, the app default (help center, reports); lg = body-lg for marketing and long reads.',
    },
  },
  states: {},
  base: {
    root: {
      'max-width': '{size.container.prose}',
      color: '{color.fg-default}',
      ...typeStyle('body-md'),
      'overflow-wrap': 'break-word',
    },
  },
  variants: {
    size: {
      sm: { root: { ...typeStyle('body-sm') } },
      md: { root: {} },
      lg: { root: { ...typeStyle('body-lg') } },
    },
  },
  extraCss: `
.cn-prose > :first-child { margin-top: 0; }
.cn-prose > :last-child { margin-bottom: 0; }
.cn-prose h1 { ${ts('heading-xl')} color: {color.fg-default}; margin-top: {space.10}; margin-bottom: {space.4}; }
.cn-prose h2 { ${ts('heading-lg')} color: {color.fg-default}; margin-top: {space.8}; margin-bottom: {space.3}; }
.cn-prose h3 { ${ts('heading-md')} color: {color.fg-default}; margin-top: {space.6}; margin-bottom: {space.2}; }
.cn-prose h4 { ${ts('heading-sm')} color: {color.fg-default}; margin-top: {space.5}; margin-bottom: {space.2}; }
.cn-prose p { margin-bottom: {space.4}; }
.cn-prose ul, .cn-prose ol { padding-left: {space.5}; margin-bottom: {space.4}; }
.cn-prose ul { list-style: disc; }
.cn-prose ol { list-style: decimal; }
.cn-prose li { margin-bottom: {space.1}; }
.cn-prose li > ul, .cn-prose li > ol { margin-top: {space.1}; margin-bottom: 0; }
.cn-prose li::marker { color: {color.fg-subtle}; }
.cn-prose blockquote { border-left: {border.width.medium} solid {color.border-strong}; padding-left: {space.4}; margin-bottom: {space.4}; color: {color.fg-muted}; }
.cn-prose blockquote p:last-child { margin-bottom: 0; }
.cn-prose a { color: {color.fg-link}; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: {color.border-strong}; }
.cn-prose a:hover { color: {color.fg-link-hover}; text-decoration-color: currentColor; }
.cn-prose strong { font-weight: {font.weight.semibold}; }
.cn-prose code { ${ts('code-sm')} background-color: {color.bg-subtle}; border-radius: {radius.sm}; padding: 1px 5px; }
.cn-prose pre { ${ts('code-md')} background-color: {color.bg-subtle}; border-radius: {radius.lg}; padding: {space.4}; margin-bottom: {space.4}; overflow: auto; }
.cn-prose pre code { background: none; border-radius: 0; padding: 0; font: inherit; }
.cn-prose hr { border: 0; border-top: {border.width.thin} solid {color.border-default}; margin: {space.8} 0; }
.cn-prose img, .cn-prose video { border-radius: {radius.lg}; margin-bottom: {space.4}; }
.cn-prose figure { margin-bottom: {space.4}; }
.cn-prose figcaption { ${ts('body-xs')} color: {color.fg-muted}; margin-top: {space.2}; }
.cn-prose table { ${ts('body-sm')} width: 100%; border-collapse: collapse; margin-bottom: {space.4}; }
.cn-prose th { ${ts('kicker')} text-transform: uppercase; color: {color.fg-subtle}; text-align: left; padding: {space.2} {space.3}; border-bottom: {border.width.thin} solid {color.border-default}; }
.cn-prose td { padding: {space.2} {space.3}; border-bottom: {border.width.thin} solid {color.border-subtle}; vertical-align: top; }
.cn-prose .cn-kicker { margin-bottom: {space.2}; }
.cn-prose[data-size="sm"] h1 { ${ts('heading-lg')} margin-top: {space.8}; margin-bottom: {space.3}; }
.cn-prose[data-size="sm"] h2 { ${ts('heading-md')} margin-top: {space.6}; margin-bottom: {space.2}; }
.cn-prose[data-size="sm"] h3 { ${ts('heading-sm')} margin-top: {space.5}; margin-bottom: {space.2}; }
.cn-prose[data-size="sm"] h4 { ${ts('heading-xs')} margin-top: {space.4}; margin-bottom: {space.1.5}; }
.cn-prose[data-size="sm"] p, .cn-prose[data-size="sm"] ul, .cn-prose[data-size="sm"] ol, .cn-prose[data-size="sm"] pre, .cn-prose[data-size="sm"] table, .cn-prose[data-size="sm"] blockquote { margin-bottom: {space.3}; }
.cn-prose[data-size="sm"] table { ${ts('body-xs')} }
.cn-prose[data-size="lg"] p, .cn-prose[data-size="lg"] ul, .cn-prose[data-size="lg"] ol { margin-bottom: {space.5}; }`,
  examples: [
    ex('Article (md)', `<article class="cn-prose" data-size="md"><h2>How agents verify a company</h2><p>Before a company reaches your shortlist, an agent checks it against three public sources: customs records, the national business registry and the company’s own site. Only companies with a match in at least two sources are marked <strong>verified</strong>.</p><ul><li>Customs records show real import volume and product codes (HS 0306 for frozen shrimp).</li><li>The registry confirms the legal entity, its age and its directors.</li><li>The website confirms the product line and the contact channel.</li></ul><blockquote><p>“Verified does not mean interested. It means the company exists, imports what you sell, and can be reached.”</p></blockquote><p>Each check leaves a trace. Open a prospect and look for the <code>verified_by</code> field; it lists the sources and the date of the last check.</p><table><thead><tr><th>Source</th><th>What it proves</th><th>Refreshed</th></tr></thead><tbody><tr><td>Customs records</td><td>Import volume, HS codes</td><td>Monthly</td></tr><tr><td>Business registry</td><td>Legal entity, directors</td><td>Quarterly</td></tr><tr><td>Company website</td><td>Product line, contacts</td><td>Weekly</td></tr></tbody></table><h3>When a check fails</h3><p>The prospect stays in the results as <em>unverified</em> and the agent retries after 7 days. You can force a re-check from the prospect drawer.</p><pre><code>GET /v1/prospects/nk-2041/verification
→ { "verified": true, "sources": ["customs", "registry"], "checked_at": "2026-09-10" }</code></pre></article>`),
    ex('Small (inside a drawer)', `<article class="cn-prose" data-size="sm" style="max-width:360px"><h3>Release notes · 11 Sep 2026</h3><p>Agents now read replies in Japanese and German and draft answers in the buyer’s language.</p><ol><li>Open a conversation with a reply in another language.</li><li>Check the draft; the original is shown below it.</li><li>Approve, edit, or ask the agent to rewrite.</li></ol><p>Questions? See <a href="#">Working with drafts</a>.</p></article>`),
    ex('Large (marketing)', `<article class="cn-prose" data-size="lg"><h2>Find real buyers, not lists</h2><p>Vera reads trade data the way an analyst does: who imported what, from where, how often. Then it writes to the people who can say yes — and waits for your approval before anything is sent.</p><hr><p>Start with one product and one country. Most teams see the first verified reply within two weeks.</p></article>`),
  ],
  rules: [
    'Prose is for rendered documents; UI text never goes inside it. If an element needs a class, it does not belong in Prose (except .cn-kicker above a heading).',
    'One h1 per document; start articles inside the app at h2 because the page already has the h1.',
    'Keep the measure: never widen beyond 65ch. Wide layouts put Prose in one column and media or a table of contents in the other.',
    'Links are ink-colored and underlined, never blue. External links get the external icon after the text.',
    'Code inline for identifiers and values; pre for anything with more than one line. Never pre for a single command inside a sentence.',
    'Tables inside Prose are simple (≤ 4 columns); anything sortable or wider is a Table component outside the Prose.',
    'Images and video inside Prose get radius lg and a caption in the figcaption, not in the paragraph below.',
    'Size follows the container: sm in drawers and popovers, md in app pages, lg only on marketing and long-read pages.',
  ],
  a11y: [
    'Use semantic elements (h2–h4 in order, ul/ol, blockquote, table with th) so the structure is navigable by headings and landmarks.',
    'The root is an <article> (self-contained) or a <section> with aria-labelledby when it is part of a page.',
    'Link text says where it goes ("Working with drafts"), never "click here"; underline is kept so color is not the only cue.',
    'Code blocks scroll horizontally and are focusable (tabindex="0") when they overflow, so keyboard users can reach the content.',
  ],
  related: ['kicker', 'link', 'card', 'media-frame'],
};
