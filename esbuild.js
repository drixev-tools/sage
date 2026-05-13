import { build } from 'esbuild'

await build({
    entryPoints: ["src/bin/app.ts"],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'dist/bin/app.js',
    sourcemap: true,
    minify: false,
    packages: 'external',
    banner: {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
    },
});

console.log("Build complete -> dist/bin/app.js");