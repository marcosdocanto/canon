import type { Pattern } from '../types.ts';
import { SIDEBAR, BTN, TABS, AVATAR, BADGE, ICON, APP_CSS, CARD, CARD_HEAD, STAT } from './_app.ts';

const COVER = `<div class="cn-profile__cover"></div>`;
const HEAD = `<header class="cn-profile__head"><div class="cn-profile__identity">${AVATAR('MC', 'Maya Chen', '2xl', 'accent', 'online')}<div class="cn-stack" data-gap="1"><h1 class="cn-text-heading-lg cn-row" data-gap="2">Maya Chen ${BADGE('Admin', 'accent')}</h1><p class="cn-text-body-lg cn-app__muted">Product Manager · Florianópolis, Brazil · Joined March 2024</p></div></div><div class="cn-row" data-gap="3">${BTN('outline', 'Message', 'md', ICON.inbox)}${BTN('primary', 'Edit profile', 'md')}</div></header>`;

export const profilePage: Pattern = {
  name: 'Profile page',
  slug: 'profile-page',
  category: 'app-page',
  description: 'A person or entity page: cover band, avatar + identity + actions, tabs, then a two-column body (about card + activity) or a stats row. Also the public/compact variants.',
  rules: [
    'Cover band 160px in bg-action-subtle (or an image), avatar 96px (2xl) overlapping it by half, identity block right of the avatar, actions right-aligned; one primary (Edit profile / Follow).',
    'Tabs under the header: Overview, Activity, Projects, Settings.',
    'Body: 2:1 grid — main column (about card with description-list, projects table/list) and side column (stats, teams, contact).',
    'Never repeat the name in the page header; the identity block is the h1.',
  ],
  html: `<div class="cn-app">${SIDEBAR('Users')}<main class="cn-app__main cn-profile">${COVER}${HEAD}${TABS(['Overview', 'Activity', 'Projects', 'Settings'], 0)}<div class="cn-grid" data-cols="3" data-gap="6"><div class="cn-app__span2 cn-stack" data-gap="6">${CARD(CARD_HEAD('About'), `<dl class="cn-profile__dl"><div><dt>Email</dt><dd>maya@lumen.co</dd></div><div><dt>Role</dt><dd>Product Manager</dd></div><div><dt>Teams</dt><dd><div class="cn-row" data-gap="1">${BADGE('Product', 'info')}${BADGE('Design', 'accent')}${BADGE('Leadership')}</div></dd></div><div><dt>Time zone</dt><dd>GMT−3 · 14:22 local</dd></div><div><dt>Bio</dt><dd>I’m a product manager based in Florianópolis. I like building things that make people’s work easier.</dd></div></dl>`)}${CARD(CARD_HEAD('Recent projects', '', BTN('link-color', 'View all', 'sm')), `<ul class="cn-list" data-density="default" data-variant="plain">${[['Website redesign', 'Marketing · On track', 'success', 'On track'], ['Billing platform', 'Engineering · On track', 'success', 'On track'], ['Mobile app 2.0', 'Product · At risk', 'warning', 'At risk']].map(([t, d, tone, st]) => `<li class="cn-list__item"><span class="cn-list__content"><span class="cn-list__title">${t}</span><span class="cn-list__description">${d}</span></span><span class="cn-list__trailing">${BADGE(st, tone, 'soft', true)}</span></li>`).join('')}</ul>`)}</div><div class="cn-stack" data-gap="6"><div class="cn-grid" data-cols="1" data-gap="4">${STAT('Tasks completed', '128', '+12 this week', 'up', 'Last 30 days')}${STAT('Reviews', '24', '−3', 'down', 'Last 30 days')}</div>${CARD(CARD_HEAD('Works with'), `<div class="cn-stack" data-gap="3">${[['DC', 'Daniel Costa', 'Engineering', 'success'], ['SA', 'Sofia Almeida', 'Design', 'warning'], ['LF', 'Lucas Ferreira', 'Frontend', 'info']].map(([i, n, r, tone]) => `<div class="cn-row" data-gap="3">${AVATAR(i, n, 'sm', tone)}<div class="cn-stack" data-gap="0"><span class="cn-text-label-sm">${n}</span><span class="cn-text-body-sm cn-app__muted">${r}</span></div></div>`).join('')}</div>`)}</div></div></main></div>`,
  variants: [
    { title: 'Compact header with stats row', html: `<div class="cn-app">${SIDEBAR('Users', 'slim')}<main class="cn-app__main cn-profile">${HEAD.replace('2xl', 'xl').replace('cn-text-heading-lg', 'cn-text-heading-md')}<div class="cn-grid" data-cols="4" data-gap="6" data-keep>${STAT('Tasks completed', '128', '+12', 'up', 'This month')}${STAT('Open tasks', '9', '−2', 'down', 'This week')}${STAT('Reviews', '24', '+4', 'up', 'This month')}${STAT('Avg. response', '2h 10m', '−18%', 'down', 'Faster than last month')}</div>${TABS(['Overview', 'Activity', 'Projects'], 1, 'pill')}${CARD(CARD_HEAD('Activity', 'Last 7 days'), `<ul class="cn-list" data-density="compact" data-variant="plain">${[['Commented on Q3 roadmap review', '2 hours ago'], ['Closed 3 tasks in Billing platform', 'Yesterday'], ['Uploaded Brand assets v3', 'Yesterday'], ['Invited Elena Rossi to the workspace', 'Monday']].map(([t, d]) => `<li class="cn-list__item"><span class="cn-list__content"><span class="cn-list__title">${t}</span><span class="cn-list__description">${d}</span></span></li>`).join('')}</ul>`)}</main></div>` },
  ],
  css: `${APP_CSS}
.cn-profile { gap: {space.6}; }
.cn-profile__cover { height: 160px; border-radius: {radius.card}; background-color: {color.bg-action-subtle}; margin-bottom: -48px; }
.cn-profile__head { display: flex; justify-content: space-between; align-items: flex-end; gap: {space.4}; flex-wrap: wrap; padding-inline: {space.6}; }
.cn-profile__identity { display: flex; align-items: flex-end; gap: {space.5}; }
.cn-profile__identity .cn-avatar { box-shadow: 0 0 0 4px {color.bg-canvas}; }
.cn-profile__dl { display: grid; grid-template-columns: 160px 1fr; gap: {space.4} {space.6}; margin: 0; }
.cn-profile__dl > div { display: contents; }
.cn-profile__dl dt { font-size: {font.size.sm}; font-weight: {font.weight.medium}; color: {color.fg-muted}; }
.cn-profile__dl dd { font-size: {font.size.sm}; color: {color.fg-default}; margin: 0; }
.cn-app__span2 { grid-column: span 2; min-width: 0; }
@media (max-width: {breakpoint.md}) { .cn-app__span2 { grid-column: auto; } .cn-profile__dl { grid-template-columns: 1fr; } .cn-profile__head { padding-inline: 0; } }`,
  viewport: 'desktop',
};
