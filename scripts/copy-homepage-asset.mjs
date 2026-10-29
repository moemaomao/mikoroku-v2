import { access, copyFile } from "node:fs/promises";
import { join } from "node:path";

const homepage = join(process.cwd(), ".next", "server", "app", "index.html");
const seriesShell = join(process.cwd(), ".next", "server", "app", "series-shell.html");
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
