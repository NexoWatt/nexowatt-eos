# NexoWatt EOS Admin v7.9.74

Stability fix for writable scalar datapoints. Boolean/button direct writes remain native; number, string, enum/states and JSON values open the native ObjectBrowser value dialog through a capture-phase handler. The edit dialog is explicitly layered above the fixed EOS shell. Read-only states remain protected by `common.write=false`.
