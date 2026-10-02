// Ephemeral browser overlay. It never changes component attributes, editor scope or draft data.
const slotName = name => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export function createHoverInspector(doc, inventory, onHint, isCanvasEnabled = () => true) {
  const win = doc.defaultView;
  const layer = doc.createElement('div');
  layer.dataset.canonInspectLayer = '';
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;';
  doc.documentElement.append(layer);
  let current = null;
  const names = new Map(inventory.flatMap(info => [...new Set([info.exportName, ...(info.parts ?? []).map(p => p.name)])].map(name => [slotName(name), name])));
  function clear() { current = null; layer.replaceChildren(); onHint(''); }
  function draw() {
    layer.replaceChildren();
    if (!current) return;
    let count = 0;
    for (const el of current.elements) {
      if (!el.isConnected) continue;
      const rect = el.getBoundingClientRect(), style = win.getComputedStyle(el);
      if ((el.checkVisibility && !el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) || !el.getClientRects().length || style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0' || rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.right <= 0 || rect.top >= win.innerHeight || rect.left >= win.innerWidth) continue;
      const box = doc.createElement('div');
      box.dataset.canonInspectBox = current.name;
      box.style.cssText = `position:absolute;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;box-sizing:border-box;border:1px solid #60a5fa;background:rgba(147,197,253,.16);pointer-events:none;`;
      const label = doc.createElement('span');
      label.dataset.canonInspectLabel = '';
      label.textContent = current.name;
      label.style.cssText = `position:absolute;left:${Math.max(0,rect.left)}px;top:${Math.max(0,rect.top-21)}px;max-width:calc(100% - 8px);padding:2px 5px;border:1px solid #93c5fd;border-radius:3px;background:#eff6ff;color:#1e40af;font:11px/15px ui-monospace,monospace;white-space:nowrap;pointer-events:none;`;
      layer.append(box,label); count++;
    }
    onHint(!count && current.source === 'scope' ? `${current.name} is not visible in this preview.` : '');
  }
  function show(elements, name, source) { current = {elements, name, source}; draw(); }
  function scope(info, value) {
    if (!info || !value) {clear(); return;}
    const part = value.startsWith('part:') ? value.slice(5) : undefined;
    const name = part ?? info.cvaOwner ?? info.exportName;
    let elements = [...doc.querySelectorAll('[data-slot], [data-part], [data-inspect]')].filter(el => {
      if (el.dataset.canonSources) {
        const owners = JSON.parse(el.dataset.canonSources);
        return owners.some(owner => owner.slug === info.slug && (part ? owner.part === part : owner.name === name));
      }
      return part ? (el.dataset.part === part && el.dataset.inspect === info.slug) || (!info.parts?.find(p=>p.name===part)?.span && !el.dataset.part && el.dataset.slot === slotName(part)) : el.dataset.inspect === info.slug && !el.dataset.part;
    });
    if (value.startsWith('variant:')) {
      const [,axis,...rest] = value.split(':'), selected = rest.join(':');
      elements = elements.filter(el => {
        let picks = {}; try { picks = JSON.parse(el.dataset.canonSourcePicks ?? '{}')[info.slug] ?? JSON.parse(el.dataset.picks ?? '{}'); } catch {}
        return String(el.getAttribute(`data-${axis}`) ?? picks[axis] ?? '') === selected;
      });
    }
    show(elements,name,'scope');
  }
  function move(event) {
    if (!isCanvasEnabled()) { if (current?.source === "canvas") clear(); return; }
    const el = event.target?.closest?.('[data-inspect], [data-part]');
    if (!el || layer.contains(el)) { if (current?.source === 'canvas') clear(); return; }
    const info = inventory.find(c => c.slug === el.dataset.inspect);
    const name = el.dataset.part ?? names.get(el.dataset.slot) ?? info?.cvaOwner ?? info?.exportName;
    if (name) show([el],name,'canvas');
    else if (current?.source === 'canvas') clear();
  }
  function leave(event) { if (!event.relatedTarget && current?.source === 'canvas') clear(); }
  doc.addEventListener('pointermove',move);
  doc.addEventListener('pointerout',leave);
  win.addEventListener('scroll',draw,true);
  win.addEventListener('resize',draw);
  return {scope,clear,dispose(){clear();doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerout',leave);win.removeEventListener('scroll',draw,true);win.removeEventListener('resize',draw);layer.remove();}};
}
