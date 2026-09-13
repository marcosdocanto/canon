import type { Pattern } from '../types.ts';

export const formLayout: Pattern = {
      name: 'Form layout',
    slug: 'form-layout',
    category: 'app-section',
    description: 'Vertical form: one column, labels above fields, 16px between fields, sections separated by a divider with a heading, actions at the end aligned right.',
    rules: [
      'One column. Two columns only for short related pairs (city/state, first/last name) using .cn-form__row.',
      'Field order: label → control → helper or error. Helper and error never show at the same time.',
      'Required is the default; mark optional fields with "(optional)" in the label instead of asterisks.',
      'Gap between fields 16px (space.4); between sections 32px (space.8) with a section title (heading-sm) and optional description.',
      'Actions: right-aligned, ghost "Cancel" then primary. In a dialog they live in the dialog footer; in a page they are sticky at the bottom only when the form is long.',
      'Max width of a form column: 640px (size.container.sm).',
    ],
    html: `<form class="cn-form" style="max-width:520px"><section class="cn-form__section"><h3 class="cn-form__title">Empresa</h3><p class="cn-form__description">Como a Vera deve se apresentar.</p><div class="cn-field"><label class="cn-field__label" for="f1">Nome da empresa</label><div class="cn-input" data-variant="default" data-size="md"><input id="f1" class="cn-input__field" type="text" placeholder="Vero Finance"></div><p class="cn-field__helper">Como aparece na Receita Federal.</p></div><div class="cn-form__row"><div class="cn-field"><label class="cn-field__label" for="f2">Cidade</label><div class="cn-input" data-variant="default" data-size="md"><input id="f2" class="cn-input__field" type="text"></div></div><div class="cn-field"><label class="cn-field__label" for="f3">UF</label><div class="cn-input" data-variant="default" data-size="md"><input id="f3" class="cn-input__field" type="text" maxlength="2"></div></div></div></section><div class="cn-form__actions"><button type="button" class="cn-button" data-variant="ghost" data-size="md"><span class="cn-button__label">Cancelar</span></button><button type="submit" class="cn-button" data-variant="primary" data-size="md"><span class="cn-button__label">Salvar</span></button></div></form>`,
    css: `
.cn-form { display: flex; flex-direction: column; gap: {space.8}; }
.cn-form__section { display: flex; flex-direction: column; gap: {space.4}; }
.cn-form__section + .cn-form__section { padding-top: {space.8}; border-top: {border.width.thin} solid {color.border-default}; }
.cn-form__title { font-family: {type.heading-sm.family}; font-size: {type.heading-sm.size}; font-weight: {type.heading-sm.weight}; line-height: {type.heading-sm.lineHeight}; letter-spacing: {type.heading-sm.letterSpacing}; }
.cn-form__description { font-size: {font.size.sm}; color: {color.fg-muted}; margin-top: calc({space.2} * -1); }
.cn-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: {space.4}; }
.cn-form__actions { display: flex; justify-content: flex-end; gap: {space.2}; padding-top: {space.2}; }
@media (max-width: {breakpoint.sm}) { .cn-form__row { grid-template-columns: 1fr; } }`,
};
