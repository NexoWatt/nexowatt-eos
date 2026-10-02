# NexoWatt EOS Admin v7.9.86

## Brand logo and assistant separation

This release keeps the validated v84 React/ObjectBrowser runtime and changes only the NexoWatt shell/support layer.

### Changes

- New wide NexoWatt EOS logo in the top-left product badge.
- Local **EOS Assist** remains available as an integrated NexoWatt help function.
- The upstream **ioBroker assistant / external MCP-AI ChatPanel** is no longer imported, mounted or shown.
- EOS Assist does not call an external AI provider; it remains a local context helper.
- Added an assistant-separation release test so the upstream assistant cannot be re-enabled unnoticed.

### Runtime

- Package: `7.9.86`
- React/ObjectBrowser runtime: `v84`
- NexoWatt shell cache: `v86`
