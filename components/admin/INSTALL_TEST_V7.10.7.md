# Installation test 7.10.7

- Install/update EOS Admin 7.10.7 and verify port 8081 remains reachable.
- Sign in as Admin: all previous functions, datapoint writes, expert mode, Admin and XTerm remain available.
- Sign in as Installer: **EMS Apps öffnen** is visible and opens the EMS App-Center.
- Installer: Simulation and License remain hidden/blocked; expert head, ioBroker Admin, XTerm and Users/Rights remain unavailable.
- Sign in as End User: EMS App-Center, Simulation and License remain hidden/blocked; datapoints remain read-only.
- Confirm an End User cannot inherit an existing UI/Admin session on port 8188.
- Confirm navigation editing and backup visibility behavior remain restart-safe.
