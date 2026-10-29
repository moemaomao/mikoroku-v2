import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const homepage = join(process.cwd(), ".next", "server", "app", "index.html");
const seriesShell = join(process.cwd(), ".next", "server", "app", "series-shell.html");
const prerenderManifestPath = join(process.cwd(), ".next", "prerender-manifest.json");
const assets = join(process.cwd(), ".open-next", "assets");
const copies = [
  { source: homepage, destination: join(assets, "index.html"), label: "homepage" },
  { source: seriesShell, destination: join(assets, "series-shell.html"), label: "series shell" },
];

for (const { source, destination, label } of copies) {
  try {
    await access(source);
  } catch (error) {
    throw new Error(`Prerendered ${label} not found at ${source}.`, { cause: error });
  }

  await copyFile(source, destination);
  console.log(`Copied prerendered ${label} to ${destination}.`);
}

const prerenderManifest = JSON.parse(await readFile(prerenderManifestPath, "utf8"));
const staticPages = {};

for (const [route, details] of Object.entries(prerenderManifest.routes || {})) {
  if (
    route.startsWith("/_") ||
    details.routeType !== "page" ||
    details.compute !== "static" ||
    details.response !== "complete"
  ) {
    continue;
  }

  const normalizedRoute = route.endsWith("/") && route !== "/" ? route.slice(0, -1) : route;
  const routeFile = normalizedRoute === "/" ? "index.html" : `${normalizedRoute.slice(1)}.html`;
  const source = join(process.cwd(), ".next", "server", "app", routeFile);
  const assetPath = normalizedRoute === "/"
    ? "/__static_pages/index.html"
    : `/__static_pages${normalizedRoute}.html`;
  const destination = join(assets, assetPath.slice(1));

  try {
    await access(source);
  } catch (error) {
    throw new Error(`Prerendered static page "${route}" not found at ${source}.`, { cause: error });
  }

  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  staticPages[normalizedRoute] = assetPath;
}

const staticPagesManifestPath = join(assets, "__static_pages", "manifest.json");
await mkdir(dirname(staticPagesManifestPath), { recursive: true });
await writeFile(staticPagesManifestPath, JSON.stringify(staticPages));
console.log(`Copied ${Object.keys(staticPages).length} static page routes to ${join(assets, "__static_pages")}.`);
