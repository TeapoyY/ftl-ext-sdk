import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/ftl-ext-sdk.bundle.js',
      format: 'umd',
      name: 'FTL',
      sourcemap: true,
    },
    {
      file: 'dist/ftl-ext-sdk.bundle.min.js',
      format: 'umd',
      name: 'FTL',
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [
    resolve({ browser: true }),
    commonjs(),
  ],
};
