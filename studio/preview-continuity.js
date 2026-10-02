const TRIGGERS = 'button[aria-haspopup="dialog"][aria-expanded], [role="button"][aria-haspopup="dialog"][aria-expanded]';
const identity = el => JSON.stringify([el.dataset.slot ?? '', el.getAttribute('aria-label') ?? '', el.textContent.trim()]);
const dialogFor = el => {
  const dialog = el.ownerDocument.getElementById(el.getAttribute('aria-controls'));
  return dialog?.matches('[role="dialog"], [role="alertdialog"]') ? dialog : null;
};

// Closed Radix triggers omit aria-controls until opened. Capture still requires a real
// controlled dialog in the old document; matching pending triggers uses stable semantics.
// Never replay submit/action buttons or arbitrary clicks.
export function captureOpenDialogs(doc) {
  const counts = new Map();
  return [...(doc?.querySelectorAll(TRIGGERS) ?? [])].flatMap(el => {
    const key = identity(el), occurrence = counts.get(key) ?? 0;
    counts.set(key, occurrence + 1);
    return el.getAttribute('aria-expanded') === 'true' && dialogFor(el) ? [{key, occurrence}] : [];
  });
}

export function samePreviewView(previous, next) {
  return previous?.kind === 'draft' && next?.kind === 'draft' && previous.page === next.page && previous.target === next.target;
}

export async function restoreOpenDialogs(doc, dialogs, isCurrent, nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))) {
  for (const saved of dialogs) {
    if (!isCurrent()) return false;
    const matches = [...doc.querySelectorAll(TRIGGERS)].filter(el => identity(el) === saved.key);
    const trigger = matches[saved.occurrence];
    if (!trigger || trigger.disabled || trigger.getAttribute('aria-disabled') === 'true') continue;
    if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
    // Real React/Radix state owns mounting and focus. Wait briefly before exposing the buffer;
    // failure leaves the working old preview visible instead of faking an open portal with CSS.
    let settled = false;
    for (let attempt = 0; attempt < 60 && isCurrent(); attempt++) {
      await nextFrame();
      if (trigger.getAttribute('aria-expanded') === 'true' && dialogFor(trigger)) { settled = true; break; }
    }
    if (!isCurrent()) return false;
    if (!settled) throw Error('The open dialog could not be restored. Close it and retry the style edit.');
  }
  if (dialogs.length) { await nextFrame(); await nextFrame(); }
  return isCurrent();
}
