import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const appBundleDirectory = resolve("app/widgets/comment-widget/dist");
const publicBundlePath = resolve("public/widgets/comment-widget.js");
const publicStylesPath = resolve("public/widgets/comment-widget.css");
const publicRuntimePath = resolve("public/widgets/comment-runtime.js");
const runtimeSourcePath = resolve("app/widgets/comment-widget/comment-runtime.js");
const widgetSourceDirectory = resolve("app/widgets/comment-widget");
const featureStyles = [
  ["comment-dm.css", "comment-dm.css"],
  ["comment-report.css", "comment-report.css"],
  ["comment-settings.css", "comment-settings.css"],
  ["comment-effects.css", "comment-effects.css"],
] as const;

export default defineConfig({
  publicDir: false,
  plugins: [
    svelte({ compilerOptions: { customElement: true } }),
    {
      name: "copy-comment-bundle-to-public",
      writeBundle() {
        mkdirSync(resolve("public/widgets"), { recursive: true });
        copyFileSync(resolve(appBundleDirectory, "comment-widget.js"), publicBundlePath);
        const cssAsset = readdirSync(appBundleDirectory).find((file) => file.endsWith(".css"));
        if (!cssAsset) throw new Error("Comment widget CSS asset was not generated.");
        copyFileSync(resolve(appBundleDirectory, cssAsset), publicStylesPath);
        copyFileSync(runtimeSourcePath, publicRuntimePath);
        for (const [sourceName, publicName] of featureStyles) {
          copyFileSync(resolve(widgetSourceDirectory, sourceName), resolve("public/widgets", publicName));
        }
      },
    },
  ],
  build: {
    target: "es2017",
    lib: {
      entry: "app/widgets/comment-widget/comment.svelte",
      formats: ["es"],
      fileName: () => "comment-widget.js",
    },
    outDir: appBundleDirectory,
    emptyOutDir: true,
    cssMinify: true,
    minify: "esbuild",
    sourcemap: false,
  },
});
