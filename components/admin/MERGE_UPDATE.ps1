[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )
    Write-Host "`n=== $Label ===" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label ist mit Exit-Code $LASTEXITCODE fehlgeschlagen."
    }
}

if (-not (Test-Path -LiteralPath '.\package.json')) {
    throw 'package.json fehlt. Die Merge-ZIP muss direkt in den vorhandenen Repository-Ordner entpackt werden.'
}
if (-not (Test-Path -LiteralPath '.\tools\nexowatt-sync-release-version.cjs')) {
    throw 'Der NexoWatt-Versionsabgleich fehlt. Bitte die Merge-ZIP erneut vollständig entpacken und alle Dateien ersetzen.'
}
if (-not (Test-Path -LiteralPath '.\tools\nexowatt-apply-ems-overview.cjs')) {
    throw 'Die EMS-Live-Diagnose aus der bereitgestellten Merge-ZIP fehlt. Bitte die ZIP erneut vollständig entpacken.'
}

$version = node -p "require('./package.json').version"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($version)) {
    throw 'Die Version aus package.json konnte nicht gelesen werden.'
}

Write-Host "NexoWatt EOS Admin Merge-Prüfung für Version $version" -ForegroundColor Green
Write-Host 'Vorhandene .git- und node_modules-Verzeichnisse bleiben erhalten.'

Invoke-Checked 'EMS-Live-Diagnose vollständig integrieren' { node tools/nexowatt-apply-ems-overview.cjs }
Invoke-Checked 'Release-Versionen angleichen' { node tools/nexowatt-sync-release-version.cjs }
Invoke-Checked 'Verbindliche Verkaufsstandardwerte setzen' { npm run prepare:eos-release-defaults }
Invoke-Checked 'Alte Runtime-Dateien bereinigen' { npm run clean:eos-runtime }
Invoke-Checked 'Paketstruktur prüfen' { npm run check:eos-package }
Invoke-Checked 'Vollständige Stabilitätsprüfung' { npm run check:eos-stability }
Invoke-Checked 'npm-Paketinhalt prüfen' { npm pack --dry-run }

Write-Host "`nMERGE ERFOLGREICH: Alle Release-Dateien stehen auf $version und der Ordner ist für die manuelle Veröffentlichung bereit." -ForegroundColor Green
