'use strict';
// Reproduce the offline structural schema check with Ajv from the authenticated
// unchanged R8 installed dependency tree. No package installation is performed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const [file, validatorApp, output] = process.argv.slice(2);
if (!file || !validatorApp || !output) throw new Error('usage: node validate-final-schema.cjs SBOM AUTHENTICATED_APP OUTPUT');
const req = createRequire(path.resolve(validatorApp, 'package.json'));
const Ajv = req('ajv'), formats = req('ajv-formats'), warnings = new Set();
const ajv = new Ajv({ allErrors: true, strict: false, logger: { log() {}, warn(value) { warnings.add(String(value)); }, error: console.error } });
formats(ajv);
const schemaDir = path.resolve(__dirname, '../../../tools/integration/vendor/cyclonedx-1.5');
for (const name of fs.readdirSync(schemaDir).filter(name => name.endsWith('.schema.json'))) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(schemaDir, name))));
const bytes = fs.readFileSync(file), validate = ajv.getSchema('http://cyclonedx.org/schema/bom-1.5.schema.json');
const valid = validate(JSON.parse(bytes));
const result = { schemaVersion: 1, results: [{ file: path.basename(file), sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    schema: 'CycloneDX1.5', validator: 'Ajv ' + req('ajv/package.json').version,
    validatorSource: 'authenticated unchanged R8 installed dependency tree', offline: true,
    validationScope: 'JSON Schema draft-07 structure and supported ajv-formats; unsupported format annotations listed separately',
    unsupportedFormats: [...new Set([...warnings].flatMap(message => /unknown format "([^"]+)"/.exec(message)?.[1] || []))].sort(),
    errorCount: validate.errors?.length || 0, errors: validate.errors || [], valid }] };
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ valid, errorCount: validate.errors?.length || 0, unsupportedFormats: result.results[0].unsupportedFormats }));
process.exitCode = valid ? 0 : 1;
