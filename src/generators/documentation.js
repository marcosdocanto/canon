(() => {
  'use strict';
  const articles = [...document.querySelectorAll('.doc-article')];
  const navigation = document.querySelector('#doc-nav');
  const announcer = document.querySelector('#doc-announcer');
  let current = null;

  async function copyText(value, button) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(field);
      field.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* Offer manual selection below. */ }
      field.remove();
      button.focus({ preventScroll: true });
      return copied;
    }
  }

  const starterButton = document.querySelector('#doc-start-copy');
  const starterPrompt = document.querySelector('#doc-connect-prompt');
  const starterStatus = document.querySelector('#doc-start-status');
  const connectionUrl = new URL('./CONNECT.md', location.href).href;
  starterPrompt.textContent = starterPrompt.textContent.replace('__CANON_CONNECTION_URL__', connectionUrl);
  starterButton.addEventListener('click', async () => {
    if (await copyText(starterPrompt.textContent, starterButton)) {
      starterStatus.textContent = 'Prompt copiado. Cole na conversa do projeto com seu agente de código.';
    } else {
      const range = document.createRange();
      range.selectNodeContents(starterPrompt);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      starterStatus.textContent = 'Selecionei o prompt acima. Use o atalho de copiar e cole no seu agente.';
    }
  });

  function navigate() {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* Unknown fragments open the connection page. */ }
    const target = document.getElementById(id);
    const next = target?.closest('.doc-article') || articles[0];
    const previous = current;
    current = next;
    for (const article of articles) article.hidden = article !== next;
    for (const link of navigation.querySelectorAll('a')) {
      if (link.hash === '#' + next.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    document.title = next.querySelector('h1').textContent + ' · Canon Docs';
    requestAnimationFrame(() => {
      if (current !== next) return;
      if (target && next.contains(target) && target !== next) {
        const details = target.closest('details');
        if (details) details.open = true;
        target.scrollIntoView({ block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      if (previous && previous !== next) {
        const heading = next.querySelector('h1');
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        announcer.textContent = next.dataset.label;
      }
    });
  }

  navigation.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (link && location.hash === link.hash) {
      event.preventDefault();
      navigate();
    }
  });
  const themeButton = document.querySelector('#doc-theme');
  function themeAction() {
    const action = document.documentElement.dataset.theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
    themeButton.setAttribute('aria-label', action); themeButton.title = action;
  }
  themeAction();
  themeButton.addEventListener('click', () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    themeAction();
  });
  window.addEventListener('hashchange', navigate);
  navigate();
})();
