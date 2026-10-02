# NexoWatt EOS Admin 7.10.5 – stability and RBAC baseline

This release retains the validated 7.10.2–7.10.4 crash, package and update-placement fixes. Role decisions now come exclusively from the authenticated `/nexowatt/security/context` response. The removed heuristic must never be restored.

Administrator is an unconditional full-rights path. End User datapoints are read-only in both frontend and backend. Menu edits are persisted in an adapter state and must never write `system.config`.
