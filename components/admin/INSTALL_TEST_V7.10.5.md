# Installation test 7.10.5

- Install/update EOS Admin 7.10.5 and verify port 8081 remains reachable.
- Sign in as Admin: datapoints are writable; expert mode can be enabled and disabled; Admin and XTerm overview cards are visible.
- Sign in as Installer: no expert head, ioBroker Admin, XTerm, App Center, License, Simulation or Users/Rights page.
- Sign in as End User: Datapoints tab is visible but every write/edit/delete action is disabled; restricted tools are absent.
- Toggle a navigation item with the pencil: EOS Admin must not restart and `system.config` must remain untouched.
- Disable the backup adapter: its navigation item disappears; re-enable it and the item returns.
