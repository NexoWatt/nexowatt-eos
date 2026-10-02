#!/bin/bash
# Function library only. The reviewed installer supplies EOS_CLI_TEMPLATE as
# data, invokes this in its privileged phase, and stops runtime processes first.

eos_cli_install_error() {
    printf 'EOS CLI installation: %s\n' "$1" >&2
    return 1
}

eos_cli_secure_directory() {
    local path="$1" meta owner mode
    [[ "$path" == /* ]] || return 1
    while :; do
        [[ -d "$path" && ! -L "$path" ]] || return 1
        meta=$(/usr/bin/stat -c '%u %a' -- "$path") || return 1
        read -r owner mode <<<"$meta"
        [[ "$owner" == 0 && "$mode" =~ ^[0-7]{3,4}$ ]] || return 1
        (( (8#$mode & 0022) == 0 )) || return 1
        [[ "$path" == / ]] && break
        path="${path%/*}"
        [[ -n "$path" ]] || path=/
    done
}

eos_cli_ensure_directory() {
    local path="$1" parent="${1%/*}"
    eos_cli_secure_directory "$parent" || return 1
    if [[ ! -e "$path" && ! -L "$path" ]]; then
        /usr/bin/install -d -o 0 -g 0 -m 0755 -- "$path" || return 1
    fi
    eos_cli_secure_directory "$path"
}

eos_cli_stopped_runtime() {
    local state status=0 runtime_uid
    [[ "${EOS_CLI_INSTALL_STOPPED:-}" == true ]] || return 1
    state=$(/usr/bin/systemctl is-active iobroker.service 2>/dev/null) || status=$?
    case "$state:$status" in inactive:3|inactive:4|unknown:4) ;; *) return 1 ;; esac
    runtime_uid=$(/usr/bin/id -u iobroker) || return 1
    [[ "$runtime_uid" =~ ^[0-9]+$ && "$runtime_uid" != 0 ]] || return 1
    status=0
    /usr/bin/pgrep -u "$runtime_uid" >/dev/null 2>&1 || status=$?
    [[ "$status" == 1 ]]
}

eos_install_cli() (
    # A subshell keeps the caller's options, environment and cleanup traps intact.
    set -euo pipefail
    export PATH=/usr/sbin:/usr/bin:/sbin:/bin
    unset NODE_OPTIONS NODE_PATH LD_PRELOAD LD_LIBRARY_PATH BASH_ENV ENV CDPATH
    [[ "$(/usr/bin/id -u)" == 0 ]] || { eos_cli_install_error 'A privileged installer phase is required.'; exit 1; }
    [[ "${EOS_CLI_INSTALL_STOPPED:-}" == true ]] || { eos_cli_install_error 'An explicitly stopped installation window is required.'; exit 1; }
    [[ -n "${EOS_CLI_TEMPLATE:-}" && "$EOS_CLI_TEMPLATE" == '#!/bin/bash'$'\n'* ]] || { eos_cli_install_error 'Missing reviewed EOS CLI template.'; exit 1; }

    local stage='' link_stage='' target=/usr/local/libexec/nexowatt-eos/iobroker link directory
    eos_cli_stopped_runtime || { eos_cli_install_error 'The service and all service-account processes must be stopped; systemd and process checks must succeed.'; exit 1; }

    # Every ancestor is root-controlled before mkdir/mktemp/install/rename.
    for directory in /usr/local /usr/local/libexec /usr/local/libexec/nexowatt-eos /usr/local/bin; do
        eos_cli_ensure_directory "$directory" || { eos_cli_install_error "Unsafe installation directory: $directory"; exit 1; }
    done
    eos_cli_secure_directory /usr/bin || { eos_cli_install_error 'Unsafe /usr/bin directory.'; exit 1; }
    eos_cli_secure_directory /opt || { eos_cli_install_error 'Unsafe /opt directory.'; exit 1; }
    [[ -d /opt/iobroker && ! -L /opt/iobroker ]] || { eos_cli_install_error 'The fixed runtime directory must not be a symlink.'; exit 1; }
    stage=$(/usr/bin/mktemp -d /usr/local/libexec/nexowatt-eos/.cli-install.XXXXXXXX) || exit 1
    trap '[[ -z "$stage" ]] || /usr/bin/rm -rf -- "$stage"; [[ -z "$link_stage" ]] || /usr/bin/rm -rf -- "$link_stage"' EXIT
    printf '%s\n' "$EOS_CLI_TEMPLATE" >"$stage/source"
    /usr/bin/env -i PATH="$PATH" /bin/bash --noprofile --norc -n "$stage/source" || exit 1
    /usr/bin/install -o 0 -g 0 -m 0755 -- "$stage/source" "$stage/iobroker" || exit 1
    /usr/bin/mv -fT -- "$stage/iobroker" "$target" || exit 1

    # Both standard Linux locations are replaced; no stale runtime-tree entry
    # may shadow the protected wrapper. Atomic replacement never follows a
    # previous leaf symlink. Existing directories fail without recursive removal.
    for directory in /usr/bin /usr/local/bin; do
        link_stage=$(/usr/bin/mktemp -d "$directory/.eos-cli-link.XXXXXXXX") || exit 1
        for link in iob iobroker; do
            /usr/bin/ln -s -- "$target" "$link_stage/link" || exit 1
            /usr/bin/mv -fT -- "$link_stage/link" "$directory/$link" || exit 1
        done
        /usr/bin/rm -rf -- "$link_stage"
        link_stage=''
    done

    # Local convenience entries live in the untrusted runtime directory. Create
    # them as the runtime user: root must never write through a raced runtime path.
    /usr/bin/env -i PATH="$PATH" /usr/sbin/runuser --user iobroker -- \
        /usr/bin/ln -sfnT -- "$target" /opt/iobroker/iobroker || exit 1
    /usr/bin/env -i PATH="$PATH" /usr/sbin/runuser --user iobroker -- \
        /usr/bin/ln -sfnT -- "$target" /opt/iobroker/iob || exit 1
)

# Optional second installation phase, after eos_install_cli has created the
# protected directory. Source is reviewed build data, never read from runtime.
eos_install_runtime_guard() (
    set -euo pipefail
    export PATH=/usr/sbin:/usr/bin:/sbin:/bin
    unset NODE_OPTIONS NODE_PATH LD_PRELOAD LD_LIBRARY_PATH BASH_ENV ENV CDPATH
    [[ "$(/usr/bin/id -u)" == 0 ]] || { eos_cli_install_error 'A privileged installer phase is required.'; exit 1; }
    [[ -n "${EOS_TLS_VALIDATOR_SOURCE:-}" ]] || { eos_cli_install_error 'Missing reviewed runtime TLS validator.'; exit 1; }
    eos_cli_stopped_runtime || { eos_cli_install_error 'A stopped runtime is required before installing its TLS validator.'; exit 1; }
    local node_path path meta owner mode stage=''
    eos_cli_secure_directory /usr/local/libexec/nexowatt-eos || exit 1
    node_path=$(/usr/bin/readlink -e -- /usr/bin/node) || exit 1
    for path in /usr/bin/node "$node_path"; do
        eos_cli_secure_directory "${path%/*}" || exit 1
        meta=$(/usr/bin/stat -c '%u %a' -- "$path") || exit 1
        read -r owner mode <<<"$meta"
        [[ "$owner" == 0 && "$mode" =~ ^[0-7]{3,4}$ ]] || exit 1
        if [[ ! -L "$path" ]] && (( (8#$mode & 0022) != 0 )); then exit 1; fi
    done
    [[ -f "$node_path" && -x "$node_path" ]] || exit 1
    stage=$(/usr/bin/mktemp -d /usr/local/libexec/nexowatt-eos/.guard-install.XXXXXXXX) || exit 1
    trap '[[ -z "$stage" ]] || /usr/bin/rm -rf -- "$stage"' EXIT
    printf '%s\n' "$EOS_TLS_VALIDATOR_SOURCE" >"$stage/verify-runtime-tls.cjs"
    /usr/bin/env -i PATH="$PATH" /usr/bin/node --check "$stage/verify-runtime-tls.cjs" || exit 1
    /usr/bin/install -o 0 -g 0 -m 0644 -- "$stage/verify-runtime-tls.cjs" "$stage/checked.cjs" || exit 1
    /usr/bin/mv -fT -- "$stage/checked.cjs" /usr/local/libexec/nexowatt-eos/verify-runtime-tls.cjs || exit 1
)
