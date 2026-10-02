# Publishing

This repository is prepared for publication as the unscoped npm package `iobroker.eebus`.

## Registry publication

1. Ensure the package name `iobroker.eebus` is available for the NexoWatt npm account or organization.
2. Ensure the repository is available at `https://github.com/NexoWatt/ioBroker.eebus`.
3. Configure npm authentication locally or set `NPM_TOKEN` as a GitHub Actions secret.
4. Run the local checks:

```bash
npm install
npm run build
npm test
npm pack --dry-run
```

5. Publish manually if desired:

```bash
npm publish
```

The package contains `publishConfig.registry = https://registry.npmjs.org/`.

## HTTPS installation

After npm publication:

```bash
npm install iobroker.eebus
```

From GitHub via HTTPS during controlled rollout:

```bash
npm install git+https://github.com/NexoWatt/ioBroker.eebus.git
```

Because this repository contains a `build` script, npm may rebuild the package when installing directly from Git. Registry installs use the packed files, including the existing `build/` output.

## License warning

The package is not open source. The package metadata points to the included `LICENSE` file:

```json
"license": "SEE LICENSE IN LICENSE"
```

Public package availability does not grant usage, modification or redistribution rights to third parties.
