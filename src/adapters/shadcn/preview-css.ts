// Preview the project's CSS sources, never a replacement variant/animation catalog.
import { readFileSync, realpathSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, extname } from 'node:path';

function resolveCssImport(specifier:string, require:ReturnType<typeof createRequire>):string {
  const parts=specifier.split('/'), packageName=parts.slice(0,specifier.startsWith('@')?2:1).join('/');
  const subpath=specifier.slice(packageName.length), exportKey=subpath ? `.${subpath}` : '.';
  for(const directory of require.resolve.paths(packageName) ?? []){
    const packageRoot=resolve(directory,packageName), manifest=resolve(packageRoot,'package.json');
    if(!existsSync(manifest))continue;
    const pkg=JSON.parse(readFileSync(manifest,'utf8'));
    const entry=pkg.exports?.[exportKey] ?? (exportKey==='.' && typeof pkg.exports==='string'?pkg.exports:undefined);
    const target=typeof entry==='string'?entry:entry?.style;
    if(typeof target==='string')return resolve(packageRoot,target);
    if(exportKey==='.' && typeof pkg.style==='string')return resolve(packageRoot,pkg.style);
    break;
  }
  const path=require.resolve(specifier);
  if(!/\.css$/i.test(path))throw new Error('Import does not resolve to a stylesheet');
  return path;
}

export function readPreviewCss(file: string, stripManaged: (css: string) => string): {projectCss:string; previewWarnings:string[]; tailwindVersion?:string} {
  const warnings: string[] = [];
  const stack = new Set<string>();
  let tailwindVersion: string | undefined;
  const load = (path: string): string => {
    const actual=realpathSync(path);
    if(stack.has(actual)){warnings.push(`Circular stylesheet import: ${path}`);return '';}
    stack.add(actual);
    const require=createRequire(actual);
    let css=readFileSync(actual,'utf8');
    css=css.replace(/\/\*[\s\S]*?\*\/|@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?([^;]*);/g,(_all,specifier:string,qualifiers:string)=>{
      if(_all.startsWith('/*'))return _all;
      if(qualifiers.trim()){warnings.push(`Unsupported stylesheet import conditions: ${specifier}`);return '';}
      if(specifier==='tailwindcss'){
        try {tailwindVersion=JSON.parse(readFileSync(require.resolve('tailwindcss/package.json'),'utf8')).version;}
        catch {warnings.push('Installed Tailwind version could not be verified.');}
        return '';
      }
      if(/^(https?:|\/\/|data:)/.test(specifier)){warnings.push(`External stylesheet is not mirrored: ${specifier}`);return '';}
      try {return load(specifier.startsWith('.') || specifier.startsWith('/') ? resolve(dirname(actual),specifier) : resolveCssImport(specifier,require));}
      catch {warnings.push(`Stylesheet could not be loaded: ${specifier}`);return '';}
    });
    css=css.replace(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/g,(all,_quote,url:string)=>{
      if(/^(data:|https?:|\/\/|#)/.test(url))return all;
      try {
        const asset=resolve(dirname(actual),url.split(/[?#]/)[0]);
        const types:Record<string,string>={'.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
        return `url("data:${types[extname(asset)] ?? 'application/octet-stream'};base64,${readFileSync(asset).toString('base64')}")`;
      } catch {warnings.push(`Stylesheet asset could not be loaded: ${url}`);return 'url("")';}
    });
    if(/@tailwind\s+(base|components|utilities)\s*;/.test(css))warnings.push('Legacy Tailwind directives require the project build pipeline; this preview uses Tailwind 4.');
    css=css.replace(/@(plugin|config)\s+[^;{]+(?:;|\{[^}]*\})/g,(directive,kind)=>{warnings.push(`Project @${kind} requires its build pipeline and is not mirrored.`);return '';});
    stack.delete(actual);
    return stripManaged(css);
  };
  return {projectCss:load(file),previewWarnings:[...new Set(warnings)],...(tailwindVersion?{tailwindVersion}:{})};
}
