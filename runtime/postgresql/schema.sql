-- Fresh, isolated EOS database only. Executed by a trusted migration identity,
-- NEVER by a controller/adapter role. Do not apply to an existing installation.
BEGIN;
CREATE ROLE eos_store_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE eos_objects LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE eos_states LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA eos_store AUTHORIZATION eos_store_owner;
CREATE TABLE eos_store.schema_version (singleton boolean PRIMARY KEY CHECK(singleton),version integer NOT NULL CHECK(version=1));
INSERT INTO eos_store.schema_version VALUES(true,1);
CREATE TABLE eos_store.kv (
 domain text NOT NULL CHECK(domain IN ('objects','states')),
 key text NOT NULL CHECK(octet_length(key) BETWEEN 1 AND 1024),
 value bytea NOT NULL CHECK(octet_length(value)<=16777216),
 expires_at timestamptz,
 PRIMARY KEY(domain,key)
);
CREATE INDEX kv_expiry ON eos_store.kv(domain,expires_at) WHERE expires_at IS NOT NULL;
CREATE TABLE eos_store.events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 domain text NOT NULL CHECK(domain IN ('objects','states')),
 channel text NOT NULL CHECK(octet_length(channel) BETWEEN 1 AND 1024),
 payload bytea NOT NULL CHECK(octet_length(payload)<=1048576),
 expired boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX events_retention ON eos_store.events(domain,created_at);
ALTER TABLE eos_store.schema_version OWNER TO eos_store_owner;
ALTER TABLE eos_store.kv OWNER TO eos_store_owner;
ALTER TABLE eos_store.events OWNER TO eos_store_owner;
ALTER TABLE eos_store.kv ENABLE ROW LEVEL SECURITY;
ALTER TABLE eos_store.kv FORCE ROW LEVEL SECURITY;
ALTER TABLE eos_store.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE eos_store.events FORCE ROW LEVEL SECURITY;
CREATE POLICY kv_scope ON eos_store.kv USING (
 (current_user='eos_objects' AND domain='objects') OR (current_user='eos_states' AND domain='states')
) WITH CHECK ((current_user='eos_objects' AND domain='objects') OR (current_user='eos_states' AND domain='states'));
CREATE POLICY events_scope ON eos_store.events USING (
 (current_user='eos_objects' AND domain='objects') OR (current_user='eos_states' AND domain='states')
) WITH CHECK ((current_user='eos_objects' AND domain='objects') OR (current_user='eos_states' AND domain='states'));
REVOKE ALL ON ALL TABLES IN SCHEMA eos_store FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA eos_store FROM PUBLIC;
GRANT USAGE ON SCHEMA eos_store TO eos_objects,eos_states;
GRANT SELECT ON eos_store.schema_version TO eos_objects,eos_states;
GRANT SELECT,INSERT,UPDATE,DELETE ON eos_store.kv,eos_store.events TO eos_objects,eos_states;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA eos_store TO eos_objects,eos_states;
-- Domain isolation is enforced here. Per-adapter identity/namespace grants are
-- a separate unresolved production gate; these two roles are NOT that gate.
COMMIT;
