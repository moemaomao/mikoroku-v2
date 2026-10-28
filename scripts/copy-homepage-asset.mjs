import { access, copyFile } from "node:fs/promises";
import { join } from "node:path";

const homepage = join(process.cwd(), ".next", "server", "app", "index.html");
const assets = join(process.cwd(), ".open-next", "assets");
const destination = join(assets, "index.html");

try {
  await access(homepage);
} catch (error) {
  throw new Error(`Prerendered homepage not found at ${homepage}.`, { cause: error });
}

await copyFile(homepage, destination);
console.log(`Copied prerendered homepage to ${destination}.`);
