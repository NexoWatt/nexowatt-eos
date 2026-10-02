'use strict';
// Contract-fixture helper, not a production SBOM generator. Only an actual
// applyToBuild result is used by the signed release/preflight fixtures.
const { sha256 } = require('../../../runtime/release/bundle.cjs');
function transformedComponent(name, version, profile) {
    const records = profile.files.filter(row => row.relativePath.startsWith(`node_modules/${name}/`))
        .map(({ relativePath, sha256 }) => ({ relativePath, sha256 }))
        .sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
    const component = { type: 'application', name, version, 'bom-ref': `${name}@${version}` };
    if (records.length) Object.assign(component, { modified: true,
        pedigree: { ancestors: [{ name, version }] },
        properties: [{ name: 'eos:transform:file-table-sha256', value: sha256(Buffer.from(JSON.stringify(records))) }] });
    return component;
}
module.exports = { transformedComponent };
