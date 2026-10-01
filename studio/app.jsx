import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select.tsx";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover.tsx";
import { Slider } from "./ui/slider.tsx";
import { Label } from "./ui/label.tsx";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./ui/collapsible.tsx";
import { ChevronDown, Search, Palette, Undo2 } from "lucide-react";
import {
  parseClassList,
  composeClassList,
  SCALES,
} from "../src/lib-editor/classmap.js";
import { reconcileSavedDraft } from "../src/lib-editor/draft-state.js";
const clone = (v) => JSON.parse(JSON.stringify(v));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const editableParts = (c) =>
  Object.fromEntries(
    (c.parts ?? [])
      .filter((p) => p.classes !== undefined && !p.readOnlyReason)
      .map((p) => [p.name, p.classes]),
  );
const draftFrom = (s) => ({
  theme: clone(s.theme),
  components: Object.fromEntries(
    s.components.filter((c) => c.cva).map((c) => [c.slug, clone(c.cva)]),
  ),
  parts: Object.fromEntries(
    s.components.map((c) => [c.slug, editableParts(c)]),
  ),
});
const color = (v) => typeof v === "string" && CSS.supports("color", v);
function toHex(value) {
  if (!color(value)) return null;
  const context = document.createElement("canvas").getContext("2d");
  context.fillStyle = value;
  return /^#[\da-f]{6}$/i.test(context.fillStyle) ? context.fillStyle : null;
}
const length = (v) => /^(-?[\d.]+)(rem|px|em)$/.exec(v ?? "");
function Choice({ label, value, onChange, options, id, className = "" }) {
  return (
    <Select
      value={value || "__default"}
      onValueChange={(v) => onChange(v === "__default" ? "" : v)}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className={className}
        data-value={value}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((o) => (
          <SelectItem
            key={o.value || "__default"}
            value={o.value || "__default"}
            disabled={o.disabled}
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Disclosure({ title, children }) {
  return (
    <Collapsible className="le-advanced">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="le-advanced-trigger">
          {title}
          <ChevronDown size={12} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="le-advanced-content">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
function Range({ label, value, min = 0, max, step = 1, onChange }) {
  return (
    <Slider
      aria-label={label}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(v[0])}
    />
  );
}
function ThemeWell({ name, mode, value, fallback, onChange }) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState(value ?? "");
  const commit = (v) => {
    onChange(v);
    setText(v);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setText(value ?? "");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="le-well"
          data-var-key={mode}
          aria-label={`${name} ${mode}`}
          title={
            value
              ? `${mode}: ${value}`
              : `${mode}: same as light (${fallback ?? ""})`
          }
          style={{ background: value || fallback }}
        />
      </PopoverTrigger>
      <PopoverContent
        className="le-popover"
        align="end"
        aria-label={`${name} ${mode} color`}
      >
        <Label>
          {name} · {mode}
        </Label>
        <div className="le-popover__row">
          <Input
            data-var-key={mode}
            aria-label={`${name} ${mode} value`}
            value={text}
            placeholder={mode === "dark" ? "same as light" : ""}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit(text);
                setOpen(false);
              }
            }}
          />
          {toHex(value || fallback) && (
            <Input
              className="le-color"
              aria-label={`${name} ${mode} picker`}
              type="color"
              value={toHex(value || fallback)}
              onChange={(e) => commit(e.target.value)}
            />
          )}
        </div>
        <div className="le-popover__actions">
          <Button
            onClick={() => {
              commit(text);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
function ThemePanel({ theme, onChange }) {
  const entries = Object.entries(theme.vars),
    colors = entries.filter(([, v]) => color(v.light) || color(v.dark)),
    others = entries.filter((e) => !colors.includes(e));
  const row = ([name, v]) => (
    <div className="le-var-row" data-var={name} key={name}>
      <code className="le-var-name" title={name}>
        {name}
      </code>
      {colors.some((e) => e[0] === name) ? (
        <div className="le-var-wells">
          {["light", "dark"].map((mode) => (
            <ThemeWell
              key={mode}
              name={name}
              mode={mode}
              value={v[mode]}
              fallback={v.light}
              onChange={(text) => onChange(name, mode, text)}
            />
          ))}
        </div>
      ) : (
        <div className="le-var-text-pair">
          {["light", "dark"].map((mode) => {
            const len = length(v[mode] ?? v.light);
            return (
              <div className="le-var-text" key={mode}>
                <Input
                  aria-label={`${name} ${mode}`}
                  data-var-key={mode}
                  value={v[mode] ?? ""}
                  placeholder={mode === "dark" ? "same as light" : ""}
                  onChange={(e) => onChange(name, mode, e.target.value)}
                />
                {len && (
                  <Range
                    label={`${name} ${mode} slider`}
                    value={Number(len[1])}
                    max={len[2] === "px" ? 48 : 3}
                    step={len[2] === "px" ? 1 : 0.025}
                    onChange={(n) => onChange(name, mode, `${n}${len[2]}`)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  return (
    <div className="le-stack">
      <p className="le-theme-file">{theme.file}</p>
      <section>
        <h3 className="le-group-title">Colors</h3>
        <div className="le-theme-labels">
          <span>Light</span>
          <span>Dark</span>
        </div>
        {colors.filter(([n]) => !/^(chart-|sidebar)/.test(n)).map(row)}
      </section>
      {colors.some(([n]) => /^(chart-|sidebar)/.test(n)) && (
        <Disclosure title="Chart & sidebar colors">
          {colors.filter(([n]) => /^(chart-|sidebar)/.test(n)).map(row)}
        </Disclosure>
      )}
      {others.length > 0 && (
        <section>
          <h3 className="le-group-title">Other</h3>
          {others.map(row)}
        </section>
      )}
      {!entries.length && (
        <p className="le-hint">This theme has no CSS variables.</p>
      )}
    </div>
  );
}
const LABELS = {
  background: "Background",
  textColor: "Text color",
  borderColor: "Border color",
  ringColor: "Ring color",
  fontSize: "Font size",
  fontWeight: "Weight",
  radius: "Radius",
  spacing: "Spacing",
  size: "Size",
  borderWidth: "Border",
  shadow: "Shadow",
  opacity: "Opacity",
};
const propLabel = (p) =>
  `${LABELS[p.family] ?? p.family}${p.axis || p.side ? ` · ${p.axis || p.side}` : ""}`;
const ADDABLE = [
  ["Background", { family: "background", kind: "theme", value: "primary" }],
  ["Text color", { family: "textColor", kind: "theme", value: "foreground" }],
  ["Border color", { family: "borderColor", kind: "theme", value: "border" }],
  ["Radius", { family: "radius", side: "", value: "md" }],
  ["Padding x", { family: "spacing", axis: "px", value: "4" }],
  ["Padding y", { family: "spacing", axis: "py", value: "2" }],
  ["Gap", { family: "spacing", axis: "gap", value: "2" }],
  ["Font size", { family: "fontSize", value: "sm" }],
  ["Weight", { family: "fontWeight", value: "medium" }],
  ["Border", { family: "borderWidth", side: "", value: "" }],
  ["Shadow", { family: "shadow", value: "sm" }],
];
function ColorProperty({ prop, colors, onChange }) {
  const [open, setOpen] = useState(false),
    [custom, setCustom] = useState("");
  const current =
    prop.kind === "theme"
      ? colors.find((c) => c.name === prop.value)?.light
      : prop.value;
  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setCustom(prop.kind === "raw" ? prop.value : "");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="le-prop-color-trigger"
          aria-label={`${propLabel(prop)} color`}
        >
          <span
            className="le-well le-well--sm"
            style={{ background: current }}
          />
          <span className="le-prop-color-name">
            {prop.value || "custom"}
            {prop.opacity ? `/${prop.opacity}` : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="le-popover"
        align="end"
        aria-label={`${propLabel(prop)} color`}
      >
        <Label>Theme colors</Label>
        <div className="le-popover-swatchgrid">
          {colors.map((c) => (
            <Button
              variant="ghost"
              className="le-popover-swatch"
              key={c.name}
              title={c.name}
              onClick={() => {
                onChange({ ...prop, kind: "theme", value: c.name });
                setOpen(false);
              }}
            >
              <span
                className="le-well le-well--sm"
                style={{ background: c.light }}
              />
              {c.name}
            </Button>
          ))}
        </div>
        <div className="le-popover__row">
          <Label htmlFor="custom-color">Custom</Label>
          <Input
            id="custom-color"
            placeholder="#hex / oklch(…)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && custom.trim())
                onChange({ ...prop, kind: "raw", value: custom.trim() });
            }}
          />
        </div>
        <div className="le-popover__row">
          <Label htmlFor="color-opacity">Opacity</Label>
          <Input
            id="color-opacity"
            aria-label="Opacity %"
            type="number"
            min={0}
            max={100}
            step={5}
            placeholder="100"
            value={prop.opacity ?? ""}
            onChange={(e) =>
              onChange({ ...prop, opacity: e.target.value || undefined })
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
function PropertyControl({ prop, colors, onChange }) {
  const update = (value) => onChange({ ...prop, value });
  if (
    ["background", "textColor", "borderColor", "ringColor"].includes(
      prop.family,
    )
  )
    return <ColorProperty prop={prop} colors={colors} onChange={onChange} />;
  if (prop.family === "radius" || prop.family === "opacity") {
    const scale = SCALES.RADIUS_SCALE;
    return (
      <div className="le-prop-scale">
        <Range
          label={propLabel(prop)}
          value={
            prop.family === "radius"
              ? Math.max(0, scale.indexOf(prop.value))
              : Number(prop.value)
          }
          max={prop.family === "radius" ? scale.length - 1 : 100}
          step={prop.family === "radius" ? 1 : 5}
          onChange={(v) =>
            update(prop.family === "radius" ? scale[v] : String(v))
          }
        />
        <code className="le-range__val">{prop.value || "default"}</code>
      </div>
    );
  }
  const scales = {
    spacing: SCALES.SPACING_SCALE,
    size: SCALES.SPACING_SCALE,
    fontSize: SCALES.FONT_SIZES,
    fontWeight: SCALES.FONT_WEIGHTS,
    borderWidth: SCALES.BORDER_WIDTHS,
    shadow: SCALES.SHADOWS,
  };
  const scale = scales[prop.family];
  return scale ? (
    <Choice
      label={propLabel(prop)}
      value={prop.value}
      onChange={update}
      options={scale.map((v) => ({ value: v, label: v || "default" }))}
    />
  ) : null;
}
function StyleEditor({ classes, onChange, colors, vocabulary }) {
  const parsed = parseClassList(
      classes,
      colors.map((c) => c.name),
    ),
    [extra, setExtra] = useState("");
  const present = new Set(
    parsed.props.map((p) => `${p.family}:${p.axis ?? p.side ?? ""}`),
  );
  const addable = ADDABLE.filter(
    ([, p]) => !present.has(`${p.family}:${p.axis ?? p.side ?? ""}`),
  );
  return (
    <div className="le-props">
      {parsed.props.map((p) => (
        <div className="le-prop-row" data-family={p.family} key={p.slot}>
          <span className="le-prop-label">{propLabel(p)}</span>
          <PropertyControl
            prop={p}
            colors={colors}
            onChange={(next) =>
              onChange(composeClassList(parsed, new Map([[p.slot, next]])))
            }
          />
          <Button
            variant="ghost"
            size="icon-xs"
            className="le-chip__x"
            aria-label={`Remove ${propLabel(p)}`}
            onClick={() =>
              onChange(composeClassList(parsed, new Map([[p.slot, null]])))
            }
          >
            ×
          </Button>
        </div>
      ))}
      {addable.length > 0 && (
        <Choice
          label="Add style property"
          className="le-prop-add"
          value="add"
          options={[
            { value: "add", label: "+ Add property" },
            ...addable.map(([label], i) => ({ value: String(i), label })),
          ]}
          onChange={(v) => {
            if (v !== "add")
              onChange(
                composeClassList(parsed, new Map(), [addable[Number(v)][1]]),
              );
          }}
        />
      )}
      <Disclosure title={`Advanced (${parsed.rest.length})`}>
        <div className="le-chips">
          {parsed.slots.map(
            (s, i) =>
              !s.prop && (
                <span
                  className="le-chip"
                  key={i}
                  title={s.token}
                  data-warn={!vocabulary.includes(s.token) ? "1" : undefined}
                >
                  <span className="le-chip__label">{s.token}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${s.token}`}
                    onClick={() =>
                      onChange(composeClassList(parsed, new Map([[i, null]])))
                    }
                  >
                    ×
                  </Button>
                </span>
              ),
          )}
        </div>
        <Input
          placeholder="+ class ⏎"
          aria-label="Add class"
          list="le-vocab"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && extra.trim()) {
              onChange(`${classes} ${extra.trim()}`.trim());
              setExtra("");
            }
          }}
        />
      </Disclosure>
    </div>
  );
}
function VariantManager({ spec, onChange, onScope }) {
  const [names, setNames] = useState({});
  return (
    <Disclosure title="Manage variants">
      {Object.entries(spec.variants).map(([axis, values]) => (
        <form
          key={axis}
          className="le-field"
          onSubmit={(e) => {
            e.preventDefault();
            const name = names[axis]?.trim();
            if (!name || Object.hasOwn(values, name)) return;
            const next = clone(spec);
            Object.defineProperty(next.variants[axis], name, {
              value: [...(Object.values(values).at(-1) ?? [])],
              enumerable: true,
              writable: true,
              configurable: true,
            });
            onChange(next);
            onScope(`variant:${axis}:${name}`);
            setNames({ ...names, [axis]: "" });
          }}
        >
          <Label htmlFor={`new-${axis}`}>New {axis} value</Label>
          <div className="le-popover__row">
            <Input
              id={`new-${axis}`}
              value={names[axis] ?? ""}
              onChange={(e) => setNames({ ...names, [axis]: e.target.value })}
            />
            <Button variant="outline" type="submit">
              Add
            </Button>
          </div>
        </form>
      ))}
    </Disclosure>
  );
}
function ComponentPanel({
  info,
  spec,
  parts,
  scope,
  onScope,
  onSpec,
  onPart,
  colors,
  vocabulary,
}) {
  const scopes = [];
  if (spec) {
    scopes.push({ value: "base", label: "Base · all variants" });
    for (const [axis, values] of Object.entries(spec.variants))
      for (const v of Object.keys(values))
        scopes.push({ value: `variant:${axis}:${v}`, label: `${axis} · ${v}` });
    if (Object.keys(spec.variants).length)
      scopes.push({ value: "defaults", label: "Default variants" });
    if (spec.compoundVariants.length)
      scopes.push({ value: "compound", label: "Compound variants" });
  }
  for (const p of info.parts ?? [])
    scopes.push({
      value: `part:${p.name}`,
      label: p.name + (p.readOnlyReason ? " · read-only" : ""),
    });
  const selected =
    scopes.find((s) => s.value === scope)?.value ??
    scopes.find((s) => !s.label.includes("read-only"))?.value ??
    scopes[0]?.value;
  const editor = (classes, change) => (
    <StyleEditor
      key={selected}
      classes={classes}
      onChange={change}
      colors={colors}
      vocabulary={vocabulary}
    />
  );
  let body = null;
  if (selected === "base")
    body = editor(spec.base.join(" "), (s) => onSpec({ ...spec, base: [s] }));
  else if (selected?.startsWith("variant:")) {
    const [, axis, value] = selected.split(":");
    body = (
      <div data-axis={axis}>
        <div data-value={value}>
          {editor(spec.variants[axis][value].join(" "), (s) =>
            onSpec({
              ...spec,
              variants: {
                ...spec.variants,
                [axis]: { ...spec.variants[axis], [value]: [s] },
              },
            }),
          )}
        </div>
      </div>
    );
  } else if (selected === "defaults")
    body = Object.keys(spec.variants).map((axis) => (
      <div className="le-field" key={axis}>
        <Label>{axis}</Label>
        <Choice
          label={`Default ${axis}`}
          value={String(spec.defaultVariants[axis])}
          options={Object.keys(spec.variants[axis]).map((v) => ({
            value: v,
            label: v,
          }))}
          onChange={(v) =>
            onSpec({
              ...spec,
              defaultVariants: {
                ...spec.defaultVariants,
                [axis]: v === "true" ? true : v === "false" ? false : v,
              },
            })
          }
        />
      </div>
    ));
  else if (selected === "compound")
    body = (
      <>
        <p className="le-hint">
          Shown for reference; edit the values above or the source file
          directly.
        </p>
        {spec.compoundVariants.map((v, i) => (
          <div key={i}>
            <code>
              {Object.entries(v.match)
                .map(([k, v]) => `${k}=${v}`)
                .join(" & ")}
            </code>
            <p className="le-hint">{v.classes.join(" ")}</p>
          </div>
        ))}
      </>
    );
  else if (selected?.startsWith("part:")) {
    const p = info.parts.find((p) => `part:${p.name}` === selected);
    body = (
      <div className="le-part-row" data-part={p.name}>
        <code className="le-part-name">{p.name}</code>
        {p.classes === undefined || p.readOnlyReason ? (
          <>
            <p className="le-hint">
              Read-only: {p.readOnlyReason ?? "No editable classes"}
            </p>
            {p.classes !== undefined && (
              <code className="le-part-tail">{p.classes}</code>
            )}
          </>
        ) : (
          <>
            {editor(parts[p.name], (s) => onPart(p.name, s))}
            {p.dynamicTail && (
              <code className="le-part-tail">+ {p.dynamicTail}</code>
            )}
            {p.previewChild && (
              <p className="le-hint">
                Editing the {p.previewChild.wrapperTag} wrapper. Nested{" "}
                {p.previewChild.tag} styles come from the source.
              </p>
            )}
            {p.note && <p className="le-hint">{p.note}</p>}
          </>
        )}
      </div>
    );
  }
  return (
    <div className="le-stack">
      <Disclosure title="Source">
        <code className="le-hint">{info.importPath}</code>
        <span className="le-hint">{info.exportName}</span>
      </Disclosure>
      {info.readOnlyReason && (
        <p className="le-hint">Read-only: {info.readOnlyReason}</p>
      )}
      {scopes.length ? (
        <>
          <div className="le-field">
            <Label>Editing</Label>
            <Choice
              label="Style scope"
              className="le-scope-select"
              value={selected}
              options={scopes}
              onChange={onScope}
            />
          </div>
          <p className="le-hint">
            {selected === "base"
              ? "Changes apply to every instance. A variant may override a base property."
              : "Changes apply to every matching instance in your library."}
          </p>
          <section className="le-section">{body}</section>
          {spec && (
            <VariantManager spec={spec} onChange={onSpec} onScope={onScope} />
          )}
        </>
      ) : (
        !info.readOnlyReason && (
          <p className="le-hint">This component has no editable styles.</p>
        )
      )}
    </div>
  );
}
function App() {
  const [state, setState] = useState(null),
    [draft, setDraft] = useState(null),
    [active, setActive] = useState("theme"),
    [galleryTarget, setGalleryTarget] = useState("button"),
    [scope, setScope] = useState("base"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState("dashboard"),
    [mode, setMode] = useState("draft"),
    [device, setDevice] = useState("desktop"),
    [saving, setSaving] = useState(false),
    [issue, setIssue] = useState(null),
    [conflict, setConflict] = useState(null),
    [status, setStatus] = useState(""),
    [previewStatus, setPreviewStatus] = useState("Loading preview…"),
    [src, setSrc] = useState("about:blank"),
    [storybook, setStorybook] = useState(null),
    [rail, setRail] = useState(window.innerWidth > 820);
  const current = useRef({}),
    frame = useRef(null),
    version = useRef(0),
    scroll = useRef(0),
    blob = useRef(null),
    saveLock = useRef(false);
  current.current = { state, draft, active, scope, saving };
  const loaded = state ? draftFrom(state) : null;
  const dirty = !!draft && !equal(draft, loaded);
  const change = (fn) => {
    setStatus("");
    setDraft((d) => {
      const next = clone(d);
      fn(next);
      return next;
    });
  };
  async function load() {
    const r = await fetch("/api/lib/state");
    if (!r.ok) throw Error(`Failed to load state (${r.status})`);
    const s = await r.json();
    setState(s);
    setDraft(draftFrom(s));
    setIssue(null);
    setConflict(null);
  }
  useEffect(() => {
    load().catch((e) => setIssue(e.message));
    fetch("http://localhost:6006/index.json", {
      mode: "cors",
      signal: AbortSignal.timeout(1200),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((index) => {
        if (index) setStorybook(index.entries ?? {});
      })
      .catch(() => {});
    const media = matchMedia("(max-width:820px)"),
      sync = () => setRail(!media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  function select(view, nextScope = "base", fromCanvas = false) {
    if (!fromCanvas && view !== "theme") setGalleryTarget(view);
    if (view !== active && page === "components") scroll.current = 0;
    setActive(view);
    setScope(nextScope);
    setIssue(null);
    if (window.innerWidth <= 820) setRail(false);
    if (mode === "draft" && page === "components" && view !== "theme") {
      try {
        frame.current.contentDocument
          .querySelector(`[data-slug="${CSS.escape(view)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    }
  }
  const activeInfo = state?.components.find((c) => c.slug === active);
  useEffect(() => {
    if (!draft) return;
    const v = ++version.current,
      controller = new AbortController();
    let timer;
    if (mode === "storybook") {
      const id = `canon-${(activeInfo?.exportName ?? "Button").toLowerCase()}--variants`;
      if (storybook && Object.hasOwn(storybook, id)) {
        setSrc(
          `http://localhost:6006/iframe.html?globals=&viewMode=story&id=${id}`,
        );
        setPreviewStatus("Saved React components · Save to apply edits");
      } else {
        setSrc("about:blank");
        setPreviewStatus(
          "No saved React story for this component. Choose Live draft to preview its styles.",
        );
      }
    } else {
      setPreviewStatus("Updating draft…");
      timer = setTimeout(async () => {
        try {
          const r = await fetch("/api/lib/preview", {
            method: "POST",
            headers: { "content-type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ ...draft, page, ...(page === "components" ? {selected: galleryTarget} : {}) }),
          });
          if (!r.ok)
            throw Error(
              (await r.json()).error ?? `Preview failed (${r.status})`,
            );
          const html = await r.text();
          if (v !== version.current) return;
          try {
            scroll.current = frame.current.contentWindow.scrollY;
          } catch {}
          const url = URL.createObjectURL(
            new Blob([html], { type: "text/html" }),
          );
          const old = blob.current;
          blob.current = url;
          setSrc(url);
          if (old) setTimeout(() => URL.revokeObjectURL(old), 1000);
          setPreviewStatus(
            "Live draft · Click an element to edit shared styles",
          );
        } catch (e) {
          if (e.name !== "AbortError" && v === version.current) {
            setPreviewStatus(`Preview unavailable: ${e.message}`);
            const message = String(e.message).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
            const url = URL.createObjectURL(new Blob([`<html><body style="font:14px system-ui;padding:32px"><h2>Preview could not load</h2><p role="alert">${message}</p></body></html>`], {type:"text/html"}));
            if (blob.current) URL.revokeObjectURL(blob.current);
            blob.current = url;
            setSrc(url);
          }
        }
      }, 100);
    }
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [draft, page, mode, mode === "storybook" ? active : null, page === "components" ? galleryTarget : null, storybook]);
  function frameLoaded() {
    if (mode !== "draft") return;
    try {
      const doc = frame.current.contentDocument;
      frame.current.contentWindow.scrollTo(0, scroll.current);
      doc?.addEventListener("click", (e) => {
        const target = e.target.closest(
          "[data-inspect], [data-part], [data-slug]",
        );
        if (!target) return;
        const slug =
          target.dataset.inspect ?? target.closest("[data-slug]")?.dataset.slug;
        if (!state.components.some((c) => c.slug === slug)) return;
        if (page !== "components" || e.target.closest("a[href]")) e.preventDefault();
        let next = target.dataset.part ? `part:${target.dataset.part}` : "base";
        try {
          const picks = JSON.parse(target.dataset.picks);
          const axis =
            Object.keys(picks).find((k) => k === "variant") ??
            Object.keys(picks)[0];
          if (axis) next = `variant:${axis}:${picks[axis]}`;
        } catch {}
        select(slug, next, true);
      });
    } catch {}
  }
  async function save() {
    const { state, draft } = current.current;
    if (saveLock.current || !state || equal(draft, draftFrom(state))) return;
    saveLock.current = true;
    setSaving(true);
    setConflict(null);
    setIssue(null);
    const submitted = clone(draft),
      base = draftFrom(state),
      payload = { hashes: state.hashes };
    if (!equal(base.theme.vars, draft.theme.vars)) payload.theme = draft.theme;
    const components = Object.fromEntries(
      Object.entries(draft.components).filter(
        ([s, v]) => !equal(v, base.components[s]),
      ),
    );
    if (Object.keys(components).length) payload.components = components;
    const parts = Object.fromEntries(
      Object.entries(draft.parts)
        .map(([s, ps]) => [
          s,
          Object.fromEntries(
            Object.entries(ps).filter(([n, v]) => v !== base.parts[s]?.[n]),
          ),
        ])
        .filter(([, ps]) => Object.keys(ps).length),
    );
    if (Object.keys(parts).length) payload.parts = parts;
    try {
      const r = await fetch("/api/lib/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
        body = await r.json();
      if (r.ok) {
        if (body.stateError || !body.theme) {
          setConflict("Saved, but state could not be refreshed");
          setStatus("Files saved. Reload before editing again.");
          return;
        }
        const next = reconcileSavedDraft(
          submitted,
          current.current.draft,
          draftFrom(body),
        );
        setState(body);
        setDraft(next);
        setStatus(
          equal(next, draftFrom(body))
            ? "saved"
            : "Saved · newer edits remain unsaved",
        );
      } else if (r.status === 409) {
        setConflict(body.file ?? "a project file");
        setStatus("save conflict");
      } else {
        setIssue(body.message ?? body.error ?? `Save failed (${r.status})`);
        setStatus("save failed");
        if (body.field === "theme") setActive("theme");
        else if (body.slug) {
          setActive(body.slug);
          if (body.partName !== undefined) setScope(`part:${body.partName}`);
        }
      }
    } catch (e) {
      setIssue(e.message);
      setStatus("save failed");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    const unload = (e) => {
      const c = current.current;
      if (c.state && c.draft && !equal(c.draft, draftFrom(c.state))) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("keydown", key);
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("keydown", key);
      window.removeEventListener("beforeunload", unload);
    };
  }, []);
  const colors = Object.entries(draft?.theme.vars ?? {})
    .filter(([, v]) => color(v.light))
    .map(([name, v]) => ({ name, ...v }));
  return (
    <div className="le-app" id="le-app">
      <header className="le-topbar">
        <div className="le-brand">
          <span className="le-brand__mark">C</span>
          <strong>Canon</strong>
          <span className="le-brand__divider">/</span>
          <span className="le-brand__subtitle">Library Studio</span>
        </div>
        <div className="le-topbar__actions">
          <span
            id="le-status"
            className="le-status"
            role="status"
            data-error={issue ? "1" : undefined}
          >
            {status}
          </span>
          <Button
            id="le-reset"
            variant="ghost"
            disabled={saving || !dirty}
            onClick={() => {
              setDraft(draftFrom(state));
              setIssue(null);
              setStatus("Draft reset");
            }}
          >
            <Undo2 size={14} />
            Reset
          </Button>
          <Button id="le-save" disabled={saving || !dirty} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>
      <aside className="le-rail" aria-label="Library">
        <Collapsible
          open={rail}
          onOpenChange={setRail}
          id="le-library-navigation"
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="le-library-toggle">
              Library
              <ChevronDown size={14} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="le-rail__content">
              <Input
                id="le-search"
                aria-label="Find a component"
                placeholder="Find a component…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                id="le-tab-theme"
                variant="ghost"
                className="le-nav-item le-nav-item--theme"
                data-active={active === "theme" ? "1" : undefined}
                data-dirty={
                  draft && !equal(draft.theme, loaded.theme) ? "1" : undefined
                }
                onClick={() => select("theme")}
              >
                <Palette size={14} />
                Theme
              </Button>
              <div className="le-rail__heading">Components</div>
              <nav
                id="le-component-list"
                className="le-comp-list"
                aria-label="Components"
              >
                {state?.components
                  .filter((c) =>
                    `${c.exportName} ${c.slug}`
                      .toLowerCase()
                      .includes(search.toLowerCase().trim()),
                  )
                  .map((c) => (
                    <Button
                      variant="ghost"
                      key={c.slug}
                      className="le-nav-item le-comp-item"
                      data-slug={c.slug}
                      data-active={active === c.slug ? "1" : undefined}
                      data-readonly={c.readOnlyReason ? "1" : undefined}
                      data-dirty={
                        !equal(
                          draft.components[c.slug],
                          loaded.components[c.slug],
                        ) || !equal(draft.parts[c.slug], loaded.parts[c.slug])
                          ? "1"
                          : undefined
                      }
                      onClick={() => select(c.slug)}
                    >
                      {c.exportName}
                      {c.readOnlyReason && (
                        <span className="le-badge">read-only</span>
                      )}
                    </Button>
                  ))}
              </nav>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </aside>
      <main className="le-preview" aria-label="Preview">
        <div className="le-preview__head">
          <Choice
            label="Example"
            id="le-example"
            value={page}
            options={[
              { value: "dashboard", label: "Overview" },
              { value: "settings", label: "Settings" },
              { value: "components", label: "Components" },
            ]}
            onChange={(v) => {
              scroll.current = 0;
              try {
                frame.current.contentWindow.scrollTo(0, 0);
              } catch {}
              setPage(v);
            }}
          />
          <Choice
            label="Preview mode"
            id="le-preview-mode"
            value={mode}
            options={[
              { value: "draft", label: "Live draft" },
              {
                value: "storybook",
                label: "Saved React",
                disabled: !storybook,
              },
            ]}
            onChange={setMode}
          />
          <span className="le-preview__spacer" />
          <Choice
            label="Preview size"
            id="le-device"
            value={device}
            options={[
              { value: "desktop", label: "Desktop" },
              { value: "mobile", label: "Mobile" },
            ]}
            onChange={setDevice}
          />
        </div>
        <div className="le-preview__viewport">
          <iframe
            ref={frame}
            id="le-preview-frame"
            className="le-preview__frame"
            title="Library preview"
            data-device={device}
            src={src}
            onLoad={frameLoaded}
          />
        </div>
        <div className="le-preview__footer">
          <span id="le-preview-status" role="status">
            {previewStatus}
          </span>
        </div>
      </main>
      <section className="le-editor" aria-labelledby="le-editor-title">
        <div className="le-editor__head">
          <strong id="le-editor-title">
            {active === "theme" ? "Theme" : (activeInfo?.exportName ?? active)}
          </strong>
          <span className="le-editor__caption">Properties</span>
        </div>
        {conflict && (
          <div id="le-banner" className="le-banner" role="alert">
            “{conflict}” changed on disk since this Studio loaded it. Reload to
            see the latest version (your unsaved edits will be dropped).
            <Button
              variant="outline"
              onClick={() => load().catch((e) => setIssue(e.message))}
            >
              Reload
            </Button>
          </div>
        )}
        <div id="le-editor-body" className="le-editor__body">
          {issue && (
            <div className="le-issue" role="alert">
              {issue}
            </div>
          )}
          {!draft ? (
            <p className="le-hint">Loading…</p>
          ) : active === "theme" ? (
            <ThemePanel
              theme={draft.theme}
              onChange={(name, key, value) =>
                change((d) => {
                  if (key === "dark" && !value) delete d.theme.vars[name].dark;
                  else d.theme.vars[name][key] = value;
                })
              }
            />
          ) : (
            activeInfo && (
              <ComponentPanel
                key={active}
                info={activeInfo}
                spec={draft.components[active]}
                parts={draft.parts[active]}
                scope={scope}
                onScope={setScope}
                onSpec={(spec) =>
                  change((d) => {
                    d.components[active] = spec;
                  })
                }
                onPart={(name, value) =>
                  change((d) => {
                    d.parts[active][name] = value;
                  })
                }
                colors={colors}
                vocabulary={state.vocabulary ?? []}
              />
            )
          )}
        </div>
      </section>
      <datalist id="le-vocab">
        {state?.vocabulary?.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
