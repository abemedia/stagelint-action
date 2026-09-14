/** @type {import("prettier").Config} */
export default {
  singleQuote: true,
  printWidth: 100,
  proseWrap: 'always',
  overrides: [{ files: 'pnpm-lock.yaml', options: { rangeEnd: 0 } }], // Ignore lock file.
}
