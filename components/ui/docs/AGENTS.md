# Repository Guidelines

## Project Structure & Module Organization
The authoritative product runtime sources are `src-ts/runtime-executables/**`; generate the corresponding `main.js`, `ems/`, `lib/`, and browser JavaScript using `npm run sync:ts-runtime-executables`. Typed helpers also live in the other `src-ts/` directories. Preserve manually typed runtime mirrors and use the existing build workflow; never overwrite them with untyped copies. See [Quellcode-Wegweiser](QUELLCODE_WEGWEISER_DE.md).

`main.js` is the adapter entry point. EMS logic lives in `ems/`, with reusable control modules in `ems/modules/` and consumer integrations in `ems/consumers/`. Static UI pages and assets are in `www/`. ioBroker admin resources are split between legacy/static files in `admin/` and the React admin tab source in `src-admin-tab/`; the built output lands in `admin/react/`. Maintenance scripts such as version bumping and hook installation live in `scripts/`.

## Build, Test, and Development Commands
Use Node.js locally; the package declares `>=22`; release validation must use Node.js 22 or newer.

- `npm install`: install root dependencies.
- `npm run start` or `npm run dev`: run the adapter locally via `node main.js`.
- `npm run admin:install`: install the React admin tab dependencies in `src-admin-tab/`.
- `npm run admin:build`: build the Vite admin tab into `admin/react/`.
- `npm run build`: alias for the admin build.
- `npm run githooks:install`: enable the staged-index secret-check pre-commit hook.
- `npm run check:secrets`: check supported SMTP credential patterns, private keys, installation files and obsolete frontend entry bundles without printing values.
- `npm run release:prepare`: scan the complete working tree, verify the current Admin build and back up unused old entry bundles outside the repository. Runs automatically before the immutable artifact gate in `prepublishOnly`; never replaces that gate or bypasses secret findings.
- `npm run bump:patch` / `bump:minor` / `bump:major`: update version files before release work.

## Coding Style & Naming Conventions
Documentation is a permanent part of every change. Follow [DOKUMENTATIONSSTANDARD_DE.md](DOKUMENTATIONSSTANDARD_DE.md): maintain the German module explanation, document nontrivial functions and their inputs/units, outputs, dependencies, side effects and safety constraints. Preserve useful comments and correct outdated explanations. Review the meaning first, then run `npm run docs:build` and `npm run docs:check`. Generation is not a substitute for reviewing the explanation. Keep **all Markdown files under `docs/`**, including repository instructions and generated source indexes.

Follow the existing style in the repository: 2-space indentation, semicolons, and single quotes in JavaScript and JSX. Use `PascalCase` for React components (`InstallerPage.jsx`), `camelCase` for functions and variables, and kebab-case for module filenames such as `storage-control.js`. Keep new admin UI work in React under `src-admin-tab/`; do not introduce new Materialize-based admin screens.

## Testing Guidelines
The repository contains automated release, runtime, type, UI-contract, EMS and regression checks. Before any release, run `npm run test:all`, `npm run build:ts`, `npm run publish:check`, and `npm pack --dry-run --json --ignore-scripts`. Hardware-facing changes additionally require project-specific commissioning in diagnostic mode before activation.

Release validation must cover both fresh extraction and overlaying the new ZIP onto a previous repository with old Admin assets. Keep `test:stable-1.0.12-publish` in `test:all`; verify backup contents, repeated preparation, indirect/declared chunks, modified current builds and real secret failures. Test the full `prepublishOnly` chain against a local test registry without publishing externally. Do not rely on a clean workspace alone. Product sources, tested assets and the artifact manifest must never be rebuilt or resealed automatically during publishing.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit prefixes such as `feat:` and `chore:`. Keep messages imperative and scoped to one change. After `npm run githooks:install`, the pre-commit hook checks every staged index blob for supported secret patterns; it does not auto-bump versions. Use the explicit version helpers before release work. PRs should include a short description, linked issue if applicable, affected UI screenshots for visual changes, and a note confirming manual validation steps.

## Security & Configuration Tips
Treat `io-package.json` and `admin/jsonConfig.json` as contract files for adapter configuration. Avoid committing secrets, customer-specific endpoints, or generated artifacts outside the expected build output in `admin/react/`.
