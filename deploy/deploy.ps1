<#
.SYNOPSIS
  Deploys the API to MonsterASP.NET (IIS + SQL Server) with Web Deploy.

.DESCRIPTION
  Default (database reachable from this machine):
    1. Applies EF Core migrations and seeds the owner + content from this machine.
    2. Publishes the API and uploads it with only the connection string and JWT key in web.config.

  -ServerSideDatabase (database only reachable from the web server, as on MonsterASP):
    1. Uploads with Database__MigrateOnStartup + seed settings (incl. the owner password) in web.config,
       then calls /health/ready so the API migrates, seeds and creates the owner on startup.
    2. Immediately re-uploads web.config WITHOUT the owner password and seed flags.
       Database__MigrateOnStartup stays on so future deploys apply new migrations.
    Use -SkipSeed on later deploys to do only step 2.

  Secrets: deploy/production.secrets.json (git-ignored; fill it with deploy/set-secrets.ps1).
  Web Deploy credentials: the .publishSettings file. Nothing secret is printed, and the publish output is deleted.

.EXAMPLE
  ./deploy/deploy.ps1 -PublishSettings "D:\New_Downloads\kero-amir.runasp.net-WebDeploy.publishSettings" -ServerSideDatabase
#>
param(
    [Parameter(Mandatory)] [string] $PublishSettings,
    [string] $SecretsFile = (Join-Path $PSScriptRoot 'production.secrets.json'),
    [switch] $ServerSideDatabase,
    [switch] $SkipSeed,
    [switch] $SelfContained,
    # MonsterASP app pools run 32-bit (a win-x64 build fails with HTTP 500.32).
    [ValidateSet('win-x86', 'win-x64')] [string] $Runtime = 'win-x86',
    # Writes ASP.NET Core startup output to logs/stdout_*.log on the server, for diagnosing 500.3x errors.
    [switch] $StdoutLog
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$api = Join-Path $root 'apps/api'
$out = Join-Path $PSScriptRoot 'out'
$msdeploy = 'C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe'

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

# ---- Secrets
if (-not (Test-Path $SecretsFile)) { throw "Missing $SecretsFile. Run deploy/set-secrets.ps1 first." }
$secrets = Get-Content $SecretsFile -Raw | ConvertFrom-Json
if ($secrets.connectionString -match 'PUT-YOUR-DB-PASSWORD-HERE|Password=\s*;') { throw 'The database password is missing. Run deploy/set-secrets.ps1.' }
if ([string]::IsNullOrWhiteSpace($secrets.jwtSigningKey)) {
    # Generated once and saved, so tokens stay valid across deploys.
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secrets.jwtSigningKey = [Convert]::ToBase64String($bytes)
    $secrets | ConvertTo-Json | Set-Content $SecretsFile -Encoding UTF8
    Write-Host 'Generated a JWT signing key and saved it to the secrets file.'
}
if (-not $secrets.PSObject.Properties['forwardingSecret'] -or [string]::IsNullOrWhiteSpace($secrets.forwardingSecret)) {
    # Shared with the web app (Vercel env FORWARDING_SECRET): proves a form post really came from our web server,
    # so the API can trust the visitor IP it forwards and rate-limit per visitor instead of per web server.
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secrets | Add-Member -NotePropertyName forwardingSecret -NotePropertyValue ([Convert]::ToBase64String($bytes)) -Force
    $secrets | ConvertTo-Json | Set-Content $SecretsFile -Encoding UTF8
    Write-Host 'Generated a forwarding secret and saved it to the secrets file (copy it to Vercel as FORWARDING_SECRET).'
}

[xml] $profileXml = Get-Content $PublishSettings
$profile = $profileXml.publishData.publishProfile | Where-Object { $_.publishMethod -eq 'MSDeploy' } | Select-Object -First 1
if (-not $profile) { throw 'No MSDeploy profile in the publish settings file.' }
# The site redirects http to https; probe https directly.
$siteUrl = $profile.destinationAppUrl.TrimEnd('/') -replace '^http://', 'https://'

$baseEnv = [ordered] @{
    ASPNETCORE_ENVIRONMENT = 'Production'
    ConnectionStrings__Sql = $secrets.connectionString
    Jwt__SigningKey        = $secrets.jwtSigningKey
    Forwarding__Secret     = $secrets.forwardingSecret
}
if ($ServerSideDatabase) { $baseEnv['Database__MigrateOnStartup'] = 'true' }

function Set-WebConfigEnvironment([System.Collections.IDictionary] $variables) {
    $path = Join-Path $out 'web.config'
    [xml] $config = Get-Content $path
    $aspNetCore = $config.SelectSingleNode('//aspNetCore')
    if ($StdoutLog) {
        $aspNetCore.SetAttribute('stdoutLogEnabled', 'true')
        $aspNetCore.SetAttribute('stdoutLogFile', '.\logs\stdout')
        # The app pool may not be allowed to create folders, so ship the logs folder.
        New-Item -ItemType Directory -Force (Join-Path $out 'logs') | Out-Null
        Set-Content (Join-Path $out 'logs\.keep') '' -Encoding ASCII
    }
    $existing = $aspNetCore.SelectSingleNode('environmentVariables')
    if ($existing) { [void] $aspNetCore.RemoveChild($existing) }

    $node = $config.CreateElement('environmentVariables')
    foreach ($name in $variables.Keys) {
        $var = $config.CreateElement('environmentVariable')
        $var.SetAttribute('name', $name)
        $var.SetAttribute('value', $variables[$name])
        [void] $node.AppendChild($var)
    }
    [void] $aspNetCore.AppendChild($node)
    $config.Save($path)
}

function Send-ToServer {
    $dest = "contentPath=$($profile.msdeploySite),computerName=https://$($profile.publishUrl):8172/msdeploy.axd?site=$($profile.msdeploySite)," +
            "userName=$($profile.userName),password=$($profile.userPWD),authType=Basic"
    # Output is filtered so a failing command line can never echo the password.
    & $msdeploy -verb:sync "-source:contentPath=$out" "-dest:$dest" -allowUntrusted -enableRule:AppOffline -retryAttempts:3 2>&1 |
        ForEach-Object { "$_" } | Where-Object { $_ -notmatch '(?i)password' }
    if ($LASTEXITCODE -ne 0) { throw 'Upload failed.' }
}

function Test-Ready {
    $url = "$siteUrl/api/v1/health/ready"
    # First start migrates and seeds, so give it time.
    for ($i = 1; $i -le 12; $i++) {
        try {
            $response = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 60
            Write-Host "$url -> $($response.StatusCode) $($response.Content)" -ForegroundColor Green
            return
        } catch {
            Write-Host "  not ready yet ($($_.Exception.Message)), retrying..."
            Start-Sleep -Seconds 10
        }
    }
    throw "The API did not become ready: $url"
}

try {
    if (-not $ServerSideDatabase -and -not $SkipSeed) {
        $env:ASPNETCORE_ENVIRONMENT = 'Production'
        $env:ConnectionStrings__Sql = $secrets.connectionString
        $env:Jwt__SigningKey = $secrets.jwtSigningKey

        Step 'Applying database migrations (from this machine)'
        dotnet ef database update -p "$api/src/KeroAmir.Infrastructure" -s "$api/src/KeroAmir.Api" --connection $secrets.connectionString
        if ($LASTEXITCODE -ne 0) { throw 'Migration failed.' }

        Step 'Seeding owner account and initial content (from this machine)'
        $env:Seed__OwnerEmail = $secrets.ownerEmail
        $env:Seed__OwnerPassword = $secrets.ownerPassword
        $env:Seed__Content = 'true'
        dotnet run --project "$api/src/KeroAmir.Api" -c Release --no-launch-profile -- --seed-and-exit
        if ($LASTEXITCODE -ne 0) { throw 'Seeding failed.' }
    }

    Step 'Publishing the API'
    if (Test-Path $out) { Remove-Item $out -Recurse -Force }
    # One Windows runtime only: other runtimes' native SqlClient files add ~60 MB.
    $publishArgs = @("$api/src/KeroAmir.Api", '-c', 'Release', '-o', $out, '-r', $Runtime, '--self-contained', $SelfContained.IsPresent.ToString().ToLower())
    dotnet publish @publishArgs
    if ($LASTEXITCODE -ne 0) { throw 'Publish failed.' }

    if ($ServerSideDatabase -and -not $SkipSeed) {
        Step "Upload 1/2: migrate + seed on the server ($siteUrl)"
        $seedEnv = [ordered] @{}
        $baseEnv.GetEnumerator() | ForEach-Object { $seedEnv[$_.Key] = $_.Value }
        $seedEnv['Seed__Content'] = 'true'
        $seedEnv['Seed__OwnerEmail'] = $secrets.ownerEmail
        $seedEnv['Seed__OwnerPassword'] = $secrets.ownerPassword
        Set-WebConfigEnvironment $seedEnv
        Send-ToServer
        Test-Ready

        Step 'Upload 2/2: removing the owner password and seed flags from the server'
    } else {
        Step "Uploading to $siteUrl"
    }

    Set-WebConfigEnvironment $baseEnv
    Send-ToServer
    Test-Ready
}
finally {
    # The published web.config holds server secrets; don't leave it on disk.
    if (Test-Path $out) { Remove-Item $out -Recurse -Force }
    foreach ($name in 'ConnectionStrings__Sql', 'Jwt__SigningKey', 'Seed__OwnerEmail', 'Seed__OwnerPassword', 'Seed__Content') {
        Remove-Item "Env:$name" -ErrorAction SilentlyContinue
    }
}
