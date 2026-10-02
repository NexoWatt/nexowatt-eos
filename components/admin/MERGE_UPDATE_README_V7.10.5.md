# Merge/update note 7.10.5

Always replace the previous repository with the complete 7.10.5 repository. Do not merge old `adminWww` bundles or deleted role-security files back into this release. In particular, `nexowatt-role-security.js` and `build/lib/eosRoleSecurity.js` are obsolete and must stay absent.

After a merge, run the package, stability, role-security and publish dry-run checks before publishing.

The 7.10.5 publish workflow now removes all three obsolete 7.10.4 role-security files automatically before sealing and packaging, including when the ZIP was extracted over an existing working directory.
