import type { ComponentSpec } from '../types.ts';
import { STATE, ex, ICON, typeStyle } from './_shared.ts';

// Links: the "link-color" style (brand-700 semibold, underline appears on
// hover in brand-500, icons brand-500) and the "link-gray" style (gray-600 → gray-700,
// underline gray-400 on hover), radius 4, 100ms linear.

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-link__icon');

export const link: ComponentSpec = {
  name: 'Link',
  slug: 'link',
  category: 'typography',
  description: 'An anchor in the brand link color, semibold, with an underline that appears on hover (the reference link-color style). Three voices: inline (inside running text), standalone ("View all →" at the end of a list, with a trailing icon) and muted (the gray link-gray style for footers, legal, meta).',
  usage: 'Use for navigation: to a page, a section, a document, an external site. Use Button (or Button variant="link"/"link-color") for actions that do not change the URL. Inline links only live inside sentences; anything that stands on its own line is standalone. Navigation lists (topbar, sidebar) are Tabs and SidebarNav, not rows of links.',
  anatomy: [
    { part: 'root', element: 'a', description: 'The anchor with a real href. Text names the destination ("Billing settings"), never "here" or "click".' },
    { part: 'icon', element: 'svg', description: 'Optional trailing 20px icon (16px on small text): arrow when it goes somewhere in the app, external when it opens a new tab. Brand-500 at rest, brand-600 on hover. Decorative (aria-hidden); the text carries the meaning.', optional: true },
  ],
  props: {
    variant: {
      values: ['inline', 'standalone', 'muted'],
      default: 'inline',
      description: 'inline = brand link color, semibold, inherits the surrounding size; underline appears on hover; use only inside running text (the reference link-color). standalone = the same as an inline-flex row with a trailing icon, 14px semibold; for "View all", "Open in…", "Learn more" that sit on their own line (the reference link-color button md). muted = gray text that darkens on hover with a gray underline; footers, legal links, timestamps that link (the reference link-gray).',
    },
  },
  states: {
    hover: STATE.hover(),
    focus: STATE.focus(),
    current: STATE.current(),
  },
  base: {
    root: {
      color: '{color.fg-link}',
      'font-weight': '{font.weight.semibold}',
      'text-decoration-line': 'underline',
      'text-decoration-thickness': '1px',
      'text-underline-offset': '3px',
      'text-decoration-color': 'transparent',
      cursor: 'pointer',
      'border-radius': '{radius.sm}',
      'box-decoration-break': 'clone',
      '-webkit-box-decoration-break': 'clone',
      'transition-property': 'color, text-decoration-color, box-shadow',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    icon: {
      width: '1.25em',
      height: '1.25em',
      'flex-shrink': '0',
      display: 'inline-block',
      'vertical-align': '-0.25em',
      'margin-inline-start': '{space.1}',
      color: '{brand.500}',
      'transition-property': 'color',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    '@states': {
      hover: { root: { color: '{color.fg-link-hover}', 'text-decoration-color': '{brand.500}' }, icon: { color: '{brand.600}' } },
      focus: { root: { outline: 'none', 'box-shadow': '{shadow.focus}' } },
      current: { root: { color: '{color.fg-default}', 'text-decoration-line': 'none', cursor: 'default' } },
    },
  },
  variants: {
    variant: {
      inline: { root: {} },
      standalone: {
        root: {
          display: 'inline-flex',
          'align-items': 'center',
          gap: '{space.1}',
          ...typeStyle('label-md'),
          'text-decoration-line': 'underline',
          'text-decoration-color': 'transparent',
        },
        icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'margin-inline-start': '0', 'vertical-align': 'baseline' },
      },
      muted: {
        root: { color: '{color.fg-muted}' },
        icon: { color: '{color.fg-subtle}' },
        '@states': {
          hover: { root: { color: '{color.fg-default}', 'text-decoration-color': '{color.fg-subtle}' }, icon: { color: '{color.fg-muted}' } },
        },
      },
    },
  },
  examples: [
    ex('Inline, in running text', `<p class="cn-text-body-md" style="max-width:52ch">Interview notes are shared with the project by default. <a href="#" class="cn-link" data-variant="inline">Read how sharing works</a> before you change it, or <a href="#" class="cn-link" data-variant="inline">keep this study private</a>.</p>`, 'Brand-700 semibold; the brand-500 underline appears on hover.'),
    ex('Standalone with arrow', `<a href="#" class="cn-link" data-variant="standalone">View all 24 studies${icon('arrow')}</a>`, '14px semibold with a 20px brand-500 trailing icon (the reference link-color button, size md).'),
    ex('External (new tab)', `<a href="https://docs.lumen.app" target="_blank" rel="noopener noreferrer" class="cn-link" data-variant="standalone">Open the docs<span class="cn-sr-only"> (opens in a new tab)</span>${icon('external')}</a>`, 'The external icon replaces the arrow; the sr-only text announces the new tab.'),
    ex('Muted footer row with current page', `<div class="cn-text-body-sm" style="display:flex;gap:var(--cn-space-4)"><a href="#" class="cn-link" data-variant="muted">Terms</a><a href="#" class="cn-link" data-variant="muted">Privacy</a><a href="#" class="cn-link" data-variant="muted" aria-current="page">Status</a><a href="#" class="cn-link" data-variant="muted">Contact</a></div>`, 'the reference link-gray: gray-600, gray-700 with a gray-400 underline on hover. aria-current="page" drops the underline and darkens the text.'),
  ],
  rules: [
    'Links are semibold in the brand link color; the underline is a hover affordance, so keep link text short and distinct from the sentence around it.',
    'Inline links live only inside sentences and inherit the surrounding size; anything on its own line is standalone: "View all →", "Open the docs ↗", "Learn more →". One standalone link per card or list region, placed last.',
    'Link text names the destination: "Billing settings", "the Q3 report". Never "here", "click here", "this page", "Learn more" without a subject.',
    'A link changes the URL. If it opens a dialog, submits, toggles or deletes, it is a Button (variant link or link-color).',
    'External links get target="_blank", rel="noopener noreferrer", the external icon and an sr-only "(opens in a new tab)".',
    'Trailing icon only: arrow (in-app), external (new tab), or none. Never a leading icon and never two icons.',
    'Do not underline navigation lists (Tabs, SidebarNav, Breadcrumb have their own styles). Muted is for footers, legal and meta text.',
  ],
  a11y: [
    'Always an <a> with a real href, so it works with middle-click, Enter, and the context menu; never a span with onClick.',
    'Focus ring is the 4px box-shadow ring on :focus-visible (cloned across line breaks); never outline: none without replacement.',
    'aria-current="page" on the link that points to the current page (footer, pagination-like lists).',
    'New-tab links announce it via sr-only text; the icon is aria-hidden.',
    'Links with the same text must go to the same place within a view; disambiguate with the subject ("Edit study", "Edit interview").',
  ],
  related: ['button', 'breadcrumb', 'tabs', 'prose'],
};
