import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertDialog, DropdownMenu } from "radix-ui";
import { createHoverInspector } from "./hover-inspector.js";
import { captureOpenDialogs, restoreOpenDialogs, samePreviewView } from "./preview-continuity.js";
import { radiusOverrideHint } from "./instance-override.js";
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
import { ChevronDown, Search, Palette, Undo2, ScanEye, MousePointer2, Monitor, Smartphone, Sun, Moon, Type, X } from "lucide-react";
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
  let resolved = value;
  if (/var\(/.test(value)) {
    const doc = document.querySelector("#le-preview-frame")?.contentDocument;
    if (!doc?.documentElement) return null;
    const vars = getComputedStyle(doc.documentElement);
    if ([...value.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].some(match => !vars.getPropertyValue(match[1]).trim())) return null;
    const probe = doc.createElement("span");
    probe.style.color = value;
    probe.style.display = "none";
    doc.documentElement.append(probe);
    resolved = doc.defaultView.getComputedStyle(probe).color;
    probe.remove();
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  context.fillStyle = resolved;
  context.fillRect(0, 0, 1, 1);
  const rgba = [...context.getImageData(0, 0, 1, 1).data];
  // Read opaque RGB separately so transparent colors keep their hue and avoid
  // premultiplied-alpha rounding; merely opening never writes this conversion.
  const opaque = `rgb(from ${resolved} r g b / 1)`;
  if (CSS.supports("color", opaque)) {
    context.fillStyle = opaque; context.fillRect(0, 0, 1, 1);
    rgba.splice(0, 3, ...context.getImageData(0, 0, 1, 1).data.slice(0, 3));
  }
  return "#" + rgba.slice(0, rgba[3] === 255 ? 3 : 4).map(v => v.toString(16).padStart(2, "0")).join("");
}
const length = (v) => /^(-?[\d.]+)(rem|px|em)$/.exec(v ?? "");
function Choice({ label, value, onChange, options, id, className = "", onHover, icon }) {
  return (
    <Select
      value={value || "__default"}
      onValueChange={(v) => onChange(v === "__default" ? "" : v)}
      onOpenChange={(open) => { if (!open) onHover?.(null); }}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className={icon ? `${className} le-icon-choice` : className}
        title={icon ? options.find((option) => option.value === value)?.label : undefined}
        data-value={value}
      >
        {icon ? <SelectValue>{icon}</SelectValue> : <SelectValue />}
      </SelectTrigger>
      <SelectContent position="popper" className={onHover ? "le-scope-options" : undefined} onPointerLeave={() => onHover?.(null)}>
        {options.map((o) => (
          <SelectItem
            key={o.value || "__default"}
            value={o.value || "__default"}
            disabled={o.disabled}
            onPointerMove={() => onHover?.(o.value)}
            onFocus={() => onHover?.(o.value)}
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
  const [open, setOpen] = useState(false), [text, setText] = useState(value ?? ""),
    [hex, setHex] = useState(""), [error, setError] = useState("");
  const commit = (next = text) => {
    if (!(mode === "dark" && !next) && !color(next)) { setError("Enter a valid color."); return false; }
    onChange(next); setText(next); setHex(toHex(next || fallback) ?? ""); setError(""); return true;
  };
  const apply = () => { if (!error && commit()) setOpen(false); };
  const rgba = toHex(text || fallback);
  const alpha = rgba?.length === 9 ? parseInt(rgba.slice(7), 16) : 255;
  const updateHex = next => {
    setHex(next);
    if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(next)) { setError("Use a HEX color, such as #3366FF."); return; }
    setText(next); setError("");
  };
  return <Popover open={open} onOpenChange={next => {
    setOpen(next);
    if (next) { setText(value ?? ""); setHex(toHex(value || fallback) ?? ""); setError(""); }
  }}>
    <PopoverTrigger asChild><Button variant="outline" className="le-well" data-var-key={mode}
      aria-label={`${name} ${mode}`} title={value ? `${mode}: ${value}` : `${mode}: same as light (${fallback ?? ""})`}
      style={{ background: value || fallback }}/></PopoverTrigger>
    <PopoverContent className="le-popover" align="end" aria-label={`${name} ${mode} color`}>
      <Label>{name} · {mode}</Label>
      {!value && mode === "dark" && <p className="le-hint">Using the light color until you choose a dark color.</p>}
      {rgba ? <div className="le-color-editor">
        <label className="le-color-picker-label">Choose color
          <Input className="le-color-picker" aria-label={`${name} ${mode} picker`} type="color" value={rgba.slice(0, 7)}
            onChange={event => commit(event.target.value + (alpha < 255 ? alpha.toString(16).padStart(2, "0") : ""))}/>
        </label>
        <div className="le-color-preview" aria-label="Color preview" style={{backgroundColor:text || fallback}}/>
        <label>HEX<Input data-var-key={mode} aria-label={`${name} ${mode} value`} value={hex} aria-invalid={!!error}
          onChange={event => updateHex(event.target.value)} onKeyDown={event => { if(event.key === "Enter") apply(); }}/></label>
        <label>Opacity <span>{Math.round(alpha / 255 * 100)}%</span>
          <Range label={`${name} ${mode} opacity`} value={Math.round(alpha / 255 * 100)} max={100}
            onChange={percent => commit(rgba.slice(0,7) + (percent < 100 ? Math.round(percent / 100 * 255).toString(16).padStart(2,"0") : ""))}/>
        </label>
      </div> : <p className="le-hint">This color cannot be resolved for the visual picker. Edit its CSS value below.</p>}
      <Disclosure title="CSS value"><Input aria-label={`${name} ${mode} CSS value`} value={text} placeholder={mode === "dark" ? "same as light" : "CSS color"}
        onChange={event => {const next=event.target.value;setText(next);setHex(toHex(next || fallback) ?? "");setError(color(next) || (mode === "dark" && !next) ? "" : "Enter a valid CSS color.");}}
        onKeyDown={event => {if(event.key === "Enter") apply();}}/></Disclosure>
      {error && <p className="le-hint" role="alert">{error}</p>}
      <div className="le-popover__actions">{mode === "dark" && value && <Button variant="ghost" onClick={() => {commit("");setOpen(false);}}>Use light color</Button>}<Button disabled={!!error} onClick={apply}>Apply</Button></div>
    </PopoverContent>
  </Popover>;
}
const FONT_PRESETS = [
  {value:"system", label:"System sans", family:'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'},
  {value:"serif", label:"Serif", family:'Georgia, "Times New Roman", serif'},
  {value:"mono", label:"Monospace", family:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'},
];
function FontFamilyControl({ name, label, description, value, fallback, onChange }) {
  const [text,setText] = useState(value ?? fallback), [error,setError] = useState("");
  useEffect(() => {setText(value ?? fallback); setError("");},[value,fallback]);
  const commit = () => {
    const next = text.trim();
    if (!next || !CSS.supports("font-family",next)) {setError("Enter a valid font family or stack."); return;}
    setError("");
    if (next !== (value ?? fallback)) onChange(next);
  };
  return <section className="le-font-control" aria-label={`${label} font`}>
    <div><h3 className="le-group-title">{label}</h3><p className="le-hint">{description}</p></div>
    <Choice label={`${label} font preset`} value={FONT_PRESETS.find(p=>p.family===value)?.value ?? "custom"} options={[{value:"custom",label:value ? "Project / custom font" : "Inherited font"},...FONT_PRESETS]} onChange={preset=>{const font=FONT_PRESETS.find(p=>p.value===preset);if(font)onChange(font.family);}}/>
    <Label htmlFor={`font-${name}`}>Font family</Label>
    <Input id={`font-${name}`} aria-label={`${label} font family`} value={text} onChange={event=>{setText(event.target.value);setError("");}} onBlur={commit} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();commit();} if(event.key==="Escape"){setText(value ?? fallback);setError("");}}}/>
    {error ? <p className="le-issue" role="alert">{error}</p> : !value ? <p className="le-hint">Inherited. Choose a font to add this setting.</p> : null}
    <span className="le-font-sample" style={{fontFamily:value ?? fallback}}>The quick brown fox. 0123456789</span>
  </section>;
}
function TypographyPanel({ theme, onChange }) {
  const mode = "light";
  const fontLabels = {"font-sans":"Body", "font-heading":"Headings", "font-mono":"Code", "font-serif":"Serif"};
  const fonts = Object.keys(theme.vars).filter(name=>/^font-(?!weight(?:-|$))/.test(name)).map(name=>({
    name, label:fontLabels[name] ?? name.replace(/^font-/,""),
    description:`Declared as --${name}.`, fallback:theme.vars[name].light,
  }));
  return <div className="le-stack le-typography-panel"><p className="le-hint">Font families declared in your project. Custom families use fonts available in your project or device.</p>
    {!fonts.length && <p className="le-hint">No font family tokens are declared in this theme. Text inherits project styles and browser defaults.</p>}
    {fonts.map(font=><FontFamilyControl key={`${font.name}-${mode}`} {...font} value={theme.vars[font.name]?.[mode] ?? theme.vars[font.name]?.light} onChange={value=>onChange(font.name,mode,value)}/>)}
    {fonts.some(font=>theme.vars[font.name]?.dark) && <p className="le-hint">Existing dark appearance font overrides are preserved.</p>}
    <Disclosure title="Source"><p className="le-hint">Save writes these font settings to your shared theme.</p><code className="le-theme-file">{theme.file}</code></Disclosure>
  </div>;
}

function ThemePanel({ theme, onChange }) {
  const entries = Object.entries(theme.vars).filter(([name]) => !name.startsWith("font-")),
    colors = entries.filter(([, v]) => color(v.light) || color(v.dark)),
    others = entries.filter((e) => !colors.includes(e) && !e[0].startsWith("font-"));
  const labels = {
    primary: "Primary", "primary-foreground": "Text on primary",
    secondary: "Secondary", "secondary-foreground": "Text on secondary",
    background: "Page background", card: "Cards", popover: "Menus & popovers",
    muted: "Subtle backgrounds", accent: "Hover & selection",
    foreground: "Main text", "muted-foreground": "Secondary text",
    "card-foreground": "Text on cards", "popover-foreground": "Text in menus",
    "accent-foreground": "Text on selection", border: "Dividers & outlines",
    input: "Field borders", ring: "Focus ring", destructive: "Destructive actions",
    "destructive-foreground": "Text on destructive", radius: "Corner radius",
    sidebar: "Background", "sidebar-foreground": "Text & icons",
    "sidebar-primary": "Primary", "sidebar-primary-foreground": "Text on primary",
    "sidebar-accent": "Hover & selection", "sidebar-accent-foreground": "Text on selection",
    "sidebar-border": "Border", "sidebar-ring": "Focus ring",
    "font-sans": "Interface font", "font-serif": "Serif font", "font-mono": "Code font",
  };
  const displayName = (name) => labels[name] || name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  const groups = [
    { title: "Brand", description: "Buttons and key actions.", names: ["primary", "primary-foreground", "secondary", "secondary-foreground"] },
    { title: "Sidebar", description: "Navigation background, text and selected items.", names: colors.filter(([name]) => /^sidebar(?:-|$)/.test(name)).map(([name]) => name) },
    { title: "Surfaces", description: "The layers behind your content.", names: ["background", "card", "popover", "muted", "accent"] },
    { title: "Borders & focus", description: "Edges and keyboard focus.", names: ["border", "input", "ring"] },
    { title: "Text", description: "Readable text on each surface.", names: ["foreground", "muted-foreground", "card-foreground", "popover-foreground", "accent-foreground"] },
    { title: "Feedback", description: "Errors and destructive actions.", names: ["destructive", "destructive-foreground"] },
  ];
  const assigned = new Set(groups.flatMap((group) => group.names));
  const extraColors = colors.filter(([name]) => !assigned.has(name) && !/^(chart-|sidebar)/.test(name));
  const modeLabels = <div className="le-theme-labels"><span>Light</span><span>Dark</span></div>;
  const row = ([name, v]) => (
    <div className="le-var-row" data-var={name} key={name}>
      <span className="le-var-name" title={`--${name}`}>
        {displayName(name)}
      </span>
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
    <div className="le-stack le-theme-panel">
      <p className="le-hint le-theme-intro">Style your whole library. Choose a swatch to edit its light or dark appearance.</p>
      {groups.map((group) => {
        const vars = group.names.flatMap((name) => colors.filter(([key]) => key === name));
        if (!vars.length) return null;
        return (
          <section className="le-theme-group" key={group.title} aria-label={group.title}>
            <div className="le-theme-group-heading">
              <h3 className="le-group-title">{group.title}</h3>
              {modeLabels}
            </div>
            <p className="le-hint le-theme-description">{group.description}</p>
            {vars.map(row)}
          </section>
        );
      })}
      {others.length > 0 && (
        <section className="le-theme-group" aria-label="Shape">
          <div className="le-theme-group-heading">
            <h3 className="le-group-title">Shape</h3>
          </div>
          <p className="le-hint le-theme-description">Shared corners and sizing.</p>
          <div className="le-theme-text-labels"><span>Light</span><span>Dark</span></div>
          {others.map(row)}
        </section>
      )}
      {colors.some(([n]) => /^chart-/.test(n)) && (
        <Disclosure title="Chart colors">
          <p className="le-hint">Colors for data visualizations.</p>
          {modeLabels}
          {colors.filter(([n]) => /^chart-/.test(n)).map(row)}
        </Disclosure>
      )}
      {extraColors.length > 0 && (
        <Disclosure title="Additional colors">
          {modeLabels}
          {extraColors.map(row)}
        </Disclosure>
      )}
      <Disclosure title="Source">
        <p className="le-hint">Saved changes update the theme in this file.</p>
        <code className="le-theme-file">{theme.file}</code>
      </Disclosure>
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
function ColorProperty({ prop, colors, onChange, tokenOnly = false }) {
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
            {tokenOnly && prop.kind === "raw" ? "Custom color" : prop.value || "custom"}
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
        {!tokenOnly && <><div className="le-popover__row">
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
        </div></>}
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
function ChartPalette({ theme, onChange }) {
  const entries = Object.entries(theme.vars).filter(([name]) => name.startsWith("chart-"));
  const usesFallback = !Object.hasOwn(theme.vars, "chart-1");
  if (usesFallback && theme.vars.primary) entries.unshift(["primary", theme.vars.primary]);
  if (!entries.length) return <p className="le-hint">This chart uses chart-1, falling back to primary. Neither token is declared in this theme.</p>;
  const reaches = (name, target, mode, seen = new Set()) => {
    if (name === target) return true;
    if (seen.has(name)) return false;
    seen.add(name);
    const value = theme.vars[name]?.[mode] ?? theme.vars[name]?.light ?? "";
    return [...value.matchAll(/var\(\s*--([\w-]+)/g)].some(match => reaches(match[1], target, mode, seen));
  };
  const resolvedColor = (value, mode) => {
    for (let depth=0; depth<32 && /var\(/.test(value); depth++) {
      const next=value.replace(/var\(\s*--([\w-]+)\s*\)/g, (match, token) => theme.vars[token]?.[mode] ?? theme.vars[token]?.light ?? match);
      if(next === value)break;
      value=next;
    }
    return value;
  };
  return <section className="le-stack" aria-label="Chart palette">
    <div><Label>Series colors</Label><p className="le-hint">Choose a theme token. These links update the shared chart palette in every chart.</p><p className="le-hint">{usesFallback ? "Preview uses Primary because chart-1 is not declared." : "This preview uses Series 1 · chart-1."}</p></div>
    {entries.map(([name, value]) => <div className="le-stack" data-var={name} key={name}>
      <Label>{name === "primary" ? "Primary · fallback" : name.replace(/^chart-/, "Series ")} <span className="le-hint">· {name}</span></Label>
      {["light", "dark"].map(mode => {
        const current = value[mode] ?? value.light;
        const alias = /^var\(\s*--([\w-]+)\s*\)$/.exec(current)?.[1];
        const choices = Object.entries(theme.vars).filter(([token, values]) => !/^font-|^text-|^leading-|^tracking-/.test(token) && !/var\(/.test(resolvedColor(values[mode] ?? values.light,mode)) && color(resolvedColor(values[mode] ?? values.light,mode)) && !reaches(token, name, mode) && !(mode === "light" && !value.dark && reaches(token, name, "dark"))).map(([token, values]) => ({name:token,light:resolvedColor(values[mode] ?? values.light,mode)}));
        return <div className="le-prop-row" key={mode}><span className="le-prop-label">{mode === "light" ? "Light" : "Dark"}</span><ColorProperty tokenOnly prop={{family:`${name} ${mode}`,kind:alias ? "theme" : "raw",value:alias || current}} colors={choices} onChange={selection => onChange(name,mode,`var(--${selection.value})`)}/></div>;
      })}
    </div>)}
    <Disclosure title="Edit palette values"><p className="le-hint">Set custom colors or restore a linked token to a custom value.</p>
      {entries.map(([name,value]) => <div className="le-var-row" key={name}><span className="le-var-name">{name}</span><div className="le-var-wells">{["light","dark"].map(mode => <ThemeWell key={mode} name={name} mode={mode} value={value[mode]} fallback={value.light} onChange={v=>onChange(name,mode,v)}/>)}</div></div>)}
    </Disclosure>
  </section>;
}

function ComponentPanel({
  info,
  theme,
  onThemeChange,
  spec,
  parts,
  scope,
  onScope,
  onSpec,
  onPart,
  colors,
  vocabulary,
  onHoverScope,
  hoverHint,
  overrideHint,
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
      {info.slug === "chart" && <ChartPalette theme={theme} onChange={onThemeChange}/> }
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
              onHover={onHoverScope}
            />
          </div>
          {hoverHint && <p className="le-hover-hint" role="status">{hoverHint}</p>}
          {overrideHint && <p className="le-instance-override" role="status">{overrideHint}</p>}
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
// Applying draft variables through CSSOM preserves the mounted React tree and rejects
// malformed CSS values without interpreting them as stylesheet/source text.
function applyPreviewTheme(doc, theme, appearance = "light") {
  if (!doc?.head || !theme) return;
  doc.documentElement.classList.toggle("dark", appearance === "dark");
  doc.documentElement.style.colorScheme = appearance;
  let style = doc.getElementById("canon-live-theme");
  if (!style) {
    style = doc.createElement("style");
    style.id = "canon-live-theme";
    doc.head.append(style);
    style.sheet.insertRule(":root {}", 0);
    style.sheet.insertRule(":root.dark, .dark {}", 1);
  }
  const [light, dark] = [...style.sheet.cssRules].map(rule => rule.style);
  light.cssText = "";
  dark.cssText = "";
  for (const [name, values] of Object.entries(theme.vars)) {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) continue;
    light.setProperty(`--${name}`, values.light);
    dark.setProperty(`--${name}`, values.dark ?? values.light);
  }
  for (const label of doc.querySelectorAll("[data-theme-token-value]")) {
    const values = theme.vars[label.getAttribute("data-theme-token-value")];
    if (values) label.textContent = appearance === "dark" ? values.dark ?? values.light : values.light;
  }
  for (const note of doc.querySelectorAll("[data-font-resolution]")) {
    const name = note.getAttribute("data-font-resolution");
    const resolved = doc.defaultView.getComputedStyle(doc.documentElement).getPropertyValue(`--${name}`).trim();
    note.hidden = Boolean(resolved);
    note.textContent = resolved ? "" : "Unresolved font variable. This sample inherits the available base font.";
  }
}

async function waitForPreviewReady(node, isCurrent) {
  const doc = node.contentDocument;
  if (!doc?.body) throw Error("Preview document did not load");
  const gallery = doc.querySelector("[data-react-gallery]");
  const probe = gallery ? null : doc.createElement("span");
  if (probe) { probe.className = "hidden"; probe.setAttribute("aria-hidden", "true"); doc.body.append(probe); }
  const started = performance.now();
  let stableFrames = 0;
  try {
    while (isCurrent()) {
      const ready = gallery
        ? doc.documentElement.dataset.canonPreviewReady === "true"
        : node.contentWindow.getComputedStyle(probe).display === "none";
      if (ready && ++stableFrames >= 2) return true;
      if (!ready) stableFrames = 0;
      if (performance.now() - started > 20000) throw Error("Preview did not become ready. Try again after fixing component errors.");
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return false;
  } finally { probe?.remove(); }
}

function App() {
  const [state, setState] = useState(null),
    [draft, setDraft] = useState(null),
    [active, setActive] = useState("theme"),
    [galleryTarget, setGalleryTarget] = useState("button"),
    [scope, setScope] = useState("base"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState("theme"),
    [mode, setMode] = useState("draft"),
    [inspectMode, setInspectMode] = useState(true),
    [previewAppearance, setPreviewAppearance] = useState("light"),
    [device, setDevice] = useState("desktop"),
    [saving, setSaving] = useState(false),
    [fullResetOpen, setFullResetOpen] = useState(false),
    [resetPlan, setResetPlan] = useState(null),
    [resetBusy, setResetBusy] = useState(""),
    [resetError, setResetError] = useState(""),
    [issue, setIssue] = useState(null),
    [conflict, setConflict] = useState(null),
    [status, setStatus] = useState(""),
    [previewStatus, setPreviewStatus] = useState("Loading preview…"),
    [hoverHint, setHoverHint] = useState(""),
    [overrideHint, setOverrideHint] = useState(""),
    [frames, setFrames] = useState([{url: "about:blank", version: 0, kind: "empty"}, null]),
    [activeFrame, setActiveFrame] = useState(0),
    [storybook, setStorybook] = useState(null),
    [rail, setRail] = useState(window.innerWidth > 820);
  const current = useRef({}),
    frame = useRef(null),
    frameNodes = useRef([]),
    activeFrameRef = useRef(0),
    pendingFrame = useRef(null),
    hoverInspector = useRef(null),
    inspectModeRef = useRef(true),
    inspectedInstance = useRef(null),
    instanceObserver = useRef(null),
    version = useRef(0),
    scroll = useRef(0),
    frameUrls = useRef([null, null]),
    saveLock = useRef(false);
  current.current = { state, draft, active, scope, saving, page, mode, previewAppearance, fullResetOpen };
  activeFrameRef.current = activeFrame;
  inspectModeRef.current = inspectMode;
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
    if (!fullResetOpen) return;
    let alive = true, planId;
    setResetPlan(null);
    setResetError("");
    setResetBusy("loading");
    fetch("/api/lib/reset/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw Error(body.error ?? "Could not prepare reset.");
        planId = body.id;
        if (alive) setResetPlan(body);
        else cancelPlan();
      })
      .catch(error => { if (alive) setResetError(error.message); })
      .finally(() => { if (alive) setResetBusy(""); });
    function cancelPlan() {
      if (planId) fetch("/api/lib/reset/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: planId }) }).catch(() => {});
    }
    return () => { alive = false; cancelPlan(); };
  }, [fullResetOpen]);
  async function fullReset() {
    if (!resetPlan || resetBusy || saveLock.current) return;
    saveLock.current = true;
    setResetBusy("applying");
    setResetError("");
    setSaving(true);
    try {
      const response = await fetch("/api/lib/reset", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: resetPlan.id, confirm: "RESET_LIBRARY" }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error ?? "Reset failed. No files were changed.");
      if (body.stateError || !body.theme) {
        setIssue(`Reset completed. Reload the Studio before editing. Backup: ${body.backup}`);
      } else {
        setState(body);
        setDraft(draftFrom(body));
        setIssue(null);
        setConflict(null);
        setActive("theme");
        setPage("theme");
        setMode("draft");
        scroll.current = 0;
      }
      setStatus(`Library reset · Backup saved in ${body.backup}`);
      setFullResetOpen(false);
    } catch (error) { setResetError(error.message); }
    finally { setResetBusy(""); setSaving(false); saveLock.current = false; }
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
    if (!fromCanvas) { inspectedInstance.current = null; setOverrideHint(""); }
    if (!fromCanvas && (view === "theme" || view === "typography")) {
      setPage(view);
      setMode("draft");
      scroll.current = 0;
    }
    if (!fromCanvas && view !== "theme" && view !== "typography") {
      setGalleryTarget(view);
      setPage("components");
      scroll.current = 0;
    }
    if (view !== active && page === "components") scroll.current = 0;
    setActive(view);
    setScope(nextScope);
    setIssue(null);
    if (window.innerWidth <= 820) setRail(false);
    if (mode === "draft" && page === "components" && view !== "theme" && view !== "typography") {
      try {
        frame.current.contentDocument
          .querySelector(`[data-slug="${CSS.escape(view)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    }
  }
  const activeInfo = state?.components.find((c) => c.slug === active);
  // Theme variables never participate in the document-build key: editing a color,
  // radius or font must retain input values, React state, focus and scroll.
  const styleKey = draft ? JSON.stringify({components: draft.components, parts: draft.parts}) : null;
  useLayoutEffect(() => {
    if (mode !== "draft") return;
    for (const node of frameNodes.current) {
      try { applyPreviewTheme(node?.contentDocument, draft?.theme, previewAppearance); } catch { /* saved React is cross-origin */ }
    }
  }, [draft?.theme, mode, previewAppearance]);
  useEffect(() => {
    if (!styleKey) return;
    const v = ++version.current, controller = new AbortController();
    let timer;
    pendingFrame.current = null;
    if (mode === "storybook") {
      const id = `canon-${(activeInfo?.exportName ?? "Button").toLowerCase()}--variants`;
      if (storybook && Object.hasOwn(storybook, id)) {
        const slot = activeFrameRef.current;
        setFrames(previous => previous.map((entry, index) => index === slot ? {url: `http://localhost:6006/iframe.html?globals=&viewMode=story&id=${id}`, version: v, kind: "storybook"} : entry));
        setPreviewStatus("Saved React components · Save to apply edits");
      } else setPreviewStatus("No saved React story for this component. Choose Live draft to preview its styles.");
    } else {
      setPreviewStatus("Updating draft…");
      timer = setTimeout(async () => {
        try {
          const r = await fetch("/api/lib/preview", {
            method: "POST", headers: {"content-type": "application/json"}, signal: controller.signal,
            body: JSON.stringify({...current.current.draft, page, ...(page === "components" ? {selected: galleryTarget} : {})}),
          });
          if (!r.ok) throw Error((await r.json()).error ?? `Preview failed (${r.status})`);
          const html = await r.text();
          if (v !== version.current) return;
          const slot = 1 - activeFrameRef.current;
          const url = URL.createObjectURL(new Blob([html], {type: "text/html"}));
          if (frameUrls.current[slot]) URL.revokeObjectURL(frameUrls.current[slot]);
          frameUrls.current[slot] = url;
          pendingFrame.current = {slot, version:v};
          setFrames(previous => previous.map((entry, index) => index === slot ? {url, version:v, kind:"draft", page, target: page === "components" ? galleryTarget : null} : entry));
        } catch (e) {
          if (e.name !== "AbortError" && v === version.current) setPreviewStatus(`Preview unavailable: ${e.message}`);
        }
      }, 100);
    }
    return () => { clearTimeout(timer); controller.abort(); };
  }, [styleKey, page, mode, mode === "storybook" ? active : null, page === "components" ? galleryTarget : null, storybook]);
  async function pendingLoaded(slot, entry) {
    if (entry.kind !== "draft") return;
    const isCurrent = () => version.current === entry.version && pendingFrame.current?.slot === slot;
    if (!isCurrent()) return;
    try {
      const node = frameNodes.current[slot];
      applyPreviewTheme(node.contentDocument, current.current.draft.theme, current.current.previewAppearance);
      if (!await waitForPreviewReady(node, isCurrent) || !isCurrent()) return;
      // A theme edit can arrive during compilation. Apply its latest variables
      // immediately before showing this document, never the request snapshot.
      applyPreviewTheme(node.contentDocument, current.current.draft.theme, current.current.previewAppearance);
      const previous = frames[activeFrameRef.current];
      if (samePreviewView(previous, entry)) {
        const focused = document.activeElement;
        const dialogs = captureOpenDialogs(frame.current?.contentDocument);
        if (!await restoreOpenDialogs(node.contentDocument, dialogs, isCurrent) || !isCurrent()) return;
        // Radix autofocus in the hidden buffer must not pull keyboard input away from the editor.
        if (document.activeElement === node && focused?.isConnected && focused !== node) focused.focus({preventScroll:true});
        try { scroll.current = frame.current.contentWindow.scrollY; } catch {}
      } else scroll.current = 0;
      node.contentWindow.scrollTo(0, scroll.current);
      pendingFrame.current = null;
      activeFrameRef.current = slot;
      setActiveFrame(slot);
      setPreviewStatus(node.contentDocument.querySelector('meta[name="canon-preview-warnings"]')?.content || "");
    } catch (e) { if (isCurrent()) setPreviewStatus(`Preview unavailable: ${e.message}`); }
  }
  useEffect(() => {
    frame.current = frameNodes.current[activeFrame];
    if (frames[activeFrame]?.kind === "draft") frameLoaded();
    else { hoverInspector.current?.dispose(); instanceObserver.current?.disconnect(); }
  }, [activeFrame, frames[activeFrame]?.url]);
  useEffect(() => () => { for (const url of frameUrls.current) if (url) URL.revokeObjectURL(url); }, []);
  function refreshInstanceHint() {
    const selected = inspectedInstance.current;
    const live = current.current;
    if (mode !== "draft" || !selected || selected.slug !== live.active) { setOverrideHint(""); return; }
    const doc = frame.current?.contentDocument;
    const targets = [...(doc?.querySelectorAll("[data-inspect], [data-part], [data-slot]") ?? [])].filter(el => el.dataset.inspect === selected.slug && el.dataset.slot === selected.slot && el.dataset.part === selected.part);
    const target = targets[selected.index];
    const info = live.state?.components.find(c => c.slug === selected.slug);
    let shared;
    if (live.scope.startsWith("part:")) {
      const name = live.scope.slice(5);
      const slot = name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();
      if (target?.dataset.part !== name && target?.dataset.slot !== slot) { setOverrideHint(""); return; }
      shared = live.draft?.parts[selected.slug]?.[name];
    } else if (live.scope.startsWith("variant:")) {
      const [,axis,value] = live.scope.split(":");
      shared = live.draft?.components[selected.slug]?.variants[axis]?.[value]?.join(" ");
    } else shared = live.draft?.components[selected.slug]?.base.join(" ") ?? live.draft?.parts[selected.slug]?.[info?.exportName];
    setOverrideHint(target && shared !== undefined ? radiusOverrideHint(target.getAttribute("class"), shared) : "");
  }
  useEffect(refreshInstanceHint, [draft, active, scope, mode]);
  useEffect(() => { hoverInspector.current?.clear(); }, [active, mode, page, inspectMode]);
  useEffect(() => () => { hoverInspector.current?.dispose(); instanceObserver.current?.disconnect(); }, []);
  function frameLoaded() {
    hoverInspector.current?.dispose();
    instanceObserver.current?.disconnect();
    hoverInspector.current = null;
    if (mode !== "draft") return;
    try {
      const doc = frame.current.contentDocument;
      hoverInspector.current = createHoverInspector(doc, state.components, setHoverHint, () => inspectModeRef.current);
      instanceObserver.current = new MutationObserver(refreshInstanceHint);
      instanceObserver.current.observe(doc.body, {childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
      refreshInstanceHint();
      frame.current.contentWindow.scrollTo(0, scroll.current);
      // Capture before React/Radix handlers so inspecting never activates a component.
      const stopActivation = (event) => {
        if (!inspectModeRef.current || event.target?.closest?.("#canon-type-families summary")) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      for (const event of ["pointerdown", "pointerup", "mousedown", "mouseup", "dblclick", "beforeinput", "submit"])
        doc.addEventListener(event, stopActivation, true);
      doc.addEventListener("keydown", (event) => {
        const control = event.target?.closest?.('input, textarea, select, button, [role="combobox"], [role="slider"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [contenteditable="true"]');
        if (event.key === "Enter" || event.key === " " || control && /^(Arrow|Home$|End$)/.test(event.key) || event.target?.matches?.('input, textarea, [contenteditable="true"]') && event.key !== "Tab") stopActivation(event);
      }, true);
      doc.addEventListener("click", (e) => {
        if (!inspectModeRef.current || e.target?.closest?.("#canon-type-families summary")) return;
        stopActivation(e);
        let target = e.target.closest?.("[data-inspect], [data-part], [data-slug]");
        if (!target) return;
        const slug = target.dataset.inspect ?? target.closest("[data-slug]")?.dataset.slug;
        if (!state.components.some((c) => c.slug === slug)) return;
        let next = target.dataset.part ? `part:${target.dataset.part}` : "base";
        try {
          const picks = JSON.parse(target.dataset.picks);
          const axis = Object.keys(picks).find((k) => k === "variant") ?? Object.keys(picks)[0];
          if (axis) next = `variant:${axis}:${picks[axis]}`;
        } catch {}
        const info = state.components.find(c => c.slug === slug);
        if (next === "base" && !info.cva) {
          const slot = info.exportName.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();
          target = target.closest(`[data-slot="${CSS.escape(slot)}"]`) ?? target;
        }
        const targets = [...doc.querySelectorAll("[data-inspect], [data-part], [data-slot]")].filter(el => el.dataset.inspect === slug && el.dataset.slot === target.dataset.slot && el.dataset.part === target.dataset.part);
        inspectedInstance.current = {slug,slot:target.dataset.slot,part:target.dataset.part,index:targets.indexOf(target)};
        select(slug, next, true);
        setTimeout(refreshInstanceHint, 0);
      }, true);
    } catch {}
  }
  async function save() {
    const { state, draft, fullResetOpen } = current.current;
    if (saveLock.current || fullResetOpen || !state || equal(draft, draftFrom(state))) return;
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
          <svg className="le-brand__mark" viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">
            <path d="M20 0A20 20 0 0 0 0 20C11 20 20 11 20 0ZM0 20A20 20 0 0 0 20 40C20 29 11 20 0 20ZM20 0A20 20 0 0 1 39.36 15H32C25.1 15 20 7.8 20 0ZM20 40A20 20 0 0 0 39.36 25H32C25.1 25 20 32.2 20 40Z" />
          </svg>
          <strong className="le-brand__wordmark" aria-label="Canon">canon</strong>
          <span className="le-brand__divider">/</span>
          <span className="le-brand__subtitle">Library Studio</span>
          <span className="le-brand__divider le-page-divider">/</span>
<span id="le-page-title" data-page={page}>
            {page === "typography" ? "Typography" : page === "theme" ? "Theme" : page === "dashboard" ? "Overview" : page === "settings" ? "Settings" : state?.components.find((c) => c.slug === galleryTarget)?.exportName ?? "Components"}
          </span>
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
          <div className="le-reset-split" role="group" aria-label="Reset options">
          <Button
            id="le-reset"
            variant="ghost"
            title="Discard unsaved changes"
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
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button id="le-reset-options" variant="ghost" size="icon" aria-label="More reset options" disabled={saving || !state}><ChevronDown size={14} /></Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="le-reset-menu" align="end" sideOffset={6}>
                <DropdownMenu.Item className="le-reset-menu__item" disabled={saving || !dirty} onSelect={() => { setDraft(draftFrom(state)); setIssue(null); setStatus("Draft reset"); }}>
                  <span>Reset draft</span><small>Discard unsaved changes</small>
                </DropdownMenu.Item>
                {state?.canReset && <>
                  <DropdownMenu.Separator className="le-reset-menu__separator" />
                  <DropdownMenu.Item id="le-full-reset" className="le-reset-menu__item" onSelect={() => setFullResetOpen(true)}>
                    <span>Full reset…</span><small>Restore shadcn defaults</small>
                  </DropdownMenu.Item>
                </>}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          </div>
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
              <div className="le-search-wrap">
              <Input
                id="le-search"
                aria-label="Find a component"
                placeholder="Find a component…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && <Button type="button" variant="ghost" size="icon" className="le-search-clear" aria-label="Clear search" onClick={() => { setSearch(""); document.getElementById("le-search")?.focus(); }}><X size={14} /></Button>}
              </div>
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
              <Button id="le-tab-typography" variant="ghost" className="le-nav-item le-nav-item--theme" data-active={active === "typography" ? "1" : undefined} onClick={() => select("typography")}><Type size={14} />Typography</Button>
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
                      data-active={page === "components" && galleryTarget === c.slug ? "1" : undefined}
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
        <div className="le-preview__viewport">
          <div className="le-browser" data-device={device}>
            <div className="le-browser__bar" aria-label="Preview browser">
              <span className="le-browser__dots" aria-hidden="true"><i/><i/><i/></span>
              <span className="le-browser__address">Preview</span>
              <div className="le-browser__controls">
          <Button
            id="le-preview-appearance"
            variant="ghost"
            className="le-icon-toggle"
            role="switch"
            aria-label="Dark preview"
            aria-checked={previewAppearance === "dark"}
            title={previewAppearance === "dark" ? "Dark — switch to light" : "Light — switch to dark"}
            disabled={mode !== "draft"}
            onClick={() => setPreviewAppearance((value) => value === "light" ? "dark" : "light")}
          >
            {previewAppearance === "dark" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
          </Button>
          <Button
            id="le-inspect-mode"
            variant="ghost"
            className="le-icon-toggle"
            role="switch"
            aria-label="Inspect mode"
            aria-checked={mode === "draft" && inspectMode}
            title={mode === "draft" && inspectMode ? "Inspect — switch to interaction" : "Interact — switch to inspection"}
            disabled={mode !== "draft"}
            onClick={() => setInspectMode((value) => !value)}
          >
            {mode === "draft" && inspectMode ? <ScanEye size={16} aria-hidden="true" /> : <MousePointer2 size={16} aria-hidden="true" />}
          </Button>
          <Button
            id="le-device"
            variant="ghost"
            className="le-icon-toggle"
            role="switch"
            aria-label="Mobile preview"
            aria-checked={device === "mobile"}
            data-value={device}
            title={device === "mobile" ? "Mobile — switch to desktop" : "Desktop — switch to mobile"}
            onClick={() => setDevice((value) => value === "desktop" ? "mobile" : "desktop")}
          >
            {device === "desktop" ? <Monitor size={16} aria-hidden="true" /> : <Smartphone size={16} aria-hidden="true" />}
          </Button>
              </div>
            </div>
            <div className="le-browser__canvas">
              {frames.map((entry, slot) => entry && <iframe
                key={slot}
                ref={node => { frameNodes.current[slot] = node; if (slot === activeFrame) frame.current = node; }}
                id={slot === activeFrame ? "le-preview-frame" : "le-preview-pending"}
                className="le-preview__frame"
                title={slot === activeFrame ? "Library preview" : "Preparing preview"}
                data-device={device}
                aria-hidden={slot !== activeFrame}
                tabIndex={slot === activeFrame ? 0 : -1}
                data-visible={slot === activeFrame ? "true" : "false"}
                src={entry.url}
                onLoad={() => pendingLoaded(slot, entry)}
              />)}
            </div>
          </div>
        </div>
        <div className="le-preview__footer" hidden={!previewStatus}>
          <span id="le-preview-status" role="status">
            {previewStatus}
          </span>
        </div>
      </main>
      <AlertDialog.Root open={fullResetOpen} onOpenChange={open => { if (resetBusy !== "applying") setFullResetOpen(open); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="le-reset-overlay" />
          <AlertDialog.Content className="le-reset-dialog" data-library-reset-dialog aria-busy={resetBusy !== ""} onCloseAutoFocus={event => { event.preventDefault(); document.getElementById("le-reset-options")?.focus(); }}>
            <AlertDialog.Title className="le-reset-dialog__title">Restore shadcn defaults?</AlertDialog.Title>
            <AlertDialog.Description className="le-reset-dialog__description">
              Reset library colors, radius, variants and editable component styles in light and dark mode. This replaces saved design changes and discards your draft.
            </AlertDialog.Description>
            {resetBusy === "loading" && <p role="status" className="le-hint">Loading official shadcn defaults…</p>}
            {resetPlan && <div className="le-reset-summary">
              <strong>{resetPlan.label}</strong>
              <span>{resetPlan.restored.length} components · {resetPlan.tokens.length} theme tokens</span>
              <small>{resetPlan.source}. Project fonts, custom tokens and application code are preserved.</small>
              {resetPlan.preserved.length > 0 && <details><summary>{resetPlan.preserved.length} custom or read-only components kept</summary><p>{resetPlan.preserved.join(", ")}</p></details>}
            </div>}
            <p className="le-hint">A local backup is saved before applying the reset.</p>
            {resetError && <p className="le-issue" role="alert">{resetError}</p>}
            <div className="le-reset-dialog__actions">
              <AlertDialog.Cancel asChild><Button variant="outline" disabled={resetBusy === "applying"}>Cancel</Button></AlertDialog.Cancel>
              <Button id="le-confirm-full-reset" variant="destructive" disabled={!resetPlan || !!resetBusy || !!resetError} onClick={fullReset}>{resetBusy === "applying" ? "Restoring…" : "Restore defaults"}</Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <section className="le-editor" aria-labelledby="le-editor-title">
        <div className="le-editor__head">
          <strong id="le-editor-title">
            {active === "typography" ? "Typography" : active === "theme" ? "Theme" : (activeInfo?.exportName ?? active)}
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
          ) : active === "typography" ? (
            <TypographyPanel theme={draft.theme} onChange={(name,key,value)=>change(d=>{
              const current=d.theme.vars[name];
              d.theme.vars[name] = current ? {...current,[key]:value} : {light:key === "light" ? value : name === "font-heading" ? "var(--font-sans, system-ui, sans-serif)" : name === "font-mono" ? FONT_PRESETS[2].family : FONT_PRESETS[0].family,...(key === "dark" ? {dark:value} : {})};
            })}/>
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
                theme={draft.theme}
                onThemeChange={(name, key, value) => change(d => {
                  if (key === "dark" && !value) delete d.theme.vars[name].dark;
                  else d.theme.vars[name][key] = value;
                })}
                spec={draft.components[active]}
                parts={draft.parts[active]}
                scope={scope}
                onScope={setScope}
                onHoverScope={(value) => value ? hoverInspector.current?.scope(activeInfo, value) : hoverInspector.current?.clear()}
                hoverHint={hoverHint}
                overrideHint={overrideHint}
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
