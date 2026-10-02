# NPM publication 7.10.5

1. Use a freshly extracted repository ZIP.
2. Run `npm publish --dry-run`.
3. Confirm version `7.10.5`, complete `build/` runtime and all active `adminWww/assets/*-v84.js` files.
4. Publish with `npm publish` only after the dry run succeeds.

No `npm install`, `npm ci`, `tsc` or `tsx` is required for the sealed prebuilt release.
