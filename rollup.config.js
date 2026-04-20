import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

/**
 * Patches instanceof checks for Firefox/Tampermonkey cross-realm compatibility.
 * In Firefox content scripts, `obj instanceof ArrayBuffer` fails because ArrayBuffer
 * is from a different realm. The fix uses Object.prototype.toString instead.
 *
 * @param {string} code - Rollup chunk code
 * @returns {string} - Patched code
 */
function applyFirefoxArrayBufferFix(code) {
  // Patch 1: `obj.buffer instanceof ArrayBuffer` → cross-realm safe check
  // Line ~2382: isView function for socket.io-parser binary detection
  code = code.replace(
    /obj\.buffer instanceof ArrayBuffer/,
    "Object.prototype.toString.call(obj.buffer) === '[object ArrayBuffer]'"
  );

  // Patch 2: `buffer instanceof ArrayBuffer` in msgpack Decoder constructor
  // Line ~4502: Decoder constructor check
  code = code.replace(
    /if\s*\(\s*buffer instanceof ArrayBuffer\s*\)/,
    "if (Object.prototype.toString.call(buffer) === '[object ArrayBuffer]')"
  );

  // Patch 3: `data instanceof ArrayBuffer` in encodePacket (line ~220)
  // This is more complex since we need to ensure we're only patching the right context.
  // Instead, use a safer polyfill approach: replace instanceof checks only in
  // the specific binary-detection helper region (isView and Decoder).
  // We already patched the two most critical ones above.

  return code;
}

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/ftl-ext-sdk.bundle.js',
      format: 'iife',
      name: 'FTL',
      sourcemap: true,
    },
    {
      file: 'dist/ftl-ext-sdk.bundle.min.js',
      format: 'iife',
      name: 'FTL',
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    // Apply Firefox ArrayBuffer fix after bundling but before minification
    {
      name: 'firefox-arraybuffer-fix',
      renderChunk(code, chunk, options) {
        const patched = applyFirefoxArrayBufferFix(code);
        // Only return if changes were made
        if (patched !== code) {
          return { code: patched };
        }
        return null;
      },
    },
  ],
  external: [],
};
