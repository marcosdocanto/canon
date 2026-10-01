// A save acknowledges its submitted snapshot, never edits made while it was in flight.
export function reconcileSavedDraft(submitted, current, saved) {
  const unchanged = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const mergeMap = (before, now, after) => Object.fromEntries(Object.entries(now).map(([key, value]) => [key, unchanged(value, before[key]) ? (after[key] ?? value) : value]));
  return {
    theme: unchanged(submitted.theme, current.theme) ? saved.theme : current.theme,
    components: mergeMap(submitted.components, current.components, saved.components),
    parts: mergeMap(submitted.parts, current.parts, saved.parts),
  };
}
export function createPreviewVersion() {
  let version = 0;
  return { next: () => ++version, isCurrent: (candidate) => candidate === version };
}
