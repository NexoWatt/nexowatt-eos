-- R8-only operator wrapper authenticates the installed release and completed
-- first-start before this file is supplied to psql with ON_ERROR_STOP=1.
-- This is a compatibility flag for the already completed EOS setup; it does
-- not activate an EOS license, change credentials or permit physical control.
BEGIN;
SET LOCAL ROLE eos_objects;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '2s';
SET LOCAL idle_in_transaction_session_timeout = '5s';

DO $eos_r8_admin_setup$
DECLARE
    object_id text;
    object_bytes bytea;
    object_expiry timestamptz;
    document jsonb;
    documents jsonb := '{}'::jsonb;
    original_bytes bytea;
    updated_bytes bytea;
    system_document jsonb;
    enrollment jsonb;
    first_start jsonb;
    core jsonb;
    repositories jsonb;
    changed_rows bigint;
    event_id bigint;
BEGIN
    IF current_user <> 'eos_objects' OR
       (SELECT count(*) FROM eos_store.schema_version WHERE singleton AND version = 1) <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'EOS_R8_ADMIN_SETUP_SCHEMA';
    END IF;
    -- Match the shared mutation lock used by the signed PostgreSQL objects
    -- backend, so ACL/metadata mutations cannot interleave with this repair.
    PERFORM pg_advisory_xact_lock(hashtextextended('objects:mutation', 0));
    FOREACH object_id IN ARRAY ARRAY[
        'system.config', 'system.repositories', 'system.meta.eosTestBase',
        'system.meta.eosEnrollment', 'system.meta.eosFirstStart'
    ] LOOP
        SELECT value, expires_at INTO object_bytes, object_expiry
        FROM eos_store.kv
        WHERE domain = 'objects' AND key = 'cfg.o.' || object_id
        FOR UPDATE;
        IF NOT FOUND OR object_expiry IS NOT NULL OR octet_length(object_bytes) > 131072 THEN
            RAISE EXCEPTION USING MESSAGE = 'EOS_R8_ADMIN_SETUP_OBJECT';
        END IF;
        BEGIN
            document := convert_from(object_bytes, 'UTF8')::jsonb;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION USING MESSAGE = 'EOS_R8_ADMIN_SETUP_JSON';
        END;
        IF jsonb_typeof(document) IS DISTINCT FROM 'object' OR
           document->>'_id' IS DISTINCT FROM object_id OR
           jsonb_typeof(document->'common') IS DISTINCT FROM 'object' OR
           jsonb_typeof(document->'native') IS DISTINCT FROM 'object' OR
           document->>'type' IS DISTINCT FROM
               (CASE WHEN object_id LIKE 'system.meta.%' THEN 'meta' ELSE 'config' END) THEN
            RAISE EXCEPTION USING MESSAGE = 'EOS_R8_ADMIN_SETUP_OBJECT';
        END IF;
        documents := jsonb_set(documents, ARRAY[object_id], document);
        IF object_id = 'system.config' THEN original_bytes := object_bytes; END IF;
    END LOOP;

    system_document := documents->'system.config';
    repositories := documents->'system.repositories';
    core := documents->'system.meta.eosTestBase'->'native';
    enrollment := documents->'system.meta.eosEnrollment'->'native';
    first_start := documents->'system.meta.eosFirstStart'->'native';
    IF core->>'profile' IS DISTINCT FROM 'eos-core-only-bootstrap-v1' OR
       core->>'state' IS DISTINCT FROM 'complete' OR
       core->>'coreControllerVersion' IS DISTINCT FROM '7.2.2' OR
       core->'bootstrapPolicyVersion' IS DISTINCT FROM '1'::jsonb OR
       COALESCE(core->>'runtimeConfigSha256', '') !~ '^[a-f0-9]{64}$' OR
       enrollment->>'profile' IS DISTINCT FROM 'eos-integrated-ui-lab-v1' OR
       enrollment->'version' IS DISTINCT FROM '2'::jsonb OR
       enrollment->>'state' IS DISTINCT FROM 'complete' OR
       enrollment->'firstRunPolicyVersion' IS DISTINCT FROM '1'::jsonb OR
       enrollment->'accountPolicyVersion' IS DISTINCT FROM '1'::jsonb OR
       enrollment->'physicalControlEnabled' IS DISTINCT FROM 'false'::jsonb OR
       enrollment->>'runtimeConfigSha256' IS DISTINCT FROM core->>'runtimeConfigSha256' OR
       first_start->'schemaVersion' IS DISTINCT FROM '1'::jsonb OR
       first_start->>'state' IS DISTINCT FROM 'complete' OR
       first_start->'configurationValidated' IS DISTINCT FROM 'true'::jsonb OR
       first_start->'physicalControlEnabled' IS DISTINCT FROM 'false'::jsonb THEN
        RAISE EXCEPTION USING MESSAGE = 'EOS_R8_ADMIN_SETUP_INCOMPLETE';
    END IF;
    IF system_document#>>'{common,diag}' IS DISTINCT FROM 'none' OR
       system_document#>'{common,activeRepo}' IS DISTINCT FROM '[]'::jsonb OR
       system_document#>>'{common,adapterAutoUpgrade,defaultPolicy}' IS DISTINCT FROM 'none' OR
       system_document#>'{common,adapterAutoUpgrade,repositories}' IS DISTINCT FROM '{}'::jsonb OR
       repositories#>'{native,repositories}' IS DISTINCT FROM '{}'::jsonb OR
       repositories#>'{native,oldRepositories}' IS DISTINCT FROM '{}'::jsonb THEN
        RAISE EXCEPTION USING MESSAGE = 'EOS_R8_ADMIN_SETUP_POLICY';
    END IF;
    IF (system_document->'common') ? 'licenseConfirmed' AND
       jsonb_typeof(system_document#>'{common,licenseConfirmed}') IS DISTINCT FROM 'boolean' THEN
        RAISE EXCEPTION USING MESSAGE = 'EOS_R8_ADMIN_SETUP_FLAG';
    END IF;

    IF system_document#>'{common,licenseConfirmed}' IS DISTINCT FROM 'true'::jsonb THEN
        updated_bytes := convert_to(jsonb_set(system_document,
            '{common,licenseConfirmed}', 'true'::jsonb)::text, 'UTF8');
        UPDATE eos_store.kv SET value = updated_bytes
        WHERE domain = 'objects' AND key = 'cfg.o.system.config'
          AND value = original_bytes AND expires_at IS NULL;
        GET DIAGNOSTICS changed_rows = ROW_COUNT;
        IF changed_rows <> 1 THEN
            RAISE EXCEPTION USING MESSAGE = 'EOS_R8_ADMIN_SETUP_CHANGED';
        END IF;
        -- The row, event and NOTIFY commit together. Runtime subscribers get
        -- precisely the same object bytes without a controller restart.
        INSERT INTO eos_store.events(domain, channel, payload, expired)
        VALUES ('objects', 'cfg.o.system.config', updated_bytes, false)
        RETURNING id INTO event_id;
        PERFORM pg_notify('eos_objects_events', event_id::text);
    END IF;
END;
$eos_r8_admin_setup$;
COMMIT;
SELECT 'EOS_R8_ADMIN_SETUP_COMPLETE' AS status;
