import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Calendar panel: header (month + 32px ghost nav), a 7-column weekday row and a 7-column grid of
// 40px round day buttons (36px on sm), a footer with the date input and Cancel / Apply, and an
// optional presets column on the left. Panel width = 7 days + 2 × space.6 = 328px on md.

const DAY = { sm: '{space.9}', md: '{space.10}' } as const;
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type DayOpts = { selected?: boolean; range?: 'start' | 'middle' | 'end'; today?: boolean; outside?: boolean; disabled?: boolean };
const day = (n: number, o: DayOpts = {}) =>
  `<button type="button" class="cn-date-picker__day"${o.selected ? ' aria-selected="true"' : ''}${o.range ? ` data-range="${o.range}"` : ''}${o.today ? ' data-today aria-current="date"' : ''}${o.outside ? ' data-outside' : ''}${o.disabled ? ' disabled' : ''}>${n}</button>`;

/** September 2026 starts on a Tuesday and has 30 days; weeks start on Monday. Today is Sep 11. */
function september(sel: (n: number) => DayOpts): string {
  const cells = [day(31, { outside: true })];
  for (let n = 1; n <= 30; n++) cells.push(day(n, { ...sel(n), today: n === 11 }));
  for (let n = 1; n <= 4; n++) cells.push(day(n, { outside: true }));
  return cells.join('');
}
const single = (selected: number) => september((n) => ({ selected: n === selected }));
const range = (start: number, end: number) => september((n) => (n === start ? { selected: true, range: 'start' } : n === end ? { selected: true, range: 'end' } : n > start && n < end ? { range: 'middle' } : {}));

const prev = ICON.chevronRight.replace('cn-icon', 'cn-icon" style="transform:scaleX(-1)');
const nav = `<button type="button" class="cn-date-picker__nav" aria-label="Previous month">${prev}</button><div class="cn-date-picker__month" aria-live="polite">September 2026</div><button type="button" class="cn-date-picker__nav" aria-label="Next month">${ICON.chevronRight}</button>`;
const weekdays = `<div class="cn-date-picker__weekdays" aria-hidden="true">${WEEKDAYS.map((d) => `<span>${d}</span>`).join('')}</div>`;
const footer = (value: string, label: string) =>
  `<div class="cn-date-picker__footer"><div class="cn-input" data-variant="default" data-size="sm">${ICON.calendar.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="text" value="${value}" aria-label="${label}"></div><button type="button" class="cn-button" data-variant="outline" data-size="sm"><span class="cn-button__label">Cancel</span></button><button type="button" class="cn-button" data-variant="primary" data-size="sm"><span class="cn-button__label">Apply</span></button></div>`;
const calendar = (days: string, value: string, label: string) =>
  `<div class="cn-date-picker__calendar"><div class="cn-date-picker__header">${nav}</div>${weekdays}<div class="cn-date-picker__grid" role="group" aria-label="September 2026">${days}</div>${footer(value, label)}</div>`;
const PRESETS = ['Today', 'Yesterday', 'This week', 'Last week', 'This month', 'Last month'];
const presets = (current: string) => `<div class="cn-date-picker__presets">${PRESETS.map((p) => `<button type="button" class="cn-date-picker__preset"${p === current ? ' aria-current="true"' : ''}>${p}</button>`).join('')}</div>`;
const panel = (attrs: string, inner: string) => `<div class="cn-date-picker" ${attrs} role="dialog" aria-label="Choose a date">${inner}</div>`;

export const datePicker: ComponentSpec = {
  name: 'DatePicker',
  slug: 'date-picker',
  category: 'forms',
  description: 'A calendar panel: month header with ghost prev/next buttons, a weekday row, a 7-column grid of round day buttons, and a footer with the typed date and Cancel / Apply. Selected days fill with the action color, ranges tint the days between, today carries a dot. An optional presets column offers shortcuts.',
  usage: 'Pick one date or a start–end range: due dates, report periods, filters by period. The panel opens from a Button (calendar icon + the formatted date) or from an Input with a leading calendar icon. For a time or a date-time use an Input with the right type; for recurring rules use a form.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The floating panel (row): surface-raised, hairline, radius panel, shadow-lg. role="dialog" with an aria-label. Holds an optional presets column and the calendar column. Carries data-variant and data-size.' },
    { part: 'presets', element: 'div', description: 'Left column of shortcut buttons (Today, Yesterday, This week, Last week, This month, Last month), separated from the calendar by a hairline. Only in the with-presets variant.', optional: true },
    { part: 'preset', element: 'button', description: 'One shortcut row, 36px, body-sm, radius md; aria-current="true" on the active one.', optional: true },
    { part: 'calendar', element: 'div', description: 'The calendar column (flex column) wrapping header, weekdays, grid and footer. Width = 7 days + 2 × space.6 (328px on md, 300px on sm).' },
    { part: 'header', element: 'div', description: 'Row with the previous button, the month name and the next button.' },
    { part: 'month', element: 'div', description: 'The month and year ("September 2026"), label-md, aria-live="polite".' },
    { part: 'nav', element: 'button', description: '32px ghost icon button with a chevron; aria-label "Previous month" / "Next month".' },
    { part: 'weekdays', element: 'div', description: '7-column row of two-letter weekday names, label-sm muted, aria-hidden.' },
    { part: 'grid', element: 'div', description: '7-column grid of day buttons with a 4px row gap. role="group" named after the month (or a real role="grid" with rows when built with JS).' },
    { part: 'day', element: 'button', description: 'One day: 40×40 (36 on sm), body-sm, radius full. Attributes: aria-selected="true" (chosen), data-range="start|middle|end", data-today, data-outside (previous/next month), disabled.' },
    { part: 'footer', element: 'div', description: 'Top hairline; the typed date in a small Input with a calendar icon, then Cancel (outline) and Apply (primary), size sm.' },
  ],
  props: {
    variant: {
      values: ['single', 'range', 'with-presets'],
      default: 'single',
      description: 'single = one date, one Apply; range = a start and an end day with the days between tinted, the footer input shows "Sep 8 – Sep 14, 2026"; with-presets = a range picker with a left column of shortcuts (Today … Last month) for filters by period.',
    },
    size: { values: ['sm', 'md'], default: 'md', description: 'md = 40px days, 328px panel (default); sm = 36px days, 300px panel for popovers inside dense toolbars.' },
  },
  states: {
    dayHover: { selector: ' .cn-date-picker__day:hover:not(:disabled):not([aria-selected="true"])', description: 'On the __day: subtle fill under the pointer. Styled in extraCss because it lives on a child.', markup: 'native :hover on a day' },
    dayFocus: { selector: ' .cn-date-picker__day:focus-visible', description: 'On the __day: the focus ring (roving tabindex, arrow keys move it). Styled in extraCss.', markup: 'native :focus-visible on a day' },
    today: { selector: ' .cn-date-picker__day[data-today]', description: 'On the __day: semibold with a 4px action-colored dot under the number. Styled in extraCss.', markup: 'data-today and aria-current="date" on the day' },
    selected: { selector: ' .cn-date-picker__day[aria-selected="true"]', description: 'On the __day: action fill, on-action text, medium weight. The start and end of a range are also selected. Styled in extraCss.', markup: 'aria-selected="true" on the day' },
    range: { selector: ' .cn-date-picker__day[data-range]', description: 'On the __day: days inside a range take the subtle action tint and lose their radius; data-range="start" keeps the left radius, "end" the right one. Styled in extraCss.', markup: 'data-range="start|middle|end" on the day' },
    outside: { selector: ' .cn-date-picker__day[data-outside]', description: 'On the __day: days of the previous/next month in fg-subtle. Styled in extraCss.', markup: 'data-outside on the day' },
    dayDisabled: { selector: ' .cn-date-picker__day:disabled', description: 'On the __day: outside the allowed period, disabled ink, no hover. Styled in extraCss.', markup: 'disabled on the day' },
    presetCurrent: { selector: ' .cn-date-picker__preset[aria-current="true"]', description: 'On the __preset: the active shortcut, subtle fill and medium weight. Styled in extraCss.', markup: 'aria-current="true" on the preset' },
  },
  base: {
    root: {
      display: 'inline-flex',
      'flex-direction': 'row',
      'align-items': 'stretch',
      'max-width': '100%',
      'background-color': '{color.bg-surface-raised}',
      border: '{border.width.thin} solid {color.border-default}',
      'border-radius': '{radius.panel}',
      'box-shadow': '{shadow.lg}',
      color: '{color.fg-default}',
      overflow: 'hidden',
      'z-index': '{z.popover}',
    },
    presets: {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.0.5}',
      'flex-shrink': '0',
      'min-width': '{space.40}',
      padding: '{space.3}',
      'border-inline-end': '{border.width.thin} solid {color.border-default}',
    },
    preset: {
      ...RESET_BUTTON,
      display: 'flex',
      'align-items': 'center',
      height: '{space.9}',
      'padding-inline': '{space.3}',
      'border-radius': '{radius.md}',
      ...typeStyle('body-sm'),
      'line-height': '{font.lineHeight.none}',
      color: '{color.fg-muted}',
      'text-align': 'start',
      'white-space': 'nowrap',
      ...TRANSITION_COLORS,
    },
    calendar: { display: 'flex', 'flex-direction': 'column', 'min-width': '0', 'max-width': '100%', width: 'calc({space.10} * 7 + {space.6} * 2)' },
    header: { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '{space.2}', padding: '{space.5} {space.6} 0' },
    month: { ...typeStyle('label-md'), color: '{color.fg-default}' },
    nav: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.8}',
      height: '{space.8}',
      'border-radius': '{radius.md}',
      'font-size': '{size.icon.lg}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
    weekdays: { display: 'grid', 'grid-template-columns': 'repeat(7, minmax(0, 1fr))', 'margin-top': '{space.3}', 'padding-inline': '{space.6}', ...typeStyle('label-sm'), color: '{color.fg-muted}', 'text-align': 'center', 'line-height': '{space.10}' },
    grid: { display: 'grid', 'grid-template-columns': 'repeat(7, minmax(0, 1fr))', 'row-gap': '{space.1}', padding: '0 {space.6} {space.5}' },
    day: {
      ...RESET_BUTTON,
      position: 'relative',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '100%',
      height: '{space.10}',
      'border-radius': '{radius.full}',
      ...typeStyle('body-sm'),
      'line-height': '{font.lineHeight.none}',
      color: '{color.fg-default}',
      'font-variant-numeric': 'tabular-nums',
      ...TRANSITION_COLORS,
    },
    footer: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.3}', padding: '{space.4} {space.6}', 'border-top': '{border.width.thin} solid {color.border-default}' },
  },
  variants: {
    variant: {
      single: { root: {} },
      range: { root: {} },
      'with-presets': { root: {} },
    },
    size: {
      sm: {
        calendar: { width: `calc(${DAY.sm} * 7 + {space.6} * 2)` },
        weekdays: { 'line-height': DAY.sm },
        day: { height: DAY.sm },
        header: { padding: '{space.4} {space.6} 0' },
      },
      md: { day: { height: DAY.md } },
    },
  },
  extraCss: `
.cn-date-picker .cn-date-picker__day:hover:not(:disabled):not([aria-selected="true"]) { background-color: {color.bg-subtle}; }
.cn-date-picker .cn-date-picker__day:focus-visible { outline: none; box-shadow: {shadow.focus}; z-index: {z.raised}; }
.cn-date-picker .cn-date-picker__day[data-today] { font-weight: {font.weight.semibold}; }
.cn-date-picker .cn-date-picker__day[data-today]::after { content: ''; position: absolute; bottom: 4px; left: 50%; width: 4px; height: 4px; margin-left: -2px; border-radius: {radius.full}; background-color: {color.bg-action}; }
.cn-date-picker .cn-date-picker__day[data-range] { border-radius: 0; background-color: {color.bg-action-subtle}; font-weight: {font.weight.medium}; }
.cn-date-picker .cn-date-picker__day[data-range="start"] { border-radius: {radius.full} 0 0 {radius.full}; }
.cn-date-picker .cn-date-picker__day[data-range="end"] { border-radius: 0 {radius.full} {radius.full} 0; }
.cn-date-picker .cn-date-picker__day[aria-selected="true"] { background-color: {color.bg-action}; color: {color.fg-on-action}; font-weight: {font.weight.medium}; }
.cn-date-picker .cn-date-picker__day[aria-selected="true"]::after { background-color: {color.fg-on-action}; }
.cn-date-picker .cn-date-picker__day[data-outside] { color: {color.fg-subtle}; }
.cn-date-picker .cn-date-picker__day:disabled { color: {color.fg-disabled}; cursor: not-allowed; background-color: transparent; }
.cn-date-picker .cn-date-picker__nav:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-date-picker .cn-date-picker__nav:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-date-picker .cn-date-picker__preset:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-date-picker .cn-date-picker__preset[aria-current="true"] { background-color: {color.bg-subtle}; color: {color.fg-default}; font-weight: {font.weight.medium}; }
.cn-date-picker .cn-date-picker__preset:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-date-picker .cn-date-picker__footer > .cn-input { flex: 1 1 100%; min-width: 0; }
.cn-date-picker .cn-date-picker__footer > .cn-button { flex: 1 1 0; }
@media (max-width: {breakpoint.sm}) {
  .cn-date-picker { flex-direction: column; }
  .cn-date-picker .cn-date-picker__presets { flex-direction: row; flex-wrap: wrap; min-width: 0; max-width: calc({space.10} * 7 + {space.6} * 2); border-inline-end: 0; border-bottom: {border.width.thin} solid {color.border-default}; }
  .cn-date-picker .cn-date-picker__header, .cn-date-picker .cn-date-picker__weekdays, .cn-date-picker .cn-date-picker__grid, .cn-date-picker .cn-date-picker__footer { padding-inline: {space.4}; }
}`,
  examples: [
    ex('Single date', panel('data-variant="single" data-size="md"', calendar(single(18), 'Sep 18, 2026', 'Selected date')), 'September 2026: the 18th is selected, today (the 11th) carries the dot, Aug 31 and Oct 1–4 are outside days.'),
    ex('Range 8–14', panel('data-variant="range" data-size="md"', calendar(range(8, 14), 'Sep 8 – Sep 14, 2026', 'Selected range')), 'Start and end are filled; the days between take the subtle tint with no radius. Today falls inside the range and keeps its dot.'),
    ex('With presets', panel('data-variant="with-presets" data-size="md"', presets('Last week') + calendar(range(8, 14), 'Sep 8 – Sep 14, 2026', 'Selected range')), 'A shortcut column on the left; "Last week" is the active preset and drives the range.'),
    ex('Small', panel('data-variant="single" data-size="sm"', calendar(single(11), 'Sep 11, 2026', 'Selected date')), '36px days, 300px panel, for popovers inside dense toolbars.'),
    ex('Date input (trigger)', `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-3);align-items:center"><div class="cn-input" data-variant="default" data-size="md" style="max-width:220px">${ICON.calendar.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="text" value="Sep 11, 2026" aria-label="Due date" aria-haspopup="dialog"></div><button type="button" class="cn-button" data-variant="outline" data-size="md" aria-haspopup="dialog">${ICON.calendar.replace('cn-icon', 'cn-button__icon')}<span class="cn-button__label">Sep 8 – Sep 14, 2026</span></button></div>`, 'The panel opens from an Input with a leading calendar icon (forms) or from an outline Button (filters).'),
    ex('Disabled days', panel('data-variant="single" data-size="md"', calendar(september((n) => ({ selected: n === 15, disabled: n < 11 })), 'Sep 15, 2026', 'Delivery date')), 'Days before today are disabled: no hover, disabled ink, still visible so the month reads whole.'),
  ],
  rules: [
    'Weeks start on Monday and every month renders 6 rows at most, padded with outside days (data-outside) so the panel height does not jump between months.',
    'Today always carries the dot (data-today + aria-current="date"), even when selected or inside a range.',
    'A range is start + end with aria-selected="true" and data-range="start|end"; the days between get data-range="middle". The footer input shows the range as "Sep 8 – Sep 14, 2026".',
    'The footer is mandatory: the typed date in a small Input (with a leading calendar icon), Cancel (outline) and Apply (primary), size sm. Selection is committed by Apply, not by clicking a day.',
    'Presets are for filters by period, not for forms; the list is fixed (Today, Yesterday, This week, Last week, This month, Last month) and the active one has aria-current="true".',
    'Dates in the input and in triggers use the "Sep 11, 2026" format; never numeric-only dates that differ by locale.',
    'The panel is statically positioned by the component; the app anchors it under its trigger with an 8px offset (Popover rules) and closes it on Escape and outside click.',
    'Sizes: md by default; sm only inside dense toolbars. Do not scale the panel by other means.',
  ],
  a11y: [
    'The panel is role="dialog" with an aria-label; focus moves into it on open (to the selected day or today) and returns to the trigger on close.',
    'Days use a roving tabindex: one day is tabbable, Arrow keys move by day and week, Home/End jump to the row ends, PageUp/PageDown change the month.',
    'Each day button needs a full accessible name ("Tuesday, September 8, 2026") via aria-label; the visible number alone is ambiguous.',
    'The month name has aria-live="polite" so navigating months is announced; the nav buttons have aria-labels.',
    'Disabled days stay in the DOM with disabled; explain the constraint near the trigger ("Deliveries start tomorrow").',
  ],
  related: ['input', 'button', 'popover', 'field', 'input-group'],
};
