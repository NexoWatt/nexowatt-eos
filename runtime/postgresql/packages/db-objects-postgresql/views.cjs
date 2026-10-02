'use strict';

// Exact reviewed ioBroker 7.2.2 built-in definitions. Database text is compared,
// never executed. Additional adapter views require explicit review and tests.
const definitions = new Map();
for (const type of ['host', 'adapter', 'instance', 'meta', 'device', 'channel', 'state', 'folder', 'enum', 'script', 'chart']) {
    definitions.set(`function(doc) { if (doc.type === '${type}') emit(doc._id, doc) }`, { type, key: 'id', value: 'document' });
}
for (const type of ['group', 'user', 'config']) {
    definitions.set(`function(doc) { if (doc.type === '${type}') emit(doc.common.name, doc) }`, { type, key: 'name', value: 'document' });
}
definitions.set("function(doc) { if (doc.type === 'instance') emit(doc._id, parseInt(doc._id.split('.').pop(), 10)) }", { type: 'instance', key: 'id', value: 'instanceNumber', reduce: '_stats' });
definitions.set("function(doc) { doc.type === 'state' && doc.common && doc.common.custom && emit(doc._id, doc.common.custom) }", { type: 'state', key: 'id', value: 'custom', custom: true });
definitions.set("function(doc) { doc.type === 'state' && doc.common && doc.common.custom && emit(doc._id, doc) }", { type: 'state', key: 'id', value: 'document', custom: true });

function reviewView(view) {
    if (!view || typeof view !== 'object' || typeof view.map !== 'string' || view.map.length > 4096) throw new Error('EOS_PG_VIEW_UNSUPPORTED');
    const definition = definitions.get(view.map);
    if (!definition || (view.reduce !== undefined && view.reduce !== definition.reduce)) throw new Error('EOS_PG_VIEW_UNSUPPORTED');
    return definition;
}

function applyView(view, documents) {
    const definition = reviewView(view);
    const rows = [];
    for (const doc of documents) {
        if (!doc || doc.type !== definition.type || (definition.custom && !doc.common?.custom)) continue;
        const id = definition.key === 'name' ? doc.common?.name : doc._id;
        const value = definition.value === 'custom' ? doc.common.custom : definition.value === 'instanceNumber' ? Number.parseInt(doc._id.split('.').pop(), 10) : doc;
        if (definition.value === 'instanceNumber' && !Number.isFinite(value)) throw new Error('EOS_PG_VIEW_INVALID_INSTANCE_ID');
        rows.push({ id, value });
    }
    if (view.reduce === '_stats') {
        let max = null;
        for (const row of rows) max = max === null ? row.value : Math.max(max, row.value);
        return { rows: max === null ? [] : [{ id: '_stats', value: { max } }] };
    }
    return { rows };
}

module.exports = { reviewView, applyView };
