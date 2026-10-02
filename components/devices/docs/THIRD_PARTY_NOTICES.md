# Third-Party Notices

This adapter is built on third-party libraries. Those components are licensed
under their respective licenses and remain subject to those terms.

This document is provided as a convenience and does **not** replace the
original license texts shipped with the third-party packages.

## Runtime Dependencies (via npm)

The following packages are referenced via `package.json` and are installed at
runtime using npm:

- `@iobroker/adapter-core`
- `modbus-serial`
- `mqtt`
- `axios`
- `serialport`

To review the exact license terms for a given build, inspect the corresponding
package metadata after installation, e.g.:

```bash
node -p "require('./node_modules/<package>/package.json').license"
```

or open the `LICENSE` / `LICENSE.md` file inside the package directory under
`node_modules/`.

## Important Note

If you add new third-party code or copy/paste code snippets into this project,
make sure you keep the required attributions and license texts, and verify
whether relicensing is permitted.
