import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const appBundleDirectory = resolve("app/widgets/emoji-reaction/dist");
const publicBundlePath = resolve("public/widgets/emoji-reaction.js");

export default defineConfig({
  publicDir: false,
  plugins: [
    svelte({ compilerOptions: { customElement: true } }),
    {
      name: "copy-emoji-bundle-to-public",
      writeBundle() {
        mkdirSync(resolve("public/widgets"), { recursive: true });
        copyFileSync(resolve(appBundleDirectory, "emoji-reaction.js"), publicBundlePath);
      },
    },
  ],
  build: {
    target: "es2017",
    lib: {
      entry: "app/widgets/emoji-reaction/emoji.svelte",
      formats: ["es"],
      fileName: () => "emoji-reaction.js",
    },
    outDir: appBundleDirectory,
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        assetFileNames: "emoji-reaction.[ext]",
      },
    },
  },
});
