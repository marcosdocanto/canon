import type { System, ComponentSpec, ResolvedToken } from '../types.ts';

type Idx = Map<string, ResolvedToken>;

const pascal = (s: string) => s.replace(/(^|[-_])(\w)/g, (_m, _p, c) => c.toUpperCase());
const camel = (s: string) => { const p = pascal(s); return p[0].toLowerCase() + p.slice(1); };
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const DISABLED_ELEMENTS = new Set(['button', 'fieldset', 'input', 'optgroup', 'option', 'select', 'textarea']);

interface StateAxis {
  name: string;
  attr: string;
  values: string[];
  flags: { name: string; value: string }[];
  aria?: string;
}

/** Selectors sharing a root data attribute describe values of one state axis. */
function stateProps(spec: ComponentSpec): StateAxis[] {
  const axes = new Map<string, StateAxis>();
  for (const [name, st] of Object.entries(spec.states)) {
    const m = st.selector.match(/^\[data-([a-z-]+)(?:=["']([^"']+)["'])?\]/);
    if (!m || spec.props[m[1]]) continue; // Explicit variant props already generate this attribute.
    const axis: StateAxis = axes.get(m[1]) ?? { name: camel(m[1]), attr: `data-${m[1]}`, values: [], flags: [] };
    if (m[2] && !axis.values.includes(m[2])) axis.values.push(m[2]);
    if (!m[2] && name === 'loading') axis.aria = 'aria-busy';
    axes.set(m[1], axis);
  }
  const used = new Set([...Object.keys(spec.props), ...[...axes.values()].map((s) => s.name)]);
  for (const axis of axes.values()) {
    if (axis.attr !== 'data-state') continue;
    if (axis.values.includes('open') && !axis.values.includes('closed')) axis.values.push('closed');
    // Keep the existing boolean conveniences; the explicit axis prop takes precedence.
    for (const value of axis.values) {
      const name = camel(value);
      if (used.has(name)) continue;
      axis.flags.push({ name, value });
      used.add(name);
    }
  }
  return [...axes.values()];
}

function stateValue(axis: StateAxis): string {
  if (!axis.values.length) return `${axis.name} ? '' : undefined`;
  if (!axis.flags.length) return axis.name;
  const fallback = axis.attr === 'data-state' && axis.values.includes('open') ? "'closed'" : 'undefined';
  return `${axis.name} ?? (${axis.flags.map((s) => `${s.name} ? ${JSON.stringify(s.value)} : `).join('')}${fallback})`;
}

export function componentTsx(spec: ComponentSpec, prefix: string): string {
  const Name = pascal(spec.slug);
  const rootEl = spec.anatomy.find((a) => a.part === 'root')?.element ?? 'div';
  const el = /^[a-z][a-z0-9]*$/.test(rootEl) ? rootEl : 'div';
  const props = Object.entries(spec.props);
  const sprops = stateProps(spec);
  const isVoid = VOID_ELEMENTS.has(el);
  const stateNames = sprops.flatMap((s) => [s.name, ...s.flags.map((f) => f.name)]);
  const omitted = [...props.map(([k]) => k), ...stateNames, ...(isVoid ? ['children', 'dangerouslySetInnerHTML'] : [])];
  const intrinsicProps = `React.ComponentPropsWithoutRef<'${el}'>`;
  const baseProps = omitted.length ? `Omit<${intrinsicProps}, ${omitted.map((name) => JSON.stringify(name)).join(' | ')}>` : intrinsicProps;
  const typeLines = [
    ...props.map(([k, p]) => `export type ${Name}${pascal(k)} = ${p.values.map((v) => JSON.stringify(v)).join(' | ')};`),
    ...sprops.filter((s) => s.values.length).map((s) => `export type ${Name}${pascal(s.name)} = ${s.values.map((v) => JSON.stringify(v)).join(' | ')};`),
  ].join('\n');
  const propDecls = [
    ...props.map(([k, p]) => `  /** ${p.description.replace(/\*\//g, '* /')} */\n  ${k}?: ${Name}${pascal(k)};`),
    ...sprops.flatMap((s) => [
      `  ${s.name}?: ${s.values.length ? `${Name}${pascal(s.name)}` : 'boolean'};`,
      ...s.flags.map((f) => `  ${f.name}?: boolean;`),
    ]),
    ...(isVoid ? ['  children?: never;', '  dangerouslySetInnerHTML?: never;'] : []),
  ].join('\n');
  const destructure = [
    ...props.map(([k, p]) => `${k} = ${JSON.stringify(p.default)}`),
    ...stateNames,
    'className', ...(isVoid ? [] : ['children']), '...rest',
  ].join(', ');
  const openAxis = sprops.find((s) => s.attr === 'data-state' && s.values.includes('open'));
  const disabledAxis = sprops.find((s) => s.name === 'disabled' && !s.values.length);
  const attrs = [
    ...props.map(([k]) => `data-${k}={${k}}`),
    ...sprops.map((s) => `${s.attr}={${stateValue(s)}}${s.aria ? ` ${s.aria}={${s.name} || undefined}` : ''}`),
    ...(disabledAxis && DISABLED_ELEMENTS.has(el) ? ['disabled={disabled}'] : []),
    ...(openAxis && ['details', 'dialog'].includes(el) ? [`open={(${stateValue(openAxis)}) === 'open'}`] : []),
  ].join(' ');
  const parts = spec.anatomy.filter((a) => a.part !== 'root').map((a) => {
    const pel = /^[a-z][a-z0-9]*$/.test(a.element) ? a.element : 'div';
    const PName = `${Name}${pascal(a.part)}`;
    const partProps = VOID_ELEMENTS.has(pel)
      ? `Omit<React.ComponentPropsWithoutRef<'${pel}'>, 'children' | 'dangerouslySetInnerHTML'> & { children?: never; dangerouslySetInnerHTML?: never }`
      : `React.ComponentPropsWithoutRef<'${pel}'>`;
    return `/** ${a.description.replace(/\*\//g, '* /')} */\nexport const ${PName} = React.forwardRef<React.ComponentRef<'${pel}'>, ${partProps}>(function ${PName}({ className, ...props }, ref) {\n  return <${pel} ref={ref}${pel === 'svg' ? ' aria-hidden="true"' : ''} className={cx('${prefix}-${spec.slug}__${a.part}', className)} {...props} />;\n});`;
  }).join('\n\n');
  const example = spec.examples[0]?.html.replace(/\bcn-/g, `${prefix}-`) ?? '';
  return `// ${spec.name} — generated by canon from design/components/${spec.slug}.json. Do not edit; the CSS is the truth.
// ${spec.description}
import * as React from 'react';
import { cx } from './cx';

${typeLines}

export interface ${Name}Props extends ${baseProps} {
${propDecls}
}

/**
 * ${spec.usage.replace(/\*\//g, '* /')}
 *
 * HTML equivalent:
 * ${example.replace(/\n/g, '\n * ')}
 */
export const ${Name} = React.forwardRef<React.ComponentRef<'${el}'>, ${Name}Props>(function ${Name}({ ${destructure} }, ref) {
  return (
    <${el} ref={ref} className={cx('${prefix}-${spec.slug}', className)} ${attrs} {...rest}${isVoid ? ' />' : `>
      {children}
    </${el}>`}
  );
});

${parts}
`;
}

export function generate(system: System, _idx: Idx, write: (rel: string, content: string) => void) {
  const p = system.meta.prefix;
  write('react/cx.ts', `export function cx(...parts: (string | false | null | undefined)[]): string {\n  return parts.filter(Boolean).join(' ');\n}\n`);
  const exports: string[] = [];
  const symbols = new Map<string, { slug: string; kind: 'root' | 'part' | 'type' }[]>();
  for (const c of system.components) {
    write(`react/${c.slug}.tsx`, componentTsx(c, p));
    exports.push(`export * from './${c.slug}';`);
    const Name = pascal(c.slug);
    const add = (name: string, kind: 'root' | 'part' | 'type') => {
      symbols.set(name, [...(symbols.get(name) ?? []), { slug: c.slug, kind }]);
    };
    add(Name, 'root');
    add(`${Name}Props`, 'type');
    for (const prop of Object.keys(c.props)) add(`${Name}${pascal(prop)}`, 'type');
    for (const axis of stateProps(c)) if (axis.values.length) add(`${Name}${pascal(axis.name)}`, 'type');
    for (const a of c.anatomy) if (a.part !== 'root') add(`${Name}${pascal(a.part)}`, 'part');
  }
  const used = new Set(symbols.keys());
  const aliases: string[] = [];
  for (const [name, owners] of symbols) {
    if (owners.length < 2) continue;
    const primary = owners.find((o) => o.kind === 'root') ?? owners[0];
    // An explicit export resolves export-star ambiguity without changing direct module imports.
    exports.push(`export { ${primary.kind === 'type' ? 'type ' : ''}${name} } from './${primary.slug}';`);
    for (const owner of owners) {
      if (owner === primary) continue;
      const base = `${name}${owner.kind === 'part' ? 'Part' : owner.kind === 'type' ? 'Type' : 'Component'}`;
      let alias = base;
      for (let n = 2; used.has(alias); n++) alias = `${base}${n}`;
      used.add(alias);
      exports.push(`export { ${owner.kind === 'type' ? 'type ' : ''}${name} as ${alias} } from './${owner.slug}';`);
      aliases.push(`\`${alias}\` is \`${name}\` from \`./${owner.slug}\``);
    }
  }
  write('react/index.ts', `// ${system.meta.name} React bindings — thin wrappers over the generated CSS classes.\n// Import '${p}.css' once in your app root. Props map 1:1 to data-* attributes.\n${exports.join('\n')}\n`);
  write('react/README.md', `# ${system.meta.name} — React\n\nEvery component is a thin wrapper: \`<Button variant="primary" size="md">\` renders \`<button class="${p}-button" data-variant="primary" data-size="md">\`. The CSS in \`${p}.css\` is the single source of truth; these files only make the data attributes type-safe.\n\nParts are exported as \`<ButtonIcon>\`, \`<ButtonLabel>\` … (one per anatomy part). Component roots keep their names in the catalog index. Colliding parts get a \`Part\` suffix; direct module imports keep their original names.${aliases.length ? `\n\n${aliases.join('; ')}.` : ''}\n\nBoolean state props (\`loading\`, \`open\`, \`invalid\`, \`selected\` …) set the matching \`data-*\` attribute. Select one value with \`state="open"\` or a boolean convenience such as \`open\`. An explicit \`state\` takes precedence; otherwise the first true flag in the spec wins. Open/closed axes default to closed; other inactive axes omit the attribute. Native states (hover, focus, disabled, checked) are native.\n\nCopy this folder into your app (e.g. \`src/ui/\`) or import from \`design/dist/react\`.\n`);
}
