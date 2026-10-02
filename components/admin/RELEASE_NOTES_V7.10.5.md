# Release Notes 7.10.5

Version 7.10.5 is the administrator-rights and RBAC correction for NexoWatt EOS Admin.

- Restores unrestricted administrator datapoint writes and reversible expert mode.
- Removes the legacy DOM-text role classifier that could misclassify `system.user.admin`.
- Keeps ioBroker Admin and XTerm visible for administrators only.
- Exposes Datapoints to End Users as read-only and denies End User state writes in the backend.
- Blocks App Center, License, Simulation and normal account administration for Installer/End User.
- Stores navigation visibility/order in `eos-admin.0.info.uiTabsVisible` instead of `system.config`, avoiding adapter restarts.
- Shows backup navigation only for enabled backup instances.
