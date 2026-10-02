// Report only an explicit important radius class absent from the shared style being edited.
// No inference from computed pixels, and no attempt to modify the instance's source.
export function radiusOverrideHint(instanceClasses, sharedClasses) {
  const shared = new Set((sharedClasses ?? '').split(/\s+/));
  const token = (instanceClasses ?? '').split(/\s+/).find(value =>
    (value.startsWith('!') || value.endsWith('!')) &&
    /^rounded(?:-[^:!]+)?$/.test(value.replace(/^!|!$/g,'')) && !shared.has(value));
  return token ? `This instance overrides Radius with ${token}. Editing the shared style will not change this override.` : '';
}
