import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

/**
 * Firefox ArrayBuffer cross-realm fix.
 *
 * In Firefox + Tampermonkey, `instanceof ArrayBuffer` fails because the
 * ArrayBuffer constructor from the userscript scope differs from the page
 * scope. Replace with the canonical Object.prototype.toString() check.
 *
 * Socket.IO uses `instanceof ArrayBuffer` internally when encoding/decoding
 * binary packets, so without this fix the socket connection silently fails
 * on Firefox.
 */
function applyFirefoxArrayBufferFix(code) {
  return code.replace(
    /(\w+(?:\[\d+\])?)\s+instanceof\s+ArrayBuffer/g,
    (match, varName) => {
      return `Object.prototype.toString.call(${varName}) === '[object ArrayBuffer]'`;
    }
  );
}

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/ftl-ext-sdk.bundle.js',
      format: 'iife',
      name: 'FTL',
      sourcemap: true,
      plugins: [
        {
          name: 'ftl-arraybuffer-fix',
          renderChunk(code) {
            return applyFirefoxArrayBufferFix(code);
          },
        },
      ],
    },
    {
      file: 'dist/ftl-ext-sdk.bundle.min.js',
      format: 'iife',
      name: 'FTL',
      sourcemap: true,
      plugins: [
        terser({
          // Ensure the ArrayBuffer fix is also applied after minification
          // (terser can't mangle this pattern away since it's structural)
        }),
        {
          name: 'ftl-arraybuffer-fix-min',
          renderChunk(code) {
            return applyFirefoxArrayBufferFix(code);
          },
        },
      ],
    },
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
  ],
  // socket.io-client and socket.io-msgpack-parser are regular dependencies
  // (not devDependencies), so they are NOT marked as external. Rollup will
  // resolve and bundle them automatically.
  external: [],
};
