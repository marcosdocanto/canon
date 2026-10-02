// Curated per-slug Storybook story templates for the standard shadcn/ui component set (plus a
// handful of custom/compound slugs seen in real installs: bubble, message, marker, questionnaire,
// message-scroller…), modeled on shadcn's own docs examples. Each entry hand-builds a canonical,
// presentable JSX example — overlay families open by default, inputs carry real placeholder text,
// menus show real items — rather than relying on the generic variant-axis renderer (good for a
// single leaf component's prop values, not for composing a believable example of a compound one).
//
// A catalog entry NEVER guesses: every name it references (its own module's subcomponents, or a
// sibling module like `label` or `button`) is checked against the real inventory (`ComponentInfo`)
// before being used, exactly like `composedStory` (stories.ts) already does for the compound
// fallback. When something a template needs isn't actually there, the entry returns `undefined`
// and generation falls back to the compound/generic path (stories.ts) rather than emit a broken
// import or an undefined JSX tag.
//
// `EXCLUDED`/`exclusionReason` is the other half of the "every story renders, or the component is
// excluded" directive: a slug with nothing presentable to show at all (a bare context provider, a
// toaster with no static content, full app-shell chrome) is skipped from generation entirely —
// `storyWrites` (stories.ts) also deletes a previously generated file for it, but only when that
// file still carries `GENERATED_MARK` (never a hand-edited one).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentInfo } from '../adapters/types.ts';

export type Lookup = (slug: string) => ComponentInfo | undefined;

export interface CatalogImport { path: string; names: string[]; }
export interface CatalogResult { jsx: string; ownNames: string[]; imports?: CatalogImport[]; }
interface Ctx { root: string; lookup: Lookup; }
type CatalogBuilder = (component: ComponentInfo, ctx: Ctx) => CatalogResult | undefined;

/** Every name real enough to reference on `component`: its own root export, plus every exported
 *  subcomponent `inventory()` found in the same file (`component.parts`) — exactly the set
 *  `composedStory` already treats as "real" (stories.ts). */
function names(component: ComponentInfo): Set<string> {
  const set = new Set<string>([component.exportName]);
  for (const part of component.parts ?? []) set.add(part.name);
  return set;
}
function has(component: ComponentInfo, name: string): boolean { return names(component).has(name); }
function hasAll(component: ComponentInfo, needed: string[]): boolean { return needed.every((n) => has(component, n)); }

/** A labeled control (checkbox/switch/radio item): reuses the sibling `label` component's `Label`
 *  export when the target project actually has one, else falls back to a plain `<label>` — never
 *  imports a name that isn't verified present first. */
function labelFor(ctx: Ctx, htmlFor: string, text: string): { jsx: string; imports: CatalogImport[] } {
  const label = ctx.lookup('label');
  if (label && has(label, 'Label')) return { jsx: `<Label htmlFor="${htmlFor}">${text}</Label>`, imports: [{ path: label.importPath, names: ['Label'] }] };
  return { jsx: `<label htmlFor="${htmlFor}">${text}</label>`, imports: [] };
}

/** A button-ish trigger (DropdownMenu/Tooltip/Popover/HoverCard conventionally wrap one via
 *  `asChild`): reuses the sibling `button` component's `Button` export when present, else falls
 *  back to a plain `<button>`. */
function buttonTrigger(ctx: Ctx, text: string, variant = 'outline'): { jsx: string; imports: CatalogImport[] } {
  const button = ctx.lookup('button');
  if (button && has(button, 'Button')) return { jsx: `<Button variant="${variant}">${text}</Button>`, imports: [{ path: button.importPath, names: ['Button'] }] };
  return { jsx: `<button type="button">${text}</button>`, imports: [] };
}

function hasDependency(root: string, name: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
  } catch { return false; }
}

/** Examples requiring a package are omitted explicitly when that dependency is unavailable. */
export function exclusionReason(component: ComponentInfo, root: string): string | undefined {
  if (component.slug === 'chart' && !hasDependency(root, 'recharts')) return 'recharts is not a dependency of this project — ChartContainer has no real chart to render';
  if (component.slug === 'sonner' && !hasDependency(root, 'sonner')) return 'sonner is not a dependency of this project — the notification trigger cannot call its toast API';
  return undefined;
}

/** Keep overlays interactive and closed initially so a gallery does not immediately cover the
 *  other examples or trap keyboard focus. Each family uses its real trigger and close controls. */
function overlayExample(c: ComponentInfo, ctx: Ctx, family: string, title: string): CatalogResult | undefined {
  const required = [family, `${family}Trigger`, `${family}Content`, `${family}Header`, `${family}Title`, `${family}Description`, `${family}Footer`];
  const alert = family === 'AlertDialog';
  const closing = alert ? [`${family}Cancel`, `${family}Action`] : [`${family}Close`];
  if (!hasAll(c, [...required, ...closing])) return undefined;
  const trigger = buttonTrigger(ctx, title);
  const done = buttonTrigger(ctx, 'Done', 'default');
  const controls = alert
    ? `<AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Archive project</AlertDialogAction>`
    : `<${family}Close asChild>${done.jsx}</${family}Close>`;
  return {
    ownNames: [...required, ...closing], imports: trigger.imports,
    jsx: `<${family}>
      <${family}Trigger asChild>${trigger.jsx}</${family}Trigger>
      <${family}Content>
        <${family}Header><${family}Title>${title}</${family}Title><${family}Description>${alert ? 'The project will be moved to your archive. You can restore it later.' : 'Review the details for your workspace.'}</${family}Description></${family}Header>
        <${family}Footer>${controls}</${family}Footer>
      </${family}Content>
    </${family}>`,
  };
}

const CATALOG: Record<string, CatalogBuilder> = {
  card: (c, ctx) => {
    if (!hasAll(c, ['Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter'])) return undefined;
    const action = buttonTrigger(ctx, 'Create project', 'default');
    return {
      ownNames: ['CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter'],
      imports: action.imports,
      jsx: `<Card className="w-full max-w-sm">
        <CardHeader><CardTitle>New project</CardTitle><CardDescription>Start a shared space for your team.</CardDescription>${has(c, 'CardAction') ? `<CardAction>${action.jsx}</CardAction>` : ''}</CardHeader>
        <CardContent><p>Keep your designs, discussions, and deliverables together.</p></CardContent>
        <CardFooter>${action.jsx}</CardFooter>
      </Card>`,
    };
  },

  alert: (c) => {
    if (!hasAll(c, ['Alert', 'AlertTitle', 'AlertDescription'])) return undefined;
    return { ownNames: ['AlertTitle', 'AlertDescription'], jsx: `<Alert className="w-full max-w-md"><AlertTitle>Changes saved</AlertTitle><AlertDescription>Your team can now see the latest version of this project.</AlertDescription>${has(c, 'AlertAction') ? '<AlertAction>Saved</AlertAction>' : ''}</Alert>` };
  },

  calendar: (c) => ({ ownNames: [], jsx: `<Calendar mode="single" defaultMonth={new Date(2026, 9, 1)} />` }),

  dialog: (c, ctx) => overlayExample(c, ctx, 'Dialog', 'Edit profile'),
  'alert-dialog': (c, ctx) => overlayExample(c, ctx, 'AlertDialog', 'Archive project'),
  sheet: (c, ctx) => overlayExample(c, ctx, 'Sheet', 'Project settings'),
  drawer: (c, ctx) => overlayExample(c, ctx, 'Drawer', 'Weekly goal'),

  accordion: (c) => {
    if (!hasAll(c, ['AccordionItem', 'AccordionTrigger', 'AccordionContent'])) return undefined;
    return {
      ownNames: ['AccordionItem', 'AccordionTrigger', 'AccordionContent'],
      jsx: [
        `<Accordion type="single" defaultValue="item-1" style={{ width: 320 }}>`,
        `  <AccordionItem value="item-1">`,
        `    <AccordionTrigger>Is it accessible?</AccordionTrigger>`,
        `    <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>`,
        `  </AccordionItem>`,
        `  <AccordionItem value="item-2">`,
        `    <AccordionTrigger>Is it styled?</AccordionTrigger>`,
        `    <AccordionContent>Yes. It comes with default styles that match the other components.</AccordionContent>`,
        `  </AccordionItem>`,
        `</Accordion>`,
      ].join('\n  '),
    };
  },

  avatar: (c) => {
    if (!has(c, 'AvatarFallback')) return undefined;
    const image = has(c, 'AvatarImage')
      ? `<AvatarImage alt="Alex Morgan" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23dbeafe'/%3E%3Ccircle cx='40' cy='30' r='14' fill='%2364748b'/%3E%3Cpath d='M12 80a28 28 0 0 1 56 0' fill='%2364748b'/%3E%3C/svg%3E" />`
      : '';
    const badge = `<AvatarBadge aria-label="Available"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg></AvatarBadge>`;
    const face = (initials: string, withImage = false, withBadge = false) =>
      `<Avatar>${withImage ? image : ''}<AvatarFallback>${initials}</AvatarFallback>${withBadge ? badge : ''}</Avatar>`;
    const example = (label: string, content: string) =>
      `<figure style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, margin: 0 }}><figcaption>${label}</figcaption>${content}</figure>`;
    const examples = [
      ...(image ? [example('Image', face('AM', true))] : []),
      example('Initials', face('CN')),
      ...(has(c, 'AvatarBadge') ? [example('Status', face('AM', Boolean(image), true))] : []),
      ...(has(c, 'AvatarGroup') ? [example('Group', `<AvatarGroup>${face('AM', Boolean(image))}${face('JD')}${face('CN')}${has(c, 'AvatarGroupCount') ? '<AvatarGroupCount>+3</AvatarGroupCount>' : ''}</AvatarGroup>`)] : []),
    ];
    return { ownNames: ['AvatarFallback'], jsx: `<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 32 }}>${examples.join('')}</div>` };
  },

  checkbox: (c, ctx) => {
    const label = labelFor(ctx, 'story-checkbox', 'Accept terms and conditions');
    return {
      ownNames: [],
      imports: label.imports,
      jsx: `<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n    <Checkbox id="story-checkbox" defaultChecked />\n    ${label.jsx}\n  </div>`,
    };
  },

  switch: (c, ctx) => {
    const label = labelFor(ctx, 'story-switch', 'Airplane mode');
    return {
      ownNames: [],
      imports: label.imports,
      jsx: `<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n    <Switch id="story-switch" defaultChecked />\n    ${label.jsx}\n  </div>`,
    };
  },

  'radio-group': (c, ctx) => {
    if (!has(c, 'RadioGroupItem')) return undefined;
    const l1 = labelFor(ctx, 'story-radio-1', 'Default');
    const l2 = labelFor(ctx, 'story-radio-2', 'Comfortable');
    return {
      ownNames: ['RadioGroupItem'],
      imports: [...l1.imports, ...l2.imports],
      jsx: [
        `<RadioGroup defaultValue="comfortable">`,
        `  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>`,
        `    <RadioGroupItem value="default" id="story-radio-1" />`,
        `    ${l1.jsx}`,
        `  </div>`,
        `  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>`,
        `    <RadioGroupItem value="comfortable" id="story-radio-2" />`,
        `    ${l2.jsx}`,
        `  </div>`,
        `</RadioGroup>`,
      ].join('\n  '),
    };
  },

  input: () => ({ ownNames: [], jsx: `<Input placeholder="Email" className="w-64" />` }),
  textarea: () => ({ ownNames: [], jsx: `<Textarea placeholder="Type your message here." className="w-64" />` }),

  'input-otp': (c) => {
    if (!hasAll(c, ['InputOTPGroup', 'InputOTPSlot'])) return undefined;
    const slots = Array.from({ length: 6 }, (_, i) => `<InputOTPSlot index={${i}} />`).join('');
    return { ownNames: ['InputOTPGroup', 'InputOTPSlot'], jsx: `<InputOTP maxLength={6}>\n    <InputOTPGroup>${slots}</InputOTPGroup>\n  </InputOTP>` };
  },

  'native-select': (c) => {
    if (!has(c, 'NativeSelectOption')) return undefined;
    return {
      ownNames: ['NativeSelectOption'],
      jsx: [
        `<NativeSelect defaultValue="apple" className="w-64">`,
        `  <NativeSelectOption value="apple">Apple</NativeSelectOption>`,
        `  <NativeSelectOption value="banana">Banana</NativeSelectOption>`,
        `  <NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>`,
        `</NativeSelect>`,
      ].join('\n  '),
    };
  },

  select: (c) => {
    if (!hasAll(c, ['SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem'])) return undefined;
    return {
      ownNames: ['SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem'],
      jsx: [
        `<Select defaultValue="blueberry">`,
        `  <SelectTrigger className="w-64">`,
        `    <SelectValue placeholder="Select a fruit" />`,
        `  </SelectTrigger>`,
        `  <SelectContent>`,
        hasAll(c, ['SelectGroup', 'SelectLabel']) ? `    <SelectGroup><SelectLabel>Fruit</SelectLabel>` : '',
        `    <SelectItem value="apple">Apple</SelectItem>`,
        `    <SelectItem value="banana">Banana</SelectItem>`,
        `    <SelectItem value="blueberry">Blueberry</SelectItem>`,
        hasAll(c, ['SelectGroup', 'SelectLabel']) ? `    </SelectGroup>` : '',
        has(c, 'SelectSeparator') ? `<SelectSeparator />` : '',
        `<SelectItem value="other">Other</SelectItem>`,
        `  </SelectContent>`,
        `</Select>`,
      ].join('\n  '),
    };
  },

  tabs: (c) => {
    if (!hasAll(c, ['TabsList', 'TabsTrigger', 'TabsContent'])) return undefined;
    return {
      ownNames: ['TabsList', 'TabsTrigger', 'TabsContent'],
      jsx: [
        `<Tabs defaultValue="account" style={{ width: 320 }}>`,
        `  <TabsList>`,
        `    <TabsTrigger value="account">Account</TabsTrigger>`,
        `    <TabsTrigger value="password">Password</TabsTrigger>`,
        `  </TabsList>`,
        `  <TabsContent value="account">Make changes to your account here.</TabsContent>`,
        `  <TabsContent value="password">Change your password here.</TabsContent>`,
        `</Tabs>`,
      ].join('\n  '),
    };
  },

  table: (c) => {
    if (!hasAll(c, ['TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell'])) return undefined;
    const row = (name: string, status: string, amount: string) => `<TableRow><TableCell>${name}</TableCell><TableCell>${status}</TableCell><TableCell className="text-right">${amount}</TableCell></TableRow>`;
    return {
      ownNames: ['TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell'],
      jsx: [
        `<Table>`,
        `  <TableHeader>`,
        `    <TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>`,
        `  </TableHeader>`,
        `  <TableBody>`,
        `    ${row('Acme Inc.', 'Paid', '$250.00')}`,
        `    ${row('Globex Corp.', 'Pending', '$150.00')}`,
        `    ${row('Initech', 'Overdue', '$75.00')}`,
        `  </TableBody>`,
        `</Table>`,
      ].join('\n  '),
    };
  },

  skeleton: () => ({
    ownNames: [],
    jsx: [
      `<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>`,
      `  <Skeleton style={{ height: 40, width: 40 }} />`,
      `  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>`,
      `    <Skeleton style={{ height: 12, width: 200 }} />`,
      `    <Skeleton style={{ height: 12, width: 160 }} />`,
      `  </div>`,
      `</div>`,
    ].join('\n  '),
  }),

  slider: () => ({ ownNames: [], jsx: `<Slider defaultValue={[50]} className="w-64" />` }),
  progress: () => ({ ownNames: [], jsx: `<Progress value={60} className="w-64" />` }),

  'dropdown-menu': (c, ctx) => {
    if (!hasAll(c, ['DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuLabel', 'DropdownMenuSeparator', 'DropdownMenuItem'])) return undefined;
    const trigger = buttonTrigger(ctx, 'Options');
    return {
      ownNames: ['DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuLabel', 'DropdownMenuSeparator', 'DropdownMenuItem'],
      imports: [...trigger.imports, { path: 'react', names: ['createElement', 'useState'] }],
      jsx: `<>{createElement(function MenuDemo() { const [checked, setChecked] = useState(true); const [density, setDensity] = useState("comfortable"); return (${[
        `<DropdownMenu defaultOpen>`,
        `  <DropdownMenuTrigger asChild>${trigger.jsx}</DropdownMenuTrigger>`,
        `  <DropdownMenuContent>`,
        `    <DropdownMenuLabel>My Account</DropdownMenuLabel>`,
        `    <DropdownMenuSeparator />`,
        `    <DropdownMenuItem>Profile</DropdownMenuItem>`,
        `    <DropdownMenuItem>Billing</DropdownMenuItem>`,
        `    <DropdownMenuItem>Settings</DropdownMenuItem>`,
        hasAll(c, ['DropdownMenuCheckboxItem', 'DropdownMenuRadioGroup', 'DropdownMenuRadioItem']) ? `<DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>Show status</DropdownMenuCheckboxItem><DropdownMenuRadioGroup value={density} onValueChange={setDensity}><DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem><DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem></DropdownMenuRadioGroup>` : '',
        hasAll(c, ['DropdownMenuSub', 'DropdownMenuSubTrigger', 'DropdownMenuSubContent']) ? `<DropdownMenuSub><DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuItem>Duplicate</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuSub>` : '',
        `  </DropdownMenuContent>`,
        `</DropdownMenu>`,
      ].join('\n  ')}); })}</>`,
    };
  },

  'context-menu': (c) => {
    if (!hasAll(c, ['ContextMenuTrigger', 'ContextMenuContent', 'ContextMenuItem'])) return undefined;
    return {
      imports: [{ path: 'react', names: ['createElement', 'useState'] }],      ownNames: ['ContextMenuTrigger', 'ContextMenuContent', 'ContextMenuItem'],
      jsx: `<>{createElement(function MenuDemo() { const [checked, setChecked] = useState(true); const [density, setDensity] = useState("comfortable"); return (${[
        `<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>`,
        `  <ContextMenu>`,
        `    <ContextMenuTrigger style={{ display: 'flex', height: 96, width: 240, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px dashed var(--border)', fontSize: 13 }}>`,
        `      Right-click here`,
        `    </ContextMenuTrigger>`,
        `    <ContextMenuContent>`,
        `      <ContextMenuItem>Back</ContextMenuItem>`,
        `      <ContextMenuItem>Forward</ContextMenuItem>`,
        `      <ContextMenuItem>Reload</ContextMenuItem>`,
        hasAll(c, ['ContextMenuCheckboxItem', 'ContextMenuRadioGroup', 'ContextMenuRadioItem']) ? `<ContextMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>Show status</ContextMenuCheckboxItem><ContextMenuRadioGroup value={density} onValueChange={setDensity}><ContextMenuRadioItem value="comfortable">Comfortable</ContextMenuRadioItem><ContextMenuRadioItem value="compact">Compact</ContextMenuRadioItem></ContextMenuRadioGroup>` : '',
        hasAll(c, ['ContextMenuSub', 'ContextMenuSubTrigger', 'ContextMenuSubContent']) ? `<ContextMenuSub><ContextMenuSubTrigger>More options</ContextMenuSubTrigger><ContextMenuSubContent><ContextMenuItem>Duplicate</ContextMenuItem></ContextMenuSubContent></ContextMenuSub>` : '',
        `    </ContextMenuContent>`,
        `  </ContextMenu>`,
        `  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Context menus open on right-click — content isn't shown until triggered.</span>`,
        `</div>`,
      ].join('\n  ')}); })}</>`,
    };
  },

  menubar: (c) => {
    if (!hasAll(c, ['MenubarMenu', 'MenubarTrigger', 'MenubarContent', 'MenubarItem', 'MenubarSeparator'])) return undefined;
    return {
      imports: [{ path: 'react', names: ['createElement', 'useState'] }],      ownNames: ['MenubarMenu', 'MenubarTrigger', 'MenubarContent', 'MenubarItem', 'MenubarSeparator'],
      jsx: `<>{createElement(function MenuDemo() { const [checked, setChecked] = useState(true); const [density, setDensity] = useState("comfortable"); return (${[
        `<Menubar defaultValue="file">`,
        `  <MenubarMenu value="file">`,
        `    <MenubarTrigger>File</MenubarTrigger>`,
        `    <MenubarContent>`,
        `      <MenubarItem>New Tab</MenubarItem>`,
        `      <MenubarItem>New Window</MenubarItem>`,
        `      <MenubarSeparator />`,
        `      <MenubarItem>Share</MenubarItem>`,
        hasAll(c, ['MenubarCheckboxItem', 'MenubarRadioGroup', 'MenubarRadioItem']) ? `<MenubarCheckboxItem checked={checked} onCheckedChange={setChecked}>Show status</MenubarCheckboxItem><MenubarRadioGroup value={density} onValueChange={setDensity}><MenubarRadioItem value="comfortable">Comfortable</MenubarRadioItem><MenubarRadioItem value="compact">Compact</MenubarRadioItem></MenubarRadioGroup>` : '',
        hasAll(c, ['MenubarSub', 'MenubarSubTrigger', 'MenubarSubContent']) ? `<MenubarSub><MenubarSubTrigger>More options</MenubarSubTrigger><MenubarSubContent><MenubarItem>Duplicate</MenubarItem></MenubarSubContent></MenubarSub>` : '',
        `    </MenubarContent>`,
        `  </MenubarMenu>`,
        `  <MenubarMenu value="edit">`,
        `    <MenubarTrigger>Edit</MenubarTrigger>`,
        `    <MenubarContent>`,
        `      <MenubarItem>Undo</MenubarItem>`,
        `      <MenubarItem>Redo</MenubarItem>`,
        `    </MenubarContent>`,
        `  </MenubarMenu>`,
        `</Menubar>`,
      ].join('\n  ')}); })}</>`,
    };
  },

  'navigation-menu': (c) => {
    if (!hasAll(c, ['NavigationMenuList', 'NavigationMenuItem', 'NavigationMenuTrigger', 'NavigationMenuContent', 'NavigationMenuLink'])) return undefined;
    return {
      ownNames: ['NavigationMenuList', 'NavigationMenuItem', 'NavigationMenuTrigger', 'NavigationMenuContent', 'NavigationMenuLink'],
      jsx: [
        `<NavigationMenu defaultValue="getting-started" viewport={false}>`,
        `  <NavigationMenuList>`,
        `    <NavigationMenuItem value="getting-started">`,
        `      <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>`,
        `      <NavigationMenuContent>`,
        `        <NavigationMenuLink href="#">Introduction</NavigationMenuLink>`,
        `        <NavigationMenuLink href="#">Installation</NavigationMenuLink>`,
        `      </NavigationMenuContent>`,
        `    </NavigationMenuItem>`,
        `    <NavigationMenuItem>`,
        `      <NavigationMenuLink href="#">Documentation</NavigationMenuLink>`,
        `    </NavigationMenuItem>`,
        `  </NavigationMenuList>`,
        `</NavigationMenu>`,
      ].join('\n  '),
    };
  },

  tooltip: (c, ctx) => {
    if (!hasAll(c, ['TooltipProvider', 'TooltipTrigger', 'TooltipContent'])) return undefined;
    const trigger = buttonTrigger(ctx, 'Hover');
    return {
      ownNames: ['TooltipProvider', 'TooltipTrigger', 'TooltipContent'],
      imports: trigger.imports,
      jsx: [
        `<TooltipProvider>`,
        `  <Tooltip defaultOpen>`,
        `    <TooltipTrigger asChild>${trigger.jsx}</TooltipTrigger>`,
        `    <TooltipContent>Add to library</TooltipContent>`,
        `  </Tooltip>`,
        `</TooltipProvider>`,
      ].join('\n  '),
    };
  },

  'hover-card': (c, ctx) => {
    if (!hasAll(c, ['HoverCardTrigger', 'HoverCardContent'])) return undefined;
    const trigger = buttonTrigger(ctx, '@shadcn', 'link');
    return {
      ownNames: ['HoverCardTrigger', 'HoverCardContent'],
      imports: trigger.imports,
      jsx: [
        `<HoverCard defaultOpen>`,
        `  <HoverCardTrigger asChild>${trigger.jsx}</HoverCardTrigger>`,
        `  <HoverCardContent>`,
        `    <div style={{ fontSize: 14, fontWeight: 500 }}>@shadcn</div>`,
        `    <div style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>The React framework for the web.</div>`,
        `  </HoverCardContent>`,
        `</HoverCard>`,
      ].join('\n  '),
    };
  },

  popover: (c, ctx) => {
    if (!hasAll(c, ['PopoverTrigger', 'PopoverContent'])) return undefined;
    const trigger = buttonTrigger(ctx, 'Open popover');
    const hasHeaderFamily = hasAll(c, ['PopoverHeader', 'PopoverTitle', 'PopoverDescription']);
    const own = ['PopoverTrigger', 'PopoverContent', ...(hasHeaderFamily ? ['PopoverHeader', 'PopoverTitle', 'PopoverDescription'] : [])];
    const body = hasHeaderFamily
      ? `<PopoverHeader><PopoverTitle>Dimensions</PopoverTitle><PopoverDescription>Set the dimensions for the layer.</PopoverDescription></PopoverHeader>`
      : `Set the dimensions for the layer.`;
    return {
      ownNames: own,
      imports: trigger.imports,
      jsx: [
        `<Popover defaultOpen>`,
        `  <PopoverTrigger asChild>${trigger.jsx}</PopoverTrigger>`,
        `  <PopoverContent>${body}</PopoverContent>`,
        `</Popover>`,
      ].join('\n  '),
    };
  },

  command: (c) => {
    if (!hasAll(c, ['CommandInput', 'CommandList', 'CommandGroup', 'CommandItem'])) return undefined;
    return {
      ownNames: ['CommandInput', 'CommandList', 'CommandGroup', 'CommandItem'],
      jsx: [
        `<Command style={{ width: 320 }}>`,
        `  <CommandInput placeholder="Type a command or search..." />`,
        `  <CommandList>`,
        `    <CommandGroup heading="Suggestions">`,
        `      <CommandItem>Calendar</CommandItem>`,
        `      <CommandItem>Search Emoji</CommandItem>`,
        `      <CommandItem>Calculator</CommandItem>`,
        `    </CommandGroup>`,
        `  </CommandList>`,
        `</Command>`,
      ].join('\n  '),
    };
  },

  breadcrumb: (c) => {
    if (!hasAll(c, ['BreadcrumbList', 'BreadcrumbItem', 'BreadcrumbLink', 'BreadcrumbSeparator', 'BreadcrumbPage'])) return undefined;
    return {
      ownNames: ['BreadcrumbList', 'BreadcrumbItem', 'BreadcrumbLink', 'BreadcrumbSeparator', 'BreadcrumbPage'],
      jsx: [
        `<Breadcrumb>`,
        `  <BreadcrumbList>`,
        `    <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>`,
        `    <BreadcrumbSeparator />`,
        `    <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>`,
        `    <BreadcrumbSeparator />`,
        `    <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>`,
        `  </BreadcrumbList>`,
        `</Breadcrumb>`,
      ].join('\n  '),
    };
  },

  pagination: (c) => {
    if (!hasAll(c, ['PaginationContent', 'PaginationItem', 'PaginationLink', 'PaginationPrevious', 'PaginationNext'])) return undefined;
    return {
      ownNames: ['PaginationContent', 'PaginationItem', 'PaginationLink', 'PaginationPrevious', 'PaginationNext'],
      jsx: [
        `<Pagination>`,
        `  <PaginationContent>`,
        `    <PaginationItem><PaginationPrevious href="#" /></PaginationItem>`,
        `    <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>`,
        `    <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>`,
        `    <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>`,
        `    <PaginationItem><PaginationNext href="#" /></PaginationItem>`,
        `  </PaginationContent>`,
        `</Pagination>`,
      ].join('\n  '),
    };
  },

  'scroll-area': () => ({
    ownNames: [],
    jsx: [
      `<ScrollArea style={{ height: 160, width: 260 }}>`,
      `  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>`,
      `    <div style={{ fontSize: 14 }}>Item one</div>`,
      `    <div style={{ fontSize: 14 }}>Item two</div>`,
      `    <div style={{ fontSize: 14 }}>Item three</div>`,
      `    <div style={{ fontSize: 14 }}>Item four</div>`,
      `    <div style={{ fontSize: 14 }}>Item five</div>`,
      `    <div style={{ fontSize: 14 }}>Item six</div>`,
      `    <div style={{ fontSize: 14 }}>Item seven</div>`,
      `    <div style={{ fontSize: 14 }}>Item eight</div>`,
      `  </div>`,
      `</ScrollArea>`,
    ].join('\n  '),
  }),

  resizable: (c) => {
    if (!hasAll(c, ['ResizablePanelGroup', 'ResizablePanel', 'ResizableHandle'])) return undefined;
    const source = existsSync(c.file) ? readFileSync(c.file, 'utf8') : '';
    const orientationProp = /\bResizablePrimitive\.Group\b/.test(source) ? 'orientation' : 'direction';
    return {
      ownNames: ['ResizablePanelGroup', 'ResizablePanel', 'ResizableHandle'],
      jsx: [
        `<ResizablePanelGroup ${orientationProp}="horizontal" style={{ height: 160, width: 320 }}>`,
        `  <ResizablePanel defaultSize={50}>`,
        `    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>One</div>`,
        `  </ResizablePanel>`,
        `  <ResizableHandle withHandle />`,
        `  <ResizablePanel defaultSize={50}>`,
        `    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>Two</div>`,
        `  </ResizablePanel>`,
        `</ResizablePanelGroup>`,
      ].join('\n  '),
    };
  },

  separator: () => ({
    ownNames: [],
    jsx: [
      `<div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 240 }}>`,
      `  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>`,
      `    <div style={{ fontSize: 14, fontWeight: 500 }}>Canon</div>`,
      `    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>A design system toolkit.</div>`,
      `  </div>`,
      `  <Separator />`,
      `  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>`,
      `    <span>Blog</span><Separator orientation="vertical" style={{ height: 16 }} /><span>Docs</span><Separator orientation="vertical" style={{ height: 16 }} /><span>Source</span>`,
      `  </div>`,
      `</div>`,
    ].join('\n  '),
  }),

  carousel: (c) => {
    if (!hasAll(c, ['CarouselContent', 'CarouselItem'])) return undefined;
    const hasNav = hasAll(c, ['CarouselPrevious', 'CarouselNext']);
    const slide = (n: number) => `<CarouselItem><div style={{ display: 'flex', height: 120, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--border)', fontSize: 24, fontWeight: 600 }}>${n}</div></CarouselItem>`;
    return {
      ownNames: ['CarouselContent', 'CarouselItem', ...(hasNav ? ['CarouselPrevious', 'CarouselNext'] : [])],
      jsx: [
        `<Carousel style={{ width: 260 }}>`,
        `  <CarouselContent>`,
        `    ${slide(1)}`,
        `    ${slide(2)}`,
        `    ${slide(3)}`,
        `  </CarouselContent>`,
        hasNav ? `  <CarouselPrevious />\n  <CarouselNext />` : '',
        `</Carousel>`,
      ].filter(Boolean).join('\n  '),
    };
  },

  'aspect-ratio': () => ({
    ownNames: [],
    jsx: `<div style={{ width: 280 }}><AspectRatio ratio={16 / 9}><img alt="Landscape sample" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23dbeafe'/%3E%3Cpath d='M0 180 100 50 200 180 270 80 320 180' fill='%2364748b'/%3E%3C/svg%3E" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></AspectRatio></div>`,
  }),

  kbd: (c) => {
    if (!has(c, 'KbdGroup')) return undefined;
    return { ownNames: ['KbdGroup'], jsx: `<KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>` };
  },

  label: () => ({ ownNames: [], jsx: `<Label htmlFor="story-label-demo">Email address</Label>` }),
  spinner: () => ({ ownNames: [], jsx: `<Spinner />` }),
  toggle: () => ({ ownNames: [], jsx: `<Toggle aria-label="Toggle bold" defaultPressed>B</Toggle>` }),

  'toggle-group': (c) => {
    if (!has(c, 'ToggleGroupItem')) return undefined;
    return {
      ownNames: ['ToggleGroupItem'],
      jsx: [
        `<ToggleGroup type="single" defaultValue="center">`,
        `  <ToggleGroupItem value="left" aria-label="Align left">L</ToggleGroupItem>`,
        `  <ToggleGroupItem value="center" aria-label="Align center">C</ToggleGroupItem>`,
        `  <ToggleGroupItem value="right" aria-label="Align right">R</ToggleGroupItem>`,
        `</ToggleGroup>`,
      ].join('\n  '),
    };
  },

  collapsible: (c) => {
    if (!hasAll(c, ['CollapsibleTrigger', 'CollapsibleContent'])) return undefined;
    return {
      ownNames: ['CollapsibleTrigger', 'CollapsibleContent'],
      jsx: [
        `<Collapsible defaultOpen style={{ width: 280 }}>`,
        `  <CollapsibleTrigger>Toggle details</CollapsibleTrigger>`,
        `  <CollapsibleContent>Here are some additional details about this item.</CollapsibleContent>`,
        `</Collapsible>`,
      ].join('\n  '),
    };
  },

  empty: (c) => {
    if (!hasAll(c, ['EmptyHeader', 'EmptyMedia', 'EmptyTitle', 'EmptyDescription'])) return undefined;
    return {
      ownNames: ['EmptyHeader', 'EmptyMedia', 'EmptyTitle', 'EmptyDescription'],
      jsx: [
        `<Empty style={{ width: 320 }}>`,
        `  <EmptyHeader>`,
        `    <EmptyMedia variant="icon" />`,
        `    <EmptyTitle>No results found</EmptyTitle>`,
        `    <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>`,
        `  </EmptyHeader>`,
        `</Empty>`,
      ].join('\n  '),
    };
  },

  item: (c) => {
    if (!hasAll(c, ['ItemGroup', 'ItemContent', 'ItemTitle', 'ItemDescription'])) return undefined;
    return {
      ownNames: ['ItemGroup', 'ItemContent', 'ItemTitle', 'ItemDescription'],
      jsx: [
        `<ItemGroup style={{ width: 320 }}>`,
        `  <Item variant="outline">`,
        `    <ItemContent>`,
        `      <ItemTitle>Payment received</ItemTitle>`,
        `      <ItemDescription>Invoice #1024 — $240.00</ItemDescription>`,
        `    </ItemContent>`,
        `  </Item>`,
        `</ItemGroup>`,
      ].join('\n  '),
    };
  },

  attachment: (c) => {
    if (!hasAll(c, ['AttachmentMedia', 'AttachmentContent', 'AttachmentTitle', 'AttachmentDescription'])) return undefined;
    return {
      ownNames: ['AttachmentMedia', 'AttachmentContent', 'AttachmentTitle', 'AttachmentDescription'],
      jsx: [
        `<Attachment style={{ width: 220 }}>`,
        `  <AttachmentMedia />`,
        `  <AttachmentContent>`,
        `    <AttachmentTitle>design-spec.pdf</AttachmentTitle>`,
        `    <AttachmentDescription>2.4 MB</AttachmentDescription>`,
        `  </AttachmentContent>`,
        `</Attachment>`,
      ].join('\n  '),
    };
  },

  marker: (c) => {
    if (!has(c, 'Marker')) return undefined;
    return {
      ownNames: [],
      jsx: [
        `<div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 240 }}>`,
        `  <Marker>Order placed — Jan 4</Marker>`,
        `  <Marker>Shipped — Jan 5</Marker>`,
        `  <Marker>Delivered — Jan 7</Marker>`,
        `</div>`,
      ].join('\n  '),
    };
  },

  field: (c, ctx) => {
    if (!hasAll(c, ['FieldSet', 'FieldGroup', 'FieldLabel', 'FieldDescription'])) return undefined;
    const input = ctx.lookup('input');
    const useInput = Boolean(input && has(input, 'Input'));
    const control = useInput
      ? `<Input id="story-field-email" type="email" placeholder="you@example.com" />`
      : `<input id="story-field-email" type="email" placeholder="you@example.com" />`;
    return {
      ownNames: ['FieldSet', 'FieldGroup', 'FieldLabel', 'FieldDescription'],
      imports: useInput ? [{ path: input!.importPath, names: ['Input'] }] : [],
      jsx: [
        `<FieldSet style={{ width: 320 }}>`,
        `  <FieldGroup>`,
        `    <Field>`,
        `      <FieldLabel htmlFor="story-field-email">Email</FieldLabel>`,
        `      ${control}`,
        `      <FieldDescription>We'll only use this to contact you.</FieldDescription>`,
        has(c, 'FieldError') ? `<FieldError>Please enter a valid email address.</FieldError>` : '',
        `    </Field>`,
        `  </FieldGroup>`,
        `</FieldSet>`,
      ].join('\n  '),
    };
  },

  'button-group': (c, ctx) => {
    const trigger = (text: string) => buttonTrigger(ctx, text);
    const a = trigger('Copy'); const b = trigger('Edit'); const d = trigger('Delete');
    return {
      ownNames: [],
      imports: a.imports,
      jsx: `<ButtonGroup>\n    ${a.jsx}\n    ${b.jsx}\n    ${d.jsx}\n  </ButtonGroup>`,
    };
  },

  'input-group': (c) => {
    if (!hasAll(c, ['InputGroupInput', 'InputGroupAddon', 'InputGroupText'])) return undefined;
    return {
      ownNames: ['InputGroupInput', 'InputGroupAddon', 'InputGroupText'],
      jsx: [
        `<><InputGroup className="w-64">`,
        `  <InputGroupInput placeholder="Search..." />`,
        `  <InputGroupAddon align="inline-end">`,
        `    <InputGroupText>⌘K</InputGroupText>`,
        `  </InputGroupAddon>`,
        `</InputGroup>`,
        has(c, 'InputGroupTextarea') ? `<InputGroup><InputGroupTextarea placeholder="Write a message..." />${has(c, 'InputGroupButton') ? '<InputGroupAddon align="block-end"><InputGroupButton>Send</InputGroupButton></InputGroupAddon>' : ''}</InputGroup>` : '',
        `</>`,
      ].join('\n  '),
    };
  },

  bubble: (c) => {
    if (!hasAll(c, ['BubbleGroup', 'Bubble', 'BubbleContent'])) return undefined;
    return {
      ownNames: ['BubbleGroup', 'Bubble', 'BubbleContent'],
      jsx: `<BubbleGroup className="w-full max-w-sm">\n    <Bubble variant="muted"><BubbleContent>Can you share the updated designs?</BubbleContent></Bubble>\n    <Bubble align="end"><BubbleContent>Of course — the new project is ready to review.</BubbleContent></Bubble>\n  </BubbleGroup>`,
    };
  },

  message: (c, ctx) => {
    if (!hasAll(c, ['Message', 'MessageContent'])) return undefined;
    const bubble = ctx.lookup('bubble');
    const useBubble = Boolean(bubble && hasAll(bubble, ['Bubble', 'BubbleContent']));
    const line = (text: string, align?: 'end') =>
      useBubble
        ? `<Message${align ? ' align="end"' : ''}><MessageContent><Bubble${align ? ' align="end"' : ''}><BubbleContent>${text}</BubbleContent></Bubble></MessageContent></Message>`
        : `<Message${align ? ' align="end"' : ''}><MessageContent>${text}</MessageContent></Message>`;
    return {
      ownNames: ['Message', 'MessageContent'],
      imports: useBubble ? [{ path: bubble!.importPath, names: ['Bubble', 'BubbleContent'] }] : [],
      jsx: [
        `<MessageGroup style={{ width: 320 }}>`,
        `  ${line("Hey! How's the new design coming along?")}`,
        `  ${line("Almost done — I'll share a preview shortly.", 'end')}`,
        `</MessageGroup>`,
      ].join('\n  '),
    };
  },

  'message-scroller': (c) => {
    if (!hasAll(c, ['MessageScrollerProvider', 'MessageScroller', 'MessageScrollerViewport', 'MessageScrollerContent', 'MessageScrollerItem'])) return undefined;
    return {
      ownNames: ['MessageScrollerProvider', 'MessageScroller', 'MessageScrollerViewport', 'MessageScrollerContent', 'MessageScrollerItem'],
      jsx: [
        `<MessageScrollerProvider>`,
        `  <MessageScroller style={{ height: 160, width: 280 }}>`,
        `    <MessageScrollerViewport>`,
        `      <MessageScrollerContent>`,
        `        <MessageScrollerItem>Message one</MessageScrollerItem>`,
        `        <MessageScrollerItem>Message two</MessageScrollerItem>`,
        `        <MessageScrollerItem>Message three</MessageScrollerItem>`,
        `        <MessageScrollerItem>Message four</MessageScrollerItem>`,
        `      </MessageScrollerContent>`,
        `    </MessageScrollerViewport>`,
        `  </MessageScroller>`,
        `</MessageScrollerProvider>`,
      ].join('\n  '),
    };
  },

  questionnaire: (c) => {
    if (!hasAll(c, ['Questionnaire', 'QuestionnaireItem', 'QuestionnaireTitle', 'QuestionnaireChoices', 'QuestionnaireChoice'])) return undefined;
    return {
      ownNames: ['Questionnaire', 'QuestionnaireItem', 'QuestionnaireTitle', 'QuestionnaireChoices', 'QuestionnaireChoice'],
      jsx: [
        `<Questionnaire defaultItem="plan" style={{ width: 320 }}>`,
        `  <QuestionnaireItem name="plan">`,
        `    <QuestionnaireTitle>Choose a plan</QuestionnaireTitle>`,
        `    <QuestionnaireChoices>`,
        `      <QuestionnaireChoice value="starter">Starter</QuestionnaireChoice>`,
        `      <QuestionnaireChoice value="pro">Pro</QuestionnaireChoice>`,
        `      <QuestionnaireChoice value="enterprise">Enterprise</QuestionnaireChoice>`,
        `    </QuestionnaireChoices>`,
        `  </QuestionnaireItem>`,
        `</Questionnaire>`,
      ].join('\n  '),
    };
  },

  sonner: (c, ctx) => {
    if (!has(c, 'Toaster') || !hasDependency(ctx.root, 'sonner')) return undefined;
    const trigger = buttonTrigger(ctx, 'Show notification');
    const button = (text:string, action:string) => trigger.jsx.replace('Show notification', text).replace(/<(Button|button)(?=[\s>])/, `<$1 onClick={() => ${action}}`);
    return {
      ownNames: ['Toaster'],
      imports: [...trigger.imports, {path:'sonner',names:['toast']}, {path:'react',names:['createElement','useState','useEffect']}],
      jsx: `{createElement(function NotificationDemo(){const [theme,setTheme]=useState<'light'|'dark'>(()=>typeof document!=='undefined'&&document.documentElement.classList.contains('dark')?'dark':'light');useEffect(()=>{const update=()=>setTheme(document.documentElement.classList.contains('dark')?'dark':'light');const observer=new MutationObserver(update);observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});update();return()=>observer.disconnect();},[]);return <div style={{display:'grid',gap:16}}><p style={{fontSize:13,color:'var(--muted-foreground)'}}>Send a notification to see your library’s toast styles.</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>${button('Show notification', "toast('Changes saved', {description:'Your workspace is up to date.'})")}${button('Success', "toast.success('Project published', {description:'Your team can now see the latest version.'})")}${button('Error', "toast.error('Could not save changes', {description:'Try again in a moment.'})")}</div><Toaster theme={theme} position="bottom-right" /></div>})}`,
    };
  },

  direction: (c, ctx) => {
    if (!has(c, 'DirectionProvider')) return undefined;
    const trigger = buttonTrigger(ctx, 'Left to right');
    const tabs = ctx.lookup('tabs');
    const tabsNames = ['Tabs','TabsList','TabsTrigger','TabsContent'];
    const hasTabs = tabs && hasAll(tabs,tabsNames);
    const control = (dir:string,label:string) => trigger.jsx.replace('Left to right',label).replace(/<(Button|button)(?=[\s>])/, `<$1 aria-pressed={direction==='${dir}'} onClick={()=>setDirection('${dir}')}`);
    return {
      ownNames: ['DirectionProvider'],
      imports: [...trigger.imports, {path:'react',names:['createElement','useState']}, ...(hasTabs ? [{path:tabs.importPath,names:tabsNames}] : [])],
      jsx: `{createElement(function DirectionDemo(){const [direction,setDirection]=useState('ltr');return <div style={{display:'grid',gap:20,maxWidth:520}}><div role="group" aria-label="Text direction" style={{display:'flex',gap:8}}>${control('ltr','Left to right')}${control('rtl','Right to left')}</div><DirectionProvider dir={direction}><section dir={direction} style={{display:'grid',gap:16,border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:20}}><p style={{fontSize:12,color:'var(--muted-foreground)'}}>{direction==='rtl'?'Right-to-left layout':'Left-to-right layout'}</p>${hasTabs ? '<Tabs defaultValue="account"><TabsList><TabsTrigger value="account">Account</TabsTrigger><TabsTrigger value="team">Team</TabsTrigger><TabsTrigger value="billing">Billing</TabsTrigger></TabsList><TabsContent value="account">Manage your profile and personal preferences.</TabsContent><TabsContent value="team">Invite teammates and manage access.</TabsContent><TabsContent value="billing">Review your plan and invoices.</TabsContent></Tabs>' : '<p>Manage your workspace and personal preferences.</p>'}<div style={{display:'flex',justifyContent:'space-between',gap:16}}><span>Start</span><span>End</span></div></section></DirectionProvider></div>})}`,
    };
  },

  chart: (c, ctx) => {
    if (!hasDependency(ctx.root, 'recharts')) return undefined; // exclusionReason() keeps this slug out of generation entirely in that case
    return {
      ownNames: [],
      imports: [{ path: 'recharts', names: ['BarChart', 'Bar', 'XAxis', 'CartesianGrid'] }],
      jsx: [
        `<ChartContainer config={{ visitors: { label: 'Visitors', color: 'var(--chart-1, var(--primary))' } }} style={{ width: 320 }}>`,
        `  <BarChart data={[{ month: 'Jan', visitors: 186 }, { month: 'Feb', visitors: 305 }, { month: 'Mar', visitors: 237 }]}>`,
        `    <CartesianGrid vertical={false} />`,
        `    <XAxis dataKey="month" tickLine={false} axisLine={false} />`,
        `    <Bar dataKey="visitors" fill="var(--color-visitors)" />`,
        hasAll(c, ['ChartTooltip', 'ChartTooltipContent']) ? `<ChartTooltip content={<ChartTooltipContent />} />` : '',
        hasAll(c, ['ChartLegend', 'ChartLegendContent']) ? `<ChartLegend content={<ChartLegendContent />} />` : '',
        `  </BarChart>`,
        `</ChartContainer>`,
      ].join('\n  '),
    };
  },

  sidebar: (c) => {
    if (!hasAll(c, ['SidebarProvider', 'Sidebar', 'SidebarHeader', 'SidebarContent', 'SidebarGroup', 'SidebarGroupLabel', 'SidebarGroupContent', 'SidebarMenu', 'SidebarMenuItem', 'SidebarMenuButton', 'SidebarInset'])) return undefined;
    return {
      ownNames: ['SidebarProvider', 'Sidebar', 'SidebarHeader', 'SidebarContent', 'SidebarGroup', 'SidebarGroupLabel', 'SidebarGroupContent', 'SidebarMenu', 'SidebarMenuItem', 'SidebarMenuButton', 'SidebarInset'],
      jsx: [
        `<SidebarProvider style={{ height: 320, width: 480 }}>`,
        `  <Sidebar collapsible="none" className="w-56">`,
        `    <SidebarHeader><div style={{ fontSize: 14, fontWeight: 500, padding: 8 }}>Acme Inc</div></SidebarHeader>`,
        `    <SidebarContent>`,
        `      <SidebarGroup>`,
        `        <SidebarGroupLabel>Platform</SidebarGroupLabel>`,
        `        <SidebarGroupContent>`,
        `          <SidebarMenu>`,
        `            <SidebarMenuItem><SidebarMenuButton isActive>Dashboard</SidebarMenuButton></SidebarMenuItem>`,
        `            <SidebarMenuItem><SidebarMenuButton>Projects</SidebarMenuButton></SidebarMenuItem>`,
        `            <SidebarMenuItem><SidebarMenuButton>Settings</SidebarMenuButton></SidebarMenuItem>`,
        `          </SidebarMenu>`,
        `        </SidebarGroupContent>`,
        `      </SidebarGroup>`,
        `    </SidebarContent>`,
        `  </Sidebar>`,
        `  <SidebarInset><div style={{ padding: 16, fontSize: 14 }}>Main content</div></SidebarInset>`,
        `</SidebarProvider>`,
      ].join('\n  '),
    };
  },

  combobox: (c) => {
    if (!hasAll(c, ['ComboboxInput', 'ComboboxContent', 'ComboboxList', 'ComboboxItem'])) return undefined;
    return {
      ownNames: ['ComboboxInput', 'ComboboxContent', 'ComboboxList', 'ComboboxItem'],
      jsx: [
        `<Combobox items={['Apple', 'Banana', 'Blueberry']} defaultValue="Blueberry" defaultOpen>`,
        `  <ComboboxInput placeholder="Search fruit..." />`,
        `  <ComboboxContent>`,
        `    <ComboboxList>`,
        `      <ComboboxItem value="Apple">Apple</ComboboxItem>`,
        `      <ComboboxItem value="Banana">Banana</ComboboxItem>`,
        `      <ComboboxItem value="Blueberry">Blueberry</ComboboxItem>`,
        `    </ComboboxList>`,
        `  </ComboboxContent>`,
        `</Combobox>`,
      ].join('\n  '),
    };
  },
};

/** The curated example for `component`, or `undefined` when its slug isn't in the catalog (or the
 *  template's required parts aren't actually present) — the caller (stories.ts) falls back to the
 *  compound/generic path in that case. */
export function catalogStory(component: ComponentInfo, root: string, lookup: Lookup): CatalogResult | undefined {
  const example = CATALOG[component.slug]?.(component, { root, lookup });
  if (!example) return undefined;
  const own = names(component);
  const imported = new Set(example.imports?.flatMap((entry) => entry.names) ?? []);
  const referenced = [...example.jsx.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)].map((match) => match[1]);
  if (referenced.some((name) => !own.has(name) && !imported.has(name))) return undefined;
  return { ...example, ownNames: [...new Set([...example.ownNames, ...referenced.filter((name) => own.has(name) && name !== component.exportName)])] };
}
