for (const button of document.querySelectorAll('[data-copy]')) {
  const originalContent = button.innerHTML;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = 'Copied';
      setTimeout(() => { button.innerHTML = originalContent; }, 1800);
    } catch { button.textContent = 'Select command to copy'; }
  });
}
function updateNavigation() {
  for (const link of document.querySelectorAll('.docs-nav a')) {
    if (link.hash === (location.hash || '#start')) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
addEventListener('hashchange', updateNavigation);
updateNavigation();

// Sample components are movable only inside the hero, then return home.
for (const piece of document.querySelectorAll('[data-float]')) {
  let drag = null;
  const home = () => {
    piece.classList.remove('dragging');
    piece.style.setProperty('--drag-x', '0px');
    piece.style.setProperty('--drag-y', '0px');
  };
  piece.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const bounds = piece.closest('.harness-hero').getBoundingClientRect();
    const rect = piece.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
      minX: bounds.left - rect.left + 8, maxX: bounds.right - rect.right - 8,
      minY: bounds.top - rect.top + 8, maxY: bounds.bottom - rect.bottom - 8 };
    // Inputs and switches retain click/focus until an actual drag starts.
  });
  piece.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) { drag.moved = true; piece.setPointerCapture(event.pointerId); piece.classList.add('dragging'); }
    event.preventDefault();
    piece.style.setProperty('--drag-x', `${Math.max(drag.minX, Math.min(drag.maxX, dx))}px`);
    piece.style.setProperty('--drag-y', `${Math.max(drag.minY, Math.min(drag.maxY, dy))}px`);
  });
  const release = event => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = drag.moved;
    drag = null;
    if (piece.hasPointerCapture(event.pointerId)) piece.releasePointerCapture(event.pointerId);
    home();
    if (moved) {
      piece.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); }, { once: true, capture: true });
    }
  };
  piece.addEventListener('pointerup', release);
  piece.addEventListener('pointercancel', release);
  piece.addEventListener('lostpointercapture', () => { drag = null; home(); });
  piece.addEventListener('keydown', event => {
    if (event.target !== piece) return;
    const offsets = { ArrowLeft: [-35,0], ArrowRight: [35,0], ArrowUp: [0,-25], ArrowDown: [0,25] };
    if (!offsets[event.key]) return;
    event.preventDefault();
    piece.style.setProperty('--drag-x', `${offsets[event.key][0]}px`);
    piece.style.setProperty('--drag-y', `${offsets[event.key][1]}px`);
  });
  piece.addEventListener('keyup', event => { if (event.target === piece) home(); });
  piece.addEventListener('blur', home);
}

for (const tab of document.querySelectorAll('.floating-tabs button')) {
  tab.addEventListener('click', () => {
    for (const sibling of tab.parentElement.querySelectorAll('button')) sibling.setAttribute('aria-pressed', String(sibling === tab));
  });
}
