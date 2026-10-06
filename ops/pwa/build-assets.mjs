import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const lists = await Promise.all(entries.map(async entry => {
    const file = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(file) : /\.(?:js|css|woff2?)$/.test(entry.name) ? [file] : [];
  }));
  return lists.flat();
}
const staticRoot = path.join(root, ".next/static");
const chunks = await walk(staticRoot);
const publicPaths = [
  "/offline.html", "/images/zilber-logo.svg", "/images/bg-light.avif", "/images/bg-dark.avif",
  "/images/avatar-female.svg", "/images/avatar-male.svg", "/images/avatar-neutral.svg",
  "/fonts/vazirmatn-numbers.woff2", "/pwa/icon-192.png", "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png", "/pwa/apple-touch-icon.png",
];
const files = [...chunks, ...publicPaths.map(url => path.join(root, "public", url))];
const sizes = await Promise.all(files.map(file => stat(file).then(value => value.size)));
const assets = [...chunks.map(file => "/_next/static/" + path.relative(staticRoot, file).split(path.sep).join("/")), ...publicPaths].sort();
const build = (await readFile(path.join(root, ".next/BUILD_ID"), "utf8")).trim();
await writeFile(path.join(root, "public/app-assets.json"), JSON.stringify({ build, assets }));
console.log("App preload manifest: %s files, %s MB, build %s", assets.length, (sizes.reduce((a, b) => a + b, 0) / 1024 / 1024).toFixed(2), build);
