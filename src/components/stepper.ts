import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference progress steps: 24px (sm) or 32px (md) step icons — a number in a ringed circle,
// a gray-50 disc with a gray-300 dot that turns brand-600 with a white dot (current, 4px brand-100
// halo) or a white check (complete) — 8 / 10px minimal dots, or a 4px bar over the text; 2px
// connectors, 14px semibold titles (brand-700 when current) with 14px supporting text.

const TRANSITION_FAST = {
  'transition-property': 'background-color, border-color, color, box-shadow',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};

const CHECK = ICON.check.replace('cn-icon', 'cn-stepper__check');
type StepState = 'complete' | 'current' | 'error' | 'upcoming';
const step = (n: number, state: StepState, label: string, description = '', variant = 'number') => {
  const inner = variant === 'number' ? `${n}` : variant === 'icon' ? '<span class="cn-stepper__dot"></span>' : '';
  const indicator = state === 'complete' && variant !== 'line' && variant !== 'dot' ? `${CHECK}<span class="cn-sr-only">Completed:</span>` : state === 'error' && variant === 'number' ? `${n}<span class="cn-sr-only">, needs attention:</span>` : inner;
  const attrs = state === 'current' ? ' data-state="current" aria-current="step"' : state === 'upcoming' ? '' : ` data-state="${state}"`;
  return `<li class="cn-stepper__step"${attrs}><span class="cn-stepper__indicator" aria-hidden="${state === 'complete' || state === 'error' ? 'false' : 'true'}">${indicator}</span>${label ? `<span class="cn-stepper__content"><span class="cn-stepper__label">${label}</span>${description ? `<span class="cn-stepper__description">${description}</span>` : ''}</span>` : ''}<span class="cn-stepper__connector" aria-hidden="true"></span></li>`;
};
const build = (variant: string, orientation: string, size: string, label: string, steps: string) =>
  `<ol class="cn-stepper" data-variant="${variant}" data-orientation="${orientation}" data-size="${size}" aria-label="${label}">${steps}</ol>`;
const SETUP: [StepState, string, string][] = [['complete', 'Your details', 'Name and email'], ['current', 'Company details', 'Website and location'], ['upcoming', 'Invite your team', 'Start collaborating'], ['upcoming', 'Add your socials', 'Share posts to your accounts']];
const steps = (variant: string, withDesc = true, list = SETUP) => list.map(([s, l, d], i) => step(i + 1, s, l, withDesc ? d : '', variant)).join('');

export const stepper: ComponentSpec = {
  name: 'Stepper',
  slug: 'stepper',
  category: 'navigation',
  description: 'Progress through a sequence in the reference\'s four marker styles: numbered circles, step icons (disc with a dot, brand when current, check when complete), minimal dots, or a 4px bar over the text; 24 / 32px, joined by 2px connectors, horizontal or vertical, with a semibold title and supporting text per step.',
  usage: 'Use above a multi-step form or wizard (onboarding, import, checkout) with 3–6 steps that happen in order, or as a vertical rail beside a long form. Not for switching between peer views (Tabs), not for percentage progress (Progress) and not for a timeline of past events (Timeline).',
  anatomy: [
    { part: 'root', element: 'ol', description: 'Ordered list of steps with aria-label. Flex row (horizontal) or column (vertical), 16px gaps.' },
    { part: 'step', element: 'li', description: 'One step: indicator + content + connector. data-state="complete|current|error" (omit for upcoming); aria-current="step" on the current one.' },
    { part: 'indicator', element: 'span', description: 'The marker: a 24 / 32px circle (number or icon), an 8 / 10px dot, or a 4px bar. Upcoming: gray-50 with a gray-300 ring or dot; current: brand-600 with a 4px brand-100 halo; complete: brand-600 with a white check; error: red.' },
    { part: 'dot', element: 'span', description: 'The inner dot of the icon variant: 8 / 10px, gray-300 when upcoming, white when current.', optional: true },
    { part: 'check', element: 'svg', description: '12 / 16px white check mark inside a complete indicator (number and icon variants).', optional: true },
    { part: 'content', element: 'span', description: 'Column holding label and description, 2px apart, aligned to the indicator\'s center (under the bar in the line variant).' },
    { part: 'label', element: 'span', description: 'Step title, 14px semibold: 1–3 words ("Company details"). Gray-700 when upcoming or complete, brand-700 when current.' },
    { part: 'description', element: 'span', description: 'Optional 14px supporting text under the title, fg-muted: "Website and location". Carries the message in the error state.', optional: true },
    { part: 'connector', element: 'span', description: '2px gray-200 line from this step to the next; fills the gap horizontally or runs down the indicator\'s axis vertically. Hidden on the last step and in the line variant; brand-600 after a complete step.' },
  ],
  props: {
    variant: {
      values: ['number', 'icon', 'dot', 'line'],
      default: 'number',
      description: 'number = the step number in a ringed circle (forms with many steps). icon = the reference step icon: a gray-50 disc with a gray-300 dot that turns brand with a white dot when current and a check when complete (onboarding, wizards). dot = minimal 8 / 10px dots joined by connectors, labels optional (compact progress under a dialog title). line = a 4px bar above each step\'s text, no connectors (the reference "text with line").',
    },
    orientation: {
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
      description: 'horizontal = a row across the top of a wizard, steps share the width and connectors fill the gaps; up to 5 steps. vertical = a column in a side rail or next to a long form (the reference 400px column); the connector runs down from each indicator, so descriptions can be longer.',
    },
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 32px circles (10px dots, 16px check), 14px titles; the default above a page-level form. sm = 24px circles (8px dots, 12px check), 14px titles; inside dialogs, drawers and cards.',
    },
  },
  states: {
    complete: { selector: ' .cn-stepper__step[data-state="complete"]', description: 'Done (on the STEP, not the root): indicator filled brand-600 with a white check (bar or dot turns brand); the connector after it turns brand-600; title stays gray-700.', markup: 'data-state="complete" on the li; put the check svg (and sr-only "Completed:") inside the indicator instead of the number' },
    current: { selector: ' .cn-stepper__step[data-state="current"], & .cn-stepper__step[aria-current="step"]', description: 'The step the user is on: brand-600 indicator with a white dot (number variant: 2px brand ring and brand number) and a 4px brand-100 halo; title in brand-700. Exactly one.', markup: 'data-state="current" and aria-current="step" on the li' },
    error: { selector: ' .cn-stepper__step[data-state="error"]', description: 'A visited step that failed validation: red-500 ring on a red-50 disc, red title; the description says what to fix.', markup: 'data-state="error" on the li, with the problem in the description' },
    upcoming: { selector: ' .cn-stepper__step:not([data-state])', description: 'Not reached yet: gray-50 disc with a gray-300 ring or dot, gray-700 title. The default; no attribute needed.', markup: 'no data-state' },
  },
  base: {
    root: {
      display: 'flex',
      'align-items': 'flex-start',
      gap: '{space.4}',
      width: '100%',
      margin: '0',
      padding: '0',
      'list-style': 'none',
    },
    step: {
      position: 'relative',
      display: 'flex',
      'align-items': 'flex-start',
      gap: '{space.3}',
      flex: '1 1 0',
      'min-width': '0',
    },
    indicator: {
      position: 'relative',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.8}',
      height: '{space.8}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-subtle}',
      'box-shadow': 'inset 0 0 0 1px {color.border-default}',
      color: '{color.fg-muted}',
      ...typeStyle('label-sm'),
      'font-variant-numeric': 'tabular-nums',
      ...TRANSITION_FAST,
    },
    dot: { display: 'block', width: '{space.2.5}', height: '{space.2.5}', 'border-radius': '{radius.full}', 'background-color': '{color.border-control}', transition: 'inherit' },
    check: { width: '{size.icon.sm}', height: '{size.icon.sm}', display: 'block', 'stroke-width': '2.5' },
    content: {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.0.5}',
      'min-width': '0',
      'padding-top': '{space.1.5}',
    },
    label: {
      ...typeStyle('label-md'),
      color: '{color.fg-muted}',
      'white-space': 'nowrap',
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
      transition: 'inherit',
    },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}' },
    connector: {
      flex: '1 1 auto',
      height: '{border.width.medium}',
      'min-width': '{space.4}',
      'margin-top': 'calc({space.8} / 2 - {border.width.thin})',
      'border-radius': '{radius.full}',
      'background-color': '{color.border-default}',
    },
  },
  variants: {
    variant: {
      number: { root: {} },
      icon: { root: {} },
      dot: {
        indicator: { width: '{space.2.5}', height: '{space.2.5}', 'background-color': '{color.border-default}', 'box-shadow': 'none', 'margin-top': 'calc({space.2.5} / 2)' },
        content: { 'padding-top': '0' },
        connector: { 'margin-top': 'calc({space.2.5} - {border.width.thin})' },
      },
      line: {
        step: { 'flex-direction': 'column', gap: '{space.3}' },
        indicator: { width: '100%', height: '{space.1}', 'border-radius': '{radius.full}', 'background-color': '{color.bg-muted}', 'box-shadow': 'none' },
        content: { 'padding-top': '0' },
        connector: { display: 'none' },
      },
    },
    orientation: {
      horizontal: { root: { 'flex-direction': 'row' } },
      vertical: {
        root: { 'flex-direction': 'column', gap: '0', width: 'auto', 'max-width': '{size.container.xs}' },
        step: { flex: '0 0 auto', 'padding-bottom': '{space.6}' },
        connector: {
          position: 'absolute',
          'inset-inline-start': 'calc({space.8} / 2 - {border.width.thin})',
          top: 'calc({space.8} + {space.1})',
          bottom: '{space.1}',
          width: '{border.width.medium}',
          height: 'auto',
          flex: 'none',
          'min-width': '0',
          'margin-top': '0',
        },
        label: { 'white-space': 'normal' },
      },
    },
    size: {
      sm: {
        indicator: { width: '{space.6}', height: '{space.6}', 'font-size': '{font.size.xs}' },
        dot: { width: '{space.2}', height: '{space.2}' },
        check: { width: '{size.icon.xs}', height: '{size.icon.xs}' },
        content: { 'padding-top': '{space.0.5}' },
        connector: { 'margin-top': 'calc({space.6} / 2 - {border.width.thin})' },
      },
      md: { root: {} },
    },
  },
  compound: [
    { when: { orientation: 'vertical', size: 'sm' }, block: { connector: { 'inset-inline-start': 'calc({space.6} / 2 - {border.width.thin})', top: 'calc({space.6} + {space.1})', 'margin-top': '0' }, step: { 'padding-bottom': '{space.5}' } } },
    { when: { variant: 'dot', size: 'sm' }, block: { indicator: { width: '{space.2}', height: '{space.2}', 'margin-top': '{space.1.5}' }, connector: { 'margin-top': 'calc({space.2.5} - {border.width.thin})' } } },
    { when: { variant: 'dot', orientation: 'vertical' }, block: { connector: { 'inset-inline-start': 'calc({space.2.5} / 2 - {border.width.thin})', top: 'calc({space.2.5} * 2 + {space.1})', 'margin-top': '0' } } },
    { when: { variant: 'line', orientation: 'vertical' }, block: { step: { 'flex-direction': 'row', 'padding-bottom': '0', 'margin-bottom': '{space.4}' }, indicator: { width: '{space.1}', height: 'auto', 'align-self': 'stretch', 'min-height': '{space.10}' } } },
  ],
  extraCss: `
.cn-stepper__step:last-child .cn-stepper__connector { display: none; }
.cn-stepper[data-orientation="horizontal"] .cn-stepper__step:last-child { flex: 0 0 auto; }
.cn-stepper[data-orientation="horizontal"][data-variant="line"] .cn-stepper__step:last-child { flex: 1 1 0; }
.cn-stepper[data-orientation="vertical"] .cn-stepper__step:last-child { padding-bottom: 0; margin-bottom: 0; }
.cn-stepper[data-variant="number"] .cn-stepper__indicator { background-color: {color.bg-surface}; box-shadow: inset 0 0 0 1px {color.border-control}; }
.cn-stepper__step[data-state="complete"] .cn-stepper__indicator { background-color: {color.bg-action}; box-shadow: none; color: {color.fg-on-action}; }
.cn-stepper__step[data-state="complete"] .cn-stepper__dot { display: none; }
.cn-stepper__step[data-state="complete"] .cn-stepper__connector { background-color: {color.bg-action}; }
.cn-stepper__step[data-state="current"] .cn-stepper__indicator, .cn-stepper__step[aria-current="step"] .cn-stepper__indicator { background-color: {color.bg-action}; box-shadow: 0 0 0 4px {color.bg-action-subtle}; color: {color.fg-on-action}; }
.cn-stepper[data-variant="number"] .cn-stepper__step[data-state="current"] .cn-stepper__indicator, .cn-stepper[data-variant="number"] .cn-stepper__step[aria-current="step"] .cn-stepper__indicator { background-color: {color.bg-surface}; box-shadow: inset 0 0 0 2px {color.bg-action}, 0 0 0 4px {color.bg-action-subtle}; color: {color.fg-action}; }
.cn-stepper__step[data-state="current"] .cn-stepper__dot, .cn-stepper__step[aria-current="step"] .cn-stepper__dot { background-color: {color.fg-on-action}; }
.cn-stepper__step[data-state="current"] .cn-stepper__label, .cn-stepper__step[aria-current="step"] .cn-stepper__label { color: {color.fg-action}; }
.cn-stepper[data-variant="line"] .cn-stepper__step[data-state="current"] .cn-stepper__indicator, .cn-stepper[data-variant="line"] .cn-stepper__step[data-state="complete"] .cn-stepper__indicator, .cn-stepper[data-variant="dot"] .cn-stepper__step[data-state="complete"] .cn-stepper__indicator { box-shadow: none; }
.cn-stepper[data-variant="dot"] .cn-stepper__step[data-state="current"] .cn-stepper__indicator { box-shadow: 0 0 0 4px {color.bg-action-subtle}; }
.cn-stepper__step[data-state="error"] .cn-stepper__indicator { background-color: {color.bg-danger-subtle}; box-shadow: inset 0 0 0 1px {red.500}; color: {color.fg-danger}; }
.cn-stepper__step[data-state="error"] .cn-stepper__dot { background-color: {red.500}; }
.cn-stepper__step[data-state="error"] .cn-stepper__label, .cn-stepper__step[data-state="error"] .cn-stepper__description { color: {color.fg-danger}; }
@media (max-width: {breakpoint.md}) {
  .cn-stepper[data-orientation="horizontal"]:has(.cn-stepper__content) { flex-direction: column; gap: {space.5}; }
  .cn-stepper[data-orientation="horizontal"]:has(.cn-stepper__content) .cn-stepper__step { flex: 0 0 auto; width: 100%; }
  .cn-stepper[data-orientation="horizontal"]:has(.cn-stepper__content) .cn-stepper__content { flex: 1; }
  .cn-stepper[data-orientation="horizontal"]:has(.cn-stepper__content) .cn-stepper__label { white-space: normal; overflow-wrap: anywhere; }
  .cn-stepper[data-orientation="horizontal"]:has(.cn-stepper__content) .cn-stepper__connector { display: none; }
}`,
  examples: [
    ex('Icon with text (default md)', build('icon', 'horizontal', 'md', 'Account setup', steps('icon')), 'The reference step icon: gray-50 disc with a gray-300 dot; current is brand-600 with a white dot and a 4px halo, complete is brand with a white check. 2px connectors turn brand after a complete step.'),
    ex('Icon with number', build('number', 'horizontal', 'md', 'Account setup', steps('number')), 'Numbers in ringed 32px circles; the current one has a 2px brand ring, the complete one is filled with a check.'),
    ex('Minimal dots and connected dots', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-8);width:100%">${build('dot', 'horizontal', 'md', 'Onboarding', steps('dot', false))}<div style="max-width:480px">${build('dot', 'horizontal', 'sm', 'Onboarding', steps('dot', false, [['complete', '', ''], ['complete', '', ''], ['current', '', ''], ['upcoming', '', ''], ['upcoming', '', '']]))}</div></div>`, '10px (md) or 8px (sm) dots; labels are optional. Complete dots are brand, the current one has the halo.'),
    ex('Text with line', build('line', 'horizontal', 'md', 'Account setup', steps('line')), 'A 4px bar over each step: gray-100 upcoming, brand-600 current and complete; no connectors, steps share the width.'),
    ex('Vertical with an error', build('icon', 'vertical', 'md', 'CSV import', step(1, 'complete', 'Upload file', 'customers-q3.csv · 1,204 rows', 'icon') + step(2, 'error', 'Map columns', '2 columns are unmapped: “Phone”, “Owner”', 'icon') + step(3, 'upcoming', 'Validate', 'Check duplicates and formats', 'icon') + step(4, 'upcoming', 'Import', 'Add 1,204 customers to Lumen', 'icon')), 'The vertical rail (max 480px): the connector runs down from each 32px indicator; the error step turns red and says what to fix.'),
    ex('Small, vertical line', build('line', 'vertical', 'sm', 'Send campaign', steps('line', true, [['complete', 'Details', 'Name and audience'], ['complete', 'Recipients', '1,204 customers'], ['current', 'Schedule', 'Thursday, 09:00'], ['upcoming', 'Send', 'Review and confirm']])), 'In the vertical line variant the 4px bar runs beside each step.'),
    ex('Small numbers, labels only', build('number', 'horizontal', 'sm', 'Send campaign', step(1, 'complete', 'Details') + step(2, 'complete', 'Recipients') + step(3, 'current', 'Schedule') + step(4, 'upcoming', 'Send')), 'Inside a dialog or drawer: 24px indicators, no descriptions.'),
  ],
  rules: [
    '3–6 steps. Two steps are a single form with a confirm; more than six means the flow needs to be split or some steps merged.',
    'Titles are short and specific to the task. Labeled horizontal steps stack below 768px so titles and descriptions stay readable; unlabeled progress dots remain a row.',
    'Exactly one current step at all times; everything before it is complete (or error), everything after it upcoming.',
    'Complete steps may be clickable (wrap the label in a Link, or make the step a button) to go back; upcoming steps are never clickable.',
    'Descriptions are optional and short (≤ 5 words); in the error state the description is the message that says what to fix.',
    'Error only on a visited step and only with a message; never mark an upcoming step as error.',
    'icon or number for wizards above a form; dot for compact progress under a dialog title; line when the steps are also section titles of a long page.',
    'Horizontal for up to 5 steps above a wizard; vertical (max 480px wide) when there are 5–6 steps, when descriptions are needed, or in a side rail beside a long form.',
    'Indicators are 32px (sm 24) with 2px connectors; the check appears only on complete steps. No custom icons, letters or emoji in the circles.',
    'The stepper shows position, it does not save. Moving between steps is done by the form\'s Back / Continue buttons.',
  ],
  a11y: [
    'Root is an <ol aria-label="…"> so the order is announced ("step 2 of 4"); each step is an <li>.',
    'The current step carries aria-current="step" on the li in addition to data-state.',
    'Status is not color alone: complete indicators contain the check plus sr-only "Completed:", error indicators keep the number plus sr-only ", needs attention:".',
    'Connectors and decorative indicators are aria-hidden; the label text is the accessible name of the step. Dot steps without labels need an sr-only label each.',
    'If steps are clickable, they are links or buttons with the step name as text, and upcoming steps are not focusable.',
  ],
  related: ['tabs', 'progress', 'timeline', 'button', 'featured-icon'],
};
