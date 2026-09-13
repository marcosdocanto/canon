import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'lib');
rmSync(output, { recursive: true, force: true });

// Keep handwritten .js assets unchanged for the browser. Compile .ts to .mjs
// so compiled modules cannot overwrite neighboring browser assets.
const runtimeImports = (context) => {
  const specifier = (node) => node && ts.isStringLiteral(node) && /^\.\.?\//.test(node.text) && node.text.endsWith('.ts')
    ? context.factory.createStringLiteral(node.text.slice(0, -3) + '.mjs') : node;
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      return context.factory.updateImportDeclaration(node, node.modifiers, node.importClause, specifier(node.moduleSpecifier), node.attributes);
    }
    if (ts.isExportDeclaration(node)) {
      return context.factory.updateExportDeclaration(node, node.modifiers, node.isTypeOnly, node.exportClause, specifier(node.moduleSpecifier), node.attributes);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      return context.factory.updateCallExpression(node, node.expression, node.typeArguments, node.arguments.map(specifier));
    }
    return ts.visitEachChild(node, visit, context);
  };
  return (source) => ts.visitNode(source, visit);
};

function compile(dir, relative = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    const rel = join(relative, entry.name);
    if (entry.isDirectory()) { compile(path, rel); continue; }
    const target = join(output, rel.replace(/\.ts$/, '.mjs'));
    mkdirSync(dirname(target), { recursive: true });
    if (!entry.name.endsWith('.ts')) { copyFileSync(path, target); continue; }
    const result = ts.transpileModule(readFileSync(path, 'utf8'), {
      fileName: path,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, isolatedModules: true },
      transformers: { before: [runtimeImports] },
      reportDiagnostics: true,
    });
    const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: () => root, getCanonicalFileName: (f) => f, getNewLine: () => '\n',
    }));
    writeFileSync(target, result.outputText);
  }
}

compile(join(root, 'src'));
