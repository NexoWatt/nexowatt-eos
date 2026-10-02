# Merge/update note 7.10.7

Always replace the previous repository with the complete 7.10.7 repository. Do not merge old `adminWww` role runtime files back into this release.

The authoritative role policy in 7.10.7 allows the Installer to use the EMS App-Center, while Simulation and License remain Admin-only and the End User remains blocked.

After a merge, run package validation, stability checks, role-security checks and `npm publish --dry-run` before publishing.
