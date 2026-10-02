# NexoWatt EOS Admin 7.9.94 – Stable candidate

## Stable scope

- Standard port 8081 and authentication enabled.
- Initial commissioning credentials for `installer`, `guest`, and `user`: password `nexowatt`.
- A personal password is mandatory immediately after the first successful login.
- The old passwordless activation flow is disabled.
- Admin/Service credentials are never changed by the bootstrap.
- EOS Assist is disabled in this stable release and will return only after its separate read-only redesign and acceptance.
- The login card remains fully usable when validation or authentication errors are shown.
- Customer-visible publisher: NexoWatt; technical npm identity remains `iobroker.eos-admin` for update compatibility.

## Security note

The shared commissioning password is only an initial credential. Commissioning is not complete until installer and customer accounts have replaced it with personal passwords. Shipping a system with the initial credential still active is not permitted.
