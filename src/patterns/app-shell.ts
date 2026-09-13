import type { Pattern } from '../types.ts';

export const appShell: Pattern = {

    name: 'App shell',
    slug: 'app-shell',
    category: 'app-layout',
    description: 'Top navigation bar with 4–5 tabs phrased as user questions, a page header (kicker + title + one primary action), and a content area with a max width. No left sidebar by default.',
    rules: [
      'Structure: <header class="cn-topbar"> → <main class="cn-page"> → <div class="cn-page__header"> + <div class="cn-page__body">.',
      'Page header: kicker (mono uppercase) above the h1 (heading-xl). Actions on the right: at most one primary button plus ghost/outline buttons.',
      'Content max width 1152px (size.container.xl), 24px side padding, 32px between page header and body.',
      'Sections inside the body are separated by 32px (space.8); groups inside a section by 16px (space.4); rows inside a group by 8px (space.2).',
      'Detail views open in a Drawer over the current list; do not navigate to a separate page for one item.',
    ],
    html: `<div class="cn-shell"><header class="cn-topbar"><div class="cn-topbar__inner"><a href="#" class="cn-topbar__brand">Vera</a><nav class="cn-tabs" data-variant="underline" data-size="md" aria-label="Main"><a class="cn-tabs__tab" href="#" aria-current="page">O que precisa de mim?</a><a class="cn-tabs__tab" href="#">A equipe está trabalhando?</a><a class="cn-tabs__tab" href="#">Onde cada pessoa está?</a><a class="cn-tabs__tab" href="#">Configurações</a></nav><div class="cn-topbar__actions"><span class="cn-avatar" data-size="sm" data-shape="circle"><span class="cn-avatar__fallback">MD</span></span></div></div></header><main class="cn-page"><div class="cn-page__header"><div><div class="cn-kicker" data-mark="square"><span class="cn-kicker__mark"></span>Hoje</div><h1 class="cn-page__title">O que precisa de mim?</h1><p class="cn-page__description">3 aprovações e 2 respostas aguardando.</p></div><div class="cn-page__actions"><button type="button" class="cn-button" data-variant="outline" data-size="md"><span class="cn-button__label">Exportar</span></button><button type="button" class="cn-button" data-variant="primary" data-size="md"><span class="cn-button__label">Nova busca</span></button></div></div><div class="cn-page__body"><section class="cn-card" data-variant="default" data-padding="md"><div class="cn-card__body cn-text-body-md">Content</div></section></div></main></div>`,
    css: `
.cn-shell { min-height: 100vh; background-color: {color.bg-canvas}; }
.cn-page { width: 100%; max-width: {size.container.xl}; margin-inline: auto; padding: {space.8} {space.6} {space.16}; }
.cn-page__header { display: flex; align-items: flex-end; justify-content: space-between; gap: {space.6}; margin-bottom: {space.8}; }
.cn-page__title { font-family: {type.heading-xl.family}; font-size: {type.heading-xl.size}; font-weight: {type.heading-xl.weight}; line-height: {type.heading-xl.lineHeight}; letter-spacing: {type.heading-xl.letterSpacing}; margin-top: {space.2}; }
.cn-page__description { font-size: {font.size.md}; color: {color.fg-muted}; margin-top: {space.2}; }
.cn-page__actions { display: flex; align-items: center; gap: {space.2}; flex-shrink: 0; }
.cn-page__body { display: flex; flex-direction: column; gap: {space.8}; }
.cn-section { display: flex; flex-direction: column; gap: {space.4}; }
.cn-section__header { display: flex; align-items: baseline; justify-content: space-between; gap: {space.4}; }
@media (max-width: {breakpoint.md}) { .cn-page { padding-inline: {space.4}; } .cn-page__header { flex-direction: column; align-items: stretch; } }`,
};
