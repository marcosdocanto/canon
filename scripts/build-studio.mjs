import { build } from "esbuild";
import { Scanner } from "@tailwindcss/oxide";
import { compile, optimize } from "@tailwindcss/node";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const bundle = await build({
  entryPoints: [join(root, "studio/app.jsx")],
  outfile: join(root, "src/lib-editor/app.js"),
  bundle: true,
  metafile: true,
  minify: true,
  format: "esm",
  jsx: "automatic",
  legalComments: "linked",
  define: { "process.env.NODE_ENV": '"production"' },
});
const compiler = await compile(
  await readFile(join(root, "studio/style.css"), "utf8"),
  { base: join(root, "studio"), onDependency() {} },
);
const scanner = new Scanner({
  sources: [
    { base: join(root, "studio"), pattern: "**/*.{jsx,tsx}", negated: false },
  ],
});
await writeFile(
  join(root, "src/lib-editor/app.css"),
  optimize(compiler.build(scanner.scan()), { minify: true }).code,
);

// Retain complete license texts for every package included in the offline bundle.
const packages = new Set(
  Object.keys(bundle.metafile.inputs)
    .map((path) => path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1])
    .filter(Boolean),
);
packages.add("tw-animate-css");
let licenses = "Library Studio bundled dependencies\n";
for (const name of [...packages].sort()) {
  const directory = join(root, "node_modules", name);
  const files = await readdir(directory);
  const license = files.find((file) =>
    /^licen[cs]e(?:\.(?:md|txt))?$/i.test(file),
  );
  const licensePath = license
    ? join(directory, license)
    : join(root, "studio/licenses", `${name.replaceAll("/", "-")}.txt`);
  licenses += `\n--- ${name} ---\n\n${await readFile(licensePath, "utf8")}\n`;
}
await writeFile(join(root, "src/lib-editor/bundled-licenses.txt"), licenses);
