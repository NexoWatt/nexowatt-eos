# NPM publication 7.10.7

1. Use a freshly extracted repository ZIP.
2. Run `npm publish --dry-run`.
3. Confirm version `7.10.7`, complete `build/` runtime and all active `adminWww` runtime files.
4. Verify the Installer EMS self-test and role-security self-test are successful.
5. Publish with `npm publish` only after the dry run succeeds.

No `npm install`, `npm ci`, `tsc` or `tsx` is required for the sealed prebuilt release.
