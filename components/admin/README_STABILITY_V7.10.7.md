# NexoWatt EOS Admin 7.10.7 – stability and RBAC baseline

This release retains the validated crash, package, update-placement, Admin-rights and End User read-only fixes from 7.10.2–7.10.6.

Role decisions continue to come exclusively from the authenticated `/nexowatt/security/context` response. Administrator remains the unconditional full-rights path. End User datapoints remain read-only in frontend and backend. Installer receives EMS App-Center access, while Simulation, License, expert mode, ioBroker Admin, XTerm and account administration remain restricted.

Menu edits continue to use the adapter state and must never write `system.config`.
