#!/bin/bash
# NexoWatt Linux/systemd review profile, 2026-09-30. Function definitions only.
eos_preflight() {
    export PATH=/usr/sbin:/usr/bin:/sbin:/bin
    export IOB_NO_SETCAP=true
    unset NODE_OPTIONS NODE_PATH LD_PRELOAD LD_LIBRARY_PATH BASH_ENV ENV CDPATH
    umask 077
    if [[ $(uname -s) != Linux || $(ps -p 1 -o comm=) != systemd ]]; then
        echo 'This EOS hardening profile requires Linux with systemd; no legacy fallback.' >&2
        return 1
    fi
    if [[ $(id -un) == iobroker || -n ${IOB_FORCE_INITD:-} ]]; then
        echo 'Run reviewed maintenance as an OS administrator with systemd.' >&2
        return 1
    fi
    local arg
    for arg in "$@"; do
        if [[ "$arg" == --redis || "$arg" == --redis=* ]]; then
            echo 'Legacy --redis provisioning is disabled. See docs/security/RUNTIME_TLS.md.' >&2
            return 1
        fi
    done
}

eos_run_as_runtime() {
    if [[ $EUID == 0 ]]; then
        /usr/bin/env -i HOME=/home/iobroker PATH=/usr/sbin:/usr/bin:/sbin:/bin IOB_NO_SETCAP=true \
            /usr/sbin/runuser --user iobroker -- "$@"
    else
        /usr/bin/sudo -H -u iobroker /usr/bin/env IOB_NO_SETCAP=true "$@"
    fi
}

eos_install_service() (
    set -euo pipefail
    [[ $EUID == 0 ]] || exit 1
    eos_cli_secure_directory /etc/systemd/system || exit 1
    local staging
    staging=$(/usr/bin/mktemp -d /etc/systemd/system/.eos-service.XXXXXXXX)
    trap '/usr/bin/rm -rf -- "$staging"' EXIT
    cat >"$staging/iobroker.service" <<'EOS_SERVICE'
[Unit]
Description=NexoWatt EOS ioBroker (review profile)
After=network.target

[Service]
Type=simple
User=iobroker
Group=iobroker
Environment=IOB_NO_SETCAP=true
Environment=NODE_OPTIONS=
Environment=NODE_PATH=
WorkingDirectory=/opt/iobroker
UMask=0077
NoNewPrivileges=true
CapabilityBoundingSet=
AmbientCapabilities=
RestrictSUIDSGID=true
ExecStartPre=/usr/bin/node /usr/local/libexec/nexowatt-eos/verify-runtime-tls.cjs /opt/iobroker/iobroker-data/iobroker.json
ExecStart=/usr/bin/node /opt/iobroker/node_modules/iobroker.js-controller/controller.js
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOS_SERVICE
    /usr/bin/chmod 0644 "$staging/iobroker.service"
    /usr/bin/mv -fT -- "$staging/iobroker.service" /etc/systemd/system/iobroker.service
    /usr/bin/systemctl daemon-reload
    # Provisioning/plant acceptance must precede operator-controlled enable/start.
    /usr/bin/systemctl disable iobroker.service
)

eos_install_profile() {
    local status
    # %q transports reviewed source as shell data, never evaluates template text.
    {
        printf '%s\n' "$EOS_CLI_INSTALLER_SOURCE" "$EOS_PROFILE_SOURCE"
        printf 'EOS_CLI_TEMPLATE=%q\n' "$EOS_CLI_TEMPLATE"
        printf 'EOS_TLS_VALIDATOR_SOURCE=%q\n' "$EOS_TLS_VALIDATOR_SOURCE"
        printf '%s\n' 'EOS_CLI_INSTALL_STOPPED=true' \
            'eos_install_cli && eos_install_runtime_guard && eos_install_service'
    } | if [[ $EUID == 0 ]]; then
        /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -s
    else
        /usr/bin/sudo /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin /bin/bash --noprofile --norc -s
    fi
    status=$?
    return "$status"
}
