#!/usr/bin/env python3
"""Local terminal-only commissioning input. Never sends passwords anywhere."""
import getpass
import json
import os
import re
import sys
from pathlib import Path

RESERVED = {'admin', 'administrator', 'root', 'service', 'nexowatt', 'eos', 'guest', 'anonymous'}

def valid_password(value):
    return isinstance(value, str) and 15 <= len(value) <= 128 and len(value.encode('utf-8')) <= 256 and not re.search(r'[\x00-\x1f\x7f]', value)

def valid_name(value):
    return bool(re.fullmatch(r'[a-z][a-z0-9_-]{2,31}', value)) and value not in RESERVED

def write_new(file, data):
    fd = os.open(file, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8') as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())

def main():
    if os.geteuid() != 0 or not sys.stdin.isatty() or len(sys.argv) != 1:
        raise ValueError('Root und interaktives Terminal erforderlich; keine Passwortargumente.')
    target = Path('/root/eos-test-input-02')
    if target.exists() or target.is_symlink():
        raise ValueError('Eingabeverzeichnis existiert bereits; es wird nicht überschrieben.')
    passwords = set()
    def password(label):
        value = getpass.getpass(label + ' (15–128 Zeichen): ')
        if not valid_password(value) or value in passwords:
            raise ValueError('Passwortlänge/Steuerzeichen/Mehrfachverwendung unzulässig.')
        if getpass.getpass('Wiederholen: ') != value:
            raise ValueError('Passwörter stimmen nicht überein.')
        passwords.add(value)
        return value
    service = password('Persönliches Service-Admin-Passwort')
    accounts = []
    for role, label in [('installer', 'Installateur'), ('enduser', 'Benutzer')]:
        name = input(label + '-Anmeldename (klein, 3–32 Zeichen): ').strip()
        if not valid_name(name) or any(row['username'] == name for row in accounts):
            raise ValueError('Ungültiger oder doppelter Benutzername.')
        accounts.append({'username': name, 'role': role, 'password': password(label + '-Startpasswort')})
    hosts = [value.strip() for value in input('Pi-IP/DNS-Namen, mit Komma getrennt (keine URL): ').split(',')]
    if not 1 <= len(hosts) <= 16 or any(not value or len(value) > 253 or not re.fullmatch(r'[A-Za-z0-9.:-]+', value) for value in hosts):
        raise ValueError('Ungültige Hostliste; die vollständige SAN-Prüfung folgt im Preflight.')
    trust = Path(input('Absoluter Pfad zum öffentlichen Hersteller-Lizenz-Trust-JSON: ').strip())
    if not trust.is_absolute() or trust.is_symlink() or not trust.is_file() or trust.stat().st_size > 32768:
        raise ValueError('Ungültiger öffentlicher Trust-Export.')
    public_keys = json.loads(trust.read_text(encoding='utf-8'))
    if not isinstance(public_keys, dict) or not public_keys or 'PRIVATE KEY' in json.dumps(public_keys):
        raise ValueError('Nur öffentlicher Schlüssel-Export erlaubt.')
    # The signed Admin validator performs cryptographic/algorithm checks before
    # any service/account installation. This helper does not manufacture trust.
    target.mkdir(mode=0o700)
    write_new(target / 'service-password.txt', service + '\n')
    write_new(target / 'accounts.json', json.dumps({'schemaVersion': 1, 'accounts': accounts}) + '\n')
    write_new(target / 'hosts.json', json.dumps(hosts) + '\n')
    write_new(target / 'license-trust.json', json.dumps(public_keys) + '\n')
    print('Geschützte Eingabedateien erstellt. Als Nächstes den signierten Preflight ausführen. Keine dieser Dateien versenden.')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, EOFError, KeyboardInterrupt):
        # Never emit raw parser/input errors which may contain a secret.
        print('Eingabe abgebrochen oder abgelehnt. Kein Dienst wurde installiert; eventuell angelegte Eingabedateien bleiben geschützt erhalten.', file=sys.stderr)
        sys.exit(1)
