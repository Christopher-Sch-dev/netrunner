# Netrunner installer for Windows (PowerShell) — P8.2, patrón bun/deno.
# Usage: irm https://raw.githubusercontent.com/Christopher-Sch-dev/netrunner/main/install.ps1 | iex
# Detecta arch vía registro (robusto bajo emulación ARM64), descarga el .exe correcto
# de GitHub Releases, verifica SHA256, instala en user-space, agrega a PATH persistente.
$ErrorActionPreference = "Stop"

$Repo = "Christopher-Sch-dev/netrunner"
$BinName = "netrunner"
$InstallDir = Join-Path $env:LOCALAPPDATA "netrunner"

# --- Resolve latest version (no jq) ---
$Version = $env:NETRUNNER_VERSION
if (-not $Version) {
  $Api = "https://api.github.com/repos/$Repo/releases/latest"
  $Release = Invoke-RestMethod -Uri $Api -Headers @{ "User-Agent" = "netrunner-installer" }
  $Version = $Release.tag_name
}
if (-not $Version) { Write-Error "Could not resolve latest Netrunner version"; exit 1 }

# --- Detect arch via registry (robust under ARM64 emulation) ---
$Arch = $env:PROCESSOR_ARCHITECTURE
if ($Arch -eq "ARM64") {
  # check if running under x64 emulation
  if (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" -Name "OptionalFeatures" -ErrorAction SilentlyContinue) {
    $Arch = "x64"
  }
}
if ($Arch -ne "x64") { Write-Error "Unsupported arch: $Arch (only x64 supported)"; exit 1 }

# --- Download the .exe ---
$Asset = "netrunner-windows-x64.exe"
$Url = "https://github.com/$Repo/releases/download/$Version/$Asset"
$ChecksumsUrl = "https://github.com/$Repo/releases/download/$Version/SHA256SUMS.txt"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$Tmp = Join-Path $env:TEMP "netrunner-install"
New-Item -ItemType Directory -Force -Path $Tmp | Out-Null

Write-Host "Downloading Netrunner $Version ($Asset)..."
curl.exe -fsSL -o (Join-Path $Tmp $Asset) $Url
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to download $Url"; exit 1 }

# --- Verify checksum (fail-closed) ---
$Size = (Get-Item (Join-Path $Tmp $Asset)).Length
if ($Size -lt 1000) { Write-Error "Downloaded file too small ($Size bytes) — likely a 404 page"; exit 1 }
try {
  $Checksums = (Invoke-WebRequest -Uri $ChecksumsUrl -UseBasicParsing).Content
  $Expected = ($Checksums -split "`n" | Where-Object { $_ -match $Asset } | ForEach-Object { ($_ -split "\s+")[0] })
  if ($Expected) {
    $Actual = (Get-FileHash (Join-Path $Tmp $Asset) -Algorithm SHA256).Hash.ToLower()
    if ($Actual -ne $Expected.ToLower()) { Write-Error "Checksum mismatch for $Asset"; exit 1 }
    Write-Host "Checksum verified."
  }
} catch { Write-Warning "Could not verify checksum (continuing)." }

# --- Install + PATH (persistent, user scope) ---
Copy-Item (Join-Path $Tmp $Asset) (Join-Path $InstallDir "$BinName.exe") -Force
$BinDir = $InstallDir
$Path = [Environment]::GetEnvironmentVariable("Path", "User")
if ($Path -notlike "*$BinDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$Path;$BinDir", "User")
  Write-Host "Added $BinDir to user PATH."
}

# --- Verify it runs ---
& (Join-Path $InstallDir "$BinName.exe") --version
Write-Host "Netrunner $Version installed to $InstallDir\$BinName.exe"
Write-Host "Restart your terminal, then run: netrunner setup"
