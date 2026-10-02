#!/usr/bin/env bash
# Increase this version number whenever you update the fixer
FIXER_VERSION="2026-09-30" # format YYYY-MM-DD

# get and load the LIB => START
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P) || exit 1
for required in installer_library.sh versions.json security/install-cli.sh security/eos-cli.sh security/profile-common.sh security/verify-runtime-tls.cjs; do
    [[ -f "$SCRIPT_DIR/$required" ]] || { echo "Incomplete reviewed EOS source package: $required" >&2; exit 1; }
done
EOS_VERSIONS_JSON=$(cat "$SCRIPT_DIR/versions.json") || exit 1
EOS_CLI_INSTALLER_SOURCE=$(cat "$SCRIPT_DIR/security/install-cli.sh") || exit 1
EOS_CLI_TEMPLATE=$(cat "$SCRIPT_DIR/security/eos-cli.sh") || exit 1
EOS_PROFILE_SOURCE=$(cat "$SCRIPT_DIR/security/profile-common.sh") || exit 1
EOS_TLS_VALIDATOR_SOURCE=$(cat "$SCRIPT_DIR/security/verify-runtime-tls.cjs") || exit 1
source "$SCRIPT_DIR/installer_library.sh" || exit 1
source "$SCRIPT_DIR/security/install-cli.sh" || exit 1
source "$SCRIPT_DIR/security/profile-common.sh" || exit 1
# get and load the LIB => END

eos_preflight "$@" || exit 1

if [[ $EUID == 0 ]]; then
    IS_ROOT=true
    SUDOX=""
else
    IS_ROOT=false
    SUDOX="sudo "
fi
ROOT_GROUP=root
USER_GROUP=$(id -gn)
get_platform_params
set_some_common_params
[[ -d "$CONTROLLER_DIR" && ! -L "$IOB_DIR" ]] || { echo 'No supported existing runtime tree.' >&2; exit 1; }
state=$(/usr/bin/systemctl is-active iobroker.service 2>/dev/null)
case "$state" in inactive|unknown) ;; *) echo 'Stop ioBroker before the maintenance window.' >&2; exit 1;; esac
runtime_uid=$(/usr/bin/id -u iobroker) || exit 1
status=0
/usr/bin/pgrep -u "$runtime_uid" >/dev/null 2>&1 || status=$?
[[ "$status" == 1 ]] || { echo 'Service-account processes still exist or process check failed.' >&2; exit 1; }
# A partial migration must not leave the previous unit enabled for next boot.
$SUDOX /usr/bin/systemctl disable iobroker.service || exit 1
# No automatic npm/OS upgrades, database compression or backend migration.
create_user_linux "$IOB_USER" || exit 1
cd "$IOB_DIR" || exit 1
fix_dir_permissions || exit 1
eos_install_profile || exit 1
printf '%s\n' 'EOS host policy and maintenance entry points updated; service remains stopped and disabled.' \
    'This is not a product security release. Complete docs/security/ACCEPTANCE.md before enabling it.'
