// shadcn/ui render examples: one JSX snippet per variant-axis value, from a component's CvaSpec.
import type { ComponentInfo, RenderExample } from '../types.ts';

/** Data-only per-slug hints for building a readable example; nothing here executes. */
interface SlugTemplate { children?: string; extraProps?: Record<string, string>; }

const TEMPLATES: Record<string, SlugTemplate> = {
  button: { children: 'Delete' },
  badge: { children: 'Badge' },
  card: { children: 'Card content' },
  input: { extraProps: { placeholder: 'Email' } },
  alert: { children: 'Heads up! Something needs your attention.' },
  dialog: { children: 'Open' }, // trigger-only: a minimal default example, not the full compound dialog
};

function attrString(extraProps: Record<string, string> | undefined, axis?: { name: string; value: string }): string {
  const parts: string[] = [];
  if (axis) parts.push(`${axis.name}="${axis.value}"`);
  for (const [key, value] of Object.entries(extraProps ?? {})) parts.push(`${key}="${value}"`);
  return parts.length ? ` ${parts.join(' ')}` : '';
}

/** Build one `<Tag ...>children</Tag>` snippet, optionally varying a single prop off its default. */
function jsxFor(component: ComponentInfo, axis?: { name: string; value: string }): string {
  const template = TEMPLATES[component.slug] ?? {};
  const children = template.children ?? '…';
  return `<${component.exportName}${attrString(template.extraProps, axis)}>${children}</${component.exportName}>`;
}

/**
 * One `RenderExample` per value of each variant axis in `component.cva`, each combined with the
 * default of every other axis (by simply not mentioning the other axes — cva applies their
 * `defaultVariants` when a prop is omitted). A component without a `cva` spec gets a single
 * default example. JSX content comes from a small per-slug data table (children / extra props);
 * unknown slugs fall back to a generic `<Tag>…</Tag>`.
 */
export function renderSpec(component: ComponentInfo): RenderExample[] {
  if (!component.cva) return [{ title: component.exportName, jsx: jsxFor(component) }];

  const examples: RenderExample[] = [];
  for (const [axisName, options] of Object.entries(component.cva.variants)) {
    for (const value of Object.keys(options)) {
      examples.push({ title: `${axisName}: ${value}`, jsx: jsxFor(component, { name: axisName, value }) });
    }
  }
  return examples.length > 0 ? examples : [{ title: component.exportName, jsx: jsxFor(component) }];
}
