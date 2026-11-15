import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    platform: "node",
    target: "node18",
    // Express and its types come from the user's app; never copy them into our output.
    deps: {
        neverBundle: [/^express/, /^@types\//],
    },
});
