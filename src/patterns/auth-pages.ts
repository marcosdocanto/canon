import type { Pattern } from '../types.ts';
import { BTN, FIELD, INPUT, CHECKBOX, ICON, IMG } from './_app.ts';

const LOGO = `<span class="cn-auth__logo" aria-hidden="true"></span>`;
const GOOGLE = `<button type="button" class="cn-button" data-variant="outline" data-size="lg" style="width:100%"><svg class="cn-button__icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span class="cn-button__label">Sign in with Google</span></button>`;
const LOGIN_FORM = `<form class="cn-stack" data-gap="5">${FIELD('l-email', 'Email', INPUT('l-email', '', 'email', 'Enter your email'))}${FIELD('l-pass', 'Password', INPUT('l-pass', '', 'password', '••••••••'))}<div class="cn-row" data-justify="between">${CHECKBOX('Remember for 30 days')}<a href="#" class="cn-link" data-variant="standalone">Forgot password</a></div><div class="cn-stack" data-gap="3">${BTN('primary', 'Sign in', 'lg').replace('class="cn-button"', 'class="cn-button" style="width:100%"')}${GOOGLE}</div></form><p class="cn-text-body-sm cn-auth__muted cn-center">Don’t have an account? <a href="#" class="cn-link" data-variant="standalone">Sign up</a></p>`;
const SIGNUP_FORM = `<form class="cn-stack" data-gap="5">${FIELD('s-name', 'Name', INPUT('s-name', '', 'text', 'Enter your name'))}${FIELD('s-email', 'Email', INPUT('s-email', '', 'email', 'Enter your email'))}${FIELD('s-pass', 'Password', INPUT('s-pass', '', 'password', 'Create a password'), 'Must be at least 8 characters.')}<div class="cn-stack" data-gap="3">${BTN('primary', 'Get started', 'lg').replace('class="cn-button"', 'class="cn-button" style="width:100%"')}${GOOGLE.replace('Sign in with Google', 'Sign up with Google')}</div></form><p class="cn-text-body-sm cn-auth__muted cn-center">Already have an account? <a href="#" class="cn-link" data-variant="standalone">Log in</a></p>`;
const head = (title: string, text: string) => `<div class="cn-stack cn-center" data-gap="3" data-align="center">${LOGO}<h1 class="cn-text-heading-lg">${title}</h1><p class="cn-text-body-lg cn-auth__muted">${text}</p></div>`;
const FOOT = `<footer class="cn-auth__foot"><span class="cn-text-body-sm cn-auth__muted">© Lumen 2026</span><span class="cn-text-body-sm cn-auth__muted">help@lumen.co</span></footer>`;

export const authPages: Pattern = {
  name: 'Auth and error pages',
  slug: 'auth-pages',
  category: 'shared-page',
  description: 'Log in, sign up, forgot password, verification code and 404 — centered single-column cards (360px) or split with an image. Shared across every product.',
  rules: [
    'One column, 360px wide, centered vertically and horizontally; logo, heading-lg title, body-lg supporting text, then the form.',
    'Form: fields 20px apart, full-width lg primary button, optional social button below it, then the switch link ("Don’t have an account?").',
    'Split variant: form on the left inside a 1:1 split, image bleeding to the right edge, footer with copyright and support email.',
    'Verification: 4 (or 6) 64px code inputs, 8px apart, with a resend link.',
    '404: a brand-colored "404 error" kicker, display-lg title, body-xl text, two buttons (outline "Go back", primary "Take me home").',
  ],
  html: `<div class="cn-auth"><div class="cn-auth__card">${head('Log in to your account', 'Welcome back! Please enter your details.')}${LOGIN_FORM}</div></div>`,
  variants: [
    { title: 'Sign up', html: `<div class="cn-auth"><div class="cn-auth__card">${head('Create an account', 'Start your 30-day free trial.')}${SIGNUP_FORM}</div></div>` },
    { title: 'Log in, split with image', html: `<div class="cn-auth cn-auth--split"><div class="cn-auth__side"><div class="cn-auth__card">${head('Welcome back', 'Please enter your details.').replace('cn-center', '').replace('data-align="center"', 'data-align="start"')}${LOGIN_FORM}</div>${FOOT}</div>${IMG('1 / 1', 'data-radius="none"')}</div>` },
    { title: 'Forgot password', html: `<div class="cn-auth"><div class="cn-auth__card">${head('Forgot password?', 'No worries, we’ll send you reset instructions.')}<form class="cn-stack" data-gap="5">${FIELD('f-email', 'Email', INPUT('f-email', '', 'email', 'Enter your email'))}${BTN('primary', 'Reset password', 'lg').replace('class="cn-button"', 'class="cn-button" style="width:100%"')}</form><a href="#" class="cn-link cn-auth__back" data-variant="standalone">${ICON.arrow.replace('cn-icon', 'cn-link__icon cn-auth__back-icon')}Back to log in</a></div></div>` },
    { title: 'Check your email (verification code)', html: `<div class="cn-auth"><div class="cn-auth__card">${head('Check your email', 'We sent a verification code to maya@lumen.co')}<form class="cn-stack" data-gap="6"><div class="cn-auth__code" role="group" aria-label="Verification code">${[0, 1, 2, 3].map((i) => `<input class="cn-auth__digit" type="text" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}"${i < 2 ? ` value="${[7, 2][i]}"` : ''}>`).join('')}</div>${BTN('primary', 'Verify email', 'lg').replace('class="cn-button"', 'class="cn-button" style="width:100%"')}</form><p class="cn-text-body-sm cn-auth__muted cn-center">Didn’t receive the email? <a href="#" class="cn-link" data-variant="standalone">Click to resend</a></p><a href="#" class="cn-link cn-auth__back" data-variant="standalone">${ICON.arrow.replace('cn-icon', 'cn-link__icon cn-auth__back-icon')}Back to log in</a></div></div>` },
    { title: '404', html: `<div class="cn-auth"><div class="cn-auth__card cn-auth__card--wide"><div class="cn-stack cn-center" data-gap="6" data-align="center"><div class="cn-kicker" data-tone="accent" data-size="md" data-mark="none"><span class="cn-kicker__mark"></span>404 error</div><h1 class="cn-text-display-lg">We can’t find that page</h1><p class="cn-text-body-xl cn-auth__muted">Sorry, the page you are looking for doesn’t exist or has been moved.</p><div class="cn-row" data-gap="3">${BTN('outline', 'Go back', 'xl')}${BTN('primary', 'Take me home', 'xl')}</div></div></div></div>` },
  ],
  css: `
.cn-auth { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: {space.12} {space.4}; background-color: {color.bg-surface}; }
.cn-auth__card { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: {space.8}; }
.cn-auth__card--wide { max-width: 640px; }
.cn-auth__logo { display: inline-block; width: 48px; height: 48px; border-radius: {radius.xl}; background-color: {color.bg-action}; margin-bottom: {space.3}; }
.cn-auth__muted { color: {color.fg-muted}; }
.cn-auth__back { align-self: center; display: inline-flex; align-items: center; gap: {space.1.5}; }
.cn-auth__back-icon { transform: rotate(180deg); margin: 0; }
.cn-auth__code { display: flex; gap: {space.2}; justify-content: center; }
.cn-auth__digit { width: 64px; height: 64px; text-align: center; font-family: {font.family.sans}; font-size: {font.size.5xl}; font-weight: {font.weight.medium}; color: {color.fg-action}; border: {border.width.thin} solid {color.border-control}; border-radius: {radius.lg}; background-color: {color.bg-surface}; box-shadow: {shadow.xs}; }
.cn-auth__digit:focus { outline: none; border-color: {color.border-action}; box-shadow: {shadow.focus}; }
.cn-auth--split { display: grid; grid-template-columns: 1fr 1fr; padding: 0; min-height: 720px; }
.cn-auth__side { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: {space.12} {space.8}; position: relative; }
.cn-auth__foot { position: absolute; bottom: {space.8}; left: {space.8}; right: {space.8}; display: flex; flex-wrap: wrap; gap: {space.2} {space.6}; justify-content: space-between; }
@media (max-width: {breakpoint.md}) { .cn-auth--split { grid-template-columns: 1fr; } .cn-auth--split > .cn-placeholder { display: none; } .cn-auth__foot { position: static; margin-top: {space.8}; } }`,
  viewport: 'both',
};
