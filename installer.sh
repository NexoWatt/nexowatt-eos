#!/usr/bin/env bash

# Increase this version number whenever you update the installer
INSTALLER_VERSION="2026-09-30" # format YYYY-MM-DD

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

# Fresh provisioning must never adopt an existing runtime tree.
if [[ -e /opt/iobroker || -L /opt/iobroker ]]; then
    echo 'Existing /opt/iobroker: use the reviewed stopped-system migration procedure.' >&2
    exit 1
fi

# Check if this is a pure 64bit architecture

if [[ $(getconf LONG_BIT) -eq 32 ]]; then
	echo "ioBroker can only be installed on 64Bit-Systems. Please reinstall your OS or upgrade your hardware."
	exit
fi

# Test if this script is being run as root or not
if [[ $EUID -eq 0 ]]; then
    IS_ROOT=true
    SUDOX=""
else
    IS_ROOT=false
    SUDOX="sudo "
fi
ROOT_GROUP="root"
USER_GROUP="$USER"

# The legacy plaintext Redis path is rejected by eos_preflight.
INSTALL_REDIS="false"
RECOMMEND_FIXER_AFTER_INSTALL="false"
# Keep the service stopped and disabled until provisioning and acceptance.
SKIP_IOBROKER_START="true"
# use --automated-run to skip all user prompts
if [[ "$*" != *--silent* ]] || [[ $(ps -p 1 -o comm=) == "systemd" ]]; then
    if [[ "$(whoami)" = "root" || "$(whoami)" = "iobroker" ]]; then
        # Prompt for username
        echo "You started the installer as root or the iobroker user. This is not recommended."
        echo "For security reasons a default user should be created. Please run 'iob fix' after the installation."
        RECOMMEND_FIXER_AFTER_INSTALL="true"
    fi

    # Check and fix boot.target on systemd

    if [[ $(systemctl get-default) == "graphical.target" ]]; then
        echo -e "\nYour system is booting into 'graphical.target', which means that a user interface or desktop is available. Usually a server is running without a desktop for security reasons and to save RAM. Please run 'iob fix' after the installation to change this."
        RECOMMEND_FIXER_AFTER_INSTALL="true"
    fi

    # Check and fix timezone
    TIMEZONE=$(timedatectl show --property=Timezone --value)
    if [[ $(command -v apt-get) ]] && [[ $TIMEZONE == *Etc/UTC* ]] || [[ $TIMEZONE == *Europe/London* ]]; then
        echo -e "\nYour timezone '$TIMEZONE' is probably wrong. Please run 'iob fix' after the installation to change this."
        RECOMMEND_FIXER_AFTER_INSTALL="true"
    fi
fi



# test one function of the library
RET=$(get_lib_version)
if [ $? -ne 0 ]; then
    echo "Installer/Fixer: library $LIB_NAME could not be loaded!"
    exit 1
fi
if [ "$RET" == "" ]; then
    echo "Installer/Fixer: library $LIB_NAME does not work."
    exit 1
fi
echo "Library version=$RET"

# Test which platform this script is being run on
get_platform_params
set_some_common_params

if [ "$IS_ROOT" = "true" ]; then
    print_bold "Welcome to the ioBroker installer!" "Installer version: $INSTALLER_VERSION"
else
    print_bold "Welcome to the ioBroker installer!" "Installer version: $INSTALLER_VERSION" "" "You might need to enter your password a couple of times."
fi

# Which npm package should be installed (default "iobroker")
INSTALL_TARGET=${INSTALL_TARGET-"iobroker"}

export AUTOMATED_INSTALLER="true"
export DEBIAN_FRONTEND=noninteractive

# Adjust number of steps based on Redis installation
if [ "$INSTALL_REDIS" = "true" ]; then
    NUM_STEPS=5
else
    NUM_STEPS=4
fi

# ########################################################
print_step "Installing prerequisites" 1 "$NUM_STEPS"

# update repos
$SUDOX $INSTALL_CMD $INSTALL_CMD_UPD_ARGS

# Install Node.js if it is not installed, or if the installed version is not supported.
# Checking only whether "node" exists let ioBroker be installed on any version,
# including ones that were dropped from nodeJsAccepted.
NODE_INSTALL_REQUIRED="false"
if [[ $(type -P "node" 2>/dev/null) != *"/node" ]]; then
    echo "Node.js not found."
    NODE_INSTALL_REQUIRED="true"
else
    CURRENT_NODE_MAJOR=$(node -v 2>/dev/null)
    CURRENT_NODE_MAJOR="${CURRENT_NODE_MAJOR#v}"
    CURRENT_NODE_MAJOR="${CURRENT_NODE_MAJOR%%.*}"
    if [[ " $NODE_ACCEPTED " != *" $CURRENT_NODE_MAJOR "* ]]; then
        echo "Node.js $CURRENT_NODE_MAJOR is installed, but ioBroker supports: $NODE_ACCEPTED"
        if [ "$INSTALL_CMD" = "brew" ]; then
            # install_nodejs cannot install via brew and would abort the whole installation,
            # so warn instead of stopping a setup that would otherwise work.
            echo "Please install a supported Node.js version from $NODE_JS_BREW_URL, then run the installer again."
            echo "The installation continues, but this Node.js version is not supported."
        else
            NODE_INSTALL_REQUIRED="true"
        fi
    fi
fi
if [ "$NODE_INSTALL_REQUIRED" = "true" ]; then
    install_nodejs
fi

# Check if npm is installed
if [[ $(type -P "npm" 2>/dev/null) != *"/npm" ]]; then
    # If not, try to install it
    install_package npm
    if [[ $(type -P "npm" 2>/dev/null) != *"/npm" ]]; then
        echo "${red}Cannot continue because \"npm\" is not installed and could not be installed automatically!${normal}"
        exit 1
    fi
fi

# Select an npm mirror, by default use npmjs.org
REGISTRY_URL="https://registry.npmjs.org"
case "$MIRROR" in
[Tt]aobao)
    REGISTRY_URL="https://registry.npm.taobao.org"
    ;;
esac
if [ "$(npm config get registry)" != "$REGISTRY_URL" ]; then
    echo "Changing npm registry to $REGISTRY_URL"
    npm config set registry $REGISTRY_URL
fi

# Determine the platform we operate on and select the installation routine/packages accordingly
install_necessary_packages

# ########################################################
print_step "Creating ioBroker user and directory" 2 "$NUM_STEPS"

# Ensure the user "iobroker" exists and is in the correct groups
if [ "$HOST_PLATFORM" = "linux" ]; then
    create_user_linux "$IOB_USER" || exit 1
elif [ "$HOST_PLATFORM" = "freebsd" ]; then
    create_user_freebsd "$IOB_USER"
fi

# Ensure the installation directory exists and take control of it
$SUDOX mkdir -p "$IOB_DIR"
if [ "$IS_ROOT" != true ]; then
    # During the installation we need to give the current user access to the install dir
    # On Linux, we'll fix this at the end. On OSX this is okay
    if [ "$HOST_PLATFORM" = "osx" ]; then
        sudo chown -R "$USER" "$IOB_DIR"
    else
        sudo chown -R "$USER":"$USER_GROUP" "$IOB_DIR"
    fi
fi
cd "$IOB_DIR" || exit
echo "Directory $IOB_DIR created"

# Log some information about the installer
touch "$INSTALLER_INFO_FILE"
chmod 640 "$INSTALLER_INFO_FILE"
echo "Installer version: $INSTALLER_VERSION" >>"$INSTALLER_INFO_FILE"
echo "Installation date $(date +%F)" >>"$INSTALLER_INFO_FILE"
echo "Platform: $HOST_PLATFORM" >>"$INSTALLER_INFO_FILE"

# ########################################################
print_step "Installing ioBroker" 3 "$NUM_STEPS"


# Disable any information related to npm updates
disable_npm_updatenotifier

# Enforce strict version checks before installing new packages
force_strict_npm_version_checks

# Create ioBroker's package.json and install dependencies:
# The generated package.json pinned "node": ">=18.0.0", three majors behind
# nodeJsAccepted. Derive it from the accepted list instead of hardcoding it again:
# the lowest accepted major is the floor of what still works, which is what an
# engines range expresses. lib-npx/installCopyFiles.js does the same for the NPX
# package. Falls back to 22 if the list is unavailable or unparseable.
NODE_ENGINE_MAJOR=$(echo "$NODE_ACCEPTED" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -n | head -1)
if [ -z "$NODE_ENGINE_MAJOR" ]; then
    NODE_ENGINE_MAJOR=22
fi
PACKAGE_JSON_FILE=$(
    cat <<-EOF
	{
		"name": "iobroker.inst",
		"version": "3.0.0",
		"private": true,
		"description": "Automate your Life",
		"engines": {
			"node": ">=${NODE_ENGINE_MAJOR}.0.0"
		},
		"dependencies": {
			"iobroker.js-controller": "stable",
			"iobroker.admin": "stable",
			"iobroker.discovery": "stable",
			"iobroker.backitup": "stable"
		}
	}
	EOF
)

# Create package.json and install all dependencies
PACKAGE_JSON_FILENAME="$IOB_DIR/package.json"
write_to_file "$PACKAGE_JSON_FILE" "$PACKAGE_JSON_FILENAME"
# --unsafe-perm was removed in npm 12 and has been a no-op since npm 7, where npm
# stopped dropping privileges for lifecycle scripts. Passing it now aborts the whole
# installation with EUNKNOWNCONFIG on any system that ships npm 12, e.g. FreeBSD.
# The exit code was also ignored, so a failed install still reported success further
# down. Capture the output and show it when npm fails.
# Lifecycle scripts execute with the service identity, never with OS admin rights.
fix_dir_permissions || exit 1
if ! NPM_OUTPUT=$(eos_run_as_runtime /usr/bin/npm i --omit=dev --loglevel error 2>&1); then
    echo "Installing the ioBroker packages failed. Output of 'npm i':"
    printf '%s\n' "$NPM_OUTPUT" >&2
    exit 1
fi

# Finalize ownership before writing the protected CLI/service profile.
fix_dir_permissions || exit 1
if [[ ! -f "$IOB_DIR/iobroker-data/iobroker.json" ]]; then
    if ! eos_run_as_runtime /usr/bin/node "$CONTROLLER_DIR/iobroker.js" setup first; then
        echo 'Initial controller setup failed; service remains stopped.' >&2
        exit 1
    fi
fi
eos_install_profile || exit 1
unset AUTOMATED_INSTALLER
printf '%s\n' 'EOS host review profile installed; service remains stopped and disabled.' \
    'Runtime TLS and secure Admin provisioning are still required. See docs/security/ACCEPTANCE.md.'
