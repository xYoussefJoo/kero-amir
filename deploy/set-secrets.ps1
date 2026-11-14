<#
.SYNOPSIS
  Asks for the production secrets (passwords hidden while typing) and saves them to deploy/production.secrets.json.
  Run it in your own PowerShell window; the file is git-ignored.
#>
$ErrorActionPreference = 'Stop'
$file = Join-Path $PSScriptRoot 'production.secrets.json'

function Read-Secret([string] $prompt) {
    $secure = Read-Host $prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# Keep an existing JWT key so tokens stay valid across deploys.
$jwtKey = ''
if (Test-Path $file) {
    $existing = Get-Content $file -Raw | ConvertFrom-Json
    if ($existing.jwtSigningKey) { $jwtKey = $existing.jwtSigningKey }
}

$dbPassword = Read-Secret 'Database password (db79860)'
$encrypt = Read-Host 'Encrypt database connection? (Y/n)'
$encryptPart = if ($encrypt -match '^[nN]') { 'Encrypt=False;' } else { 'Encrypt=True; TrustServerCertificate=True;' }

$ownerEmail = Read-Host 'Owner (Kero) login email'
do {
    $ownerPassword = Read-Secret 'Owner password (12+ characters)'
    if ($ownerPassword.Length -lt 12) { Write-Host 'Too short, try again.' -ForegroundColor Yellow }
} while ($ownerPassword.Length -lt 12)

[ordered] @{
    connectionString = "Server=db79860.databaseasp.net; Database=db79860; User Id=db79860; Password=$dbPassword; $encryptPart MultipleActiveResultSets=True;"
    jwtSigningKey    = $jwtKey
    ownerEmail       = $ownerEmail
    ownerPassword    = $ownerPassword
} | ConvertTo-Json | Set-Content $file -Encoding UTF8

Write-Host "Saved to $file" -ForegroundColor Green
