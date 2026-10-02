#!/bin/bash
# NexoWatt EOS Linux/systemd profile. Installed outside the writable runtime tree.
# No substitutions are made in this template; all privileged targets are fixed.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
unset NODE_OPTIONS NODE_PATH LD_PRELOAD LD_LIBRARY_PATH BASH_ENV ENV CDPATH
export IOB_NO_SETCAP=true

eos_fail() {
    printf 'EOS CLI: %s\n' "$1" >&2
    exit "${2:-77}"
}

# Trust both the original pathname (including symlink owners/parents) and its
# resolved target. An owner other than root or a writable directory/file fails.
# stat/readlink are fixed, trusted OS bootstrap utilities, never PATH lookups.
eos_trusted_os_path() {
    local requested="$1" resolved path meta owner mode
    [[ "$requested" == /* ]] || return 1
    resolved=$(/usr/bin/readlink -e -- "$requested") || return 1
    for path in "$requested" "$resolved"; do
        while :; do
            meta=$(/usr/bin/stat -c '%u %a' -- "$path") || return 1
            read -r owner mode <<<"$meta"
            [[ "$owner" == 0 && "$mode" =~ ^[0-7]{3,4}$ ]] || return 1
            if [[ ! -L "$path" ]] && (( (8#$mode & 0022) != 0 )); then
                return 1
            fi
            [[ "$path" == / ]] && break
            path="${path%/*}"
            [[ -n "$path" ]] || path=/
        done
    done
    [[ -f "$resolved" && -x "$resolved" ]]
}

for eos_tool in /usr/bin/id /usr/bin/env; do
    eos_trusted_os_path "$eos_tool" || eos_fail "Untrusted OS executable: $eos_tool"
done
eos_uid=$(/usr/bin/id -u)
eos_runtime_uid=$(/usr/bin/id -u iobroker) || eos_fail 'The iobroker service account is missing.'
[[ "$eos_runtime_uid" =~ ^[0-9]+$ && "$eos_runtime_uid" != 0 ]] || eos_fail 'Invalid service account.'

case "${1:-}" in
    fix|nodejs-update|diag)
        eos_fail 'This maintenance shortcut is disabled. Use the reviewed local EOS maintenance package as an OS administrator. Remote download-and-execute is not permitted; no maintenance was performed.' 69
        ;;
    start|stop|restart)
        [[ "$eos_uid" != "$eos_runtime_uid" ]] || eos_fail 'Service control requires a separate OS administrator.'
        (( $# == 1 )) || eos_fail 'Service commands accept no additional arguments in this EOS profile. Manage individual adapters through the authenticated Admin interface.' 64
        eos_trusted_os_path /usr/bin/systemctl || eos_fail 'Untrusted systemctl executable.'
        if [[ "$eos_uid" == 0 ]]; then
            exec /usr/bin/env -i PATH="$PATH" /usr/bin/systemctl "$1" iobroker.service
        fi
        eos_trusted_os_path /usr/bin/sudo || eos_fail 'Untrusted sudo executable.'
        exec /usr/bin/env -i PATH="$PATH" /usr/bin/sudo -- /usr/bin/systemctl "$1" iobroker.service
        ;;
esac

# Never trust caller-selected Node, NODE_OPTIONS, PATH, HOME, or the working
# directory. Runtime JS is executed only after dropping the root identity.
eos_trusted_os_path /usr/bin/node || eos_fail 'Node or an ancestor is not root-owned and protected.'
cd /
if [[ "$eos_uid" == 0 ]]; then
    eos_trusted_os_path /usr/sbin/runuser || eos_fail 'Untrusted runuser executable.'
    exec /usr/bin/env -i PATH="$PATH" /usr/sbin/runuser --user iobroker -- \
        /usr/bin/env -i PATH="$PATH" HOME=/home/iobroker USER=iobroker LOGNAME=iobroker \
        IOB_NO_SETCAP=true /usr/bin/node /opt/iobroker/node_modules/iobroker.js-controller/iobroker.js "$@"
elif [[ "$eos_uid" == "$eos_runtime_uid" ]]; then
    exec /usr/bin/env -i PATH="$PATH" HOME=/home/iobroker USER=iobroker LOGNAME=iobroker \
        IOB_NO_SETCAP=true /usr/bin/node /opt/iobroker/node_modules/iobroker.js-controller/iobroker.js "$@"
else
    eos_trusted_os_path /usr/bin/sudo || eos_fail 'Untrusted sudo executable.'
    exec /usr/bin/env -i PATH="$PATH" /usr/bin/sudo -H -u iobroker -- \
        /usr/bin/env -i PATH="$PATH" HOME=/home/iobroker USER=iobroker LOGNAME=iobroker \
        IOB_NO_SETCAP=true /usr/bin/node /opt/iobroker/node_modules/iobroker.js-controller/iobroker.js "$@"
fi
