const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: ['src/bin.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/bundle.js',
  external: [
    // No external dependencies - bundle everything
  ],
  minify: false,
  sourcemap: true,
  treeShaking: true,
}).catch(() => process.exit(1));
